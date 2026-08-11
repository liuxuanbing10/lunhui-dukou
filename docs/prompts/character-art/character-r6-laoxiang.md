---
prompt_id: character-art-r6
target: 老鲞（r6-laoxiang）
version: 1.0
generated_from: docs/AI_IMAGE_PROMPTS.md B6
color_signature: "#5a4232 深棕 / #c9b08a 绳麻"
---

# 角色立绘生成 · 老鲞（r6-laoxiang）

> 码头渔夫，涨水夜出船的人。色签：#5a4232 深棕 / #c9b08a 绳麻。
> **顺序**：① body 过审 → ②③④ 表情层（带 body 参考图）→ ⑤ light。一次一张。

## ① body 定妆图 → 存为 `r6_laoxiang_body_v1.webp`（9:16 全身像）
> 用途：billboard 全身立绘 / 表情层参考图

```text
Full-body character portrait for a rain-night mystery narrative game. A weathered loud Chinese fisherman, deeply tanned dark brown skin, rolled-up sleeves, rope coiled over one shoulder, a big grin showing smoke-stained teeth, stance wide and braced like a deck in a swell. Color signature: deep brown #5a4232 main tone, rope hemp #c9b08a accents. Standing pose, slight 3/4 angle, body centered, full body head to feet visible, feet near bottom edge, 10% headroom. Lit from below-front by a single warm amber soup-bowl light (#ffb15c), cold blue rim light (#16324a) from behind, heavy dark vignette. Plain solid dark blue background (#0b1a2b) for clean cutout. Style: cinematic photorealistic digital painting, film concept art for a rain-night mystery game, hyper-detailed wet straw and weathered skin textures, dramatic split lighting, muted rain-night palette of deep cold blues, heavy dark vignette, film grain. Strictly NOT anime cel-shading, NOT cartoon, NOT flat illustration, no daylight, no neon, no text, no watermark.
```

- [ ] body 过审

## ② face_hit 命中真相层 → `r6_laoxiang_face_hit_v1.webp`（9:16 胸像，**带 body 参考图**）
> 用途：玩家戳中关键真相时的演出表情

```text
Bust close-up portrait, same deeply tanned fisherman with rope on shoulder: the big grin gone mid-laugh, mouth still open but eyes suddenly flat and far away, rain dripping off his chin — a man who just heard what he fishes for on rising-water nights named out loud. Identical lighting: warm amber from below-front (#ffb15c), cold blue rim (#16324a). Palette: deep brown #5a4232, rope hemp #c9b08a accents, deep blue background (#0b1a2b). Head and shoulders only, face centered. Style: cinematic photorealistic digital painting, film concept art, hyper-detailed weathered skin, dramatic split lighting, muted rain-night palette, heavy vignette, film grain. NOT anime cel-shading, NOT cartoon, NOT flat illustration, no text, no watermark.
```

- [ ] face_hit 过审

## ③ face_pressed 被逼问层 → `r6_laoxiang_face_pressed_v1.webp`（9:16 胸像，**带 body 参考图**）
> 用途：玩家逼问、防御时的表情

```text
Bust close-up portrait, same deeply tanned fisherman: jaw set, eyes narrowed into slits, voice clearly dropped an octave, rope tightening across his shoulder — a loud man choosing to be quiet, which is worse. Warm amber light from below-front (#ffb15c), cold blue rim (#16324a). Palette: deep brown #5a4232, rope hemp #c9b08a accents, deep blue background (#0b1a2b). Head and shoulders only. Style: cinematic photorealistic digital painting, film concept art, hyper-detailed weathered skin, dramatic split lighting, muted rain-night palette, heavy vignette, film grain. NOT anime cel-shading, NOT cartoon, NOT flat illustration, no text, no watermark.
```

- [ ] face_pressed 过审

## ④ face_relief 释然层 → `r6_laoxiang_face_relief_v1.webp`（9:16 胸像，**带 body 参考图**）
> 用途：真相大白 / 释然时刻的表情

```text
Bust close-up portrait, same deeply tanned fisherman: a small real laugh escaping, one eye squeezed shut, wiping his face with a rough forearm — the first honest sound he has made in years. Warm amber light from below-front (#ffb15c) softened, cold blue rim (#16324a). Palette: deep brown #5a4232, rope hemp #c9b08a accents, deep blue background (#0b1a2b). Head and shoulders only. Style: cinematic photorealistic digital painting, film concept art, hyper-detailed weathered skin, dramatic split lighting, muted rain-night palette, heavy vignette, film grain. NOT anime cel-shading, NOT cartoon, NOT flat illustration, no text, no watermark.
```

- [ ] face_relief 过审

## ⑤ light 光影层 → `r6_laoxiang_light_v1.webp`（纯黑底）
> 用途：2.5D 演出暖光边光 overlay

```text
Lighting overlay pass for a game engine: the exact silhouette of a broad-shouldered fisherman with rope coiled over his shoulder, rendered ONLY as warm amber rim light and soft shadow shapes — glowing #ffb15c edges on shoulders, rope and jaw, deep blue-black shadow masses inside, no facial detail, no textures, like a light mask. Pure solid BLACK background. Style: cinematic light study, film-concept rim lighting, hyper-detailed edge light, muted palette, heavy vignette, film grain. NOT anime, NOT cartoon, NOT flat illustration, no text, no watermark.
```

- [ ] light 过审

## 验收要点
- ☐ 全身像、站姿、脚贴底边（billboard 锚点）
- ☐ 晒黑渔夫 + 肩绕绳索 + 大嗓门笑容（辨识核心）
- ☐ 深棕主调 + 绳麻点缀（色签）
- ☐ 无 AI 伪影：多指、缺指、文字、水印、脸崩
