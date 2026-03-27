import * as fs from 'fs/promises';
import * as path from 'path';
import { atomicWrite } from '../utils/atomic-write';
import { getFileQueue } from '../utils/file-queue';
import { EncryptionService, encryptionService } from './encryption.service';

const DEFAULT_DATA_DIR = path.resolve(
  process.env.DATA_DIR || path.join(__dirname, '../../data'),
);

export class StorageService {
  private readonly dataDir: string;
  private readonly enc: EncryptionService;

  constructor(dataDir: string = DEFAULT_DATA_DIR, enc: EncryptionService = encryptionService) {
    this.dataDir = path.resolve(dataDir);
    this.enc = enc;
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
    // Legacy compat: handle files previously encrypted as a single blob (pre-field-level era)
    const jsonStr =
      this.enc.enabled && this.enc.isEncrypted(raw) ? this.enc.decrypt(raw) : raw;
    try {
      const parsed = JSON.parse(jsonStr) as unknown;
      return (this.enc.enabled ? this.enc.decryptFields(parsed) : parsed) as T;
    } catch {
      throw new Error(`Failed to parse JSON at ${filePath}`);
    }
  }

  async write(relativePath: string, data: unknown): Promise<void> {
    const filePath = this.resolveDataPath(relativePath);
    const queue = getFileQueue(filePath);
    await queue.add(() => {
      const toWrite = this.enc.enabled ? this.enc.encryptFields(data) : data;
      return atomicWrite(filePath, JSON.stringify(toWrite, null, 2));
    });
  }

  async appendJsonArray<T>(relativePath: string, item: T): Promise<void> {
    const filePath = this.resolveDataPath(relativePath);
    const queue = getFileQueue(filePath);
    await queue.add(async () => {
      let existing: T[] = [];
      try {
        const raw = await fs.readFile(filePath, 'utf-8');
        // Legacy compat: whole-blob encrypted files
        const jsonStr =
          this.enc.enabled && this.enc.isEncrypted(raw) ? this.enc.decrypt(raw) : raw;
        const parsed = JSON.parse(jsonStr) as unknown;
        const decrypted = this.enc.enabled ? this.enc.decryptFields(parsed) : parsed;
        existing = Array.isArray(decrypted) ? (decrypted as T[]) : [];
      } catch {
        existing = [];
      }
      const newData = [...existing, item];
      const toWrite = this.enc.enabled ? this.enc.encryptFields(newData) : newData;
      await atomicWrite(filePath, JSON.stringify(toWrite, null, 2));
    });
  }
}

export const storageService = new StorageService();
