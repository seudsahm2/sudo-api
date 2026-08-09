import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateAdminLabPrincipleDto {
  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  position!: number;

  @ApiProperty({ example: 'crosshair' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  icon!: string;

  @ApiProperty({ example: 'Precision' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiProperty({
    example:
      'Tolerances are tight. Every pixel, byte, and millisecond is intentional.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  desc!: string;
}
