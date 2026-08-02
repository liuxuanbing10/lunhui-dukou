# 数据模型（字段级定稿）

> 六张核心表。建表以本文档为准。变更须先改本文档。
> 存储：SQLite（better-sqlite3）。所有表含 `created_at TEXT DEFAULT (datetime('now'))`。

## 1. residents（居民表）

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | TEXT | PK | 'r1'..'r8' |
| name | TEXT | NOT NULL | 蓑衣人 |
| archetype | TEXT | NOT NULL | 沉默/话里有话 |
| persona | TEXT | NOT NULL | 人格描述（喂 LLM 用） |
| age | INTEGER | | 年龄 |
| role | TEXT | NOT NULL | 表层身份（花店老板娘等） |
| secret_facts | TEXT(JSON) | NOT NULL | 真相表（谜底，不可变） |
| relations | TEXT(JSON) | NOT NULL | 初始关系网 [{targetId, stance}] |
| is_active | INTEGER | DEFAULT 1 | 是否在本轮回出场 |

```json
// secret_facts 形状
{
  "facts": [
    { "id": "f1", "statement": "蓑衣人捞过玩家 7 次", "isKey": true },
    { "id": "f2", "statement": "蓑衣人是老王死去的弟弟", "isKey": true },
    { "id": "f3", "statement": "蓑衣人每年涨水时来渡口", "isKey": false }
  ],
  "truth": "玩家已经死过 7 次，蓑衣人每次轮回都在场"
}
```

## 2. loops（轮回表）

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | TEXT | PK | loop id（可自增） |
| sequence | INTEGER | NOT NULL | 第几次轮回（从 1 起） |
| player_choice | TEXT | | 上一轮回的关键选择 |
| death_cause | TEXT | | 死亡方式 |
| death_knowledge | TEXT | | 死前知道了什么（写入记忆） |
| outcome | TEXT(JSON) | | 轮回结果快照 |
| status | TEXT | DEFAULT 'active' | active/ended |

## 3. memories（记忆表）

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | TEXT | PK | |
| resident_id | TEXT | FK → residents | 谁的记忆 |
| loop_id | TEXT | FK → loops | 产生于哪个轮回 |
| content | TEXT | NOT NULL | 记忆内容 |
| strength | REAL | DEFAULT 1.0 | 强度（衰减用） |
| is_permanent | INTEGER | DEFAULT 0 | 关键节点永久保留 |

**衰减规则**：非永久记忆每轮回 strength ×0.8；strength < 0.3 视为遗忘（不返回给 LLM）。

## 4. events（事件表）

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | TEXT | PK | |
| loop_id | TEXT | FK → loops | |
| type | TEXT | NOT NULL | clue/trap/ambient/plot |
| content | TEXT | NOT NULL | 生成的事件文本 |
| is_clue | INTEGER | DEFAULT 0 | 是否线索 |
| is_trap | INTEGER | DEFAULT 0 | 是否陷阱/干扰项 |

## 5. questions（提问表）

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | TEXT | PK | |
| loop_id | TEXT | FK → loops | |
| resident_id | TEXT | FK → residents | 问谁 |
| question | TEXT | NOT NULL | 玩家问题原文 |
| hit_fact_id | TEXT | | 命中真相表的 fact（可空） |
| answer | TEXT | NOT NULL | AI 回答 |
| answer_mode | TEXT | NOT NULL | direct/deny/silence/rhetoric |
| cost_llm | INTEGER | DEFAULT 0 | 本次是否调了 LLM（0=纯规则） |

## 6. world_states（世界状态表）

| 字段 | 类型 | 约束 | 说明 |
|---|---|---|---|
| id | TEXT | PK | |
| loop_id | TEXT | FK → loops | 快照对应轮回 |
| relations_snapshot | TEXT(JSON) | NOT NULL | 关系网全量快照 |
| flags | TEXT(JSON) | NOT NULL | 世界标记（如 {kingUnveiled: false}） |
| active_residents | TEXT(JSON) | NOT NULL | 本轮回出场居民 id 列表 |

## 7. 索引

```sql
CREATE INDEX idx_memories_resident ON memories(resident_id);
CREATE INDEX idx_questions_loop ON questions(loop_id);
CREATE INDEX idx_events_loop ON events(loop_id);
CREATE INDEX idx_loops_sequence ON loops(sequence);
```

## 8. 关键约束（代码层强制）

1. `secret_facts` 一旦写入不可变（真相表是唯一谜底）；
2. 额度（10 问/轮回）由 server 层校验，不信任前端；
3. 每次审问必须写 `questions` 行（审计/重放）；
4. `memories` 按居民聚合，查询时按 strength 降序返回 top-N。
