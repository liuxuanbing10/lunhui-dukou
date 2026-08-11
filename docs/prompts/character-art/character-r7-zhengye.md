---
prompt_id: character-art-r7
target: 郑爷（r7-zhengye）
version: 1.0
generated_from: docs/AI_IMAGE_PROMPTS.md B7
color_signature: "#2b3a52 藏青 / #b89a5a 黄铜"
---

# 角色立绘生成 · 郑爷（r7-zhengye）

> 巡夜人，只信巡逻路线。色签：#2b3a52 藏青 / #b89a5a 黄铜。
> **顺序**：① body 过审 → ②③④ 表情层（带 body 参考图）→ ⑤ light。一次一张。

## ① body 定妆图 → 存为 `r7_zhengye_body_v1.webp`（9:16 全身像）
> 用途：billboard 全身立绘 / 表情层参考图

```text
Full-body character portrait for a rain-night mystery narrative game. A stern Chinese night-watch guard in a worn old uniform, a brass whistle hanging at his neck, heavy dark eye bags, rigid spine, one hand resting on a dim hand-lantern (UNLIT, cold metal only — no warm light allowed), posture like a man mid-patrol who heard a wrong footstep. Color signature: navy blue #2b3a52 main tone, brass #b89a5a accents on whistle and buttons. Standing pose, slight 3/4 angle, body centered, full body head to feet visible, feet near bottom edge, 10% headroom. Lit from below-front by a single warm amber soup-bowl light (#ffb15c), cold blue rim light (#16324a) from behind, heavy dark vignette. Plain solid dark blue background (#0b1a2b) for clean cutout. Style: cinematic photorealistic digital painting, film concept art for a rain-night mystery game, hyper-detailed wet straw and weathered skin textures, dramatic split lighting, muted rain-night palette of deep cold blues, heavy dark vignette, film grain. Strictly NOT anime cel-shading, NOT cartoon, NOT flat illustration, no daylight, no neon, no text, no watermark.
```

- [ ] body 过审

## ② face_hit 命中真相层 → `r7_zhengye_face_hit_v1.webp`（9:16 胸像，**带 body 参考图**）
> 用途：玩家戳中关键真相时的演出表情

```text
Bust close-up portrait, same stern night-watch guard in worn uniform: heavy eye bags suddenly deeper, pupils fixed on a point over the viewer's shoulder, whistle caught between two fingers but not raised — a man who just saw, in memory, the person who should not have been at the dock that night. Identical lighting: warm amber from below-front (#ffb15c), cold blue rim (#16324a). Palette: navy blue #2b3a52, brass #b89a5a accents, deep blue background (#0b1a2b). Head and shoulders only, face centered. Style: cinematic photorealistic digital painting, film concept art, hyper-detailed weathered skin, dramatic split lighting, muted rain-night palette, heavy vignette, film grain. NOT anime cel-shading, NOT cartoon, NOT flat illustration, no text, no watermark.
```

- [ ] face_hit 过审

## ③ face_pressed 被逼问层 → `r7_zhengye_face_pressed_v1.webp`（9:16 胸像，**带 body 参考图**）
> 用途：玩家逼问、防御时的表情

```text
Bust close-up portrait, same stern night-watch guard: jaw clenched, one eyebrow twitching, hand closed into a fist around the whistle, uniform collar soaked with rain — order itself being questioned, and hating it. Warm amber light from below-front (#ffb15c), cold blue rim (#16324a). Palette: navy blue #2b3a52, brass #b89a5a accents, deep blue background (#0b1a2b). Head and shoulders only. Style: cinematic photorealistic digital painting, film concept art, hyper-detailed weathered skin, dramatic split lighting, muted rain-night palette, heavy vignette, film grain. NOT anime cel-shading, NOT cartoon, NOT flat illustration, no text, no watermark.
```

- [ ] face_pressed 过审

## ④ face_relief 释然层 → `r7_zhengye_face_relief_v1.webp`（9:16 胸像，**带 body 参考图**）
> 用途：真相大白 / 释然时刻的表情

```text
Bust close-up portrait, same stern night-watch guard: spine still straight but the fist open now, whistle resting quiet on his chest, heavy eyes half-closed with something close to rest — a patrol finally allowed to end. Warm amber light from below-front (#ffb15c) softened, cold blue rim (#16324a). Palette: navy blue #2b3a52, brass #b89a5a accents, deep blue background (#0b1a2b). Head and shoulders only. Style: cinematic photorealistic digital painting, film concept art, hyper-detailed weathered skin, dramatic split lighting, muted rain-night palette, heavy vignette, film grain. NOT anime cel-shading, NOT cartoon, NOT flat illustration, no text, no watermark.
```

- [ ] face_relief 过审

## ⑤ light 光影层 → `r7_zhengye_light_v1.webp`（纯黑底）
> 用途：2.5D 演出暖光边光 overlay

```text
Lighting overlay pass for a game engine: the exact silhouette of a rigid uniformed guard with a whistle at his neck, rendered ONLY as warm amber rim light and soft shadow shapes — glowing #ffb15c edges on cap brim, shoulders and whistle, deep blue-black shadow masses inside, no facial detail, no textures, like a light mask. Pure solid BLACK background. Style: cinematic light study, film-concept rim lighting, hyper-detailed edge light, muted palette, heavy vignette, film grain. NOT anime, NOT cartoon, NOT flat illustration, no text, no watermark.
```

- [ ] light 过审

## 验收要点
- ☐ 全身像、站姿、脚贴底边（billboard 锚点）
- ☐ 旧制服 + 铜哨 + 手提灯（**未点亮**，辨识核心）
- ☐ 藏青主调 + 黄铜点缀（色签）
- ☐ 无 AI 伪影：多指、缺指、文字、水印、脸崩
