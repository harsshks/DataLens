const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const config = require('../config');
const { ROLES } = require('../config/constants');
const AppError = require('../utils/AppError');

function sanitizeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function signToken(user) {
  return jwt.sign({ id: user.id, role: user.role }, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn,
  });
}

async function register({ name, email, password }) {
  const existing = await User.findOne({ where: { email: email.toLowerCase() } });
  if (existing) {
    throw new AppError('An account with this email already exists', 409, 'EMAIL_TAKEN');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    role: ROLES.USER,
  });

  return {
    user: sanitizeUser(user),
    token: signToken(user),
  };
}

async function login({ email, password }) {
  const user = await User.findOne({ where: { email: email.toLowerCase() } });
  if (!user) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  return {
    user: sanitizeUser(user),
    token: signToken(user),
  };
}

async function getProfile(userId) {
  const user = await User.findByPk(userId);
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }
  return sanitizeUser(user);
}

async function ensureAdminUser() {
  const { email, password, name } = config.admin;
  if (!email || !password) return null;

  const existing = await User.findOne({ where: { email: email.toLowerCase() } });
  if (existing) {
    if (existing.role !== ROLES.ADMIN) {
      existing.role = ROLES.ADMIN;
      await existing.save();
    }
    return existing;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  return User.create({
    name,
    email: email.toLowerCase(),
    passwordHash,
    role: ROLES.ADMIN,
  });
}

module.exports = {
  register,
  login,
  getProfile,
  sanitizeUser,
  signToken,
  ensureAdminUser,
};
