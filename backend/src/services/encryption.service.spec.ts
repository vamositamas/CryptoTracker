import { describe, it, expect } from 'vitest';
import { EncryptionService } from './encryption.service';

const VALID_KEY = 'a'.repeat(64); // 64 hex chars = 32 bytes

describe('EncryptionService', () => {
  it('is disabled when no key is provided', () => {
    const svc = new EncryptionService(undefined);
    expect(svc.enabled).toBe(false);
  });

  it('is enabled when a valid 64-char hex key is provided', () => {
    const svc = new EncryptionService(VALID_KEY);
    expect(svc.enabled).toBe(true);
  });

  it('throws on invalid key length', () => {
    expect(() => new EncryptionService('deadbeef')).toThrow(
      'DATA_ENCRYPTION_KEY must be a 64-character hex string',
    );
  });

  it('throws on non-hex characters in key', () => {
    expect(() => new EncryptionService('z'.repeat(64))).toThrow(
      'DATA_ENCRYPTION_KEY must be a 64-character hex string',
    );
  });

  describe('encrypt / decrypt', () => {
    it('round-trips arbitrary JSON strings', () => {
      const svc = new EncryptionService(VALID_KEY);
      const plaintext = JSON.stringify({ trades: [{ id: '1', amount: 42 }] });
      const ciphertext = svc.encrypt(plaintext);
      expect(svc.decrypt(ciphertext)).toBe(plaintext);
    });

    it('produces different ciphertext each call (random IV)', () => {
      const svc = new EncryptionService(VALID_KEY);
      const a = svc.encrypt('hello');
      const b = svc.encrypt('hello');
      expect(a).not.toBe(b);
    });

    it('ciphertext format is three colon-separated segments', () => {
      const svc = new EncryptionService(VALID_KEY);
      const parts = svc.encrypt('test').split(':');
      expect(parts).toHaveLength(3);
    });

    it('throws when decrypting with a different key (auth tag mismatch)', () => {
      const svc1 = new EncryptionService(VALID_KEY);
      const svc2 = new EncryptionService('b'.repeat(64));
      const ciphertext = svc1.encrypt('secret');
      expect(() => svc2.decrypt(ciphertext)).toThrow();
    });

    it('throws when decrypting a tampered ciphertext', () => {
      const svc = new EncryptionService(VALID_KEY);
      const parts = svc.encrypt('secret data').split(':');
      // Corrupt the ciphertext segment
      parts[2] = Buffer.from('corrupted').toString('base64');
      expect(() => svc.decrypt(parts.join(':'))).toThrow();
    });

    it('throws when decrypted format is invalid', () => {
      const svc = new EncryptionService(VALID_KEY);
      expect(() => svc.decrypt('not:valid')).toThrow('Invalid encrypted data format');
    });

    it('throws encrypt/decrypt when not enabled', () => {
      const svc = new EncryptionService(undefined);
      expect(() => svc.encrypt('x')).toThrow('not configured');
      expect(() => svc.decrypt('x:y:z')).toThrow('not configured');
    });
  });

  describe('isEncrypted', () => {
    it('returns false for plain JSON objects', () => {
      const svc = new EncryptionService(VALID_KEY);
      expect(svc.isEncrypted('{"foo":"bar"}')).toBe(false);
      expect(svc.isEncrypted('  { "x": 1 }')).toBe(false);
    });

    it('returns false for plain JSON arrays', () => {
      const svc = new EncryptionService(VALID_KEY);
      expect(svc.isEncrypted('[1,2,3]')).toBe(false);
    });

    it('returns false for plain string trade values', () => {
      const svc = new EncryptionService(VALID_KEY);
      expect(svc.isEncrypted('Win')).toBe(false);
      expect(svc.isEncrypted('Long')).toBe(false);
      expect(svc.isEncrypted('DOT')).toBe(false);
      expect(svc.isEncrypted('2026-01-09T12:00:00.000Z')).toBe(false);
    });

    it('returns true for an encrypted field value', () => {
      const svc = new EncryptionService(VALID_KEY);
      const ciphertext = svc.encrypt('"Win"');
      expect(svc.isEncrypted(ciphertext)).toBe(true);
    });

    it('returns true for a whole-file encrypted blob', () => {
      const svc = new EncryptionService(VALID_KEY);
      const ciphertext = svc.encrypt('{"secret":"data"}');
      expect(svc.isEncrypted(ciphertext)).toBe(true);
    });
  });

  describe('encryptFields / decryptFields', () => {
    it('round-trips a flat object preserving types', () => {
      const svc = new EncryptionService(VALID_KEY);
      const obj = { id: 'abc-123', amount: 500, open: true, score: null as unknown };
      const encrypted = svc.encryptFields(obj) as Record<string, unknown>;
      // Structure preserved
      expect(Object.keys(encrypted)).toEqual(['id', 'amount', 'open', 'score']);
      // Values are opaque
      expect(encrypted['id']).not.toBe('abc-123');
      // Round-trip restores originals
      const decrypted = svc.decryptFields(encrypted) as typeof obj;
      expect(decrypted).toEqual(obj);
    });

    it('round-trips an array of trade objects', () => {
      const svc = new EncryptionService(VALID_KEY);
      const trades = [
        { id: '1', token: 'BTC', amount: 1000, result: 'Win' },
        { id: '2', token: 'ETH', amount: 500, result: 'Loss' },
      ];
      const encrypted = svc.encryptFields(trades) as typeof trades;
      const decrypted = svc.decryptFields(encrypted) as typeof trades;
      expect(decrypted).toEqual(trades);
    });

    it('decryptFields passes through plain (non-encrypted) values', () => {
      const svc = new EncryptionService(VALID_KEY);
      const plain = { token: 'BTC', count: 42 };
      // Calling decryptFields on a plain (unencrypted) object should return it unchanged
      expect(svc.decryptFields(plain)).toEqual(plain);
    });
  });
});
