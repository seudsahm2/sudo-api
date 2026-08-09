import { Module } from '@nestjs/common';
import { AdminAuditService } from '../admin-audit.service';
import { AdminInquiryProjectTypeController } from './admin-inquiry-project-type.controller';
import { AdminInquiryProjectTypeService } from './admin-inquiry-project-type.service';

@Module({
  controllers: [AdminInquiryProjectTypeController],
  providers: [AdminInquiryProjectTypeService, AdminAuditService],
})
export class AdminInquiryProjectTypeModule {}
