---
prompt_id: character-art-r8
target: 小满（r8-xiaoman）
version: 1.0
generated_from: docs/AI_IMAGE_PROMPTS.md B8
color_signature: "#7d93a8 灰蓝 / #d8a24a 琥珀"
---

# 角色立绘生成 · 小满（r8-xiaoman）

> 来历不明的孩子，在等人。色签：#7d93a8 灰蓝 / #d8a24a 琥珀。
> **顺序**：① body 过审 → ②③④ 表情层（带 body 参考图）→ ⑤ light。一次一张。

## ① body 定妆图 → 存为 `r8_xiaoman_body_v1.webp`（9:16 全身像）
> 用途：billboard 全身立绘 / 表情层参考图

```text
Full-body character portrait for a rain-night mystery narrative game. A 9-year-old Chinese child in clean but old patched clothes, hugging a cloth bundle tightly against his chest, unusually calm bright eyes that seem to know more than they should, hair slightly damp from drizzle, standing perfectly still. Color signature: grey blue #7d93a8 main tone, amber #d8a24a accents (a single amber thread tied around the cloth bundle). Standing pose, slight 3/4 angle, body centered, full body head to feet visible, feet near bottom edge, 10% headroom. Lit from below-front by a single warm amber soup-bowl light (#ffb15c), cold blue rim light (#16324a) from behind, heavy dark vignette. Plain solid dark blue background (#0b1a2b) for clean cutout. Style: cinematic photorealistic digital painting, film concept art for a rain-night mystery game, hyper-detailed wet straw and weathered skin textures, dramatic split lighting, muted rain-night palette of deep cold blues, heavy dark vignette, film grain. Strictly NOT anime cel-shading, NOT cartoon, NOT flat illustration, no daylight, no neon, no text, no watermark.
```

- [ ] body 过审

## ② face_hit 命中真相层 → `r8_xiaoman_face_hit_v1.webp`（9:16 胸像，**带 body 参考图**）
> 用途：玩家戳中关键真相时的演出表情

```text
Bust close-up portrait, same 9-year-old child hugging the cloth bundle: bright eyes perfectly steady, not surprised at all, head tilted two degrees, the faintest knowing look — a child who was waiting for exactly this question. Identical lighting: warm amber from below-front (#ffb15c), cold blue rim (#16324a). Palette: grey blue #7d93a8, amber #d8a24a accents, deep blue background (#0b1a2b). Head and shoulders only, face centered. Style: cinematic photorealistic digital painting, film concept art, hyper-detailed weathered skin, dramatic split lighting, muted rain-night palette, heavy vignette, film grain. NOT anime cel-shading, NOT cartoon, NOT flat illustration, no text, no watermark.
```

- [ ] face_hit 过审

## ③ face_pressed 被逼问层 → `r8_xiaoman_face_pressed_v1.webp`（9:16 胸像，**带 body 参考图**）
> 用途：玩家逼问、防御时的表情

```text
Bust close-up portrait, same 9-year-old child: arms tightening around the cloth bundle, chin lowered but eyes looking UP, unblinking, quiet as deep water — not fear, but a door closing politely. Warm amber light from below-front (#ffb15c), cold blue rim (#16324a). Palette: grey blue #7d93a8, amber #d8a24a accents, deep blue background (#0b1a2b). Head and shoulders only. Style: cinematic photorealistic digital painting, film concept art, hyper-detailed weathered skin, dramatic split lighting, muted rain-night palette, heavy vignette, film grain. NOT anime cel-shading, NOT cartoon, NOT flat illustration, no text, no watermark.
```

- [ ] face_pressed 过审

## ④ face_relief 释然层 → `r8_xiaoman_face_relief_v1.webp`（9:16 胸像，**带 body 参考图**）
> 用途：真相大白 / 释然时刻的表情

```text
Bust close-up portrait, same 9-year-old child: for one instant just a child — eyes shining wet, a tiny real smile, one hand loosening on the cloth bundle as if the person he waits for finally walked out of the rain. Warm amber light from below-front (#ffb15c) softened, cold blue rim (#16324a). Palette: grey blue #7d93a8, amber #d8a24a accents, deep blue background (#0b1a2b). Head and shoulders only. Style: cinematic photorealistic digital painting, film concept art, hyper-detailed weathered skin, dramatic split lighting, muted rain-night palette, heavy vignette, film grain. NOT anime cel-shading, NOT cartoon, NOT flat illustration, no text, no watermark.
```

- [ ] face_relief 过审

## ⑤ light 光影层 → `r8_xiaoman_light_v1.webp`（纯黑底）
> 用途：2.5D 演出暖光边光 overlay

```text
Lighting overlay pass for a game engine: the exact silhouette of a small child hugging a cloth bundle, rendered ONLY as warm amber rim light and soft shadow shapes — glowing #ffb15c edges on hair, small shoulders and the bundle, deep blue-black shadow masses inside, no facial detail, no textures, like a light mask. Pure solid BLACK background. Style: cinematic light study, film-concept rim lighting, hyper-detailed edge light, muted palette, heavy vignette, film grain. NOT anime, NOT cartoon, NOT flat illustration, no text, no watermark.
```

- [ ] light 过审

## 验收要点
- ☐ 全身像、站姿、脚贴底边（billboard 锚点）
- ☐ 9 岁孩子 + 紧抱布包（琥珀线点缀，辨识核心）
- ☐ 灰蓝主调 + 琥珀点缀（色签）
- ☐ 无 AI 伪影：多指、缺指、文字、水印、脸崩
