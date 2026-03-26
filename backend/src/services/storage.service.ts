import * as fs from 'fs/promises';
import * as path from 'path';
import { atomicWrite } from '../utils/atomic-write';
import { getFileQueue } from '../utils/file-queue';

const DEFAULT_DATA_DIR = path.resolve(
  process.env.DATA_DIR || path.join(__dirname, '../../data'),
);

export class StorageService {
  private readonly dataDir: string;

  constructor(dataDir: string = DEFAULT_DATA_DIR) {
    this.dataDir = path.resolve(dataDir);
  }

  resolveDataPath(relativePath: string): string {
    const resolved = path.resolve(this.dataDir, relativePath);
    const relative = path.relative(this.dataDir, resolved);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error(`Path escapes data directory: ${relativePath}`);
    }
    return resolved;
  }

  async read<T>(relativePath: string): Promise<T> {
    const filePath = this.resolveDataPath(relativePath);
    const raw = await fs.readFile(filePath, 'utf-8');
    try {
      return JSON.parse(raw) as T;
    } catch {
      throw new Error(`Failed to parse JSON at ${filePath}`);
    }
  }

  async write(relativePath: string, data: unknown): Promise<void> {
    const filePath = this.resolveDataPath(relativePath);
    const queue = getFileQueue(filePath);
    await queue.add(() => atomicWrite(filePath, data));
  }

  async appendJsonArray<T>(relativePath: string, item: T): Promise<void> {
    const filePath = this.resolveDataPath(relativePath);
    const queue = getFileQueue(filePath);
    await queue.add(async () => {
      let existing: T[] = [];
      try {
        const raw = await fs.readFile(filePath, 'utf-8');
        const parsed = JSON.parse(raw) as unknown;
        existing = Array.isArray(parsed) ? (parsed as T[]) : [];
      } catch {
        existing = [];
      }

      await atomicWrite(filePath, [...existing, item]);
    });
  }
}

export const storageService = new StorageService();
