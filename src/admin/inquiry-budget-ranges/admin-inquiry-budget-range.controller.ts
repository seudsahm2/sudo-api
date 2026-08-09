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
  AdminInquiryBudgetRangeListResponse,
  AdminInquiryBudgetRangeModel,
  AdminInquiryBudgetRangeService,
} from './admin-inquiry-budget-range.service';
import { AdminInquiryBudgetRangeBulkDto } from './dto/admin-inquiry-budget-range-bulk.dto';
import { AdminInquiryBudgetRangeListQueryDto } from './dto/admin-inquiry-budget-range-list-query.dto';
import { CreateAdminInquiryBudgetRangeDto } from './dto/create-admin-inquiry-budget-range.dto';
import { UpdateAdminInquiryBudgetRangeDto } from './dto/update-admin-inquiry-budget-range.dto';

interface AdminHttpRequest {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
}

@ApiTags('admin-inquiry-budget-ranges')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, AdminPermissionsGuard)
@Controller('admin/inquiry-budget-ranges')
export class AdminInquiryBudgetRangeController {
  constructor(
    private readonly inquiryBudgetRangeService: AdminInquiryBudgetRangeService,
  ) {}

  @Get('metadata')
  @AdminPermissions('content:read')
  @ApiOperation({
    summary: 'Return metadata for admin inquiry budget range management',
  })
  metadata(): ReturnType<AdminInquiryBudgetRangeService['getMetadata']> {
    return this.inquiryBudgetRangeService.getMetadata();
  }

  @Get()
  @AdminPermissions('content:read')
  @ApiOperation({
    summary:
      'List inquiry budget ranges with pagination, search, filter, and sorting',
  })
  list(
    @Query() query: AdminInquiryBudgetRangeListQueryDto,
  ): Promise<AdminInquiryBudgetRangeListResponse> {
    return this.inquiryBudgetRangeService.list(query);
  }

  @Get(':id')
  @AdminPermissions('content:read')
  @ApiOperation({ summary: 'Get a single inquiry budget range by id' })
  getById(@Param('id') id: string): Promise<AdminInquiryBudgetRangeModel> {
    return this.inquiryBudgetRangeService.getById(id);
  }

  @Post()
  @AdminPermissions('content:write')
  @ApiOperation({ summary: 'Create an inquiry budget range' })
  create(
    @Body() dto: CreateAdminInquiryBudgetRangeDto,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<AdminInquiryBudgetRangeModel> {
    return this.inquiryBudgetRangeService.create(dto, admin, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Patch(':id')
  @AdminPermissions('content:write')
  @ApiOperation({ summary: 'Update an inquiry budget range' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAdminInquiryBudgetRangeDto,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<AdminInquiryBudgetRangeModel> {
    return this.inquiryBudgetRangeService.update(id, dto, admin, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Delete(':id')
  @AdminPermissions('content:delete')
  @ApiOperation({ summary: 'Soft delete an inquiry budget range' })
  softDelete(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<{ id: string; deletedAt: string }> {
    return this.inquiryBudgetRangeService.softDelete(id, admin, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Post(':id/restore')
  @AdminPermissions('content:restore')
  @ApiOperation({ summary: 'Restore a soft-deleted inquiry budget range' })
  restore(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<AdminInquiryBudgetRangeModel> {
    return this.inquiryBudgetRangeService.restore(id, admin, {
      ipAddress: request.ip,
      userAgent: this.extractUserAgent(request.headers),
      requestId: undefined,
    });
  }

  @Post('bulk')
  @AdminPermissions('content:bulk')
  @ApiOperation({ summary: 'Run a bulk delete or restore operation' })
  bulkAction(
    @Body() dto: AdminInquiryBudgetRangeBulkDto,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<{
    action: AdminInquiryBudgetRangeBulkDto['action'];
    count: number;
    ids: string[];
  }> {
    return this.inquiryBudgetRangeService.bulkAction(dto, admin, {
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
