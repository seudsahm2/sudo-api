import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  IsISO8601,
} from 'class-validator';
import { HasAtLeastOneField } from '../../validators/has-at-least-one-field.decorator';

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

  @ApiPropertyOptional({ example: 'Most of the value is in deciding what not to build.' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  positionTitle?: string;

  @ApiPropertyOptional({ example: 'Anyone can add. The judgement worth paying for is subtraction.' })
  @IsOptional()
  @IsString()
  @MaxLength(600)
  positionBody?: string;
}
