interface Props {
  busy: boolean;
  onChoice: (choice: 'leave' | 'stay') => void;
}

/** 关键选择阶段：水涨了，船要靠岸 */
export function ChoicePhase({ busy, onChoice }: Props) {
  return (
    <>
      <div className="questions-left" style={{ color: 'var(--danger)', marginTop: 16 }}>
        水涨了。渡口的船要靠岸。蓑衣人站在河边，看着你。
      </div>
      <div className="choice-area">
        <button className="choice-btn" onClick={() => onChoice('leave')} disabled={busy}>
          上船——我想离开这个镇子
        </button>
        <button className="choice-btn danger" onClick={() => onChoice('stay')} disabled={busy}>
          留下——我得先弄清我是谁
        </button>
      </div>
    </>
  );
}
