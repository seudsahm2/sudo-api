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
  AdminLabSpecListResponse,
  AdminLabSpecModel,
  AdminLabSpecService,
} from './admin-lab-spec.service';
import { AdminLabSpecBulkDto } from './dto/admin-lab-spec-bulk.dto';
import { AdminLabSpecListQueryDto } from './dto/admin-lab-spec-list-query.dto';
import { CreateAdminLabSpecDto } from './dto/create-admin-lab-spec.dto';
import { UpdateAdminLabSpecDto } from './dto/update-admin-lab-spec.dto';

interface AdminHttpRequest {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
}

@ApiTags('admin-lab-specs')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, AdminPermissionsGuard)
@Controller('admin/lab-specs')
export class AdminLabSpecController {
  constructor(private readonly labSpecService: AdminLabSpecService) {}

  @Get('metadata')
  @AdminPermissions('content:read')
  @ApiOperation({
    summary: 'Return metadata for admin lab spec management',
  })
  metadata(): ReturnType<AdminLabSpecService['getMetadata']> {
    return this.labSpecService.getMetadata();
  }

  @Get()
  @AdminPermissions('content:read')
  @ApiOperation({
    summary: 'List lab specs with pagination, search, filter, and sorting',
  })
  list(
    @Query() query: AdminLabSpecListQueryDto,
  ): Promise<AdminLabSpecListResponse> {
    return this.labSpecService.list(query);
  }

  @Get(':id')
  @AdminPermissions('content:read')
  @ApiOperation({ summary: 'Get a single lab spec by id' })
  getById(@Param('id') id: string): Promise<AdminLabSpecModel> {
    return this.labSpecService.getById(id);
  }

  @Post()
  @AdminPermissions('content:write')
  @ApiOperation({ summary: 'Create a lab spec' })
  create(
    @Body() dto: CreateAdminLabSpecDto,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<AdminLabSpecModel> {
    return this.labSpecService.create(dto, admin, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Patch(':id')
  @AdminPermissions('content:write')
  @ApiOperation({ summary: 'Update a lab spec' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAdminLabSpecDto,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<AdminLabSpecModel> {
    return this.labSpecService.update(id, dto, admin, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Delete(':id')
  @AdminPermissions('content:delete')
  @ApiOperation({ summary: 'Soft delete a lab spec' })
  softDelete(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<{ id: string; deletedAt: string }> {
    return this.labSpecService.softDelete(id, admin, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Post(':id/restore')
  @AdminPermissions('content:restore')
  @ApiOperation({ summary: 'Restore a soft-deleted lab spec' })
  restore(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<AdminLabSpecModel> {
    return this.labSpecService.restore(id, admin, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Post('bulk')
  @AdminPermissions('content:bulk')
  @ApiOperation({ summary: 'Run a bulk delete or restore operation' })
  bulkAction(
    @Body() dto: AdminLabSpecBulkDto,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<{
    action: AdminLabSpecBulkDto['action'];
    count: number;
    ids: string[];
  }> {
    return this.labSpecService.bulkAction(dto, admin, {
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
