const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const config = require('./config');
const apiRoutes = require('./routes');
const swaggerSpec = require('./docs/swagger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { ensureUploadDir } = require('./middleware/upload');

function createApp() {
  ensureUploadDir();

  const app = express();

  app.use(
    helmet({
      contentSecurityPolicy: false,
    })
  );
  app.use(cors({ origin: config.corsOrigin }));
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.get('/', (req, res) => {
    res.status(200).json({
      success: true,
      data: {
        name: 'Dataset Quality Monitoring API',
        docs: '/api/docs',
        health: '/api/health',
      },
    });
  });

  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.use('/api', apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = createApp;
