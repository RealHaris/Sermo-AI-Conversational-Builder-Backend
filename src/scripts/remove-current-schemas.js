const fs = require('fs');
const path = require('path');

// Directory where the current.json and current_bak.json files are located
// Typically in the same directory as migrations or in the parent db directory
// migrations directory is in the root directory
const dbDir = path.resolve(__dirname, '..', 'db', 'migrations');

console.log('Cleaning current state files...');

try {
  // Check if db directory exists
  if (fs.existsSync(dbDir)) {
    // Find and remove current.json and current_bak.json files
    fs.readdirSync(dbDir).forEach(file => {
      // Match files ending with _current.json or containing current_bak.json
      if (file.endsWith('_current.json') || file.includes('current_bak.json')) {
        try {
          fs.unlinkSync(path.join(dbDir, file));
          console.log(`Deleted current state file: ${file}`);
        } catch (err) {
          console.error(`Failed to delete file ${file}:`, err.message);
        }
      }
    });
    console.log('Current state files cleaning completed');
  } else {
    console.log('DB directory does not exist');
  }
} catch (error) {
  console.error('Error cleaning current state files:', error.message);
}
