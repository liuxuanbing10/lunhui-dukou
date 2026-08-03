# P1/P2 整合 · 质量硬化回归报告

- 项目：`D:/Projects/lunhui-dukou`（轮回渡口 Web 叙事游戏）
- 范围：刚完成的 P1/P2 整合（活镇内容、RainNight 视觉、audio 引擎、离线客户端/api 回退）
- 角色：**quality-lead（仅验证 + 产出本报告，未修改任何源码/设计文件）**
- 工作树状态：领先 `origin/main` 14 commits，`git status` clean（已确认）
- 关注点：**核心旧伤是否复发** + **新接入是否真正生效**

> **复核记录**：首版报告（2026-08-03）对点 3 打出 🔴 FAIL 阻塞项（`memoryRevenge` 被 `pause` 误杀）。主理人于 **commit 1f48d56** 兜底修复并入库。本版为复核刷新：重读修复代码 + 重跑测试，确认阻塞已消除，门控由 FAIL 转为 ✅ PASS。

---

## 0. 测试运行实测（门控基线）

| 命令 | 首版结果 | **复核结果** | 说明 |
|---|---|---|---|
| `cd packages/web && npx vitest run` | 29 passed | ✅ **6 files / 32 tests passed** | +3（offlineClient 6→9） |
| `cd packages/web && npx tsc --noEmit` | exit 0 | ✅ **exit 0（0 类型错误）** | 类型安全 |
| `cd . && npm test`（根 workspace） | 62 passed | ✅ **12 files / 65 tests passed** | +3（offlineClient 6→9） |

> 注：测试全绿只代表"既有断言通过"，不代表本报告中逐项验收点都被钉死（见各点说明）。测试全绿 ≠ 验收点全满足，但本复核中新增用例已钉死原 CONCERNS/FAIL 项。

---

## 验收点逐条结论

### ✅ 验收点 1 · memory 相位不卡死（P0 修复）—— **PASS**

**验收标准**：`handleNextLoop → setPhase('memory') → MemoryPhase 的 onContinue={() => setPhase('intro')}` 链路完整，无死循环 / 未处理分支 / 卡死。

**实测证据**
- `App.tsx:135-154` `handleNextLoop`：拉 `api.memory()` → `setMemoryLines(mem.memories.map(m=>m.content))` → `setPhase(mem.memories.length > 0 ? 'memory' : 'intro')`。记忆非空才进 `memory`，否则直接 `intro`，分支完整。
- `App.tsx:192-194` `<MemoryPhase lines={memoryLines} onContinue={() => setPhase('intro')} />` —— 点击「醒来，继续这趟渡口」即回到 `intro`，明确出口，无死循环。
- `MemoryPhase.tsx:8` `if (lines.length === 0) return null;` —— 空记忆直接不渲染，与 `App` 的 `memories.length>0` 判定自洽，无悬空分支。
- `components/phases.test.tsx:93-102` 显式测试「点击触发 onContinue（修复 memory 相位卡死）」+ `:86-91`「无记忆返回 null」。该回归被固化。

**判定**：PASS（旧伤未复发，且有针对性回归测试）。

---

### ✅ 验收点 2 · 3:17 命中（含下一轮记忆闪回）—— **PASS**

**验收标准**：`offlineClient.ask('r5','钟停在 3:17')` → `hitFactId==='f2'` 且 `pause===true`；下一轮 memory 应包含 `loopEvents` 中 `factId='r5:f2'` 的 text（钟停闪回）；有对应测试固化。

**实测证据**
- `truthData.generated.ts` r5 事实：`f2` = `{ id:'f2', isKey:true, keywords:['3:17','三点十七','钟停','落水'] }`。
- `truth.ts:114-122`：`fact.isKey` → 返回 `{ hitFactId:'f2', pause:true, usedLlm:false }`。
- `offlineClient.ts:90` `globalFactId = 'r5:f2'`；`:94-97` 命中 `loopEvents` 中 `factId==='r5:f2'` 的 `fact-hit` 事件（`livingTown.ts:268-273` 文案"何叔的钟停在 3:17…"），把钟停闪回文本追加到 `answerText`；`:99-102` 因 `pause===true` 把 `answerText` 推入 `s.memories`。
- 逻辑链成立：**下一轮 `api.memory()` 必含 `r5:f2` 钟停闪回文本**。
- ✅ **复核更新**：`offlineClient.test.ts:62-72` 已钉死该路径 —— `ask('r5','钟停在 3:17 是为什么？')` → `hitFactId==='f2'`、`pause===true`、`res.answer` 含 `'从水里被同一个人捞起来'`、`memory` 含同一闪回文案。**首版的 CONCERNS（测试未钉死 f2 / 闪回）已消除。**

**判定**：PASS（逻辑正确、记忆注入生效，且已被硬化测试钉死）。

---

### ✅ 验收点 3 · memoryRevenge 跨轮回注入 —— **PASS**（原 🔴 FAIL 阻塞已修复）

**验收标准**：`ask('r5','你记得吗') → hitFactId==='f3'`、`pause===false`；**memory 应包含 `memoryRevenge` 中 `factId='r5:f3'` 的 line**；匹配逻辑在代码中真实存在且有测试覆盖。

**首版问题（已修复）**：首版发现 `offlineClient.ts:100` 的复仇注入被 `result.pause` 门控，而 `pause` 由 `fact.isKey` 决定；所有居民 `f3` 均为 `isKey:false`，导致 `memoryRevenge` 中 `r5:f3`、`r8:f3` 永远不可达，验收要求的"memory 含 `r5:f3` 复仇 line"无法满足。

**复核实测（commit 1f48d56 修复后）**
- `offlineClient.ts:99-109` 现拆分为两条独立分支：
  - `:99-102` 关键事实（`hitFactId && pause`）→ 把当场回答/叙事存入记忆（行为不变）；
  - `:103-109` **跨轮回记忆复仇已解耦为独立 `if (globalFactId)` 分支**，命中对应 factId 即注入，不再被 `result.pause` 门控。附注释说明解耦理由（避免 2/3 复仇台词成死代码）。
- 因此 `ask('r5','你记得吗')`（`f3`，`pause=false`）现在会执行 `:106-108`：匹配 `memoryRevenge` 中 `r5:f3` → 把 `'已经替你记了三十遍'` 复仇台词推入 `s.memories`。**验收后半段现已成立。**
- `livingTown.ts:301-314` 的 `memoryRevenge` 三条（`r5:f3`/`r1:f1`/`r8:f3`）现已全部可达。
- ✅ **测试覆盖（offlineClient.test.ts 6→9）**：
  - `:74-83` 钉死非关键事实复仇可达：`ask('r5','你是不是都记得？')` → `hitFactId==='f3'`、`pause===false`、`memory` 含 `'已经替你记了三十遍'`；
  - `:85-92` 钉死未命中不注入任何复仇/记忆台词；
  - `:51-60`（r1:f1 关键事实）、`:62-72`（r5:f2 3:17）维持 headroom。

**判定**：✅ **PASS**。阻塞项已通过"解耦 pause"修复，`r5:f3`/`r8:f3` 现已可达，且有硬化测试覆盖。首版 FAIL 不适用。

---

### ✅ 验收点 4 · RainNight 零硬编码 —— **PASS**（附 CONCERNS：未单测）

**验收标准**：`grep RainNight.tsx` 无字面 hex 颜色、无 `COLORS` 引用，全部来自 `theme.ts` 的 `theme.*`（rain.base / warm.soul / memory.amber / rain.drop）。

**实测证据**
- 通读 `RainNight.tsx`（184 行）：颜色均取自 `theme` —— `theme.warm.soul`（`:118,122,123`）、`theme.memory.amber`（`:133,137,141`）、`theme.rain.drop`（`:151`）、`theme.rain.base`（`:166,167`）。
- Grep `[0-9a-fA-F]{6}|COLORS` 于 `RainNight.tsx`：**零命中**（无任何字面 hex，无 `COLORS` 引用）。
- 仅有的数值字面量（如 `intensity={0.12}`、`opacity={0.5}`）是亮度/透明度标量，非颜色，符合要求。
- `theme.ts` 确为单一颜色来源（含 `rain.base/mist/drop/fog`、`warm.soul/glow/ember`、`memory.amber/rust/ghost` 等 token）。

**CONCERNS**：`RainNight.test.tsx`（3 用例）只验证 Canvas 在 idle/memory/silence 下可渲染，**未单测"颜色来自 theme"**。该属性靠静态审查 + grep 保证，无回归护栏。

**判定**：PASS（静态证据充分）；建议补一条断言某 mesh 的 `color` prop 等于 `theme.xxx` 的用例。

---

### ✅ 验收点 5 · theme 注入幂等 —— **PASS**

**验收标准**：`theme.test.ts` 通过；`App.tsx` 挂载时调用 `injectThemeVars()`。

**实测证据**
- `App.tsx:49-51` `useEffect(() => { injectThemeVars(); }, [])` —— 挂载即注入 CSS 变量。
- `theme.test.ts`（3 用例，vitest 通过）：写 `--c-warm-soul` 且值等于 `theme.warm.soul`；**幂等**：连调两次不产生额外属性、值一致。
- `theme.ts:63-80` `injectThemeVars` 无 `document` 时直接返回（SSR/测试安全），遍历 token 写 `--c-{group}-{key}`，后写覆盖前写，天然幂等。
- `tsc --noEmit` exit 0，类型契约完整。

**判定**：PASS。

---

### ✅ 验收点 6 · 离线零 token —— **PASS**

**验收标准**：`ask` 未命中走 `FALLBACK_TEXT`，`judgeAsk` 返回 `usedLlm=false`，绝不调 LLM；审查 `offlineClient.ts` 与 `api.ts` 的 `OFFLINE` 回退路径（`import.meta.env.VITE_OFFLINE`）。

**实测证据**
- `offlineClient.ts:19` `FALLBACK_TEXT`（保守兜底）；`:82-86` `judgeAsk` 的 fallback 返回 `{ text: FALLBACK_TEXT, usedLlm: false }`；`:19` 注释明确"不调 LLM"。
- `truth.ts:91-103`（未命中）与 `:114-129`（命中）两条路径均 `usedLlm:false` —— **offline 路径 `usedLlm` 恒为 false**，且全程无 LLM 端点调用。
- `api.ts:44` `const OFFLINE = import.meta.env.VITE_OFFLINE === 'true'`；`:62-64` `withOfflineFallback`：`OFFLINE` 为真 → 直接 `offline()`（零网络、零 token）；否则先试在线 `fetch`，失败再回退离线。在线成功时也不会触发 LLM（引擎服务端侧另算，不属离线客户端范畴）。
- `offlineClient.test.ts:17-22` 验证未命中走兜底且 `usedLlm===false`；`:7-15` 验证命中 `usedLlm===false`。

**判定**：PASS（离线客户端零 token 已固化；`OFFLINE` 回退路径审查无误）。

---

### ✅ 验收点 7 · 沉默音画同步 —— **PASS**（附 minor note）

**验收标准**：`App.tsx` 命中关键 → `setSilence(true)+playReveal()`、2600ms 后 `setSilence(false)`；`audio.ts` 的 `setSilence` 过渡时长（默认 `2800×0.16≈448ms`）落在视觉 T1 窗口。

**实测证据**
- `App.tsx:93-101`：命中（`res.hitFactId && res.pause`）→ `setSilenceActive(true)`、`audio.setSilence(true)`、`audio.playReveal()`、`setTimeout(2600)` → `setSilenceActive(false)`、`audio.setSilence(false)`、`setPhase('choice')`。链路完整。
- `audio.ts:49-50` `SILENCE_TC_FACTOR=0.16`、`DEFAULT_SILENCE_MS=2800`；`:124,131` `silenceTransitionMs = silenceMs × 0.16`；`App` 用默认引擎 → **过渡 = 2800×0.16 = 448ms**。
- `audio.ts:48` 注释明确 T1 窗口为 `0–500ms`（视觉暖光收束窗口）；**448ms < 500ms → 音频收敛落进 T1 窗口**，与 `RainNight` 的 `dt*2` 缓动（~0.5s）同帧收敛，音画同步成立。
- `audio.test.ts` 验证 `createAudioEngine` 形状完整 + jsdom 无 `AudioContext` 时任意方法不抛错（guard 安全）。

**minor note**：`App` 的静默窗口硬编码 `2600ms`，而 `audio` 默认 `silenceMs=2800`（仅缩放过渡系数、过渡恒 448ms）。两者差 200ms 仅影响"静默总时长"观感，不影响 onset 同步（448ms<T1）。若要求严格一致，可把 `setTimeout(2600)` 改为读取同一常量。属 cosmetic，不降级。

**判定**：PASS。

---

## 1. 总体门控结论

> ### 🟢 **PASS（通过）**

| # | 验收点 | 首版 | **复核** |
|---|---|---|---|
| 1 | memory 相位不卡死（P0 修复） | ✅ PASS | ✅ PASS |
| 2 | 3:17 命中 + 记忆闪回 | ✅ PASS（CONCERNS） | ✅ **PASS**（已钉死，CONCERNS 消除） |
| 3 | memoryRevenge 跨轮回注入 | ❌ FAIL（阻塞） | ✅ **PASS**（阻塞已修复） |
| 4 | RainNight 零硬编码 | ✅ PASS | ✅ PASS |
| 5 | theme 注入幂等 | ✅ PASS | ✅ PASS |
| 6 | 离线零 token | ✅ PASS | ✅ PASS |
| 7 | 沉默音画同步 | ✅ PASS | ✅ PASS |

**7 PASS / 0 FAIL**。核心旧伤（点 1 memory 卡死）确认未复发；视觉/主题/离线/音画同步/活镇记忆复仇等新接入均真实生效。

**首版阻塞项（点 3）复核结论**：commit 1f48d56 已通过把 `memoryRevenge` 注入从 `result.pause` 门控解耦为独立的 `if (globalFactId)` 分支修复；`r5:f3`/`r8:f3` 非关键事实现可达，验收要求的"memory 含 `r5:f3` 复仇 line"成立；`offlineClient.test.ts` 已由 6→9 用例，钉死 3:17(f2)、非关键事实复仇(f3)、关键事实 headroom(r1:f1)、未命中不注入。门控由 🔴 FAIL 转为 🟢 PASS。

**附属 CONCERNS（非阻塞，建议跟进）**
- 点 4：补"颜色取自 theme"的单测（当前仅静态/grep 保证）。
- 点 7：统一 `2600ms`（App）× `2800ms`（audio 默认）的静默时长常量（cosmetic）。

**放行建议**：P1/P2 整合已达质量门控，**可放行**。上述两条 CONCERNS 为优化项，不阻塞发布。是否放行最终由主理人决定（本门控为建议性）。

---

*报告生成：quality-lead（仅验证，未改源码/设计）。首版 + 复核均基于源码行号 + 实测测试输出。复核验证方式：Read 重读 `offlineClient.ts:99-109` 与 `offlineClient.test.ts:51-92`，并重跑 web vitest(32)/tsc(0)/根 npm test(65) 独立核对。*
