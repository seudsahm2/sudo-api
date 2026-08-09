import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';

function deriveKey(secret: string): Buffer {
  return createHash('sha256').update(secret).digest();
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function encryptSecret(plainText: string, secret: string): string {
  const key = deriveKey(secret);
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString('base64'),
    authTag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':');
}

export function decryptSecret(cipherText: string, secret: string): string {
  const [ivText, authTagText, encryptedText] = cipherText.split(':');
  if (!ivText || !authTagText || !encryptedText) {
    throw new Error('Invalid encrypted secret format');
  }

  const key = deriveKey(secret);
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(ivText, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(authTagText, 'base64'));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, 'base64')),
    decipher.final(),
  ]).toString('utf8');
}

export function parseDurationToMs(input: string): number {
  const match = /^(\d+)(ms|s|m|h|d)$/.exec(input.trim());

  if (!match) {
    throw new Error(`Unsupported duration format: ${input}`);
  }

  const value = Number(match[1]);
  const unit = match[2];

  switch (unit) {
    case 'ms':
      return value;
    case 's':
      return value * 1000;
    case 'm':
      return value * 60 * 1000;
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    default:
      throw new Error(`Unsupported duration unit: ${unit}`);
  }
}
