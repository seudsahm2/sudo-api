import { Module } from '@nestjs/common';
import { AdminAuditService } from '../admin-audit.service';
import { AdminContentOperationsController } from './admin-content-operations.controller';
import { AdminContentOperationsService } from './admin-content-operations.service';

@Module({
  controllers: [AdminContentOperationsController],
  providers: [AdminContentOperationsService, AdminAuditService],
})
export class AdminContentOperationsModule {}
