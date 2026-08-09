import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateAdminInquiryProjectTypeDto {
  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  position!: number;

  @ApiProperty({ example: 'web-platform' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  value!: string;

  @ApiProperty({ example: 'Web Platform' })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  label!: string;
}
