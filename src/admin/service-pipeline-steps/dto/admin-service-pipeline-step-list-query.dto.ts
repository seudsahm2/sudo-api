import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum AdminServicePipelineStepSortBy {
  POSITION = 'position',
  LABEL = 'label',
  STEP = 'step',
  CREATED_AT = 'createdAt',
  UPDATED_AT = 'updatedAt',
}

export enum AdminSortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export enum AdminServicePipelineStepStatusFilter {
  ACTIVE = 'active',
  DELETED = 'deleted',
  ALL = 'all',
}

export class AdminServicePipelineStepListQueryDto {
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
  @IsEnum(AdminServicePipelineStepStatusFilter)
  status?: AdminServicePipelineStepStatusFilter =
    AdminServicePipelineStepStatusFilter.ACTIVE;

  @IsOptional()
  @IsEnum(AdminServicePipelineStepSortBy)
  sortBy?: AdminServicePipelineStepSortBy =
    AdminServicePipelineStepSortBy.POSITION;

  @IsOptional()
  @IsEnum(AdminSortOrder)
  sortOrder?: AdminSortOrder = AdminSortOrder.ASC;
}
