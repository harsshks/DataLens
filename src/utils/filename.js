const path = require('path');
const { v4: uuidv4 } = require('uuid');

function sanitizeOriginalName(originalName) {
  const base = path.basename(String(originalName || 'upload.csv'));
  return base.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180) || 'upload.csv';
}

function generateStoredFilename() {
  return `${uuidv4()}.csv`;
}

function assertSafeStoredPath(filePath, uploadRoot) {
  const resolved = path.resolve(filePath);
  const root = path.resolve(uploadRoot);
  if (!resolved.startsWith(root)) {
    throw new Error('Unsafe file path');
  }
  return resolved;
}

module.exports = {
  sanitizeOriginalName,
  generateStoredFilename,
  assertSafeStoredPath,
};
