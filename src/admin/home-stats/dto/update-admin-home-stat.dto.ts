import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

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
}
