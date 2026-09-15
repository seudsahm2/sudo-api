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
import { AdminWorkProjectMediaBulkDto } from './dto/admin-work-project-media-bulk.dto';
import { AdminWorkProjectMediaListQueryDto } from './dto/admin-work-project-media-list-query.dto';
import { CreateAdminWorkProjectMediaDto } from './dto/create-admin-work-project-media.dto';
import { UpdateAdminWorkProjectMediaDto } from './dto/update-admin-work-project-media.dto';
import {
  AdminWorkProjectMediaListResponse,
  AdminWorkProjectMediaModel,
  AdminWorkProjectMediaService,
} from './admin-work-project-media.service';

interface AdminHttpRequest {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
}

@ApiTags('admin-work-project-media')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, AdminPermissionsGuard)
@Controller('admin/work-project-media')
export class AdminWorkProjectMediaController {
  constructor(private readonly mediaService: AdminWorkProjectMediaService) {}

  @Get('metadata')
  @AdminPermissions('content:read')
  @ApiOperation({
    summary: 'Return metadata for project screenshot management',
  })
  metadata(): ReturnType<AdminWorkProjectMediaService['getMetadata']> {
    return this.mediaService.getMetadata();
  }

  @Get()
  @AdminPermissions('content:read')
  @ApiOperation({ summary: 'List project screenshots' })
  list(
    @Query() query: AdminWorkProjectMediaListQueryDto,
  ): Promise<AdminWorkProjectMediaListResponse> {
    return this.mediaService.list(query);
  }

  @Get(':id')
  @AdminPermissions('content:read')
  @ApiOperation({ summary: 'Get a single screenshot by id' })
  getById(@Param('id') id: string): Promise<AdminWorkProjectMediaModel> {
    return this.mediaService.getById(id);
  }

  @Post()
  @AdminPermissions('content:write')
  @ApiOperation({ summary: 'Add a screenshot to a project gallery' })
  create(
    @Body() dto: CreateAdminWorkProjectMediaDto,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<AdminWorkProjectMediaModel> {
    return this.mediaService.create(dto, admin, this.contextOf(request));
  }

  @Patch(':id')
  @AdminPermissions('content:write')
  @ApiOperation({ summary: 'Update a screenshot' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAdminWorkProjectMediaDto,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<AdminWorkProjectMediaModel> {
    return this.mediaService.update(id, dto, admin, this.contextOf(request));
  }

  @Delete(':id')
  @AdminPermissions('content:delete')
  @ApiOperation({ summary: 'Soft delete a screenshot' })
  softDelete(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<{ id: string; deletedAt: string }> {
    return this.mediaService.softDelete(id, admin, this.contextOf(request));
  }

  @Post(':id/restore')
  @AdminPermissions('content:restore')
  @ApiOperation({ summary: 'Restore a soft-deleted screenshot' })
  restore(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<AdminWorkProjectMediaModel> {
    return this.mediaService.restore(id, admin, this.contextOf(request));
  }

  @Post('bulk')
  @AdminPermissions('content:bulk')
  @ApiOperation({ summary: 'Run a bulk delete or restore operation' })
  bulkAction(
    @Body() dto: AdminWorkProjectMediaBulkDto,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<{
    action: AdminWorkProjectMediaBulkDto['action'];
    count: number;
    ids: string[];
  }> {
    return this.mediaService.bulkAction(dto, admin, this.contextOf(request));
  }

  private contextOf(request: AdminHttpRequest) {
    const userAgent = request.headers?.['user-agent'];

    return {
      ipAddress: request.ip,
      userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
      requestId: undefined,
    };
  }
}
