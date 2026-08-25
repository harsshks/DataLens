const express = require('express');
const authController = require('../controllers/authController');
const { registerRules, loginRules } = require('../validators/authValidators');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, example: Harsh Kumar }
 *               email: { type: string, example: harsh@example.com }
 *               password: { type: string, example: password123 }
 *     responses:
 *       201:
 *         description: User created
 *       409:
 *         description: Email already registered
 *       422:
 *         description: Validation error
 */
router.post('/register', authLimiter, registerRules, authController.register);

/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login and receive a JWT
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: JWT returned
 *       401:
 *         description: Invalid credentials
 */
router.post('/login', authLimiter, loginRules, authController.login);

/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Get the authenticated user
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user profile
 *       401:
 *         description: Missing or invalid token
 */
router.get('/me', authenticate, authController.me);

module.exports = router;
