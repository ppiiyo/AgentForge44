import { randomUUID } from 'crypto';

export function generateSecureId(prefix: string = ''): string {
  const uuid = randomUUID();
  return prefix ? `${prefix}-${uuid}` : uuid;
}
