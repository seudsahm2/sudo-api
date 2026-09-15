import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Req,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateInquiryDto } from './dto/create-inquiry.dto';
import { InquiriesService, InquiryReceipt } from './inquiries.service';

interface PublicHttpRequest {
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
}

@ApiTags('inquiries')
@Controller('inquiries')
export class InquiriesController {
  constructor(private readonly inquiriesService: InquiriesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Submit a project enquiry from the public site',
  })
  submit(
    @Body() dto: CreateInquiryDto,
    @Req() request: PublicHttpRequest,
  ): Promise<InquiryReceipt> {
    const userAgent = request.headers?.['user-agent'];

    return this.inquiriesService.submit(dto, {
      ipAddress: request.ip,
      userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent,
    });
  }
}
