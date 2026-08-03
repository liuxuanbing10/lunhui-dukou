import { describe, it, expect } from 'vitest';
import { createAudioEngine } from './audio';

/**
 * 仅测试 API 形状：jsdom 无 AudioContext，因此重点验证
 * 1) createAudioEngine 是可调用函数；
 * 2) 返回对象暴露全部约定的方法；
 * 3) 在无 AudioContext 时调用任意方法均不抛错（guard 保证）。
 * 不依赖真实音频设备 / Web Audio 实现。
 */
describe('audio engine API shape', () => {
  it('createAudioEngine 是一个函数', () => {
    expect(typeof createAudioEngine).toBe('function');
  });

  it('返回对象暴露全部约定方法', () => {
    const engine = createAudioEngine();
    const methods = [
      'start',
      'stop',
      'setSilence',
      'playReveal',
      'playReject',
      'setMuted',
      'dispose',
    ];
    for (const m of methods) {
      expect(typeof (engine as unknown as Record<string, unknown>)[m]).toBe('function');
    }
  });

  it('无 AudioContext 环境下调用任意方法不抛错', () => {
    expect(() => {
      const engine = createAudioEngine();
      engine.start();
      engine.setSilence(true);
      engine.playReveal();
      engine.playReject();
      engine.setMuted(true);
      engine.setMuted(false);
      engine.stop();
      engine.dispose();
    }).not.toThrow();
  });

  it('带 opts 构造也不抛错', () => {
    expect(() => {
      const engine = createAudioEngine({ muted: true });
      engine.start();
      engine.dispose();
    }).not.toThrow();
  });
});
