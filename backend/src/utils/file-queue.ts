import PQueue from 'p-queue';
import * as path from 'path';

/**
 * Module-level map of absolute file paths to their dedicated PQueue instances.
 * Exported for test teardown (queues.clear()).
 */
export const queues = new Map<string, PQueue>();

/**
 * Returns the PQueue instance for the given file path, creating one if needed.
 * Uses the absolute resolved path as the map key so that relative and absolute
 * references to the same file share the same queue.
 */
export function getFileQueue(filePath: string): PQueue {
  const absPath = path.resolve(filePath);
  if (!queues.has(absPath)) {
    queues.set(absPath, new PQueue({ concurrency: 1 }));
  }
  return queues.get(absPath)!;
}
