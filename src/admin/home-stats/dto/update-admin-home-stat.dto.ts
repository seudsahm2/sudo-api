import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { HOME_STAT_SOURCES } from './create-admin-home-stat.dto';

export class UpdateAdminHomeStatDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({ example: 'active clients' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label?: string;

  @ApiPropertyOptional({ example: 18 })
  @IsOptional()
  @IsInt()
  value?: number;

  @ApiPropertyOptional({ example: '%' })
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
