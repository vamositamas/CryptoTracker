import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import { atomicWrite } from './atomic-write';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ct-atomic-'));
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

describe('atomicWrite', () => {
  it('writes JSON data to the target path', async () => {
    const file = path.join(tmpDir, 'test.json');
    await atomicWrite(file, { hello: 'world' });
    const raw = await fs.readFile(file, 'utf-8');
    expect(JSON.parse(raw)).toEqual({ hello: 'world' });
  });

  it('creates parent directories if they do not exist', async () => {
    const file = path.join(tmpDir, 'deep', 'nested', 'file.json');
    await atomicWrite(file, [1, 2, 3]);
    const raw = await fs.readFile(file, 'utf-8');
    expect(JSON.parse(raw)).toEqual([1, 2, 3]);
  });

  it('leaves no .tmp file after successful write', async () => {
    const file = path.join(tmpDir, 'clean.json');
    await atomicWrite(file, { ok: true });
    const files = await fs.readdir(tmpDir);
    expect(files.every((f) => !f.endsWith('.tmp'))).toBe(true);
  });

  it('overwrites existing file atomically', async () => {
    const file = path.join(tmpDir, 'update.json');
    await atomicWrite(file, { v: 1 });
    await atomicWrite(file, { v: 2 });
    const raw = await fs.readFile(file, 'utf-8');
    expect(JSON.parse(raw)).toEqual({ v: 2 });
  });
});
