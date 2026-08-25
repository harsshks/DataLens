const request = require('supertest');
const createApp = require('../src/app');
const { User } = require('../src/models');

const app = createApp();

describe('authentication', () => {
  beforeEach(async () => {
    await User.destroy({ where: {} });
  });

  test('registers a new user', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Harsh',
      email: 'harsh@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.email).toBe('harsh@example.com');
    expect(res.body.data.user.passwordHash).toBeUndefined();
  });

  test('logs in with valid credentials', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Harsh',
      email: 'harsh@example.com',
      password: 'password123',
    });

    const res = await request(app).post('/api/auth/login').send({
      email: 'harsh@example.com',
      password: 'password123',
    });

    expect(res.status).toBe(200);
    expect(res.body.data.token).toBeDefined();
  });

  test('rejects invalid login', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Harsh',
      email: 'harsh@example.com',
      password: 'password123',
    });

    const res = await request(app).post('/api/auth/login').send({
      email: 'harsh@example.com',
      password: 'wrong-password',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  test('rejects unauthenticated access to protected routes', async () => {
    const res = await request(app).get('/api/datasets');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHENTICATED');
  });

  test('returns the current user with a valid token', async () => {
    const created = await request(app).post('/api/auth/register').send({
      name: 'Harsh',
      email: 'harsh@example.com',
      password: 'password123',
    });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${created.body.data.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user.email).toBe('harsh@example.com');
  });

  test('rejects duplicate email registration', async () => {
    await request(app).post('/api/auth/register').send({
      name: 'Harsh',
      email: 'harsh@example.com',
      password: 'password123',
    });

    const res = await request(app).post('/api/auth/register').send({
      name: 'Harsh2',
      email: 'harsh@example.com',
      password: 'password456',
    });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_TAKEN');
  });

  test('rejects registration with invalid email', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Harsh',
      email: 'not-an-email',
      password: 'password123',
    });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  test('rejects registration with short password', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Harsh',
      email: 'harsh@example.com',
      password: 'short',
    });
    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});
