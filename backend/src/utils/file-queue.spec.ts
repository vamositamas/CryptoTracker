import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs/promises';
import { getFileQueue, queues } from './file-queue';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ct-queue-'));
  queues.clear();
});

afterEach(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
  queues.clear();
});

describe('getFileQueue', () => {
  it('returns the same queue instance for the same absolute path', () => {
    const file = path.join(tmpDir, 'a.json');
    const q1 = getFileQueue(file);
    const q2 = getFileQueue(file);
    expect(q1).toBe(q2);
  });

  it('returns different queue instances for different paths', () => {
    const q1 = getFileQueue(path.join(tmpDir, 'a.json'));
    const q2 = getFileQueue(path.join(tmpDir, 'b.json'));
    expect(q1).not.toBe(q2);
  });

  it('resolves relative paths to the same queue as their absolute equivalent', () => {
    const abs = path.join(tmpDir, 'c.json');
    const rel = path.relative(process.cwd(), abs);
    const q1 = getFileQueue(abs);
    const q2 = getFileQueue(rel);
    expect(q1).toBe(q2);
  });

  it('serialises concurrent writes — second starts only after first completes', async () => {
    const file = path.join(tmpDir, 'seq.json');
    const order: number[] = [];
    const queue = getFileQueue(file);
    await Promise.all([
      queue.add(async () => {
        await new Promise((r) => setTimeout(r, 10));
        order.push(1);
      }),
      queue.add(async () => {
        order.push(2);
      }),
    ]);
    expect(order).toEqual([1, 2]);
  });
});
