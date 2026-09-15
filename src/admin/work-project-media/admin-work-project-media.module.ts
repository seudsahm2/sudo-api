import { Module } from '@nestjs/common';
import { AdminAuditService } from '../admin-audit.service';
import { AdminWorkProjectMediaController } from './admin-work-project-media.controller';
import { AdminWorkProjectMediaService } from './admin-work-project-media.service';

@Module({
  controllers: [AdminWorkProjectMediaController],
  providers: [AdminWorkProjectMediaService, AdminAuditService],
})
export class AdminWorkProjectMediaModule {}
