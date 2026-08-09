import { Module } from '@nestjs/common';
import { AdminAuditService } from '../admin-audit.service';
import { AdminWorkFilterController } from './admin-work-filter.controller';
import { AdminWorkFilterService } from './admin-work-filter.service';

@Module({
  controllers: [AdminWorkFilterController],
  providers: [AdminWorkFilterService, AdminAuditService],
})
export class AdminWorkFilterModule {}
