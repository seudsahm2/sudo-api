import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/**
 * Where a figure comes from. Everything except `manual` is counted from the
 * published work projects whenever the site's content is read, so the number
 * on the page can never drift from the work actually shown.
 */
export const HOME_STAT_SOURCES = [
  'manual',
  'projects',
  'clients',
  'mobile_apps',
  'websites',
  'industries',
] as const;

export class CreateAdminHomeStatDto {
  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  position!: number;

  @ApiProperty({ example: 'projects shipped' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label!: string;

  @ApiPropertyOptional({
    example: 42,
    description: 'Ignored unless source is manual.',
  })
  @IsOptional()
  @IsInt()
  value?: number;

  @ApiPropertyOptional({ example: '+' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(16)
  suffix?: string;

  @ApiPropertyOptional({
    enum: HOME_STAT_SOURCES,
    example: 'projects',
    description:
      'manual shows the value as typed; anything else is counted from published work.',
  })
  @IsOptional()
  @IsIn(HOME_STAT_SOURCES)
  source?: string;
}
