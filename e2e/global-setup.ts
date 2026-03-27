import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

async function globalSetup() {
  // Create isolated test data directory
  const testDataDir = path.join(os.tmpdir(), `crypto-tracker-test-${Date.now()}`);
  
  if (!fs.existsSync(testDataDir)) {
    fs.mkdirSync(testDataDir, { recursive: true });
  }
  
  // Set environment variable for backend to use this directory
  process.env['DATA_DIR'] = testDataDir;
  
  console.log(`Test data directory: ${testDataDir}`);
  
  return async () => {
    // Cleanup will be handled by global teardown
  };
}

export default globalSetup;
