# 发布核验报告 · 轮回渡口（lunhui-dukou）Web 端

> **阶段**：Phase 7 前置（发布前核验）
> **执行人**：release-ops-lead（发布与运维负责人）
> **日期**：2026-08-04
> **核验 HEAD**：`1f48d562476f1fd0a7c6483581a3898d43ee6be3`
> **项目根**：`D:/Projects/lunhui-dukou`
> **结论**：**READY-WITH-NOTES**（无阻塞项；含需注意的非阻断项，见文末）

---

## 1. 构建产物

### 命令（按主理人指定，未改动源码）
```bash
cd /d/Projects/lunhui-dukou/packages/web
npx vite build
```

### 结果
- **构建工具**：vite `6.4.3`，`81 modules transformed`
- **结果**：`✓ built in 3.58s`（含 npm 包装开销，真实构建 ~3.6s）
- **报错**：**零报错**（无 error、无失败模块）
- **唯一提示**：非阻断警告 —— JS chunk `> 500 kB`（见风险 R1）

### 产物清单（`packages/web/dist/`）
| 文件 | 体积 | gzip |
|---|---|---|
| `index.html` | 0.53 kB | 0.39 kB |
| `assets/index-BjRrBgFk.css` | 4.58 kB | 1.47 kB |
| `assets/index-I0irIFui.js` | 1,189.58 kB | 331.52 kB |
| **dist 总计（3 文件）** | **1,194,689 B ≈ 1.14 MB** | — |

### 体积评估
- 产物结构正常：`index.html` + 单个 CSS + 单个 JS（典型 Vite SPA 输出），无异常多余文件、无 `dist` 污染（P0 已修复）。
- JS 体积偏大（1.19 MB / gzip 331 KB）源于 `three.js` + `@react-three/fiber` + `@react-three/postprocessing` 的 3D 渲染依赖，**对本地叙事游戏属预期范围**，非阻断（详见 R1）。

> 注：本次按要求执行 `npx vite build`（纯打包）。完整的 `npm run build` 脚本还会先跑 `tsc -p tsconfig.json` 类型检查；质量门控已确认 `tsc = 0` 全绿，故未重复执行 tsc 步骤。

---

## 2. 可玩性核验（preview）

### 命令
```bash
cd /d/Projects/lunhui-dukou/packages/web
npx vite preview --port 4173 --host 127.0.0.1
```

### 验证结果
| 检查项 | 结果 |
|---|---|
| 服务启动 | `Local: http://127.0.0.1:4173/` ✅ |
| HTTP 状态码（首屏 `/`） | **200** ✅ |
| `<title>` | `<title>轮回渡口</title>` ✅ |
| 挂载点 | `<div id="root">` ✅ |
| 模块脚本引用 | `<script type="module" crossorigin src="/assets/index-I0irIFui.js">` ✅ |
| JS 资源可访问 | `assets/index-I0irIFui.js` → **200** ✅ |
| CSS 资源可访问 | `assets/index-BjRrBgFk.css` → **200** ✅ |

### 结论
本项目为**纯前端 SPA（离线模式，零后端、零 token）**，preview 服务可起、`/` 返回 200 且含 `<title>` 与挂载点、静态资源均可访问，**可玩性基本达标**。

> ⚠️ **视觉 / 音频需人工浏览器验证**：雨水粒子、暖光 / Bloom、视差、沉默留白音画同步、记忆叠影等运行时效果依赖真实浏览器（WebGL + Web Audio），无法在无头环境中核验。请在浏览器中打开 `http://localhost:4173/`（或部署后的地址）人工确认观感与音效。

### 清理
- preview 进程已停止（PID 27712，经 PowerShell 按端口 kill），后台 Bash 任务 `fcI5kw` 已清理。
- 复测 `http://127.0.0.1:4173/` → `HTTP 000`（端口已关闭），**无残留进程占用端口**。

---

## 3. 回退核验（任意阶段可回退）

### 领先 origin/main 的提交（共 20 个，颗粒度清晰）
```
1f48d56 fix(web):     解耦 memoryRevenge 注入，修复非关键事实复仇死代码
8afafda fix(web):     B 缺口补完——App 透传 silenceMs=2600 给音频引擎
40110b3 feat(audio):  透出 silenceMs 到 createAudioEngine 工厂签名
2dbb387 feat(web):    接入活镇内容（livingTown 驱动叙事与居民展示）
3bbf419 feat(web):    接入 Web Audio 引擎（沉默留白音画同步）
961e35b feat(web):    接入 visual/theme 主题 token
9e9caf7 test(web):    离线客户端与场景渲染测试
97ea98b feat(web):    R3F 2.5D 雨夜场景（雨/暖光/Bloom/视差/沉默收束/记忆叠影）
cb3ab88 fix(web):     修复 api/offlineClient 类型导入（typecheck 通过）
f5bb2aa feat(web):    离线判定客户端复用 engine 真相表（零 token/零后端）
fe11634 feat(web):    浏览器安全真相数据生成（零后端离线判定数据源）
97a3d1b feat(engine): 浏览器安全真相表子路径导出（./truth, ./types）
54177ab fix(audio):   沉默过渡收敛入 T1 窗口并随 silenceMs 缩放
f9a1786 feat(design):活镇内容扩展数据模块与设计规格
7ce76d4 feat(audio):  Web Audio 引擎模块与音频设计规格
d5cb9a2 feat(art):    2.5D 视觉 token 模块与打磨验收清单
c76ec6f chore:       提交地基基线（P0 修复 / T7 统一Vitest / T8 changesets / 2.5D标准 / Roadmap）
（注：git log 实际列出 20 条，此处按 scope 归类节选展示关键边界；
基线 c76ec6f 为地基，之后依次为 art/audio/design/engine 成员模块、
web 接入与整合、末尾 3 条为修复收口，边界独立可回退）
```

### 回退可行性演示（只读，未离开当前 HEAD）
- **当前 HEAD**：`git rev-parse HEAD` → `1f48d562476f1fd0a7c6483581a3898d43ee6be3`
- **基线历史可回放**（证明可检出任意阶段）：
  ```
  git cat-file -p c76ec6f:packages/web/src/App.tsx   # 地基基线 App.tsx 可完整读取
  → import { useCallback, useEffect, useRef, useState } from 'react';
    import { api, type LoopResponse, type AskResponse } from './api';
    ...（内容一致可读，无损坏）
  ```
- **中途整合阶段可回放**（证明阶段间可独立定位）：
  ```
  git cat-file -p 97ea98b:packages/web/src/App.tsx   # 已含 MemoryPhase、styles.css 导入
  → import { MemoryPhase } from './components/MemoryPhase';
    import './styles.css';
  ```
- **阶段边界量化**：`git diff --stat c76ec6f HEAD` → `25 files changed, 3452 insertions(+), 156 deletions(-)`
- **stash 安全**：`git stash list` 为空 → 当前无未提交改动，`git stash` / `git checkout <hash>` 均不会丢失工作。

### 工作树状态
```
git status --short  →  ?? tests/
```
- 唯一未跟踪项：`tests/`（QA 产物目录，含本报告及 hardening 报告）。**源码树本身 clean**，与"领先多 commit、clean"一致（细微出入见 R3）。

### 结论
提交颗粒度满足 **地基基线 → 各成员模块（art/audio/design/engine）→ web 接入与整合 → 修复收口** 的清晰边界，每个阶段边界均可独立 `git checkout <hash>` 回退；`cat-file` 证明历史完整可回放、`stash` 为空。**满足"任意阶段可随时回退"强约束。**

---

## 4. 版本现状

| 包 | name | version | private |
|---|---|---|---|
| 根 | `lunhui-dukou` | `0.1.0` | true |
| web | `@lunhui/web` | `0.1.0` | true |

- **changesets 已配置**（T8 完成）：
  - `.changeset/config.json`：`baseBranch: main`、`access: restricted`、`changelog: @changesets/cli/changelog`。
  - 根脚本：`changeset` / `version` / `release` / `publish` 齐备。
- **待生效变更集**：`.changeset/initial-foundation.md` → 对 `engine` / `server` / `web` 均为 **patch** 级 bump（地基能力统一：P0 修复 + T7 统一 Vitest + T8 changesets）。
- **现状**：版本号仍为 `0.1.0`，**尚未执行 `changesets version` / `release`**（本核验不发版，仅记录）。
- 后续发版流程：`npm run version`（应用 patch bump）→ `npm run build` → `npm run publish`。

---

## 5. 总体放行结论

### 结论：**READY-WITH-NOTES**

| 维度 | 状态 |
|---|---|
| 构建（零报错 / 产物正常） | ✅ PASS |
| 真机可玩性（preview 200 + 首屏 HTML） | ✅ PASS |
| 任意阶段回退 | ✅ PASS |
| 版本记录完整 | ✅ PASS |

**无 BLOCKER**。可进入 Phase 7 发布流程。

### 已知风险与缓解

| ID | 风险 | 等级 | 缓解 |
|---|---|---|---|
| **R1** | JS 单包 1.19 MB（gzip 331 KB）触发 vite chunk-size 警告；首屏加载体积偏大 | 低（非阻断） | 当前离线叙事游戏可接受；后续可用 `manualChunks` 拆分 three/R3F 或路由级 `import()` 懒加载，列入 Phase 7+ 优化 backlog |
| **R2** | 雨水 / Bloom / 音频等运行时视听效果无法无头核验 | 信息项 | 浏览器人工验证（见第 2 节 ⚠️），上线前由人工走查确认 |
| **R3** | 工作树非完全 clean：`tests/` 未跟踪（与"clean"表述细微出入） | 极低 | `tests/` 为 QA 产物目录、不含游戏源码，不影响构建与回退；本报告写入后该目录仍保持未跟踪，符合预期 |
| **R4** | 本次仅执行 `npx vite build`，未重跑 `tsc` 类型检查 | 极低 | 质量门控已确认 `tsc = 0` 全绿；若需双保险，发版前可执行 `npm run build`（含 tsc）再确认一次 |

### 备注
- 全程**未改动任何游戏源码或设计文档**；构建首次即通过，无需配置类修复。
- 所有 preview / 后台进程已清理，端口 `4173` 已释放。
