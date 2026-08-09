import { Module } from '@nestjs/common';
import { AdminAuditService } from '../admin-audit.service';
import { AdminSiteConfigController } from './admin-site-config.controller';
import { AdminSiteConfigService } from './admin-site-config.service';

@Module({
  controllers: [AdminSiteConfigController],
  providers: [AdminSiteConfigService, AdminAuditService],
})
export class AdminSiteConfigModule {}
