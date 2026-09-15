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
  AdminInquiryBulkDto,
  AdminInquiryListQueryDto,
  UpdateAdminInquiryDto,
} from './dto/admin-inquiry.dto';
import {
  AdminInquiryListResponse,
  AdminInquiryModel,
  AdminInquiryService,
} from './admin-inquiry.service';

interface AdminHttpRequest {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
}

@ApiTags('admin-inquiries')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, AdminPermissionsGuard)
@Controller('admin/inquiries')
export class AdminInquiryController {
  constructor(private readonly inquiryService: AdminInquiryService) {}

  @Get('metadata')
  @AdminPermissions('content:read')
  @ApiOperation({ summary: 'Return metadata for enquiry triage' })
  metadata(): ReturnType<AdminInquiryService['getMetadata']> {
    return this.inquiryService.getMetadata();
  }

  @Get('unread-count')
  @AdminPermissions('content:read')
  @ApiOperation({ summary: 'Count enquiries nobody has picked up yet' })
  unreadCount(): Promise<{ count: number }> {
    return this.inquiryService.countNew();
  }

  @Get()
  @AdminPermissions('content:read')
  @ApiOperation({ summary: 'List enquiries' })
  list(
    @Query() query: AdminInquiryListQueryDto,
  ): Promise<AdminInquiryListResponse> {
    return this.inquiryService.list(query);
  }

  @Get(':id')
  @AdminPermissions('content:read')
  @ApiOperation({ summary: 'Read a single enquiry' })
  getById(@Param('id') id: string): Promise<AdminInquiryModel> {
    return this.inquiryService.getById(id);
  }

  @Patch(':id')
  @AdminPermissions('content:write')
  @ApiOperation({ summary: 'Move an enquiry along its triage status' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateAdminInquiryDto,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<AdminInquiryModel> {
    return this.inquiryService.update(id, dto, admin, this.contextOf(request));
  }

  @Delete(':id')
  @AdminPermissions('content:delete')
  @ApiOperation({ summary: 'Soft delete an enquiry' })
  softDelete(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<{ id: string; deletedAt: string }> {
    return this.inquiryService.softDelete(id, admin, this.contextOf(request));
  }

  @Post(':id/restore')
  @AdminPermissions('content:restore')
  @ApiOperation({ summary: 'Restore a soft-deleted enquiry' })
  restore(
    @Param('id') id: string,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<AdminInquiryModel> {
    return this.inquiryService.restore(id, admin, this.contextOf(request));
  }

  @Post('bulk')
  @AdminPermissions('content:bulk')
  @ApiOperation({ summary: 'Run a bulk delete or restore operation' })
  bulkAction(
    @Body() dto: AdminInquiryBulkDto,
    @CurrentAdmin() admin: AdminPrincipal,
    @Req() request: AdminHttpRequest,
  ): Promise<{
    action: AdminInquiryBulkDto['action'];
    count: number;
    ids: string[];
  }> {
    return this.inquiryService.bulkAction(dto, admin, this.contextOf(request));
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
