/**
 * 轮回渡口 · 2.5D 视觉 token 模块（纯 TS，不依赖 React）
 *
 * 色值来源：docs/art-style-standard-2.5d.md（§3 色彩与光影规范）
 * 当前所有 hex 为**占位值**，均标注「待美术微调」，
 * 上线前由美术总监在 2–3 套候选中拍板定稿。
 *
 * 导出：
 *  - `theme`：常量色彩/光影 token 对象
 *  - `injectThemeVars(root?)`：把 token 写入 CSS 自定义属性（幂等）
 *  - `Theme`：theme 的类型
 */

/** 雨夜冷蓝基底（环境光，低强度、大面积） */
export const theme = {
  rain: {
    base: '#0b1a2b', // 雨夜最深背景 —— 待美术微调
    mist: '#16324a', // 中景雾蓝 —— 待美术微调
    drop: '#9fc4e8', // 雨丝高光 —— 待美术微调
    fog: '#0a1422', // 远景雾 —— 待美术微调
  },
  /** 汤碗单一暖光（叙事核心光源） */
  warm: {
    soul: '#ffb15c', // 暖光核心 —— 待美术微调
    glow: '#ffd9a0', // 暖光晕染 —— 待美术微调
    ember: '#ff8a3d', // 暖光余烬点睛 —— 待美术微调
  },
  /** 文本与墨色 */
  ink: {
    primary: '#e8eef5', // 主文本（暗底高对比） —— 待美术微调
    dim: '#8aa0b4', // 次文本 —— 待美术微调
    faint: '#4a5b6e', // 极弱文本/分隔 —— 待美术微调
  },
  /** 记忆碎片光（琥珀/锈红自发微光，仅回响段出现） */
  memory: {
    amber: '#d8a24a', // 琥珀碎片 —— 待美术微调
    rust: '#a8532f', // 锈红碎片 —— 待美术微调
    ghost: '#c9b08a', // 叠影残光 —— 待美术微调
  },
  /** 界面面板/边框/状态色 */
  ui: {
    panel: 'rgba(10,20,34,0.72)', // 面板半透明底 —— 待美术微调
    border: 'rgba(159,196,232,0.18)', // 描边 —— 待美术微调
    danger: '#c0473b', // 警示/危险抉择 —— 待美术微调
    good: '#5fcf80', // 正向/安全 —— 待美术微调
    accent: '#58a6ff', // UI 强调色（按钮/高亮/光标/链接）—— 待美术微调
  },
  /** 沉默三秒时暖光收束后的暗调 */
  silence: {
    warmDim: '#7a4a1f', // 暖光收束暗调 —— 待美术微调
  },
} as const;

/** theme 的类型推导 */
export type Theme = typeof theme;

/**
 * 把 theme 中的色值写入 CSS 自定义属性（`:root` 或指定根节点）。
 * 命名规则：`--c-{group}-{key}`（连字符），例如 `--c-rain-base`、`--c-warm-soul`、`--c-memory-amber`。
 * 幂等：重复调用安全，后写覆盖前写，不累积重复属性。
 *
 * @param root 目标根节点，默认 `document.documentElement`。无 `document` 时直接返回（SSR/测试安全）。
 */
export function injectThemeVars(root?: HTMLElement): void {
  const el: HTMLElement | null =
    root ?? (typeof document !== 'undefined' ? document.documentElement : null);
  if (!el) return;

  const pairs: Array<[string, string]> = [];
  for (const group of Object.keys(theme) as Array<keyof Theme>) {
    const section = theme[group];
    for (const key of Object.keys(section) as Array<keyof (typeof theme)[typeof group]>) {
      const value = section[key];
      pairs.push([`--c-${group}-${key}`, value]);
    }
  }

  for (const [prop, value] of pairs) {
    el.style.setProperty(prop, value);
  }
}
