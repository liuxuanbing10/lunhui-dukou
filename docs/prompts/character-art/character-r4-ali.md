---
prompt_id: character-art-r4
target: 阿黎（r4-ali）
version: 1.0
generated_from: docs/AI_IMAGE_PROMPTS.md B4
color_signature: "#c9c2b4 纸白 / #c0473b 朱砂红"
---

# 角色立绘生成 · 阿黎（r4-ali）

> 纸人铺学徒，夜里不敢看自己扎的纸人。色签：#c9c2b4 纸白 / #c0473b 朱砂红。
> **顺序**：① body 过审 → ②③④ 表情层（带 body 参考图）→ ⑤ light。一次一张。

## ① body 定妆图 → 存为 `r4_ali_body_v1.webp`（9:16 全身像）
> 用途：billboard 全身立绘 / 表情层参考图

```text
Full-body character portrait for a rain-night mystery narrative game. A thin pale young Chinese paper-craft apprentice, fingers stained with cinnabar red and paste, dark circles under his eyes, timid hunched posture, holding a small unfinished paper figure half-hidden behind his back. Color signature: paper white #c9c2b4 main tone, cinnabar red #c0473b accents on fingertips and the paper figure's cheek dot. Standing pose, slight 3/4 angle, body centered, full body head to feet visible, feet near bottom edge, 10% headroom. Lit from below-front by a single warm amber soup-bowl light (#ffb15c), cold blue rim light (#16324a) from behind, heavy dark vignette. Plain solid dark blue background (#0b1a2b) for clean cutout. Style: cinematic photorealistic digital painting, film concept art for a rain-night mystery game, hyper-detailed wet straw and weathered skin textures, dramatic split lighting, muted rain-night palette of deep cold blues, heavy dark vignette, film grain. Strictly NOT anime cel-shading, NOT cartoon, NOT flat illustration, no daylight, no neon, no text, no watermark.
```

- [ ] body 过审

## ② face_hit 命中真相层 → `r4_ali_face_hit_v1.webp`（9:16 胸像，**带 body 参考图**）
> 用途：玩家戳中关键真相时的演出表情

```text
Bust close-up portrait, same thin pale paper-craft apprentice with dark circles: pupils contracted to pinpoints, lips parted mid-stammer, a smear of cinnabar red on his cheekbone, the paper figure's edge visible at frame bottom — a boy who just heard his paper figures described doing something at night. Identical lighting: warm amber from below-front (#ffb15c), cold blue rim (#16324a). Palette: paper white #c9c2b4, cinnabar red #c0473b accents, deep blue background (#0b1a2b). Head and shoulders only, face centered. Style: cinematic photorealistic digital painting, film concept art, hyper-detailed weathered skin, dramatic split lighting, muted rain-night palette, heavy vignette, film grain. NOT anime cel-shading, NOT cartoon, NOT flat illustration, no text, no watermark.
```

- [ ] face_hit 过审

## ③ face_pressed 被逼问层 → `r4_ali_face_pressed_v1.webp`（9:16 胸像，**带 body 参考图**）
> 用途：玩家逼问、防御时的表情

```text
Bust close-up portrait, same thin pale paper-craft apprentice: shoulders drawn up to his ears, eyes darting sideways avoiding the viewer, lower lip trembling slightly, cinnabar-stained fingers raised near his collarbone as if shielding something. Warm amber light from below-front (#ffb15c), cold blue rim (#16324a). Palette: paper white #c9c2b4, cinnabar red #c0473b accents, deep blue background (#0b1a2b). Head and shoulders only. Style: cinematic photorealistic digital painting, film concept art, hyper-detailed weathered skin, dramatic split lighting, muted rain-night palette, heavy vignette, film grain. NOT anime cel-shading, NOT cartoon, NOT flat illustration, no text, no watermark.
```

- [ ] face_pressed 过审

## ④ face_relief 释然层 → `r4_ali_face_relief_v1.webp`（9:16 胸像，**带 body 参考图**）
> 用途：真相大白 / 释然时刻的表情

```text
Bust close-up portrait, same thin pale paper-craft apprentice: dark circles still there but eyes finally steady, a small wondering half-smile, holding the little paper figure out in front of him openly instead of hiding it. Warm amber light from below-front (#ffb15c) softened, cold blue rim (#16324a). Palette: paper white #c9c2b4, cinnabar red #c0473b accents, deep blue background (#0b1a2b). Head and shoulders only. Style: cinematic photorealistic digital painting, film concept art, hyper-detailed weathered skin, dramatic split lighting, muted rain-night palette, heavy vignette, film grain. NOT anime cel-shading, NOT cartoon, NOT flat illustration, no text, no watermark.
```

- [ ] face_relief 过审

## ⑤ light 光影层 → `r4_ali_light_v1.webp`（纯黑底）
> 用途：2.5D 演出暖光边光 overlay

```text
Lighting overlay pass for a game engine: the exact silhouette of a thin hunched apprentice holding a small paper figure behind his back, rendered ONLY as warm amber rim light and soft shadow shapes — glowing #ffb15c edges on hair, spine curve and the paper figure, deep blue-black shadow masses inside, no facial detail, no textures, like a light mask. Pure solid BLACK background. Style: cinematic light study, film-concept rim lighting, hyper-detailed edge light, muted palette, heavy vignette, film grain. NOT anime, NOT cartoon, NOT flat illustration, no text, no watermark.
```

- [ ] light 过审

## 验收要点
- ☐ 全身像、站姿、脚贴底边（billboard 锚点）
- ☐ 纸人铺学徒：朱砂指印 + 身后半藏纸人（辨识核心）
- ☐ 纸白主调 + 朱砂红点缀（色签）
- ☐ 无 AI 伪影：多指、缺指、文字、水印、脸崩
