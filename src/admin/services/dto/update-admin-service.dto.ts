import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  IsISO8601,
} from 'class-validator';
import { HasAtLeastOneField } from '../../validators/has-at-least-one-field.decorator';

@HasAtLeastOneField(
  [
    'position',
    'icon',
    'name',
    'handle',
    'summary',
    'capabilities',
    'stackItems',
    'interconnects',
  ],
  { message: 'Provide at least one mutable field to update.' },
)
export class UpdateAdminServiceDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({ example: 'layers' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  icon?: string;

  @ApiPropertyOptional({ example: 'AI Platform' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name?: string;

  @ApiPropertyOptional({ example: 'ai-platform' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  handle?: string;

  @ApiPropertyOptional({
    example: 'We build AI-ready platform and delivery systems.',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  summary?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(160, { each: true })
  capabilities?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(160, { each: true })
  stackItems?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(160, { each: true })
  interconnects?: string[];
  @ApiPropertyOptional({
    example: '2026-04-22T15:36:10.220Z',
    description: 'Optimistic concurrency token from record updatedAt.',
  })
  @IsOptional()
  @IsISO8601()
  expectedUpdatedAt?: string;
}
