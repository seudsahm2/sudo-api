import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { hash } from 'bcrypt';
import { randomInt, timingSafeEqual } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AdminAuditService } from './admin-audit.service';
import { hashToken } from './utils/admin-security.util';
import { AdminRecoverDto } from './dto/admin-recover.dto';

/**
 * Account recovery without a mail server.
 *
 * Sending a reset link needs an SMTP account, a sender domain, deliverability
 * that survives Gmail, and somewhere to keep the credentials — none of which
 * exists here and all of which is configuration. One-time recovery codes need
 * none of it: they are issued when the account is created, kept somewhere safe
 * by the owner, and exchanged for a new password on the login page.
 *
 * Codes are treated exactly like passwords: only a hash is stored, a used code
 * can never be replayed, and a successful recovery signs every existing session
 * out in case the account was already in someone else's hands.
 */

/** No I/O/0/1: these get written down by hand and read back under pressure. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_GROUPS = 3;
const CODE_GROUP_LENGTH = 4;
const DEFAULT_CODE_COUNT = 8;

/** Recovery is a credential check, so it gets a credential check's ceiling. */
const ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS_PER_WINDOW = 8;
const MAX_TRACKED_SENDERS = 2000;

export interface AdminRecoveryContext {
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
}

@Injectable()
export class AdminRecoveryService {
  private readonly logger = new Logger(AdminRecoveryService.name);
  private readonly attemptsBySender = new Map<string, number[]>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AdminAuditService,
  ) {}

  /** Generates one code, in DDDD-DDDD-DDDD form. */
  private newCode(): string {
    const groups: string[] = [];

    for (let group = 0; group < CODE_GROUPS; group += 1) {
      let block = '';
      for (let index = 0; index < CODE_GROUP_LENGTH; index += 1) {
        block += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
      }
      groups.push(block);
    }

    return groups.join('-');
  }

  /** Normalises whatever the owner types back in: case, spaces, stray dashes. */
  private normalise(code: string): string {
    return code.toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  private fingerprint(code: string): string {
    return hashToken(this.normalise(code));
  }

  /**
   * Replaces every code the admin has with a fresh set, and returns the
   * plaintext. This is the only time the plaintext exists — it is never stored
   * and cannot be shown again.
   */
  async issueCodes(
    adminUserId: string,
    count = DEFAULT_CODE_COUNT,
  ): Promise<string[]> {
    const codes = Array.from({ length: count }, () => this.newCode());

    await this.prisma.$transaction([
      this.prisma.adminRecoveryCode.deleteMany({ where: { adminUserId } }),
      this.prisma.adminRecoveryCode.createMany({
        data: codes.map((code) => ({
          adminUserId,
          codeHash: this.fingerprint(code),
        })),
      }),
    ]);

    return codes;
  }

  async countRemaining(adminUserId: string): Promise<number> {
    return this.prisma.adminRecoveryCode.count({
      where: { adminUserId, usedAt: null },
    });
  }

  /**
   * Exchanges a recovery code for a new password.
   *
   * Every failure answers with the same message. Saying "no such account"
   * would turn this endpoint into a way to find out who has one.
   */
  async recover(
    dto: AdminRecoverDto,
    context: AdminRecoveryContext,
  ): Promise<{ email: string; remainingCodes: number }> {
    this.assertWithinRate(hashToken(context.ipAddress ?? 'unknown'));

    const email = dto.email.trim().toLowerCase();
    const admin = await this.prisma.adminUser.findUnique({
      where: { email },
      select: { id: true, email: true, isActive: true },
    });

    const fingerprint = this.fingerprint(dto.code);
    const match =
      admin && admin.isActive
        ? await this.prisma.adminRecoveryCode.findFirst({
            where: { adminUserId: admin.id, codeHash: fingerprint, usedAt: null },
            select: { id: true, codeHash: true },
          })
        : null;

    // Compared in constant time so a near-miss cannot be told from a wild one
    // by how long the answer takes to come back.
    const accepted =
      match !== null &&
      timingSafeEqual(
        Buffer.from(match.codeHash, 'utf8'),
        Buffer.from(fingerprint, 'utf8'),
      );

    if (!admin || !accepted || !match) {
      this.logger.warn(
        `Recovery rejected for ${email} from ${context.ipAddress ?? 'unknown'}`,
      );
      throw new UnauthorizedException(
        'That email address and recovery code do not match. Check the code and try again.',
      );
    }

    const passwordHash = await hash(dto.newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.adminRecoveryCode.update({
        where: { id: match.id },
        data: { usedAt: new Date() },
      }),
      this.prisma.adminUser.update({
        where: { id: admin.id },
        data: { passwordHash },
      }),
      // Anyone already signed in as this admin is signed out: if the password
      // was lost rather than forgotten, their session goes with it.
      this.prisma.adminSession.updateMany({
        where: { adminUserId: admin.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await this.auditService.record({
      actorAdminUserId: admin.id,
      actorEmail: admin.email,
      action: 'admin.auth.recover',
      resource: 'admin_user',
      resourceId: admin.id,
      method: 'POST',
      path: '/api/admin/auth/recover',
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      requestId: context.requestId,
      metadata: { recoveryCodeId: match.id },
    });

    const remainingCodes = await this.countRemaining(admin.id);
    this.logger.log(
      `Password recovered for ${admin.email}; ${remainingCodes} codes left`,
    );

    return { email: admin.email, remainingCodes };
  }

  private assertWithinRate(senderKey: string): void {
    const now = Date.now();
    const seen = (this.attemptsBySender.get(senderKey) ?? []).filter(
      (at) => now - at < ATTEMPT_WINDOW_MS,
    );

    if (seen.length >= MAX_ATTEMPTS_PER_WINDOW) {
      throw new HttpException(
        'Too many recovery attempts. Wait fifteen minutes and try again.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    seen.push(now);
    this.attemptsBySender.set(senderKey, seen);

    if (this.attemptsBySender.size > MAX_TRACKED_SENDERS) {
      for (const [key, times] of this.attemptsBySender) {
        const live = times.filter((at) => now - at < ATTEMPT_WINDOW_MS);
        if (live.length === 0) {
          this.attemptsBySender.delete(key);
        } else {
          this.attemptsBySender.set(key, live);
        }
      }
    }
  }
}
