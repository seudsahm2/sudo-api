import {
  Injectable,
  Logger,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcrypt';
import type { SignOptions } from 'jsonwebtoken';
import { generateSecret, generateURI, verifySync } from 'otplib';
import { PrismaService } from '../prisma/prisma.service';
import { AdminAuditService } from './admin-audit.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminLogoutDto } from './dto/admin-logout.dto';
import { AdminRefreshDto } from './dto/admin-refresh.dto';
import { AdminTwoFactorConfirmDto } from './dto/admin-2fa-confirm.dto';
import { AdminTwoFactorDisableDto } from './dto/admin-2fa-disable.dto';
import { AdminTwoFactorSetupDto } from './dto/admin-2fa-setup.dto';
import { AdminJwtPayload } from './interfaces/admin-jwt-payload.interface';
import { AdminPrincipal } from './interfaces/admin-principal.interface';
import { createSecureToken } from './utils/admin-auth.util';
import {
  decryptSecret,
  encryptSecret,
  hashToken,
  parseDurationToMs,
} from './utils/admin-security.util';

export interface AdminAuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  admin: AdminPrincipal;
}

export interface AdminTwoFactorSetupResponse {
  otpAuthUrl: string;
  manualEntryKey: string;
}

@Injectable()
export class AdminAuthService {
  private readonly logger = new Logger(AdminAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly auditService: AdminAuditService,
  ) {}

  async login(
    dto: AdminLoginDto,
    context?: { ipAddress?: string; userAgent?: string; requestId?: string },
  ): Promise<AdminAuthResponse> {
    const adminUser = await this.prisma.adminUser.findUnique({
      where: { email: dto.email.toLowerCase() },
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
    });

    if (!adminUser || !adminUser.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await compare(dto.password, adminUser.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.debug(
      `password verified for admin email=${adminUser.email} twoFactorEnabled=${adminUser.twoFactorEnabled}`,
    );

    if (adminUser.twoFactorEnabled) {
      if (!dto.twoFactorCode || !adminUser.twoFactorSecretEncrypted) {
        throw new UnauthorizedException('Two-factor code required');
      }

      const encryptionKey = this.configService.getOrThrow<string>(
        'ADMIN_2FA_ENCRYPTION_KEY',
      );
      const secret = decryptSecret(
        adminUser.twoFactorSecretEncrypted,
        encryptionKey,
      );
      const validTwoFactorCode = verifySync({
        strategy: 'totp',
        secret,
        token: dto.twoFactorCode,
        epochTolerance: 30,
      }).valid;
      if (!validTwoFactorCode) {
        this.logger.warn(`2fa rejected for admin email=${adminUser.email}`);
        throw new UnauthorizedException('Invalid two-factor code');
      }
    }

    const session = await this.createSession(adminUser.id, context);
    const accessToken = await this.signAccessToken({
      sub: adminUser.id,
      email: adminUser.email,
      sessionId: session.id,
    });

    this.logger.log(
      `login created session adminId=${adminUser.id} sessionId=${session.id}`,
    );

    await this.prisma.adminUser.update({
      where: { id: adminUser.id },
      data: { lastLoginAt: new Date() },
    });

    await this.auditService.record({
      actorAdminUserId: adminUser.id,
      actorEmail: adminUser.email,
      action: 'auth.login',
      resource: 'admin_auth',
      resourceId: adminUser.id,
      method: 'POST',
      path: '/api/admin/auth/login',
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      after: {
        sessionId: session.id,
      },
    });

    return {
      accessToken,
      refreshToken: session.refreshToken,
      expiresIn: this.configService.getOrThrow<string>(
        'ADMIN_ACCESS_TOKEN_EXPIRES_IN',
      ),
      admin: this.toPrincipal(adminUser, session.id),
    };
  }

  async refresh(
    dto: AdminRefreshDto,
    context?: { ipAddress?: string; userAgent?: string; requestId?: string },
  ): Promise<AdminAuthResponse> {
    const refreshTokenHash = hashToken(dto.refreshToken);

    const session = await this.prisma.adminSession.findFirst({
      where: {
        refreshTokenHash,
        revokedAt: null,
        expiresAt: { gt: new Date() },
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
      this.logger.warn('refresh rejected invalid or inactive session');
      throw new UnauthorizedException('Invalid refresh token');
    }

    const nextRefreshToken = createSecureToken();
    const nextRefreshTokenHash = hashToken(nextRefreshToken);
    const expiresAt = new Date(
      Date.now() +
        parseDurationToMs(
          this.configService.getOrThrow<string>(
            'ADMIN_REFRESH_TOKEN_EXPIRES_IN',
          ),
        ),
    );

    const updatedSession = await this.prisma.adminSession.update({
      where: { id: session.id },
      data: {
        refreshTokenHash: nextRefreshTokenHash,
        expiresAt,
        lastUsedAt: new Date(),
      },
    });

    const accessToken = await this.signAccessToken({
      sub: session.adminUser.id,
      email: session.adminUser.email,
      sessionId: updatedSession.id,
    });

    this.logger.log(
      `refresh rotated session adminId=${session.adminUser.id} sessionId=${updatedSession.id}`,
    );

    await this.auditService.record({
      actorAdminUserId: session.adminUser.id,
      actorEmail: session.adminUser.email,
      action: 'auth.refresh',
      resource: 'admin_session',
      resourceId: session.id,
      method: 'POST',
      path: '/api/admin/auth/refresh',
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      after: {
        sessionId: updatedSession.id,
      },
    });

    return {
      accessToken,
      refreshToken: nextRefreshToken,
      expiresIn: this.configService.getOrThrow<string>(
        'ADMIN_ACCESS_TOKEN_EXPIRES_IN',
      ),
      admin: this.toPrincipal(session.adminUser, updatedSession.id),
    };
  }

  async logout(
    dto: AdminLogoutDto,
    context?: { ipAddress?: string; userAgent?: string; requestId?: string },
  ): Promise<{ success: true }> {
    const refreshTokenHash = hashToken(dto.refreshToken);
    const session = await this.prisma.adminSession.findFirst({
      where: {
        refreshTokenHash,
        revokedAt: null,
      },
      include: {
        adminUser: true,
      },
    });

    if (!session) {
      this.logger.warn('logout received unknown refresh token');
      return { success: true };
    }

    await this.prisma.adminSession.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });

    await this.auditService.record({
      actorAdminUserId: session.adminUser.id,
      actorEmail: session.adminUser.email,
      action: 'auth.logout',
      resource: 'admin_session',
      resourceId: session.id,
      method: 'POST',
      path: '/api/admin/auth/logout',
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
    });

    this.logger.log(
      `logout revoked session adminId=${session.adminUser.id} sessionId=${session.id}`,
    );

    return { success: true };
  }

  me(admin: AdminPrincipal): AdminPrincipal {
    return admin;
  }

  async startTwoFactorSetup(
    admin: AdminPrincipal,
    dto: AdminTwoFactorSetupDto,
    context?: { ipAddress?: string; userAgent?: string; requestId?: string },
  ): Promise<AdminTwoFactorSetupResponse> {
    const adminUser = await this.validatePassword(admin.id, dto.password);
    const secret = generateSecret();
    const encryptionKey = this.configService.getOrThrow<string>(
      'ADMIN_2FA_ENCRYPTION_KEY',
    );

    await this.prisma.adminUser.update({
      where: { id: adminUser.id },
      data: {
        twoFactorSecretEncrypted: encryptSecret(secret, encryptionKey),
      },
    });

    const issuer = this.configService.getOrThrow<string>('ADMIN_2FA_ISSUER');
    const otpAuthUrl = generateURI({
      strategy: 'totp',
      issuer,
      label: adminUser.email,
      secret,
    });

    await this.auditService.record({
      actorAdminUserId: adminUser.id,
      actorEmail: adminUser.email,
      action: 'auth.2fa.setup',
      resource: 'admin_user',
      resourceId: adminUser.id,
      method: 'POST',
      path: '/api/admin/auth/2fa/setup',
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      after: {
        twoFactorEnabled: false,
      },
    });

    return {
      otpAuthUrl,
      manualEntryKey: secret,
    };
  }

  async confirmTwoFactorSetup(
    admin: AdminPrincipal,
    dto: AdminTwoFactorConfirmDto,
    context?: { ipAddress?: string; userAgent?: string; requestId?: string },
  ): Promise<{ twoFactorEnabled: true }> {
    const adminUser = await this.prisma.adminUser.findUnique({
      where: { id: admin.id },
    });

    if (!adminUser?.twoFactorSecretEncrypted) {
      throw new BadRequestException('Two-factor setup has not been started');
    }

    const encryptionKey = this.configService.getOrThrow<string>(
      'ADMIN_2FA_ENCRYPTION_KEY',
    );
    const secret = decryptSecret(
      adminUser.twoFactorSecretEncrypted,
      encryptionKey,
    );

    if (
      !verifySync({
        strategy: 'totp',
        secret,
        token: dto.twoFactorCode,
        epochTolerance: 30,
      }).valid
    ) {
      throw new UnauthorizedException('Invalid two-factor code');
    }

    await this.prisma.adminUser.update({
      where: { id: admin.id },
      data: {
        twoFactorEnabled: true,
        twoFactorConfirmedAt: new Date(),
      },
    });

    await this.auditService.record({
      actorAdminUserId: admin.id,
      actorEmail: admin.email,
      action: 'auth.2fa.confirm',
      resource: 'admin_user',
      resourceId: admin.id,
      method: 'POST',
      path: '/api/admin/auth/2fa/confirm',
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      after: {
        twoFactorEnabled: true,
      },
    });

    return { twoFactorEnabled: true };
  }

  async disableTwoFactor(
    admin: AdminPrincipal,
    dto: AdminTwoFactorDisableDto,
    context?: { ipAddress?: string; userAgent?: string; requestId?: string },
  ): Promise<{ twoFactorEnabled: false }> {
    const adminUser = await this.validatePassword(admin.id, dto.password);
    if (!adminUser.twoFactorSecretEncrypted) {
      return { twoFactorEnabled: false };
    }

    const encryptionKey = this.configService.getOrThrow<string>(
      'ADMIN_2FA_ENCRYPTION_KEY',
    );
    const secret = decryptSecret(
      adminUser.twoFactorSecretEncrypted,
      encryptionKey,
    );

    if (
      !verifySync({
        strategy: 'totp',
        secret,
        token: dto.twoFactorCode,
        epochTolerance: 30,
      }).valid
    ) {
      throw new UnauthorizedException('Invalid two-factor code');
    }

    await this.prisma.adminUser.update({
      where: { id: admin.id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecretEncrypted: null,
        twoFactorConfirmedAt: null,
      },
    });

    await this.auditService.record({
      actorAdminUserId: admin.id,
      actorEmail: admin.email,
      action: 'auth.2fa.disable',
      resource: 'admin_user',
      resourceId: admin.id,
      method: 'POST',
      path: '/api/admin/auth/2fa/disable',
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      requestId: context?.requestId,
      after: {
        twoFactorEnabled: false,
      },
    });

    return { twoFactorEnabled: false };
  }

  private async validatePassword(adminId: string, password: string) {
    const adminUser = await this.prisma.adminUser.findUnique({
      where: { id: adminId },
    });

    if (!adminUser) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await compare(password, adminUser.passwordHash);
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return adminUser;
  }

  private async createSession(
    adminUserId: string,
    context?: { ipAddress?: string; userAgent?: string; requestId?: string },
  ) {
    const refreshToken = createSecureToken();
    const refreshTokenHash = hashToken(refreshToken);
    const expiresAt = new Date(
      Date.now() +
        parseDurationToMs(
          this.configService.getOrThrow<string>(
            'ADMIN_REFRESH_TOKEN_EXPIRES_IN',
          ),
        ),
    );

    return this.prisma.adminSession
      .create({
        data: {
          adminUserId,
          refreshTokenHash,
          expiresAt,
          ipAddress: context?.ipAddress,
          userAgent: context?.userAgent,
        },
      })
      .then((session) => ({
        ...session,
        refreshToken,
      }));
  }

  private async signAccessToken(payload: AdminJwtPayload): Promise<string> {
    const expiresIn = this.configService.getOrThrow<string>(
      'ADMIN_ACCESS_TOKEN_EXPIRES_IN',
    ) as SignOptions['expiresIn'];

    return this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>('ADMIN_JWT_SECRET'),
      expiresIn,
    });
  }

  private toPrincipal(
    adminUser: {
      id: string;
      email: string;
      displayName: string;
      twoFactorEnabled: boolean;
      roles: Array<{
        role: {
          key: string;
          permissions: Array<{ permission: { key: string } }>;
        };
      }>;
    },
    sessionId: string,
  ): AdminPrincipal {
    return {
      id: adminUser.id,
      email: adminUser.email,
      displayName: adminUser.displayName,
      sessionId,
      roleKeys: adminUser.roles.map((assignment) => assignment.role.key),
      permissionKeys: adminUser.roles.flatMap((assignment) =>
        assignment.role.permissions.map((grant) => grant.permission.key),
      ),
      twoFactorEnabled: adminUser.twoFactorEnabled,
    };
  }
}
