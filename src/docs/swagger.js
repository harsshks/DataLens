const swaggerJsdoc = require('swagger-jsdoc');

const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Dataset Quality Monitoring API',
      version: '1.0.0',
      description:
        'Upload CSV datasets, run Pandas-based quality analysis, and inspect versioned quality reports.',
    },
    servers: [{ url: '/', description: 'Current server' }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string', example: 'INVALID_FILE' },
                message: { type: 'string', example: 'Only CSV files are supported' },
              },
            },
          },
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
});

module.exports = swaggerSpec;
