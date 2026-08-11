/**
 * 阶段 1 材质写实化：Canvas 程序化 PBR 纹理（对照 docs/references/R2-R4）。
 * 白墙斑驳 / 黛瓦瓦楞 / 湿石板青苔 / 湿木纹——雨夜湿润高光。
 */
import * as THREE from 'three';

function canvas(size: [number, number]): [HTMLCanvasElement, CanvasRenderingContext2D | null] {
  const c = document.createElement('canvas');
  c.width = size[0];
  c.height = size[1];
  // jsdom 无 canvas 2d 上下文（返回 null）；真实浏览器正常
  return [c, c.getContext('2d')];
}

/** 噪声填充（随机亮度斑块，模拟材质风化） */
function noiseFill(
  ctx: CanvasRenderingContext2D | null,
  w: number,
  h: number,
  base: [number, number, number],
  variance: number,
  seed = 0,
) {
  if (!ctx) return;
  const img = ctx.createImageData(w, h);
  let s = seed;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
  for (let i = 0; i < img.data.length; i += 4) {
    const n = (rand() - 0.5) * variance;
    img.data[i] = Math.max(0, Math.min(255, base[0] + n));
    img.data[i + 1] = Math.max(0, Math.min(255, base[1] + n));
    img.data[i + 2] = Math.max(0, Math.min(255, base[2] + n));
    img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}

/** R2 白墙：灰白基底 + 竖雨渍 + 底部青苔潮痕 + 剥落斑 */
export function wallTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas([512, 512]);
  noiseFill(ctx, 512, 512, [168, 176, 182], 22, 7);
  if (!ctx) return new THREE.CanvasTexture(c);
  // 竖雨渍（水痕向下拉）
  for (let i = 0; i < 26; i++) {
    const x = Math.random() * 512;
    const w = 6 + Math.random() * 22;
    const len = 120 + Math.random() * 380;
    ctx.fillStyle = `rgba(92, 104, 116, ${0.10 + Math.random() * 0.16})`;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + w * 0.2, len * 0.5, x - w * 0.2, len * 0.75, x + (Math.random() - 0.5) * 8, len);
    ctx.lineWidth = w;
    ctx.strokeStyle = ctx.fillStyle;
    ctx.stroke();
  }
  // 底部青苔潮痕（深绿灰）
  const moss = ctx.createLinearGradient(0, 420, 0, 512);
  moss.addColorStop(0, 'rgba(70, 96, 74, 0)');
  moss.addColorStop(1, 'rgba(58, 84, 64, 0.55)');
  ctx.fillStyle = moss;
  ctx.fillRect(0, 420, 512, 92);
  // 青苔斑点
  for (let i = 0; i < 90; i++) {
    ctx.fillStyle = `rgba(${52 + Math.random() * 40}, ${78 + Math.random() * 34}, ${58 + Math.random() * 26}, ${0.2 + Math.random() * 0.3})`;
    ctx.beginPath();
    ctx.ellipse(Math.random() * 512, 380 + Math.random() * 132, 3 + Math.random() * 12, 2 + Math.random() * 8, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  // 墙皮剥落（亮斑）
  for (let i = 0; i < 14; i++) {
    ctx.fillStyle = `rgba(196, 202, 208, ${0.25 + Math.random() * 0.3})`;
    ctx.beginPath();
    ctx.ellipse(Math.random() * 512, Math.random() * 460, 8 + Math.random() * 26, 6 + Math.random() * 18, Math.random() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, 1);
  return t;
}

/** R2 黛瓦：深色基底 + 瓦脊线 + 浸润高光 */
export function roofTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas([512, 256]);
  noiseFill(ctx, 512, 256, [34, 40, 46], 12, 21);
  if (!ctx) return new THREE.CanvasTexture(c);
  // 瓦楞横条（每 40px 一脊）
  for (let y = 0; y < 256; y += 40) {
    const g = ctx.createLinearGradient(0, y, 0, y + 40);
    g.addColorStop(0, 'rgba(96, 108, 118, 0.5)'); // 脊顶高光
    g.addColorStop(0.25, 'rgba(30, 36, 42, 0)');
    g.addColorStop(0.85, 'rgba(16, 20, 26, 0.6)'); // 瓦沟暗
    g.addColorStop(1, 'rgba(96, 108, 118, 0.35)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y, 512, 40);
  }
  // 瓦片错缝（竖线随机）
  ctx.strokeStyle = 'rgba(20, 24, 30, 0.5)';
  ctx.lineWidth = 1;
  for (let x = 0; x < 512; x += 64) {
    const off = Math.random() * 20;
    for (let y = 0; y < 256; y += 20) {
      ctx.beginPath();
      ctx.moveTo(x + (y % 80 === 0 ? off : 0), y);
      ctx.lineTo(x + (y % 80 === 0 ? off : 0) + (Math.random() - 0.5) * 6, y + 18);
      ctx.stroke();
    }
  }
  // 浸润高光（随机亮条）
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(110, 122, 132, ${0.05 + Math.random() * 0.12})`;
    ctx.fillRect(Math.random() * 512, Math.random() * 256, 10 + Math.random() * 40, 2 + Math.random() * 6);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 1);
  return t;
}

/** R3 湿石板：石块 + 缝 + 青苔 + 湿反光 */
export function stoneTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas([1024, 512]);
  noiseFill(ctx, 1024, 512, [62, 70, 78], 16, 33);
  if (!ctx) return new THREE.CanvasTexture(c);
  // 不规则石块网格（青石缝）
  ctx.strokeStyle = 'rgba(26, 32, 40, 0.9)';
  ctx.lineWidth = 3;
  let seed = 11;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let gx = 0; gx < 1024; gx += 128) {
    for (let gy = 0; gy < 512; gy += 128) {
      const ox = (rand() - 0.5) * 26;
      const oy = (rand() - 0.5) * 20;
      ctx.strokeRect(gx + ox, gy + oy, 128 + rand() * 30, 128 + rand() * 24);
      // 缝内青苔
      ctx.fillStyle = `rgba(52, 74, 58, ${0.2 + rand() * 0.25})`;
      ctx.fillRect(gx + ox - 2, gy + oy - 2, 128 + rand() * 30, 4 + rand() * 3);
    }
  }
  // 石块磨损（随机亮暗块）
  for (let i = 0; i < 200; i++) {
    ctx.fillStyle = `rgba(${60 + Math.random() * 40}, ${68 + Math.random() * 36}, ${76 + Math.random() * 32}, ${0.06 + Math.random() * 0.1})`;
    ctx.fillRect(Math.random() * 1024, Math.random() * 512, 20 + Math.random() * 60, 10 + Math.random() * 40);
  }
  // 湿镜面高光（灯影拉长）
  for (let i = 0; i < 16; i++) {
    const gx = Math.random() * 1024;
    const gy = Math.random() * 512;
    const g = ctx.createLinearGradient(gx, gy, gx + 40 + Math.random() * 80, gy);
    g.addColorStop(0, `rgba(255, 190, 120, ${0.05 + Math.random() * 0.12})`);
    g.addColorStop(1, 'rgba(255, 190, 120, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(gx, gy, 40 + Math.random() * 80, 2 + Math.random() * 6);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(2, 2);
  return t;
}

/** R2 湿木：深棕木纹 + 湿润高光 */
export function woodTexture(): THREE.CanvasTexture {
  const [c, ctx] = canvas([256, 512]);
  noiseFill(ctx, 256, 512, [66, 52, 40], 10, 55);
  if (!ctx) return new THREE.CanvasTexture(c);
  // 竖木纹
  for (let x = 0; x < 256; x += 4) {
    ctx.fillStyle = `rgba(${30 + Math.random() * 30}, ${22 + Math.random() * 22}, ${16 + Math.random() * 16}, ${0.3 + Math.random() * 0.4})`;
    ctx.fillRect(x, 0, 2 + Math.random() * 3, 512);
  }
  // 湿高光竖条
  for (let i = 0; i < 30; i++) {
    const gx = Math.random() * 256;
    ctx.fillStyle = `rgba(150, 130, 100, ${0.04 + Math.random() * 0.09})`;
    ctx.fillRect(gx, 0, 2 + Math.random() * 4, 512);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, 1);
  return t;
}
