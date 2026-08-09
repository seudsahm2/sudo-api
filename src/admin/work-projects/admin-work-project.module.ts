import { Module } from '@nestjs/common';
import { AdminAuditService } from '../admin-audit.service';
import { AdminWorkProjectController } from './admin-work-project.controller';
import { AdminWorkProjectService } from './admin-work-project.service';

@Module({
  controllers: [AdminWorkProjectController],
  providers: [AdminWorkProjectService, AdminAuditService],
})
export class AdminWorkProjectModule {}
