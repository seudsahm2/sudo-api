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

@HasAtLeastOneField(['position', 'icon', 'kicker', 'title', 'copy'], {
  message: 'Provide at least one mutable field to update.',
})
export class UpdateAdminHomeManifestoDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({ example: 'layers' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  icon?: string;

  @ApiPropertyOptional({ example: 'Design & Delivery' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  kicker?: string;

  @ApiPropertyOptional({ example: 'Build intelligent digital products' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(180)
  title?: string;

  @ApiPropertyOptional({
    example: 'We ship measurable outcomes with rigorous engineering.',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(400)
  copy?: string;
  @ApiPropertyOptional({
    example: '2026-04-22T15:36:10.220Z',
    description: 'Optimistic concurrency token from record updatedAt.',
  })
  @IsOptional()
  @IsISO8601()
  expectedUpdatedAt?: string;
}
