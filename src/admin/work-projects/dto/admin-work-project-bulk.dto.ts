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

export enum AdminWorkProjectBulkAction {
  DELETE = 'delete',
  RESTORE = 'restore',
}

export class AdminWorkProjectBulkDto {
  @ApiProperty({
    enum: AdminWorkProjectBulkAction,
    example: AdminWorkProjectBulkAction.DELETE,
  })
  @IsEnum(AdminWorkProjectBulkAction)
  action!: AdminWorkProjectBulkAction;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  ids!: string[];

  @ApiPropertyOptional({ example: 'Bulk archive of outdated work items' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
