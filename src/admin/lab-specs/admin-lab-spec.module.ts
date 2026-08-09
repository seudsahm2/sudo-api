import { Module } from '@nestjs/common';
import { AdminAuditService } from '../admin-audit.service';
import { AdminLabSpecController } from './admin-lab-spec.controller';
import { AdminLabSpecService } from './admin-lab-spec.service';

@Module({
  controllers: [AdminLabSpecController],
  providers: [AdminLabSpecService, AdminAuditService],
})
export class AdminLabSpecModule {}
