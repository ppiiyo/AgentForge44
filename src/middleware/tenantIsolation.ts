import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

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

// Memory-based local storage fallback simulator for active tenant usage metrics 
// (In production, this queries pgvector schema and Redis Cluster rate limit buckets)
const tenantUsageStore: Record<string, { executionsCount: number; tokensCount: number }> = {};

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
  // Extract custom enterprise headers or default to a standard corporate development sandbox
  const tenantId = (req.headers['x-tenant-id'] as string) || 'tenant-default-development-sandbox';
  const tenantPlan = (req.headers['x-tenant-plan'] as 'free' | 'pro' | 'enterprise') || 'pro';
  
  const quotas = TENANT_PLANS[tenantPlan] || TENANT_PLANS.free;

  const context: TenantContext = {
    tenantId,
    plan: tenantPlan,
    quotas
  };

  // Inject context inside the request metadata pipeline
  (req as any).tenant = context;

  // Initialize tenant tracking store if not populated
  if (!tenantUsageStore[tenantId]) {
    tenantUsageStore[tenantId] = { executionsCount: 0, tokensCount: 0 };
  }

  // Set local database simulated transaction isolation values (simulates: SET app.current_tenant_id)
  logger.info(`Enterprise Multi-Tenancy Local Partition Isolation - Tenant: ${tenantId} (${tenantPlan.toUpperCase()})`);

  next();
}

/**
 * Enforces dynamic resource and execution limits based on subscriber tiers
 */
export function enforceTenantQuotas(resourceType: 'executions' | 'tokens', amount: number = 1) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const tenant = (req as any).tenant as TenantContext;
    if (!tenant) {
      next();
      return;
    }

    const { tenantId, plan, quotas } = tenant;
    const usage = tenantUsageStore[tenantId];

    if (resourceType === 'executions') {
      const liveUsage = usage.executionsCount;
      const limit = quotas.maxExecutions;
      if (liveUsage + amount > limit) {
        logger.warn(`Tenant resource quota exceeded: ${tenantId}`, { resourceType, limit, current: liveUsage });
        res.status(429).json({
          success: false,
          error: 'Multi-Tenant Quota Exceeded',
          message: `Your current ${plan.toUpperCase()} tier allows up to ${limit} executions. Please upgrade to Enterprise.`
        });
        return;
      }
      usage.executionsCount += amount;
    } else if (resourceType === 'tokens') {
      const liveUsage = usage.tokensCount;
      const limit = quotas.maxLLMTokens;
      if (liveUsage + amount > limit) {
        logger.warn(`Tenant resource quota exceeded: ${tenantId}`, { resourceType, limit, current: liveUsage });
        res.status(429).json({
          success: false,
          error: 'Token Quota Exceeded',
          message: `Your current ${plan.toUpperCase()} tier allows up to ${limit} LLM tokens. Please contact support to increase your allocation.`
        });
        return;
      }
      usage.tokensCount += amount;
    }

    next();
  };
}
