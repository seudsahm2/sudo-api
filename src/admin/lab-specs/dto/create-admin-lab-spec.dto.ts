import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateAdminLabSpecDto {
  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  position!: number;

  @ApiProperty({ example: 'regions' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label!: string;

  @ApiProperty({ example: 'US / EU / APAC' })
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  value!: string;
}
