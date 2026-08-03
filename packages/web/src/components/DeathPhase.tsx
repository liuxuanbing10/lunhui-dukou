interface Props {
  consequence: string;
  deathLine: string;
  busy: boolean;
  onNextLoop: () => void;
}

/** 轮回终局：沉船/留下的后果 + 从水里醒来 */
export function DeathPhase({ consequence, deathLine, busy, onNextLoop }: Props) {
  return (
    <div className="loop-flash">
      <h2>轮回</h2>
      <p>{consequence}</p>
      <p style={{ marginTop: 12, color: 'var(--danger)' }}>{deathLine}</p>
      <button className="primary-btn" onClick={onNextLoop} disabled={busy}>
        从水里醒来
      </button>
    </div>
  );
}
