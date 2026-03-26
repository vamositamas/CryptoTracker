import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import { StorageService } from './storage.service';
import { queues } from '../utils/file-queue';

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

describe('StorageService', () => {
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
