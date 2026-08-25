const { initDatabase, sequelize } = require('../src/models');

beforeAll(async () => {
  await initDatabase();
});

afterAll(async () => {
  await sequelize.close();
});
