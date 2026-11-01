import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadCliEnvironment } from './cli-environment';

/**
 * Finishes connecting new-enquiry alerts to Telegram.
 *
 * Before running it:
 *   1. In Telegram, open @BotFather, send /newbot, and follow the two
 *      questions (a name, then a username ending in "bot").
 *   2. Copy the token it gives you into sudo-api/.env:
 *        INQUIRY_TELEGRAM_BOT_TOKEN=123456:ABC...
 *   3. Open your new bot in Telegram, press Start, and send it any message.
 *
 * Then:
 *   npm run notify:telegram-setup
 *
 * It finds the chat you just messaged from, writes INQUIRY_TELEGRAM_CHAT_ID
 * into .env, and sends a test message so you can see it works.
 */

const ENV_PATH = resolve(process.cwd(), '.env');

interface TelegramResponse<T> {
  ok: boolean;
  result: T;
  description?: string;
}

interface Update {
  message?: {
    chat: { id: number; type: string; first_name?: string; username?: string };
  };
}

async function call<T>(
  token: string,
  method: string,
  body?: object,
): Promise<T> {
  const response = await fetch(
    `https://api.telegram.org/bot${token}/${method}`,
    {
      method: body ? 'POST' : 'GET',
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    },
  );
  const data = (await response.json()) as TelegramResponse<T>;
  if (!data.ok) {
    throw new Error(
      response.status === 401
        ? 'Telegram does not recognise that token. Copy it again from @BotFather into .env.'
        : `Telegram said: ${data.description ?? response.status}`,
    );
  }
  return data.result;
}

/** Sets one KEY=value line in .env, replacing it if it is there already. */
function saveToEnv(key: string, value: string) {
  const current = readFileSync(ENV_PATH, 'utf8');
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, 'm');
  const next = pattern.test(current)
    ? current.replace(pattern, line)
    : `${current.replace(/\s*$/, '')}\n${line}\n`;
  writeFileSync(ENV_PATH, next, 'utf8');
}

async function main() {
  loadCliEnvironment();

  const token = process.env.INQUIRY_TELEGRAM_BOT_TOKEN?.trim();
  if (!token) {
    throw new Error(
      [
        'No bot token yet. In Telegram:',
        '  1. Open @BotFather and send /newbot, then answer its two questions.',
        '  2. Put the token it gives you in sudo-api/.env as',
        '       INQUIRY_TELEGRAM_BOT_TOKEN=<token>',
        '  3. Open your bot, press Start, and send it any message.',
        'Then run this again.',
      ].join('\n'),
    );
  }

  const bot = await call<{ username: string }>(token, 'getMe');
  const updates = await call<Update[]>(token, 'getUpdates');
  const chat = [...updates]
    .reverse()
    .map((update) => update.message?.chat)
    .find((entry) => entry?.type === 'private');

  if (!chat) {
    throw new Error(
      `The bot @${bot.username} works, but nobody has messaged it yet. Open it in Telegram, press Start, send any message, and run this again.`,
    );
  }

  saveToEnv('INQUIRY_TELEGRAM_CHAT_ID', String(chat.id));

  await call(token, 'sendMessage', {
    chat_id: chat.id,
    text: 'Sudo Tech Labs: enquiry alerts are connected. Every new enquiry from the website will arrive here.',
  });

  console.log(
    `Connected @${bot.username} to ${chat.first_name ?? chat.username ?? 'your chat'} (chat ${chat.id}).`,
  );
  console.log(
    'Saved INQUIRY_TELEGRAM_CHAT_ID to .env and sent a test message.',
  );
  console.log(
    "For the live site, add both INQUIRY_TELEGRAM_* values to the API host's environment settings too.",
  );
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
