import { Module } from '@nestjs/common';
import { AdminAuditService } from '../admin-audit.service';
import { AdminLabMatrixRowController } from './admin-lab-matrix-row.controller';
import { AdminLabMatrixRowService } from './admin-lab-matrix-row.service';

@Module({
  controllers: [AdminLabMatrixRowController],
  providers: [AdminLabMatrixRowService, AdminAuditService],
})
export class AdminLabMatrixRowModule {}
