# 轮回渡口 · 未来规划与阶段性执行清单（Roadmap）

> 主理人（游承峰）汇编 · 关联：`DEV_PLAN.md`（总体规划）、`art-style-standard-2.5d.md`（已定稿视觉标准）、`PROJECT_ANALYSIS.md`（现状诊断）
> 文档状态：**v1 定稿** ｜ 更新：2026-08-03
> 统一视觉标准已锁定：**2.5D**（2D 动态插画+立绘 为基底 + 伪 3D 演出），不采真 3D。

---

## 0. 总体定位（一句话）

**把现有「能跑通的瘦垂直切片」硬化为生产级底座，再以「会记住你、因你死亡而改变的社交推理小镇」为核心体验，做出对标叙事名作的现象级 AI 互动叙事产品。**

- 核心玩法锚点：**海龟汤悬念 × 狼人杀欺骗 × 摆渡人轮回叙事**（市场无「AI 活镇 + 死亡轮回 + 社交推理」三位一体）。
- 平台路线：Web 优先（React19+Vite6）→ 桌面 Tauri/Godot 壳 → 移动 Capacitor 壳（呈现层可替换，内核/API 不变）。
- 美术路线：**2.5D 统一标准**（见 `art-style-standard-2.5d.md`）。

---

## 1. 四阶段路线图（对齐六职能里程碑）

| 阶段 | 目标 | 关键产物 | 退出条件（DoD） |
|---|---|---|---|
| **Phase 0 地基硬化**（≈已完成） | 修 P0 裂缝、复活 CI/测试、统一质量门、契约先行 | P0 已修；T7 统一 Vitest（40 用例全绿）；T8 changesets 已落地；2.5D 标准定稿 | 干净环境 `npm test` 全绿；changeset status 有效；风格标准 doc 发布 |
| **Phase 1 核心体验验证** | 完整轮回可玩、沉默三秒手感、记忆轮回、美术核心阵容 + 音频静默原型、staging | 可玩垂直切片 v0.2；2.5D 演出管线 v1；音频静默原型 | 封闭 alpha 玩家心流时长 ≥ 目标；沉默三秒 pause 手感通过评审 |
| **Phase 2 活镇与内容扩展** | 事件+双向真相表、AI 血肉回流、记忆复仇、全阵容美术、i18n、封闭 beta | 内容规模翻倍；关系网/事件活系统；beta 包 | beta 留存/「记忆复仇」触发率达标；多语言骨架完成 |
| **Phase 3 现象级打磨与多端** | 打磨、Tauri 桌面 / Capacitor 移动、Godot PoC、公开发布、UGC/赛季/社区 | 公开发布 v1.0；多端壳；运营体系 | 性能预算达标；崩溃率 < 阈值；首发口碑/传播指标达标 |

---

## 2. 已落地基础（Phase 0 收尾成果，本次确认）

| 模块 | 成果 | 验证 |
|---|---|---|
| **P0 修复**（前序） | memory 卡死、asking 死代码、3:17 失配、dist 污染、CI 复活、测试解耦 .env | engine 3/3、server 26/26、web tsc 0 错 + phases 7/7 |
| **T7 测试统一** | 三包统一 Vitest，根 `vitest.workspace.ts` + `vitest.config.ts`；迁移 6 个 node:test 文件 → vitest | `npm test` **40/40 通过**（实测） |
| **T8 版本化** | `@changesets/cli` 已装；`.changeset/config.json` + README + 初始 changeset；`release` 安全方案（version+build） | `changeset status` 有效，三包待 bump patch |
| **2.5D 标准** | `docs/art-style-standard-2.5d.md` v1 定稿，9 章含沉默三秒量化时序、2.5D 技法、资产规格、验收清单 | 文档发布，后续资产强制对齐 |

---

## 3. 阶段性执行清单（可勾选任务卡）

### Phase 1 · 核心体验验证（建议 4~6 周）
- [ ] **P1-1 2.5D 演出骨架**：实现 `art-style-standard-2.5d.md §4` 五大技法中的「视差推拉 + 暖光收束」最小集，先落地**沉默三秒镜头演出**（pause 时推近 + 暖光收束 + 音频渐弱）。负责：art-director + engineering-lead。验收：命中关键真相触发 2800ms pause + 视觉收束，手感评审通过。
- [ ] **P1-2 音频静默原型**：Web Audio 实现「沉默三秒」静默/留白 + 雨/钟/渡船环境音；与 pause 机制对齐。负责：audio-director。验收：命中关键有可感知静默谷 + 渐弱，无爆音。
- [ ] **P1-3 记忆轮回闭环**：激活 `MemoryPhase` 出口（已修），跨轮回记忆衰减调参，确保第二轮回起「记忆→继续→审问」不卡死且体验连贯。负责：design-strategist + engineering-lead。验收：≥3 轮回可玩，记忆项真实影响对话。
- [ ] **P1-4 美术核心阵容**：主角 + 8 居民立绘/背景首批 AI 生成资产按 §6 规格入库。负责：art-director。验收：风格一致性清单（§8）通过。
- [ ] **P1-5 平台无关契约**：抽离 `@lunhui/web` 与 engine/server 的契约类型（web 真正依赖 `@lunhui/engine`，消除三处手抄）；定义未来多端 client/API 契约。负责：engineering-lead。验收：type-only 共享，web 不再手抄 AnswerMode。
- [ ] **P1-6 可观测性 + LLM 容灾加固**：结构化日志/指标；llm-generator 加 timeout/maxRetries/熔断；容灾降级链补真实测试（关 mock）。负责：engineering-lead + quality-lead。验收：provider 挂起自动降级，指标可见。
- [ ] **P1-7 staging 与封闭 alpha**：staging 环境、封闭 alpha 招募、沉浸度量化（心流时长/沉默三秒冲击反馈）。负责：release-ops-lead + quality-lead。

### Phase 2 · 活镇与内容扩展（建议 6~10 周）
- [ ] **P2-1 关系网/事件活系统**：把死特性（`loop-service.ts:111` 恒传 `[]`）接上真实消费逻辑；事件系统从桩数据 → 驱动型事件。负责：design-strategist + engineering-lead。
- [ ] **P2-2 AI 血肉回流**：llm-generator 生成内容回流进真相表/关系网（生成即因果）。负责：engineering-lead + design-strategist。验收：AI 回答可被后续轮回作为真实记忆消费。
- [ ] **P2-3 记忆复仇 / 多结局**：跨轮回「被你伤害的居民记住你」触发分支；≥3 真结局。负责：design-strategist。验收：「记忆复仇」触发率可量化、分支真实。
- [ ] **P2-4 全阵容美术 + 资产管线自动化**：AI 生成→审核→规格化入库流水线（含可访问性）。负责：art-director。
- [ ] **P2-5 i18n 骨架**：叙事游戏多语言基础设施（内容资产国际化）。负责：engineering-lead + release-ops-lead。
- [ ] **P2-6 封闭 beta + 留存指标**：beta 包、留存/口碑埋点。负责：release-ops-lead。

### Phase 3 · 现象级打磨与多端（建议 8~12 周）
- [ ] **P3-1 打磨 Pass**：性能预算（首屏/接口延迟/并发/离线）、稳定性（崩溃率）、内容一致性护栏。负责：quality-lead + 全体。
- [ ] **P3-2 Tauri 桌面壳**：复用 Web 2D 资产，演出层可替换。负责：engineering-lead。
- [ ] **P3-3 Capacitor 移动壳**：按屏占比降档适配。负责：engineering-lead。
- [ ] **P3-4 Godot 资产 PoC**：2D 资产喂 Godot 做局部 3D 演出（不推翻 2.5D 标准）。负责：art-director + engineering-lead。
- [ ] **P3-5 公开发布 v1.0 + 运营体系**：发布清单/回滚、UGC/赛季/社区承接。负责：release-ops-lead。
- [ ] **P3-6 传播与口碑运营**：现象级爆火后的承接（社区、内容创作者、口碑维护）。负责：release-ops-lead + design-strategist。

---

## 4. 技术演进方向（Engineering）

1. **平台无关内核**：游戏逻辑/engine 与服务端解耦，呈现层可替换 → 多端复用同一 API/内核（Phase 1 起）。
2. **LLM 容灾与可观测性**：多 provider 健康度/熔断/退避；结构化日志/指标（Phase 1）。
3. **测试与质量门**：统一 Vitest（已落地）；覆盖率接入（c8）；E2E/Playtest 分层（Phase 1~2）。
4. **构建与版本**：changesets 已落地；后续接入 CI 质量门（架构评审/烟雾测试/发布检查）。
5. **多端运行时**：Tauri/Capacitor/Godot 通过同一 API 接入（Phase 3）。

---

## 5. 发展目标（量化锚点，待 alpha/beta 校准）

- **体验**：沉默三秒冲击反馈率、心流时长、跨轮回记忆影响感知度。
- **内容**：居民数、真相网复杂度、结局数、轮回 meta 深度（分阶段翻倍）。
- **质量**：首屏 ≤ 目标、接口 p95 ≤ 目标、崩溃率 < 阈值、测试覆盖率 ≥ 阶梯目标。
- **增长**：alpha→beta→公开发布口碑/传播系数（现象级爆火承接）。

---

## 6. 风险与缓解（跨职能）

| 风险 | 影响 | 缓解 |
|---|---|---|
| AI 生成内容一致性/失控 | 沉浸断裂 | 风格标准 + SOUL.md 单一来源 + 生成回流护栏 |
| 真 3D 诱惑导致路线偏移 | 成本爆炸、推翻 2.5D | 已正式锁定 2.5D 标准，偏离须美术总监审批 |
| 多 provider 成本/稳定性 | 服务中断 | 容灾降级 + 熔断 + 指标告警（Phase 1） |
| 关系网/事件半吊子 | 内容空心 | Phase 2 强制激活为活系统 |
| 测试覆盖盲区（App/容灾曾零覆盖） | 回归漏网 | 统一 Vitest + 覆盖率 + 关键路径补测（已补 memory 出口测试） |

---

## 7. 下一步建议（立即可做）

1. 勾选 **Phase 1** 任务卡，优先 P1-1（沉默三秒 2.5D 演出）+ P1-5（契约先行），二者投入小、对体验与架构杠杆最高。
2. 运行 `npm test` 作为每次提交的基线门（已 40/40 绿）。
3. 发布版本前先 `npm run changeset` 登记变更，再 `npm run version && npm run build`。

> 编排铁律：主理人只编排不建造；上述任务卡由对应职能成员在 Phase 启动时 spawn 落地，主理人汇编与 Gate 评审。
