import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { compare } from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    const adminEmail = this.configService.getOrThrow<string>('ADMIN_EMAIL');
    const adminPasswordHash = this.configService.getOrThrow<string>(
      'ADMIN_PASSWORD_HASH',
    );

    const emailMatches = dto.email.toLowerCase() === adminEmail.toLowerCase();
    const passwordMatches = await compare(dto.password, adminPasswordHash);

    if (!emailMatches || !passwordMatches) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload: JwtPayload = {
      sub: 'admin',
      email: adminEmail,
    };

    const accessToken = await this.jwtService.signAsync(payload);
    return { accessToken };
  }
}
