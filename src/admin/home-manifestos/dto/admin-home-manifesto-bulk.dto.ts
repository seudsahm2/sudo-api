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

export enum AdminHomeManifestoBulkAction {
  DELETE = 'delete',
  RESTORE = 'restore',
}

export class AdminHomeManifestoBulkDto {
  @ApiProperty({
    enum: AdminHomeManifestoBulkAction,
    example: AdminHomeManifestoBulkAction.DELETE,
  })
  @IsEnum(AdminHomeManifestoBulkAction)
  action!: AdminHomeManifestoBulkAction;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  ids!: string[];

  @ApiPropertyOptional({ example: 'Bulk archive of outdated manifesto items' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
