const config = require('./config');
const createApp = require('./app');
const { initDatabase } = require('./models');
const { ensureAdminUser } = require('./services/authService');

async function start() {
  await initDatabase();
  await ensureAdminUser();

  const app = createApp();
  app.listen(config.port, () => {
    console.log(`API listening on http://localhost:${config.port}`);
    console.log(`Swagger UI: http://localhost:${config.port}/api/docs`);
  });
}

start().catch((err) => {
  console.error('Failed to start server', err);
  process.exit(1);
});
