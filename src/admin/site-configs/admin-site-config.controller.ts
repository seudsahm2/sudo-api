import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminPermissions } from '../decorators/admin-permissions.decorator';
import { CurrentAdmin } from '../decorators/current-admin.decorator';
import { AdminJwtAuthGuard } from '../guards/admin-jwt-auth.guard';
import { AdminPermissionsGuard } from '../guards/admin-permissions.guard';
import type { AdminPrincipal } from '../interfaces/admin-principal.interface';
import {
  AdminSiteConfigListResponse,
  AdminSiteConfigModel,
  AdminSiteConfigService,
} from './admin-site-config.service';
import { AdminSiteConfigBulkDto } from './dto/admin-site-config-bulk.dto';
import { AdminSiteConfigListQueryDto } from './dto/admin-site-config-list-query.dto';
import { CreateAdminSiteConfigDto } from './dto/create-admin-site-config.dto';
import { UpdateAdminSiteConfigDto } from './dto/update-admin-site-config.dto';

interface AdminHttpRequest {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
}

@ApiTags('admin-site-configs')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, AdminPermissionsGuard)
@Controller('admin/site-configs')
export class AdminSiteConfigController {
  constructor(private readonly siteConfigService: AdminSiteConfigService) {}

  @Get('metadata')
  @AdminPermissions('content:read')
  @ApiOperation({ summary: 'Return metadata for admin site config management' })
  metadata(): ReturnType<AdminSiteConfigService['getMetadata']> {
    return this.siteConfigService.getMetadata();
  }

  @Get()
  @AdminPermissions('content:read')
  @ApiOperation({
    summary: 'List site configs with pagination, search, filter, and sorting',
  })
  list(
    @Query() query: AdminSiteConfigListQueryDto,
  ): Promise<AdminSiteConfigListResponse> {
    return this.siteConfigService.list(query);
  }

  @Get(':id')
  @AdminPermissions('content:read')
  @ApiOperation({ summary: 'Get a single site config by id' })
  getById(@Param('id') id: string): Promise<AdminSiteConfigModel> {
    return this.siteConfigService.getById(id);
  }

  @Post()
  @AdminPermissions('content:write')
  @ApiOperation({ summary: 'Create a site config' })
  create(
    @Body() dto: CreateAdminSiteConfigDto,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<AdminSiteConfigModel> {
    return this.siteConfigService.create(dto, admin, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Patch(':id')
  @AdminPermissions('content:write')
  @ApiOperation({ summary: 'Update a site config' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAdminSiteConfigDto,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<AdminSiteConfigModel> {
    return this.siteConfigService.update(id, dto, admin, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Delete(':id')
  @AdminPermissions('content:delete')
  @ApiOperation({ summary: 'Soft delete a site config' })
  softDelete(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<{ id: string; deletedAt: string }> {
    return this.siteConfigService.softDelete(id, admin, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Post(':id/restore')
  @AdminPermissions('content:restore')
  @ApiOperation({ summary: 'Restore a soft-deleted site config' })
  restore(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<AdminSiteConfigModel> {
    return this.siteConfigService.restore(id, admin, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Post('bulk')
  @AdminPermissions('content:bulk')
  @ApiOperation({ summary: 'Run a bulk delete or restore operation' })
  bulkAction(
    @Body() dto: AdminSiteConfigBulkDto,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<{
    action: AdminSiteConfigBulkDto['action'];
    count: number;
    ids: string[];
  }> {
    return this.siteConfigService.bulkAction(dto, admin, {
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
