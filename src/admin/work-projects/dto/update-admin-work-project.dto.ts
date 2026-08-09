import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  IsISO8601,
} from 'class-validator';
import { HasAtLeastOneField } from '../../validators/has-at-least-one-field.decorator';
import { MEDIA_URL_PATTERN } from './create-admin-work-project.dto';

@HasAtLeastOneField(
  [
    'position',
    'projectKey',
    'title',
    'client',
    'year',
    'summary',
    'coverImageUrl',
    'challenge',
    'approach',
    'outcome',
    'featured',
    'featuredPosition',
    'disciplines',
  ],
  { message: 'Provide at least one mutable field to update.' },
)
export class UpdateAdminWorkProjectDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({ example: 'north-shield' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  projectKey?: string;

  @ApiPropertyOptional({ example: 'North Shield - Sovereign Banking' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title?: string;

  @ApiPropertyOptional({ example: 'client/north-shield' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  client?: string;

  @ApiPropertyOptional({ example: '2026' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  year?: string;

  @ApiPropertyOptional({
    example: 'End-to-end platform redesign with AI agent layer.',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  summary?: string;

  @ApiPropertyOptional({ example: 'https://media.sudotechlabs.com/north-shield.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(MEDIA_URL_PATTERN, {
    message: 'coverImageUrl must be an http(s) URL or a root-relative path.',
  })
  coverImageUrl?: string;

  @ApiPropertyOptional({
    example: 'The core ledger could not be taken offline at any point.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  challenge?: string;

  @ApiPropertyOptional({
    example: 'We ran the new platform alongside the old one behind a routing layer.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  approach?: string;

  @ApiPropertyOptional({ example: 'Migrated 1.2m accounts with no scheduled downtime.' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  outcome?: string;

  @ApiPropertyOptional({ type: [String], example: ['web', 'ai'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  disciplines?: string[];
  @ApiPropertyOptional({
    example: '2026-04-22T15:36:10.220Z',
    description: 'Optimistic concurrency token from record updatedAt.',
  })
  @IsOptional()
  @IsISO8601()
  expectedUpdatedAt?: string;

  @ApiPropertyOptional({ example: true, description: 'Show on the home page.' })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({ example: 0, description: 'Order within the home page list.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  featuredPosition?: number;
}
