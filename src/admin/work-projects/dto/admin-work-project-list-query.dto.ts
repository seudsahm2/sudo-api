import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum AdminWorkProjectSortBy {
  POSITION = 'position',
  TITLE = 'title',
  CLIENT = 'client',
  YEAR = 'year',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export enum AdminSortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum AdminWorkProjectStatusFilter {
  ACTIVE = 'active',
  DELETED = 'deleted',
  ALL = 'all',
}

export class AdminWorkProjectListQueryDto {
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
  @IsEnum(AdminWorkProjectStatusFilter)
  status?: AdminWorkProjectStatusFilter = AdminWorkProjectStatusFilter.ACTIVE;

  @IsOptional()
  @IsEnum(AdminWorkProjectSortBy)
  sortBy?: AdminWorkProjectSortBy = AdminWorkProjectSortBy.POSITION;

  @IsOptional()
  @IsEnum(AdminSortOrder)
  sortOrder?: AdminSortOrder = AdminSortOrder.ASC;
}
