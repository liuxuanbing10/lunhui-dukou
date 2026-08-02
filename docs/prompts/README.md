# 背景长文提示词（Prompt Pack）

> 为《轮回渡口》8 位居民生成背景长文的提示词包。
> **投递方式：`world-lore.md` + 对应角色的 `backstory-{id}.md` 两个文件一起复制给 AI。**

## 文件清单

### 公共文件（每个角色都要带）
| 文件 | 内容 |
|---|---|
| `world-lore.md` | 世界观 + 写作基调 + 全局红线 + 8 人关系网总览（**改世界观只改这里**） |

### 角色专属（8 份）
| 文件 | 对应居民 | 产出存放 |
|---|---|---|
| `backstory-r1-suoyi.md` | 蓑衣人 | `packages/engine/residents/r1-suoyi/references/` |
| `backstory-r2-alan.md` | 阿岚（花店老板娘） | `r2-alan/references/` |
| `backstory-r3-laowang.md` | 老王（面馆老板） | `r3-laowang/references/` |
| `backstory-r4-ali.md` | 阿黎（纸人铺学徒） | `r4-ali/references/` |
| `backstory-r5-heshu.md` | 何叔（钟楼修表匠） | `r5-heshu/references/` |
| `backstory-r6-laoxiang.md` | 老鲞（码头渔夫） | `r6-laoxiang/references/` |
| `backstory-r7-zhengye.md` | 郑爷（巡夜人） | `r7-zhengye/references/` |
| `backstory-r8-xiaoman.md` | 小满（来历不明的孩子） | `r8-xiaoman/references/` |

## 使用流程（投递 = 两个文件）

1. **复制 `world-lore.md` 全文** → 粘贴给 AI；
2. **再复制 `backstory-{id}.md` 全文** → 粘贴到同一对话（紧随其后）；
3. AI 输出该居民背景长文（四节结构，800–1500 字）；
4. 人工检查红线（真相表一致、情感之刺在、无 AI 腔）——**主创把关，AI 不可自审**；
5. 通过后存入 `packages/engine/residents/{id}/references/backstory.md`。

**投递顺序建议**：先蓑衣人（r1，关系网枢纽），再按 r2→r8。

## 重新生成提示词

提示词由 SOUL.md 驱动，SOUL 或模板改了就要重跑：

```bash
node docs/prompts/generate-backstory-prompts.mjs
```

（`world-lore.md` 是独立文件，改世界观不需要重跑——它不参与模板填充。）

## 质量验收（主创自审清单）

- [ ] 与真相表无矛盾（含完整真相，但"摆渡人是谁"的最终谜底点到即止）；
- [ ] 有"情感之刺"（让人心疼的落点）；
- [ ] 生活化恐怖（无夸张鬼怪/血浆）；
- [ ] 无 AI 腔（无"总之/值得注意的是/首先其次"）；
- [ ] 四节结构完整（来之前 / 改变的事 / 现在 / 与摆渡人的关系）；
- [ ] 与 world-lore.md 关系网总览一致；
- [ ] 800–1500 字。
