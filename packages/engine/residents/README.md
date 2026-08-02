# 居民资产目录（Hermes skill 结构）

> 每位居民 = 一个独立目录，仿照 Hermes skill/SOUL 结构组织。
> 目录结构在 `resident-loader.ts` 中被消费（读取每个目录的 SOUL.md）。

## 目录约定

```
residents/
└── r1-suoyi/
    ├── SOUL.md          ← 人格宪法（frontmatter + persona + 真相表 + 关系网）【必填，loader 读取】
    ├── references/      ← 深度档案：完整背景故事、恩怨细节、口癖语料（供 LLM 生成时注入）
    ├── templates/       ← 对话模板：典型回答句式、沉默/反问模板
    ├── scripts/         ← 专属判定逻辑（该角色有特殊规则时才放，一般留空）
    └── assets/          ← 立绘、表情差分、音效（AI 生成后存放）
```

## 规则

1. `SOUL.md` 是唯一被 loader 解析的文件（frontmatter + SecretFacts/Relations JSON 块）；
2. `references/` 内容**不参与规则判定**，只作为 LLM 生成时的上下文素材；
3. `assets/` 中图片/音频按 `{residentId}-{purpose}.{ext}` 命名（如 `r1-portrait.png`）；
4. 新增居民 = 复制 `r1-suoyi/` 骨架 → 改 SOUL.md → 无需改代码；
5. 空目录用 `.gitkeep` 占位（git 不跟踪空目录）。

## 资产清单（待产）

| 资产 | 位置 | 状态 |
|---|---|---|
| 立绘（8 人 × 6 表情） | `assets/` | 待 AI 生成 |
| 背景故事长文 | `references/` | 待写 |
| 对话模板 | `templates/` | 待写 |
