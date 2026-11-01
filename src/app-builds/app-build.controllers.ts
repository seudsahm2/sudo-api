import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiExcludeController,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AdminAuditService } from '../admin/admin-audit.service';
import { AdminPermissions } from '../admin/decorators/admin-permissions.decorator';
import { CurrentAdmin } from '../admin/decorators/current-admin.decorator';
import { AdminJwtAuthGuard } from '../admin/guards/admin-jwt-auth.guard';
import { AdminPermissionsGuard } from '../admin/guards/admin-permissions.guard';
import type { AdminPrincipal } from '../admin/interfaces/admin-principal.interface';
import { AppBuildService, type AppBuildStatus } from './app-build.service';

@ApiTags('admin-app-builds')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, AdminPermissionsGuard)
@Controller('admin/app-builds')
export class AdminAppBuildController {
  constructor(
    private readonly builds: AppBuildService,
    private readonly auditService: AdminAuditService,
  ) {}

  @Get(':projectId')
  @AdminPermissions('content:read')
  @ApiOperation({ summary: 'The web build uploaded for a project, if any' })
  status(@Param('projectId') projectId: string): Promise<AppBuildStatus> {
    return this.builds.status(projectId);
  }

  @Post(':projectId')
  @AdminPermissions('content:write')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload a zipped web build (flutter build web) for a project',
  })
  async upload(
    @Param('projectId') projectId: string,
    @Req() request: FastifyRequest,
    @CurrentAdmin() actor: AdminPrincipal,
  ): Promise<AppBuildStatus> {
    // The global multipart cap is sized for images; a build gets its own.
    const file = await request.file({
      limits: { fileSize: this.builds.maxUploadBytes, files: 1 },
    });

    if (!file) {
      throw new BadRequestException('Attach the zip under the "file" field.');
    }

    let body: Buffer;
    try {
      body = await file.toBuffer();
    } catch {
      throw new BadRequestException(
        `The zip is larger than ${Math.floor(this.builds.maxUploadBytes / 1024 / 1024)}MB.`,
      );
    }

    const status = await this.builds.upload(projectId, body, file.filename);

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.app-build.upload',
      resource: 'work-projects',
      resourceId: projectId,
      method: 'POST',
      path: `/api/admin/app-builds/${projectId}`,
      after: {
        buildId: status.buildId,
        files: status.files,
        bytes: status.bytes,
      },
    });

    return status;
  }

  @Delete(':projectId')
  @AdminPermissions('content:write')
  @ApiOperation({ summary: 'Remove the web build uploaded for a project' })
  async remove(
    @Param('projectId') projectId: string,
    @CurrentAdmin() actor: AdminPrincipal,
  ): Promise<AppBuildStatus> {
    const status = await this.builds.remove(projectId);

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.app-build.remove',
      resource: 'work-projects',
      resourceId: projectId,
      method: 'DELETE',
      path: `/api/admin/app-builds/${projectId}`,
    });

    return status;
  }
}

/**
 * Serves uploaded builds to the public site.
 *
 * The app needs a real origin: its backend (Appwrite, Firebase, any API)
 * checks the Origin header, and a sandboxed page's `Origin: null` is refused
 * by all of them. Isolation comes from the address instead: with
 * APP_BUILDS_ORIGIN set, apps are only served on that host, where the admin
 * session cookies (host-only, set on the API's own host) do not exist.
 * `frame-ancestors` limits who may frame it to the site itself.
 *
 * Every path holds a build id that is never reused, so the files are cached
 * for good.
 */
/** host[:port] as URL normalises it, so `localhost:80` matches `http://localhost`. */
function hostOf(request: FastifyRequest): string | null {
  try {
    return new URL(`http://${request.headers.host ?? ''}`).host;
  } catch {
    return null;
  }
}

@ApiExcludeController()
@Controller('apps')
export class AppBuildServeController {
  private readonly frameAncestors: string;
  /** host[:port] apps must be requested on, when a separate origin is set. */
  private readonly appsHost: string | null;

  constructor(
    private readonly builds: AppBuildService,
    config: ConfigService,
  ) {
    const appsOrigin = config.get<string>('APP_BUILDS_ORIGIN');
    this.appsHost = appsOrigin ? new URL(appsOrigin).host : null;
    const origins = (config.get<string>('CORS_ORIGIN') ?? '')
      .split(',')
      .map((origin) => origin.trim())
      .filter(Boolean);
    if (config.get<string>('NODE_ENV') !== 'production') {
      origins.push('http://localhost:*', 'http://127.0.0.1:*');
    }
    this.frameAncestors = ["'self'", ...origins].join(' ');
  }

  @Get(':buildId')
  redirect(@Param('buildId') buildId: string, @Res() reply: FastifyReply) {
    // The app's relative paths only resolve under the trailing slash.
    return reply.redirect(`${buildId}/`, 301);
  }

  @Get(':buildId/*')
  async serve(
    @Param('buildId') buildId: string,
    @Req() request: FastifyRequest<{ Params: { '*': string } }>,
    @Res() reply: FastifyReply,
  ) {
    // On the API's own host the app would share an origin with the admin
    // session, so there it does not exist.
    if (this.appsHost && hostOf(request) !== this.appsHost) {
      throw new NotFoundException();
    }

    const file = await this.builds.read(buildId, request.params['*'] ?? '');
    if (!file) throw new NotFoundException();

    // Helmet writes straight onto the raw response, so that is where its
    // framing and isolation headers have to come off.
    for (const header of [
      'x-frame-options',
      'cross-origin-opener-policy',
      'cross-origin-embedder-policy',
      'content-security-policy',
      'cross-origin-resource-policy',
    ]) {
      reply.raw.removeHeader(header);
      reply.removeHeader(header);
    }
    reply.header('cross-origin-resource-policy', 'cross-origin');
    reply.header(
      'content-security-policy',
      `frame-ancestors ${this.frameAncestors}`,
    );
    // The build id never repeats, so neither a file nor where it lives changes.
    reply.header('cache-control', 'public, max-age=31536000, immutable');

    // Redirects need the same headers: the app loads its scripts through
    // them, and helmet's same-origin resource policy on the 302 alone is
    // enough for the browser to block the script.
    if ('redirect' in file) return reply.redirect(file.redirect, 302);

    reply.header('content-type', file.contentType);
    return reply.send(file.body);
  }
}
