import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum AdminLabPrincipleSortBy {
  POSITION = 'position',
  NAME = 'name',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export enum AdminSortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum AdminLabPrincipleStatusFilter {
  ACTIVE = 'active',
  DELETED = 'deleted',
  ALL = 'all',
}

export class AdminLabPrincipleListQueryDto {
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
  @IsEnum(AdminLabPrincipleStatusFilter)
  status?: AdminLabPrincipleStatusFilter = AdminLabPrincipleStatusFilter.ACTIVE;

  @IsOptional()
  @IsEnum(AdminLabPrincipleSortBy)
  sortBy?: AdminLabPrincipleSortBy = AdminLabPrincipleSortBy.POSITION;

  @IsOptional()
  @IsEnum(AdminSortOrder)
  sortOrder?: AdminSortOrder = AdminSortOrder.ASC;
}
