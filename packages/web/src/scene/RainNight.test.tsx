import { describe, it, expect, vi, beforeAll } from 'vitest';
import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { RainNight } from './RainNight';

// jsdom 无 WebGL：mock 掉 R3F 与 postprocessing，仅验证组件可渲染、Canvas 存在。
// 不测 WebGL 实际绘制（见 task S4 / S5 说明）。
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children }: { children?: ReactNode }) => <div data-testid="r3f-canvas">{children}</div>,
  useFrame: () => {},
  useThree: () => ({ camera: { position: { x: 0, y: 0, z: 0 }, lookAt: () => {} } }),
}));

vi.mock('@react-three/postprocessing', () => ({
  EffectComposer: ({ children }: { children?: ReactNode }) => <div data-testid="r3f-post">{children}</div>,
  Bloom: () => null,
  Vignette: () => null,
  Noise: () => null,
}));

// 屏蔽 jsdom 下「R3F 内联元素被当成未知 DOM 标签」的噪音（mock Canvas 时的预期现象，非错误）：
// 1) 未知 DOM 标签 / 大小写告警；2) R3F 专属 prop 被当成 DOM 属性告警
const originalConsoleError = console.error;
beforeAll(() => {
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    const msg = String(args[0] ?? '');
    const isR3fNoise =
      msg.includes('is using incorrect casing') ||
      msg.includes('is unrecognized in this browser') ||
      msg.includes('does not recognize the') ||
      msg.includes('non-boolean attribute');
    if (isR3fNoise) return;
    // 保留其它真实错误（调用 spy 前的原始实现，避免递归）
    originalConsoleError(...args);
  });
});

describe('RainNight 场景渲染（不测 WebGL 实际绘制）', () => {
  it('idle 模式：渲染 Canvas 且不抛错', () => {
    const { getByTestId } = render(<RainNight mode="idle" />);
    expect(getByTestId('r3f-canvas')).toBeTruthy();
  });

  it('memory 模式：同样可渲染（记忆叠影层挂载）', () => {
    const { getByTestId } = render(<RainNight mode="memory" />);
    expect(getByTestId('r3f-canvas')).toBeTruthy();
  });

  it('silence 模式：同样可渲染', () => {
    const { getByTestId } = render(<RainNight mode="silence" />);
    expect(getByTestId('r3f-canvas')).toBeTruthy();
  });
});
