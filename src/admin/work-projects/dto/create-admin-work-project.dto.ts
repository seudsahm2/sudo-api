import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
} from 'class-validator';

/**
 * Cover images are rendered straight into an <img src>. Restricting them to
 * http(s) or a root-relative path keeps `javascript:` and `data:` payloads out.
 */
export const MEDIA_URL_PATTERN = /^(https:\/\/|http:\/\/|\/)[^\s]*$/;

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

  @ApiProperty({ example: 'North Shield - Sovereign Banking' })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  title!: string;

  @ApiProperty({ example: 'client/north-shield' })
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

  @ApiPropertyOptional({ example: false, description: 'Show on the home page.' })
  @IsOptional()
  @IsBoolean()
  featured?: boolean;

  @ApiPropertyOptional({ example: 0, description: 'Order within the home page list.' })
  @IsOptional()
  @IsInt()
  @Min(0)
  featuredPosition?: number;

  @ApiProperty({ type: [String], example: ['web', 'design', 'ai'] })
  @IsArray()
  @IsString({ each: true })
  disciplines!: string[];
}
