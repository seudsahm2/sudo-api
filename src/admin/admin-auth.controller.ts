import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  Logger,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { CookieSerializeOptions } from '@fastify/cookie';
import type { FastifyReply } from 'fastify';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminAuthService } from './admin-auth.service';
import { AdminRecoveryService } from './admin-recovery.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { AdminRecoverDto } from './dto/admin-recover.dto';
import { AdminLogoutDto } from './dto/admin-logout.dto';
import { AdminRefreshDto } from './dto/admin-refresh.dto';
import { AdminTwoFactorConfirmDto } from './dto/admin-2fa-confirm.dto';
import { AdminTwoFactorDisableDto } from './dto/admin-2fa-disable.dto';
import { AdminTwoFactorSetupDto } from './dto/admin-2fa-setup.dto';
import { CurrentAdmin } from './decorators/current-admin.decorator';
import { AdminJwtAuthGuard } from './guards/admin-jwt-auth.guard';
import type { AdminPrincipal } from './interfaces/admin-principal.interface';
import { parseDurationToMs } from './utils/admin-security.util';
import {
  ADMIN_ACCESS_TOKEN_COOKIE,
  ADMIN_ACCESS_TOKEN_COOKIE_PATH,
  ADMIN_REFRESH_TOKEN_COOKIE,
  ADMIN_REFRESH_TOKEN_COOKIE_PATH,
} from './utils/admin-session-cookies';

type AdminHttpRequest = {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
  cookies?: Record<string, string | undefined>;
};

@ApiTags('admin-auth')
@Controller('admin/auth')
export class AdminAuthController {
  private readonly logger = new Logger(AdminAuthController.name);

  constructor(
    private readonly adminAuthService: AdminAuthService,
    private readonly adminRecoveryService: AdminRecoveryService,
    private readonly configService: ConfigService,
  ) {}

  @Post('login')
  @ApiOperation({ summary: 'Authenticate an admin and return tokens' })
  login(
    @Body() dto: AdminLoginDto,
    @Req()
    request: AdminHttpRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    this.logger.log(
      `login start ip=${request.ip ?? 'unknown'} ua=${this.extractUserAgent(request.headers) ?? 'unknown'} email=${dto.email}`,
    );

    return this.adminAuthService
      .login(dto, {
        ipAddress: request.ip,
        userAgent: this.extractUserAgent(request.headers),
        requestId: undefined,
      })
      .then((response) => {
        this.setSessionCookies(
          reply,
          response.accessToken,
          response.refreshToken,
        );
        this.logger.log(
          `login success email=${dto.email} adminId=${response.admin.id} sessionId=${response.admin.sessionId}`,
        );
        return response;
      })
      .catch((error: unknown) => {
        this.logger.warn(
          `login failed email=${dto.email} reason=${error instanceof Error ? error.message : 'unknown'}`,
        );
        throw error;
      });
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Rotate the admin refresh token' })
  refresh(
    @Body() dto: AdminRefreshDto,
    @Req()
    request: AdminHttpRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const refreshToken =
      dto.refreshToken || request.cookies?.[ADMIN_REFRESH_TOKEN_COOKIE];

    this.logger.log(
      `refresh start ip=${request.ip ?? 'unknown'} ua=${this.extractUserAgent(request.headers) ?? 'unknown'} hasBodyToken=${Boolean(dto.refreshToken)} hasCookieToken=${Boolean(request.cookies?.[ADMIN_REFRESH_TOKEN_COOKIE])}`,
    );

    if (!refreshToken) {
      this.logger.warn('refresh denied missing refresh token');
      throw new UnauthorizedException('Missing refresh token');
    }

    return this.adminAuthService
      .refresh(
        {
          refreshToken,
        },
        {
          ipAddress: request.ip,
          userAgent: this.extractUserAgent(request.headers),
          requestId: undefined,
        },
      )
      .then((response) => {
        this.setSessionCookies(
          reply,
          response.accessToken,
          response.refreshToken,
        );
        this.logger.log(
          `refresh success adminId=${response.admin.id} sessionId=${response.admin.sessionId}`,
        );
        return response;
      })
      .catch((error: unknown) => {
        this.logger.warn(
          `refresh failed reason=${error instanceof Error ? error.message : 'unknown'}`,
        );
        throw error;
      });
  }

  @Post('logout')
  @ApiOperation({ summary: 'Revoke the current admin session' })
  logout(
    @Body() dto: AdminLogoutDto,
    @Req()
    request: AdminHttpRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const refreshToken =
      dto.refreshToken || request.cookies?.[ADMIN_REFRESH_TOKEN_COOKIE] || '';

    this.logger.log(
      `logout start ip=${request.ip ?? 'unknown'} ua=${this.extractUserAgent(request.headers) ?? 'unknown'} hasBodyToken=${Boolean(dto.refreshToken)} hasCookieToken=${Boolean(request.cookies?.[ADMIN_REFRESH_TOKEN_COOKIE])}`,
    );

    return this.adminAuthService
      .logout(
        {
          refreshToken,
        },
        {
          ipAddress: request.ip,
          userAgent: this.extractUserAgent(request.headers),
          requestId: undefined,
        },
      )
      .then((response) => {
        this.clearSessionCookies(reply);
        this.logger.log('logout success');
        return response;
      })
      .catch((error: unknown) => {
        this.logger.warn(
          `logout failed reason=${error instanceof Error ? error.message : 'unknown'}`,
        );
        throw error;
      });
  }

  @Get('me')
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard)
  @ApiOperation({ summary: 'Return the authenticated admin principal' })
  me(@CurrentAdmin() admin: AdminPrincipal) {
    this.logger.debug(
      `me success adminId=${admin.id} sessionId=${admin.sessionId}`,
    );
    return this.adminAuthService.me(admin);
  }

  @Post('2fa/setup')
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard)
  @ApiOperation({
    summary: 'Start two-factor enrollment for the admin account',
  })
  startTwoFactorSetup(
    @CurrentAdmin() admin: AdminPrincipal,
    @Body() dto: AdminTwoFactorSetupDto,
    @Req()
    request: {
      ip?: string;
      headers?: Record<string, string | string[] | undefined>;
    },
  ) {
    return this.adminAuthService.startTwoFactorSetup(admin, dto, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Post('2fa/confirm')
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard)
  @ApiOperation({ summary: 'Confirm two-factor enrollment' })
  confirmTwoFactorSetup(
    @CurrentAdmin() admin: AdminPrincipal,
    @Body() dto: AdminTwoFactorConfirmDto,
    @Req()
    request: {
      ip?: string;
      headers?: Record<string, string | string[] | undefined>;
    },
  ) {
    return this.adminAuthService.confirmTwoFactorSetup(admin, dto, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Post('2fa/disable')
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard)
  @ApiOperation({ summary: 'Disable two-factor authentication' })
  disableTwoFactor(
    @CurrentAdmin() admin: AdminPrincipal,
    @Body() dto: AdminTwoFactorDisableDto,
    @Req()
    request: {
      ip?: string;
      headers?: Record<string, string | string[] | undefined>;
    },
  ) {
    return this.adminAuthService.disableTwoFactor(admin, dto, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  /**
   * Public on purpose: it is the way back in when the password is gone. It is
   * safe to leave open because it still demands a secret — a one-time recovery
   * code — and it answers every failure identically.
   */
  @Post('recover')
  @ApiOperation({
    summary: 'Set a new password using a one-time recovery code',
  })
  recover(
    @Body() dto: AdminRecoverDto,
    @Req() request: AdminHttpRequest,
  ): Promise<{ email: string; remainingCodes: number }> {
    this.logger.log(
      `recover attempt ip=${request.ip ?? 'unknown'} email=${dto.email}`,
    );

    return this.adminRecoveryService.recover(dto, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Post('recovery-codes')
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard)
  @ApiOperation({
    summary: 'Replace the recovery codes for this admin and return the new set',
  })
  async regenerateRecoveryCodes(
    @CurrentAdmin() admin: AdminPrincipal,
  ): Promise<{ codes: string[] }> {
    const codes = await this.adminRecoveryService.issueCodes(admin.id);
    return { codes };
  }

  @Get('recovery-codes/remaining')
  @ApiBearerAuth()
  @UseGuards(AdminJwtAuthGuard)
  @ApiOperation({ summary: 'How many unused recovery codes are left' })
  async remainingRecoveryCodes(
    @CurrentAdmin() admin: AdminPrincipal,
  ): Promise<{ remaining: number }> {
    return {
      remaining: await this.adminRecoveryService.countRemaining(admin.id),
    };
  }

  private extractUserAgent(
    headers?: Record<string, string | string[] | undefined>,
  ): string | undefined {
    const userAgent = headers?.['user-agent'];
    if (Array.isArray(userAgent)) {
      return userAgent[0];
    }

    return userAgent;
  }

  private setSessionCookies(
    reply: FastifyReply,
    accessToken: string,
    refreshToken: string,
  ) {
    const scope = this.cookieScope();

    reply.setCookie(ADMIN_ACCESS_TOKEN_COOKIE, accessToken, {
      httpOnly: true,
      ...scope,
      path: ADMIN_ACCESS_TOKEN_COOKIE_PATH,
      maxAge: this.cookieMaxAge('ADMIN_ACCESS_TOKEN_EXPIRES_IN'),
    } satisfies CookieSerializeOptions);

    reply.setCookie(ADMIN_REFRESH_TOKEN_COOKIE, refreshToken, {
      httpOnly: true,
      ...scope,
      path: ADMIN_REFRESH_TOKEN_COOKIE_PATH,
      maxAge: this.cookieMaxAge('ADMIN_REFRESH_TOKEN_EXPIRES_IN'),
    } satisfies CookieSerializeOptions);
  }

  private clearSessionCookies(reply: FastifyReply) {
    // Cleared with the same scope they were set with, or the browser keeps them.
    const scope = this.cookieScope();

    reply.clearCookie(ADMIN_ACCESS_TOKEN_COOKIE, {
      ...scope,
      path: ADMIN_ACCESS_TOKEN_COOKIE_PATH,
    } satisfies CookieSerializeOptions);
    reply.clearCookie(ADMIN_REFRESH_TOKEN_COOKIE, {
      ...scope,
      path: ADMIN_REFRESH_TOKEN_COOKIE_PATH,
    } satisfies CookieSerializeOptions);
  }

  private cookieMaxAge(configKey: string) {
    return Math.max(
      1,
      Math.floor(
        parseDurationToMs(this.configService.getOrThrow<string>(configKey)) /
          1000,
      ),
    );
  }

  private isProduction() {
    return this.configService.get<string>('NODE_ENV') === 'production';
  }

  /**
   * How the session cookies are scoped.
   *
   * The admin console stores no tokens of its own: these cookies are the
   * session. So when the site and the API are on different registrable domains
   * — a Vercel host calling a Render host, for instance — the cookies are
   * third-party, and `SameSite=Lax` means the browser silently refuses to send
   * them. Login appears to work and every request after it is anonymous.
   *
   * `SameSite=None` fixes that, and requires `Secure`. Better still is a shared
   * parent domain with ADMIN_COOKIE_DOMAIN set, which keeps the cookies
   * first-party and survives browsers that block third-party cookies outright.
   */
  private cookieScope(): Pick<
    CookieSerializeOptions,
    'sameSite' | 'secure' | 'domain'
  > {
    const configured = this.configService.get<'lax' | 'none' | 'strict'>(
      'ADMIN_COOKIE_SAMESITE',
    );
    const sameSite = configured ?? (this.isProduction() ? 'none' : 'lax');
    const domain = this.configService.get<string>('ADMIN_COOKIE_DOMAIN');

    return {
      sameSite,
      // SameSite=None is only honoured on a secure connection.
      secure: sameSite === 'none' || this.isProduction(),
      ...(domain ? { domain } : {}),
    };
  }
}
