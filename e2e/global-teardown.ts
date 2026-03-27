import * as fs from 'fs';

async function globalTeardown() {
  // Clean up test data directory after tests complete
  const testDataDir = process.env['DATA_DIR'];
  
  if (testDataDir && fs.existsSync(testDataDir)) {
    try {
      fs.rmSync(testDataDir, { recursive: true, force: true });
      console.log(`Cleaned up test data directory: ${testDataDir}`);
    } catch (error) {
      console.warn(`Failed to clean up test data directory: ${error}`);
    }
  }
}

export default globalTeardown;
