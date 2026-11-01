import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { AdminPermissions } from '../admin/decorators/admin-permissions.decorator';
import { CurrentAdmin } from '../admin/decorators/current-admin.decorator';
import { AdminJwtAuthGuard } from '../admin/guards/admin-jwt-auth.guard';
import { AdminPermissionsGuard } from '../admin/guards/admin-permissions.guard';
import type { AdminPrincipal } from '../admin/interfaces/admin-principal.interface';
import { AdminAuditService } from '../admin/admin-audit.service';
import { MediaService, UploadedMedia } from './media.service';

const ALLOWED_FOLDERS = new Set(['work', 'services', 'studio', 'brand']);

@ApiTags('admin-media')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, AdminPermissionsGuard)
@Controller('admin/media')
export class AdminMediaController {
  constructor(
    private readonly mediaService: MediaService,
    private readonly auditService: AdminAuditService,
  ) {}

  @Get('status')
  @AdminPermissions('content:read')
  @ApiOperation({ summary: 'Report whether object storage is configured' })
  status(): { configured: boolean; folders: string[] } {
    return {
      configured: this.mediaService.isConfigured,
      folders: [...ALLOWED_FOLDERS],
    };
  }

  @Post()
  @AdminPermissions('content:write')
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload an image and return its public URL' })
  async upload(
    @Req() request: FastifyRequest,
    @CurrentAdmin() actor: AdminPrincipal,
  ): Promise<UploadedMedia> {
    const file = await request.file();

    if (!file) {
      throw new BadRequestException(
        'Attach an image file under the "file" field.',
      );
    }

    const requestedFolder = file.fields?.folder;
    const folder =
      requestedFolder && 'value' in requestedFolder
        ? String(requestedFolder.value)
        : 'work';

    if (!ALLOWED_FOLDERS.has(folder)) {
      throw new BadRequestException(
        `folder must be one of: ${[...ALLOWED_FOLDERS].join(', ')}.`,
      );
    }

    let body: Buffer;
    try {
      body = await file.toBuffer();
    } catch {
      // @fastify/multipart throws once the configured fileSize cap is passed.
      throw new BadRequestException(
        'That image is larger than the upload limit.',
      );
    }

    const uploaded = await this.mediaService.upload(
      body,
      file.filename,
      folder,
    );

    await this.auditService.record({
      actorAdminUserId: actor.id,
      actorEmail: actor.email,
      action: 'content.media.upload',
      resource: 'media',
      resourceId: uploaded.key,
      method: 'POST',
      path: '/api/admin/media',
      after: {
        key: uploaded.key,
        bytes: uploaded.bytes,
        contentType: uploaded.contentType,
      },
    });

    return uploaded;
  }
}
