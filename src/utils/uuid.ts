import { randomUUID } from 'crypto';

export function generateExecutionId(): string {
  return randomUUID();
}
