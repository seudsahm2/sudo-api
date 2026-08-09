import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class AdminRefreshDto {
  @ApiProperty({ example: 'refresh-token-string' })
  @IsOptional()
  @IsString()
  @MinLength(32)
  refreshToken!: string;
}
