import { Module } from '@nestjs/common';
import { AdminAuditController } from './admin-audit.controller';
import { AdminAuditLogService } from './admin-audit-log.service';

@Module({
  controllers: [AdminAuditController],
  providers: [AdminAuditLogService],
  exports: [AdminAuditLogService],
})
export class AdminAuditModule {}
