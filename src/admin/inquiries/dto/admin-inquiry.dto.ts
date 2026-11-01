import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { HasAtLeastOneField } from '../../validators/has-at-least-one-field.decorator';

/** Where an enquiry has got to. The only thing an admin may change. */
export const INQUIRY_STATUSES = [
  'new',
  'reading',
  'replied',
  'proposal',
  'won',
  'declined',
] as const;

export enum AdminInquirySortBy {
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
  NAME = 'name',
  STATUS = 'status',
}

export enum AdminSortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum AdminInquiryStatusFilter {
  ACTIVE = 'active',
  DELETED = 'deleted',
  ALL = 'all',
}

export enum AdminInquiryBulkAction {
  DELETE = 'delete',
  RESTORE = 'restore',
}

export class AdminInquiryListQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(AdminInquiryStatusFilter)
  status?: AdminInquiryStatusFilter = AdminInquiryStatusFilter.ACTIVE;

  @IsOptional()
  @IsEnum(AdminInquirySortBy)
  sortBy?: AdminInquirySortBy = AdminInquirySortBy.CREATED_AT;

  @IsOptional()
  @IsEnum(AdminSortOrder)
  sortOrder?: AdminSortOrder = AdminSortOrder.DESC;
}

@HasAtLeastOneField(['status', 'notes'], {
  message: 'Only the status and notes of an enquiry can be changed.',
})
export class UpdateAdminInquiryDto {
  @ApiPropertyOptional({ enum: INQUIRY_STATUSES, example: 'replied' })
  @IsOptional()
  @IsIn(INQUIRY_STATUSES)
  status?: string;

  @ApiPropertyOptional({
    example: 'Called on Tuesday; sending a proposal Friday.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  notes?: string;

  @ApiPropertyOptional({
    example: '2026-04-22T15:36:10.220Z',
    description: 'Optimistic concurrency token from record updatedAt.',
  })
  @IsOptional()
  @IsISO8601()
  expectedUpdatedAt?: string;
}

export class AdminInquiryBulkDto {
  @ApiProperty({ enum: AdminInquiryBulkAction })
  @IsEnum(AdminInquiryBulkAction)
  action!: AdminInquiryBulkAction;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  ids!: string[];

  @ApiPropertyOptional({ example: 'Archiving spam' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
