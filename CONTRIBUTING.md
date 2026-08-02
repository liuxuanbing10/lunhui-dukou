# 贡献指南（定稿）

> 所有贡献者（含维护者本人）必须遵守本文档。目标是让代码库长期可维护、可审计。

## 1. 工作流总览

```
issue/branch → 开发 → 本地四件套 → commit → push → PR → CI 绿 → merge
```

## 2. 分支模型

| 分支 | 用途 | 命名 |
|---|---|---|
| `main` | 生产分支，永远可部署 | —— |
| 功能分支 | 新功能 | `feat/<slug>` |
| 修复分支 | bug 修复 | `fix/<slug>` |
| 实验分支 | 不保证合并 | `exp/<slug>` |

- 禁止直接 push 到 `main`（除维护者紧急 hotfix）；
- 功能分支从最新 `main` 切出。

## 3. Commit 规范（Conventional Commits）

```
<type>(<scope>): <subject>

[body]
```

| type | 用途 |
|---|---|
| `feat` | 新功能 |
| `fix` | 修 bug |
| `docs` | 文档 |
| `chore` | 工具链/配置/依赖 |
| `refactor` | 重构（无行为变化） |
| `test` | 测试 |
| `perf` | 性能 |
| `style` | 格式（prettier） |

示例：
```
feat(engine): 实现真相表命中判定
fix(server): 修复 10 问额度校验绕过
docs(spec): 更新轮回机制描述
```

**要求**：subject 用祈使句；body 覆盖"做了什么 + 为什么"；涉及破坏性变更加 `BREAKING CHANGE:`。

## 4. 提交前强制检查（本地四件套）

```bash
npm run lint && npm run typecheck && npm run test && npm run build
```

**任何一项失败 = 禁止提交。** CI 会再次验证，但不要依赖 CI 兜底。

## 5. 代码风格

- 由 Prettier 强制（semi、singleQuote、trailingComma all、printWidth 100）；
- TypeScript strict 模式；禁止 `any`（除非显式 `unknown` 后收窄）；
- import 用 `type-imports`（`import type { X }`）；
- 相对导入必须带 `.js` 扩展名（NodeNext 要求）；
- 命名：变量/函数 camelCase，类型 PascalCase，常量 UPPER_SNAKE。

## 6. 测试要求

- 每个包内测试与被测文件同目录（`*.test.ts`）；
- 核心引擎（TruthTable/Memory）**必须**有测试；
- 测试必须真实断言，禁止只测"不报错"。

## 7. 文档同步

- 修改产品行为 → 更新 `docs/SPEC.md`；
- 修改技术选型 → 更新 `docs/TECHNOLOGY.md`；
- 修改架构 → 更新 `docs/ARCHITECTURE.md`；
- 新增环境变量 → 更新 `.env.example` + `docs/TECHNOLOGY.md` §6。

## 8. PR 流程

1. PR 描述：动机 + 改动清单 + 验证证据；
2. CI 必须全绿；
3. 至少 1 人 review（本人项目 = 自审 checklist）；
4. merge 用 squash，保留一条干净历史。

## 9. 禁区（红牌）

- ❌ 提交 `.env`、`data/`、`node_modules/`、`dist/`；
- ❌ 伪造测试结果 / 声称已跑但实际没跑；
- ❌ 未经文档同步的架构变更；
- ❌ 直接 push main（非 hotfix）；
- ❌ 引入未在 TECHNOLOGY.md 记录的依赖。

## 10. 版本与发布（暂定）

- 当前 v0.1.0，`main` 即最新；
- 达到 Phase 1 验收（自己玩完想玩第二夜）后打 `v1.0.0-alpha`；
- 发布走 GitHub Release + 标签，不改 `main` 历史。
