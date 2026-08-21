import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { rateLimit, resetRateLimits } from './rate-limiter.js';

beforeEach(resetRateLimits);
afterEach(() => vi.restoreAllMocks());

describe('rate-limiter', () => {
  it('窗口内未超限 → 放行', () => {
    expect(rateLimit('k', 3, 1000)).toBe(true);
    expect(rateLimit('k', 3, 1000)).toBe(true);
    expect(rateLimit('k', 3, 1000)).toBe(true);
  });

  it('超过窗口上限 → 拒绝', () => {
    rateLimit('k', 2, 1000);
    rateLimit('k', 2, 1000);
    expect(rateLimit('k', 2, 1000)).toBe(false);
  });

  it('窗口滑动后放行恢复（超窗的戳被裁剪）', () => {
    const now = Date.now();
    vi.spyOn(Date, 'now').mockReturnValue(now);
    expect(rateLimit('k', 1, 1000)).toBe(true);
    expect(rateLimit('k', 1, 1000)).toBe(false);
    // 时间推进到窗口外
    vi.spyOn(Date, 'now').mockReturnValue(now + 1500);
    expect(rateLimit('k', 1, 1000)).toBe(true);
  });

  it('key 互相隔离', () => {
    rateLimit('a', 1, 1000);
    expect(rateLimit('a', 1, 1000)).toBe(false);
    expect(rateLimit('b', 1, 1000)).toBe(true);
  });
});