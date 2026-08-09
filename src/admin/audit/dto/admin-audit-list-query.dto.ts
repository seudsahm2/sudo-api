import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum AdminAuditSortBy {
  CREATED_AT = 'createdAt',
}

export enum AdminAuditSortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class AdminAuditListQueryDto {
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
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  resource?: string;

  @IsOptional()
  @IsEnum(AdminAuditSortBy)
  sortBy?: AdminAuditSortBy = AdminAuditSortBy.CREATED_AT;

  @IsOptional()
  @IsEnum(AdminAuditSortOrder)
  sortOrder?: AdminAuditSortOrder = AdminAuditSortOrder.DESC;
}
