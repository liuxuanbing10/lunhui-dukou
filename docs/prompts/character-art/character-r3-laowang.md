---
prompt_id: character-art-r3
target: 老王（r3-laowang）
version: 1.0
generated_from: docs/AI_IMAGE_PROMPTS.md B3
color_signature: "#6e5a3e 麦棕 / #d8cdb4 面粉白"
---

# 角色立绘生成 · 老王（r3-laowang）

> 面馆老板，每晚多煮一碗面。色签：#6e5a3e 麦棕 / #d8cdb4 面粉白。
> **顺序**：① body 过审 → ②③④ 表情层（带 body 参考图）→ ⑤ light。一次一张。

## ① body 定妆图 → 存为 `r3_laowang_body_v1.webp`（9:16 全身像）
> 用途：billboard 全身立绘 / 表情层参考图

```text
Full-body character portrait for a rain-night mystery narrative game. A sturdy middle-aged Chinese noodle-shop owner, apron always dusted with flour, rough calloused hands, deep wrinkles at the eye corners, honest heavy shoulders, holding a worn towel over one arm. Color signature: wheat brown #6e5a3e main tone, flour beige #d8cdb4 accents. Standing pose, slight 3/4 angle, body centered, full body head to feet visible, feet near bottom edge, 10% headroom. Lit from below-front by a single warm amber soup-bowl light (#ffb15c), cold blue rim light (#16324a) from behind, heavy dark vignette. Plain solid dark blue background (#0b1a2b) for clean cutout. Style: cinematic photorealistic digital painting, film concept art for a rain-night mystery game, hyper-detailed wet straw and weathered skin textures, dramatic split lighting, muted rain-night palette of deep cold blues, heavy dark vignette, film grain. Strictly NOT anime cel-shading, NOT cartoon, NOT flat illustration, no daylight, no neon, no text, no watermark.
```

- [ ] body 过审

## ② face_hit 命中真相层 → `r3_laowang_face_hit_v1.webp`（9:16 胸像，**带 body 参考图**）
> 用途：玩家戳中关键真相时的演出表情

```text
Bust close-up portrait, same sturdy noodle-shop owner with flour-dusted apron collar: his honest face caught mid-blink, towel forgotten in hand, wrinkles at eye corners frozen, mouth slightly open — a man who just heard a name he cooks an extra bowl of noodles for. Identical lighting: warm amber from below-front (#ffb15c), cold blue rim (#16324a). Palette: wheat brown #6e5a3e, flour beige #d8cdb4 accents, deep blue background (#0b1a2b). Head and shoulders only, face centered. Style: cinematic photorealistic digital painting, film concept art, hyper-detailed weathered skin, dramatic split lighting, muted rain-night palette, heavy vignette, film grain. NOT anime cel-shading, NOT cartoon, NOT flat illustration, no text, no watermark.
```

- [ ] face_hit 过审

## ③ face_pressed 被逼问层 → `r3_laowang_face_pressed_v1.webp`（9:16 胸像，**带 body 参考图**）
> 用途：玩家逼问、防御时的表情

```text
Bust close-up portrait, same sturdy noodle-shop owner: brow furrowed deep, eyes dropped to the counter, jaw working, floury hands gripping the towel — a man hiding one truth under ten thousand honest ones. Warm amber light from below-front (#ffb15c), cold blue rim (#16324a). Palette: wheat brown #6e5a3e, flour beige #d8cdb4 accents, deep blue background (#0b1a2b). Head and shoulders only. Style: cinematic photorealistic digital painting, film concept art, hyper-detailed weathered skin, dramatic split lighting, muted rain-night palette, heavy vignette, film grain. NOT anime cel-shading, NOT cartoon, NOT flat illustration, no text, no watermark.
```

- [ ] face_pressed 过审

## ④ face_relief 释然层 → `r3_laowang_face_relief_v1.webp`（9:16 胸像，**带 body 参考图**）
> 用途：真相大白 / 释然时刻的表情

```text
Bust close-up portrait, same sturdy noodle-shop owner: eyes finally crinkled into a real tired smile, shoulders dropped two inches, looking at an empty corner table as if someone finally came to eat. Warm amber light from below-front (#ffb15c) softened, cold blue rim (#16324a). Palette: wheat brown #6e5a3e, flour beige #d8cdb4 accents, deep blue background (#0b1a2b). Head and shoulders only. Style: cinematic photorealistic digital painting, film concept art, hyper-detailed weathered skin, dramatic split lighting, muted rain-night palette, heavy vignette, film grain. NOT anime cel-shading, NOT cartoon, NOT flat illustration, no text, no watermark.
```

- [ ] face_relief 过审

## ⑤ light 光影层 → `r3_laowang_light_v1.webp`（纯黑底）
> 用途：2.5D 演出暖光边光 overlay

```text
Lighting overlay pass for a game engine: the exact silhouette of a sturdy man in a flour-dusted apron holding a towel, rendered ONLY as warm amber rim light and soft shadow shapes — glowing #ffb15c edges on shoulders, bald patch and apron, deep blue-black shadow masses inside, no facial detail, no textures, like a light mask. Pure solid BLACK background. Style: cinematic light study, film-concept rim lighting, hyper-detailed edge light, muted palette, heavy vignette, film grain. NOT anime, NOT cartoon, NOT flat illustration, no text, no watermark.
```

- [ ] light 过审

## 验收要点
- ☐ 全身像、站姿、脚贴底边（billboard 锚点）
- ☐ 面粉围裙 + 搭臂毛巾（辨识核心）
- ☐ 麦棕主调 + 面粉白点缀（色签）
- ☐ 无 AI 伪影：多指、缺指、文字、水印、脸崩
