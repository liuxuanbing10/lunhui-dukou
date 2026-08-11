/**
 * 角色立绘素材表（透明底 PNG，来自 AI 生图 → 抠图管线）
 * 当前只有 r1 蓑衣人（2026-08-11 首版方向稿）；后续角色生成后按同结构追加。
 */
import r1Body from './assets/portraits/r1/body.png';
import r1FaceHit from './assets/portraits/r1/face_hit.png';
import r1FacePressed from './assets/portraits/r1/face_pressed.png';
import r1FaceRelief from './assets/portraits/r1/face_relief.png';

export type PortraitVariant = 'body' | 'face_hit' | 'face_pressed' | 'face_relief';

const PORTRAITS: Record<string, Partial<Record<PortraitVariant, string>>> = {
  r1: {
    body: r1Body,
    face_hit: r1FaceHit,
    face_pressed: r1FacePressed,
    face_relief: r1FaceRelief,
  },
};

/** 取居民立绘素材；未接入的角色返回 undefined（组件自动不渲染） */
export function portraitSrc(
  residentId: string,
  variant: PortraitVariant,
): string | undefined {
  const table = PORTRAITS[residentId];
  if (!table) return undefined;
  return table[variant] ?? table.body;
}
