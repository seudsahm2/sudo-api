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

export enum AdminWorkFilterBulkAction {
  DELETE = 'delete',
  RESTORE = 'restore',
}

export class AdminWorkFilterBulkDto {
  @ApiProperty({
    enum: AdminWorkFilterBulkAction,
    example: AdminWorkFilterBulkAction.DELETE,
  })
  @IsEnum(AdminWorkFilterBulkAction)
  action!: AdminWorkFilterBulkAction;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  ids!: string[];

  @ApiPropertyOptional({ example: 'Bulk archive of retired filters' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
