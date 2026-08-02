/**
 * LLM 血肉层（generator）
 * --------------------------------------------
 * 职责：未命中真相表的问题，生成居民"像人一样"的回答。
 * 容灾：sophnet（免费 100k/天）→ DeepSeek 官方（¥1/2 百万）→ 保守兜底。
 * 铁律：真相表判定不经过这里（纯规则优先，防失控 + 省钱）。
 *
 * 环境变量：SOPHNET_API_KEY（主）、DEEPSEEK_API_KEY（备）
 * 模型：sophnet 用 deepseek-v4-flash，DeepSeek 官方用 deepseek-v4-flash
 */
import OpenAI from 'openai';
import type { Resident } from '@lunhui/engine';
import { getMemories } from '../db/repository.js';
import type { Database } from 'better-sqlite3';

interface Provider {
  name: string;
  baseURL: string;
  apiKey: string;
  model: string;
}

/** 构建 provider 列表（sophnet 主 → deepseek 备）。测试可导入。 */
export function buildProviders(): Provider[] {
  const providers: Provider[] = [];
  if (process.env.SOPHNET_API_KEY) {
    providers.push({
      name: 'sophnet',
      baseURL: 'https://api.sophnet.com/v1',
      apiKey: process.env.SOPHNET_API_KEY,
      model: 'deepseek-v4-flash',
    });
  }
  if (process.env.DEEPSEEK_API_KEY) {
    providers.push({
      name: 'deepseek',
      baseURL: 'https://api.deepseek.com',
      apiKey: process.env.DEEPSEEK_API_KEY,
      model: 'deepseek-v4-flash',
    });
  }
  return providers;
}

/** 系统提示词：角色扮演 + 真相表约束（防幻觉） */
function buildSystemPrompt(resident: Resident): string {
  return [
    `你正在扮演《轮回渡口》中的居民「${resident.name}」（${resident.role}）。`,
    ``,
    `【人格】${resident.persona}`,
    `【说话风格】${resident.speechStyle ?? '简洁，像古镇里的人'}`,
    `【习惯】${(resident.quirks ?? []).join('；')}`,
    ``,
    `【扮演铁律】`,
    `1. 你是小镇居民，不是 AI。用第一人称、生活化的口语回答，短句，克制，可以有话外音。`,
    `2. 你有一个秘密（不可直说）。玩家在套你的话——你可以暗示、闪躲、反问、沉默，但绝不能直接说出完整真相。`,
    `3. 恐怖为皮，情感为骨：你的回答可以让人不安，但背后要有一根情感的刺。`,
    `4. 禁止解释你在扮演 AI，禁止说出'作为AI''我是模型'之类的话。`,
    `5. 回答不超过 60 字，拒绝则用省略号或沉默（不超过 10 字）。`,
  ].join('\n');
}

/** 组装用户消息：记忆 + 问题 */
function buildUserPrompt(resident: Resident, question: string, db: Database): string {
  const memories = getMemories(db, resident.id, 3);
  const memText =
    memories.length > 0
      ? `【你记得的片段】\n${memories.map((m) => `- ${m.content as string}`).join('\n')}`
      : '';
  return [memText, `【玩家问你】${question}`].filter(Boolean).join('\n\n');
}

/** 走单个 provider，失败抛错（供上层容灾切换） */
async function callProvider(
  provider: Provider,
  systemPrompt: string,
  userPrompt: string,
): Promise<string> {
  const client = new OpenAI({ baseURL: provider.baseURL, apiKey: provider.apiKey });
  const res = await client.chat.completions.create({
    model: provider.model,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    temperature: 0.8,
    max_tokens: 200,
    // V4-Flash 默认思考模式会吃掉 max_tokens 导致 content 为空 → 显式关闭（也省钱）
    ...(provider.name === 'sophnet' ? { thinking: { type: 'disabled' } as const } : {}),
  });
  const text = res.choices[0]?.message?.content?.trim();
  if (!text) throw new Error(`${provider.name}: 空回答`);
  return text;
}

/**
 * 生成居民回答（多 provider 容灾）。
 * 测试/CI 环境：LLM_MOCK=1 时返回固定回答（不烧 token 额度），由测试断言覆盖生成逻辑。
 * @returns { text, provider } 回答文本 + 实际使用的 provider
 */
export async function generateAnswer(
  resident: Resident,
  question: string,
  db: Database,
): Promise<{ text: string; provider: string }> {
  // Mock 模式：测试/CI 不烧 token（真实调用只在显式需要时跑）
  if (process.env.LLM_MOCK === '1') {
    return {
      text: `（${resident.name}看了你一眼，声音很轻：${question.slice(0, 12)}……这里的事，说不清。）`,
      provider: 'mock',
    };
  }

  const providers = buildProviders();
  const systemPrompt = buildSystemPrompt(resident);
  const userPrompt = buildUserPrompt(resident, question, db);

  if (providers.length === 0) {
    return {
      text: `（${resident.name}看了你一眼，没有说话。雨还在下。）`,
      provider: 'none',
    };
  }

  let lastErr: unknown;
  for (const p of providers) {
    try {
      const text = await callProvider(p, systemPrompt, userPrompt);
      return { text, provider: p.name };
    } catch (err) {
      lastErr = err;
      console.warn(`[llm] provider ${p.name} 失败: ${(err as Error).message}`);
    }
  }
  // 全部失败 → 保守兜底
  console.error('[llm] 所有 provider 失败', lastErr);
  return {
    text: `（${resident.name}沉默了很久。雨声很大。他没有回答。）`,
    provider: 'none',
  };
}
