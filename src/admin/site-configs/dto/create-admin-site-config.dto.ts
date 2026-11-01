import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Social and outbound links are rendered as <a href>: absolute http(s) only. */
export const SITE_LINK_PATTERN = /^$|^https?:\/\/[^\s]+$/;
/** A link inside the site or out of it. */
export const SITE_LINK_OR_PATH_PATTERN = /^$|^(https?:\/\/|\/)[^\s]*$/;
/** wa.me wants the full international number, digits only. */
export const WHATSAPP_PATTERN = /^$|^[1-9][0-9]{6,14}$/;
/** Telegram usernames: 5-32 letters, digits or underscores. */
export const TELEGRAM_PATTERN = /^$|^[A-Za-z0-9_]{5,32}$/;
export const DOMAIN_PATTERN = /^$|^[a-z0-9.-]+\.[a-z]{2,}$/i;
export const SITE_MEDIA_PATTERN = /^$|^(https?:\/\/|\/)[^\s]*$/;

export class CreateAdminSiteConfigDto {
  @ApiProperty({ example: 'SUDO TECH LABS' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'SUDO' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  shortName!: string;

  @ApiProperty({ example: 'engineering systems studio' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  descriptor!: string;

  @ApiProperty({ example: 'SUDO TECH LABS | Engineering Systems Studio' })
  @IsString()
  @MinLength(1)
  @MaxLength(220)
  defaultTitle!: string;

  @ApiProperty({ example: 'We build resilient digital systems end-to-end.' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  description!: string;

  @ApiProperty({ example: 'hello@sudotechlabs.com' })
  @IsEmail()
  @MaxLength(254)
  contactEmail!: string;

  @ApiProperty({ example: 'Within 48 hours' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  responseWindow!: string;

  @ApiProperty({ example: 'Open for projects' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  statusLabel!: string;

  @ApiProperty({ example: 'By invitation and fit' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  intakeMode!: string;

  @ApiProperty({ example: 'Built once, properly' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  heroHeadline!: string;

  @ApiProperty({
    example: 'Most of the value is in deciding what not to build.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  positionTitle!: string;

  @ApiProperty({
    example: 'Anyone can add. The judgement worth paying for is subtraction.',
  })
  @IsString()
  @MaxLength(600)
  positionBody!: string;

  @ApiPropertyOptional({
    example: 'https://www.tiktok.com/@sudotechlabs',
    description: 'TikTok profile. Empty hides it.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  @Matches(SITE_LINK_PATTERN, { message: 'socialTiktok has the wrong format.' })
  socialTiktok?: string;

  @ApiPropertyOptional({
    example: 'https://www.instagram.com/sudotechlabs',
    description: 'Instagram profile. Empty hides it.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  @Matches(SITE_LINK_PATTERN, {
    message: 'socialInstagram has the wrong format.',
  })
  socialInstagram?: string;

  @ApiPropertyOptional({
    example: 'https://www.facebook.com/sudotechlabs',
    description: 'Facebook page. Empty hides it.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  @Matches(SITE_LINK_PATTERN, {
    message: 'socialFacebook has the wrong format.',
  })
  socialFacebook?: string;

  @ApiPropertyOptional({
    example: 'https://x.com/sudotechlabs',
    description: 'X profile. Empty hides it.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  @Matches(SITE_LINK_PATTERN, { message: 'socialX has the wrong format.' })
  socialX?: string;

  @ApiPropertyOptional({
    example: 'https://www.linkedin.com/company/sudotechlabs',
    description: 'LinkedIn page. Empty hides it.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  @Matches(SITE_LINK_PATTERN, {
    message: 'socialLinkedin has the wrong format.',
  })
  socialLinkedin?: string;

  @ApiPropertyOptional({
    example: 'https://www.youtube.com/@sudotechlabs',
    description: 'YouTube channel. Empty hides it.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  @Matches(SITE_LINK_PATTERN, {
    message: 'socialYoutube has the wrong format.',
  })
  socialYoutube?: string;

  @ApiPropertyOptional({
    example: '251911234567',
    description:
      'WhatsApp number, digits only with country code. Empty hides it.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  @Matches(WHATSAPP_PATTERN, {
    message: 'whatsappNumber has the wrong format.',
  })
  whatsappNumber?: string;

  @ApiPropertyOptional({
    example: 'sudotechlabs',
    description: 'Telegram username without @. Empty hides it.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(33)
  @Matches(TELEGRAM_PATTERN, {
    message: 'telegramHandle has the wrong format.',
  })
  telegramHandle?: string;

  @ApiPropertyOptional({
    example: 'New: try our apps right in your browser',
    description: 'Announcement strip text. Empty hides it.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  announcementText?: string;

  @ApiPropertyOptional({
    example: '/work',
    description: 'Where the announcement leads. Empty hides it.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  @Matches(SITE_LINK_OR_PATH_PATTERN, {
    message: 'announcementLink has the wrong format.',
  })
  announcementLink?: string;

  @ApiPropertyOptional({
    example: 'sudotechlabs.com',
    description: 'Analytics site domain. Empty hides it.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Matches(DOMAIN_PATTERN, { message: 'analyticsDomain has the wrong format.' })
  analyticsDomain?: string;

  @ApiPropertyOptional({
    example: 'https://plausible.io/js/script.js',
    description: 'Analytics script address. Empty hides it.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  @Matches(SITE_LINK_PATTERN, {
    message: 'analyticsScriptUrl has the wrong format.',
  })
  analyticsScriptUrl?: string;

  @ApiPropertyOptional({
    example: 'https://media.example.com/share.jpg',
    description: 'Default share image. Empty hides it.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(SITE_MEDIA_PATTERN, { message: 'ogImageUrl has the wrong format.' })
  ogImageUrl?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Show the strip above the header.',
  })
  @IsOptional()
  @IsBoolean()
  announcementEnabled?: boolean;
}
