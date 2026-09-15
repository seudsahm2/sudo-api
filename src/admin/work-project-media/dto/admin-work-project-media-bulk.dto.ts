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

export enum AdminWorkProjectMediaBulkAction {
  DELETE = 'delete',
  RESTORE = 'restore',
}

export class AdminWorkProjectMediaBulkDto {
  @ApiProperty({
    enum: AdminWorkProjectMediaBulkAction,
    example: AdminWorkProjectMediaBulkAction.DELETE,
  })
  @IsEnum(AdminWorkProjectMediaBulkAction)
  action!: AdminWorkProjectMediaBulkAction;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(100)
  @IsString({ each: true })
  ids!: string[];

  @ApiPropertyOptional({ example: 'Replacing the old screenshot set' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
