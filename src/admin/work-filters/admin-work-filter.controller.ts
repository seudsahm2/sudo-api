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
import { AdminWorkFilterBulkDto } from './dto/admin-work-filter-bulk.dto';
import { AdminWorkFilterListQueryDto } from './dto/admin-work-filter-list-query.dto';
import { CreateAdminWorkFilterDto } from './dto/create-admin-work-filter.dto';
import { UpdateAdminWorkFilterDto } from './dto/update-admin-work-filter.dto';
import {
  AdminWorkFilterListResponse,
  AdminWorkFilterModel,
  AdminWorkFilterService,
} from './admin-work-filter.service';

interface AdminHttpRequest {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
}

@ApiTags('admin-work-filters')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, AdminPermissionsGuard)
@Controller('admin/work-filters')
export class AdminWorkFilterController {
  constructor(private readonly workFilterService: AdminWorkFilterService) {}

  @Get('metadata')
  @AdminPermissions('content:read')
  @ApiOperation({ summary: 'Return metadata for admin work filter management' })
  metadata(): ReturnType<AdminWorkFilterService['getMetadata']> {
    return this.workFilterService.getMetadata();
  }

  @Get()
  @AdminPermissions('content:read')
  @ApiOperation({
    summary: 'List work filters with pagination, search, filter, and sorting',
  })
  list(
    @Query() query: AdminWorkFilterListQueryDto,
  ): Promise<AdminWorkFilterListResponse> {
    return this.workFilterService.list(query);
  }

  @Get(':id')
  @AdminPermissions('content:read')
  @ApiOperation({ summary: 'Get a single work filter by id' })
  getById(@Param('id') id: string): Promise<AdminWorkFilterModel> {
    return this.workFilterService.getById(id);
  }

  @Post()
  @AdminPermissions('content:write')
  @ApiOperation({ summary: 'Create a work filter' })
  create(
    @Body() dto: CreateAdminWorkFilterDto,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<AdminWorkFilterModel> {
    return this.workFilterService.create(dto, admin, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Patch(':id')
  @AdminPermissions('content:write')
  @ApiOperation({ summary: 'Update a work filter' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAdminWorkFilterDto,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<AdminWorkFilterModel> {
    return this.workFilterService.update(id, dto, admin, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Delete(':id')
  @AdminPermissions('content:delete')
  @ApiOperation({ summary: 'Soft delete a work filter' })
  softDelete(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<{ id: string; deletedAt: string }> {
    return this.workFilterService.softDelete(id, admin, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Post(':id/restore')
  @AdminPermissions('content:restore')
  @ApiOperation({ summary: 'Restore a soft-deleted work filter' })
  restore(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<AdminWorkFilterModel> {
    return this.workFilterService.restore(id, admin, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Post('bulk')
  @AdminPermissions('content:bulk')
  @ApiOperation({ summary: 'Run a bulk delete or restore operation' })
  bulkAction(
    @Body() dto: AdminWorkFilterBulkDto,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<{
    action: AdminWorkFilterBulkDto['action'];
    count: number;
    ids: string[];
  }> {
    return this.workFilterService.bulkAction(dto, admin, {
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
