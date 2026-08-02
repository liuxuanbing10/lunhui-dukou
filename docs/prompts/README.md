# 背景长文提示词（Prompt Pack）

> 为《轮回渡口》8 位居民生成背景长文的提示词包。
> 使用方法：把对应提示词文件**整体复制**给任意 AI（DeepSeek/Kimi/豆包/Claude/ChatGPT），AI 会直接输出符合项目世界观的背景长文。

## 文件清单

| 文件 | 对应居民 | 产出 |
|---|---|---|
| `backstory-r1-suoyi.md` | 蓑衣人 | 背景长文 → 存 `packages/engine/residents/r1-suoyi/references/` |
| `backstory-r2-alan.md` | 阿岚（花店老板娘） | 同上 → `r2-alan/references/` |
| `backstory-r3-laowang.md` | 老王（面馆老板） | 同上 → `r3-laowang/references/` |
| `backstory-r4-ali.md` | 阿黎（纸人铺学徒） | 同上 → `r4-ali/references/` |
| `backstory-r5-heshu.md` | 何叔（钟楼修表匠） | 同上 → `r5-heshu/references/` |
| `backstory-r6-laoxiang.md` | 老鲞（码头渔夫） | 同上 → `r6-laoxiang/references/` |
| `backstory-r7-zhengye.md` | 郑爷（巡夜人） | 同上 → `r7-zhengye/references/` |
| `backstory-r8-xiaoman.md` | 小满（来历不明的孩子） | 同上 → `r8-xiaoman/references/` |

## 使用流程

1. 打开 `backstory-{id}.md`，全选复制；
2. 粘贴给任意 AI，发送；
3. AI 输出背景长文（四节结构，800–1500 字）；
4. 人工检查红线（真相表一致、无 AI 腔、情感之刺在）——**主创把关，AI 不可自审**；
5. 通过后存入 `packages/engine/residents/{id}/references/backstory.md`。

## 重新生成提示词

提示词由 SOUL.md 驱动，SOUL 改了就要重跑：

```bash
node docs/prompts/generate-backstory-prompts.mjs
```

## 质量验收（主创自审清单）

- [ ] 与真相表无矛盾（含完整真相，但"摆渡人是谁"的最终谜底点到即止）；
- [ ] 有"情感之刺"（让人心疼的落点）；
- [ ] 生活化恐怖（无夸张鬼怪/血浆）；
- [ ] 无 AI 腔（无"总之/值得注意的是/首先其次"）；
- [ ] 四节结构完整（来之前 / 改变的事 / 现在 / 与摆渡人的关系）；
- [ ] 800–1500 字。
