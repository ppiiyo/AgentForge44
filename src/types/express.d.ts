import { TenantContext } from '../middleware/tenantIsolation.js';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        jti?: string;
      };
      workspaceId?: string;
      workspaceRole?: string;
      tenant?: TenantContext;
    }
  }
}
export {};
