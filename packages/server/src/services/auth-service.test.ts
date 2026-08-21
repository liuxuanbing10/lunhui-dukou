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
  it('密码散列：可验证、同密码不同盐碰撞不同', () => {
    const h1 = hashPassword('secret123');
    const h2 = hashPassword('secret123');
    expect(h1).not.toBe(h2);
    expect(verifyPassword('secret123', h1)).toBe(true);
    expect(verifyPassword('wrong', h1)).toBe(false);
  });

  it('注册成功 → 可用 authenticatePlayer 登录', () => {
    const id = registerPlayer(db, 'alice', 'secret123');
    expect(id).toBeGreaterThan(0);
    const player = authenticatePlayer(db, 'alice', 'secret123');
    expect(player?.id).toBe(id);
    expect(authenticatePlayer(db, 'alice', 'wrong')).toBeUndefined();
  });

  it('注册：用户名太弱 → USERNAME_INVALID', () => {
    expect(() => registerPlayer(db, '  ', 'secret123')).toThrowError(/^USERNAME_INVALID$/);
  });

  it('注册：密码过短 → WEAK_PASSWORD', () => {
    expect(() => registerPlayer(db, 'bob', '123')).toThrowError(/^WEAK_PASSWORD$/);
  });

  it('注册：用户名重复 → USERNAME_TAKEN（AppError）', () => {
    registerPlayer(db, 'carol', 'secret123');
    try {
      registerPlayer(db, 'carol', 'secret123');
      throw new Error('should throw');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect((err as AppError).code).toBe('USERNAME_TAKEN');
    }
  });
});