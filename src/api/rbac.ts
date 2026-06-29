export type UserRole = 'owner' | 'admin' | 'editor' | 'viewer';

export const rolesPriority: Record<UserRole, number> = {
  'owner': 3,
  'admin': 3,
  'editor': 2,
  'viewer': 1
};
