# 活镇（Living Town）内容扩展设计规格

> 关联文件：`packages/web/src/content/livingTown.ts`（数据模块）、`packages/engine`（真相表）
> 设计支柱：① 居民不是答题 NPC，而是会记住你的「活人」；② 你的记忆是武器，也是诅咒；③ 每个选择都会重塑小镇。

---

## 1. 概述

「活镇」把核心玩法（每轮回 10 个问题额度审问 8 位居民、推理真相、死亡轮回、带记忆重来）从**单轮回问答**扩展为**跨轮回的活关系网**。本规格定义：

- 居民内容的富集方式（`livingTownResidents`）
- 秘密与真相表的呼应关系（`residentSecrets`）
- 关系网如何驱动事件（`residentRelations`）
- 轮回事件总线（`loopEvents`）
- 跨轮回记忆复仇（`memoryRevenge`）
- 多结局分支雏形
- 与 engine 真相表的衔接约定

**红线（engine 已定）**：真相表（`secretFacts`）是唯一谜底，不可变、不可由本模块发明新事实。本模块只**引用**事实，不**新增**事实。

---

## 2. 居民规模路线图

数据模块以「聚合数组 + 派生接口」结构承载规模增长，避免改动 `residents.ts`。

| 阶段 | 居民数 | 内容重点 | 接入方式 |
|------|--------|----------|----------|
| MVP（当前） | 8 | 复用 web `r1..r8`，富集 `interrogate` 占位 | 已落地于 `livingTownResidents` |
| P2 扩展 | 12 | 新增 4 位「边缘人」（如渡船娘、更夫、私盐贩、弃婴养母），补 `secret`/`relation` | 在数组中追加 `LivingTownResident`，保持 id 唯一（`r9..r12`） |
| 愿景 | 20 | 居民轮换登场（每轮回随机 8 位活跃，其余休眠），关系网动态收束 | 由活镇系统在 `livingTownResidents` 上做子集采样，本模块只增不减 |

**扩展约束**：新增居民须先在 engine `SOUL.md` 落真相表（含 `f1/f2/f3`），再在本模块补 `interrogate` / `secret`（`hint` 必须标注 `r<id>:f<n>`），最后补 `relation`（至少 2 条，避免孤立节点）。

---

## 3. 关系网如何驱动事件

`residentRelations` 将 engine 的 `stance` 归一为 4 类 `kind`，活镇事件系统按 kind 决定触发倾向：

| kind | 含义 | 事件驱动倾向 |
|------|------|--------------|
| `ally` | 盟友 | 玩家揭其秘密 → 该居民**协助**玩家（提供额外线索 / 降低其他居民戒备） |
| `rival` | 对手 | 玩家揭其秘密 → 该居民**对抗**（隐瞒 / 误导 / 触发防御事件） |
| `kin` | 血亲（含拟亲） | 玩家促成相认 → 解锁分支（如 r1↔r3、r7↔r8 父子线） |
| `debt` | 亏欠（恩/疚） | 玩家曝光亏欠 → 触发赎罪或崩溃事件（如 r6 对 r2 的愧疚） |

**驱动示例**：当玩家命中所指 `factId = r7:f1`（郑爷 3:17 等妻），且 `r8→r7` 为 `kin`，事件系统优先推送 `choice-zhengye`（是否告诉郑爷小满身份），成功则解锁「父子相认」分支，改变下一轮回小满的台词与郑爷的巡逻路线。

---

## 4. 记忆复仇机制

核心爽点：NPC 也「记得」你。机制分两层：

1. **事实记忆闪回**：玩家命中关键事实时，除 engine 的「汤主沉默三秒」外，活镇叠加 `loopEvents`（trigger=`fact-hit`）做记忆演出（如 `fact-hit-clock` 的 3:17 闪回）。
2. **跨轮回复仇台词**：`memoryRevenge` 是携带上一世记忆再次审问时的反将一军。触发条件：玩家在**上一世**已命中该 `factId`，本世再次审问同一居民 → 系统替换为复仇台词（如 `r1:f1` 蓑衣人「我捞过你七次了」）。

> 数据边界：`memoryRevenge[].factId` 仅作引用，实际「是否已命中」由 server/loop-service 的 `memories` 表追踪，本模块不持有运行时状态。

---

## 5. 与 engine 真相表的衔接约定

### 5.1 factId 全局方案

engine 每条 `Fact.id` 为**局部 id**（`f1/f2/f3`），非全局唯一。本模块统一采用：

```
factId = "<居民id>:<局部factId>"     例如  r5:f2
```

- **居民 id**：web `residents.ts` 与 engine `SOUL.md` frontmatter **完全一致**，均为 `r1..r8`。
- **目录名误区**：engine 源目录名为 `r5-heshu` 等，那只是文件组织名；`Resident.id` 仍是 `r5`。本模块一律用 `r5` 而非 `r5-heshu`，避免双层命名混淆。
- **示例呼应**：何叔钟停 3:17 → engine `SOUL.md` 中 `r5` 的 `f2`（关键词「3:17 / 钟停 / 落水」）→ 本模块 `secret-r5.hint` 标注 `r5:f2`，`loopEvents.factId` 与 `memoryRevenge.factId` 同理引用。

### 5.2 字段对照

| 本模块 | engine | 说明 |
|--------|--------|------|
| `livingTownResidents[].interrogate.prompts` | `Fact.keywords` | 追问措辞刻意命中关键词，使审问可走纯规则判定（不调 LLM） |
| `residentSecrets[].hint` | `Fact.id` / `Fact.keywords` | 显式标注 `r<id>:f<n>` 与关键词 |
| `residentRelations` | `Relation[]`（stance/note） | stance 归一为 4 类 kind |
| `loopEvents[].factId` | `Fact.id` | 事件与真相表的事实绑定 |
| `memoryRevenge[].factId` | `Fact.id` | 跨轮回复仇绑定到具体事实 |

### 5.3 一致性校验建议

- 新增 `secret` 时，`hint` 中的 `r<id>:f<n>` 必须能在 engine `SOUL.md` 找到对应居民与事实。
- CI 可加一条规则：扫描 `livingTown.ts` 中所有 `r\d+:f\d+`，反查 engine residents 目录，缺失即报错。

---

## 6. 多结局分支树雏形（≤3 层）

以「是否促成关键相认」为主干，3 层内收敛为 4 个结局：

```
[根] 第 N 轮回结束（携带记忆）
 ├─ L1: 是否揭穿 3:17 真相（r5:f2）
 │   ├─ 是 ── L2: 是否告诉郑爷小满身份（r7:f1 × r8:f2, kin）
 │   │         ├─ 是 → L3: 父子相认 → 结局A「摆渡人归岸」（小镇停止轮回）
 │   │         └─ 否 → L3: 郑爷终身守望 → 结局B「无人靠岸」
 │   └─ 否 ── L2: 是否拦下写着你名字的纸人（r4:f1）
 │             ├─ 是 → L3: 纸人还愿中断 → 结局C「你替自己收尾」
 │             └─ 否 → L3: 纸人替你上船 → 结局D「又一次沉默的轮回」
```

- **结局 A**（真结局）：需同时命中 `r5:f2` + 促成 `r7↔r8` 相认，且 `r1↔r3` 兄弟线已解锁。
- **多结局数据落点**：分支条件由 `loopEvents`(trigger=`choice`) 收集玩家选择，由 server `flags` 记录，本模块只提供事件文本与 `factId` 绑定，不做状态判定。

---

## 7. 待工程负责人（程基岩）接入的点

1. `livingTownResidents` 元素类型为 `LivingTownResident`（派生自 web `ResidentMeta`），可直接用于审问 UI 的 `interrogate` 字段。
2. `residentSecrets` / `residentRelations` / `loopEvents` / `memoryRevenge` 均为纯数据导出，按字段消费即可。
3. **本模块不 import engine 的 fs 模块**，factId 衔接靠约定（§5），运行时由 server 负责解析。
