import { randomUUID } from 'crypto';

export function createSecureToken(): string {
  return randomUUID().replace(/-/g, '') + randomUUID().replace(/-/g, '');
}
