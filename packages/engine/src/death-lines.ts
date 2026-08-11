/**
 * 跨端共享文案常量（server / web / offlineClient 同一真源，禁止手抄漂移）
 */

/** 轮回终局后果文案（关键选择 leave/stay 后展示） */
export const DEATH_LINES: Record<'leave' | 'stay', string> = {
  leave: '船在河心沉没。你从水里又醒来——第七次了。',
  stay: '你留下来，也留不住。你本来就属于水里。',
};
