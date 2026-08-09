import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

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

  @ApiProperty({ example: 42 })
  @IsInt()
  value!: number;

  @ApiPropertyOptional({ example: '+' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(16)
  suffix?: string;
}
