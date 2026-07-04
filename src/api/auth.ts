import crypto from 'crypto';
import { SECRETS } from '../config/secrets.js';

/**
 * 1. Cryptographic Secrets Protection Service (AES-256-GCM)
 * Encrypts and decrypts third-party API Keys before persisting to database
 */
export class SecretsShield {
  private algorithm = 'aes-256-gcm';
  private keySource: string;

  constructor(customKeySource?: string) {
    // Collect server master key strictly from secrets config without hardcoded fallbacks
    const keySource = customKeySource || SECRETS.ENCRYPTION_MASTER_KEY;
    if (!keySource) {
      throw new Error("CRITICAL SECURITY ERROR: Missing master key for encryption shield.");
    }
    // Only enforce 32+ character limit when using the central server secret
    if (!customKeySource && keySource.length < 32) {
      throw new Error("CRITICAL SECURITY ERROR: ENCRYPTION_MASTER_KEY must be at least 32 characters long.");
    }
    this.keySource = keySource;
  }

  /**
   * Encrypts plain text string to GCM container format (salt:iv:authTag:encryptedText)
   */
  encrypt(text: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const derivedKey = crypto.scryptSync(this.keySource, salt, 32);
    
    const iv = crypto.randomBytes(12); // standard 96-bit IV
    const cipher = crypto.createCipheriv(this.algorithm, derivedKey, iv) as any;
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return [
      salt,
      iv.toString('hex'),
      tag.toString('hex'),
      encrypted
    ].join(':');
  }

  /**
   * Decrypts safe custom GCM containers back to original credential token string.
   * Seamlessly handles both new dynamic-salt format (4 parts) and legacy fixed-salt format (3 parts).
   */
  decrypt(cipherText: string): string {
    const parts = cipherText.split(':');
    let salt: string;
    let ivHex: string;
    let tagHex: string;
    let contentHex: string;

    if (parts.length === 4) {
      [salt, ivHex, tagHex, contentHex] = parts;
    } else if (parts.length === 3) {
      salt = 'kostromai44-salt'; // Legacy fallback salt
      [ivHex, tagHex, contentHex] = parts;
    } else {
      throw new Error("Invalid GCM secrets container schema configuration.");
    }

    const derivedKey = crypto.scryptSync(this.keySource, salt, 32);
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, derivedKey, iv) as any;
    
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(contentHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

import { db, tables } from '../db/index.js';
import { eq, and } from 'drizzle-orm';

/**
 * 2. Enterprise Workspaces & Role-Based Access Control (RBAC) definitions
 */
import { UserRole, rolesPriority } from './rbac.js';

export interface RBACWorkspace {
  id: string;
  name: string;
  ownerId: string;
}

export interface UserSession {
  userId: string;
  email: string;
  role: UserRole;
  activeWorkspaceId: string;
}

export class RBACManager {
  constructor() {}

  /**
   * Check if a user has a specific role in a workspace asynchronously
   */
  async getUserRole(userId: string, workspaceId: string): Promise<UserRole | null> {
    try {
      const list = await db
        .select()
        .from(tables.memberships)
        .where(
          and(
            eq(tables.memberships.userId, userId),
            eq(tables.memberships.workspaceId, workspaceId)
          )
        )
        .limit(1);
      const membership = list[0];
      return membership ? (membership.role as UserRole) : null;
    } catch {
      return null;
    }
  }

  /**
   * Add a member to a workspace
   */
  async addMember(userId: string, workspaceId: string, role: UserRole): Promise<void> {
    const id = `mbr_${userId}_${workspaceId}`;
    const existing = await db
      .select()
      .from(tables.memberships)
      .where(
        and(
          eq(tables.memberships.userId, userId),
          eq(tables.memberships.workspaceId, workspaceId)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(tables.memberships)
        .set({ role })
        .where(
          and(
            eq(tables.memberships.userId, userId),
            eq(tables.memberships.workspaceId, workspaceId)
          )
        );
    } else {
      await db.insert(tables.memberships).values({
        id,
        userId,
        workspaceId,
        role,
        createdAt: new Date().toISOString()
      });
    }
  }

  /**
   * Remove a member from a workspace
   */
  async removeMember(userId: string, workspaceId: string): Promise<void> {
    await db
      .delete(tables.memberships)
      .where(
        and(
          eq(tables.memberships.userId, userId),
          eq(tables.memberships.workspaceId, workspaceId)
        )
      );
  }

  /**
   * Validates if active user credentials permit action within resource bounds
   */
  canExecuteAction(user: UserSession, targetWorkspaceId: string, requiredRole: UserRole): boolean {
    if (user.activeWorkspaceId !== targetWorkspaceId) {
      return false; // Users cannot touch foreign workspace sandboxes
    }

    const userAssignedRole = user.role;
    return (rolesPriority[userAssignedRole] || 0) >= (rolesPriority[requiredRole] || 0);
  }

  /**
   * Persistent version of permission validation
   */
  async canExecuteActionPersistent(userId: string, workspaceId: string, requiredRole: UserRole): Promise<boolean> {
    const userAssignedRole = await this.getUserRole(userId, workspaceId);
    if (!userAssignedRole) {
      return false;
    }

    return (rolesPriority[userAssignedRole] || 0) >= (rolesPriority[requiredRole] || 0);
  }
}
