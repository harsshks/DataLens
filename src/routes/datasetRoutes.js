const express = require('express');
const datasetController = require('../controllers/datasetController');
const { authenticate } = require('../middleware/auth');
const { upload, requireCsvFile } = require('../middleware/upload');
const {
  listRules,
  datasetIdRules,
  issuesQueryRules,
  versionParamRules,
  compareRules,
} = require('../validators/datasetValidators');

const router = express.Router();

router.use(authenticate);

/**
 * @openapi
 * /api/datasets:
 *   post:
 *     tags: [Datasets]
 *     summary: Upload a CSV dataset and run quality analysis
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Dataset analyzed
 *       400:
 *         description: Invalid file
 *   get:
 *     tags: [Datasets]
 *     summary: List the authenticated user's datasets
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [UPLOADED, PROCESSING, COMPLETED, FAILED] }
 *       - in: query
 *         name: sort
 *         schema: { type: string, enum: [created_at, updated_at, name, quality_score, status] }
 *       - in: query
 *         name: order
 *         schema: { type: string, enum: [ASC, DESC] }
 *     responses:
 *       200:
 *         description: Paginated dataset list
 */
router.post('/', upload.single('file'), requireCsvFile, datasetController.create);
router.get('/', listRules, datasetController.list);

/**
 * @openapi
 * /api/datasets/{id}:
 *   get:
 *     tags: [Datasets]
 *     summary: Get dataset metadata
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Dataset metadata
 *       403:
 *         description: Not the owner
 *       404:
 *         description: Not found
 *   delete:
 *     tags: [Datasets]
 *     summary: Delete a dataset and its analysis records
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Deleted
 */
router.get('/:id', datasetIdRules, datasetController.getById);
router.delete('/:id', datasetIdRules, datasetController.remove);

/**
 * @openapi
 * /api/datasets/{id}/quality:
 *   get:
 *     tags: [Quality]
 *     summary: Get the latest quality report
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Quality report
 */
router.get('/:id/quality', datasetIdRules, datasetController.quality);

/**
 * @openapi
 * /api/datasets/{id}/issues:
 *   get:
 *     tags: [Quality]
 *     summary: List quality issues for the latest version
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: severity
 *         schema: { type: string, enum: [LOW, MEDIUM, HIGH, CRITICAL] }
 *       - in: query
 *         name: issue_type
 *         schema: { type: string }
 *       - in: query
 *         name: column
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Issue list
 */
router.get('/:id/issues', issuesQueryRules, datasetController.issues);

/**
 * @openapi
 * /api/datasets/{id}/columns:
 *   get:
 *     tags: [Quality]
 *     summary: Column-level statistics for the latest version
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Column statistics
 */
router.get('/:id/columns', datasetIdRules, datasetController.columns);

/**
 * @openapi
 * /api/datasets/{id}/versions:
 *   post:
 *     tags: [Versions]
 *     summary: Upload a new version of an existing dataset
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file: { type: string, format: binary }
 *     responses:
 *       201:
 *         description: New version analyzed
 *   get:
 *     tags: [Versions]
 *     summary: List versions of a dataset
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Version list
 */
router.post('/:id/versions', upload.single('file'), requireCsvFile, datasetController.addVersion);
router.get('/:id/versions', datasetIdRules, datasetController.listVersions);

/**
 * @openapi
 * /api/datasets/{id}/versions/{version}:
 *   get:
 *     tags: [Versions]
 *     summary: Get a specific dataset version
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: version
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Version details
 */
router.get('/:id/versions/:version', versionParamRules, datasetController.getVersion);

/**
 * @openapi
 * /api/datasets/{id}/compare/{version1}/{version2}:
 *   get:
 *     tags: [Versions]
 *     summary: Compare two dataset versions
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: version1
 *         required: true
 *         schema: { type: integer }
 *       - in: path
 *         name: version2
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Comparison summary
 */
router.get('/:id/compare/:version1/:version2', compareRules, datasetController.compare);

module.exports = router;
