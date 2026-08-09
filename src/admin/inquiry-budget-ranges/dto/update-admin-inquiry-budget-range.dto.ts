import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class UpdateAdminInquiryBudgetRangeDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({ example: '25k-50k' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  value?: string;

  @ApiPropertyOptional({ example: '$25k - $50k' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  label?: string;
}
