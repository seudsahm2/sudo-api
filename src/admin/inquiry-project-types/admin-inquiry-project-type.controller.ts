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
  AdminInquiryProjectTypeListResponse,
  AdminInquiryProjectTypeModel,
  AdminInquiryProjectTypeService,
} from './admin-inquiry-project-type.service';
import { AdminInquiryProjectTypeBulkDto } from './dto/admin-inquiry-project-type-bulk.dto';
import { AdminInquiryProjectTypeListQueryDto } from './dto/admin-inquiry-project-type-list-query.dto';
import { CreateAdminInquiryProjectTypeDto } from './dto/create-admin-inquiry-project-type.dto';
import { UpdateAdminInquiryProjectTypeDto } from './dto/update-admin-inquiry-project-type.dto';

interface AdminHttpRequest {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
}

@ApiTags('admin-inquiry-project-types')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, AdminPermissionsGuard)
@Controller('admin/inquiry-project-types')
export class AdminInquiryProjectTypeController {
  constructor(
    private readonly inquiryProjectTypeService: AdminInquiryProjectTypeService,
  ) {}

  @Get('metadata')
  @AdminPermissions('content:read')
  @ApiOperation({
    summary: 'Return metadata for admin inquiry project type management',
  })
  metadata(): ReturnType<AdminInquiryProjectTypeService['getMetadata']> {
    return this.inquiryProjectTypeService.getMetadata();
  }

  @Get()
  @AdminPermissions('content:read')
  @ApiOperation({
    summary:
      'List inquiry project types with pagination, search, filter, and sorting',
  })
  list(
    @Query() query: AdminInquiryProjectTypeListQueryDto,
  ): Promise<AdminInquiryProjectTypeListResponse> {
    return this.inquiryProjectTypeService.list(query);
  }

  @Get(':id')
  @AdminPermissions('content:read')
  @ApiOperation({ summary: 'Get a single inquiry project type by id' })
  getById(@Param('id') id: string): Promise<AdminInquiryProjectTypeModel> {
    return this.inquiryProjectTypeService.getById(id);
  }

  @Post()
  @AdminPermissions('content:write')
  @ApiOperation({ summary: 'Create an inquiry project type' })
  create(
    @Body() dto: CreateAdminInquiryProjectTypeDto,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<AdminInquiryProjectTypeModel> {
    return this.inquiryProjectTypeService.create(dto, admin, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Patch(':id')
  @AdminPermissions('content:write')
  @ApiOperation({ summary: 'Update an inquiry project type' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAdminInquiryProjectTypeDto,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<AdminInquiryProjectTypeModel> {
    return this.inquiryProjectTypeService.update(id, dto, admin, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Delete(':id')
  @AdminPermissions('content:delete')
  @ApiOperation({ summary: 'Soft delete an inquiry project type' })
  softDelete(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<{ id: string; deletedAt: string }> {
    return this.inquiryProjectTypeService.softDelete(id, admin, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Post(':id/restore')
  @AdminPermissions('content:restore')
  @ApiOperation({ summary: 'Restore a soft-deleted inquiry project type' })
  restore(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<AdminInquiryProjectTypeModel> {
    return this.inquiryProjectTypeService.restore(id, admin, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Post('bulk')
  @AdminPermissions('content:bulk')
  @ApiOperation({ summary: 'Run a bulk delete or restore operation' })
  bulkAction(
    @Body() dto: AdminInquiryProjectTypeBulkDto,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<{
    action: AdminInquiryProjectTypeBulkDto['action'];
    count: number;
    ids: string[];
  }> {
    return this.inquiryProjectTypeService.bulkAction(dto, admin, {
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
