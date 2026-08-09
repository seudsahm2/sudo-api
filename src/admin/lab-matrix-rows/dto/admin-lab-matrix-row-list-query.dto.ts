import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum AdminLabMatrixRowSortBy {
  POSITION = 'position',
  LABEL = 'label',
  VALUE = 'value',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export enum AdminSortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum AdminLabMatrixRowStatusFilter {
  ACTIVE = 'active',
  DELETED = 'deleted',
  ALL = 'all',
}

export class AdminLabMatrixRowListQueryDto {
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
  @IsEnum(AdminLabMatrixRowStatusFilter)
  status?: AdminLabMatrixRowStatusFilter = AdminLabMatrixRowStatusFilter.ACTIVE;

  @IsOptional()
  @IsEnum(AdminLabMatrixRowSortBy)
  sortBy?: AdminLabMatrixRowSortBy = AdminLabMatrixRowSortBy.POSITION;

  @IsOptional()
  @IsEnum(AdminSortOrder)
  sortOrder?: AdminSortOrder = AdminSortOrder.ASC;
}
