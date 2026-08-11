interface Props {
  question: string;
  questionsLeft: number;
  busy: boolean;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onQuestionChange: (q: string) => void;
  onAsk: () => void;
}

/**
 * 开场/审问阶段：字幕式提问区。
 * 居民选择已移至 3D 场景（点击场景人物选中），此处不再渲染按钮。
 */
export function AskingPhase({
  question,
  questionsLeft,
  busy,
  inputRef,
  onQuestionChange,
  onAsk,
}: Props) {
  return (
    <>
      <div className="ask-area">
        <input
          ref={inputRef}
          className="ask-input"
          value={question}
          onChange={(e) => onQuestionChange(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAsk()}
          placeholder="向渡口的人提问…（是/否 类问题最有效）"
        />
        <button className="ask-btn" onClick={onAsk} disabled={busy || !question.trim()}>
          问
        </button>
      </div>
      <div className="questions-left">本轮回剩余问题：{questionsLeft} / 10</div>
    </>
  );
}
