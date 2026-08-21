# 桌面端迁移规划（定稿草案）

> 《轮回渡口》从 Web 版转向 **Windows 桌面游戏**（Godot 渲染 + 云端 AI 后端）的方向规划。
> 状态：v0.1 → **Phase 1（server 云端化）已落地**（2026-08-21，见 DEV_LOG），Phase 0/2/3/4 待做；决策门 G0 已通过（继续 SQLite）。
> 关联文档：本文档应替代与方向冲突的 [DECISIONS.md](DECISIONS.md) D4 / [TECHNOLOGY.md](TECHNOLOGY.md) 相关段落。

---

## 0. 目标形态（方向定稿）

```
┌─ Windows 桌面客户端（Godot 4.8 mono）─────────────┐
│  演出层：Blender 3D 场景 + 2D 立绘 + 雨夜/粒子/音频 │
│  对话·选择·轮回 UI · 本地存档（user://）            │
│  HTTP / WebSocket ─────────────┐                 │
└────────────────────────────────┼─────────────────┘
                                 ▼
┌──────── 云端 AI 后端（复用现有 server 改造）────────┐
│  JWT 账号/鉴权 · 多玩家额度与记忆隔离 · 限流         │
│  真相表判定(engine) · LLM 多 provider 容灾         │
└──────────────────────────────────────────────────┘
```

**核心认知**：现有 `@lunhui/engine` 与 `@lunhui/server` 是这份规划最容易保值、最先接通的资产；真正要新建的是 **Godot 演出层** 与 **server 的多用户化改造**。规划重心放在这两处，不重写玩法逻辑。

### 决策记录（本方向新增）

**D.A. 产品形态：Web → 桌面游戏（客户端 + 云端 AI 后端）**
- **背景**：原 D4 定稿为 Web（发链接即玩）。现主创决定转 Windows 桌面游戏，用 Godot 渲染、Blender 制作资产。
- **选项**：A. 纯单机（所有判定离线，无账号）；B. 命令行客户端 + 云端 AI 后端（复用现有 server 判定与 LLM 容灾）。
- **选择**：**B ✅**
- **理由**：真相表/记忆/LivingTown 的 AI 生成需要 LLM 与 server 侧状态，纯单机无法承载；B 让现有 engine/server 资产近乎全量复用（只重写演出层），A 会抛弃核心后端能力。
- **派生约束（A 路线现在就有）**：1) 账号/鉴权必须加（多玩家时 `loop_id` 不再全局唯一）；2) 额度与记忆按玩家隔离；3) `/api/ask` 与 LLM 必须限流（原先"无鉴权+无限流"从隐患升级为必修）；4) 事件流从 SSE 改用 WebSocket（Godot 无原生 SSE）。

**D.L. 客户端语言：用 Godot Mono → C#**
- **选项**：A. C#（mono 版）；B. GDScript（标准版）。
- **倾向**：A ✅（备好的是 `Godot_v4.8-dev3_mono`；主创是 TS 强类型心智，C# 迁移成本最低，能把 judgeAsk/真相判定/状态机接近 TS 地重写）。
- **状态**：待 G1 确认（subject to change）。

**D.V. Godot 版本：先用 4.8-dev3（已在 `D:\tools`），不稳则降 4.5 稳定版**
- **背景**：本地装的是 dev 版，非稳定/LTS。
- **决策**：垂直切片内验证其 glb 导入与导出链稳定性；频繁踩坑即降级 4.5 稳定版（C# 代码迁移成本极低）。

---

## 1. 资产归属表（复用 / 重写 / 废弃）

| 模块 | 归属 | 说明 |
|---|---|---|
| `@lunhui/engine`（真相判定/批量生成架构） | **工业级复用** | `judgeAsk`、多 provider 容灾串基本不改 |
| `@lunhui/server`（Fastify 状态机/额度/记忆/SQLite） | **复用 + 多用户化** | `loop-service`/`repository`/`llm-generator` 沿用；加账号与 `player_id` 维度 |
| 剧情内容 / Blender 场景（dukou.glb） | 复用 | 同上 |
| Web 演出层（React/Three） | **整体废弃，Godot 取代** | 对话/场景/相位重写在 Godot |
| 音频（Web Audio） | 重写 | Godot 音频总线（复用 `audio-design.md` 语义） |

> 强调：**web 包不是沉没成本而是已交付的演出设计参考**；"废品率"只落在演出层，后端全保留。

---

## 2. 阶段化执行

> Phase 0 与 Phase 1 相互不阻塞，**建议并行**。Phase 0 在 Godot 里做、Phase 1 在 server 里做。

### Phase 0 · 环境探测 + 垂直切片（最小闭环）<!-- ✅ 命令链打通 + 垂直切片已跑通，见 DEV_LOG 2026-08-21 -->
**目的**：用最短回路验证 A 路线技术栈站得住，避免铺开后翻车。

- 范围：新建 Godot 项目；导入现有 `dukou.glb`；实现**单居民（r1）闭环**——渡口雨夜场景 → 审问输入 → 命中真相表 → "沉默三秒"演出 → 选择 → 死亡 → 新轮回。
- 起点：真相接 `judgeAsk` 先用**本地预计算挂钩**（先不接 server），把"演出层 + 判定"跑通。
- **验收**：单居民从开局到轮回全程可玩、无卡死。
- **决策门 G1**：
  1. Godot 4.8-dev3 稳定性是否可用 → **维持 4.8-dev3**。已被 godot-mcp 编辑器深控不可用实锤（DEV_LOG 2026-08-21），但本方案真3D 走 **C# 程序化动画（ResidentRig）**，全链路依赖 `dotnet build` + CLI 导入/导出，**不依赖编辑器级资产/动画工具**，R1 的主影响被规避，暂无降级必要（若后续要重度编辑器自动化再评估 4.x 稳定版）。
  2. 语言定稿 C# vs GDScript（见 D.L）；✅ C# 工程已建、dotnet build 通过
  3. 演出语言：**升级真 3D（已定稿 2026-08-21）**。方案：保留 2D 立绘作对话特写 + 3D 场景 + **居民套 `ResidentRig` 程序化动画**（呼吸/手臂摆动/头部环视/朝向玩家/命中后仰受压），不重做 Blender 骨骼资产（R4 友好）。G1 演出语言门通过。

### Phase 1 · server 云端化改造（A 路线地基，独立于 Godot 先做）<!-- ✅ 2026-08-21 已落地 -->
**目的**：把现有单机无鉴权 server 升级为可服务多玩家的后端。这是 A 路线唯一新增"重活"，建议最早启动。

**范围**（四件套均已实现，见 DEV_LOG 2026-08-21）：
  1. 账号/鉴权：玩家表 + JWT 登录（轻量方案，不自造复杂系统）；✅
  2. 玩家维度隔离：`loops/memories/questions/events/world_states` 表加 `player_id`，额度与记忆按玩家统计；✅
  3. 限流：LLM 调用与 `/api/ask` 按玩家/IP 限流；✅
  4. 事件流 SSE → WebSocket。✅
- **验收**：模拟两个玩家，各自 10 问额度互不串、记忆互不可见；LLM 超时/熔断回归不挂。
- **决策门 G0**：SQLite 本阶段继续保留，不换 Postgres（并发量远未到触发线，触发条件见 ARCHITECTURE.md）。

### Phase 2 · Godot 演出层移植（核心工作量）<!-- ✅ 核心语义已落地，见 DEV_LOG 2026-08-21 -->
- 范围：把 Web 演出层**语义**落到 Godot 节点/场景。
- **已落地**：相位状态机 boot→intro→choice→death→memory（对齐 web/src/App.tsx）；打字机对话（intro/memory 逐字，35ms/字）；「沉默三秒」视听留白（命中关键→暖光收束 dim + 雨声/暖压暗 + 钟鸣泛音）；死亡相位（全屏暗调+后果+死因+进入下一轮）；记忆相位（跨世记忆叠影+继续）；主题 token（ThemeTokens 对齐 art-style-2.5d 上色到 UI）；程序化音频 AmbientAudio（雨声床/暖 pad/钟鸣/否决/往生/笛音，生成 PCM→AudioStreamWav，无外部文件）。
- **待做**：真模型表情/细节、UI 配色微调、音频 bus 混音打磨（后续）。
- **接入真模型与立绘 ✅（2026-08-21）**：Blender 无头脚本(`app/scripts/blender/residents_build.py`)逐一建模 **8 位居民**（按各立绘配色/身形/斗笠/配饰：蓑衣人斗笠、阿岚花、老王围裙、阿黎驼背、何叔驼背、老鲞渔网+帽、郑爷制服帽+灯笼、小满背包）导出 `resident_r1..r8.glb` 全量接入 Godot；对话区立绘用 8 居民 body.webp，r1 命中真相切 face_hit 表情帧。
- **演出打磨 ✅（2026-08-21）**：镜头运镜（相位机位/焦距缓动：Intro(0,6,14)/60、Choice、Death 贴脸、Memory 稍远 + intro 缓摆）；审问节奏（回答后"一记节拍"再恢复提问，silence 保持 2.6s）；音频混音（雨更明、暖更柔、音效更清晰）。
- **验收**：8 居民立绘/场景切换、审问节奏、"沉默三秒"完整演出、死亡/记忆相位可跑。

### Phase 3 · 内容与存档接通
- 范围：接入全部真相表/SOUL/livingTown 叙事/记忆复仇台词；**新建本地存档**（`user://` 存轮回/记忆/strength 衰减，含版本迁移）；本地挂钩替换为真实 HTTP/WS。
- **① 客户端↔云端接线 ✅（2026-08-21）**：ServerClient(HTTP) + Session(user://)；登录/注册(JWT) + 开局/审问/选择走 server（断网降级本地 GameLogic）；端到端冒烟 `LUNHUI_SMOKE=1` 通过（register→loop→ask f1→pause）。
- **② 内容接入 ✅（2026-08-21）**：客户端可对 8 位居民任意审问（在线走 server engine 真相表；离线走本地 8 居民真相表，对齐各 SOUL）；场景渲染 8 位占位居民；存档 `Session` 加 `version` 并提供版本迁移（旧无版本存档自动升级）。
- **验收**：多轮回记忆跨场、存档可版本迁移（`LUNHUI_TEST_SESSION=1` 自检通过）、断网降级提示明确。

### Phase 4 · 打磨与分发
- 范围：视觉 polish、导出 Windows 包、签名/杀毒应对（可选）、更新（整包发布起步，热更后议）。
- **明确 MVP 边界**：不做云存档/排行榜/多人协作。
- **✅ Windows 包导出成功（2026-08-21）**：`build/LunhuiDukou.exe`（~116MB 自包含）+ `data_...`（.NET 运行时目录）即分发单元。命令：
  `godot --headless --path app --export-release "Windows 桌面" build/LunhuiDukou.exe`
  （预设 `app/export_presets.cfg`，`exclude_filter="addons/*"` 不打包开发插件）
- **导出注意**：模板需放在编辑器要求的版本目录 `%APPDATA%\Godot\export_templates\4.8.dev3.mono\`（带 `.mono` 后缀）；导出前需创建 `build/`；此前因系统虚拟内存不足（页面文件过小）受阻，扩容/重启后成功。
- **签名与杀毒应对 ✅（2026-08-21）**：exe 已用自签名代码签名证书签署（`app/scripts/distribute/sign.ps1` 可复用，见 [docs/ANTIVIRUS.md](ANTIVIRUS.md)）。自签名仅限开发/内部分发；正式发布需 OV/EV 证书或商店分发以消除 SmartScreen 告警；杀软误报处理见该文档。

---

## 3. 关键风险门（按优先级）

| 风险 | 拦截阶段 | 应对 |
|---|---|---|
| R1 Godot dev 版稳定性 | G1 | **已缓解（真3D 走 C# 程序化动画，不依赖编辑器资产/动画工具）**；编辑器深控不可用已被 godot-mcp 实锤，维持 4.8-dev3；仅在需重度编辑器自动化时转 4.x 稳定版 |
| R2 server 多用户改造范围蔓延 | G0 | 只加"账号/隔离/限流"，不顺手重构，保持最小改动 ✅（Phase 1 已落地，52 测试） |
| R3 音频全重写工程量被低估 | Phase 2 前 | 单独列任务与验收，别混在演出移植中挤掉 ✅（AmbientAudio 已程序化落地） |
| R4 `.blend` 源入库管理 | Phase 0 | 用 git-lfs 归档 `dukou_scene.blend`，只留 glb 进游戏；居民模型走脚本 `residents_build.py` 生成（脚本即唯一源）|
| R5 沉没成本 / 范围蔓延 | 全程 | 严守"server 保留、仅演出层重写"，不借机重写玩法逻辑 |

---

## 4. 本机工具盘点（已确认）

来源：`D:\tools` 全量可见：

- **Godot**：`Godot_v4.8-dev3_mono_win64\Godot_v4.8-dev3_mono_win64.exe`（Mono/.NET 版）
- **导出模板**：`Godot_export_templates\4.8-dev3\templates\`（可导出 Windows 包）
- **Blender**：`blender-5.2.0-windows-x64\blender.exe`（自带 gltf2 导入导出）
- **vcpkg/godot-cpp**：C++ GDExtension 绑定（本轮不用，留后路）

之前"需补装 Godot/Blender"的结论作废；工具链无需任何前置安装。

---

## 5. 建议的首次动作（下一轮）

1. **验证本地 Godot/Blender 可执行与导出模板真实可用**（跑 `--version` / 空工程导出 Windows 测试），确认 4.8-dev3 能做 glb 导入。
2. **把 server 云端化最安全的第一步——账号/鉴权 + `player_id` 隔离——写成改造设计**（只设计不改码，独立于 Godot）。

跑通后再进 Phase 0 垂直切片，方向基本无偏差。

---

## 附 · 需要配套同步的既有文档（建议提交）

方向转变与现有宪法冲突，落地本规划时应一并处理：

1. [DECISIONS.md](DECISIONS.md) **D4（产品形态=Web）** → 标记被 D.A 取代/修订；
2. [TECHNOLOGY.md](TECHNOLOGY.md) → 追加"第 9 节 桌面端（Godot/Blender）"或另起桌面技术栈段落，标注与全栈 TS 的差异；
3. [README.md](../README.md) → 技术栈行与项目结构表需反映桌面化；
4. [DEVELOPMENT.md](DEVELOPMENT.md) → 新增 Godot 日常命令（导入 glb、单测、导出）。

> 以上同步动作**不在本次范围内**，待本规划草案经确认后按需执行。