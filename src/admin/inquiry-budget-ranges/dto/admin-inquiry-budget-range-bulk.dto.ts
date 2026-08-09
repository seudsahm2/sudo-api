import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export enum AdminInquiryBudgetRangeBulkAction {
  DELETE = 'delete',
  RESTORE = 'restore',
}

export class AdminInquiryBudgetRangeBulkDto {
  @ApiProperty({
    enum: AdminInquiryBudgetRangeBulkAction,
    example: AdminInquiryBudgetRangeBulkAction.DELETE,
  })
  @IsEnum(AdminInquiryBudgetRangeBulkAction)
  action!: AdminInquiryBudgetRangeBulkAction;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  ids!: string[];

  @ApiPropertyOptional({ example: 'Bulk cleanup of old ranges' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
