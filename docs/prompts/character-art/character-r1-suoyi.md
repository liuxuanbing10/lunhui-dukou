---
prompt_id: character-art-r1
target: 蓑衣人（r1-suoyi）
version: 1.0
generated_from: docs/AI_IMAGE_PROMPTS.md B1
color_signature: "#3d4f42 苔绿灰 / #a8532f 锈红"
---

# 角色立绘生成 · 蓑衣人（r1-suoyi）

> 渡口常客，话极少，像秤砣。色签：#3d4f42 苔绿灰 / #a8532f 锈红。
> **顺序**：① body 过审 → ②③④ 表情层（带 body 参考图）→ ⑤ light。一次一张。

## ① body 定妆图 → 存为 `r1_suoyi_body_v1.webp`（9:16 全身像）
> 用途：billboard 全身立绘 / 表情层参考图

```text
Full-body character portrait for a rain-night mystery narrative game. A mysterious ferry-dock dweller wearing a tattered woven straw raincoat (suoyi), a wide bamboo hat pulled very low hiding most of the face, weathered hands hidden in sleeves, still as a stone marker. Color signature: moss green-grey #3d4f42 as main tone, rust red #a8532f only as tiny accents on the straw. Standing pose, slight 3/4 angle, body centered, full body head to feet visible, feet near bottom edge, 10% headroom. Lit from below-front by a single warm amber soup-bowl light (#ffb15c), cold blue rim light (#16324a) from behind, heavy dark vignette. Plain solid dark blue background (#0b1a2b) for clean cutout. Style: cinematic photorealistic digital painting, film concept art for a rain-night mystery game, hyper-detailed wet straw and weathered skin textures, dramatic split lighting, muted rain-night palette of deep cold blues, heavy dark vignette, film grain. Strictly NOT anime cel-shading, NOT cartoon, NOT flat illustration, no daylight, no neon, no text, no watermark.
```

- [ ] body 过审

## ② face_hit 命中真相层 → `r1_suoyi_face_hit_v1.webp`（9:16 胸像，**带 body 参考图**）
> 用途：玩家戳中关键真相时的演出表情

```text
Bust close-up portrait, same mysterious character: tattered straw raincoat collar visible, wide bamboo hat brim lifted slightly, revealing only a jaw and ONE weathered eye in warm amber light — pupil slightly contracted, gaze frozen, the instant of being seen through. Identical lighting: warm amber soup-bowl light from below-front (#ffb15c), cold blue rim (#16324a) from behind. Palette: moss green-grey #3d4f42, rust red #a8532f accents, deep blue background (#0b1a2b). Head and shoulders only, face centered. Style: cinematic photorealistic digital painting, film concept art, hyper-detailed weathered skin, dramatic split lighting, muted rain-night palette, heavy vignette, film grain. NOT anime cel-shading, NOT cartoon, NOT flat illustration, no text, no watermark.
```

- [ ] face_hit 过审

## ③ face_pressed 被逼问层 → `r1_suoyi_face_pressed_v1.webp`（9:16 胸像，**带 body 参考图**）
> 用途：玩家逼问、防御沉默时的表情

```text
Bust close-up portrait, same mysterious character in tattered straw raincoat, bamboo hat brim casting deep shadow over the eyes, only the mouth visible: lips pressed into a thin hard line, jaw tense, chin slightly lowered — defensive silence like a stone sinking. Warm amber light from below-front (#ffb15c) now harsher on the jaw, cold blue rim (#16324a). Palette: moss green-grey #3d4f42, rust red #a8532f accents, deep blue background (#0b1a2b). Head and shoulders only. Style: cinematic photorealistic digital painting, film concept art, hyper-detailed weathered skin, dramatic split lighting, muted rain-night palette, heavy vignette, film grain. NOT anime cel-shading, NOT cartoon, NOT flat illustration, no text, no watermark.
```

- [ ] face_pressed 过审

## ④ face_relief 释然层 → `r1_suoyi_face_relief_v1.webp`（9:16 胸像，**带 body 参考图**）
> 用途：真相大白 / 释然时刻的表情

```text
Bust close-up portrait, same mysterious character in tattered straw raincoat, bamboo hat lifted enough to show a weathered mouth and relaxed jaw: the faintest release at the mouth corner, tension melted, like an old fisherman finally letting the river take something back. Warm amber light from below-front (#ffb15c) softened, cold blue rim (#16324a). Palette: moss green-grey #3d4f42, rust red #a8532f accents, deep blue background (#0b1a2b). Head and shoulders only. Style: cinematic photorealistic digital painting, film concept art, hyper-detailed weathered skin, dramatic split lighting, muted rain-night palette, heavy vignette, film grain. NOT anime cel-shading, NOT cartoon, NOT flat illustration, no text, no watermark.
```

- [ ] face_relief 过审

## ⑤ light 光影层 → `r1_suoyi_light_v1.webp`（纯黑底）
> 用途：2.5D 演出暖光边光 overlay

```text
Lighting overlay pass for a game engine: the exact silhouette of a figure in a tattered straw raincoat and wide bamboo hat, rendered ONLY as warm amber rim light and soft shadow shapes — glowing #ffb15c edges on hat brim, shoulders and coat hem, deep blue-black shadow masses inside, no facial detail, no textures, like a light mask. Pure solid BLACK background. Style: cinematic light study, film-concept rim lighting, hyper-detailed edge light, muted palette, heavy vignette, film grain. NOT anime, NOT cartoon, NOT flat illustration, no text, no watermark.
```

- [ ] light 过审

## 验收要点
- ☐ 全身像、站姿、脚贴底边（billboard 锚点）
- ☐ 蓑衣 + 低垂竹笠遮脸（辨识核心）
- ☐ 苔绿灰主调 + 锈红细点缀（色签）
- ☐ 无 AI 伪影：多指、缺指、文字、水印、脸崩
