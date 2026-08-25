const asyncHandler = require('../utils/asyncHandler');
const datasetService = require('../services/datasetService');

const statistics = asyncHandler(async (req, res) => {
  const result = await datasetService.adminStatistics();
  res.status(200).json({ success: true, data: result });
});

const datasets = asyncHandler(async (req, res) => {
  const page = Number.parseInt(req.query.page, 10) || 1;
  const limit = Number.parseInt(req.query.limit, 10) || 10;
  const result = await datasetService.adminListDatasets({
    page,
    limit,
    status: req.query.status,
  });
  res.status(200).json({ success: true, data: result });
});

module.exports = {
  statistics,
  datasets,
};
