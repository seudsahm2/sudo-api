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
  AdminLabPrincipleListResponse,
  AdminLabPrincipleModel,
  AdminLabPrincipleService,
} from './admin-lab-principle.service';
import { AdminLabPrincipleBulkDto } from './dto/admin-lab-principle-bulk.dto';
import { AdminLabPrincipleListQueryDto } from './dto/admin-lab-principle-list-query.dto';
import { CreateAdminLabPrincipleDto } from './dto/create-admin-lab-principle.dto';
import { UpdateAdminLabPrincipleDto } from './dto/update-admin-lab-principle.dto';

interface AdminHttpRequest {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
}

@ApiTags('admin-lab-principles')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, AdminPermissionsGuard)
@Controller('admin/lab-principles')
export class AdminLabPrincipleController {
  constructor(private readonly labPrincipleService: AdminLabPrincipleService) {}

  @Get('metadata')
  @AdminPermissions('content:read')
  @ApiOperation({
    summary: 'Return metadata for admin lab principle management',
  })
  metadata(): ReturnType<AdminLabPrincipleService['getMetadata']> {
    return this.labPrincipleService.getMetadata();
  }

  @Get()
  @AdminPermissions('content:read')
  @ApiOperation({
    summary: 'List lab principles with pagination, search, filter, and sorting',
  })
  list(
    @Query() query: AdminLabPrincipleListQueryDto,
  ): Promise<AdminLabPrincipleListResponse> {
    return this.labPrincipleService.list(query);
  }

  @Get(':id')
  @AdminPermissions('content:read')
  @ApiOperation({ summary: 'Get a single lab principle by id' })
  getById(@Param('id') id: string): Promise<AdminLabPrincipleModel> {
    return this.labPrincipleService.getById(id);
  }

  @Post()
  @AdminPermissions('content:write')
  @ApiOperation({ summary: 'Create a lab principle' })
  create(
    @Body() dto: CreateAdminLabPrincipleDto,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<AdminLabPrincipleModel> {
    return this.labPrincipleService.create(dto, admin, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Patch(':id')
  @AdminPermissions('content:write')
  @ApiOperation({ summary: 'Update a lab principle' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAdminLabPrincipleDto,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<AdminLabPrincipleModel> {
    return this.labPrincipleService.update(id, dto, admin, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Delete(':id')
  @AdminPermissions('content:delete')
  @ApiOperation({ summary: 'Soft delete a lab principle' })
  softDelete(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<{ id: string; deletedAt: string }> {
    return this.labPrincipleService.softDelete(id, admin, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Post(':id/restore')
  @AdminPermissions('content:restore')
  @ApiOperation({ summary: 'Restore a soft-deleted lab principle' })
  restore(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<AdminLabPrincipleModel> {
    return this.labPrincipleService.restore(id, admin, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Post('bulk')
  @AdminPermissions('content:bulk')
  @ApiOperation({ summary: 'Run a bulk delete or restore operation' })
  bulkAction(
    @Body() dto: AdminLabPrincipleBulkDto,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<{
    action: AdminLabPrincipleBulkDto['action'];
    count: number;
    ids: string[];
  }> {
    return this.labPrincipleService.bulkAction(dto, admin, {
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
