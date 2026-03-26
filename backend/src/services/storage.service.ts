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
    return path.resolve(this.dataDir, relativePath);
  }

  async read<T>(relativePath: string): Promise<T> {
    const filePath = this.resolveDataPath(relativePath);
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  }

  async write(relativePath: string, data: unknown): Promise<void> {
    const filePath = this.resolveDataPath(relativePath);
    const queue = getFileQueue(filePath);
    await queue.add(() => atomicWrite(filePath, data));
  }
}

export const storageService = new StorageService();
