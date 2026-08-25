const express = require('express');
const adminController = require('../controllers/adminController');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { listRules } = require('../validators/datasetValidators');

const router = express.Router();

router.use(authenticate, requireAdmin);

/**
 * @openapi
 * /api/admin/statistics:
 *   get:
 *     tags: [Admin]
 *     summary: System-wide analysis statistics
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Aggregate counts
 *       403:
 *         description: Admin only
 */
router.get('/statistics', adminController.statistics);

/**
 * @openapi
 * /api/admin/datasets:
 *   get:
 *     tags: [Admin]
 *     summary: List datasets across all users
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: status
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Paginated datasets
 */
router.get('/datasets', listRules, adminController.datasets);

module.exports = router;
