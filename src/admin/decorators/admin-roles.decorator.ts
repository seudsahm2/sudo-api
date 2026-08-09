import { SetMetadata } from '@nestjs/common';

export const ADMIN_ROLES_KEY = 'admin:roles';

export const AdminRoles = (...roles: string[]) =>
  SetMetadata(ADMIN_ROLES_KEY, roles);
