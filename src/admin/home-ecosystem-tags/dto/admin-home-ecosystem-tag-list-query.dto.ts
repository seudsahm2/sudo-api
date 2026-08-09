import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum AdminHomeEcosystemTagSortBy {
  POSITION = 'position',
  TAG = 'tag',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export enum AdminSortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum AdminHomeEcosystemTagStatusFilter {
  ACTIVE = 'active',
  DELETED = 'deleted',
  ALL = 'all',
}

export class AdminHomeEcosystemTagListQueryDto {
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
  @IsEnum(AdminHomeEcosystemTagStatusFilter)
  status?: AdminHomeEcosystemTagStatusFilter =
    AdminHomeEcosystemTagStatusFilter.ACTIVE;

  @IsOptional()
  @IsEnum(AdminHomeEcosystemTagSortBy)
  sortBy?: AdminHomeEcosystemTagSortBy = AdminHomeEcosystemTagSortBy.POSITION;

  @IsOptional()
  @IsEnum(AdminSortOrder)
  sortOrder?: AdminSortOrder = AdminSortOrder.ASC;
}
