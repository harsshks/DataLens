const jwt = require('jsonwebtoken');
const config = require('../config');
const { ROLES } = require('../config/constants');
const { User } = require('../models');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    throw new AppError('Authentication required', 401, 'UNAUTHENTICATED');
  }

  try {
    const payload = jwt.verify(token, config.jwt.secret);
    const user = await User.findByPk(payload.id);
    if (!user) {
      throw new AppError('Authentication required', 401, 'UNAUTHENTICATED');
    }
    req.user = { id: user.id, role: user.role, email: user.email, name: user.name };
    next();
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError('Invalid or expired token', 401, 'UNAUTHENTICATED');
  }
});

const requireAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== ROLES.ADMIN) {
    next(new AppError('Admin access required', 403, 'FORBIDDEN'));
    return;
  }
  next();
};

module.exports = {
  authenticate,
  requireAdmin,
};
