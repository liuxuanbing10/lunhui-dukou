---
prompt_id: character-art-r5
target: 何叔（r5-heshu）
version: 1.0
generated_from: docs/AI_IMAGE_PROMPTS.md B5
color_signature: "#7a6242 古铜 / #8aa0b4 钢蓝灰"
---

# 角色立绘生成 · 何叔（r5-heshu）⭐ M1 首发角色

> 钟楼修表匠。色签：#7a6242 古铜 / #8aa0b4 钢蓝灰。
> **顺序**：① body 过审 → ②③④ 表情层（带 body 参考图）→ ⑤ light。一次一张。

## ① body 定妆图 → 存为 `r5_heshu_body_v1.webp`（9:16 全身像）
> 用途：billboard 全身立绘 / 表情层参考图

```text
Full-body character portrait for a rain-night mystery narrative game. A hunchbacked elderly Chinese clockmaker, single monocle lens over one eye, coat pockets bulging with tiny brass gears, meticulous cold expression, one hand raised holding a pocket watch at chest height as if listening to it. Color signature: bronze #7a6242 main tone, steel blue-grey #8aa0b4 accents. Standing pose, slight 3/4 angle, body centered, full body head to feet visible, feet near bottom edge, 10% headroom. Lit from below-front by a single warm amber soup-bowl light (#ffb15c), cold blue rim light (#16324a) from behind, heavy dark vignette. Plain solid dark blue background (#0b1a2b) for clean cutout. Style: cinematic photorealistic digital painting, film concept art for a rain-night mystery game, hyper-detailed wet straw and weathered skin textures, dramatic split lighting, muted rain-night palette of deep cold blues, heavy dark vignette, film grain. Strictly NOT anime cel-shading, NOT cartoon, NOT flat illustration, no daylight, no neon, no text, no watermark.
```

- [ ] body 过审

## ② face_hit 命中真相层 → `r5_heshu_face_hit_v1.webp`（9:16 胸像，**带 body 参考图**）
> 用途：玩家戳中关键真相（3:17）时的演出表情

```text
Bust close-up portrait, same hunchbacked elderly clockmaker with monocle: the monocle catching one gleam of amber light, pupil behind it frozen, mouth slightly open mid-word, pocket watch chain taut — a man who just realized the clock tower has stopped at the same minute again. Identical lighting: warm amber from below-front (#ffb15c), cold blue rim (#16324a). Palette: bronze #7a6242, steel blue-grey #8aa0b4 accents, deep blue background (#0b1a2b). Head and shoulders only, face centered. Style: cinematic photorealistic digital painting, film concept art, hyper-detailed weathered skin, dramatic split lighting, muted rain-night palette, heavy vignette, film grain. NOT anime cel-shading, NOT cartoon, NOT flat illustration, no text, no watermark.
```

- [ ] face_hit 过审

## ③ face_pressed 被逼问层 → `r5_heshu_face_pressed_v1.webp`（9:16 胸像，**带 body 参考图**）
> 用途：玩家逼问、防御时的表情

```text
Bust close-up portrait, same hunchbacked elderly clockmaker: monocle lowered on its chain, bare eye narrowed with suspicion, deep frown lines, gears in pocket catching cold light — a man who trusts machines more than questions. Warm amber light from below-front (#ffb15c), cold blue rim (#16324a). Palette: bronze #7a6242, steel blue-grey #8aa0b4 accents, deep blue background (#0b1a2b). Head and shoulders only. Style: cinematic photorealistic digital painting, film concept art, hyper-detailed weathered skin, dramatic split lighting, muted rain-night palette, heavy vignette, film grain. NOT anime cel-shading, NOT cartoon, NOT flat illustration, no text, no watermark.
```

- [ ] face_pressed 过审

## ④ face_relief 释然层 → `r5_heshu_face_relief_v1.webp`（9:16 胸像，**带 body 参考图**）
> 用途：真相大白 / 释然时刻的表情

```text
Bust close-up portrait, same hunchbacked elderly clockmaker: monocle back over his eye but the eye behind it soft, brow unclenched, holding the pocket watch against his ear with something like peace — the clock, for once, sounds right. Warm amber light from below-front (#ffb15c) softened, cold blue rim (#16324a). Palette: bronze #7a6242, steel blue-grey #8aa0b4 accents, deep blue background (#0b1a2b). Head and shoulders only. Style: cinematic photorealistic digital painting, film concept art, hyper-detailed weathered skin, dramatic split lighting, muted rain-night palette, heavy vignette, film grain. NOT anime cel-shading, NOT cartoon, NOT flat illustration, no text, no watermark.
```

- [ ] face_relief 过审

## ⑤ light 光影层 → `r5_heshu_light_v1.webp`（纯黑底）
> 用途：2.5D 演出暖光边光 overlay

```text
Lighting overlay pass for a game engine: the exact silhouette of a hunchbacked old man raising a pocket watch, rendered ONLY as warm amber rim light and soft shadow shapes — glowing #ffb15c edges on the hunched back, monocle rim and watch, deep blue-black shadow masses inside, no facial detail, no textures, like a light mask. Pure solid BLACK background. Style: cinematic light study, film-concept rim lighting, hyper-detailed edge light, muted palette, heavy vignette, film grain. NOT anime, NOT cartoon, NOT flat illustration, no text, no watermark.
```

- [ ] light 过审

## 验收要点
- ☐ 全身像、站姿、脚贴底边（billboard 锚点）
- ☐ 驼背 + 单片眼镜 + 胸前端怀表（辨识核心，3:17 关键锚点）
- ☐ 古铜主调 + 钢蓝灰点缀（色签）
- ☐ 无 AI 伪影：多指、缺指、文字、水印、脸崩
