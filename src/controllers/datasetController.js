const asyncHandler = require('../utils/asyncHandler');
const datasetService = require('../services/datasetService');

const create = asyncHandler(async (req, res) => {
  const dataset = await datasetService.createDataset({
    user: req.user,
    file: req.file,
    name: req.body.name,
  });
  res.status(201).json({ success: true, data: dataset });
});

const list = asyncHandler(async (req, res) => {
  const page = Number.parseInt(req.query.page, 10) || 1;
  const limit = Number.parseInt(req.query.limit, 10) || 10;
  const result = await datasetService.listDatasets({
    user: req.user,
    page,
    limit,
    status: req.query.status,
    sort: req.query.sort,
    order: req.query.order,
  });
  res.status(200).json({ success: true, data: result });
});

const getById = asyncHandler(async (req, res) => {
  const dataset = await datasetService.getDataset(Number(req.params.id), req.user);
  res.status(200).json({ success: true, data: dataset });
});

const quality = asyncHandler(async (req, res) => {
  const report = await datasetService.getQualityReport(Number(req.params.id), req.user);
  res.status(200).json({ success: true, data: report });
});

const issues = asyncHandler(async (req, res) => {
  const result = await datasetService.getIssues(Number(req.params.id), req.user, {
    severity: req.query.severity,
    issue_type: req.query.issue_type,
    column: req.query.column,
  });
  res.status(200).json({ success: true, data: result });
});

const columns = asyncHandler(async (req, res) => {
  const result = await datasetService.getColumns(Number(req.params.id), req.user);
  res.status(200).json({ success: true, data: result });
});

const remove = asyncHandler(async (req, res) => {
  await datasetService.deleteDataset(Number(req.params.id), req.user);
  res.status(200).json({ success: true, data: { deleted: true } });
});

const addVersion = asyncHandler(async (req, res) => {
  const result = await datasetService.addDatasetVersion({
    user: req.user,
    datasetId: Number(req.params.id),
    file: req.file,
  });
  res.status(201).json({ success: true, data: result });
});

const listVersions = asyncHandler(async (req, res) => {
  const result = await datasetService.listVersions(Number(req.params.id), req.user);
  res.status(200).json({ success: true, data: result });
});

const getVersion = asyncHandler(async (req, res) => {
  const result = await datasetService.getVersion(
    Number(req.params.id),
    Number(req.params.version),
    req.user
  );
  res.status(200).json({ success: true, data: result });
});

const compare = asyncHandler(async (req, res) => {
  const result = await datasetService.compareVersions(
    Number(req.params.id),
    Number(req.params.version1),
    Number(req.params.version2),
    req.user
  );
  res.status(200).json({ success: true, data: result });
});

module.exports = {
  create,
  list,
  getById,
  quality,
  issues,
  columns,
  remove,
  addVersion,
  listVersions,
  getVersion,
  compare,
};
