import { Module } from '@nestjs/common';
import { AdminAuditService } from '../admin-audit.service';
import { AdminInquiryController } from './admin-inquiry.controller';
import { AdminInquiryService } from './admin-inquiry.service';

@Module({
  controllers: [AdminInquiryController],
  providers: [AdminInquiryService, AdminAuditService],
})
export class AdminInquiryModule {}
