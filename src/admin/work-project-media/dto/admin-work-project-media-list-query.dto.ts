import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum AdminWorkProjectMediaSortBy {
  PROJECT_KEY = 'projectKey',
  POSITION = 'position',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export enum AdminSortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum AdminWorkProjectMediaStatusFilter {
  ACTIVE = 'active',
  DELETED = 'deleted',
  ALL = 'all',
}

export class AdminWorkProjectMediaListQueryDto {
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
  @IsEnum(AdminWorkProjectMediaStatusFilter)
  status?: AdminWorkProjectMediaStatusFilter =
    AdminWorkProjectMediaStatusFilter.ACTIVE;

  @IsOptional()
  @IsEnum(AdminWorkProjectMediaSortBy)
  sortBy?: AdminWorkProjectMediaSortBy =
    AdminWorkProjectMediaSortBy.PROJECT_KEY;

  @IsOptional()
  @IsEnum(AdminSortOrder)
  sortOrder?: AdminSortOrder = AdminSortOrder.ASC;
}
