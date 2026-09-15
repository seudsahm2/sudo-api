import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { HasAtLeastOneField } from '../../validators/has-at-least-one-field.decorator';
import { MEDIA_URL_PATTERN } from '../../work-projects/dto/create-admin-work-project.dto';
import { WORK_PROJECT_MEDIA_KINDS } from './create-admin-work-project-media.dto';

@HasAtLeastOneField(['projectKey', 'position', 'url', 'kind', 'caption'], {
  message: 'Provide at least one mutable field to update.',
})
export class UpdateAdminWorkProjectMediaDto {
  @ApiPropertyOptional({ example: 'north-shield' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  projectKey?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;

  @ApiPropertyOptional({
    example: 'https://media.sudotechlabs.com/shots/ns-02.jpg',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Matches(MEDIA_URL_PATTERN, {
    message: 'url must be an http(s) URL or a root-relative path.',
  })
  url?: string;

  @ApiPropertyOptional({ enum: WORK_PROJECT_MEDIA_KINDS, example: 'phone' })
  @IsOptional()
  @IsIn(WORK_PROJECT_MEDIA_KINDS)
  kind?: string;

  @ApiPropertyOptional({ example: 'Checkout, iOS' })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  caption?: string;

  @ApiPropertyOptional({
    example: '2026-04-22T15:36:10.220Z',
    description: 'Optimistic concurrency token from record updatedAt.',
  })
  @IsOptional()
  @IsISO8601()
  expectedUpdatedAt?: string;
}
