import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import { StorageService } from './storage.service';
import { EncryptionService } from './encryption.service';
import { queues } from '../utils/file-queue';

const VALID_KEY = 'a'.repeat(64);

let tmpDir: string;
let svc: StorageService;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ct-storage-'));
  queues.clear();
  svc = new StorageService(tmpDir);
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
  queues.clear();
});

describe('StorageService (unencrypted)', () => {
  it('write() + read() round-trip preserves data', async () => {
    const payload = { foo: 'bar', count: 42 };
    await svc.write('test/data.json', payload);
    const result = await svc.read<typeof payload>('test/data.json');
    expect(result).toEqual(payload);
  });

  it('read() throws a readable error on a missing file', async () => {
    await expect(svc.read('nonexistent.json')).rejects.toThrow();
  });

  it('write() creates nested directories automatically', async () => {
    await svc.write('deep/nested/dir/file.json', [1, 2, 3]);
    const result = await svc.read<number[]>('deep/nested/dir/file.json');
    expect(result).toEqual([1, 2, 3]);
  });

  it('resolveDataPath() returns an absolute path inside DATA_DIR', () => {
    const resolved = svc.resolveDataPath('shared/tokens.json');
    expect(path.isAbsolute(resolved)).toBe(true);
    expect(resolved).toContain('shared');
    expect(resolved).toContain('tokens.json');
  });

  it('read() / write() throw on path traversal attempt', async () => {
    await expect(svc.read('../outside.json')).rejects.toThrow('Path escapes data directory');
    await expect(svc.write('../outside.json', {})).rejects.toThrow('Path escapes data directory');
  });
});

describe('StorageService (encrypted)', () => {
  let enc: EncryptionService;
  let encSvc: StorageService;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ct-storage-enc-'));
    queues.clear();
    enc = new EncryptionService(VALID_KEY);
    encSvc = new StorageService(tmpDir, enc);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
    queues.clear();
  });

  it('write() + read() round-trip works the same as unencrypted', async () => {
    const payload = { trades: [{ id: '1', amount: 500 }] };
    await encSvc.write('trades.json', payload);
    const result = await encSvc.read<typeof payload>('trades.json');
    expect(result).toEqual(payload);
  });

  it('file on disk is valid JSON with encrypted values (field-level encryption)', async () => {
    await encSvc.write('trades.json', { secret: true });
    const raw = await fs.readFile(path.join(tmpDir, 'trades.json'), 'utf-8');
    // Structure is preserved — the file is valid JSON
    const onDisk = JSON.parse(raw) as Record<string, unknown>;
    // The value is an encrypted string, not the original boolean
    expect(onDisk['secret']).not.toBe(true);
    expect(typeof onDisk['secret']).toBe('string');
    expect(enc.isEncrypted(onDisk['secret'] as string)).toBe(true);
  });

  it('reads legacy plain-JSON files without error (migration / backward compat)', async () => {
    // Write plain JSON directly (simulates pre-encryption data)
    const legacyPath = path.join(tmpDir, 'legacy.json');
    await fs.writeFile(legacyPath, JSON.stringify({ legacy: true }), 'utf-8');
    const result = await encSvc.read<{ legacy: boolean }>('legacy.json');
    expect(result).toEqual({ legacy: true });
  });

  it('appendJsonArray() encrypts items and read() decrypts them', async () => {
    await encSvc.appendJsonArray('audit.json', { action: 'CREATE', id: '1' });
    await encSvc.appendJsonArray('audit.json', { action: 'UPDATE', id: '1' });
    const result = await encSvc.read<{ action: string; id: string }[]>('audit.json');
    expect(result).toHaveLength(2);
    expect(result[0].action).toBe('CREATE');
    expect(result[1].action).toBe('UPDATE');
  });

  it('unencrypted StorageService reads encrypted fields as opaque strings (data is inaccessible)', async () => {
    await encSvc.write('trades.json', { secret: 42 });
    const plainSvc = new StorageService(tmpDir);
    // File is valid JSON so parsing succeeds, but values are still encrypted strings
    const result = await plainSvc.read<{ secret: unknown }>('trades.json');
    expect(result.secret).not.toBe(42);
    expect(typeof result.secret).toBe('string');
  });
});
