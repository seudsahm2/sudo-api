import { IsString, MinLength } from 'class-validator';

export class RestoreAdminContentDto {
  @IsString()
  @MinLength(1)
  confirmToken!: string;

  @IsString()
  @MinLength(2)
  backupJson!: string;
}
