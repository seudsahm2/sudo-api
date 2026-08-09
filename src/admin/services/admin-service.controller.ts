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
  AdminServiceListResponse,
  AdminServiceModel,
  AdminServiceService,
} from './admin-service.service';
import { AdminServiceBulkDto } from './dto/admin-service-bulk.dto';
import { AdminServiceListQueryDto } from './dto/admin-service-list-query.dto';
import { CreateAdminServiceDto } from './dto/create-admin-service.dto';
import { UpdateAdminServiceDto } from './dto/update-admin-service.dto';

interface AdminHttpRequest {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
}

@ApiTags('admin-services')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, AdminPermissionsGuard)
@Controller('admin/services')
export class AdminServiceController {
  constructor(private readonly serviceService: AdminServiceService) {}

  @Get('metadata')
  @AdminPermissions('content:read')
  @ApiOperation({ summary: 'Return metadata for admin service management' })
  metadata(): ReturnType<AdminServiceService['getMetadata']> {
    return this.serviceService.getMetadata();
  }

  @Get()
  @AdminPermissions('content:read')
  @ApiOperation({
    summary: 'List services with pagination, search, filter, and sorting',
  })
  list(
    @Query() query: AdminServiceListQueryDto,
  ): Promise<AdminServiceListResponse> {
    return this.serviceService.list(query);
  }

  @Get(':id')
  @AdminPermissions('content:read')
  @ApiOperation({ summary: 'Get a single service by id' })
  getById(@Param('id') id: string): Promise<AdminServiceModel> {
    return this.serviceService.getById(id);
  }

  @Post()
  @AdminPermissions('content:write')
  @ApiOperation({ summary: 'Create a service' })
  create(
    @Body() dto: CreateAdminServiceDto,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<AdminServiceModel> {
    return this.serviceService.create(dto, admin, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Patch(':id')
  @AdminPermissions('content:write')
  @ApiOperation({ summary: 'Update a service' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAdminServiceDto,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<AdminServiceModel> {
    return this.serviceService.update(id, dto, admin, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Delete(':id')
  @AdminPermissions('content:delete')
  @ApiOperation({ summary: 'Soft delete a service' })
  softDelete(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<{ id: string; deletedAt: string }> {
    return this.serviceService.softDelete(id, admin, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Post(':id/restore')
  @AdminPermissions('content:restore')
  @ApiOperation({ summary: 'Restore a soft-deleted service' })
  restore(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<AdminServiceModel> {
    return this.serviceService.restore(id, admin, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Post('bulk')
  @AdminPermissions('content:bulk')
  @ApiOperation({ summary: 'Run a bulk delete or restore operation' })
  bulkAction(
    @Body() dto: AdminServiceBulkDto,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<{
    action: AdminServiceBulkDto['action'];
    count: number;
    ids: string[];
  }> {
    return this.serviceService.bulkAction(dto, admin, {
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
