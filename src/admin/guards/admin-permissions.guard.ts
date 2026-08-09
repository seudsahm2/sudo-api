import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ADMIN_PERMISSIONS_KEY } from '../decorators/admin-permissions.decorator';
import { AdminPrincipal } from '../interfaces/admin-principal.interface';

@Injectable()
export class AdminPermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      ADMIN_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<{ user?: AdminPrincipal }>();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('Missing admin principal');
    }

    const missingPermissions = requiredPermissions.filter(
      (permission) => !user.permissionKeys.includes(permission),
    );

    if (missingPermissions.length > 0) {
      throw new ForbiddenException(
        `Missing required admin permissions: ${missingPermissions.join(', ')}`,
      );
    }

    return true;
  }
}
