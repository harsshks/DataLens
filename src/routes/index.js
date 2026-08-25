const express = require('express');
const authRoutes = require('./authRoutes');
const datasetRoutes = require('./datasetRoutes');
const adminRoutes = require('./adminRoutes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/datasets', datasetRoutes);
router.use('/admin', adminRoutes);

router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'ok',
      service: 'dataset-quality-monitoring-api',
    },
  });
});

module.exports = router;
