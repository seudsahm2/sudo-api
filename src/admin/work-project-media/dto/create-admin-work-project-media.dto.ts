import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { MEDIA_URL_PATTERN } from '../../work-projects/dto/create-admin-work-project.dto';

/** Which frame the shot is drawn inside on the work page. */
/**
 * `fullpage` is a whole web page captured top to bottom, which scrolls inside
 * the browser frame; `tablet` is drawn in a tablet body.
 */
export const WORK_PROJECT_MEDIA_KINDS = [
  'browser',
  'phone',
  'tablet',
  'fullpage',
  'plain',
] as const;

export class CreateAdminWorkProjectMediaDto {
  @ApiProperty({
    example: 'north-shield',
    description: 'The projectKey of the work project this shot belongs to.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  projectKey!: string;

  @ApiProperty({ example: 0, description: 'Order within the project gallery.' })
  @IsInt()
  @Min(0)
  position!: number;

  @ApiProperty({ example: 'https://media.sudotechlabs.com/shots/ns-01.jpg' })
  @IsString()
  @MaxLength(500)
  @Matches(MEDIA_URL_PATTERN, {
    message: 'url must be an http(s) URL or a root-relative path.',
  })
  url!: string;

  @ApiPropertyOptional({
    enum: WORK_PROJECT_MEDIA_KINDS,
    example: 'browser',
  })
  @IsOptional()
  @IsIn(WORK_PROJECT_MEDIA_KINDS)
  kind?: string;

  @ApiPropertyOptional({ example: 'Portfolio overview, desktop' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  caption?: string;

  @ApiPropertyOptional({
    example: 'Pricing',
    description: 'Which page of a website this capture shows.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  pageLabel?: string;

  @ApiPropertyOptional({
    example: 'https://media.example.com/loop.mp4',
    description: 'A short muted loop shown in place of the still.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(MEDIA_URL_PATTERN, {
    message: 'videoUrl must be an http(s) URL or a root-relative path.',
  })
  videoUrl?: string;
}
