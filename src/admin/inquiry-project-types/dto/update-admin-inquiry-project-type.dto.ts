import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateAdminInquiryProjectTypeDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({ example: 'mobile-app' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  value?: string;

  @ApiPropertyOptional({ example: 'Mobile App' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  label?: string;
}
