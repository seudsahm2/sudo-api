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
  AdminHomeManifestoListResponse,
  AdminHomeManifestoModel,
  AdminHomeManifestoService,
} from './admin-home-manifesto.service';
import { AdminHomeManifestoBulkDto } from './dto/admin-home-manifesto-bulk.dto';
import { AdminHomeManifestoListQueryDto } from './dto/admin-home-manifesto-list-query.dto';
import { CreateAdminHomeManifestoDto } from './dto/create-admin-home-manifesto.dto';
import { UpdateAdminHomeManifestoDto } from './dto/update-admin-home-manifesto.dto';

interface AdminHttpRequest {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
}

@ApiTags('admin-home-manifestos')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, AdminPermissionsGuard)
@Controller('admin/home-manifestos')
export class AdminHomeManifestoController {
  constructor(
    private readonly homeManifestoService: AdminHomeManifestoService,
  ) {}

  @Get('metadata')
  @AdminPermissions('content:read')
  @ApiOperation({
    summary: 'Return metadata for admin home manifesto management',
  })
  metadata(): ReturnType<AdminHomeManifestoService['getMetadata']> {
    return this.homeManifestoService.getMetadata();
  }

  @Get()
  @AdminPermissions('content:read')
  @ApiOperation({
    summary:
      'List home manifesto items with pagination, search, filter, and sorting',
  })
  list(
    @Query() query: AdminHomeManifestoListQueryDto,
  ): Promise<AdminHomeManifestoListResponse> {
    return this.homeManifestoService.list(query);
  }

  @Get(':id')
  @AdminPermissions('content:read')
  @ApiOperation({ summary: 'Get a single home manifesto item by id' })
  getById(@Param('id') id: string): Promise<AdminHomeManifestoModel> {
    return this.homeManifestoService.getById(id);
  }

  @Post()
  @AdminPermissions('content:write')
  @ApiOperation({ summary: 'Create a home manifesto item' })
  create(
    @Body() dto: CreateAdminHomeManifestoDto,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<AdminHomeManifestoModel> {
    return this.homeManifestoService.create(dto, admin, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Patch(':id')
  @AdminPermissions('content:write')
  @ApiOperation({ summary: 'Update a home manifesto item' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAdminHomeManifestoDto,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<AdminHomeManifestoModel> {
    return this.homeManifestoService.update(id, dto, admin, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Delete(':id')
  @AdminPermissions('content:delete')
  @ApiOperation({ summary: 'Soft delete a home manifesto item' })
  softDelete(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<{ id: string; deletedAt: string }> {
    return this.homeManifestoService.softDelete(id, admin, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Post(':id/restore')
  @AdminPermissions('content:restore')
  @ApiOperation({ summary: 'Restore a soft-deleted home manifesto item' })
  restore(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<AdminHomeManifestoModel> {
    return this.homeManifestoService.restore(id, admin, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Post('bulk')
  @AdminPermissions('content:bulk')
  @ApiOperation({ summary: 'Run a bulk delete or restore operation' })
  bulkAction(
    @Body() dto: AdminHomeManifestoBulkDto,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<{
    action: AdminHomeManifestoBulkDto['action'];
    count: number;
    ids: string[];
  }> {
    return this.homeManifestoService.bulkAction(dto, admin, {
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
