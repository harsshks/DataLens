const path = require('path');
const fs = require('fs');
const multer = require('multer');
const config = require('../config');
const AppError = require('../utils/AppError');
const { generateStoredFilename } = require('../utils/filename');

const uploadRoot = path.resolve(config.upload.dir);

function ensureUploadDir() {
  if (!fs.existsSync(uploadRoot)) {
    fs.mkdirSync(uploadRoot, { recursive: true });
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    ensureUploadDir();
    cb(null, uploadRoot);
  },
  filename: (req, file, cb) => {
    cb(null, generateStoredFilename());
  },
});

const ALLOWED_MIMES = new Set([
  'text/csv',
  'application/csv',
  'application/vnd.ms-excel',
  'text/plain',
  'application/octet-stream',
]);

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname || '').toLowerCase();
  if (ext !== '.csv') {
    cb(new AppError('Only CSV files are supported', 400, 'INVALID_FILE'));
    return;
  }
  if (file.mimetype && !ALLOWED_MIMES.has(file.mimetype)) {
    cb(new AppError('Only CSV files are supported', 400, 'INVALID_FILE'));
    return;
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSizeBytes,
    files: 1,
  },
});

function requireCsvFile(req, res, next) {
  if (!req.file) {
    next(new AppError('A CSV file is required', 400, 'FILE_REQUIRED'));
    return;
  }
  next();
}

module.exports = {
  upload,
  requireCsvFile,
  ensureUploadDir,
};
