import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from './app.js';

test('GET /api/health returns ok', async () => {
  const app = buildApp();
  const res = await app.inject({ method: 'GET', url: '/api/health' });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.json(), { status: 'ok', service: 'lunhui-dukou' });
  await app.close();
});
