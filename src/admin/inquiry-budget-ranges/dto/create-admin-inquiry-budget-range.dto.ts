import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateAdminInquiryBudgetRangeDto {
  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  position!: number;

  @ApiProperty({ example: '10k-25k' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  value!: string;

  @ApiProperty({ example: '$10k - $25k' })
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  label!: string;
}
