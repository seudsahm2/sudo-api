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
  AdminLabMatrixRowListResponse,
  AdminLabMatrixRowModel,
  AdminLabMatrixRowService,
} from './admin-lab-matrix-row.service';
import { AdminLabMatrixRowBulkDto } from './dto/admin-lab-matrix-row-bulk.dto';
import { AdminLabMatrixRowListQueryDto } from './dto/admin-lab-matrix-row-list-query.dto';
import { CreateAdminLabMatrixRowDto } from './dto/create-admin-lab-matrix-row.dto';
import { UpdateAdminLabMatrixRowDto } from './dto/update-admin-lab-matrix-row.dto';

interface AdminHttpRequest {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
}

@ApiTags('admin-lab-matrix-rows')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, AdminPermissionsGuard)
@Controller('admin/lab-matrix-rows')
export class AdminLabMatrixRowController {
  constructor(private readonly labMatrixRowService: AdminLabMatrixRowService) {}

  @Get('metadata')
  @AdminPermissions('content:read')
  @ApiOperation({
    summary: 'Return metadata for admin lab matrix row management',
  })
  metadata(): ReturnType<AdminLabMatrixRowService['getMetadata']> {
    return this.labMatrixRowService.getMetadata();
  }

  @Get()
  @AdminPermissions('content:read')
  @ApiOperation({
    summary:
      'List lab matrix rows with pagination, search, filter, and sorting',
  })
  list(
    @Query() query: AdminLabMatrixRowListQueryDto,
  ): Promise<AdminLabMatrixRowListResponse> {
    return this.labMatrixRowService.list(query);
  }

  @Get(':id')
  @AdminPermissions('content:read')
  @ApiOperation({ summary: 'Get a single lab matrix row by id' })
  getById(@Param('id') id: string): Promise<AdminLabMatrixRowModel> {
    return this.labMatrixRowService.getById(id);
  }

  @Post()
  @AdminPermissions('content:write')
  @ApiOperation({ summary: 'Create a lab matrix row' })
  create(
    @Body() dto: CreateAdminLabMatrixRowDto,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<AdminLabMatrixRowModel> {
    return this.labMatrixRowService.create(dto, admin, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Patch(':id')
  @AdminPermissions('content:write')
  @ApiOperation({ summary: 'Update a lab matrix row' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAdminLabMatrixRowDto,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<AdminLabMatrixRowModel> {
    return this.labMatrixRowService.update(id, dto, admin, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Delete(':id')
  @AdminPermissions('content:delete')
  @ApiOperation({ summary: 'Soft delete a lab matrix row' })
  softDelete(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<{ id: string; deletedAt: string }> {
    return this.labMatrixRowService.softDelete(id, admin, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Post(':id/restore')
  @AdminPermissions('content:restore')
  @ApiOperation({ summary: 'Restore a soft-deleted lab matrix row' })
  restore(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<AdminLabMatrixRowModel> {
    return this.labMatrixRowService.restore(id, admin, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Post('bulk')
  @AdminPermissions('content:bulk')
  @ApiOperation({ summary: 'Run a bulk delete or restore operation' })
  bulkAction(
    @Body() dto: AdminLabMatrixRowBulkDto,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<{
    action: AdminLabMatrixRowBulkDto['action'];
    count: number;
    ids: string[];
  }> {
    return this.labMatrixRowService.bulkAction(dto, admin, {
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
