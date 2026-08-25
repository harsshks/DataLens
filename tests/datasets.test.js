const path = require('path');
const request = require('supertest');
const createApp = require('../src/app');
const { User, Dataset } = require('../src/models');
const analysisService = require('../src/services/analysisService');

jest.mock('../src/services/analysisService');

const app = createApp();
const dirtyCsv = path.join(__dirname, '../docs/sample-dataset.csv');
const cleanCsv = path.join(__dirname, '../docs/sample-dataset-v2.csv');
const fakeTxt = path.join(__dirname, '../docs/schema.sql');

function analysisFixture(overrides = {}) {
  return {
    row_count: 10,
    column_count: 7,
    summary: {
      missing_cells: 12,
      duplicate_rows: 1,
      outlier_values: 1,
    },
    columns: [
      {
        column_name: 'age',
        detected_type: 'integer',
        null_count: 1,
        unique_count: 9,
        duplicate_count: 0,
        min_value: 25,
        max_value: 1200,
        mean_value: 150,
        median_value: 34,
      },
    ],
    issues: [
      {
        issue_type: 'MISSING_VALUES',
        severity: 'MEDIUM',
        column_name: 'age',
        issue_count: 1,
        description: '1 values are missing in age',
      },
      {
        issue_type: 'DUPLICATES',
        severity: 'LOW',
        column_name: null,
        issue_count: 1,
        description: '1 duplicate rows',
      },
      {
        issue_type: 'OUTLIER',
        severity: 'LOW',
        column_name: 'age',
        issue_count: 1,
        description: '1 IQR outliers in age',
      },
    ],
    ...overrides,
  };
}

async function register(email) {
  const res = await request(app).post('/api/auth/register').send({
    name: 'Tester',
    email,
    password: 'password123',
  });
  return res.body.data.token;
}

describe('datasets', () => {
  beforeEach(async () => {
    await Dataset.destroy({ where: {} });
    await User.destroy({ where: {} });
    analysisService.runPythonAnalysis.mockReset();
    analysisService.runPythonAnalysis.mockResolvedValue(analysisFixture());
  });

  test('uploads a valid CSV and returns a quality score', async () => {
    const token = await register('owner@example.com');
    const res = await request(app)
      .post('/api/datasets')
      .set('Authorization', `Bearer ${token}`)
      .field('name', 'city-income')
      .attach('file', dirtyCsv);

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('COMPLETED');
    expect(res.body.data.quality_score).toEqual(expect.any(Number));
    expect(res.body.data.row_count).toBe(10);
  });

  test('rejects a non-CSV file', async () => {
    const token = await register('owner@example.com');
    const res = await request(app)
      .post('/api/datasets')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', fakeTxt);

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_FILE');
  });

  test('retrieves a dataset owned by the user', async () => {
    const token = await register('owner@example.com');
    const created = await request(app)
      .post('/api/datasets')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', dirtyCsv);

    const res = await request(app)
      .get(`/api/datasets/${created.body.data.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(created.body.data.id);
  });

  test('blocks unauthorized dataset access', async () => {
    const ownerToken = await register('owner@example.com');
    const otherToken = await register('other@example.com');
    const created = await request(app)
      .post('/api/datasets')
      .set('Authorization', `Bearer ${ownerToken}`)
      .attach('file', dirtyCsv);

    const res = await request(app)
      .get(`/api/datasets/${created.body.data.id}`)
      .set('Authorization', `Bearer ${otherToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  test('returns quality issues for an uploaded dataset', async () => {
    const token = await register('owner@example.com');
    const created = await request(app)
      .post('/api/datasets')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', dirtyCsv);

    const res = await request(app)
      .get(`/api/datasets/${created.body.data.id}/quality`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.issues.length).toBeGreaterThan(0);
    expect(res.body.data.summary.duplicate_rows).toBe(1);
  });

  test('deletes a dataset', async () => {
    const token = await register('owner@example.com');
    const created = await request(app)
      .post('/api/datasets')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', dirtyCsv);

    const deleted = await request(app)
      .delete(`/api/datasets/${created.body.data.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(deleted.status).toBe(200);

    const res = await request(app)
      .get(`/api/datasets/${created.body.data.id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  test('creates a second version and compares quality', async () => {
    const token = await register('owner@example.com');
    const created = await request(app)
      .post('/api/datasets')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', dirtyCsv);

    analysisService.runPythonAnalysis.mockResolvedValue(
      analysisFixture({
        row_count: 8,
        summary: { missing_cells: 0, duplicate_rows: 0, outlier_values: 0 },
        issues: [],
      })
    );

    const versioned = await request(app)
      .post(`/api/datasets/${created.body.data.id}/versions`)
      .set('Authorization', `Bearer ${token}`)
      .attach('file', cleanCsv);

    expect(versioned.status).toBe(201);
    expect(versioned.body.data.version.version_number).toBe(2);

    const compared = await request(app)
      .get(`/api/datasets/${created.body.data.id}/compare/1/2`)
      .set('Authorization', `Bearer ${token}`);

    expect(compared.status).toBe(200);
    expect(compared.body.data.resolved_issues).toBeGreaterThan(0);
    expect(compared.body.data.quality_change.startsWith('+')).toBe(true);
  });

  test('returns column statistics for an uploaded dataset', async () => {
    const token = await register('owner@example.com');
    const created = await request(app)
      .post('/api/datasets')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', dirtyCsv);

    const res = await request(app)
      .get(`/api/datasets/${created.body.data.id}/columns`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toHaveProperty('column_name');
    expect(res.body.data[0]).toHaveProperty('detected_type');
  });

  test('filters issues by severity', async () => {
    const token = await register('owner@example.com');
    const created = await request(app)
      .post('/api/datasets')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', dirtyCsv);

    const res = await request(app)
      .get(`/api/datasets/${created.body.data.id}/issues?severity=MEDIUM`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    res.body.data.forEach((issue) => {
      expect(issue.severity).toBe('MEDIUM');
    });
  });

  test('filters issues by issue_type', async () => {
    const token = await register('owner@example.com');
    const created = await request(app)
      .post('/api/datasets')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', dirtyCsv);

    const res = await request(app)
      .get(`/api/datasets/${created.body.data.id}/issues?issue_type=MISSING_VALUES`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    res.body.data.forEach((issue) => {
      expect(issue.type).toBe('MISSING_VALUES');
    });
  });

  test('lists versions of a dataset', async () => {
    const token = await register('owner@example.com');
    const created = await request(app)
      .post('/api/datasets')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', dirtyCsv);

    const res = await request(app)
      .get(`/api/datasets/${created.body.data.id}/versions`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].version_number).toBe(1);
  });

  test('gets a specific version by number', async () => {
    const token = await register('owner@example.com');
    const created = await request(app)
      .post('/api/datasets')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', dirtyCsv);

    const res = await request(app)
      .get(`/api/datasets/${created.body.data.id}/versions/1`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.version_number).toBe(1);
    expect(res.body.data.dataset_id).toBe(created.body.data.id);
    expect(Array.isArray(res.body.data.issues)).toBe(true);
  });

  test('returns 404 for a non-existent version', async () => {
    const token = await register('owner@example.com');
    const created = await request(app)
      .post('/api/datasets')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', dirtyCsv);

    const res = await request(app)
      .get(`/api/datasets/${created.body.data.id}/versions/99`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('VERSION_NOT_FOUND');
  });

  test('paginates dataset list', async () => {
    const token = await register('owner@example.com');
    await request(app)
      .post('/api/datasets')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', dirtyCsv);
    await request(app)
      .post('/api/datasets')
      .set('Authorization', `Bearer ${token}`)
      .attach('file', dirtyCsv);

    const res = await request(app)
      .get('/api/datasets?page=1&limit=1')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.items.length).toBe(1);
    expect(res.body.data.pagination.total).toBe(2);
    expect(res.body.data.pagination.total_pages).toBe(2);
  });

  test('returns 404 for a non-existent dataset', async () => {
    const token = await register('owner@example.com');
    const res = await request(app)
      .get('/api/datasets/999999')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('DATASET_NOT_FOUND');
  });

  test('rejects missing file on upload', async () => {
    const token = await register('owner@example.com');
    const res = await request(app)
      .post('/api/datasets')
      .set('Authorization', `Bearer ${token}`)
      .field('name', 'no-file');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('FILE_REQUIRED');
  });
});
