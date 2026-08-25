const { validationResult } = require('express-validator');
const AppError = require('../utils/AppError');

function handleValidation(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const first = errors.array()[0];
    next(new AppError(first.msg, 422, 'VALIDATION_ERROR'));
    return;
  }
  next();
}

module.exports = handleValidation;
