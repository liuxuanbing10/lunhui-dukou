/** 雨夜背景（纯装饰，静态生成一次） */

const RAIN_DROPS = Array.from({ length: 48 }, (_, i) => ({
  left: `${(i * 2.08 + 7) % 100}%`,
  delay: `${(i * 0.37) % 2.8}s`,
  duration: `${0.7 + ((i * 0.13) % 1.1)}s`,
}));

export function Rain() {
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
