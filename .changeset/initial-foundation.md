---
"@lunhui/engine": patch
"@lunhui/server": patch
"@lunhui/web": patch
---

# 地基能力统一（P0 修复 + T7 + T8）

本轮完成项目地基工作的收口：

- **P0 修复**：memory 卡死 / asking 死代码 / 3:17 关键词失配 / dist 产物污染 / CI 复活 / 测试解耦 `.env`。
- **T7 · 测试框架统一为 Vitest**：`packages/engine` 与 `packages/server` 的 `node:test` 测试迁移为 Vitest；新增根 `vitest.config.ts`（`test.projects`）与 `vitest.workspace.ts`，统一 `npm test` 入口，各包沿用各自环境（engine/server=node，web=jsdom）。
- **T8 · 引入 changesets 版本化**：新增 `.changeset/config.json`、`.changeset/README.md` 与根脚本（`changeset` / `version` / `release` / `publish`），规范版本号与变更日志。

受影响包：`engine` / `server` / `web`。
