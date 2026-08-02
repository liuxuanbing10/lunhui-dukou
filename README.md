# 🌧️ 轮回渡口 (Lunhui Dukou)

> **狼人杀的机制 × 海龟汤的悬念 × 一个会记住你的活小镇**
> 第一个由 AI 实时生成剧情、且每个玩家故事真正分叉的推理互动叙事。

你是渡口摆渡人——唯一记得轮回的人。每晚一碗"汤"，审问 8 个藏着秘密的居民，推理真相，做出选择，死亡轮回，带着记忆重来——而世界，已经因你而变。

## 🎯 核心特色

- **AI 动态剧情**：骨架预设锁死，血肉 AI 生成，生成回流进因果链——每个玩家的故事真正分叉
- **海龟汤 × 狼人杀**：10 个问题的审问、隐藏身份的推理、每晚一碗悬念
- **记忆轮回**：世界记得你上辈子的选择——"它记得我"是最大的情感核弹
- **上瘾引擎**：差一点、记忆复仇、答案引出问题、代价可见

## 📁 项目结构

```
lunhui-dukou/
├── docs/                # 项目宪法（五份权威文档）
├── packages/
│   ├── engine/          # AI 生成引擎（真相表/记忆/关系网/事件）
│   ├── server/          # Fastify API（审问/轮回/记忆）
│   └── web/             # React 演出层（五件套）
├── CONTRIBUTING.md      # 贡献指南
└── README.md
```

## 📜 文档（项目宪法）

| 文档 | 内容 | 何时更新 |
|---|---|---|
| [docs/DEV_LOG.md](docs/DEV_LOG.md) | **项目日志（每次开发历程，最新在前）** | 每次开发后追加 |
| [docs/GAMEPLAY_GUIDE.md](docs/GAMEPLAY_GUIDE.md) | **玩法说明（怎么玩，从零讲起）** | 改玩法时 |
| [docs/SPEC.md](docs/SPEC.md) | 产品全案：世界观/玩法/变现/合规/路线图 | 改产品行为时 |
| [docs/DECISIONS.md](docs/DECISIONS.md) | 关键决策记录（成本/尺度/语言/形态） | 新增决策时 |
| [docs/TECHNOLOGY.md](docs/TECHNOLOGY.md) | 技术栈与工具链定稿 | 改技术选型时 |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | 运行时架构与数据流 | 改架构时 |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md) | 数据模型字段级定义 | 改表结构时 |
| [docs/API_CONTRACT.md](docs/API_CONTRACT.md) | API 契约（请求/响应/错误码） | 改接口时 |
| [docs/CONTENT_ASSETS.md](docs/CONTENT_ASSETS.md) | 内容资产规格（人格卡/真相表/判定规则） | 改内容结构时 |
| [docs/RESIDENTS.md](docs/RESIDENTS.md) | 8 位居民人格卡（含真相表/关系网） | 改角色时 |
| [docs/PHASE1_STORY.md](docs/PHASE1_STORY.md) | Phase 1 主线设计（3:17 咬合/玩家身世/第一夜） | 改主线剧情时 |
| [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) | 开发环境与日常命令 | 改开发流程时 |
| [CONTRIBUTING.md](CONTRIBUTING.md) | 分支/commit/PR/代码规范 | 改协作流程时 |

## 🛠️ 技术栈

TypeScript · React 19 · Fastify 5 · SQLite · LLM 多 provider 容灾 · ECS + PM2

## 🚀 快速开始

```bash
npm install
cp .env.example .env   # 填入 LLM API Key
npm run dev:server     # http://127.0.0.1:8787
npm run dev:web        # http://127.0.0.1:5173
```

完整步骤见 [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)。

## ✅ 提交前四件套

```bash
npm run lint && npm run typecheck && npm run test && npm run build
```

## 📄 License

私有项目 © 2026
