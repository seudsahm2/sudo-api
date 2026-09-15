import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class AdminRecoverDto {
  @ApiProperty({ example: 'owner@example.com' })
  @IsEmail()
  @MaxLength(160)
  email!: string;

  @ApiProperty({
    example: 'K7QM-3XPD-9RTA',
    description: 'One of the recovery codes issued with the account.',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(40)
  code!: string;

  @ApiProperty({ example: 'a-new-strong-password' })
  @IsString()
  @MinLength(12, {
    message: 'Use at least 12 characters for an admin password.',
  })
  @MaxLength(200)
  @Matches(/[a-z]/, { message: 'Include at least one lowercase letter.' })
  @Matches(/[A-Z]/, { message: 'Include at least one uppercase letter.' })
  @Matches(/[0-9]/, { message: 'Include at least one number.' })
  newPassword!: string;
}
