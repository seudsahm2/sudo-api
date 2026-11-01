import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * Cover images are rendered straight into an <img src>. Restricting them to
 * http(s) or a root-relative path keeps `javascript:` and `data:` payloads out.
 */
/** An empty string is allowed: it is how the admin editor clears a field. */
export const MEDIA_URL_PATTERN = /^$|^(https:\/\/|http:\/\/|\/)[^\s]*$/;

/** Outbound links are rendered as <a href>, so they must be absolute http(s). */
export const LINK_URL_PATTERN = /^$|^https?:\/\/[^\s]+$/;

/** Decides which frame a project's screenshots are drawn in on the work page. */
export const WORK_PROJECT_SURFACES = ['web', 'mobile', 'both'] as const;

/** Only `published` projects are served to the public site. */
export const WORK_PROJECT_STATUSES = ['draft', 'published'] as const;

/** Where a product runs. Decides `surface` whenever it is set. */
export const WORK_PROJECT_PLATFORMS = ['android', 'ios', 'web'] as const;

/** A product colour, or empty to clear it. */
export const BRAND_COLOR_PATTERN = /^$|^#[0-9a-fA-F]{6}$/;

export class CreateAdminWorkProjectDto {
  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  position!: number;

  @ApiProperty({ example: 'north-shield' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  projectKey!: string;

  @ApiProperty({ example: 'Sovereign banking platform' })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title!: string;

  @ApiProperty({ example: 'North Shield' })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  client!: string;

  @ApiProperty({ example: '2026' })
  @IsString()
  @MinLength(1)
  @MaxLength(32)
  year!: string;

  @ApiProperty({ example: 'End-to-end platform redesign with AI agent layer.' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  summary!: string;

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

  @ApiPropertyOptional({
    enum: WORK_PROJECT_SURFACES,
    example: 'web',
    description: 'Which device frame the screenshots are shown in.',
  })
  @IsOptional()
  @IsIn(WORK_PROJECT_SURFACES)
  surface?: string;

  @ApiPropertyOptional({
    enum: WORK_PROJECT_STATUSES,
    example: 'draft',
    description: 'Only published projects appear on the public site.',
  })
  @IsOptional()
  @IsIn(WORK_PROJECT_STATUSES)
  status?: string;

  @ApiPropertyOptional({ example: 'Groceries at your door in 30 minutes.' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  tagline?: string;

  @ApiPropertyOptional({ example: 'Retail' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  industry?: string;

  @ApiPropertyOptional({
    type: [String],
    enum: WORK_PROJECT_PLATFORMS,
    example: ['android', 'ios'],
    description: 'Where it runs. Decides the device frame when set.',
  })
  @IsOptional()
  @IsArray()
  @IsIn(WORK_PROJECT_PLATFORMS, { each: true })
  platforms?: string[];

  @ApiPropertyOptional({ example: '12 weeks' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  duration?: string;

  @ApiPropertyOptional({ example: '#17573F' })
  @IsOptional()
  @IsString()
  @Matches(BRAND_COLOR_PATTERN, {
    message: 'brandColor must be a colour like #17573F.',
  })
  brandColor?: string;

  @ApiPropertyOptional({ example: 'https://northshield.com' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(LINK_URL_PATTERN, {
    message: 'liveUrl must be a full http(s) URL.',
  })
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

  @ApiPropertyOptional({ example: '1.2m', description: 'The figure itself.' })
  @IsOptional()
  @IsString()
  @MaxLength(32)
  metricValue?: string;

  @ApiPropertyOptional({
    example: 'accounts migrated, no downtime',
    description: 'What the figure counts.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  metricLabel?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Show on the home page.',
  })
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

  @ApiProperty({ type: [String], example: ['Web', 'Design', 'AI'] })
  @IsArray()
  @IsString({ each: true })
  disciplines!: string[];

  @ApiPropertyOptional({
    type: [String],
    example: ['React Native', 'Postgres', 'Stripe'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  stack?: string[];
}
