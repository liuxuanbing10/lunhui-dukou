import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type LoopResponse, type AskResponse } from './api';
import { residentName } from './residents';
import { useTypewriter } from './hooks/useTypewriter';
import { Rain } from './components/Rain';
import { AskingPhase } from './components/AskingPhase';
import { ChoicePhase } from './components/ChoicePhase';
import { DeathPhase } from './components/DeathPhase';
import { MemoryPhase } from './components/MemoryPhase';
import './styles.css';

type Phase = 'boot' | 'intro' | 'choice' | 'death' | 'memory';

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

  const showTypewriter = phase === 'intro' || phase === 'memory';

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

          {phase === 'intro' && loop && (
            <AskingPhase
              residentIds={loop.activeResidents}
              selected={selected}
              question={question}
              questionsLeft={questionsLeft}
              busy={busy}
              inputRef={inputRef}
              onSelect={setSelected}
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
