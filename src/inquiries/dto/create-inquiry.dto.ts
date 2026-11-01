import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export const INQUIRY_SOURCES = [
  'home',
  'contact',
  'project',
  'service',
  'links',
] as const;

/** Collapses control characters and runs of whitespace before validation. */
const clean = ({ value }: { value: unknown }): unknown => {
  if (typeof value !== 'string') return value;

  let stripped = '';
  for (const character of value) {
    const code = character.charCodeAt(0);
    stripped += code <= 31 || code === 127 ? ' ' : character;
  }

  return stripped.replace(/[^\S\n]+/g, ' ').trim();
};

export class CreateInquiryDto {
  @ApiProperty({ example: 'Dawit Bekele' })
  @Transform(clean)
  @IsString()
  @MinLength(2)
  @MaxLength(80)
  name!: string;

  @ApiProperty({ example: 'dawit@company.com' })
  @Transform(clean)
  @IsEmail({}, { message: 'That email address does not look right.' })
  @MaxLength(160)
  email!: string;

  @ApiPropertyOptional({ example: 'Company Ltd' })
  @IsOptional()
  @Transform(clean)
  @IsString()
  @MaxLength(120)
  company?: string;

  @ApiProperty({ example: 'Mobile app' })
  @Transform(clean)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  projectType!: string;

  @ApiProperty({ example: '$25k-50k' })
  @Transform(clean)
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  budget!: string;

  @ApiProperty({
    example: 'We need a delivery app for our logistics business in Addis.',
  })
  @Transform(clean)
  @IsString()
  @MinLength(10, {
    message: 'Tell us a little more — a sentence or two is plenty.',
  })
  @MaxLength(4000)
  message!: string;

  @ApiPropertyOptional({ enum: INQUIRY_SOURCES, example: 'home' })
  @IsOptional()
  @IsIn(INQUIRY_SOURCES)
  source?: string;

  @ApiPropertyOptional({
    example: 'north-shield',
    description: 'Set when the enquiry starts from a specific case study.',
  })
  @IsOptional()
  @Transform(clean)
  @IsString()
  @MaxLength(120)
  projectKey?: string;

  @ApiPropertyOptional({ example: 'Within a month' })
  @IsOptional()
  @Transform(clean)
  @IsString()
  @MaxLength(80)
  timeline?: string;

  // Attribution. The site keeps these from the visit's landing URL, so the
  // admin can see which channel actually produces work.
  @ApiPropertyOptional({ example: 'tiktok' })
  @IsOptional()
  @Transform(clean)
  @IsString()
  @MaxLength(120)
  utmSource?: string;

  @ApiPropertyOptional({ example: 'social' })
  @IsOptional()
  @Transform(clean)
  @IsString()
  @MaxLength(120)
  utmMedium?: string;

  @ApiPropertyOptional({ example: 'launch-week' })
  @IsOptional()
  @Transform(clean)
  @IsString()
  @MaxLength(120)
  utmCampaign?: string;

  @ApiPropertyOptional({ example: 'https://www.tiktok.com/' })
  @IsOptional()
  @Transform(clean)
  @IsString()
  @MaxLength(500)
  referrer?: string;

  @ApiPropertyOptional({ example: '/work/delivery-app' })
  @IsOptional()
  @Transform(clean)
  @IsString()
  @MaxLength(300)
  landingPath?: string;

  @ApiPropertyOptional({
    description:
      'Honeypot. Hidden from people, so anything in it marks the sender as a bot.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  websiteUrl?: string;
}
