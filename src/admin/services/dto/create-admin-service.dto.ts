import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { MEDIA_URL_PATTERN } from '../../work-projects/dto/create-admin-work-project.dto';

/** Lower case words joined by hyphens, or empty to clear. */
export const SERVICE_SLUG_PATTERN = /^$|^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class CreateAdminServiceDto {
  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  position!: number;

  @ApiProperty({ example: 'cpu' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  icon!: string;

  @ApiProperty({ example: 'Platform Engineering' })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @ApiProperty({ example: 'platform-engineering' })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  handle!: string;

  @ApiProperty({ example: 'We design and scale modern engineering platforms.' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  summary!: string;

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

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(160, { each: true })
  capabilities!: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(160, { each: true })
  stackItems!: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(160, { each: true })
  interconnects!: string[];
}
