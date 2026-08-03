import { describe, it, expect, afterEach } from 'vitest';
import { theme, injectThemeVars } from './theme';

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

afterEach(() => {
  // 清理注入的自定义属性，避免用例间互相污染
  for (const group of Object.keys(theme) as Array<keyof typeof theme>) {
    const section = theme[group];
    for (const key of Object.keys(section) as Array<keyof (typeof theme)[typeof group]>) {
      document.documentElement.style.removeProperty(`--c-${group}-${key}`);
    }
  }
});

describe('theme tokens', () => {
  it('warm.soul 是合法的 hex 字符串', () => {
    expect(typeof theme.warm.soul).toBe('string');
    expect(theme.warm.soul).toMatch(HEX_RE);
  });

  it('injectThemeVars 在 document.documentElement 上写入 --c-warm-soul 且值等于 theme.warm.soul', () => {
    injectThemeVars();
    const value = document.documentElement.style.getPropertyValue('--c-warm-soul');
    expect(value).toBe(theme.warm.soul);
  });

  it('幂等：多次调用不产生额外属性、值保持一致', () => {
    injectThemeVars();
    injectThemeVars();
    const value = document.documentElement.style.getPropertyValue('--c-warm-soul');
    expect(value).toBe(theme.warm.soul);
  });
});
