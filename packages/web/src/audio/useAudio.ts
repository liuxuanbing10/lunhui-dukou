import { useEffect, useState } from 'react';
import { createAudioEngine, type AudioEngine } from './audio';

/**
 * 音频引擎的 React 绑定。
 *
 * @param enabled 是否启用音频。变为 `true` 时创建引擎实例；变回 `false`
 *                或组件卸载时 `dispose()` 释放 AudioContext。
 * @returns 引擎引用（或 null）。App 应在用户点击「开始」拿到引用后调用
 *          `engine.start()`，由用户手势满足自动播放策略。
 */
export function useAudio(enabled: boolean): AudioEngine | null {
  const [engine, setEngine] = useState<AudioEngine | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const eng = createAudioEngine();
    setEngine(eng);
    return () => {
      eng.dispose();
      setEngine(null);
    };
  }, [enabled]);

  return engine;
}
