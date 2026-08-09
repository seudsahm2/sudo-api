import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateAdminServicePipelineStepDto {
  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  position!: number;

  @ApiProperty({ example: 'search' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  icon!: string;

  @ApiProperty({ example: 'Discover' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label!: string;

  @ApiProperty({ example: '01' })
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  step!: string;
}
