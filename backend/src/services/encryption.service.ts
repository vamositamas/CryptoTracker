import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // 96-bit IV is recommended for AES-GCM

/**
 * AES-256-GCM field-level encryption service for at-rest data protection.
 *
 * Activation: set DATA_ENCRYPTION_KEY to a 64-character hex string (32 bytes).
 * Generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * When the key is absent the service is disabled and plain JSON is written (backward-compatible).
 * When enabled:
 *   - write: each leaf value in a JSON object is individually encrypted → JSON structure preserved
 *   - read:  each encrypted string value is decrypted back to its original type
 *
 * The resulting file stays valid JSON with readable keys but opaque values, e.g.:
 *   { "id": "abc123...", "token": "xyz..." }   ← only values are encrypted
 */
export class EncryptionService {
  private readonly key: Buffer | null;

  constructor(hexKey?: string) {
    const rawKey = hexKey ?? process.env['DATA_ENCRYPTION_KEY'];
    if (rawKey) {
      if (!/^[0-9a-fA-F]{64}$/.test(rawKey)) {
        throw new Error(
          'DATA_ENCRYPTION_KEY must be a 64-character hex string (32 bytes / 256 bits)',
        );
      }
      this.key = Buffer.from(rawKey, 'hex');
    } else {
      this.key = null;
    }
  }

  /** Whether encryption is active (key is configured). */
  get enabled(): boolean {
    return this.key !== null;
  }

  /**
   * Encrypts a UTF-8 plaintext string.
   * Returns: `<iv_b64>:<authTag_b64>:<ciphertext_b64>`
   */
  encrypt(plaintext: string): string {
    if (!this.key) throw new Error('Encryption not configured: DATA_ENCRYPTION_KEY is not set');
    const iv = randomBytes(IV_LENGTH);
    const cipher = createCipheriv(ALGORITHM, this.key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted.toString('base64')}`;
  }

  /**
   * Decrypts a value produced by `encrypt()`.
   * Throws if the auth tag does not match (tamper detection).
   */
  decrypt(ciphertext: string): string {
    if (!this.key) throw new Error('Encryption not configured: DATA_ENCRYPTION_KEY is not set');
    const parts = ciphertext.split(':');
    if (parts.length !== 3) throw new Error('Invalid encrypted data format');
    const [ivB64, tagB64, dataB64] = parts;
    const iv = Buffer.from(ivB64, 'base64');
    const authTag = Buffer.from(tagB64, 'base64');
    const encrypted = Buffer.from(dataB64, 'base64');
    const decipher = createDecipheriv(ALGORITHM, this.key, iv);
    decipher.setAuthTag(authTag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
  }

  /**
   * Returns true when the string was produced by `encrypt()`.
   * Uses structural matching: 16-char base64 IV + 24-char base64 auth tag + base64 ciphertext.
   * This correctly rejects plain values such as "Win", dates like "12:00:00", and JSON strings.
   */
  isEncrypted(str: string): boolean {
    const parts = str.trim().split(':');
    if (parts.length !== 3) return false;
    const [iv, tag, cipher] = parts;
    return (
      /^[A-Za-z0-9+/]{16}$/.test(iv) &&
      /^[A-Za-z0-9+/=]{24}$/.test(tag) &&
      cipher.length >= 4
    );
  }

  /**
   * Recursively encrypts every leaf value in a JSON-serialisable object.
   * Arrays and plain objects are traversed; primitives are JSON.stringify'd then encrypted.
   * The JSON structure (keys, nesting) is preserved — only values become opaque strings.
   */
  encryptFields(data: unknown): unknown {
    if (data === null || data === undefined) return data;
    if (Array.isArray(data)) return data.map((item) => this.encryptFields(item));
    if (typeof data === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
        result[key] = this.encryptFields(value);
      }
      return result;
    }
    // primitive — encrypt the JSON-serialised representation to preserve type on decrypt
    return this.encrypt(JSON.stringify(data));
  }

  /**
   * Recursively decrypts field values produced by `encryptFields()`.
   * Non-encrypted string values are returned as-is (backward compat with plain JSON files).
   */
  decryptFields(data: unknown): unknown {
    if (data === null || data === undefined) return data;
    if (Array.isArray(data)) return data.map((item) => this.decryptFields(item));
    if (typeof data === 'object') {
      const result: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
        result[key] = this.decryptFields(value);
      }
      return result;
    }
    if (typeof data === 'string' && this.isEncrypted(data)) {
      return JSON.parse(this.decrypt(data)) as unknown;
    }
    return data; // plain legacy value — pass through unchanged
  }
}

export const encryptionService = new EncryptionService();

