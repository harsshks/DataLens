const AppError = require('../utils/AppError');

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    next(err);
    return;
  }

  let statusCode = err.statusCode || 500;
  let code = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'An unexpected error occurred';

  if (err.name === 'MulterError') {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      code = 'FILE_TOO_LARGE';
      message = 'Uploaded file exceeds the maximum allowed size';
    } else {
      code = 'INVALID_UPLOAD';
      message = err.message;
    }
  }

  if (err.name === 'SequelizeValidationError') {
    statusCode = 422;
    code = 'VALIDATION_ERROR';
    message = err.errors.map((e) => e.message).join('; ');
  }

  if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    code = 'CONFLICT';
    message = 'A record with this value already exists';
  }

  if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
    console.error(err);
  }

  if (statusCode >= 500 && process.env.NODE_ENV === 'production') {
    message = 'An unexpected error occurred';
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
    },
  });
}

function notFoundHandler(req, res, next) {
  next(new AppError(`Route ${req.method} ${req.originalUrl} was not found`, 404, 'NOT_FOUND'));
}

module.exports = {
  errorHandler,
  notFoundHandler,
};
