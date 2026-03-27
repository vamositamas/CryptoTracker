import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Atomically writes data to filePath.
 * - When `data` is a string it is written verbatim (e.g. pre-encrypted content).
 * - Otherwise it is serialised to pretty-printed JSON.
 * Writes to a .tmp file first, then renames to the final path.
 * Creates parent directories if they do not exist.
 */
export async function atomicWrite(filePath: string, data: unknown): Promise<void> {
  const tmpPath = `${filePath}.tmp`;
  const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(tmpPath, content, 'utf-8');
  try {
    await fs.rename(tmpPath, filePath);
  } catch (err) {
    await fs.unlink(tmpPath).catch(() => undefined);
    throw err;
  }
}
