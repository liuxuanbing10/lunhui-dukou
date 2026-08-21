/**
 * 事件 Broker（进程内发布订阅）
 * --------------------------------------------------
 * 用途（DESKTOP_MIGRATION.md Phase 1 第 4 项）：配合 WebSocket 把"小镇日常/轮回动画"实时推给
 * 对应玩家。按 player_id 分发，B 玩家订阅不到 A 玩家的事件（隔离）。
 * 说明：内存实现，单实例够用；多实例需改外部队列（见 ARCHITECTURE.md 演进触发）。
 */
import type { EventRow } from '../db/types.js';

export type EventHandler = (event: EventRow) => void;

const listeners = new Map<number, Set<EventHandler>>();

/** 订阅某玩家的事件；返回取消订阅函数 */
export function subscribeToPlayer(playerId: number, handler: EventHandler): () => void {
  let set = listeners.get(playerId);
  if (!set) {
    set = new Set();
    listeners.set(playerId, set);
  }
  set.add(handler);
  return () => {
    set?.delete(handler);
    if (set && set.size === 0) listeners.delete(playerId);
  };
}

/** 向某玩家广播一条事件 */
export function publishEvent(playerId: number, event: EventRow): void {
  const set = listeners.get(playerId);
  if (!set) return;
  for (const handler of set) {
    try {
      handler(event);
    } catch (err) {
      // 推送给单个失效连接不应拖垮发布方
      console.error('[broker] 事件推送失败', err);
    }
  }
}

/** 测试辅助：清空全部订阅 */
export function clearBroker(): void {
  listeners.clear();
}