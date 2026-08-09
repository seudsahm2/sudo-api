import { Module } from '@nestjs/common';
import { AdminAuditService } from '../admin-audit.service';
import { AdminServiceController } from './admin-service.controller';
import { AdminServiceService } from './admin-service.service';

@Module({
  controllers: [AdminServiceController],
  providers: [AdminServiceService, AdminAuditService],
})
export class AdminServiceModule {}
