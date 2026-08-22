import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;

/**
 * Encrypts sensitive string using AES-256-GCM
 */
export function encryptString(plainText: string, hexKey: string): string {
  const key = Buffer.from(hexKey, 'hex');
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:encryptedData
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts string encrypted with AES-256-GCM
 */
export function decryptString(encryptedText: string, hexKey: string): string {
  const [ivHex, authTagHex, encryptedDataHex] = encryptedText.split(':');
  if (!ivHex || !authTagHex || !encryptedDataHex) {
    throw new Error('Invalid encrypted text format');
  }

  const key = Buffer.from(hexKey, 'hex');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedDataHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generates an unguessable 32-byte opaque customer recovery token
 */
export function generateCustomerRecoveryToken(): {
  rawToken: string;
  tokenHash: string;
} {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken, 'utf8').digest('hex');
  return { rawToken, tokenHash };
}

/**
 * Hashes a token string for database lookup
 */
export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}
