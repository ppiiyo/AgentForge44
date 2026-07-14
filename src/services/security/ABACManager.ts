import { rolesPriority, UserRole } from '../../api/rbac.js';
import { logger } from '../../utils/logger.js';

export interface ABACSubject {
  id: string;
  role: UserRole;
  activeWorkspaceId: string;
  clearance?: 'public' | 'confidential' | 'restricted';
}

export interface ABACResource {
  workspaceId: string;
  ownerId?: string;
  classification?: 'public' | 'confidential' | 'restricted';
  status?: 'draft' | 'active' | 'archived';
}

export interface ABACEnvironment {
  ipAddress: string;
  isVpnRequired?: boolean;
}

export class ABACManager {
  private static classificationPriority = {
    'public': 1,
    'confidential': 2,
    'restricted': 3
  };

  /**
   * Evaluates if a subject is permitted to perform an action on a resource under environmental parameters.
   */
  public static isPermitted(
    subject: ABACSubject,
    action: 'read' | 'write' | 'execute' | 'delete',
    resource: ABACResource,
    env?: ABACEnvironment
  ): { allowed: boolean; reason?: string } {
    // 1. Core Tenant/Workspace Isolation Check
    // Owner & Admin can bypass cross-workspace if they have global permission (handled at controller level),
    // but by default users can only touch their own activeWorkspaceId
    if (subject.activeWorkspaceId !== resource.workspaceId) {
      return { allowed: false, reason: 'Access denied: Resource belongs to a different workspace.' };
    }

    // 2. Role Priority Gate Checks
    const userPriority = rolesPriority[subject.role] || 0;
    
    // Viewer can only read
    if (subject.role === 'viewer' && action !== 'read') {
      return { allowed: false, reason: 'Access denied: Viewers are only permitted to perform read operations.' };
    }

    // Editor can read, write, execute, but not delete
    if (subject.role === 'editor' && action === 'delete') {
      return { allowed: false, reason: 'Access denied: Only workspace admins and owners can delete resources.' };
    }

    // 3. Sensitive Classification Check
    const userClearance = subject.clearance || 'public';
    const resourceSensitivity = resource.classification || 'public';

    const pUser = this.classificationPriority[userClearance] || 1;
    const pResource = this.classificationPriority[resourceSensitivity] || 1;

    if (pUser < pResource) {
      return { allowed: false, reason: `Access denied: Subject clearance (${userClearance}) is insufficient for resource sensitivity (${resourceSensitivity}).` };
    }

    // 4. Resource Status Lockout Check
    if (resource.status === 'archived' && (action === 'write' || action === 'execute' || action === 'delete')) {
      return { allowed: false, reason: 'Access denied: Cannot modify, execute, or delete archived resources.' };
    }

    // 5. Environmental Constraint Validation
    if (env && env.isVpnRequired) {
      const isPrivateRange = 
        env.ipAddress.startsWith('10.') || 
        env.ipAddress.startsWith('192.168.') || 
        env.ipAddress.startsWith('172.16.') || 
        env.ipAddress === '127.0.0.1' ||
        env.ipAddress === '::1';
        
      if (!isPrivateRange) {
        return { allowed: false, reason: 'Access denied: High-security action must be initiated from a secure VPN or local network connection.' };
      }
    }

    return { allowed: true };
  }
}
