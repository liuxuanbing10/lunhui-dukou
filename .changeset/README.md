# Changesets

本仓库使用 [Changesets](https://github.com/changesets/changesets) 进行版本管理与变更日志（CHANGELOG）生成。

## 工作流程

1. **开发时记录变更**：每完成一个需要发布的功能 / 修复，新增一个 changeset：
   ```bash
   npm run changeset
   ```
   按提示选择受影响的包（`@lunhui/engine` / `@lunhui/server` / `@lunhui/web`）与变更类型（`patch` / `minor` / `major`），并填写变更说明。
   这会生成一个 `.changeset/*.md` 文件（不要手改其 frontmatter）。

2. **发布前提升版本号**（并生成 CHANGELOG）：
   ```bash
   npm run version
   ```
   该命令消费所有 pending changeset，更新对应包的 `package.json` 版本号并写入 `CHANGELOG.md`，随后删除已消费的 changeset 文件。
   （本仓库当前为私有项目，不会自动发布到 npm。）

3. **构建 + 就绪**（安全方案，避免误发）：
   ```bash
   npm run release
   ```
   等价于 `changesets version && npm run build`：先提升版本号，再构建全部包。
   若未来需要真正发布到 npm registry，可单独运行 `npm run publish`（即 `changesets publish`）。

## 说明
- `baseBranch` 为 `main`。
- `access` 为 `restricted`（私有包，不发布到公共 registry）。
- `commit` 为 `false`（由团队自行决定提交方式）。
