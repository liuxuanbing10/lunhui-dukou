/**
 * 居民展示元数据（立绘资产到位后扩展为图片路径）
 */
export interface ResidentMeta {
  id: string;
  name: string;
  role: string;
  emoji: string;
}

export const RESIDENTS: Record<string, ResidentMeta> = {
  r1: { id: 'r1', name: '蓑衣人', role: '无固定营生，常在渡口', emoji: '🌧️' },
  r2: { id: 'r2', name: '阿岚', role: '花店老板娘', emoji: '🌸' },
  r3: { id: 'r3', name: '老王', role: '面馆老板', emoji: '🍜' },
  r4: { id: 'r4', name: '阿黎', role: '纸人铺学徒', emoji: '🪁' },
  r5: { id: 'r5', name: '何叔', role: '钟楼修表匠', emoji: '🕰️' },
  r6: { id: 'r6', name: '老鲞', role: '码头渔夫', emoji: '⛵' },
  r7: { id: 'r7', name: '郑爷', role: '巡夜人', emoji: '🏮' },
  r8: { id: 'r8', name: '小满', role: '来历不明的孩子', emoji: '🧒' },
};

export function residentName(id: string): string {
  return RESIDENTS[id]?.name ?? id;
}
