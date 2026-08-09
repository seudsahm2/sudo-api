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

export enum AdminLabMatrixRowBulkAction {
  DELETE = 'delete',
  RESTORE = 'restore',
}

export class AdminLabMatrixRowBulkDto {
  @ApiProperty({
    enum: AdminLabMatrixRowBulkAction,
    example: AdminLabMatrixRowBulkAction.DELETE,
  })
  @IsEnum(AdminLabMatrixRowBulkAction)
  action!: AdminLabMatrixRowBulkAction;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  ids!: string[];

  @ApiPropertyOptional({ example: 'Bulk archive of outdated matrix rows' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
