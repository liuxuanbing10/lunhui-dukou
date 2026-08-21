/**
 * AuthService：账号注册/登录（密码散列 + 校验）
 * --------------------------------------------------
 * 对齐 DESKTOP_MIGRATION.md Phase 1 第 1 项：玩家表 + JWT 登录（轻量方案）。
 * 密码安全：node:crypto 内置 scrypt（内存安全、无额外原生依赖）+ 随机盐 + timingSafeEqual。
 * 使用异步 scrypt + 显式算法参数(N,r,p)，避免同步算法阻塞事件循环，且不受 Node 默认参数漂移影响。
 * JWT 签名/验签由 @fastify/jwt 在路由层完成（本模块只负责凭据校验）。
 */
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from 'node:crypto';
import type { Database } from 'better-sqlite3';
import { createPlayer, getPlayerByUsername } from '../db/repository.js';
import { AppError } from '../utils/app-error.js';

export const MIN_PASSWORD_LENGTH = 6;

/** 显式固化的 scrypt 参数（与 Node 默认一致，写死防止未来默认值变动影响存量散列） */
const SCRYPT_PARAMS = { N: 16384, r: 8, p: 1 } as const;
const SCRYPT_KEYLEN = 64;

/** 异步版 scrypt（promise 封装，不占用事件循环） */
function scryptAsync(
  password: string,
  salt: string,
  keylen: number,
  options: { N: number; r: number; p: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCb(password, salt, keylen, options, (err, derived) => {
      if (err) reject(err);
      else resolve(derived as Buffer);
    });
  });
}

/** 生成 `salt:hash` 形式的密码散列 */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex');
  const hash = (await scryptAsync(password, salt, SCRYPT_KEYLEN, SCRYPT_PARAMS)).toString('hex');
  return `${salt}:${hash}`;
}

/** 校验明文密码是否匹配存储的散列（用 timingSafeEqual 防时序攻击） */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const idx = stored.indexOf(':');
  if (idx <= 0) return false;
  const salt = stored.slice(0, idx);
  const hash = stored.slice(idx + 1);
  const candidate = await scryptAsync(password, salt, SCRYPT_KEYLEN, SCRYPT_PARAMS);
  const expected = Buffer.from(hash, 'hex');
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

/** 注册：校验 + 写入，返回新玩家 id */
export async function registerPlayer(
  db: Database,
  username: string,
  password: string,
): Promise<number> {
  if (!username || /^\s*$/.test(username)) {
    throw new AppError('USERNAME_INVALID');
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new AppError('WEAK_PASSWORD');
  }
  if (getPlayerByUsername(db, username)) {
    throw new AppError('USERNAME_TAKEN');
  }
  return createPlayer(db, username, await hashPassword(password));
}

/** 登录：校验凭据，成功返回玩家信息，失败返回 undefined */
export async function authenticatePlayer(
  db: Database,
  username: string,
  password: string,
): Promise<{ id: number; username: string } | undefined> {
  const row = getPlayerByUsername(db, username);
  if (!row || !(await verifyPassword(password, row.password_hash))) return undefined;
  return { id: row.id, username: row.username };
}