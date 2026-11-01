import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { HasAtLeastOneField } from '../../validators/has-at-least-one-field.decorator';
import {
  DOMAIN_PATTERN,
  SITE_LINK_OR_PATH_PATTERN,
  SITE_LINK_PATTERN,
  SITE_MEDIA_PATTERN,
  TELEGRAM_PATTERN,
  WHATSAPP_PATTERN,
} from './create-admin-site-config.dto';

@HasAtLeastOneField(
  [
    'name',
    'shortName',
    'descriptor',
    'defaultTitle',
    'description',
    'contactEmail',
    'responseWindow',
    'statusLabel',
    'intakeMode',
    'heroHeadline',
    'positionTitle',
    'positionBody',
    'socialTiktok',
    'socialInstagram',
    'socialFacebook',
    'socialX',
    'socialLinkedin',
    'socialYoutube',
    'whatsappNumber',
    'telegramHandle',
    'announcementText',
    'announcementLink',
    'analyticsDomain',
    'analyticsScriptUrl',
    'ogImageUrl',
    'announcementEnabled',
  ],
  { message: 'Provide at least one mutable field to update.' },
)
export class UpdateAdminSiteConfigDto {
  @ApiPropertyOptional({ example: 'SUDO TECH LABS' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({ example: 'SUDO' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  shortName?: string;

  @ApiPropertyOptional({ example: 'engineering systems studio' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  descriptor?: string;

  @ApiPropertyOptional({
    example: 'SUDO TECH LABS | Engineering Systems Studio',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(220)
  defaultTitle?: string;

  @ApiPropertyOptional({
    example: 'We build resilient digital systems end-to-end.',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  description?: string;

  @ApiPropertyOptional({ example: 'hello@sudotechlabs.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(254)
  contactEmail?: string;

  @ApiPropertyOptional({ example: 'Within 48 hours' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  responseWindow?: string;

  @ApiPropertyOptional({ example: 'Open for projects' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  statusLabel?: string;

  @ApiPropertyOptional({ example: 'By invitation and fit' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  intakeMode?: string;
  @ApiPropertyOptional({
    example: '2026-04-22T15:36:10.220Z',
    description: 'Optimistic concurrency token from record updatedAt.',
  })
  @IsOptional()
  @IsISO8601()
  expectedUpdatedAt?: string;

  @ApiPropertyOptional({ example: 'Built once, properly' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  heroHeadline?: string;

  @ApiPropertyOptional({
    example: 'Most of the value is in deciding what not to build.',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  positionTitle?: string;

  @ApiPropertyOptional({
    example: 'Anyone can add. The judgement worth paying for is subtraction.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(600)
  positionBody?: string;

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
