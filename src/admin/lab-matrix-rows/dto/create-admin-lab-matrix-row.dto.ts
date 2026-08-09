import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateAdminLabMatrixRowDto {
  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  position!: number;

  @ApiProperty({ example: 'frontend' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label!: string;

  @ApiProperty({ example: 'react / tanstack / vite / ts / tailwind' })
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  value!: string;
}
