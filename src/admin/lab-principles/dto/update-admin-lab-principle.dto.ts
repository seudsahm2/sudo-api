import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  IsISO8601,
} from 'class-validator';
import { HasAtLeastOneField } from '../../validators/has-at-least-one-field.decorator';

@HasAtLeastOneField(['position', 'icon', 'name', 'desc'], {
  message: 'Provide at least one mutable field to update.',
})
export class UpdateAdminLabPrincipleDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({ example: 'atom' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  icon?: string;

  @ApiPropertyOptional({ example: 'Authority' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({
    example:
      'We operate at root. Decisions are made with confidence and accountability.',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  desc?: string;
  @ApiPropertyOptional({
    example: '2026-04-22T15:36:10.220Z',
    description: 'Optimistic concurrency token from record updatedAt.',
  })
  @IsOptional()
  @IsISO8601()
  expectedUpdatedAt?: string;
}
