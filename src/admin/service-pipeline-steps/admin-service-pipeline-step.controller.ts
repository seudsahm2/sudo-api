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
  AdminServicePipelineStepListResponse,
  AdminServicePipelineStepModel,
  AdminServicePipelineStepService,
} from './admin-service-pipeline-step.service';
import { AdminServicePipelineStepBulkDto } from './dto/admin-service-pipeline-step-bulk.dto';
import { AdminServicePipelineStepListQueryDto } from './dto/admin-service-pipeline-step-list-query.dto';
import { CreateAdminServicePipelineStepDto } from './dto/create-admin-service-pipeline-step.dto';
import { UpdateAdminServicePipelineStepDto } from './dto/update-admin-service-pipeline-step.dto';

interface AdminHttpRequest {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
}

@ApiTags('admin-service-pipeline-steps')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, AdminPermissionsGuard)
@Controller('admin/service-pipeline-steps')
export class AdminServicePipelineStepController {
  constructor(
    private readonly servicePipelineStepService: AdminServicePipelineStepService,
  ) {}

  @Get('metadata')
  @AdminPermissions('content:read')
  @ApiOperation({
    summary: 'Return metadata for admin service pipeline step management',
  })
  metadata(): ReturnType<AdminServicePipelineStepService['getMetadata']> {
    return this.servicePipelineStepService.getMetadata();
  }

  @Get()
  @AdminPermissions('content:read')
  @ApiOperation({
    summary:
      'List service pipeline steps with pagination, search, filter, and sorting',
  })
  list(
    @Query() query: AdminServicePipelineStepListQueryDto,
  ): Promise<AdminServicePipelineStepListResponse> {
    return this.servicePipelineStepService.list(query);
  }

  @Get(':id')
  @AdminPermissions('content:read')
  @ApiOperation({ summary: 'Get a single service pipeline step by id' })
  getById(@Param('id') id: string): Promise<AdminServicePipelineStepModel> {
    return this.servicePipelineStepService.getById(id);
  }

  @Post()
  @AdminPermissions('content:write')
  @ApiOperation({ summary: 'Create a service pipeline step' })
  create(
    @Body() dto: CreateAdminServicePipelineStepDto,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<AdminServicePipelineStepModel> {
    return this.servicePipelineStepService.create(dto, admin, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Patch(':id')
  @AdminPermissions('content:write')
  @ApiOperation({ summary: 'Update a service pipeline step' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAdminServicePipelineStepDto,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<AdminServicePipelineStepModel> {
    return this.servicePipelineStepService.update(id, dto, admin, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Delete(':id')
  @AdminPermissions('content:delete')
  @ApiOperation({ summary: 'Soft delete a service pipeline step' })
  softDelete(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<{ id: string; deletedAt: string }> {
    return this.servicePipelineStepService.softDelete(id, admin, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Post(':id/restore')
  @AdminPermissions('content:restore')
  @ApiOperation({ summary: 'Restore a soft-deleted service pipeline step' })
  restore(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<AdminServicePipelineStepModel> {
    return this.servicePipelineStepService.restore(id, admin, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Post('bulk')
  @AdminPermissions('content:bulk')
  @ApiOperation({ summary: 'Run a bulk delete or restore operation' })
  bulkAction(
    @Body() dto: AdminServicePipelineStepBulkDto,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<{
    action: AdminServicePipelineStepBulkDto['action'];
    count: number;
    ids: string[];
  }> {
    return this.servicePipelineStepService.bulkAction(dto, admin, {
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
