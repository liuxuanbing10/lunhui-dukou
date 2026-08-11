# 轮回渡口 · 角色立绘提示词包（逐角色投喂版）

> 用法：**一次处理一个角色文件**（`character-r*.md`），打开文件按顺序逐张生成。
> 提示词原文来自 `docs/AI_IMAGE_PROMPTS.md` B 节（八居民 × 六层规格，v1），**逐字保留**。
> 产出目标：8 位居民立绘（3D 跑图 billboard + 对话演出）+ 光影层。

---

## 文件清单（一次一个）

| 文件 | 角色 | 色签 | 备注 |
|---|---|---|---|
| `character-r1-suoyi.md` | 蓑衣人 | #3d4f42 苔绿灰 / #a8532f 锈红 | 关系网枢纽，**建议首发** |
| `character-r2-alan.md` | 阿岚 | #4a5b6e 雾蓝 / #b87d8a 干玫瑰 | |
| `character-r3-laowang.md` | 老王 | #6e5a3e 麦棕 / #d8cdb4 面粉白 | |
| `character-r4-ali.md` | 阿黎 | #c9c2b4 纸白 / #c0473b 朱砂红 | |
| `character-r5-heshu.md` | 何叔 | #7a6242 古铜 / #8aa0b4 钢蓝灰 | M1 首发角色（3:17 关键锚点） |
| `character-r6-laoxiang.md` | 老鲞 | #5a4232 深棕 / #c9b08a 绳麻 | |
| `character-r7-zhengye.md` | 郑爷 | #2b3a52 藏青 / #b89a5a 黄铜 | |
| `character-r8-xiaoman.md` | 小满 | #7d93a8 灰蓝 / #d8a24a 琥珀 | |

**试点建议**：先 `character-r1-suoyi.md` + `character-r5-heshu.md`——验证透明底立绘在 3D 场景里的效果（雾/光/雨下的可读性），跑通后再全阵容铺量。

---

## 每角色生产流程（文件内顺序）

1. **① body 定妆图** → 复制 prompt → 生图（9:16 竖版）→ 人工过审；
2. **②③④ 表情层**（face_hit / face_pressed / face_relief）→ 生成时**必须带上 body 定妆图作参考图**（图生图），防脸崩；
3. **⑤ light 光影层** → 纯黑底，最后生成；
4. 全层过审 → 抠图 + 规格化 → 入库 `packages/engine/residents/r{id}-{name}/assets/`。

---

## 通用纪律（每张图）

- **比例**：全部 9:16 竖版（生图平台选 9:16 或输入 1080×1920）。
- **风格锁（2026-08-11 定稿）**：**写实电影感数字绘画**（替代原「厚涂水彩」）。prompt 尾部已内置
  `cinematic photorealistic digital painting, film concept art, rain-night muted blue palette, single warm soup-bowl light, heavy vignette, film grain, not anime cel-shading, not cartoon, no flat illustration`。
  以 r1 蓑衣人首版为方向基准；血渍/锈色由各角色辅色自然呈现，不强加。
- **底色**：已写入 prompt——body/表情层 = 纯深蓝底 `#0b1a2b`（方便抠透明）；light = 纯黑底。
  （若生图平台出渐变底，抠图时 fuzz 降到 4-5% + 手动擦边缘即可。）
- **颜色锚定**：prompt 内置 theme.ts 色值（暖光 `#ffb15c` / 冷蓝 `#16324a`）与角色色签，**禁止自行改动颜色词**。
- **命名**：`{居民}_{层}_v1.webp`（如 `r1_suoyi_body_v1.webp`），只递增不覆盖，废稿留 `refs/`。
- **每角色 5 张**：body / face_hit / face_pressed / face_relief / light（face_neutral 不单独生成，body 自带中性表情）。

---

## 生成后处理（入库前）

1. **抠图（body / 表情层）**——深蓝底 → 透明底（ImageMagick，`D:\tools\ImageMagick`）：
   ```bash
   magick r1_suoyi_body_v1.png -fuzz 8% -transparent "#0b1a2b" r1_suoyi_body_alpha.png
   ```
2. **规格化**：裁剪 1080×1920 → WebP q82：
   ```bash
   magick r1_suoyi_body_alpha.png -resize 1080x1920 -quality 82 r1_suoyi_body_v1.webp
   ```
3. **入库路径**：`packages/engine/residents/r1-suoyi/assets/`（8 个角色目录已建，当前为空）。
4. **验收**：对照 `docs/art-style-standard-2.5d.md` §8.1 清单逐条签核（风格锁、色签、无 AI 伪影——多指/缺指/文字/水印）。

---

## 生产量统计

| 项 | 数值 |
|---|---|
| 角色 | 8（r1 蓑衣人 → r8 小满） |
| 每角色图片数 | 5（body / face_hit / face_pressed / face_relief / light） |
| **总计** | **40 张** |
