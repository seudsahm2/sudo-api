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

export enum AdminLabPrincipleBulkAction {
  DELETE = 'delete',
  RESTORE = 'restore',
}

export class AdminLabPrincipleBulkDto {
  @ApiProperty({
    enum: AdminLabPrincipleBulkAction,
    example: AdminLabPrincipleBulkAction.DELETE,
  })
  @IsEnum(AdminLabPrincipleBulkAction)
  action!: AdminLabPrincipleBulkAction;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  ids!: string[];

  @ApiPropertyOptional({ example: 'Bulk archive of old principles' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
