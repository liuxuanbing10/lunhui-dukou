---
prompt_id: character-art-r2
target: 阿岚（r2-alan）
version: 1.0
generated_from: docs/AI_IMAGE_PROMPTS.md B2
color_signature: "#4a5b6e 雾蓝 / #b87d8a 干玫瑰"
---

# 角色立绘生成 · 阿岚（r2-alan）

> 花店老板娘，笑里藏针。色签：#4a5b6e 雾蓝 / #b87d8a 干玫瑰。
> **顺序**：① body 过审 → ②③④ 表情层（带 body 参考图）→ ⑤ light。一次一张。

## ① body 定妆图 → 存为 `r2_alan_body_v1.webp`（9:16 全身像）
> 用途：billboard 全身立绘 / 表情层参考图

```text
Full-body character portrait for a rain-night mystery narrative game. A middle-aged Chinese woman florist, quick lively eyes, a smile that hides needles, wearing a floral apron over plain dark clothes, faint flower-juice stains on her fingers, holding a half-wrapped bouquet of white flowers loosely at her side. Color signature: mist blue #4a5b6e main tone, dusty rose #b87d8a accents in the apron flowers. Standing pose, slight 3/4 angle, body centered, full body head to feet visible, feet near bottom edge, 10% headroom. Lit from below-front by a single warm amber soup-bowl light (#ffb15c), cold blue rim light (#16324a) from behind, heavy dark vignette. Plain solid dark blue background (#0b1a2b) for clean cutout. Style: cinematic photorealistic digital painting, film concept art for a rain-night mystery game, hyper-detailed wet straw and weathered skin textures, dramatic split lighting, muted rain-night palette of deep cold blues, heavy dark vignette, film grain. Strictly NOT anime cel-shading, NOT cartoon, NOT flat illustration, no daylight, no neon, no text, no watermark.
```

- [ ] body 过审

## ② face_hit 命中真相层 → `r2_alan_face_hit_v1.webp`（9:16 胸像，**带 body 参考图**）
> 用途：玩家戳中关键真相时的演出表情

```text
Bust close-up portrait, same middle-aged woman florist with floral apron collar visible: her ever-present smile frozen mid-air, pupils slightly dilated, eyes suddenly seeing something far away, a flower petal held still between fingers. Identical lighting: warm amber from below-front (#ffb15c), cold blue rim (#16324a). Palette: mist blue #4a5b6e, dusty rose #b87d8a accents, deep blue background (#0b1a2b). Head and shoulders only, face centered. Style: cinematic photorealistic digital painting, film concept art, hyper-detailed weathered skin, dramatic split lighting, muted rain-night palette, heavy vignette, film grain. NOT anime cel-shading, NOT cartoon, NOT flat illustration, no text, no watermark.
```

- [ ] face_hit 过审

## ③ face_pressed 被逼问层 → `r2_alan_face_pressed_v1.webp`（9:16 胸像，**带 body 参考图**）
> 用途：玩家逼问、防御时的表情

```text
Bust close-up portrait, same middle-aged woman florist: smile gone, brow ridge lowered, eyes sharp and measuring like counting change, chin slightly raised, lips tight — a woman deciding whether you are worth a lie. Warm amber light from below-front (#ffb15c) harsher, cold blue rim (#16324a). Palette: mist blue #4a5b6e, dusty rose #b87d8a accents, deep blue background (#0b1a2b). Head and shoulders only. Style: cinematic photorealistic digital painting, film concept art, hyper-detailed weathered skin, dramatic split lighting, muted rain-night palette, heavy vignette, film grain. NOT anime cel-shading, NOT cartoon, NOT flat illustration, no text, no watermark.
```

- [ ] face_pressed 过审

## ④ face_relief 释然层 → `r2_alan_face_relief_v1.webp`（9:16 胸像，**带 body 参考图**）
> 用途：真相大白 / 释然时刻的表情

```text
Bust close-up portrait, same middle-aged woman florist: a real smile this time, small and tired, brow unknotted, eyes moist with something she will never name, one hand resting flat on her chest. Warm amber light from below-front (#ffb15c) softened, cold blue rim (#16324a). Palette: mist blue #4a5b6e, dusty rose #b87d8a accents, deep blue background (#0b1a2b). Head and shoulders only. Style: cinematic photorealistic digital painting, film concept art, hyper-detailed weathered skin, dramatic split lighting, muted rain-night palette, heavy vignette, film grain. NOT anime cel-shading, NOT cartoon, NOT flat illustration, no text, no watermark.
```

- [ ] face_relief 过审

## ⑤ light 光影层 → `r2_alan_light_v1.webp`（纯黑底）
> 用途：2.5D 演出暖光边光 overlay

```text
Lighting overlay pass for a game engine: the exact silhouette of a middle-aged woman in a floral apron holding a bouquet at her side, rendered ONLY as warm amber rim light and soft shadow shapes — glowing #ffb15c edges on hair, shoulders and flower heads, deep blue-black shadow masses inside, no facial detail, no textures, like a light mask. Pure solid BLACK background. Style: cinematic light study, film-concept rim lighting, hyper-detailed edge light, muted palette, heavy vignette, film grain. NOT anime, NOT cartoon, NOT flat illustration, no text, no watermark.
```

- [ ] light 过审

## 验收要点
- ☐ 全身像、站姿、脚贴底边（billboard 锚点）
- ☐ 花店围裙 + 手边白花束（辨识核心）
- ☐ 雾蓝主调 + 干玫瑰点缀（色签）
- ☐ 无 AI 伪影：多指、缺指、文字、水印、脸崩
