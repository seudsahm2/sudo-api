import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminPermissions } from '../decorators/admin-permissions.decorator';
import { AdminJwtAuthGuard } from '../guards/admin-jwt-auth.guard';
import { AdminPermissionsGuard } from '../guards/admin-permissions.guard';
import { AdminAuditLogService } from './admin-audit-log.service';
import { AdminAuditListQueryDto } from './dto/admin-audit-list-query.dto';

@ApiTags('admin-audit')
@ApiBearerAuth()
@UseGuards(AdminJwtAuthGuard, AdminPermissionsGuard)
@Controller('admin/audit')
export class AdminAuditController {
  constructor(private readonly adminAuditLogService: AdminAuditLogService) {}

  @Get('metadata')
  @AdminPermissions('admin:audit:read')
  @ApiOperation({ summary: 'Return metadata for admin audit log views' })
  metadata() {
    return this.adminAuditLogService.getMetadata();
  }

  @Get()
  @AdminPermissions('admin:audit:read')
  @ApiOperation({
    summary: 'List admin audit logs with pagination and filtering',
  })
  list(@Query() query: AdminAuditListQueryDto) {
    return this.adminAuditLogService.list(query);
  }
}
