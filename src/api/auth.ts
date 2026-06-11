import crypto from 'crypto';

/**
 * 1. Cryptographic Secrets Protection Service (AES-256-GCM)
 * Encrypts and decrypts third-party API Keys before persisting to database
 */
export class SecretsShield {
  private algorithm = 'aes-256-gcm';
  private masterKey: Buffer;

  constructor() {
    // Collect server master key or synthesize a persistent fallback
    const keySource = process.env.ENCRYPTION_MASTER_KEY || "agentforge_master_secret_aes_32bytes_key_002";
    // Ensure accurate 32-byte master key size
    this.masterKey = crypto.scryptSync(keySource, 'agentforge-salt', 32);
  }

  /**
   * Encrypts plain text string to GCM container format (iv:authTag:encryptedText)
   */
  encrypt(text: string): string {
    const iv = crypto.randomBytes(12); // standard 96-bit IV
    const cipher = crypto.createCipheriv(this.algorithm, this.masterKey, iv) as crypto.CipherGCM;
    
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    return [
      iv.toString('hex'),
      tag.toString('hex'),
      encrypted
    ].join(':');
  }

  /**
   * Decrypts safe custom GCM containers back to original credential token string
   */
  decrypt(cipherText: string): string {
    const parts = cipherText.split(':');
    if (parts.length !== 3) {
      throw new Error("Invalid GCM secrets container schema configuration.");
    }

    const [ivHex, tagHex, contentHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, this.masterKey, iv) as crypto.DecipherGCM;
    
    decipher.setAuthTag(tag);
    
    let decrypted = decipher.update(contentHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

/**
 * 2. Enterprise Workspaces & Role-Based Access Control (RBAC) definitions
 */
export type UserRole = 'owner' | 'editor' | 'viewer';

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
  private workspaces: Map<string, RBACWorkspace> = new Map();
  private userRoles: Map<string, { role: UserRole; workspaceId: string }> = new Map();

  constructor() {}

  /**
   * Validates if active user credentials permit action within resource bounds
   */
  canExecuteAction(user: UserSession, targetWorkspaceId: string, requiredRole: UserRole): boolean {
    if (user.activeWorkspaceId !== targetWorkspaceId) {
      return false; // Users cannot touch foreign workspace sandboxes
    }

    const rolesPriority: Record<UserRole, number> = {
      'owner': 3,
      'editor': 2,
      'viewer': 1
    };

    const userAssignedRole = user.role;
    return rolesPriority[userAssignedRole] >= rolesPriority[requiredRole];
  }
}
