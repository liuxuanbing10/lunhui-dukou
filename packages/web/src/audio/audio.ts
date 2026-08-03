/**
 * 轮回渡口 · Web Audio 引擎模块
 *
 * 纯 TypeScript，仅依赖浏览器原生 Web Audio API，不引入任何 npm 依赖。
 * 音频方向：雨夜渡口 / 轮回 / 悬疑 / 记忆。
 * 核心留白「汤主沉默三秒」通过 `setSilence(true)` 把雨声渐弱至近乎静默、
 * 暖光 pad 保留并稍压暗来音频化（详见 docs/audio-design.md）。
 *
 * 自动播放策略：AudioContext 在首次 `start()` 时才惰性创建，且 MUST 由
 * 用户手势（点击「开始」）触发。测试环境（jsdom）无 AudioContext，所有
 * 方法均降级为 no-op，绝不抛错。
 */

export interface AudioEngine {
  /** 由用户手势触发：惰性创建 AudioContext 并启动环境音床。 */
  start(): void;
  /** 暂停：淡出主总线并挂起 AudioContext。 */
  stop(): void;
  /** 激活/解除「沉默三秒」留白：雨声渐弱、暖光 pad 保留并稍压暗。 */
  setSilence(active: boolean): void;
  /** 命中关键真相：一声克制的水波 / 钟鸣泛音（短促）。 */
  playReveal(): void;
  /** 玩家被否决 / 偏离真相：低沉的否定音。 */
  playReject(): void;
  /** 主静音开关（区别于沉默留白，是硬切总线）。 */
  setMuted(m: boolean): void;
  /** 关停所有节点并 close() AudioContext。 */
  dispose(): void;
}

// ---- 增益与时序常量（程序化生成，无外部音频文件） -------------------------
const MASTER_BASE = 0.85; // 主总线基准增益（未静音时）

// 雨声床：白噪声 -> 低通 -> 增益（含缓慢 LFO 起伏）
const RAIN_BASE = 0.16; // 常态雨声增益
const RAIN_LP = 1800; // 低通截止（柔化白噪声为雨夜沙沙）
const RAIN_LFO_RATE = 0.07; // Hz，极慢起伏
const RAIN_LFO_DEPTH = 0.05; // 增益调制深度
const RAIN_SILENCE = 0.012; // 沉默段雨声（近乎静默）

// 汤碗暖光 pad：在场感
const WARM_BASE = 0.045; // 极轻音量
const WARM_FREQ_A = 65; // 低频正弦（sub）
const WARM_FREQ_B = 98; // 三角波（暖色泛音，约纯五度）
const WARM_SILENCE = 0.03; // 沉默段稍压暗但保留

// 沉默过渡时间系数：音频收敛时长 = silenceMs × 该系数（默认 2800×0.16≈448ms），
// 确保落进视觉 T1(0–500ms) 暖光收束窗口内同帧（对齐 art-style §5.1）。
const SILENCE_TC_FACTOR = 0.16;
const DEFAULT_SILENCE_MS = 2800;

// 命中真相：克制钟鸣
const REVEAL_F = 523.25; // C5 基频
const REVEAL_GAIN = 0.22;
const REVEAL_DUR = 1.6;

// 被否决：低沉否定音
const REJECT_F_START = 140;
const REJECT_F_END = 70;
const REJECT_GAIN = 0.3;
const REJECT_DUR = 0.5;

type AudioCtor = typeof AudioContext;

/** 安全获取 AudioContext 构造器；测试 / SSR 环境下返回 undefined。 */
function getAudioContextCtor(): AudioCtor | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as {
    AudioContext?: AudioCtor;
    webkitAudioContext?: AudioCtor;
  };
  return w.AudioContext ?? w.webkitAudioContext;
}

/** 生成 2 秒循环白噪声缓冲，供雨声使用。 */
function createNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const length = Math.floor(ctx.sampleRate * 2);
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

/** 安全停止一个可调度源（已停止则忽略）。 */
function safeStop(node: AudioScheduledSourceNode | null): void {
  try {
    node?.stop();
  } catch {
    /* 已停止或尚未启动，忽略 */
  }
}

/** 安全断开一个 AudioNode。 */
function safeDisconnect(node: AudioNode | null): void {
  try {
    node?.disconnect();
  } catch {
    /* 忽略 */
  }
}

/** 在 dur 秒内将增益线性平滑到 target（落点精确、无爆音）。 */
function rampGainTo(param: AudioParam, target: number, t: number, dur: number): void {
  param.cancelScheduledValues(t);
  param.setValueAtTime(param.value, t);
  param.linearRampToValueAtTime(target, t + dur);
}

class WebAudioEngine implements AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;

  private rainSource: AudioBufferSourceNode | null = null;
  private rainFilter: BiquadFilterNode | null = null;
  private rainGain: GainNode | null = null;
  private rainLFO: OscillatorNode | null = null;

  private warmGain: GainNode | null = null;
  private warmOscs: OscillatorNode[] = [];

  private muted = false;
  private silenceTransitionMs = DEFAULT_SILENCE_MS * SILENCE_TC_FACTOR;
  private started = false;
  private disposed = false;

  constructor(opts?: { muted?: boolean; silenceMs?: number }) {
    this.muted = opts?.muted ?? false;
    // 过渡时长跟随 SILENCE_MS 缩放（含移动端 3000ms / 演出减速 ×1.5），确保音画同步
    this.silenceTransitionMs = (opts?.silenceMs ?? DEFAULT_SILENCE_MS) * SILENCE_TC_FACTOR;
  }

  start(): void {
    if (this.disposed) return;
    const Ctor = getAudioContextCtor();
    if (!Ctor) return; // 无 AudioContext（测试/SSR）：no-op
    if (!this.ctx) {
      try {
        this.ctx = new Ctor();
        this.buildGraph();
      } catch {
        this.ctx = null;
        return;
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    if (this.master && !this.muted) {
      const t = this.ctx.currentTime;
      this.master.gain.cancelScheduledValues(t);
      this.master.gain.setTargetAtTime(MASTER_BASE, t, 0.2);
    }
    this.started = true;
  }

  stop(): void {
    if (!this.ctx || this.disposed || !this.master) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(0, t, 0.15);
    void this.ctx.suspend();
    this.started = false;
  }

  setSilence(active: boolean): void {
    if (!this.ctx || this.disposed || !this.rainGain || !this.warmGain) return;
    const t = this.ctx.currentTime;
    const dur = this.silenceTransitionMs / 1000;
    rampGainTo(this.rainGain.gain, active ? RAIN_SILENCE : RAIN_BASE, t, dur);
    rampGainTo(this.warmGain.gain, active ? WARM_SILENCE : WARM_BASE, t, dur);
  }

  playReveal(): void {
    if (!this.ctx || this.disposed || !this.master) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;

    const out = ctx.createGain();
    out.gain.value = 0;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 4000;
    out.connect(lp);
    lp.connect(this.master);

    const partials = [
      { f: REVEAL_F, g: 0.5 },
      { f: REVEAL_F * 2.01, g: 0.22 },
      { f: REVEAL_F * 2.99, g: 0.12 },
    ];
    const oscs: OscillatorNode[] = [];
    for (const p of partials) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = p.f;
      const g = ctx.createGain();
      g.gain.value = p.g * REVEAL_GAIN;
      o.connect(g);
      g.connect(out);
      o.start(t);
      o.stop(t + REVEAL_DUR);
      oscs.push(o);
    }

    // 包络：极快起音 -> 指数式衰减，避免爆音
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(1, t + 0.01);
    out.gain.setTargetAtTime(0, t + 0.05, 0.4);

    const last = oscs[oscs.length - 1];
    if (last) {
      last.onended = () => {
        safeDisconnect(out);
        safeDisconnect(lp);
      };
    }
  }

  playReject(): void {
    if (!this.ctx || this.disposed || !this.master) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;

    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(REJECT_F_START, t);
    o.frequency.exponentialRampToValueAtTime(REJECT_F_END, t + REJECT_DUR);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(REJECT_GAIN, t + 0.02);
    g.gain.setTargetAtTime(0, t + REJECT_DUR * 0.5, 0.25);

    o.connect(g);
    g.connect(this.master);
    o.start(t);
    o.stop(t + REJECT_DUR + 0.1);
    o.onended = () => {
      safeDisconnect(g);
      safeDisconnect(o);
    };
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (!this.ctx || !this.master) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.setTargetAtTime(m ? 0 : MASTER_BASE, t, 0.1);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    try {
      if (this.ctx) {
        const t = this.ctx.currentTime;
        if (this.master) {
          this.master.gain.cancelScheduledValues(t);
          this.master.gain.setValueAtTime(0, t);
        }
        safeStop(this.rainSource);
        safeStop(this.rainLFO);
        for (const o of this.warmOscs) safeStop(o);
        for (const n of [
          this.rainSource,
          this.rainLFO,
          ...this.warmOscs,
          this.rainGain,
          this.rainFilter,
          this.warmGain,
          this.master,
        ]) {
          safeDisconnect(n);
        }
        void this.ctx.close();
      }
    } catch {
      /* 忽略关停异常 */
    }
    this.ctx = null;
    this.master = null;
    this.rainSource = null;
    this.rainFilter = null;
    this.rainGain = null;
    this.rainLFO = null;
    this.warmGain = null;
    this.warmOscs = [];
    this.started = false;
  }

  private buildGraph(): void {
    const ctx = this.ctx;
    if (!ctx) return;

    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : MASTER_BASE;
    this.master.connect(ctx.destination);

    // 雨声床：白噪声 -> 低通 -> 增益 -> 主总线
    const noise = ctx.createBufferSource();
    noise.buffer = createNoiseBuffer(ctx);
    noise.loop = true;
    this.rainFilter = ctx.createBiquadFilter();
    this.rainFilter.type = 'lowpass';
    this.rainFilter.frequency.value = RAIN_LP;
    this.rainGain = ctx.createGain();
    this.rainGain.gain.value = RAIN_BASE;
    noise.connect(this.rainFilter);
    this.rainFilter.connect(this.rainGain);
    this.rainGain.connect(this.master);

    // 缓慢 LFO 起伏（接至 rainGain.gain）
    this.rainLFO = ctx.createOscillator();
    this.rainLFO.type = 'sine';
    this.rainLFO.frequency.value = RAIN_LFO_RATE;
    const lfoDepth = ctx.createGain();
    lfoDepth.gain.value = RAIN_LFO_DEPTH;
    this.rainLFO.connect(lfoDepth);
    lfoDepth.connect(this.rainGain.gain);

    noise.start();
    this.rainLFO.start();
    this.rainSource = noise;

    // 汤碗暖光 pad：在场感（sub 正弦 + 三角泛音）
    this.warmGain = ctx.createGain();
    this.warmGain.gain.value = WARM_BASE;
    this.warmGain.connect(this.master);
    const warmA = ctx.createOscillator();
    warmA.type = 'sine';
    warmA.frequency.value = WARM_FREQ_A;
    const warmB = ctx.createOscillator();
    warmB.type = 'triangle';
    warmB.frequency.value = WARM_FREQ_B;
    warmA.connect(this.warmGain);
    warmB.connect(this.warmGain);
    warmA.start();
    warmB.start();
    this.warmOscs = [warmA, warmB];
  }
}

/**
 * 创建音频引擎实例。惰性创建 AudioContext（首次 start 时），
 * 因此本函数本身在测试 / SSR 环境下也安全、不抛错。
 *
 * @param opts.muted     主静音开关（默认 false）
 * @param opts.silenceMs 沉默三秒时长（ms），默认 2800；音频过渡 = silenceMs×0.16
 *                       自动跟随，供移动端(3000)/演出减速(×1.5→4200)透传缩放。
 */
export function createAudioEngine(opts?: { muted?: boolean; silenceMs?: number }): AudioEngine {
  return new WebAudioEngine({ muted: opts?.muted, silenceMs: opts?.silenceMs });
}
