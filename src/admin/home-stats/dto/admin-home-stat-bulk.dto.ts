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

export enum AdminHomeStatBulkAction {
  DELETE = 'delete',
  RESTORE = 'restore',
}

export class AdminHomeStatBulkDto {
  @ApiProperty({
    enum: AdminHomeStatBulkAction,
    example: AdminHomeStatBulkAction.DELETE,
  })
  @IsEnum(AdminHomeStatBulkAction)
  action!: AdminHomeStatBulkAction;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  ids!: string[];

  @ApiPropertyOptional({ example: 'Bulk archive of stale home stats' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
