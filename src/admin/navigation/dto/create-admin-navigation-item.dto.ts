import { ApiProperty } from '@nestjs/swagger';
import {
  IsInt,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

export class CreateAdminNavigationItemDto {
  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  position!: number;

  @ApiProperty({ example: '/services' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  @Matches(/^\/(?!admin(?:\/|$)).+/i, {
    message:
      'to must be a public path starting with / and cannot target /admin routes',
  })
  to!: string;

  @ApiProperty({ example: 'Services' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label!: string;
}
