import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  Matches,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  MinLength,
  IsISO8601,
} from 'class-validator';
import { HasAtLeastOneField } from '../../validators/has-at-least-one-field.decorator';

@HasAtLeastOneField(['position', 'to', 'label'], {
  message: 'Provide at least one mutable field to update.',
})
export class UpdateAdminNavigationItemDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({ example: '/protocol' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  @Matches(/^\/(?!admin(?:\/|$)).+/i, {
    message:
      'to must be a public path starting with / and cannot target /admin routes',
  })
  to?: string;

  @ApiPropertyOptional({ example: 'Protocol' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label?: string;
  @ApiPropertyOptional({
    example: '2026-04-22T15:36:10.220Z',
    description: 'Optimistic concurrency token from record updatedAt.',
  })
  @IsOptional()
  @IsISO8601()
  expectedUpdatedAt?: string;
}
