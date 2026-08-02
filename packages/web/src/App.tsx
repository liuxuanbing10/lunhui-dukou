import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type LoopResponse, type AskResponse } from './api';
import { RESIDENTS, residentName } from './residents';
import './styles.css';

type Phase = 'boot' | 'intro' | 'asking' | 'choice' | 'death' | 'memory';

/** 打字机效果 Hook */
function useTypewriter(text: string, speed = 40, active = true): string {
  const [shown, setShown] = useState('');
  useEffect(() => {
    if (!active) {
      setShown(text);
      return;
    }
    setShown('');
    let i = 0;
    const timer = setInterval(() => {
      i += 1;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(timer);
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed, active]);
  return shown;
}

/** 雨滴数组（静态生成一次） */
const RAIN_DROPS = Array.from({ length: 48 }, (_, i) => ({
  left: `${(i * 2.08 + 7) % 100}%`,
  delay: `${(i * 0.37) % 2.8}s`,
  duration: `${0.7 + ((i * 0.13) % 1.1)}s`,
}));

function Rain() {
  return (
    <div className="rain-scene" aria-hidden>
      <div className="horizon" />
      {RAIN_DROPS.map((d, i) => (
        <div
          key={i}
          className="rain-drop"
          style={{ left: d.left, animationDelay: d.delay, animationDuration: d.duration }}
        />
      ))}
    </div>
  );
}

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
  const inputRef = useRef<HTMLInputElement>(null);

  const typewriter = useTypewriter(dialogText, 35, phase === 'intro' || phase === 'asking');

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
    try {
      const res: AskResponse = await api.ask(loop.loopId, selected, question.trim());
      setDialogSpeaker(residentName(selected));
      setDialogText(res.answer);
      setQuestionsLeft(res.questionsLeft);
      setQuestion('');
      // 命中关键 → 进入选择分支
      if (res.hitFactId && res.pause) {
        setPhase('choice');
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
        setDeathLine(
          choice === 'leave' ? '你又上船了。第七次了。' : '你留下来，也留不住。你本来就属于水里。',
        );
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

  const showTypewriter = phase === 'intro' || phase === 'asking' || phase === 'memory';

  return (
    <>
      <Rain />
      <div className="stage">
        <h1 className="title">轮回渡口</h1>
        <div className="subtitle">LUNHUI DUKOU</div>

        <div className="dialog">
          {dialogSpeaker && <div className="dialog-speaker">—— {dialogSpeaker}</div>}
          <div className="dialog-text">
            {showTypewriter ? typewriter : dialogText}
            {showTypewriter && typewriter.length < dialogText.length && <span className="cursor" />}
          </div>

          {phase === 'intro' && (
            <>
              <div className="resident-bar">
                {loop?.activeResidents.map((id) => (
                  <button
                    key={id}
                    className={`resident-chip${selected === id ? ' selected' : ''}`}
                    onClick={() => setSelected(id)}
                  >
                    {RESIDENTS[id]?.emoji ?? ''} {RESIDENTS[id]?.name ?? id}
                  </button>
                ))}
              </div>
              <div className="ask-area">
                <input
                  ref={inputRef}
                  className="ask-input"
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAsk()}
                  placeholder="向居民提问…（是/否 类问题最有效）"
                  autoFocus
                />
                <button className="ask-btn" onClick={handleAsk} disabled={busy || !question.trim()}>
                  问
                </button>
              </div>
              <div className="questions-left">本轮回剩余问题：{questionsLeft} / 10</div>
            </>
          )}

          {phase === 'choice' && (
            <>
              <div className="questions-left" style={{ color: 'var(--danger)', marginTop: 16 }}>
                水涨了。渡口的船要靠岸。蓑衣人站在河边，看着你。
              </div>
              <div className="choice-area">
                <button className="choice-btn" onClick={() => handleChoice('leave')}>
                  上船——我想离开这个镇子
                </button>
                <button className="choice-btn danger" onClick={() => handleChoice('stay')}>
                  留下——我得先弄清我是谁
                </button>
              </div>
            </>
          )}

          {phase === 'memory' && memoryLines.length > 0 && (
            <div className="memory-area">
              <b>你记得：</b>
              <br />
              {memoryLines.map((m, i) => (
                <div key={i}>{m}</div>
              ))}
            </div>
          )}
        </div>
      </div>

      {phase === 'death' && (
        <div className="loop-flash">
          <h2>轮回</h2>
          <p>{consequence}</p>
          <p style={{ marginTop: 12, color: 'var(--danger)' }}>{deathLine}</p>
          <button className="primary-btn" onClick={handleNextLoop} disabled={busy}>
            从水里醒来
          </button>
        </div>
      )}
    </>
  );
}
