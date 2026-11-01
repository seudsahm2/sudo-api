import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { HasAtLeastOneField } from '../../validators/has-at-least-one-field.decorator';
import { MEDIA_URL_PATTERN } from '../../work-projects/dto/create-admin-work-project.dto';
import { SERVICE_SLUG_PATTERN } from './create-admin-service.dto';

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
    'slug',
    'tagline',
    'imageUrl',
    'deliverables',
    'timeline',
    'startingFrom',
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

  @ApiPropertyOptional({
    example: 'android-app-development',
    description: 'Address of the landing page: /services/<slug>.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  @Matches(SERVICE_SLUG_PATTERN, {
    message: 'slug must be lower case words joined by hyphens.',
  })
  slug?: string;

  @ApiPropertyOptional({
    example: 'Android and iOS from one Flutter codebase.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  tagline?: string;

  @ApiPropertyOptional({ example: 'https://media.example.com/service.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(MEDIA_URL_PATTERN, {
    message: 'imageUrl must be an http(s) URL or a root-relative path.',
  })
  imageUrl?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['Play Store release', 'Admin dashboard', 'Source code'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(160, { each: true })
  deliverables?: string[];

  @ApiPropertyOptional({ example: '6-10 weeks' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  timeline?: string;

  @ApiPropertyOptional({ example: '$4,000' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  startingFrom?: string;

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
