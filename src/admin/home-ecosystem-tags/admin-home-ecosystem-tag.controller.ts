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
  AdminHomeEcosystemTagListResponse,
  AdminHomeEcosystemTagModel,
  AdminHomeEcosystemTagService,
} from './admin-home-ecosystem-tag.service';
import { AdminHomeEcosystemTagBulkDto } from './dto/admin-home-ecosystem-tag-bulk.dto';
import { AdminHomeEcosystemTagListQueryDto } from './dto/admin-home-ecosystem-tag-list-query.dto';
import { CreateAdminHomeEcosystemTagDto } from './dto/create-admin-home-ecosystem-tag.dto';
import { UpdateAdminHomeEcosystemTagDto } from './dto/update-admin-home-ecosystem-tag.dto';

interface AdminHttpRequest {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
}

@ApiTags('admin-home-ecosystem-tags')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, AdminPermissionsGuard)
@Controller('admin/home-ecosystem-tags')
export class AdminHomeEcosystemTagController {
  constructor(
    private readonly homeEcosystemTagService: AdminHomeEcosystemTagService,
  ) {}

  @Get('metadata')
  @AdminPermissions('content:read')
  @ApiOperation({
    summary: 'Return metadata for admin home ecosystem tag management',
  })
  metadata(): ReturnType<AdminHomeEcosystemTagService['getMetadata']> {
    return this.homeEcosystemTagService.getMetadata();
  }

  @Get()
  @AdminPermissions('content:read')
  @ApiOperation({
    summary:
      'List home ecosystem tags with pagination, search, filter, and sorting',
  })
  list(
    @Query() query: AdminHomeEcosystemTagListQueryDto,
  ): Promise<AdminHomeEcosystemTagListResponse> {
    return this.homeEcosystemTagService.list(query);
  }

  @Get(':id')
  @AdminPermissions('content:read')
  @ApiOperation({ summary: 'Get a single home ecosystem tag by id' })
  getById(@Param('id') id: string): Promise<AdminHomeEcosystemTagModel> {
    return this.homeEcosystemTagService.getById(id);
  }

  @Post()
  @AdminPermissions('content:write')
  @ApiOperation({ summary: 'Create a home ecosystem tag' })
  create(
    @Body() dto: CreateAdminHomeEcosystemTagDto,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<AdminHomeEcosystemTagModel> {
    return this.homeEcosystemTagService.create(dto, admin, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Patch(':id')
  @AdminPermissions('content:write')
  @ApiOperation({ summary: 'Update a home ecosystem tag' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAdminHomeEcosystemTagDto,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<AdminHomeEcosystemTagModel> {
    return this.homeEcosystemTagService.update(id, dto, admin, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Delete(':id')
  @AdminPermissions('content:delete')
  @ApiOperation({ summary: 'Soft delete a home ecosystem tag' })
  softDelete(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<{ id: string; deletedAt: string }> {
    return this.homeEcosystemTagService.softDelete(id, admin, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Post(':id/restore')
  @AdminPermissions('content:restore')
  @ApiOperation({ summary: 'Restore a soft-deleted home ecosystem tag' })
  restore(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<AdminHomeEcosystemTagModel> {
    return this.homeEcosystemTagService.restore(id, admin, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Post('bulk')
  @AdminPermissions('content:bulk')
  @ApiOperation({ summary: 'Run a bulk delete or restore operation' })
  bulkAction(
    @Body() dto: AdminHomeEcosystemTagBulkDto,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<{
    action: AdminHomeEcosystemTagBulkDto['action'];
    count: number;
    ids: string[];
  }> {
    return this.homeEcosystemTagService.bulkAction(dto, admin, {
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
