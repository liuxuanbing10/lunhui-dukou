import { test } from 'node:test';
import assert from 'node:assert/strict';
import type Database from 'better-sqlite3';
import { initDb, closeDb } from '../db/index.js';
import { seedResidents } from '../db/seed.js';
import { getResidentRow } from '../db/repository.js';
import { generateAnswer, buildProviders } from './llm-generator.js';
import type { Resident } from '@lunhui/engine';

let db: Database.Database;

test.before(() => {
  db = initDb(':memory:');
  seedResidents(db);
});

test.after(() => {
  closeDb();
});

function getResident(id: string): Resident {
  const row = getResidentRow(db, id) as Record<string, unknown>;
  return {
    id: row.id as string,
    name: row.name as string,
    archetype: row.archetype as string,
    age: (row.age as number) ?? 0,
    role: row.role as string,
    appearance: (row.appearance as string) ?? '',
    persona: row.persona as string,
    speechStyle: (row.speech_style as string) ?? '',
    quirks: JSON.parse((row.quirks as string) ?? '[]'),
    secretFacts: JSON.parse(row.secret_facts as string),
    relations: JSON.parse((row.relations as string) ?? '[]'),
  };
}

test('provider 配置：sophnet 主 + deepseek 备', () => {
  const providers = buildProviders();
  assert.ok(providers.length >= 1, '至少一个 provider（.env 已配置）');
  assert.equal(providers[0]?.name, 'sophnet');
});

test('LLM 真实生成：蓑衣人对普通问题像人一样回答（sophnet）', async () => {
  const resident = getResident('r1');
  const result = await generateAnswer(resident, '你今天看到什么奇怪的事吗？', db);
  assert.ok(result.text.length > 0, '有回答');
  console.log(`[llm] provider=${result.provider} 回答=${result.text}`);
  // 不允许 AI 腔
  assert.ok(!result.text.includes('作为AI') && !result.text.includes('我是模型'), '无 AI 腔');
});

test('LLM 真实生成：小满守秘密（不直接泄底）', async () => {
  const resident = getResident('r8');
  const result = await generateAnswer(resident, '你认识我吗？我是谁？', db);
  console.log(`[llm] provider=${result.provider} 回答=${result.text}`);
  // 小满记得一切但不说破——不能直接说"你是摆渡人"
  assert.ok(!result.text.includes('摆渡人') || result.text.length < 30, '不直接揭底');
});
