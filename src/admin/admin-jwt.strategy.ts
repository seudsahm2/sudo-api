import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { PrismaService } from '../prisma/prisma.service';
import { AdminJwtPayload } from './interfaces/admin-jwt-payload.interface';
import { AdminPrincipal } from './interfaces/admin-principal.interface';
import { ADMIN_ACCESS_TOKEN_COOKIE } from './utils/admin-session-cookies';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  private static extractBearerToken(request: unknown): string | null {
    if (!request || typeof request !== 'object') {
      return null;
    }

    const headers = (request as { headers?: unknown }).headers;
    if (!headers || typeof headers !== 'object') {
      return null;
    }

    const authorization = (headers as Record<string, unknown>).authorization;
    let authHeader: unknown = authorization;
    if (Array.isArray(authorization)) {
      authHeader = authorization.length > 0 ? authorization[0] : undefined;
    }

    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    const cookies = (request as { cookies?: Record<string, unknown> }).cookies;
    const accessToken = cookies?.[ADMIN_ACCESS_TOKEN_COOKIE];

    return typeof accessToken === 'string' && accessToken.length > 0
      ? accessToken
      : null;
  }

  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: (request: unknown) =>
        AdminJwtStrategy.extractBearerToken(request),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('ADMIN_JWT_SECRET'),
    });
  }

  async validate(payload: AdminJwtPayload): Promise<AdminPrincipal> {
    const session = await this.prisma.adminSession.findFirst({
      where: {
        id: payload.sessionId,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        adminUser: {
          include: {
            roles: {
              include: {
                role: {
                  include: {
                    permissions: {
                      include: {
                        permission: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!session || !session.adminUser.isActive) {
      throw new UnauthorizedException('Admin session is invalid');
    }

    const roleKeys = session.adminUser.roles.map(
      (assignment) => assignment.role.key,
    );
    const permissionKeys = session.adminUser.roles.flatMap((assignment) =>
      assignment.role.permissions.map((grant) => grant.permission.key),
    );

    return {
      id: session.adminUser.id,
      email: session.adminUser.email,
      displayName: session.adminUser.displayName,
      sessionId: session.id,
      roleKeys,
      permissionKeys,
      twoFactorEnabled: session.adminUser.twoFactorEnabled,
    };
  }
}
