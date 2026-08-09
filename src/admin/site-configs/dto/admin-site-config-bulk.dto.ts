import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export enum AdminSiteConfigBulkAction {
  DELETE = 'delete',
  RESTORE = 'restore',
}

export class AdminSiteConfigBulkDto {
  @ApiProperty({
    enum: AdminSiteConfigBulkAction,
    example: AdminSiteConfigBulkAction.DELETE,
  })
  @IsEnum(AdminSiteConfigBulkAction)
  action!: AdminSiteConfigBulkAction;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsString({ each: true })
  ids!: string[];

  @ApiPropertyOptional({ example: 'Bulk archive of old site config snapshots' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
