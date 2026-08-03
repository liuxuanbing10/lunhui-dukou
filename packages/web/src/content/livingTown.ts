/**
 * 活镇（Living Town）内容扩展数据模块
 * ------------------------------------------------------------------
 * 用途：把「活镇」玩法所需的可复用内容数据集中在此，供后续活镇系统
 *      （关系网驱动事件、记忆复仇、多结局分支）消费。本文件为纯数据，
 *      不引入任何运行时依赖，也不 import `@lunhui/engine` 的 fs 模块。
 *
 * 类型来源说明：
 *   任务模板假设 web 居民类型为 `Resident`，但 packages/web/src/residents.ts
 *   实际导出的是 `ResidentMeta`（字段：id / name / role / emoji）。本模块
 *   复用该既有类型作为基座，并派生 `LivingTownResident` 以富集审问占位，
 *   不修改 residents.ts（遵循"不要另起炉灶 / 不要删现有字段"约束）。
 *
 * factId 衔接约定（详见 docs/living-town-design.md §5）：
 *   - 引擎真相表里每条 Fact 的 id 为局部 id（f1 / f2 / f3），非全局唯一。
 *   - 本模块用 `<居民id>:<局部factId>` 作为全局唯一 factId，例如 `r5:f2`。
 *   - 居民 id 在 web(residents.ts) 与 engine(SOUL.md frontmatter) 完全一致，
 *     均为 r1..r8；`r5-heshu` 等只是 engine 源目录名，映射到居民 id `r5`。
 *   - 例如何叔钟停 3:17 的事实：engine fact r5 f2（关键词「3:17」）
 *     → 本模块引用为 `r5:f2`，并在 hint 中标注关键词以便检索。
 */

import type { ResidentMeta } from '../residents';

/* =========================================================================
 * 1) 居民（富集审问占位）
 * ========================================================================= */

/**
 * 在既有 ResidentMeta 基础上富集审问相关占位，供活镇审问 UI 直接消费。
 * 不改动原 ResidentMeta 字段，仅做结构扩展。
 */
export interface LivingTownResident extends ResidentMeta {
  /** 审问开场白与追问占位（对话文案占位，不依赖 LLM；问题措辞刻意呼应 engine 真相表关键词） */
  interrogate?: {
    greeting: string;
    prompts: string[];
  };
}

/**
 * 活镇居民聚合数组：复用 web residents.ts 的全部 r1..r8（保持 id 不变），
 * 仅补充更具体的审问提示语 / 台词占位。若后续 engine 新增居民，把对应
 * ResidentMeta 拷入此数组并补 interrogate 即可（保持 id 唯一）。
 */
export const livingTownResidents: LivingTownResident[] = [
  {
    id: 'r1',
    name: '蓑衣人',
    role: '无固定营生，常在渡口',
    emoji: '🌧️',
    interrogate: {
      greeting: '（他没抬头，雨水顺着蓑衣滴落。）你又来了。',
      prompts: ['你捞过我几次？', '你为什么不回头看钟楼？', '老王……你认识他吗？'],
    },
  },
  {
    id: 'r2',
    name: '阿岚',
    role: '花店老板娘',
    emoji: '🌸',
    interrogate: {
      greeting: '（她笑着把一束花往身后藏了藏。）哟，稀客。',
      prompts: ['你每晚往渡口放的是什么花？', '你在等谁回来？', '七年前那场船难，你还记得吗？'],
    },
  },
  {
    id: 'r3',
    name: '老王',
    role: '面馆老板',
    emoji: '🍜',
    interrogate: {
      greeting: '（他抬头，眼角全是褶。）吃了吗？',
      prompts: ['角落那碗面，是给谁的？', '你弟弟……后来怎样了？', '蓑衣人，你看着眼熟？'],
    },
  },
  {
    id: 'r4',
    name: '阿黎',
    role: '纸人铺学徒',
    emoji: '🪁',
    interrogate: {
      greeting: '（他手指上的朱砂还没干，声音发抖。）师、傅说不能多嘴……',
      prompts: ['你扎的纸人，夜里会去哪？', '你师傅去哪了？', '你为什么怕我？'],
    },
  },
  {
    id: 'r5',
    name: '何叔',
    role: '钟楼修表匠',
    emoji: '🕰️',
    interrogate: {
      greeting: '（他调整着齿轮，头也不抬。）又停了。',
      prompts: ['钟为什么停在 3:17？', '这地方，重复过多少次了？', '你是不是……都记得？'],
    },
  },
  {
    id: 'r6',
    name: '老鲞',
    role: '码头渔夫',
    emoji: '⛵',
    interrogate: {
      greeting: '（他压低嗓门，往船舱瞟了一眼。）那都不是事儿。',
      prompts: ['七年前那晚，你为什么没出船？', '船舱里那只鞋，是谁的？', '你每晚出船，到底在捞什么？'],
    },
  },
  {
    id: 'r7',
    name: '郑爷',
    role: '巡夜人',
    emoji: '🏮',
    interrogate: {
      greeting: '（铜哨子挂在胸前，眼神锐利。）熄灯。关门。别问。',
      prompts: ['你每晚 3:17 去渡口做什么？', '你在等谁？', '你见过我从水里站起来，对吗？'],
    },
  },
  {
    id: 'r8',
    name: '小满',
    role: '来历不明的孩子',
    emoji: '🧒',
    interrogate: {
      greeting: '（他抱着布包，眼睛很亮。）我知道你会来。',
      prompts: ['你怎么知道我的名字？', '你在等谁？', '郑爷……你认识他吗？'],
    },
  },
];

/* =========================================================================
 * 2) 居民秘密（呼应 engine 真相表 factId）
 * ========================================================================= */

/** 单条居民秘密。hint 显式标注所呼应的 engine factId 与关键词，便于检索与联动。 */
export interface ResidentSecret {
  id: string;
  secret: string;
  /** 提示：标注呼应 engine 真相表的 factId（<居民id>:<局部factId>）与关键词 */
  hint: string;
}

/**
 * 每位居民至少一条秘密，直接呼应 engine 真相表（SOUL.md / RESIDENTS.md）。
 * factId 采用 `<居民id>:<局部factId>` 全局方案，例如何叔钟停 3:17 = `r5:f2`。
 */
export const residentSecrets: ResidentSecret[] = [
  {
    id: 'secret-r1',
    secret: '蓑衣人其实是老王 20 年前在渡口落水而亡的弟弟——他没离开，是在等哥哥认出他。',
    hint: '呼应 engine fact r1:f2（关键词「弟弟 / 老王」）；另见 r1:f1（捞过玩家 7 次）。',
  },
  {
    id: 'secret-r2',
    secret: '阿岚每晚往渡口放白花，是在等 7 年前船难中消失的未婚夫——她以为从水里醒来的玩家是他。',
    hint: '呼应 engine fact r2:f2（关键词「未婚夫 / 船难 / 7年前」）。',
  },
  {
    id: 'secret-r3',
    secret: '老王每晚多煮的那碗面，是给 20 年前死在渡口的弟弟（即蓑衣人）；他认不出弟弟，因为弟弟死时才二十七岁。',
    hint: '呼应 engine fact r3:f2（关键词「弟弟 / 20年前 / 落水」）。',
  },
  {
    id: 'secret-r4',
    secret: '阿黎扎的纸人会在夜里自己走到渡口，替未了心愿的死者「还愿」，其中也包括玩家。',
    hint: '呼应 engine fact r4:f1（关键词「纸人 / 夜里 / 渡口」）；另见 r4:f2（替死者上船）。',
  },
  {
    id: 'secret-r5',
    secret: '钟楼的钟永远停在 3:17，那是玩家第一次落水的时间；小镇已重复了 30 次，何叔是唯一清醒并假装不知道的人。',
    hint: '呼应 engine fact r5:f2（关键词「3:17 / 钟停 / 落水」）；另见 r5:f1（重复 30 次）。',
  },
  {
    id: 'secret-r6',
    secret: '老鲞船舱里藏着的，是 7 年前失踪女儿穿的那只鞋；他每晚出船并非打鱼，是在捞再也捞不到的女儿。',
    hint: '呼应 engine fact r6:f2（关键词「女儿的鞋 / 船舱」）；另见 r6:f1（船难在岸上没救）。',
  },
  {
    id: 'secret-r7',
    secret: '郑爷每晚 3:17 准时走到渡口，是在等 30 年前落水的妻子；他见过玩家从水里站起来，却假装没看见。',
    hint: '呼应 engine fact r7:f1（关键词「3:17 / 渡口 / 等人」）；另见 r7:f2（等 30 年前妻子）。',
  },
  {
    id: 'secret-r8',
    secret: '小满其实是 30 年前与母亲一同死于渡口的那个孩子，也是郑爷失散的儿子；他记得所有轮回与玩家每世的名字。',
    hint: '呼应 engine fact r8:f2（关键词「郑爷 / 父亲 / 30年前」）；另见 r8:f1（认识玩家每世名字）。',
  },
];

/* =========================================================================
 * 3) 关系网（供活镇事件系统消费）
 * ========================================================================= */

/** 关系种类：盟友 / 对手 / 血亲(含拟亲) / 亏欠(恩情或愧疚) */
export interface ResidentRelation {
  from: string;
  to: string;
  kind: 'ally' | 'rival' | 'kin' | 'debt';
  note: string;
}

/**
 * 活镇关系网：派生自 engine SOUL.md 的 relations（stance + note），
 * 归一为 4 类 kind。kind 将驱动事件触发（见 docs/living-town-design.md §2）。
 * id 统一使用 web/engine 共有的 r1..r8。
 */
export const residentRelations: ResidentRelation[] = [
  // 蓑衣人 r1
  { from: 'r1', to: 'r3', kind: 'kin', note: '蓑衣人是老王 20 年前落水的弟弟，老王认不出他' },
  { from: 'r1', to: 'r7', kind: 'rival', note: '巡夜人总盯着渡口，觉得蓑衣人不像活人' },
  { from: 'r1', to: 'r6', kind: 'ally', note: '渔夫年轻时见过他，是旧识' },
  // 阿岚 r2
  { from: 'r2', to: 'r1', kind: 'debt', note: '她总觉得蓑衣人知道未婚夫下落，有求于他' },
  { from: 'r2', to: 'r3', kind: 'ally', note: '老王的面馆是她唯一会久待的地方' },
  { from: 'r2', to: 'r6', kind: 'rival', note: '船难那晚渔夫在岸上没救人，她怨恨' },
  // 老王 r3
  { from: 'r3', to: 'r1', kind: 'kin', note: '每晚多煮一碗面给死去的弟弟（即蓑衣人）' },
  { from: 'r3', to: 'r2', kind: 'ally', note: '心疼阿岚每晚放白花，但不说' },
  { from: 'r3', to: 'r8', kind: 'kin', note: '疼爱小满，常多给一个荷包蛋' },
  // 阿黎 r4
  { from: 'r4', to: 'r1', kind: 'rival', note: '怕蓑衣人，他深夜来过纸人铺' },
  { from: 'r4', to: 'r7', kind: 'rival', note: '躲巡夜人，曾被盘问纸人失踪' },
  { from: 'r4', to: 'r8', kind: 'ally', note: '只有小满不怕纸人，会和他说说话' },
  // 何叔 r5
  { from: 'r5', to: 'r1', kind: 'ally', note: '与蓑衣人同谋般默契，都知道对方"记得"' },
  { from: 'r5', to: 'r7', kind: 'rival', note: '提防尽责的巡夜人，怕他说破太多' },
  // 老鲞 r6
  { from: 'r6', to: 'r2', kind: 'debt', note: '7 年前船难在岸上未救，对阿岚怀愧疚' },
  { from: 'r6', to: 'r1', kind: 'rival', note: '年轻时见蓑衣人，觉得他不像活人而畏惧' },
  { from: 'r6', to: 'r8', kind: 'kin', note: '小满让他想起失踪的女儿，会躲着走' },
  // 郑爷 r7
  { from: 'r7', to: 'r1', kind: 'rival', note: '怀疑蓑衣人，总在渡口不像活人' },
  { from: 'r7', to: 'r5', kind: 'rival', note: '疏远何叔，嫌他知道太多' },
  { from: 'r7', to: 'r6', kind: 'ally', note: '深夜码头酒友，相对无言' },
  { from: 'r7', to: 'r8', kind: 'kin', note: '不知小满是自己儿子，却会在他面前停步' },
  // 小满 r8
  { from: 'r8', to: 'r7', kind: 'kin', note: '远远看着郑爷，等父亲认出他' },
  { from: 'r8', to: 'r3', kind: 'kin', note: '依赖老王，荷包蛋是唯一被疼爱的时刻' },
  { from: 'r8', to: 'r4', kind: 'ally', note: '只有阿黎会和他好好说话' },
  { from: 'r8', to: 'r1', kind: 'ally', note: '敬蓑衣人为"最苦的人"' },
];

/* =========================================================================
 * 4) 轮回事件（活镇系统按 trigger 消费）
 * ========================================================================= */

export type LoopEventTrigger = 'loop-start' | 'fact-hit' | 'death' | 'choice';

export interface LoopEvent {
  id: string;
  trigger: LoopEventTrigger;
  /** 命中真相表事实时携带（呼应 factId 方案，如 r5:f2） */
  factId?: string;
  text: string;
}

/**
 * 示例轮回事件（3~5 条），覆盖四类 trigger，呼应「记忆复仇」与「小镇因你改变」：
 * - loop-start：每轮回开场氛围
 * - fact-hit：玩家戳中关键事实（含 3:17 记忆闪回）
 * - death：死亡轮回节点（埋下记忆复仇种子）
 * - choice：玩家抉择改变小镇走向
 */
export const loopEvents: LoopEvent[] = [
  {
    id: 'loop-start-1',
    trigger: 'loop-start',
    text: '又一个轮回开始。钟楼的钟停在 3:17，八盏灯还亮着。你提着灯笼走向渡口——这一回，你带着上一世的记忆。',
  },
  {
    id: 'fact-hit-clock',
    trigger: 'fact-hit',
    factId: 'r5:f2',
    text: '何叔的钟停在 3:17。你忽然想起：自己每一次，都是从水里被同一个人捞起来的。',
  },
  {
    id: 'death-1',
    trigger: 'death',
    text: '这一世你又死了。但这一回，有人记住了你没说完的那句话——下一世，它会变成一句质问。',
  },
  {
    id: 'choice-zhengye',
    trigger: 'choice',
    factId: 'r7:f1',
    text: '郑爷在 3:17 的渡口等你。你要不要告诉他：小满，一直在等他认？',
  },
  {
    id: 'choice-paperdoll',
    trigger: 'choice',
    factId: 'r4:f1',
    text: '阿黎的纸人今夜又走向渡口，最前面那个写着你的名字。你要不要，拦下它？',
  },
];

/* =========================================================================
 * 5) 记忆复仇（跨轮回记忆触发台词）
 * ========================================================================= */

/**
 * 跨轮回记忆复仇触发台词：当玩家携带上一世记忆再次审问时，
 * 对应居民以"我已经记得你"的姿态反将一军。factId 同全局方案。
 */
export const memoryRevenge: { factId: string; line: string }[] = [
  {
    factId: 'r5:f3',
    line: '「你又来了。」何叔头也不抬，「这次，你会记得 3:17 吗？我已经替你记了三十遍。」',
  },
  {
    factId: 'r1:f1',
    line: '「我捞过你七次了。」蓑衣人低声说，「第七次，你该想起来了吧——你是我哥捞不回来的那个弟弟。」',
  },
  {
    factId: 'r8:f3',
    line: '「你不记得了，」小满平静地说，「但渡口记得。从第一世起，它就记着你，也记着你对每个人的亏欠。」',
  },
];
