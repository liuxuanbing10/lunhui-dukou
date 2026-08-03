import { RESIDENTS } from '../residents';

interface Props {
  residentIds: string[];
  selected: string;
  question: string;
  questionsLeft: number;
  busy: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onSelect: (id: string) => void;
  onQuestionChange: (q: string) => void;
  onAsk: () => void;
}

/** 开场/审问阶段：居民选择 chips + 提问区 */
export function AskingPhase({
  residentIds,
  selected,
  question,
  questionsLeft,
  busy,
  inputRef,
  onSelect,
  onQuestionChange,
  onAsk,
}: Props) {
  return (
    <>
      <div className="resident-bar">
        {residentIds.map((id) => (
          <button
            key={id}
            className={`resident-chip${selected === id ? ' selected' : ''}`}
            onClick={() => onSelect(id)}
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
          onChange={(e) => onQuestionChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAsk()}
          placeholder="向居民提问…（是/否 类问题最有效）"
          autoFocus
        />
        <button className="ask-btn" onClick={onAsk} disabled={busy || !question.trim()}>
          问
        </button>
      </div>
      <div className="questions-left">本轮回剩余问题：{questionsLeft} / 10</div>
    </>
  );
}
