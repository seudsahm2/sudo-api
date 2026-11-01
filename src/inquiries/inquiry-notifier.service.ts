import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface InquiryNotice {
  reference: string;
  name: string;
  email: string;
  company: string | null;
  projectType: string;
  budget: string;
  timeline: string | null;
  message: string;
  source: string;
  utmSource: string | null;
  utmCampaign: string | null;
}

const SEND_TIMEOUT_MS = 15000;
/** A slow or dropped connection should not cost an enquiry its alert. */
const SEND_ATTEMPTS = 3;
const RETRY_DELAY_MS = 3000;
/** Telegram's limit is 4096; leave room for the header lines. */
const MAX_MESSAGE_CHARS = 3000;

/**
 * Tells someone an enquiry has arrived, so "a reply within one business day"
 * does not depend on remembering to open the admin.
 *
 * Telegram, because it needs no domain, no mail server and no deliverability
 * work: create a bot with @BotFather, send it any message, and set
 *
 *   INQUIRY_TELEGRAM_BOT_TOKEN=<token from BotFather>
 *   INQUIRY_TELEGRAM_CHAT_ID=<your chat id>
 *
 * With either missing this does nothing. It never throws and never delays the
 * visitor: the enquiry is already stored before this runs.
 */
@Injectable()
export class InquiryNotifierService {
  private readonly logger = new Logger(InquiryNotifierService.name);

  constructor(private readonly config: ConfigService) {}

  get enabled(): boolean {
    return Boolean(this.token() && this.chatId());
  }

  notify(notice: InquiryNotice): void {
    if (!this.enabled) {
      this.logger.warn(
        `Telegram is not configured, so ${notice.reference} sent no alert.`,
      );
      return;
    }
    void this.deliver(notice);
  }

  private async deliver(notice: InquiryNotice): Promise<void> {
    for (let attempt = 1; attempt <= SEND_ATTEMPTS; attempt += 1) {
      try {
        await this.send(notice);
        this.logger.log(`Telegram alert delivered for ${notice.reference}`);
        return;
      } catch (error) {
        this.logger.error(
          `Telegram alert attempt ${attempt} of ${SEND_ATTEMPTS} failed for ${notice.reference}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
        if (attempt < SEND_ATTEMPTS) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        }
      }
    }
  }

  private async send(notice: InquiryNotice): Promise<void> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);

    try {
      const response = await fetch(
        `https://api.telegram.org/bot${this.token()}/sendMessage`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            chat_id: this.chatId(),
            text: this.format(notice),
            disable_web_page_preview: true,
          }),
          signal: controller.signal,
        },
      );
      if (!response.ok) {
        throw new Error(`Telegram answered ${response.status}`);
      }
    } finally {
      clearTimeout(timer);
    }
  }

  /** Plain text: no parse mode, so nothing a visitor types can break it. */
  private format(notice: InquiryNotice): string {
    const from = notice.company
      ? `${notice.name} (${notice.company})`
      : notice.name;
    const channel = [notice.utmSource, notice.utmCampaign]
      .filter(Boolean)
      .join(' / ');

    const lines = [
      `New enquiry ${notice.reference}`,
      '',
      `From: ${from}`,
      `Email: ${notice.email}`,
      `Project: ${notice.projectType}`,
      `Budget: ${notice.budget}`,
      notice.timeline ? `Start: ${notice.timeline}` : null,
      `Form: ${notice.source}${channel ? ` (via ${channel})` : ''}`,
      '',
      notice.message.length > MAX_MESSAGE_CHARS
        ? `${notice.message.slice(0, MAX_MESSAGE_CHARS)}…`
        : notice.message,
    ];

    return lines.filter((line) => line !== null).join('\n');
  }

  private token(): string | undefined {
    return (
      this.config.get<string>('INQUIRY_TELEGRAM_BOT_TOKEN')?.trim() || undefined
    );
  }

  private chatId(): string | undefined {
    return (
      this.config.get<string>('INQUIRY_TELEGRAM_CHAT_ID')?.trim() || undefined
    );
  }
}
