import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length, MinLength } from 'class-validator';

export class AdminTwoFactorDisableDto {
  @ApiProperty({ example: 'current-password' })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @Length(6, 6)
  twoFactorCode!: string;
}
