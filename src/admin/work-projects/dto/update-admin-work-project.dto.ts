import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { HasAtLeastOneField } from '../../validators/has-at-least-one-field.decorator';
import {
  LINK_URL_PATTERN,
  MEDIA_URL_PATTERN,
  WORK_PROJECT_SURFACES,
} from './create-admin-work-project.dto';

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
    'surface',
    'liveUrl',
    'appStoreUrl',
    'playStoreUrl',
    'demoUrl',
    'metricValue',
    'metricLabel',
    'featured',
    'featuredPosition',
    'disciplines',
    'stack',
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

  @ApiPropertyOptional({ example: 'Sovereign banking platform' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title?: string;

  @ApiPropertyOptional({ example: 'North Shield' })
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

  @ApiPropertyOptional({
    example: 'https://media.sudotechlabs.com/north-shield.jpg',
  })
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
    example:
      'We ran the new platform alongside the old one behind a routing layer.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  approach?: string;

  @ApiPropertyOptional({
    example: 'Migrated 1.2m accounts with no scheduled downtime.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  outcome?: string;

  @ApiPropertyOptional({ enum: WORK_PROJECT_SURFACES, example: 'mobile' })
  @IsOptional()
  @IsIn(WORK_PROJECT_SURFACES)
  surface?: string;

  @ApiPropertyOptional({ example: 'https://northshield.com' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(LINK_URL_PATTERN, { message: 'liveUrl must be a full http(s) URL.' })
  liveUrl?: string;

  @ApiPropertyOptional({ example: 'https://apps.apple.com/app/id000000000' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(LINK_URL_PATTERN, {
    message: 'appStoreUrl must be a full http(s) URL.',
  })
  appStoreUrl?: string;

  @ApiPropertyOptional({
    example: 'https://play.google.com/store/apps/details?id=com.example',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(LINK_URL_PATTERN, {
    message: 'playStoreUrl must be a full http(s) URL.',
  })
  playStoreUrl?: string;

  @ApiPropertyOptional({
    example: 'https://demo.example.com',
    description:
      'Something that will run inside an iframe: a web build of the app, a hosted demo, or a device-farm embed.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(LINK_URL_PATTERN, { message: 'demoUrl must be a full http(s) URL.' })
  demoUrl?: string;

  @ApiPropertyOptional({ example: '1.2m' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  metricValue?: string;

  @ApiPropertyOptional({ example: 'accounts migrated, no downtime' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  metricLabel?: string;

  @ApiPropertyOptional({ type: [String], example: ['Web', 'AI'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  disciplines?: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['React Native', 'Postgres'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  stack?: string[];

  @ApiPropertyOptional({ example: true, description: 'Show on the home page.' })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({
    example: 0,
    description: 'Order within the home page list.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  featuredPosition?: number;

  @ApiPropertyOptional({
    example: '2026-04-22T15:36:10.220Z',
    description: 'Optimistic concurrency token from record updatedAt.',
  })
  @IsOptional()
  @IsISO8601()
  expectedUpdatedAt?: string;
}
