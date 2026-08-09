import { Module } from '@nestjs/common';
import { AdminAuditService } from '../admin-audit.service';
import { AdminHomeStatController } from './admin-home-stat.controller';
import { AdminHomeStatService } from './admin-home-stat.service';

@Module({
  controllers: [AdminHomeStatController],
  providers: [AdminHomeStatService, AdminAuditService],
})
export class AdminHomeStatModule {}
