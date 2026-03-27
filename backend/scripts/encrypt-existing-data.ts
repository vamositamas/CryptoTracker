/**
 * Migration script: convert trades.json files to field-level encryption.
 *
 * Handles two source formats:
 *   - whole-blob ciphertext (old approach): decrypts entire file → re-encrypts field-by-field
 *   - valid JSON (plain or already field-level): decryptFields → encryptFields
 *
 * Run:  cd backend && npx tsx scripts/encrypt-existing-data.ts
 * Safe to run multiple times (idempotent).
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });

import { EncryptionService } from '../src/services/encryption.service';

const TRADER_FILES = ['trades.json'];

async function main(): Promise<void> {
  const enc = new EncryptionService();
  if (!enc.enabled) {
    console.error('DATA_ENCRYPTION_KEY is not set in .env — aborting.');
    process.exit(1);
  }

  const dataDir = path.resolve(process.env['DATA_DIR'] ?? path.join(__dirname, '../data'));
  const tradersDir = path.join(dataDir, 'traders');

  let traders: string[];
  try {
    const entries = await fs.readdir(tradersDir, { withFileTypes: true });
    traders = entries.filter((e) => e.isDirectory()).map((e) => e.name);
  } catch {
    console.log('No traders directory found — nothing to migrate.');
    return;
  }

  let migrated = 0;

  for (const trader of traders) {
    for (const filename of TRADER_FILES) {
      const filePath = path.join(tradersDir, trader, filename);
      let raw: string;
      try {
        raw = await fs.readFile(filePath, 'utf-8');
      } catch {
        continue; // file doesn't exist for this trader
      }

      let parsed: unknown;
      if (enc.isEncrypted(raw)) {
        // Whole-blob format from the old approach — decrypt first
        console.log(`  [blob→field] ${trader}/${filename}`);
        parsed = JSON.parse(enc.decrypt(raw.trim()));
      } else {
        // Already valid JSON (plain or field-level encrypted)
        parsed = JSON.parse(raw);
        parsed = enc.decryptFields(parsed); // no-op if values are plain
        console.log(`  [re-encrypt] ${trader}/${filename}`);
      }

      const encrypted = enc.encryptFields(parsed);
      const content = JSON.stringify(encrypted, null, 2);
      const tmpPath = `${filePath}.tmp`;
      await fs.writeFile(tmpPath, content, 'utf-8');
      await fs.rename(tmpPath, filePath);
      migrated++;
    }
  }

  console.log(`\nMigration complete — ${migrated} file(s) processed.`);
}

main().catch((err: unknown) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
