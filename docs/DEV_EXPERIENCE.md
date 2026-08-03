# 轮回渡口 · P1/P2 开发经验总结

> 主理人（游承峰）汇编 · 关联：`ROADMAP.md`（阶段规划）、`DEV_LOG.md`（开发流水）、`DEVELOPMENT.md`（环境/命令）
> 文档定位：**实战经验沉淀**（实现要点 / 复用策略 / 故障修复参考），面向后续迭代与同类项目。
> 覆盖阶段：P1 核心体验验证 + P2 活镇与内容扩展 的首轮可玩交付（截至 2026-08-03，工作树领先 origin/main 20 commits）。

---

## 0. 一句话结论

P1/P2 用 **纯前端零后端离线判定** + **2.5D 程序化演出（R3F）** + **Web Audio 程序化音频** 三条路线，把"轮回渡口"做成**开箱即玩、零 token 成本、可随时 `git checkout` 回退**的可玩切片。质量门控 PASS（web 32/32、tsc 0、根 65/65），发布就绪 READY-WITH-NOTES。

---

## 1. 实现要点（关键架构决策与落地）

### 1.1 离线可玩：引擎真相表"浏览器安全"重构
- **痛点**：`@lunhui/engine` 原真相表判定逻辑 import `node:fs`（用于服务端加载居民数据），浏览器/Vite 打包会失败。
- **决策**：把纯判定逻辑（`normalize` / `matchFact` / `judgeAsk` / `AskFallback` / `AnswerMode`）抽到 `packages/engine/src/truth.ts`，**不 import node:fs**；通过 `package.json` 子路径导出 `"./truth"`、`"./types"` 暴露给 web。
- **数据生成**：`packages/engine/scripts/build-browser-data.mjs`（node 侧，用 `resident-loader` 的 fs）读取居民真相，序列化为浏览器安全静态数据 `packages/web/src/data/truthData.generated.ts`（8 居民 / 24 事实，`keywords[residentId][factId]` 二级索引）。`.gitignore` 用 `!packages/web/src/data/**` 取反放行生成文件。
- **收益**：web 离线客户端 `offlineClient.ts` 复用 `judgeAsk` + `truthData` 做**确定性判定，零 LLM token、零后端**，直接 `npm run dev` 即玩。

### 1.2 视觉：2.5D 程序化雨夜（R3F，不烧 token）
- 纯程序化：`instancedMesh` 雨（单 draw call）+ 汤碗暖光 sphere+pointLight 经 Bloom + EffectComposer(Bloom/Vignette/Noise) + `useFrame` 相机 sin 视差。
- 模式响应：`silence`（命中关键→相机推近+雨淡+暖光压暗，呼应"沉默三秒"）、`memory`（琥珀 ghost planes 叠影）。
- 颜色**全部来自 `visual/theme.ts` 的 token**，grep 确认 `RainNight.tsx` 零字面 hex——这是美术/工程契约的硬约束（见 §3.2）。

### 1.3 音频：Web Audio 程序化（零音频文件）
- `audio.ts` 纯原生 API：`createNoiseBuffer` 白噪低通+LFO 雨声床；65/98Hz 双振荡器暖光 pad；`playReveal` 钟鸣泛音（C5 分音）、`playReject` 低沉否定音；`setSilence` 把雨声渐弱、暖光 pad 保留并压暗。
- 自动播放策略：AudioContext 在首次 `start()` 惰性创建，**必须用户手势触发**（App 在首次"提问"点击内 `createAudioEngine().start()`）。
- 全链路 guard：无 `AudioContext`/`document`（测试/SSR）时 no-op 不抛错。

### 1.4 沉默三秒：音画对齐契约（跨成员一致）
- 视觉收束窗口 `SILENCE_MS=2600`（App 用 `setTimeout`），音频过渡 = `silenceMs × 0.16 ≈ 416ms`，落美术规范 T1(0–500ms) 窗口，音画同帧。
- 契约三件套：`onSilenceStart/onSilenceEnd` 钩子（App 内 `setSilence(true/false)`）、统一 `SILENCE_MS` 常量、统一 `--c-*` CSS 变量、全链路 no-op guard。

### 1.5 活镇内容：事实 id 全局方案
- 引擎真相表 Fact.id 是**局部**（f1/f2/f3，居民内唯一）；活镇内容用 `<居民id>:<局部factId>` 全局（`r5:f2` = 何叔钟停 3:17）。
- 离线端拼接 `globalFactId = ${residentId}:${hitFactId}` 与 `livingTown.ts` 对齐——**不修改 livingTown.ts**（尊重"不要另起炉灶"约束）。

---

## 2. 复用策略（优先复用，避免手搓）

| 复用对象 | 用途 | 备注 |
|---|---|---|
| `@lunhui/engine/truth` + `truthData.generated` | 确定性真相判定 | 零 token；不手搓判定逻辑 |
| `@react-three/fiber` + `drei` + `@react-three/postprocessing` | 2.5D 演出 | 声明式复用现成雨/粒子/Bloom，不手搓 WebGL |
| 原生 Web Audio API | 程序化音频 | 零 npm 依赖、零音频文件 |
| 成员文件域互斥 + 预定义导出契约 | 并行开发不冲突 | art→`visual/`、design→`content/`、audio→`audio/`、eng→`engine/`+`scene/`+`api.ts` |
| T7 统一 Vitest Workspace | 三包测试一致 | 根 `npm test` 一把跑全 |
| T8 changesets | 版本化 | 已配置 baseBranch main，待 `changeset version` 生效 |
| `truthData.generated.ts` 构建期生成 | 避免手维护静态数据 | node 侧 fs 读取 → 序列化，gitignore 取反放行 |

**反例（不要做的）**：曾想"扫一遍项目自己手写判定/手写 WebGL/手写音频"——一律被"优先复用现有模块与依赖"原则否决，改用引擎真相表 + R3F + Web Audio。

---

## 3. 故障修复参考（实测踩坑 + 根因 + 解决）

### 3.1 npm 12 拒绝 `workspace:`/`link:` 协议
- **现象**：`ideal-tree` 解析期抛 `EUNSUPPORTEDPROTOCOL`。
- **根因**：npm 12 对 monorepo 内部依赖的 `workspace:*` / `link:` 协议不支持。
- **解决**：改用 `file:../engine` 本地 symlink，`@lunhui/engine/truth` 正确解析到 `dist/truth.js`。

### 3.2 `.gitignore` 误吞生成文件
- **现象**：`truthData.generated.ts` 被 `.gitignore` 忽略，CI/克隆后缺数据。
- **解决**：加 `!packages/web/src/data/` 与 `!packages/web/src/data/**` 取反放行（生成文件也要进版本库，否则离线判定数据源缺失）。

### 3.3 构建脚本路径算错
- **现象**：`build-browser-data.mjs` 把输出写到 `packages/engine/web`（误路径）。
- **根因**：`import.meta.url` 含文件名，首个 `..` 剥掉文件名而非目录。
- **解决**：改用 `path.dirname()` 修正目标为 `packages/web/src/data`；残留误路径被 gitignore 忽略（临时，已不再产生）。

### 3.4 keywords 索引塌缩
- **现象**：事实 id 仅居民内唯一（r1–r8 复用 f1/f2/f3），扁平 `keywords[f.id]` 被后写居民覆盖。
- **解决**：改为按 `residentId -> factId` 二级索引（生成 8 条，互不覆盖）。

### 3.5 api.ts 自导入 / AskResult 导入源错误
- **现象**：vitest（esbuild 擦类型）掩盖，直到 `tsc --noEmit`（S4 阶段）才报。
- **根因**：`AskResult` 从错误路径导入 + 模块自导入。
- **解决**：统一从 `@lunhui/engine/types` 取类型（commit cb3ab88）。

### 3.6 集成测试"memories 元素类型"误判
- **现象**：硬化测试写 `mem.memories.some((m) => m.includes(...))` 报 `Property 'includes' does not exist`。
- **根因**：`memory()` 返回元素是 `{ content, strength, loop_id }`，不是裸 string。
- **解决**：改为 `m.content.includes(...)`。（本次 P1/P2 收尾实测踩到，已修。）

### 3.7 memoryRevenge 被 pause 误杀（🔴 阻塞，已修）
- **现象**：`offlineClient.ts` 复仇注入在 `if(hitFactId && pause)` 内；真相表 r5:f3 / r8:f3 为 `isKey:false` → `pause=false`，**2/3 复仇台词永不可达**（死代码）。
- **根因**：设计意图是"跨轮回记忆复仇命中即触发"，却被半成品逻辑用 `pause` 误门控。
- **解决**：拆成两个独立分支——关键事实（pause=true）入记忆逻辑不变；复仇改为独立 `if(globalFactId)` 分支（commit 1f48d56）。补 4 条硬化测试钉死（3:17 命中、r5:f3 复仇可达、r1:f1 headroom、未命中不注入）。

### 3.8 worker "completed" 但空跑（流程教训）
- **现象**：engineering-lead 回复"completed"但实际无新 commit，阻塞修复未落地。
- **根因**：reactivation 链路回响触发状态翻转，agent 未真正执行写操作。
- **处理**：主理人 trust-but-verify（核对 `git log`），未让其返工，直接落地确定性补丁兜底（符合"worker 失约而修复路径已被完全 synthesize 时主理人兜底"例外）。**教训**：任何"完成"声明都需核对 git/产物，不轻信标签。

---

## 4. 质量硬化要点（验证驱动，先测后写）

- **门控前置**：每个阶段切换走质量门（设计评审 / 架构评审 / 烟雾测试 / 发布检查）。本次 P1/P2 由 quality-lead 独立重跑复核，🔴 FAIL→🟢 PASS（7/7）。
- **回归旧伤**：memory 不卡死（P0 修复）、3:17 命中、沉默音画同步、离线零 token 必须回归不退化。
- **测试硬度**：不要只断言 `hitFactId truthy`，要钉死具体值（=== 'f2'）+ 副作用（memory 含闪回文案），防"测试通过但行为漂移"。
- **tsc 不能省**：esbuild 擦类型会掩盖类型错误，必须 `tsc --noEmit` 单独把关（§3.5）。

---

## 5. 已知风险与缓解（发布就绪，非阻断）

| 风险 | 等级 | 缓解 |
|---|---|---|
| JS 单包 >500KB（three/R3F 致） | 低 | 后续 manualChunks / 懒加载优化 backlog |
| 视听效果需人工浏览器走查 | 信息项 | 预览部署后人工验证雨水/Bloom/音频 |
| 工作树 `tests/` 未跟踪（QA 产物） | 极低 | 收尾统一提交，不影响构建/回退 |
| 发版前仅跑 `vite build` 未重跑 tsc | 极低 | 质量门控已确认 tsc=0，发版前 `npm run build` 双保险 |

---

## 6. 后续迭代清单（建议）

1. **包体积**：`manualChunks` 拆分 three/R3F，或按需懒加载 `RainNight` 演出层。
2. **RainNight 颜色单测**：当前仅 grep/静态保证"颜色来自 theme"，建议补"theme 变更→画面色值同步"单测。
3. **live 模式联调**：真实 LLM/后端（Fastify 5 + better-sqlite3 + openai）的在线路径尚未端到端联调；离线为默认，线上需 `VITE_OFFLINE=false` 切换。
4. **内容规模**：活镇关系网/事件活系统、i18n、全阵容美术按 ROADMAP Phase 2 推进。
5. **多端壳**：Tauri 桌面 / Capacitor 移动（呈现层可替换，内核/API 不变）。

---

_经验沉淀原则：实现要点记"为什么这么决策"，复用策略记"优先复用什么、别手搓什么"，故障修复记"现象→根因→解决"且可复现。_
