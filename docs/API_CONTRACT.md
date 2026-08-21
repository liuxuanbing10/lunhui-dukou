# API 契约（定稿）

> 前后端对接以此为准。所有请求/响应均为 JSON。基础路径 `/api`。
> 错误统一形状：`{ "error": { "code": string, "message": string } }`
> **命名约定：响应字段一律 camelCase；请求体保留历史 snake_case（`loop_id`/`resident_id`），由 zod schema 强校验。**
> 类型单一真源：`@lunhui/engine/types`（`AnswerMode` 等）+ `packages/web/src/api.ts` 响应接口。
>
> **鉴权（Phase 1，桌面客户端为唯一面向客户端）**：除 `/api/health`、`/api/auth/*`、`/api/events/stream` 外，
> 所有路由需在 `Authorization: Bearer <token>` 中携带 JWT（先 register 或 login 获取）。未携带/失效 → `401 UNAUTHORIZED`。

## 0. GET POST /api/auth/register 注册

请求：
```json
{ "username": "阿渡", "password": "secret123" }
```
响应 `200`：
```json
{ "playerId": 1, "username": "阿渡", "token": "<jwt>" }
```
错误：`400 USERNAME_INVALID`、`400 WEAK_PASSWORD`（密码 < 6 位）、`409 USERNAME_TAKEN`。

## 0.1 POST /api/auth/login 登录

请求同 register；成功响应同 register（返回 token）。密码错误 → `401 INVALID_CREDENTIALS`。
登录按 IP 限流，超限 → `429 RATE_LIMITED`。

## 1. POST /api/loop 开始/重开轮回

请求：`{}`（空 body；当前实现总是开启新轮回并自动递增 sequence）

响应 `200`：
```json
{
  "loopId": 3,
  "sequence": 3,
  "intro": "雨夜。你从水里醒来。8 个人站在岸边。",
  "questionsLeft": 10,
  "activeResidents": ["r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8"],
  "events": [{ "id": 1, "type": "ambient", "content": "雨声很大，雾很浓。" }]
}
```

## 2. POST /api/ask 审问

请求：
```json
{
  "loop_id": 3,
  "resident_id": "r1",
  "question": "你认识我吗？"
}
```

响应 `200`：
```json
{
  "loopId": 3,
  "sequence": 3,
  "answer": "我捞过你。",
  "answerMode": "direct",
  "hitFactId": "r1:f1",
  "pause": true,
  "questionsLeft": 9,
  "residentMood": "stirred",
  "loopStatus": "active",
  "usedLlm": false
}
```
- `answerMode`：`'direct' | 'deny' | 'silence' | 'rhetoric'`（见 `@lunhui/engine/types` 的 `AnswerMode`）；
- `hitFactId`：命中的真相表事实 id（未命中省略），格式 `<居民id>:<factId>`；
- `pause: true` = 命中关键事实的「汤主沉默三秒」信号（前端演出）；
- `usedLlm: false` = 纯规则判定/保守兜底，未烧 token；
- `residentMood`：命中关键事实为 `stirred`，否则 `calm`；
- `questionsLeft: 0` 后继续 ask → `403`。

错误：
```json
{ "error": { "code": "NO_QUESTIONS_LEFT", "message": "NO_QUESTIONS_LEFT" } }
{ "error": { "code": "RESIDENT_NOT_ACTIVE", "message": "RESIDENT_NOT_ACTIVE" } }
```
（当前实现 `message` 与 `code` 同值；前端按 code 分支。）

## 3. POST /api/loop/{id}/choice 做出关键选择

路径参数 `id`：正整数字符串（zod 校验）。

请求：
```json
{ "choice": "leave" }
```
`choice` 当前接受任意非空字符串；前端实际只发 `leave`（上船）/ `stay`（留下）。

响应 `200`：
```json
{ "accepted": true, "consequence": "你又上船了。第七次了。", "loopStatus": "ended" }
```

## 4. GET /api/memory 查询玩家记忆（每轮回开始可看）

响应 `200`：
```json
{
  "memories": [
    { "content": "蓑衣人说捞过我", "strength": 1, "loop_id": 2 },
    { "content": "我救过老板娘", "strength": 0.64, "loop_id": 2 }
  ]
}
```
- 服务端只返回**强记忆**：`strength ≥ 0.3`，永久记忆优先，最多 20 条；
- 非永久记忆每轮回衰减 ×0.8（repository.decayMemories）。

## 5. GET /api/events/stream WebSocket 事件流（实时推送）

- 需在 query 传 `?token=<jwt>`（握手阶段浏览器无法附 Authorization 头，故走 query）。
- 建立后按玩家订阅 broker，实时收到 `events` 行（JSON）：其字段同 `POST /api/loop` 响应里的 `events`。
- token 失效 → 返回 `{ "error": { "code": "UNAUTHORIZED" } }` 并断开。
- 隔离：B 玩家订阅不到 A 玩家的事件。

## 6. GET /api/health 健康检查

响应 `200`：
```json
{ "status": "ok", "service": "lunhui-dukou" }
```

## 7. 错误码总表（已实现）

| code | HTTP | 含义 |
|---|---|---|
| UNAUTHORIZED | 401 | 未登录 / token 缺失或失效（受保护路由） |
| INVALID_CREDENTIALS | 401 | 登录用户名或密码错误 |
| USERNAME_TAKEN | 409 | 注册用户名已存在 |
| RATE_LIMITED | 429 | 触发限流（/api/ask 按玩家 / login 按 IP / LLM 按玩家） |
| NO_QUESTIONS_LEFT | 403 | 本轮回额度用完 |
| LOOP_NOT_FOUND | 404 | 轮回不存在，或不属于当前玩家 |
| RESIDENT_NOT_ACTIVE | 404 | 居民未出场 |
| LOOP_ENDED | 409 | 轮回已结束（重复 choice/ask） |
| USERNAME_INVALID / WEAK_PASSWORD | 400 | 注册校验失败 |
| （其他未分类错误） | 500 | 统一错误形状返回 |

校验失败（zod，body/params 不合法）由 Fastify 返回 `400`，形状为 Fastify 默认校验错误（非统一错误形状）。

## 8. Phase 1 已落地 / 明确不做

| 项 | 状态 |
|---|---|
| `GET /api/events/stream` WebSocket 事件流 | ✅ 已实现（broker + @fastify/websocket，见 routes/events-stream.ts） |
| `RATE_LIMITED` (429) | ✅ 已实现（/api/ask 按玩家、login 按 IP、LLM 按玩家，见 services/rate-limiter.ts） |
| 请求体 camelCase 化 | 未排期（历史 snake_case 已被 zod 契约锁定） |
| `LLM_UNAVAILABLE` (503) | 不做（LLM 全部失败走保守兜底文本，HTTP 200 + `usedLlm:false`，不暴露 503） |

## 9. 离线模式

`VITE_OFFLINE=true` 构建或后端不可达时，web 自动切 `offlineClient`（零后端零 token 确定性判定，形状与上述一致）。详见 `packages/web/src/offlineClient.ts`。
