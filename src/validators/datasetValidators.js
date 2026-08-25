const { param, query } = require('express-validator');
const { DATASET_STATUS, ISSUE_TYPES, SEVERITY } = require('../config/constants');
const handleValidation = require('./handleValidation');

const idParam = param('id').isInt({ min: 1 }).withMessage('Dataset id must be a positive integer');

const listRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  query('status').optional().isIn(Object.values(DATASET_STATUS)).withMessage('Invalid status'),
  query('sort').optional().isIn(['created_at', 'updated_at', 'name', 'quality_score', 'status']),
  query('order').optional().isIn(['ASC', 'DESC', 'asc', 'desc']),
  handleValidation,
];

const datasetIdRules = [idParam, handleValidation];

const issuesQueryRules = [
  idParam,
  query('severity').optional().isIn(Object.values(SEVERITY)).withMessage('Invalid severity'),
  query('issue_type').optional().isIn(Object.values(ISSUE_TYPES)).withMessage('Invalid issue_type'),
  query('column').optional().isString().isLength({ min: 1, max: 255 }),
  handleValidation,
];

const versionParamRules = [
  idParam,
  param('version').isInt({ min: 1 }).withMessage('version must be a positive integer'),
  handleValidation,
];

const compareRules = [
  idParam,
  param('version1').isInt({ min: 1 }).withMessage('version1 must be a positive integer'),
  param('version2').isInt({ min: 1 }).withMessage('version2 must be a positive integer'),
  handleValidation,
];

module.exports = {
  listRules,
  datasetIdRules,
  issuesQueryRules,
  versionParamRules,
  compareRules,
};
