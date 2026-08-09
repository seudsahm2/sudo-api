import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum AdminInquiryBudgetRangeSortBy {
  POSITION = 'position',
  VALUE = 'value',
  LABEL = 'label',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export enum AdminSortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum AdminInquiryBudgetRangeStatusFilter {
  ACTIVE = 'active',
  DELETED = 'deleted',
  ALL = 'all',
}

export class AdminInquiryBudgetRangeListQueryDto {
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
  @IsEnum(AdminInquiryBudgetRangeStatusFilter)
  status?: AdminInquiryBudgetRangeStatusFilter =
    AdminInquiryBudgetRangeStatusFilter.ACTIVE;

  @IsOptional()
  @IsEnum(AdminInquiryBudgetRangeSortBy)
  sortBy?: AdminInquiryBudgetRangeSortBy =
    AdminInquiryBudgetRangeSortBy.POSITION;

  @IsOptional()
  @IsEnum(AdminSortOrder)
  sortOrder?: AdminSortOrder = AdminSortOrder.ASC;
}
