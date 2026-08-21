import { describe, it, expect, beforeEach } from 'vitest';
import { subscribeToPlayer, publishEvent, clearBroker } from './broker.js';
import type { EventRow } from '../db/types.js';

beforeEach(clearBroker);

function makeEvent(id: number, content: string): EventRow {
  return {
    id,
    player_id: 1,
    loop_id: 1,
    type: 'ambient',
    content,
    is_clue: 0,
    is_trap: 0,
  };
}

describe('broker', () => {
  it('发布 → 订阅方可收到', () => {
    const received: EventRow[] = [];
    subscribeToPlayer(1, (ev) => received.push(ev));
    publishEvent(1, makeEvent(1, '雨声很大'));
    expect(received).toHaveLength(1);
    expect(received[0]?.content).toBe('雨声很大');
  });

  it('按玩家隔离：B 订阅不到 A 的事件', () => {
    const bReceived: EventRow[] = [];
    subscribeToPlayer(2, (ev) => bReceived.push(ev));
    publishEvent(1, makeEvent(1, '只给 A 的事件'));
    expect(bReceived).toHaveLength(0);
  });

  it('取消订阅后不再收到', () => {
    const received: EventRow[] = [];
    const unsub = subscribeToPlayer(1, (ev) => received.push(ev));
    unsub();
    publishEvent(1, makeEvent(1, '取消后的事件'));
    expect(received).toHaveLength(0);
  });

  it('单个订阅回调异常不影响发布', () => {
    subscribeToPlayer(1, () => {
      throw new Error('handler boom');
    });
    expect(() => publishEvent(1, makeEvent(1, 'x'))).not.toThrow();
  });
});