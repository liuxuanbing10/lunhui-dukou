interface Props {
  lines: string[];
  onContinue: () => void;
}

/** 记忆回响阶段：跨轮回记住的东西 */
export function MemoryPhase({ lines, onContinue }: Props) {
  if (lines.length === 0) return null;
  return (
    <div className="memory-area">
      <b>你记得：</b>
      <br />
      {lines.map((m, i) => (
        <div key={i}>{m}</div>
      ))}
      <button className="memory-continue" type="button" onClick={onContinue}>
        醒来，继续这趟渡口
      </button>
    </div>
  );
}
