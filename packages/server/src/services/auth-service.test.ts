import { describe, it, expect, beforeEach } from 'vitest';
import type Database from 'better-sqlite3';
import { initDb, closeDb } from '../db/index.js';
import { seedResidents } from '../db/seed.js';
import {
  hashPassword,
  verifyPassword,
  registerPlayer,
  authenticatePlayer,
} from './auth-service.js';
import { AppError } from '../utils/app-error.js';

let db: Database.Database;

beforeEach(() => {
  closeDb();
  db = initDb(':memory:');
  seedResidents(db);
});

describe('auth-service', () => {
  it('密码散列：可验证、同密码不同盐碰撞不同', async () => {
    const h1 = await hashPassword('secret123');
    const h2 = await hashPassword('secret123');
    expect(h1).not.toBe(h2);
    await expect(verifyPassword('secret123', h1)).resolves.toBe(true);
    await expect(verifyPassword('wrong', h1)).resolves.toBe(false);
  });

  it('注册成功 → 可用 authenticatePlayer 登录', async () => {
    const id = await registerPlayer(db, 'alice', 'secret123');
    expect(id).toBeGreaterThan(0);
    const player = await authenticatePlayer(db, 'alice', 'secret123');
    expect(player?.id).toBe(id);
    await expect(authenticatePlayer(db, 'alice', 'wrong')).resolves.toBeUndefined();
  });

  it('注册：用户名太弱 → USERNAME_INVALID', async () => {
    await expect(registerPlayer(db, '  ', 'secret123')).rejects.toMatchObject({
      code: 'USERNAME_INVALID',
    });
  });

  it('注册：密码过短 → WEAK_PASSWORD', async () => {
    await expect(registerPlayer(db, 'bob', '123')).rejects.toMatchObject({
      code: 'WEAK_PASSWORD',
    });
  });

  it('注册：用户名重复 → USERNAME_TAKEN（AppError）', async () => {
    await registerPlayer(db, 'carol', 'secret123');
    await expect(registerPlayer(db, 'carol', 'secret123')).rejects.toBeInstanceOf(AppError);
    await expect(registerPlayer(db, 'carol', 'secret123')).rejects.toMatchObject({
      code: 'USERNAME_TAKEN',
    });
  });
});