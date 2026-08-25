const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const toInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const config = {
  env: process.env.NODE_ENV || 'development',
  port: toInt(process.env.PORT, 3000),
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: toInt(process.env.DB_PORT, 3306),
    name: process.env.DB_NAME || 'dataset_quality',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'dev-only-change-me',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  upload: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxFileSizeBytes: toInt(process.env.MAX_FILE_SIZE_MB, 10) * 1024 * 1024,
  },
  analysis: {
    pythonBin: process.env.PYTHON_BIN || 'python',
    timeoutMs: toInt(process.env.ANALYSIS_TIMEOUT_MS, 60000),
    scriptPath: path.join(__dirname, '../../analysis/analyze_dataset.py'),
  },
  admin: {
    email: process.env.ADMIN_EMAIL,
    password: process.env.ADMIN_PASSWORD,
    name: process.env.ADMIN_NAME || 'Admin',
  },
  corsOrigin: process.env.CORS_ORIGIN || '*',
};

module.exports = config;
