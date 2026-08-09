import { Module } from '@nestjs/common';
import { AdminAuditService } from '../admin-audit.service';
import { AdminLabPrincipleController } from './admin-lab-principle.controller';
import { AdminLabPrincipleService } from './admin-lab-principle.service';

@Module({
  controllers: [AdminLabPrincipleController],
  providers: [AdminLabPrincipleService, AdminAuditService],
})
export class AdminLabPrincipleModule {}
