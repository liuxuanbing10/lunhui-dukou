import { useEffect, useState } from 'react';

/** 打字机效果 Hook：逐字显示文本，active=false 时直接全量显示 */
export function useTypewriter(text: string, speed = 40, active = true): string {
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
