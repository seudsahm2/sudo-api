import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum AdminSiteConfigSortBy {
  NAME = 'name',
  SHORT_NAME = 'shortName',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export enum AdminSortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum AdminSiteConfigStatusFilter {
  ACTIVE = 'active',
  DELETED = 'deleted',
  ALL = 'all',
}

export class AdminSiteConfigListQueryDto {
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
  @IsEnum(AdminSiteConfigStatusFilter)
  status?: AdminSiteConfigStatusFilter = AdminSiteConfigStatusFilter.ACTIVE;

  @IsOptional()
  @IsEnum(AdminSiteConfigSortBy)
  sortBy?: AdminSiteConfigSortBy = AdminSiteConfigSortBy.CREATED_AT;

  @IsOptional()
  @IsEnum(AdminSortOrder)
  sortOrder?: AdminSortOrder = AdminSortOrder.DESC;
}
