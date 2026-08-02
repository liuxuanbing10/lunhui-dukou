import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENGINE_NAME } from './index.js';

test('engine module loads', () => {
  assert.equal(ENGINE_NAME, 'lunhui-engine');
});
