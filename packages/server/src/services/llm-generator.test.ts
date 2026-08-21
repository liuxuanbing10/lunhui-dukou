import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import type Database from 'better-sqlite3';
import { initDb, closeDb } from '../db/index.js';
import { seedResidents } from '../db/seed.js';
import { getResidentRow } from '../db/repository.js';
import {
  generateAnswer,
  buildProviders,
  callWithResilience,
  resetProviderPolicies,
} from './llm-generator.js';
import { BrokenCircuitError, TaskCancelledError } from 'cockatiel';
import { rowToResident } from '../utils/row-to-resident.js';
import type { Resident } from '@lunhui/engine';

let db: Database.Database;

beforeAll(() => {
  db = initDb(':memory:');
  seedResidents(db);
});

afterAll(() => {
  closeDb();
});

function getResident(id: string): Resident {
  const row = getResidentRow(db, id);
  if (!row) throw new Error(`Resident ${id} not found`);
  return rowToResident(row);
}

describe('llm-generator', () => {
  it('provider 配置：sophnet 主 + deepseek 备', () => {
    const providers = buildProviders();
    // mock 模式下不加载真实 provider，CI 干净环境（无 .env）也应通过
    if (process.env.LLM_MOCK === '1') {
      expect(providers.length, 'mock 模式下不加载真实 provider').toBe(0);
      return;
    }
    expect(providers.length >= 1, '至少一个 provider（.env 已配置）').toBeTruthy();
    expect(providers[0]?.name).toBe('sophnet');
  });

  // 以下两个测试在 LLM_MOCK=1（默认 npm test）时验证 mock 行为（零消耗）；
  // 真实 LLM 调用用 npm run test:live 单独跑（会烧 sophnet 免费额度）。
  it('生成回答（mock 模式：默认测试不烧 token）', async () => {
    const resident = getResident('r1');
    const result = await generateAnswer(resident, '你今天看到什么奇怪的事吗？', db, 1);
    expect(result.text.length > 0, '有回答').toBeTruthy();
    expect(result.provider).toBe(process.env.LLM_MOCK === '1' ? 'mock' : 'sophnet');
  });

  it('生成回答（mock 模式：无 AI 腔）', async () => {
    const resident = getResident('r8');
    const result = await generateAnswer(resident, '你认识我吗？我是谁？', db, 1);
    expect(!result.text.includes('作为AI') && !result.text.includes('我是模型')).toBeTruthy();
  });
});

/**
 * 容灾链测试（cockatiel：timeout → retry → 熔断）。
 * 不触网、不烧 token：直接驱动 callWithResilience 验证策略本身。
 * 策略参数经 LLM_* 环境变量覆盖（见 .env.example），构造前须 resetProviderPolicies。
 */
describe('llm-generator 容灾链（timeout/retry/熔断）', () => {
  const ENV_KEYS = ['LLM_TIMEOUT_MS', 'LLM_MAX_ATTEMPTS', 'LLM_BREAKER_THRESHOLD', 'LLM_BREAKER_HALF_OPEN_MS'];
  const saved: Record<string, string | undefined> = {};
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeAll(() => {
    for (const k of ENV_KEYS) saved[k] = process.env[k];
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterAll(() => {
    for (const k of ENV_KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
    warnSpy.mockRestore();
    resetProviderPolicies();
  });
  beforeEach(() => {
    for (const k of ENV_KEYS) delete process.env[k];
    resetProviderPolicies();
  });

  it('超时：挂起的 provider 被斩断（不无限等待）', async () => {
    process.env.LLM_TIMEOUT_MS = '80';
    process.env.LLM_MAX_ATTEMPTS = '1'; // 首试失败不重试，快速暴露
    await expect(callWithResilience('hang-test', () => new Promise(() => {}))).rejects.toBeInstanceOf(
      TaskCancelledError,
    );
  }, 5000);

  it('重试：首次失败、二次成功 → 正常返回', async () => {
    process.env.LLM_MAX_ATTEMPTS = '2';
    process.env.LLM_TIMEOUT_MS = '2000';
    let attempts = 0;
    const result = await callWithResilience('retry-test', async () => {
      attempts += 1;
      if (attempts < 2) throw new Error('first call fails');
      return 'ok';
    });
    expect(result).toBe('ok');
    expect(attempts).toBe(2);
  }, 8000);

  it('熔断：连续失败后跳过调用（BrokenCircuitError，不浪费额度/时间）', async () => {
    process.env.LLM_BREAKER_THRESHOLD = '2';
    process.env.LLM_MAX_ATTEMPTS = '1';
    process.env.LLM_BREAKER_HALF_OPEN_MS = '60000'; // 测试期间不试探恢复
    let calls = 0;
    const fail = () =>
      callWithResilience('breaker-test', async () => {
        calls += 1;
        throw new Error('provider down');
      });
    // 前两次：真实执行并失败（各 1 次尝试）
    await expect(fail()).rejects.toThrow('provider down');
    await expect(fail()).rejects.toThrow('provider down');
    // 第三次：熔断已开 → 直接拒绝，底层函数不再被调用
    const callsBefore = calls;
    await expect(fail()).rejects.toBeInstanceOf(BrokenCircuitError);
    expect(calls).toBe(callsBefore);
  }, 8000);

  it('策略按 provider 隔离（一个熔断不拖累另一个）', async () => {
    process.env.LLM_BREAKER_THRESHOLD = '1';
    process.env.LLM_MAX_ATTEMPTS = '1';
    const failOnce = (name: string) =>
      callWithResilience(name, async () => {
        throw new Error(`${name} down`);
      });
    await expect(failOnce('iso-a')).rejects.toThrow();
    // iso-a 已熔断；iso-b 独立，仍会真实执行
    let bCalled = false;
    await callWithResilience('iso-b', async () => {
      bCalled = true;
      return 'fine';
    });
    expect(bCalled).toBe(true);
  }, 8000);
});
