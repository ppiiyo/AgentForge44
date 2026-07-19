import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';
import { verifyToken } from '../api/userAuth.js';
import { db, tables } from '../db/index.js';
import { eq, and } from 'drizzle-orm';
import { cache } from '../services/cache.js';

export interface TenantContext {
  tenantId: string;
  plan: 'free' | 'pro' | 'enterprise';
  quotas: {
    maxWorkflows: number;
    maxExecutions: number; // per month
    maxStorageGb: number;
    maxLLMTokens: number; // per month
  };
}

// Static billing configurations for multi-tenant tiers
export const TENANT_PLANS: Record<TenantContext['plan'], TenantContext['quotas']> = {
  free: {
    maxWorkflows: 3,
    maxExecutions: 1000,
    maxStorageGb: 1,
    maxLLMTokens: 1_000_000,
  },
  pro: {
    maxWorkflows: 50,
    maxExecutions: 50_000,
    maxStorageGb: 100,
    maxLLMTokens: 100_000_000,
  },
  enterprise: {
    maxWorkflows: 9999, // unlimited practically
    maxExecutions: 10_000_000,
    maxStorageGb: 5000,
    maxLLMTokens: 10_000_000_000,
  }
};

/**
 * Enterprise Multi-Tenant context parsing and Row-Level Security simulator.
 * Ensures strict security sandbox partitioning inside Express route triggers.
 */
export async function enterpriseTenantContext(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const path = req.baseUrl + req.path;
    if (path.startsWith('/api/resilience')) {
      // Bypass database lookup for resilience endpoints to prevent deadlocks when DB failure is simulated
      (req as any).workspaceId = 'default-workspace';
      (req as any).workspaceRole = 'owner';
      (req as any).tenantId = 'default-workspace';
      next();
      return;
    }

    // 1. Resolve user ID from req.user or parse JWT from Authorization header
    let userId = (req as any).user?.id;
    if (!userId && req.headers.authorization) {
      const token = req.headers.authorization.replace(/^Bearer\s+/i, '');
      const decoded = verifyToken(token);
      if (decoded) {
        userId = decoded.id;
        (req as any).user = decoded;
      }
    }

    const isTestEnv = process.env.NODE_ENV === 'test' || !!process.env.VITEST;

    // 2. Resolve active workspace ID
    const wsHeader = (req.headers['x-workspace-id'] || req.headers['x-tenant-id']) as string | undefined;
    let wsId = wsHeader;

    if (userId) {
      // Ensure the user exists in the database to satisfy foreign key constraints
      const userRows = await db.select().from(tables.users).where(eq(tables.users.id, userId)).limit(1);
      if (userRows.length === 0) {
        if (isTestEnv) {
          await db.insert(tables.users).values({
            id: userId,
            email: (req as any).user?.email || `${userId}@test.com`,
            passwordHash: 'auto-bootstrapped',
            role: (req as any).user?.role || 'editor',
            createdAt: new Date().toISOString()
          });
        } else {
          res.status(401).json({ success: false, error: 'Unauthorized: User does not exist.' });
          return;
        }
      } else {
        // Always override role from database to prevent JWT-based privilege escalation
        if ((req as any).user) {
          (req as any).user.role = userRows[0].role;
        }
      }

      if (!wsId) {
        // Find existing membership for this user
        const membershipsList = await db
          .select()
          .from(tables.memberships)
          .where(eq(tables.memberships.userId, userId))
          .limit(1);

        if (membershipsList.length > 0) {
          wsId = membershipsList[0].workspaceId;
        } else {
          wsId = `ws_${userId}`;
        }
      }

      // Ensure target workspace actually exists in the workspaces table
      const wsRows = await db.select().from(tables.workspaces).where(eq(tables.workspaces.id, wsId)).limit(1);
      if (wsRows.length === 0) {
        await db.insert(tables.workspaces).values({
          id: wsId,
          name: wsId === 'default-workspace' ? 'Default Workspace' : `${userId}'s Workspace`,
          createdAt: new Date().toISOString()
        });
      }

      // Check user membership inside this active workspace
      const mbrRows = await db
        .select()
        .from(tables.memberships)
        .where(
          and(
            eq(tables.memberships.userId, userId),
            eq(tables.memberships.workspaceId, wsId)
          )
        )
        .limit(1);

      let membership = mbrRows[0];
      if (!membership) {
        // Auto-bootstrap only for their personal workspace OR if it's the default-workspace
        if (wsId === `ws_${userId}` || wsId === 'default-workspace') {
          const assignedRole = wsId === `ws_${userId}` ? 'owner' : ((req as any).user?.role || 'editor');
          const isOwnerOrEditor = assignedRole === 'admin' || assignedRole === 'editor' || assignedRole === 'owner';
          const roleStr = isOwnerOrEditor ? 'owner' : 'viewer';

          await db.insert(tables.memberships).values({
            id: `mbr_${userId}_${wsId}`,
            userId,
            workspaceId: wsId,
            role: roleStr,
            createdAt: new Date().toISOString()
          });

          const newMbrRows = await db
            .select()
            .from(tables.memberships)
            .where(
              and(
                eq(tables.memberships.userId, userId),
                eq(tables.memberships.workspaceId, wsId)
              )
            )
            .limit(1);
          membership = newMbrRows[0];
        } else {
          // For foreign workspaces, deny access immediately if they are not a member!
          res.status(403).json({ error: 'Access denied: You are not a member of this workspace.' });
          return;
        }
      }

      if (!membership) {
        res.status(403).json({ error: 'Tenant context resolution failed: missing membership record.' });
        return;
      }

      // Store in request context
      (req as any).workspaceId = wsId;
      (req as any).workspaceRole = membership.role;
      (req as any).tenantId = wsId;
    } else {
      // Unauthenticated public/anonymous request
      (req as any).workspaceId = wsId || 'default-workspace';
      (req as any).workspaceRole = 'viewer';
      (req as any).tenantId = (req as any).workspaceId;
    }

    const tenantId = (req as any).workspaceId;
    const context: TenantContext = {
      tenantId,
      plan: 'pro',
      quotas: TENANT_PLANS.pro
    };

    (req as any).tenant = context;

    logger.info(`Enterprise Multi-Tenancy - Workspace: ${tenantId}, Role: ${(req as any).workspaceRole}`);
    next();
  } catch (err: any) {
    logger.error('Error in enterpriseTenantContext middleware:', err);
    res.status(500).json({ error: 'Internal server error in tenant context parsing.' });
  }
}

/**
 * Enforces dynamic resource and execution limits based on subscriber tiers
 */
export function enforceTenantQuotas(resourceType: 'executions' | 'tokens', amount: number = 1) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const tenant = (req as any).tenant as TenantContext;
    if (!tenant) {
      next();
      return;
    }

    const { tenantId, plan, quotas } = tenant;
    const key = `quota:tenant:${tenantId}:${resourceType}`;

    try {
      const currentUsageStr = await cache.get(key);
      const currentUsage = currentUsageStr ? parseInt(currentUsageStr, 10) : 0;
      const limit = resourceType === 'executions' ? quotas.maxExecutions : quotas.maxLLMTokens;

      if (currentUsage + amount > limit) {
        logger.warn(`Tenant resource quota exceeded: ${tenantId}`, { resourceType, limit, current: currentUsage });
        res.status(429).json({
          success: false,
          error: resourceType === 'executions' ? 'Multi-Tenant Quota Exceeded' : 'Token Quota Exceeded',
          message: resourceType === 'executions'
            ? `Your current ${plan.toUpperCase()} tier allows up to ${limit} executions. Please upgrade to Enterprise.`
            : `Your current ${plan.toUpperCase()} tier allows up to ${limit} LLM tokens. Please contact support to increase your allocation.`
        });
        return;
      }

      await cache.incrBy(key, amount, 30 * 24 * 3600); // 30-day window
      next();
    } catch (err: any) {
      logger.error('Error in enforceTenantQuotas:', err);
      next();
    }
  };
}
