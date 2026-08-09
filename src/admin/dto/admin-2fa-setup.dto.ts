import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AdminTwoFactorSetupDto {
  @ApiProperty({ example: 'current-password' })
  @IsString()
  @MinLength(8)
  password!: string;
}
