import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateAdminHomeManifestoDto {
  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  position!: number;

  @ApiProperty({ example: 'sparkles' })
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  icon!: string;

  @ApiProperty({ example: 'Research & Build' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  kicker!: string;

  @ApiProperty({ example: 'From idea to resilient product systems' })
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  title!: string;

  @ApiProperty({
    example: 'We pair strategy with delivery to ship durable outcomes.',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(400)
  copy!: string;
}
