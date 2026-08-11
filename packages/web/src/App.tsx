import { useCallback, useEffect, useRef, useState, lazy, Suspense } from 'react';
import { api, type LoopResponse, type AskResponse } from './api';
import { residentName } from './residents';
import { useTypewriter } from './hooks/useTypewriter';
import { injectThemeVars } from './visual/theme';
import { createAudioEngine, SILENCE_MS, type AudioEngine } from './audio/audio';
import { RESIDENTS } from './residents';
import { Rain } from './components/Rain';
import { AskingPhase } from './components/AskingPhase';
import { ChoicePhase } from './components/ChoicePhase';
import { DeathPhase } from './components/DeathPhase';
import { MemoryPhase } from './components/MemoryPhase';
import { DEATH_LINES } from '@lunhui/engine/death-lines';
import './styles.css';

// 视觉主题由 visual/theme 接管（App 注入 CSS 变量，RainNight 改用 theme token）；
// 音频引擎已接入（createAudioEngine({ silenceMs }) + 用户手势 start + 沉默/命中控制 + 卸载 dispose）；
// 活镇内容已接入（App 用 livingTownResidents 接管居民展示，offlineClient 用 loopEvents/memoryRevenge 驱动叙事）。
// RainNight（three/R3F 重依赖）走懒加载：WebGL chunk 不阻塞首屏交互层；
// 模式推导在 App 侧（命中关键 → silence 收束；memory 相位 → 记忆叠影；其余 idle）。
const RainNight = lazy(() => import('./scene/RainNight'));
import type { RainMode } from './scene/RainNight';

type Phase = 'boot' | 'intro' | 'choice' | 'death' | 'memory';

// SILENCE_MS 唯一真源在 audio/audio.ts（App 的 setTimeout、RainNight re-export、音频过渡均引用它）

export function App() {
  const [phase, setPhase] = useState<Phase>('boot');
  const [loop, setLoop] = useState<LoopResponse | null>(null);
  const [selected, setSelected] = useState<string>('r1');
  const [question, setQuestion] = useState('');
  const [dialogSpeaker, setDialogSpeaker] = useState('');
  const [dialogText, setDialogText] = useState('');
  const [questionsLeft, setQuestionsLeft] = useState(10);
  const [consequence, setConsequence] = useState('');
  const [deathLine, setDeathLine] = useState('');
  const [memoryLines, setMemoryLines] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  // 「沉默三秒」留白态：命中关键事实时触发，驱动 RainNight 进入 silence 收束
  const [silenceActive, setSilenceActive] = useState(false);
  // 当前居民立绘表情（命中关键 → face_hit；未命中保守回应 → face_pressed；其余 body）
  // 跑图近身：场景中距离最近的人物（< 2 单位时提示"按 F 对话"）
  const [nearResident, setNearResident] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // 音频引擎：惰性创建、用户手势内 start，卸载时 dispose（测试环境无 AudioContext，全部 no-op）
  // silenceMs 透传给底层引擎，使其过渡时长跟随 SILENCE_MS 缩放（移动端 3000 / 演出减速 ×1.5→4200）
  const audioRef = useRef<AudioEngine | null>(null);
  const ensureAudio = (): AudioEngine => {
    if (!audioRef.current) {
      audioRef.current = createAudioEngine({ silenceMs: SILENCE_MS });
      audioRef.current.start();
    }
    return audioRef.current;
  };

  // 注入视觉主题 CSS 变量（visual/theme 的 token → :root 自定义属性，幂等、测试安全）
  useEffect(() => {
    injectThemeVars();
  }, []);

  // 卸载时关停音频引擎（close AudioContext、断开节点）
  useEffect(() => {
    return () => {
      audioRef.current?.dispose();
      audioRef.current = null;
    };
  }, []);

  // F 键：近身时开始对话（跑图交互）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'f' && nearResident && phase === 'intro') {
        handleSelectResident(nearResident);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const typewriter = useTypewriter(dialogText, 35, phase === 'intro');

  // 开场：自动开始轮回
  useEffect(() => {
    void (async () => {
      try {
        const l = await api.startLoop();
        setLoop(l);
        setQuestionsLeft(l.questionsLeft);
        setDialogSpeaker('渡口');
        setDialogText(l.intro);
        setPhase('intro');
      } catch (err) {
        setDialogSpeaker('系统');
        setDialogText(`连接渡口失败：${(err as Error).message}`);
        setPhase('boot');
      }
    })();
  }, []);

  const handleAsk = useCallback(async () => {
    if (!loop || !question.trim() || busy) return;
    setBusy(true);
    // 用户手势（点击「问」）内首次惰性启动音频引擎
    const audio = ensureAudio();
    try {
      const res: AskResponse = await api.ask(loop.loopId, selected, question.trim());
      setDialogSpeaker(residentName(selected));
      setDialogText(res.answer);
      setQuestionsLeft(res.questionsLeft);
      setQuestion('');
      // 命中关键 → 进入「沉默三秒」留白（RainNight silence 收束 + 音频渐弱 + 钟鸣泛音），再落到选择分支
      if (res.hitFactId && res.pause) {
        setSilenceActive(true);
        audio.setSilence(true);
        audio.playReveal();
        window.setTimeout(() => {
          setSilenceActive(false);
          audio.setSilence(false);
          setPhase('choice');
        }, SILENCE_MS);
      } else if (res.questionsLeft <= 0) {
        setPhase('choice');
      }
      inputRef.current?.focus();
    } catch (err) {
      setDialogSpeaker('渡口');
      setDialogText(`（${(err as Error).message}）`);
    } finally {
      setBusy(false);
    }
  }, [loop, selected, question, busy]);

  const handleChoice = useCallback(
    async (choice: 'leave' | 'stay') => {
      if (!loop || busy) return;
      setBusy(true);
      try {
        const res = await api.choice(loop.loopId, choice);
        setConsequence(res.consequence);
        setDeathLine(DEATH_LINES[choice]);
        setPhase('death');
      } catch (err) {
        setDialogSpeaker('渡口');
        setDialogText(`（${(err as Error).message}）`);
      } finally {
        setBusy(false);
      }
    },
    [loop, busy],
  );

  const handleNextLoop = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const l = await api.startLoop();
      const mem = await api.memory();
      setMemoryLines(mem.memories.map((m) => m.content));
      setLoop(l);
      setQuestionsLeft(l.questionsLeft);
      setDialogSpeaker('渡口');
      setDialogText(`你又从水里醒来。这次，你记得一些东西。\n${l.intro}`);
      setPhase(mem.memories.length > 0 ? 'memory' : 'intro');
      setSelected('r1');
    } catch (err) {
      setDialogSpeaker('系统');
      setDialogText(`轮回失败：${(err as Error).message}`);
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const showTypewriter = phase === 'intro' || phase === 'memory';

  // 场景点击选人（替代居民按钮）；换人重置表情为 body
  const handleSelectResident = (id: string) => {
    setSelected(id);
  };

  // RainNight 视觉模式：由当前相位推导（命中关键 → silence 收束；memory 相位 → 记忆叠影；其余 idle）
  const rainMode: RainMode = silenceActive ? 'silence' : phase === 'memory' ? 'memory' : 'idle';

  return (
    <>
      <Suspense fallback={null}>
        <RainNight
          mode={rainMode}
          selected={selected}
          onSelectResident={handleSelectResident}
          onNearChange={setNearResident}
        />
      </Suspense>
      <Rain />
      {/* 跑图近身提示：靠近人物时显示"按 F 对话"（仅审问阶段） */}
      {phase === 'intro' && nearResident && (
        <div className="near-hint">
          {RESIDENTS[nearResident]?.name ?? nearResident} · 按 F 对话
        </div>
      )}
      <div className="stage">
        <h1 className="title">轮回渡口</h1>
        <div className="subtitle">LUNHUI DUKOU</div>

        <div className="dialog">
          {dialogSpeaker && <div className="dialog-speaker">—— {dialogSpeaker}</div>}
          <div className="dialog-text">
            {showTypewriter ? typewriter : dialogText}
            {showTypewriter && typewriter.length < dialogText.length && <span className="cursor" />}
          </div>

          {phase === 'intro' && loop && (
            <AskingPhase
              question={question}
              questionsLeft={questionsLeft}
              busy={busy}
              inputRef={inputRef}
              onQuestionChange={setQuestion}
              onAsk={handleAsk}
            />
          )}

          {phase === 'choice' && <ChoicePhase busy={busy} onChoice={handleChoice} />}

          {phase === 'memory' && (
            <MemoryPhase lines={memoryLines} onContinue={() => setPhase('intro')} />
          )}
        </div>
      </div>

      {phase === 'death' && (
        <DeathPhase
          consequence={consequence}
          deathLine={deathLine}
          busy={busy}
          onNextLoop={handleNextLoop}
        />
      )}
    </>
  );
}
