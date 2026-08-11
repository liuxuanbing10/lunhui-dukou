/**
 * 角色立绘素材表（透明底 WebP，来自 AI 生图 → 抠图管线）
 * r1 蓑衣人（首版方向稿，四层齐）；r2-r8 body（2026-08-11 Qwen-image 3.0 生成，表情层待产）。
 */
import r1Body from './assets/portraits/r1/body.webp';
import r1FaceHit from './assets/portraits/r1/face_hit.webp';
import r1FacePressed from './assets/portraits/r1/face_pressed.webp';
import r1FaceRelief from './assets/portraits/r1/face_relief.webp';
import r2Body from './assets/portraits/r2/body.webp';
import r3Body from './assets/portraits/r3/body.webp';
import r4Body from './assets/portraits/r4/body.webp';
import r5Body from './assets/portraits/r5/body.webp';
import r6Body from './assets/portraits/r6/body.webp';
import r7Body from './assets/portraits/r7/body.webp';
import r8Body from './assets/portraits/r8/body.webp';

export type PortraitVariant = 'body' | 'face_hit' | 'face_pressed' | 'face_relief';

const PORTRAITS: Record<string, Partial<Record<PortraitVariant, string>>> = {
  r1: {
    body: r1Body,
    face_hit: r1FaceHit,
    face_pressed: r1FacePressed,
    face_relief: r1FaceRelief,
  },
  r2: { body: r2Body },
  r3: { body: r3Body },
  r4: { body: r4Body },
  r5: { body: r5Body },
  r6: { body: r6Body },
  r7: { body: r7Body },
  r8: { body: r8Body },
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
