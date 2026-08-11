/**
 * 小镇可行走区域（Walkable Mask）——基于 docs/village-map.md 平面图定义。
 * 玩家 WASD 移动前检测目标点；非法（水面/建筑/支流）则阻止，禁止穿模。
 */

export interface Rect {
  x: number;
  z: number;
  w: number; // 半宽（x 方向 ±）
  d: number; // 半深（z 方向 ±）
}

/** 可行走矩形列表（道路/广场/桥面/栈桥） */
export const WALKABLE_RECTS: Rect[] = [
  // 南沿河街（z=2.6 主干道）
  { x: 0, z: 2.6, w: 11, d: 0.8 },
  // 北沿河街（z=-2.6）
  { x: 0, z: -2.6, w: 11, d: 0.8 },
  // 渡口码头广场
  { x: 0, z: 3.0, w: 3.0, d: 1.5 },
  // 南巷 1/2/3（垂直巷，连接河街与建筑区）
  { x: -5.5, z: 4.0, w: 0.55, d: 2.0 },
  { x: -1.0, z: 4.0, w: 0.55, d: 2.0 },
  { x: 4.5, z: 4.0, w: 0.55, d: 2.0 },
  // 北巷 1/2/3
  { x: -5.5, z: -4.0, w: 0.55, d: 2.0 },
  { x: 1.0, z: -4.0, w: 0.55, d: 2.0 },
  { x: 4.5, z: -4.0, w: 0.55, d: 2.0 },
  // 西桥（石拱桥跨河）
  { x: -5.5, z: 0, w: 0.9, d: 2.2 },
  // 东桥（平桥跨河）
  { x: 5.5, z: 0, w: 0.9, d: 2.2 },
  // 栈桥（广场伸入河道）
  { x: 0, z: 0.3, w: 1.0, d: 1.3 },
];

/** 世界边界（小镇范围） */
export const BOUNDS = { minX: -11.5, maxX: 11.5, minZ: -6.5, maxZ: 6.5 };

/** 目标点是否可行走（含边界） */
export function isWalkable(x: number, z: number): boolean {
  if (x < BOUNDS.minX || x > BOUNDS.maxX || z < BOUNDS.minZ || z > BOUNDS.maxZ) {
    return false;
  }
  for (const r of WALKABLE_RECTS) {
    if (Math.abs(x - r.x) <= r.w && Math.abs(z - r.z) <= r.d) {
      return true;
    }
  }
  return false;
}

/** 移动校正：尝试 x/z 分别移动，贴边滑动（至少一个轴可行走则移动该轴） */
export function resolveMove(
  from: { x: number; z: number },
  dx: number,
  dz: number,
): { x: number; z: number } {
  const nx = from.x + dx;
  const nz = from.z + dz;
  const ox = isWalkable(nx, from.z) ? nx : from.x;
  const oz = isWalkable(from.x, nz) ? nz : from.z;
  // 对角线同时合法则走对角线；否则退回单轴
  if (isWalkable(nx, nz)) return { x: nx, z: nz };
  return { x: ox, z: oz };
}
