import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsString,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateAdminServiceDto {
  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  position!: number;

  @ApiProperty({ example: 'cpu' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  icon!: string;

  @ApiProperty({ example: 'Platform Engineering' })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;

  @ApiProperty({ example: 'platform-engineering' })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  handle!: string;

  @ApiProperty({ example: 'We design and scale modern engineering platforms.' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  summary!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(160, { each: true })
  capabilities!: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(160, { each: true })
  stackItems!: string[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(160, { each: true })
  interconnects!: string[];
}
