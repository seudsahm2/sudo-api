import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateAdminSiteConfigDto {
  @ApiProperty({ example: 'SUDO TECH LABS' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: 'SUDO' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  shortName!: string;

  @ApiProperty({ example: 'engineering systems studio' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  descriptor!: string;

  @ApiProperty({ example: 'SUDO TECH LABS | Engineering Systems Studio' })
  @IsString()
  @MinLength(1)
  @MaxLength(220)
  defaultTitle!: string;

  @ApiProperty({ example: 'We build resilient digital systems end-to-end.' })
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  description!: string;

  @ApiProperty({ example: 'hello@sudotechlabs.com' })
  @IsEmail()
  @MaxLength(254)
  contactEmail!: string;

  @ApiProperty({ example: 'Within 48 hours' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  responseWindow!: string;

  @ApiProperty({ example: 'Open for projects' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  statusLabel!: string;

  @ApiProperty({ example: 'By invitation and fit' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  intakeMode!: string;

  @ApiProperty({ example: 'Built once, properly' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  heroHeadline!: string;

  @ApiProperty({ example: 'Most of the value is in deciding what not to build.' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  positionTitle!: string;

  @ApiProperty({ example: 'Anyone can add. The judgement worth paying for is subtraction.' })
  @IsString()
  @MaxLength(600)
  positionBody!: string;
}
