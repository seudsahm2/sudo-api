import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum AdminServiceSortBy {
  POSITION = 'position',
  NAME = 'name',
  HANDLE = 'handle',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export enum AdminSortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum AdminServiceStatusFilter {
  ACTIVE = 'active',
  DELETED = 'deleted',
  ALL = 'all',
}

export class AdminServiceListQueryDto {
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
  @IsEnum(AdminServiceStatusFilter)
  status?: AdminServiceStatusFilter = AdminServiceStatusFilter.ACTIVE;

  @IsOptional()
  @IsEnum(AdminServiceSortBy)
  sortBy?: AdminServiceSortBy = AdminServiceSortBy.POSITION;

  @IsOptional()
  @IsEnum(AdminSortOrder)
  sortOrder?: AdminSortOrder = AdminSortOrder.ASC;
}
