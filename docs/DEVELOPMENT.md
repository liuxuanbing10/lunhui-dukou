# 开发指南（定稿）

> 从零开始在本机跑起《轮回渡口》。环境：Windows / macOS / Linux 均可。

## 1. 环境要求

| 工具 | 版本 | 验证命令 |
|---|---|---|
| Node.js | ≥ 20（建议 20 LTS） | `node -v` |
| npm | ≥ 10 | `npm -v` |
| git | ≥ 2.40 | `git --version` |

> 建议用 nvm 管理 Node：`nvm use`（读取根目录 `.nvmrc`）。

## 2. 首次安装

```bash
git clone git@github.com:liuxuanbing10/lunhui-dukou.git
cd lunhui-dukou
npm install          # 安装全部 workspace 依赖
```

> 若 Windows 提示 esbuild install script 被拦：`npm install-scripts approve esbuild`

## 3. 环境变量

```bash
cp .env.example .env   # 然后填入你的 LLM API Key
```

`.env` 已被 .gitignore 排除，**禁止提交**。

## 4. 启动开发环境（三终端）

```bash
# 终端 1：引擎（当前仅库，无独立进程）
npm run dev:engine

# 终端 2：API 服务
npm run dev:server
# → http://127.0.0.1:8787/api/health 应返回 {"status":"ok"}

# 终端 3：前端
npm run dev:web
# → http://127.0.0.1:5173 （Vite 代理 /api → 8787）
```

## 5. 日常命令

| 命令 | 作用 |
|---|---|
| `npm run dev:server` / `dev:web` / `dev:engine` | 各包热重载开发 |
| `npm run lint` | 全仓 ESLint（0 error 才算过） |
| `npm run typecheck` | 全仓 tsc --noEmit |
| `npm run test` | 全仓 node:test |
| `npm run build` | 全仓构建（web 产出 dist） |
| `npm run build --workspace=@lunhui/server` | 单包构建 |

## 6. 开发前必须做的

```bash
# 提交前四件套（CI 也会跑，本地先自检）
npm run lint && npm run typecheck && npm run test && npm run build
```

## 7. 调试技巧

- **Server 日志**：Fastify pino 输出在终端，`{reqId, method, url, statusCode}`；
- **端口占用**：Windows 下清理残留进程（kill npm 不杀子进程）：
  ```bash
  netstat -ano | grep ":8787" | grep LISTEN
  taskkill -F -PID <pid>
  ```
- **LLM 调用**：观察 engine 日志中的 provider 切换（主→备→兜底）；
- **数据**：开发库在 `packages/server/data/lunhui.db`（已被 gitignore）。

## 8. 常见问题

| 症状 | 原因 | 解决 |
|---|---|---|
| `No workspaces found!` | 包缺 package.json | 检查 packages/* 结构 |
| ESLint 警告 MODULE_TYPELESS | 根缺 type:module | 已修复，勿回退 |
| esbuild 二进制报错 | install script 被拦 | `npm install-scripts approve esbuild` |
| 8787 端口被占 | 残留 tsx 子进程 | 按 §7 端口清理 |
| import 报 TS2835 | NodeNext 需显式扩展名 | 用 `./x.js` 导入 |
