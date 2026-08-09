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

export enum AdminServiceBulkAction {
  DELETE = 'delete',
  RESTORE = 'restore',
}

export class AdminServiceBulkDto {
  @ApiProperty({
    enum: AdminServiceBulkAction,
    example: AdminServiceBulkAction.DELETE,
  })
  @IsEnum(AdminServiceBulkAction)
  action!: AdminServiceBulkAction;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  ids!: string[];

  @ApiPropertyOptional({ example: 'Bulk archive of retired services' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
