const fs = require('fs/promises');
const { Op } = require('sequelize');
const {
  Dataset,
  DatasetColumn,
  QualityIssue,
  DatasetVersion,
  sequelize,
} = require('../models');
const { DATASET_STATUS, ROLES } = require('../config/constants');
const AppError = require('../utils/AppError');
const { sanitizeOriginalName } = require('../utils/filename');
const analysisService = require('./analysisService');
const { scoreFromAnalysis } = require('./scoringService');

function publicDataset(dataset) {
  return {
    id: dataset.id,
    user_id: dataset.userId,
    name: dataset.name,
    original_filename: dataset.originalFilename,
    row_count: dataset.rowCount,
    column_count: dataset.columnCount,
    quality_score: dataset.qualityScore,
    status: dataset.status,
    latest_version: dataset.latestVersionNumber,
    created_at: dataset.createdAt,
    updated_at: dataset.updatedAt,
  };
}

async function getOwnedDataset(datasetId, user, { allowAdmin = false } = {}) {
  const dataset = await Dataset.findByPk(datasetId);
  if (!dataset) {
    throw new AppError('Dataset not found', 404, 'DATASET_NOT_FOUND');
  }
  if (dataset.userId !== user.id && !(allowAdmin && user.role === ROLES.ADMIN)) {
    throw new AppError('You do not have access to this dataset', 403, 'FORBIDDEN');
  }
  return dataset;
}

async function persistAnalysis(dataset, version, analysis, score, transaction) {
  const columns = (analysis.columns || []).map((col) => ({
    datasetId: dataset.id,
    versionId: version.id,
    columnName: col.column_name,
    detectedType: col.detected_type,
    nullCount: col.null_count,
    uniqueCount: col.unique_count,
    duplicateCount: col.duplicate_count,
    minValue: col.min_value === null || col.min_value === undefined ? null : String(col.min_value),
    maxValue: col.max_value === null || col.max_value === undefined ? null : String(col.max_value),
    meanValue: col.mean_value,
    medianValue: col.median_value,
  }));

  if (columns.length) {
    await DatasetColumn.bulkCreate(columns, { transaction });
  }

  const issues = (analysis.issues || []).map((issue) => ({
    datasetId: dataset.id,
    versionId: version.id,
    issueType: issue.issue_type,
    severity: issue.severity,
    columnName: issue.column_name || null,
    issueCount: issue.issue_count || 0,
    description: issue.description,
  }));

  if (issues.length) {
    await QualityIssue.bulkCreate(issues, { transaction });
  }

  await dataset.update(
    {
      rowCount: analysis.row_count,
      columnCount: analysis.column_count,
      qualityScore: score,
      status: DATASET_STATUS.COMPLETED,
      latestVersionNumber: version.versionNumber,
      filePath: version.filePath,
      originalFilename: version.originalFilename,
    },
    { transaction }
  );

  await version.update(
    {
      rowCount: analysis.row_count,
      columnCount: analysis.column_count,
      qualityScore: score,
    },
    { transaction }
  );
}

async function analyzeAndStore({ dataset, filePath, originalFilename, versionNumber }) {
  await dataset.update({ status: DATASET_STATUS.PROCESSING });

  try {
    const analysis = await analysisService.runPythonAnalysis(filePath);
    const score = scoreFromAnalysis(analysis);

    const result = await sequelize.transaction(async (transaction) => {
      const version = await DatasetVersion.create(
        {
          datasetId: dataset.id,
          versionNumber,
          originalFilename,
          filePath,
          rowCount: analysis.row_count,
          columnCount: analysis.column_count,
          qualityScore: score,
          uploadedAt: new Date(),
        },
        { transaction }
      );

      await persistAnalysis(dataset, version, analysis, score, transaction);
      await dataset.reload({ transaction });
      return { dataset, version, analysis, score };
    });

    return result;
  } catch (error) {
    await dataset.update({ status: DATASET_STATUS.FAILED });
    throw error;
  }
}

async function createDataset({ user, file, name }) {
  const originalFilename = sanitizeOriginalName(file.originalname);
  const dataset = await Dataset.create({
    userId: user.id,
    name: name || originalFilename.replace(/\.csv$/i, ''),
    originalFilename,
    filePath: file.path,
    status: DATASET_STATUS.UPLOADED,
    latestVersionNumber: 0,
  });

  const stored = await analyzeAndStore({
    dataset,
    filePath: file.path,
    originalFilename,
    versionNumber: 1,
  });

  return publicDataset(stored.dataset);
}

async function addDatasetVersion({ user, datasetId, file }) {
  const dataset = await getOwnedDataset(datasetId, user);
  const originalFilename = sanitizeOriginalName(file.originalname);
  const nextVersion = dataset.latestVersionNumber + 1;

  const stored = await analyzeAndStore({
    dataset,
    filePath: file.path,
    originalFilename,
    versionNumber: nextVersion,
  });

  return {
    dataset: publicDataset(stored.dataset),
    version: {
      version_number: stored.version.versionNumber,
      row_count: stored.version.rowCount,
      column_count: stored.version.columnCount,
      quality_score: stored.version.qualityScore,
      uploaded_at: stored.version.uploadedAt,
    },
  };
}

async function listDatasets({ user, page = 1, limit = 10, status, sort = 'created_at', order = 'DESC' }) {
  const allowedSort = {
    created_at: 'createdAt',
    updated_at: 'updatedAt',
    name: 'name',
    quality_score: 'qualityScore',
    status: 'status',
  };

  const sortField = allowedSort[sort] || 'createdAt';
  const sortOrder = String(order).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
  const offset = (page - 1) * limit;
  const where = { userId: user.id };
  if (status) where.status = status;

  const { rows, count } = await Dataset.findAndCountAll({
    where,
    limit,
    offset,
    order: [[sortField, sortOrder]],
  });

  return {
    items: rows.map(publicDataset),
    pagination: {
      page,
      limit,
      total: count,
      total_pages: Math.ceil(count / limit) || 1,
    },
  };
}

async function getDataset(datasetId, user) {
  const dataset = await getOwnedDataset(datasetId, user);
  return publicDataset(dataset);
}

async function getLatestVersion(dataset) {
  const version = await DatasetVersion.findOne({
    where: { datasetId: dataset.id, versionNumber: dataset.latestVersionNumber },
  });
  return version;
}

async function getQualityReport(datasetId, user) {
  const dataset = await getOwnedDataset(datasetId, user);
  const version = await getLatestVersion(dataset);
  if (!version) {
    throw new AppError('No quality report is available yet', 404, 'REPORT_NOT_FOUND');
  }

  const issues = await QualityIssue.findAll({
    where: { datasetId: dataset.id, versionId: version.id },
    order: [['id', 'ASC']],
  });

  const summary = {
    rows: dataset.rowCount,
    columns: dataset.columnCount,
    missing_cells: issues
      .filter((i) => i.issueType === 'MISSING_VALUES')
      .reduce((sum, i) => sum + i.issueCount, 0),
    duplicate_rows: issues
      .filter((i) => i.issueType === 'DUPLICATES' && !i.columnName)
      .reduce((sum, i) => sum + i.issueCount, 0),
    outlier_values: issues
      .filter((i) => i.issueType === 'OUTLIER')
      .reduce((sum, i) => sum + i.issueCount, 0),
  };

  return {
    dataset_id: dataset.id,
    version_number: version.versionNumber,
    quality_score: dataset.qualityScore,
    summary,
    issues: issues.map((issue) => ({
      type: issue.issueType,
      severity: issue.severity,
      column: issue.columnName,
      count: issue.issueCount,
      description: issue.description,
    })),
  };
}

async function getIssues(datasetId, user, filters = {}) {
  const dataset = await getOwnedDataset(datasetId, user);
  const version = await getLatestVersion(dataset);
  if (!version) return [];

  const where = { datasetId: dataset.id, versionId: version.id };
  if (filters.severity) where.severity = filters.severity;
  if (filters.issue_type) where.issueType = filters.issue_type;
  if (filters.column) where.columnName = filters.column;

  const issues = await QualityIssue.findAll({ where, order: [['id', 'ASC']] });
  return issues.map((issue) => ({
    id: issue.id,
    type: issue.issueType,
    severity: issue.severity,
    column: issue.columnName,
    count: issue.issueCount,
    description: issue.description,
    created_at: issue.createdAt,
  }));
}

async function getColumns(datasetId, user) {
  const dataset = await getOwnedDataset(datasetId, user);
  const version = await getLatestVersion(dataset);
  if (!version) return [];

  const columns = await DatasetColumn.findAll({
    where: { datasetId: dataset.id, versionId: version.id },
    order: [['id', 'ASC']],
  });

  return columns.map((col) => ({
    column_name: col.columnName,
    detected_type: col.detectedType,
    null_count: col.nullCount,
    unique_count: col.uniqueCount,
    duplicate_count: col.duplicateCount,
    min_value: col.minValue,
    max_value: col.maxValue,
    mean_value: col.meanValue,
    median_value: col.medianValue,
  }));
}

async function deleteDataset(datasetId, user) {
  const dataset = await getOwnedDataset(datasetId, user);
  const versions = await DatasetVersion.findAll({ where: { datasetId: dataset.id } });
  const paths = new Set([dataset.filePath, ...versions.map((v) => v.filePath)]);

  await sequelize.transaction(async (transaction) => {
    await QualityIssue.destroy({ where: { datasetId: dataset.id }, transaction });
    await DatasetColumn.destroy({ where: { datasetId: dataset.id }, transaction });
    await DatasetVersion.destroy({ where: { datasetId: dataset.id }, transaction });
    await dataset.destroy({ transaction });
  });

  await Promise.all(
    [...paths].map(async (filePath) => {
      if (!filePath) return;
      try {
        await fs.unlink(filePath);
      } catch (err) {
        if (err.code !== 'ENOENT') {
          // File cleanup is best-effort after the DB records are gone.
        }
      }
    })
  );
}

async function listVersions(datasetId, user) {
  const dataset = await getOwnedDataset(datasetId, user);
  const versions = await DatasetVersion.findAll({
    where: { datasetId: dataset.id },
    order: [['versionNumber', 'ASC']],
  });

  return versions.map((version) => ({
    version_number: version.versionNumber,
    row_count: version.rowCount,
    column_count: version.columnCount,
    quality_score: version.qualityScore,
    original_filename: version.originalFilename,
    uploaded_at: version.uploadedAt,
  }));
}

async function getVersion(datasetId, versionNumber, user) {
  const dataset = await getOwnedDataset(datasetId, user);
  const version = await DatasetVersion.findOne({
    where: { datasetId: dataset.id, versionNumber },
  });
  if (!version) {
    throw new AppError('Version not found', 404, 'VERSION_NOT_FOUND');
  }

  const issues = await QualityIssue.findAll({
    where: { datasetId: dataset.id, versionId: version.id },
    order: [['id', 'ASC']],
  });

  return {
    dataset_id: dataset.id,
    version_number: version.versionNumber,
    row_count: version.rowCount,
    column_count: version.columnCount,
    quality_score: version.qualityScore,
    original_filename: version.originalFilename,
    uploaded_at: version.uploadedAt,
    issues: issues.map((issue) => ({
      type: issue.issueType,
      severity: issue.severity,
      column: issue.columnName,
      count: issue.issueCount,
      description: issue.description,
    })),
  };
}

function issueKey(issue) {
  return `${issue.issueType}::${issue.columnName || ''}`;
}

async function compareVersions(datasetId, version1, version2, user) {
  const dataset = await getOwnedDataset(datasetId, user);
  const v1 = await DatasetVersion.findOne({
    where: { datasetId: dataset.id, versionNumber: version1 },
  });
  const v2 = await DatasetVersion.findOne({
    where: { datasetId: dataset.id, versionNumber: version2 },
  });

  if (!v1 || !v2) {
    throw new AppError('One or both versions were not found', 404, 'VERSION_NOT_FOUND');
  }

  const [issues1, issues2] = await Promise.all([
    QualityIssue.findAll({ where: { versionId: v1.id } }),
    QualityIssue.findAll({ where: { versionId: v2.id } }),
  ]);

  const map1 = new Map(issues1.map((i) => [issueKey(i), i]));
  const map2 = new Map(issues2.map((i) => [issueKey(i), i]));

  let resolved = 0;
  let created = 0;
  const improvedColumns = new Set();
  const worsenedColumns = new Set();

  for (const [key, issue] of map1.entries()) {
    if (!map2.has(key)) {
      resolved += 1;
      if (issue.columnName) improvedColumns.add(issue.columnName);
    } else if (map2.get(key).issueCount < issue.issueCount && issue.columnName) {
      improvedColumns.add(issue.columnName);
    }
  }

  for (const [key, issue] of map2.entries()) {
    if (!map1.has(key)) {
      created += 1;
      if (issue.columnName) worsenedColumns.add(issue.columnName);
    } else if (map2.get(key).issueCount > map1.get(key).issueCount && issue.columnName) {
      worsenedColumns.add(issue.columnName);
    }
  }

  const scoreDelta = (v2.qualityScore ?? 0) - (v1.qualityScore ?? 0);
  const qualityChange = scoreDelta > 0 ? `+${scoreDelta}` : String(scoreDelta);

  return {
    dataset_id: dataset.id,
    version1: version1,
    version2: version2,
    quality_change: qualityChange,
    quality_score: {
      from: v1.qualityScore,
      to: v2.qualityScore,
    },
    row_count_change: (v2.rowCount ?? 0) - (v1.rowCount ?? 0),
    column_count_change: (v2.columnCount ?? 0) - (v1.columnCount ?? 0),
    resolved_issues: resolved,
    new_issues: created,
    improved_columns: improvedColumns.size,
    worsened_columns: worsenedColumns.size,
  };
}

async function adminListDatasets({ page = 1, limit = 10, status }) {
  const where = {};
  if (status) where.status = status;
  const offset = (page - 1) * limit;
  const { rows, count } = await Dataset.findAndCountAll({
    where,
    limit,
    offset,
    order: [['createdAt', 'DESC']],
  });

  return {
    items: rows.map(publicDataset),
    pagination: {
      page,
      limit,
      total: count,
      total_pages: Math.ceil(count / limit) || 1,
    },
  };
}

async function adminStatistics() {
  const { User } = require('../models');
  const totalUsers = await User.count();
  const totalDatasets = await Dataset.count();
  const completed = await Dataset.count({ where: { status: DATASET_STATUS.COMPLETED } });
  const failed = await Dataset.count({ where: { status: DATASET_STATUS.FAILED } });
  const avgScore = await Dataset.findOne({
    attributes: [[sequelize.fn('AVG', sequelize.col('quality_score')), 'avgScore']],
    where: { status: DATASET_STATUS.COMPLETED, qualityScore: { [Op.ne]: null } },
    raw: true,
  });

  return {
    total_users: totalUsers,
    total_datasets: totalDatasets,
    completed_analyses: completed,
    failed_analyses: failed,
    average_quality_score: avgScore && avgScore.avgScore !== null
      ? Number(Number(avgScore.avgScore).toFixed(2))
      : null,
  };
}

module.exports = {
  publicDataset,
  getOwnedDataset,
  createDataset,
  addDatasetVersion,
  listDatasets,
  getDataset,
  getQualityReport,
  getIssues,
  getColumns,
  deleteDataset,
  listVersions,
  getVersion,
  compareVersions,
  adminListDatasets,
  adminStatistics,
};
