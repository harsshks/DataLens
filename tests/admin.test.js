const path = require('path');
const request = require('supertest');
const createApp = require('../src/app');
const { User, Dataset } = require('../src/models');
const analysisService = require('../src/services/analysisService');

jest.mock('../src/services/analysisService');

const app = createApp();
const dirtyCsv = path.join(__dirname, '../docs/sample-dataset.csv');

function analysisFixture() {
  return {
    row_count: 10,
    column_count: 3,
    summary: { missing_cells: 2, duplicate_rows: 1, outlier_values: 0 },
    columns: [
      {
        column_name: 'age',
        detected_type: 'integer',
        null_count: 0,
        unique_count: 10,
        duplicate_count: 0,
        min_value: 20,
        max_value: 60,
        mean_value: 35,
        median_value: 34,
      },
    ],
    issues: [
      {
        issue_type: 'MISSING_VALUES',
        severity: 'LOW',
        column_name: 'name',
        issue_count: 2,
        description: '2 values missing',
      },
    ],
  };
}

async function registerAdmin() {
  // Create admin user directly via authService so we bypass needing env vars
  const bcrypt = require('bcryptjs');
  const { ROLES } = require('../src/config/constants');
  const passwordHash = await bcrypt.hash('adminpass123', 10);
  const admin = await User.create({
    name: 'Admin',
    email: 'admin@test.com',
    passwordHash,
    role: ROLES.ADMIN,
  });
  const jwt = require('jsonwebtoken');
  const config = require('../src/config');
  const token = jwt.sign({ id: admin.id, role: admin.role }, config.jwt.secret, {
    expiresIn: '1h',
  });
  return { admin, token };
}

async function registerUser(email) {
  const res = await request(app).post('/api/auth/register').send({
    name: 'User',
    email,
    password: 'password123',
  });
  return res.body.data.token;
}

describe('admin routes', () => {
  beforeEach(async () => {
    await Dataset.destroy({ where: {} });
    await User.destroy({ where: {} });
    analysisService.runPythonAnalysis.mockReset();
    analysisService.runPythonAnalysis.mockResolvedValue(analysisFixture());
  });

  test('blocks non-admin from admin statistics', async () => {
    const token = await registerUser('user@test.com');
    const res = await request(app)
      .get('/api/admin/statistics')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  test('blocks unauthenticated from admin routes', async () => {
    const res = await request(app).get('/api/admin/statistics');
    expect(res.status).toBe(401);
  });

  test('admin can get statistics', async () => {
    const { token } = await registerAdmin();
    const userToken = await registerUser('user@test.com');

    await request(app)
      .post('/api/datasets')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('file', dirtyCsv);

    const res = await request(app)
      .get('/api/admin/statistics')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.total_users).toBeGreaterThanOrEqual(1);
    expect(res.body.data.total_datasets).toBeGreaterThanOrEqual(1);
    expect(res.body.data.completed_analyses).toBeGreaterThanOrEqual(1);
    expect(typeof res.body.data.failed_analyses).toBe('number');
  });

  test('admin can list all datasets', async () => {
    const { token: adminToken } = await registerAdmin();
    const userToken = await registerUser('user@test.com');

    await request(app)
      .post('/api/datasets')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('file', dirtyCsv);

    const res = await request(app)
      .get('/api/admin/datasets')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBeGreaterThanOrEqual(1);
    expect(res.body.data.pagination).toBeDefined();
  });

  test('admin can filter datasets by status', async () => {
    const { token: adminToken } = await registerAdmin();
    const userToken = await registerUser('user@test.com');

    await request(app)
      .post('/api/datasets')
      .set('Authorization', `Bearer ${userToken}`)
      .attach('file', dirtyCsv);

    const res = await request(app)
      .get('/api/admin/datasets?status=COMPLETED')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    res.body.data.items.forEach((d) => {
      expect(d.status).toBe('COMPLETED');
    });
  });
});
