import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type Database from 'better-sqlite3';
import { initDb, closeDb } from '../db/index.js';
import { seedResidents } from '../db/seed.js';
import { getResidentRow } from '../db/repository.js';
import { generateAnswer, buildProviders } from './llm-generator.js';
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
    const result = await generateAnswer(resident, '你今天看到什么奇怪的事吗？', db);
    expect(result.text.length > 0, '有回答').toBeTruthy();
    expect(result.provider).toBe(process.env.LLM_MOCK === '1' ? 'mock' : 'sophnet');
  });

  it('生成回答（mock 模式：无 AI 腔）', async () => {
    const resident = getResident('r8');
    const result = await generateAnswer(resident, '你认识我吗？我是谁？', db);
    expect(!result.text.includes('作为AI') && !result.text.includes('我是模型')).toBeTruthy();
  });
});
