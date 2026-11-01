import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { createHash, randomInt } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { InquiryNotifierService } from './inquiry-notifier.service';
import { CreateInquiryDto } from './dto/create-inquiry.dto';

export interface InquiryReceipt {
  reference: string;
  receivedAt: string;
}

/** Per-sender ceiling. Generous for a person, useless for a script. */
const WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_WINDOW = 5;
/** Caps the memory the throttle can hold if it is ever pointed at a flood. */
const MAX_TRACKED_SENDERS = 5000;

const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function optional(value?: string): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

@Injectable()
export class InquiriesService {
  private readonly logger = new Logger(InquiriesService.name);
  private readonly recentBySender = new Map<string, number[]>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifier: InquiryNotifierService,
  ) {}

  async submit(
    dto: CreateInquiryDto,
    meta: { ipAddress?: string; userAgent?: string },
  ): Promise<InquiryReceipt> {
    // A filled honeypot is answered with a normal-looking receipt. Telling a
    // bot it was caught only teaches whoever wrote it to try again.
    if (dto.websiteUrl && dto.websiteUrl.trim().length > 0) {
      this.logger.warn('Discarded an enquiry that tripped the honeypot.');
      return {
        reference: this.newReference(),
        receivedAt: new Date().toISOString(),
      };
    }

    const senderKey = this.hash(meta.ipAddress ?? 'unknown');
    this.assertWithinRate(senderKey);

    const inquiry = await this.prisma.inquiry.create({
      data: {
        reference: await this.uniqueReference(),
        name: dto.name,
        email: dto.email.toLowerCase(),
        company: dto.company?.trim() ? dto.company.trim() : null,
        projectType: dto.projectType,
        budget: dto.budget,
        message: dto.message,
        source: dto.source ?? 'contact',
        projectKey: dto.projectKey?.trim() ? dto.projectKey.trim() : null,
        timeline: optional(dto.timeline),
        utmSource: optional(dto.utmSource)?.toLowerCase() ?? null,
        utmMedium: optional(dto.utmMedium)?.toLowerCase() ?? null,
        utmCampaign: optional(dto.utmCampaign),
        // Only a real web address is worth keeping; anything else is noise.
        referrer: /^https?:\/\//i.test(dto.referrer ?? '')
          ? optional(dto.referrer)
          : null,
        landingPath: dto.landingPath?.startsWith('/')
          ? optional(dto.landingPath)
          : null,
        ipHash: senderKey,
        userAgent: meta.userAgent?.slice(0, 400) ?? null,
      },
      select: {
        reference: true,
        createdAt: true,
        name: true,
        email: true,
        company: true,
        projectType: true,
        budget: true,
        timeline: true,
        message: true,
        source: true,
        utmSource: true,
        utmCampaign: true,
      },
    });

    this.logger.log(`Enquiry ${inquiry.reference} received from ${dto.email}`);
    this.notifier.notify(inquiry);

    return {
      reference: inquiry.reference,
      receivedAt: inquiry.createdAt.toISOString(),
    };
  }

  private assertWithinRate(senderKey: string): void {
    const now = Date.now();
    const seen = (this.recentBySender.get(senderKey) ?? []).filter(
      (at) => now - at < WINDOW_MS,
    );

    if (seen.length >= MAX_PER_WINDOW) {
      throw new HttpException(
        'You have sent several enquiries already. Reply to the email thread instead, or try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    seen.push(now);
    this.recentBySender.set(senderKey, seen);

    if (this.recentBySender.size > MAX_TRACKED_SENDERS) {
      this.evictExpired(now);
    }
  }

  private evictExpired(now: number): void {
    for (const [key, timestamps] of this.recentBySender) {
      const live = timestamps.filter((at) => now - at < WINDOW_MS);
      if (live.length === 0) {
        this.recentBySender.delete(key);
      } else {
        this.recentBySender.set(key, live);
      }
    }
  }

  /** Stored instead of the address itself: enough to rate-limit, not to track. */
  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex').slice(0, 32);
  }

  private newReference(): string {
    let code = '';
    for (let index = 0; index < 6; index += 1) {
      code += REFERENCE_ALPHABET[randomInt(REFERENCE_ALPHABET.length)];
    }
    return `STL-${code}`;
  }

  private async uniqueReference(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const reference = this.newReference();
      const clash = await this.prisma.inquiry.findUnique({
        where: { reference },
        select: { id: true },
      });

      if (!clash) return reference;
    }

    // 32^6 codes makes five collisions effectively impossible; if it somehow
    // happens, fall back to something that cannot collide at all.
    return `STL-${Date.now().toString(36).toUpperCase()}`;
  }
}
