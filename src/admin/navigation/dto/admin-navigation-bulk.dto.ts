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

export enum AdminNavigationBulkAction {
  DELETE = 'delete',
  RESTORE = 'restore',
}

export class AdminNavigationBulkDto {
  @ApiProperty({
    enum: AdminNavigationBulkAction,
    example: AdminNavigationBulkAction.DELETE,
  })
  @IsEnum(AdminNavigationBulkAction)
  action!: AdminNavigationBulkAction;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  ids!: string[];

  @ApiPropertyOptional({ example: 'Bulk cleanup of obsolete nav links' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
