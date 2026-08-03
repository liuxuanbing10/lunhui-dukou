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
import {
  wrap,
  retry,
  circuitBreaker,
  handleAll,
  timeout,
  TimeoutStrategy,
  ConsecutiveBreaker,
  ExponentialBackoff,
  BrokenCircuitError,
} from 'cockatiel';
import type { CircuitBreakerPolicy, IPolicy, IDefaultPolicyContext } from 'cockatiel';
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

// ---------- 容灾策略（cockatiel：timeout + retry + 熔断） ----------
// 参数可经环境变量覆盖（测试用），默认值对齐 ROADMAP P1-6：
//   LLM_TIMEOUT_MS          单次调用超时（默认 15s；挂起不再无限等待）
//   LLM_MAX_ATTEMPTS        重试次数（默认 2 = 首试 + 1 次重试）
//   LLM_BREAKER_THRESHOLD   熔断阈值（默认连续 3 次失败 → 熔断该 provider）
//   LLM_BREAKER_HALF_OPEN_MS 熔断后多久试探恢复（默认 30s）
function policyOptions() {
  return {
    timeoutMs: Number(process.env.LLM_TIMEOUT_MS ?? '15000'),
    maxAttempts: Number(process.env.LLM_MAX_ATTEMPTS ?? '2'),
    breakerThreshold: Number(process.env.LLM_BREAKER_THRESHOLD ?? '3'),
    halfOpenAfterMs: Number(process.env.LLM_BREAKER_HALF_OPEN_MS ?? '30000'),
  };
}

/** 每个 provider 一份熔断器（模块级缓存；resetProviderPolicies 供测试隔离） */
const breakerCache = new Map<string, CircuitBreakerPolicy>();
const policyCache = new Map<string, IPolicy<IDefaultPolicyContext>>();

/** 测试/热更新后清空调用。 */
export function resetProviderPolicies(): void {
  breakerCache.clear();
  policyCache.clear();
}

/**
 * 为指定 provider 构建（或取缓存的）容灾策略：
 * 外层熔断 → 中层重试（指数退避）→ 内层超时。
 * 挂起的 provider 会被超时斩断；连续失败会被熔断跳过（不再浪费额度/时间）。
 */
export function getProviderPolicy(name: string): IPolicy<IDefaultPolicyContext> {
  const cached = policyCache.get(name);
  if (cached) return cached;
  const o = policyOptions();
  let breaker = breakerCache.get(name);
  if (!breaker) {
    breaker = circuitBreaker(handleAll, {
      breaker: new ConsecutiveBreaker(o.breakerThreshold),
      halfOpenAfter: o.halfOpenAfterMs,
    });
    breakerCache.set(name, breaker);
  }
  const policy = wrap(
    breaker,
    retry(handleAll, {
      maxAttempts: o.maxAttempts,
      backoff: new ExponentialBackoff({ initialDelay: 300, maxDelay: 2000 }),
    }),
    timeout(o.timeoutMs, TimeoutStrategy.Aggressive),
  );
  policyCache.set(name, policy);
  return policy;
}

/**
 * 每位居民的示例对话（few-shot）：模型从示例学风格，比指令强十倍。
 * 风格源：docs/RESIDENTS.md 定稿背景长文（主创验收过的"情感之刺"文风）。
 */
const EXAMPLE_DIALOGUES: Record<string, Array<{ q: string; a: string }>> = {
  r1: [
    { q: '你认识我吗？', a: '（他顿了顿）……我捞过你。' },
    { q: '你为什么总在渡口？', a: '等水涨。等水落。等一件说不清的事。' },
    { q: '你怕水吗？', a: '（他看了河面很久）怕。但已经不怕了。' },
  ],
  r2: [
    { q: '你每晚去渡口做什么？', a: '放花。（她笑了）石阶空着，总得有人放点什么。' },
    { q: '你等的人是谁？', a: '（她话说到一半，停住）……等你家花店的栀子开了，你再来问我。' },
  ],
  r3: [
    { q: '那碗面是给谁的？', a: '（他擦着碗，没抬头）天冷了，多煮一碗，放着。' },
    { q: '你弟弟呢？', a: '（他手上的动作停了）……出门了。远。' },
  ],
  r4: [
    { q: '你为什么不给纸人点眼睛？', a: '（他小声）点了，它就看人了。' },
    { q: '你师傅去哪了？', a: '（他缩了缩脖子）我不知道。桌上留了张字条。' },
  ],
  r5: [
    { q: '钟怎么总停在 3:17？', a: '（他继续调钟，头也不抬）钟没错。是时间错了。' },
    { q: '你信什么？', a: '信发条。松了就停，上紧了接着走。' },
  ],
  r6: [
    { q: '你总在涨水夜出船？', a: '（他嗓门大）爷们儿，涨水才有鱼！……（他顿了顿）也有别的。' },
    { q: '船舱里藏了什么？', a: '（他脸色变了）没什么。别问。' },
  ],
  r7: [
    { q: '你每晚 3:17 去渡口？', a: '巡逻路线。三分钟。一步不多。' },
    { q: '你在等谁？', a: '（他提灯照了照你）巡夜人不等谁。只走路线。' },
  ],
  r8: [
    { q: '你从哪来？', a: '（他抱着布包，很平静）从水里。我睡过太久了。' },
    { q: '你为什么总看着我？', a: '（他低头打开布包，又合上）因为你记不得。' },
  ],
};

/** 系统提示词：标签式人格 + 示例对话 + 负面清单（去 AI 味） */
function buildSystemPrompt(resident: Resident): string {
  const examples = (EXAMPLE_DIALOGUES[resident.id] ?? []).map(
    (e) => `玩家：${e.q}\n${resident.name}：${e.a}`,
  );
  return [
    `你是《轮回渡口》小镇居民「${resident.name}」（${resident.role}）。你不是 AI，不是助手，是一个活在这个雨夜小镇里的人。`,
    ``,
    `【人格标签】${resident.persona}`,
    `【说话方式】${resident.speechStyle ?? '话少，克制，短句'}`,
    `【习惯】${(resident.quirks ?? []).join('；')}`,
    ``,
    `【示例对话（学习这个语气，这是你的声音）】`,
    ...examples,
    ``,
    `【铁律】`,
    `1. 玩家在套你的话。你可以闪躲、反问、沉默、顾左右而言他，但绝不直接说出完整真相。`,
    `2. 用具体的物象说话（雨、河、白花、面粉、齿轮……），不要抽象总结，不要讲道理。`,
    `3. 回答 ≤50 字，口语，短句。可以有省略号，可以只说半句。`,
    `4. 【绝对禁止】以下词语一旦出现就是毁掉一切：'作为AI''我是模型''总而言之''综上所述''首先其次''值得注意的是''在这个充满不确定性的世界里''让我们''我希望你能理解'。`,
    `5. 不解释自己，不评价自己，不总结情绪。只说眼前的东西。`,
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
 * 在容灾策略（timeout+retry+熔断）下调用任意异步函数。导出供测试验证策略本身。
 * 挂起 → TaskCancelledError；连续失败 → 熔断后 BrokenCircuitError。
 */
export function callWithResilience<T>(providerName: string, fn: () => Promise<T>): Promise<T> {
  return getProviderPolicy(providerName).execute(fn);
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

  const opts = policyOptions();
  let lastErr: unknown;
  for (const p of providers) {
    try {
      // 容灾链：熔断（跳过烂掉的 provider）→ 重试（指数退避）→ 超时（斩断挂起）
      const text = await getProviderPolicy(p.name).execute(() =>
        callProvider(p, systemPrompt, userPrompt),
      );
      return { text, provider: p.name };
    } catch (err) {
      lastErr = err;
      if (err instanceof BrokenCircuitError) {
        console.warn(`[llm] provider ${p.name} 已熔断，跳过（${opts.halfOpenAfterMs}ms 后试探）`);
      } else {
        console.warn(`[llm] provider ${p.name} 失败: ${(err as Error).message}`);
      }
    }
  }
  // 全部失败 → 保守兜底
  console.error('[llm] 所有 provider 失败', lastErr);
  return {
    text: `（${resident.name}沉默了很久。雨声很大。他没有回答。）`,
    provider: 'none',
  };
}
