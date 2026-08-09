import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class AdminLoginDto {
  @ApiProperty({ example: 'admin@sudotechlabs.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'correct-horse-battery-staple' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: '123456', required: false })
  @IsOptional()
  @IsString()
  twoFactorCode?: string;
}
