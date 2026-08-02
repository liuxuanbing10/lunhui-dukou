# API 契约（定稿）

> 前后端对接以此为准。所有请求/响应均为 JSON（除 SSE）。基础路径 `/api`。
> 错误统一形状：`{ "error": { "code": string, "message": string } }`

## 1. POST /api/loop 开始/重开轮回

请求：
```json
{ "mode": "new" }  // new=新轮回；续玩时可不传或传 loop_id
```

响应 `200`：
```json
{
  "loop_id": "l3",
  "sequence": 3,
  "intro": "雨夜。你从水里醒来。8 个人站在岸边。",
  "questions_left": 10,
  "active_residents": ["r1", "r2", "r3", "r4", "r5", "r6", "r7", "r8"],
  "events": [{ "id": "e1", "type": "ambient", "content": "雨声很大，雾很浓。" }]
}
```

## 2. POST /api/ask 审问

请求：
```json
{
  "loop_id": "l3",
  "resident_id": "r1",
  "question": "你认识我吗？"
}
```

响应 `200`：
```json
{
  "answer": "我捞过你。",
  "answer_mode": "direct",
  "hit_fact_id": "f1",
  "questions_left": 9,
  "resident_mood": "calm",
  "pause": true
}
```
- `pause: true` = 命中关键事实的"汤主沉默三秒"信号（前端演出）；
- `questions_left: 0` 后继续 ask → `403`。

错误：
```json
{ "error": { "code": "NO_QUESTIONS_LEFT", "message": "本轮回问题额度已用完" } }
{ "error": { "code": "RESIDENT_NOT_ACTIVE", "message": "该居民本轮回未出场" } }
```

## 3. POST /api/loop/{id}/choice 做出关键选择

请求：
```json
{ "choice": "save_r3", "note": "我选择救花店老板娘" }
```

响应 `200`：
```json
{ "accepted": true, "consequence": "你救了老板娘。天亮时，面馆老王没有再出现。", "loop_status": "ended" }
```

## 4. GET /api/memory 查询玩家记忆（每轮回开始可看）

响应 `200`：
```json
{
  "memories": [
    { "content": "蓑衣人说捞过我", "strength": 0.9, "loop_id": "l2" },
    { "content": "我救过老板娘", "strength": 0.7, "loop_id": "l2" }
  ]
}
```

## 5. GET /api/events/stream SSE 事件流

- 用途：小镇日常/轮回动画实时推送；
- 格式：`text/event-stream`，`data: {"type":"ambient","content":"..."}`；
- 事件类型：`ambient`（氛围）、`plot`（剧情）、`relation_change`（关系变化）。

## 6. GET /api/health 健康检查

响应 `200`：
```json
{ "status": "ok", "service": "lunhui-dukou" }
```

## 7. 错误码总表

| code | HTTP | 含义 |
|---|---|---|
| NO_QUESTIONS_LEFT | 403 | 额度用完 |
| RESIDENT_NOT_ACTIVE | 404 | 居民未出场 |
| LOOP_NOT_FOUND | 404 | 轮回不存在 |
| LLM_UNAVAILABLE | 503 | 所有 provider 均不可用（降级回答） |
| RATE_LIMITED | 429 | 触发成本熔断 |
