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

export enum AdminLabSpecBulkAction {
  DELETE = 'delete',
  RESTORE = 'restore',
}

export class AdminLabSpecBulkDto {
  @ApiProperty({
    enum: AdminLabSpecBulkAction,
    example: AdminLabSpecBulkAction.DELETE,
  })
  @IsEnum(AdminLabSpecBulkAction)
  action!: AdminLabSpecBulkAction;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  ids!: string[];

  @ApiPropertyOptional({ example: 'Bulk archive of old lab specs' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
