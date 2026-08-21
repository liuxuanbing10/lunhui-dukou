/**
 * 极简内存滑动窗口限流器
 * --------------------------------------------------
 * 用途（DESKTOP_MIGRATION.md Phase 1 第 3 项）：按玩家/IP 限制 /api/ask 与 LLM 调用，
 * 防止单个玩家刷爆额度或拖垮 LLM provider。
 * 说明：进程内 Map 保存各 key 的请求时间戳数组；窗口滑动裁剪，无需定时器。
 *       多实例部署时不共享状态（当前单实例 + SQLite 阶段够用，见 ARCHITECTURE.md 演进触发）。
 *       每 key 只保留窗口内的戳，超窗自动清理，不会无限增长。
 */

const buckets = new Map<string, number[]>();

/**
 * 判定 key 在窗口内是否仍允许通过。
 * @returns true=放行；false=超限，应拒绝。
 */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const kept = (buckets.get(key) ?? []).filter((t) => t > now - windowMs);
  if (kept.length >= limit) {
    buckets.set(key, kept);
    return false;
  }
  kept.push(now);
  buckets.set(key, kept);
  return true;
}

/** 测试辅助：清空全部限流计数 */
export function resetRateLimits(): void {
  buckets.clear();
}