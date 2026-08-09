import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum AdminLabSpecSortBy {
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

export enum AdminLabSpecStatusFilter {
  ACTIVE = 'active',
  DELETED = 'deleted',
  ALL = 'all',
}

export class AdminLabSpecListQueryDto {
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
  @IsEnum(AdminLabSpecStatusFilter)
  status?: AdminLabSpecStatusFilter = AdminLabSpecStatusFilter.ACTIVE;

  @IsOptional()
  @IsEnum(AdminLabSpecSortBy)
  sortBy?: AdminLabSpecSortBy = AdminLabSpecSortBy.POSITION;

  @IsOptional()
  @IsEnum(AdminSortOrder)
  sortOrder?: AdminSortOrder = AdminSortOrder.ASC;
}
