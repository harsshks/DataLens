const request = require('supertest');
const createApp = require('../src/app');

const app = createApp();

describe('health', () => {
  test('returns ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('ok');
  });
});
