import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminPermissions } from '../decorators/admin-permissions.decorator';
import { CurrentAdmin } from '../decorators/current-admin.decorator';
import { AdminJwtAuthGuard } from '../guards/admin-jwt-auth.guard';
import { AdminPermissionsGuard } from '../guards/admin-permissions.guard';
import type { AdminPrincipal } from '../interfaces/admin-principal.interface';
import {
  AdminContentBackupResponse,
  AdminContentOperationsService,
  AdminContentRestoreResponse,
} from './admin-content-operations.service';
import { RestoreAdminContentDto } from './dto/restore-admin-content.dto';

interface AdminHttpRequest {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
}

@ApiTags('admin-operations')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, AdminPermissionsGuard)
@Controller('admin/operations')
export class AdminContentOperationsController {
  constructor(
    private readonly contentOperationsService: AdminContentOperationsService,
  ) {}

  @Get('content-backup')
  @AdminPermissions('content:read')
  @ApiOperation({ summary: 'Export managed content tables as a JSON snapshot' })
  backup(
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<AdminContentBackupResponse> {
    return this.contentOperationsService.createBackup(admin, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Post('content-restore')
  @AdminPermissions('content:write')
  @ApiOperation({
    summary: 'Restore managed content tables from a JSON snapshot',
  })
  restore(
    @Body() dto: RestoreAdminContentDto,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<AdminContentRestoreResponse> {
    return this.contentOperationsService.restoreBackup(dto, admin, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
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
}
