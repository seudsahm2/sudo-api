import { Module } from '@nestjs/common';
import { AdminAuditService } from '../admin-audit.service';
import { AdminInquiryBudgetRangeController } from './admin-inquiry-budget-range.controller';
import { AdminInquiryBudgetRangeService } from './admin-inquiry-budget-range.service';

@Module({
  controllers: [AdminInquiryBudgetRangeController],
  providers: [AdminInquiryBudgetRangeService, AdminAuditService],
})
export class AdminInquiryBudgetRangeModule {}
