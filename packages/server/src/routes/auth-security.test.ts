/**
 * 鉴权安全测试：IP 限流 + JWT 篡改/过期
 * --------------------------------------------------
 * 覆盖此前缺口：登录/注册的 429 限流、JWT 被篡改签名、JWT 已过期。
 * 独立文件：vitest 每文件独立模块注册表，rate-limiter 内存桶互不干扰。
 * 过期 token 用 app.jwt.sign 显式短有效期（不动用注册路由，避免污染 register 限流桶）。
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from '../app.js';
import type { FastifyInstance } from 'fastify';

// 小的 IP 限流阈值，便于在单测内触发 429
process.env.DB_PATH = ':memory:';
process.env.RATE_LIMIT_LOGIN_MAX = '3';
process.env.RATE_LIMIT_LOGIN_WINDOW_MS = '60000';
process.env.RATE_LIMIT_ASK_MAX = '1000';

let app: FastifyInstance;

beforeAll(async () => {
  app = buildApp();
  await app.ready();
});

afterAll(async () => {
  await app.close();
});

describe('鉴权限流', () => {
  it('登录：同 IP 超过阈值后返回 429 RATE_LIMITED', async () => {
    let last = 0;
    for (let i = 0; i < 4; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: { username: `x${i}`, password: 'wrong-pass' },
      });
      last = res.statusCode;
    }
    expect(last).toBe(429);
  });

  it('注册：同 IP 超过阈值后返回 429 RATE_LIMITED', async () => {
    let last = 0;
    for (let i = 0; i < 4; i++) {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: { username: `big_${i}`, password: 'secret123' },
      });
      last = res.statusCode;
    }
    expect(last).toBe(429);
  });
});

describe('JWT 篡改 / 过期', () => {
  it('签名被篡改的 token → 受保护路由返回 401', async () => {
    const token = app.jwt.sign({ sub: '999', username: 'x' });
    const tampered = token.slice(0, -3) + 'abc'; // 破坏签名
    const res = await app.inject({
      method: 'POST',
      url: '/api/loop',
      headers: { authorization: `Bearer ${tampered}` },
      payload: {},
    });
    expect(res.statusCode).toBe(401);
  });

  it('已过期的 token → 受保护路由返回 401', async () => {
    // 签发 1 秒有效期，等其过期后再访问
    const token = app.jwt.sign({ sub: '1', username: 'x' }, { expiresIn: 1 });
    await new Promise((r) => setTimeout(r, 1200));
    const res = await app.inject({
      method: 'POST',
      url: '/api/loop',
      headers: { authorization: `Bearer ${token}` },
      payload: {},
    });
    expect(res.statusCode).toBe(401);
  });

  it('伪造的纯文本 token → 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/loop',
      headers: { authorization: 'Bearer not-a-real-token' },
      payload: {},
    });
    expect(res.statusCode).toBe(401);
  });
});