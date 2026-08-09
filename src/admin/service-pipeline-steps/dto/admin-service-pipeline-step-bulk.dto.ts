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

export enum AdminServicePipelineStepBulkAction {
  DELETE = 'delete',
  RESTORE = 'restore',
}

export class AdminServicePipelineStepBulkDto {
  @ApiProperty({
    enum: AdminServicePipelineStepBulkAction,
    example: AdminServicePipelineStepBulkAction.DELETE,
  })
  @IsEnum(AdminServicePipelineStepBulkAction)
  action!: AdminServicePipelineStepBulkAction;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  ids!: string[];

  @ApiPropertyOptional({ example: 'Bulk archive of old pipeline steps' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
