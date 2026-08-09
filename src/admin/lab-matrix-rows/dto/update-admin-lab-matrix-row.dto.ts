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

@HasAtLeastOneField(['position', 'label', 'value'], {
  message: 'Provide at least one mutable field to update.',
})
export class UpdateAdminLabMatrixRowDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({ example: 'backend' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label?: string;

  @ApiPropertyOptional({ example: 'node / rust / go / postgres / redis' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  value?: string;
  @ApiPropertyOptional({
    example: '2026-04-22T15:36:10.220Z',
    description: 'Optimistic concurrency token from record updatedAt.',
  })
  @IsOptional()
  @IsISO8601()
  expectedUpdatedAt?: string;
}
