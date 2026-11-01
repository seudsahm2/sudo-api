import { Module } from '@nestjs/common';
import { InquiriesController } from './inquiries.controller';
import { InquiriesService } from './inquiries.service';
import { InquiryNotifierService } from './inquiry-notifier.service';

@Module({
  controllers: [InquiriesController],
  providers: [InquiriesService, InquiryNotifierService],
  exports: [InquiriesService],
})
export class InquiriesModule {}
