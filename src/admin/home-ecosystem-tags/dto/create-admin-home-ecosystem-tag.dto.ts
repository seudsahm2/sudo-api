import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateAdminHomeEcosystemTagDto {
  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  position!: number;

  @ApiProperty({ example: 'platform' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  tag!: string;
}
