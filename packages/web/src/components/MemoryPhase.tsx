interface Props {
  lines: string[];
}

/** 记忆回响阶段：跨轮回记住的东西 */
export function MemoryPhase({ lines }: Props) {
  if (lines.length === 0) return null;
  return (
    <div className="memory-area">
      <b>你记得：</b>
      <br />
      {lines.map((m, i) => (
        <div key={i}>{m}</div>
      ))}
    </div>
  );
}
