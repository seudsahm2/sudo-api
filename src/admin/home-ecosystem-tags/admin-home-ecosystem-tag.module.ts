import { Module } from '@nestjs/common';
import { AdminAuditService } from '../admin-audit.service';
import { AdminHomeEcosystemTagController } from './admin-home-ecosystem-tag.controller';
import { AdminHomeEcosystemTagService } from './admin-home-ecosystem-tag.service';

@Module({
  controllers: [AdminHomeEcosystemTagController],
  providers: [AdminHomeEcosystemTagService, AdminAuditService],
})
export class AdminHomeEcosystemTagModule {}
