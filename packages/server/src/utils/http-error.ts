/**
 * HTTP 错误映射（统一出口）
 * --------------------------------------------------
 * 所有受保护路由/鉴权路由的错误统一走到这里：根据 code 查询 HTTP 状态码，返回
 * { code, message, http }。message 默认等于 code（稳定键）；语义文案由调用方按需覆盖。
 */
import { AppError } from './app-error.js';

const HTTP_MAP: Record<string, number> = {
  // 业务
  NO_QUESTIONS_LEFT: 403,
  LOOP_NOT_FOUND: 404,
  RESIDENT_NOT_ACTIVE: 404,
  LOOP_ENDED: 409,
  RATE_LIMITED: 429,
  // 鉴权
  UNAUTHORIZED: 401,
  INVALID_CREDENTIALS: 401,
  USERNAME_TAKEN: 409,
  USERNAME_INVALID: 400,
  WEAK_PASSWORD: 400,
};

export interface HttpErrorShape {
  code: string;
  message: string;
  http: number;
}

export function toHttpError(err: unknown): HttpErrorShape {
  const code =
    err instanceof AppError ? err.code : err instanceof Error ? err.message : 'UNKNOWN';
  return { code, message: code, http: HTTP_MAP[code] ?? 500 };
}