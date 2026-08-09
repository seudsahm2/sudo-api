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

export enum AdminInquiryProjectTypeBulkAction {
  DELETE = 'delete',
  RESTORE = 'restore',
}

export class AdminInquiryProjectTypeBulkDto {
  @ApiProperty({
    enum: AdminInquiryProjectTypeBulkAction,
    example: AdminInquiryProjectTypeBulkAction.DELETE,
  })
  @IsEnum(AdminInquiryProjectTypeBulkAction)
  action!: AdminInquiryProjectTypeBulkAction;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  ids!: string[];

  @ApiPropertyOptional({ example: 'Bulk cleanup of old options' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
