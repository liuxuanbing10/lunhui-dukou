# 轮回渡口 · AI 生图提示词全集（可直接复制使用）

> 版本：v1 ｜ 日期：2026-08-04 ｜ 上游：`art-style-standard-2.5d.md`（§3 色彩 / §6 资产规格 / §6.3 风格锁）、`ART_MASTER_PLAN.md`、`DEV_EXPERIENCE.md §7`
>
> **使用方式**：每个提示词都是自包含的完整块（已内置风格锁），整段复制即可投喂生图工具。
> 英文提示词兼容性最好；中文释义仅供理解意图，不要混进提示词。

---

## 0. 全局纪律（先读再开工）

1. **调色板锚定**：所有颜色必须使用 `packages/web/src/visual/theme.ts` 实际色值，禁止凭感觉写颜色词：
   - 冷蓝基底：`#0b1a2b`（rain.base）/ `#16324a`（rain.mist）/ `#9fc4e8`（雨丝高光）/ `#0a1422`（远景雾）
   - 唯一暖光：`#ffb15c`（汤碗核心）/ `#ffd9a0`（光晕）
   - 记忆碎片：`#d8a24a`（琥珀）/ `#a8532f`（锈红）/ `#c9b08a`（叠影残光）
2. **单一光源铁律**：画面中唯一暖光源是汤碗。背景里不得出现灯笼、窗户烛光等第二暖光。
3. **透明底策略**：多数生图工具不可靠输出 alpha 通道 → 提示词统一要求**纯色底**（立绘用 `#0b1a2b` 深蓝底、光影层用纯黑底），入库时用 ImageMagick 抠底（floodfill 容差 ≤ 8%），比赌 AI 透明底稳定。
4. **命名与留档**：产出按 `{类型}_{对象}_{变体}_v{N}.webp` 入库，原图与所用提示词存 `packages/engine/residents/r{N}-{slug}/assets/refs/`。
5. **生成顺序**：先 A 背景定调 → 再 B 何叔（r5）单人闭环（对齐 ART_MASTER_PLAN M1）→ 通过后批量 B 其余 7 人 → C/D → E。
6. **废稿红线**（任中一项直接重生成，不修补）：手指畸变、画面内出现文字、第二暖光源、赛璐璐/写实/3D 质感、高饱和霓虹色。

**规格速查**（标准 §6.1）：背景 16:9（源 2560×1440）；立绘竖 9:16（1080×1920）；道具 1:1（1024×1024）；碎片 1:1。

---

## A. 场景背景 · 渡口雨夜（三层视差 plate）

> 三层分绘，视差系数 0.2 / 0.5 / 1.0（标准 §4.1）。画面**中心偏下留空**（汤碗与角色站位由引擎叠加），禁止在背景里画人物。

### A1 远景雾层 `bg_dukou_far_v1`

参数：16:9，2560×1440，不透明。

```text
Distant fog layer background for a rain-night mystery game. Abstract silhouettes of an ancient Chinese ferry town dissolving in thick cold fog: a faint bell-tower outline, rooftop ridges, distant moored boats, all barely visible, half-melted into mist. Palette strictly deep cold blues (#0a1422 deepest, #16324a mid fog). Upper two-thirds is empty dark sky for falling rain. No lights, no figures, no detail — shapes only, like a memory of a town. Heavy vignette, painterly watercolor wash texture. Style: 2.5D narrative game background, thick-paint watercolor texture, muted rain-night palette of deep cold blues (#0b1a2b, #16324a), the ONLY warm light will be added later as an amber soup-bowl glow, none in this image, heavy dark vignette, painterly brushwork, cinematic fog and drizzle atmosphere. Strictly NOT photorealistic, NOT anime cel-shading, NOT 3D render, no daylight, no neon, no text, no watermark.
```

### A2 中景渡口层 `bg_dukou_mid_v1`

参数：16:9，2560×1440，不透明。

```text
Midground background plate of a riverside ferry dock at rainy night, for a mystery narrative game. Stone steps descending to black water, a small wooden ferry boat moored to a worn post, coiled rope, an unlit paper lantern hanging from a crooked pole, a humble noodle-stall silhouette with a closed counter at right side. Wet stone reflecting faint cold blue sheen (#9fc4e8 highlights at 10% opacity feel). Center-bottom area kept EMPTY and dark (a soup bowl will be placed there by the game engine). Palette: deep cold blues #0b1a2b base, #16324a midtones, absolutely NO warm lights anywhere. Drizzle in the air, heavy vignette, painterly thick-paint watercolor texture, cinematic composition. Style: 2.5D narrative game background, muted rain-night palette, heavy dark vignette, painterly brushwork. Strictly NOT photorealistic, NOT anime cel-shading, NOT 3D render, no daylight, no neon, no text, no watermark.
```

### A3 近景雨丝层 `bg_dukou_near_v1`

参数：16:9，2560×1440，入库后抠成透明叠层。

```text
Extreme foreground layer for a rain-night game scene, meant to be overlaid with depth-of-field blur. Dark out-of-focus shapes at the frame edges only: a blurred wet stone ledge at bottom-left, a hanging hemp rope at top-right, dense diagonal rain streaks catching faint cold light (#9fc4e8). The CENTER of the image must remain EMPTY and dark (#0b1a2b) so the scene behind stays visible. Painterly thick-paint watercolor texture, heavy motion-blurred rain, deep cold blue palette, cinematic. Style: 2.5D narrative game foreground overlay, muted rain-night palette (#0b1a2b, #16324a), heavy vignette at edges, NOT photorealistic, NOT anime, NOT 3D render, no text, no watermark.
```

---

## B. 角色立绘 · 八居民 × 六层规格

> 六层规格（标准 §6.1）：`body / face_neutral / face_hit / face_pressed / face_relief / light`。
> 生产技巧：**`face_neutral` 不单独生成**——身体层自带中性表情；四个表情层生成"同角色胸像特写"，后期 ImageMagick 裁切面部区域对齐身体层；光影层走纯黑底 screen 混合。
> 每角色先出**定妆图**（body 通过审核）后，表情层全部以定妆图为参照生成，防脸崩（ART_MASTER_PLAN R1 兜底）。

**角色色签**（本规划首次定义，注入该角色全部提示词，入库后写回 SOUL.md）：

| 居民 | 主色 | 辅色 | 居民 | 主色 | 辅色 |
|---|---|---|---|---|---|
| r1 蓑衣人 | #3d4f42 苔绿灰 | #a8532f 锈红 | r5 何叔 | #7a6242 古铜 | #8aa0b4 钢蓝灰 |
| r2 阿岚 | #4a5b6e 雾蓝 | #b87d8a 干玫瑰 | r6 老鲞 | #5a4232 深棕 | #c9b08a 绳麻 |
| r3 老王 | #6e5a3e 麦棕 | #d8cdb4 面粉白 | r7 郑爷 | #2b3a52 藏青 | #b89a5a 黄铜 |
| r4 阿黎 | #c9c2b4 纸白 | #c0473b 朱砂红 | r8 小满 | #7d93a8 灰蓝 | #d8a24a 琥珀 |

### B1 蓑衣人（r1-suoyi）· 渡口常客，话极少，像秤砣

**身体层** `r1_suoyi_body_v1`（9:16，1080×1920，纯色底）

```text
Full-body character portrait for a rain-night mystery narrative game. A mysterious ferry-dock dweller wearing a tattered woven straw raincoat (suoyi), a wide bamboo hat pulled very low hiding most of the face, weathered hands hidden in sleeves, still as a stone marker. Color signature: moss green-grey #3d4f42 as main tone, rust red #a8532f only as tiny accents on the straw. Standing pose, slight 3/4 angle, body centered, full body head to feet visible, feet near bottom edge, 10% headroom. Lit from below-front by a single warm amber soup-bowl light (#ffb15c), cold blue rim light (#16324a) from behind, heavy dark vignette. Plain solid dark blue background (#0b1a2b) for clean cutout. Style: 2.5D narrative game key illustration, thick-paint watercolor texture, muted rain-night palette of deep cold blues, heavy dark vignette, painterly brushwork, cinematic. Strictly NOT photorealistic, NOT anime cel-shading, NOT 3D render, no daylight, no neon, no text, no watermark.
```

**命中真相层** `r1_suoyi_face_hit_v1`（胸像特写，9:16）

```text
Bust close-up portrait, same mysterious character: tattered straw raincoat collar visible, wide bamboo hat brim lifted slightly, revealing only a jaw and ONE weathered eye in warm amber light — pupil slightly contracted, gaze frozen, the instant of being seen through. Identical lighting: warm amber soup-bowl light from below-front (#ffb15c), cold blue rim (#16324a) from behind. Palette: moss green-grey #3d4f42, rust red #a8532f accents, deep blue background (#0b1a2b). Head and shoulders only, face centered. Style: 2.5D narrative game illustration, thick-paint watercolor texture, muted rain-night palette, heavy vignette, painterly. NOT photorealistic, NOT anime cel-shading, NOT 3D render, no text, no watermark.
```

**被逼问层** `r1_suoyi_face_pressed_v1`

```text
Bust close-up portrait, same mysterious character in tattered straw raincoat, bamboo hat brim casting deep shadow over the eyes, only the mouth visible: lips pressed into a thin hard line, jaw tense, chin slightly lowered — defensive silence like a stone sinking. Warm amber light from below-front (#ffb15c) now harsher on the jaw, cold blue rim (#16324a). Palette: moss green-grey #3d4f42, rust red #a8532f accents, deep blue background (#0b1a2b). Head and shoulders only. Style: 2.5D narrative game illustration, thick-paint watercolor texture, muted rain-night palette, heavy vignette, painterly. NOT photorealistic, NOT anime, NOT 3D render, no text, no watermark.
```

**释然层** `r1_suoyi_face_relief_v1`

```text
Bust close-up portrait, same mysterious character in tattered straw raincoat, bamboo hat lifted enough to show a weathered mouth and relaxed jaw: the faintest release at the mouth corner, tension melted, like an old fisherman finally letting the river take something back. Warm amber light from below-front (#ffb15c) softened, cold blue rim (#16324a). Palette: moss green-grey #3d4f42, rust red #a8532f accents, deep blue background (#0b1a2b). Head and shoulders only. Style: 2.5D narrative game illustration, thick-paint watercolor texture, muted rain-night palette, heavy vignette, painterly. NOT photorealistic, NOT anime, NOT 3D render, no text, no watermark.
```

**光影层** `r1_suoyi_light_v1`（纯黑底，screen 混合用）

```text
Lighting overlay pass for a game engine: the exact silhouette of a figure in a tattered straw raincoat and wide bamboo hat, rendered ONLY as warm amber rim light and soft shadow shapes — glowing #ffb15c edges on hat brim, shoulders and coat hem, deep blue-black shadow masses inside, no facial detail, no textures, like a light mask. Pure solid BLACK background. Style: 2.5D painterly light study, thick-paint texture, muted palette, heavy vignette. NOT photorealistic, NOT anime, NOT 3D render, no text, no watermark.
```

### B2 阿岚（r2-alan）· 花店老板娘，笑里藏针

**身体层** `r2_alan_body_v1`

```text
Full-body character portrait for a rain-night mystery narrative game. A middle-aged Chinese woman florist, quick lively eyes, a smile that hides needles, wearing a floral apron over plain dark clothes, faint flower-juice stains on her fingers, holding a half-wrapped bouquet of white flowers loosely at her side. Color signature: mist blue #4a5b6e main tone, dusty rose #b87d8a accents in the apron flowers. Standing pose, slight 3/4 angle, body centered, full body head to feet visible, feet near bottom edge, 10% headroom. Lit from below-front by a single warm amber soup-bowl light (#ffb15c), cold blue rim light (#16324a) from behind, heavy dark vignette. Plain solid dark blue background (#0b1a2b) for clean cutout. Style: 2.5D narrative game key illustration, thick-paint watercolor texture, muted rain-night palette of deep cold blues, heavy dark vignette, painterly brushwork, cinematic. Strictly NOT photorealistic, NOT anime cel-shading, NOT 3D render, no daylight, no neon, no text, no watermark.
```

**命中真相层** `r2_alan_face_hit_v1`

```text
Bust close-up portrait, same middle-aged woman florist with floral apron collar visible: her ever-present smile frozen mid-air, pupils slightly dilated, eyes suddenly seeing something far away, a flower petal held still between fingers. Identical lighting: warm amber from below-front (#ffb15c), cold blue rim (#16324a). Palette: mist blue #4a5b6e, dusty rose #b87d8a accents, deep blue background (#0b1a2b). Head and shoulders only, face centered. Style: 2.5D narrative game illustration, thick-paint watercolor texture, muted rain-night palette, heavy vignette, painterly. NOT photorealistic, NOT anime, NOT 3D render, no text, no watermark.
```

**被逼问层** `r2_alan_face_pressed_v1`

```text
Bust close-up portrait, same middle-aged woman florist: smile gone, brow ridge lowered, eyes sharp and measuring like counting change, chin slightly raised, lips tight — a woman deciding whether you are worth a lie. Warm amber light from below-front (#ffb15c) harsher, cold blue rim (#16324a). Palette: mist blue #4a5b6e, dusty rose #b87d8a accents, deep blue background (#0b1a2b). Head and shoulders only. Style: 2.5D narrative game illustration, thick-paint watercolor texture, muted rain-night palette, heavy vignette, painterly. NOT photorealistic, NOT anime, NOT 3D render, no text, no watermark.
```

**释然层** `r2_alan_face_relief_v1`

```text
Bust close-up portrait, same middle-aged woman florist: a real smile this time, small and tired, brow unknotted, eyes moist with something she will never name, one hand resting flat on her chest. Warm amber light from below-front (#ffb15c) softened, cold blue rim (#16324a). Palette: mist blue #4a5b6e, dusty rose #b87d8a accents, deep blue background (#0b1a2b). Head and shoulders only. Style: 2.5D narrative game illustration, thick-paint watercolor texture, muted rain-night palette, heavy vignette, painterly. NOT photorealistic, NOT anime, NOT 3D render, no text, no watermark.
```

**光影层** `r2_alan_light_v1`

```text
Lighting overlay pass for a game engine: the exact silhouette of a middle-aged woman in a floral apron holding a bouquet at her side, rendered ONLY as warm amber rim light and soft shadow shapes — glowing #ffb15c edges on hair, shoulders and flower heads, deep blue-black shadow masses inside, no facial detail, no textures, like a light mask. Pure solid BLACK background. Style: 2.5D painterly light study, thick-paint texture, muted palette, heavy vignette. NOT photorealistic, NOT anime, NOT 3D render, no text, no watermark.
```

### B3 老王（r3-laowang）· 面馆老板，每晚多煮一碗面

**身体层** `r3_laowang_body_v1`

```text
Full-body character portrait for a rain-night mystery narrative game. A sturdy middle-aged Chinese noodle-shop owner, apron always dusted with flour, rough calloused hands, deep wrinkles at the eye corners, honest heavy shoulders, holding a worn towel over one arm. Color signature: wheat brown #6e5a3e main tone, flour beige #d8cdb4 accents. Standing pose, slight 3/4 angle, body centered, full body head to feet visible, feet near bottom edge, 10% headroom. Lit from below-front by a single warm amber soup-bowl light (#ffb15c), cold blue rim light (#16324a) from behind, heavy dark vignette. Plain solid dark blue background (#0b1a2b) for clean cutout. Style: 2.5D narrative game key illustration, thick-paint watercolor texture, muted rain-night palette of deep cold blues, heavy dark vignette, painterly brushwork, cinematic. Strictly NOT photorealistic, NOT anime cel-shading, NOT 3D render, no daylight, no neon, no text, no watermark.
```

**命中真相层** `r3_laowang_face_hit_v1`

```text
Bust close-up portrait, same sturdy noodle-shop owner with flour-dusted apron collar: his honest face caught mid-blink, towel forgotten in hand, wrinkles at eye corners frozen, mouth slightly open — a man who just heard a name he cooks an extra bowl of noodles for. Identical lighting: warm amber from below-front (#ffb15c), cold blue rim (#16324a). Palette: wheat brown #6e5a3e, flour beige #d8cdb4 accents, deep blue background (#0b1a2b). Head and shoulders only, face centered. Style: 2.5D narrative game illustration, thick-paint watercolor texture, muted rain-night palette, heavy vignette, painterly. NOT photorealistic, NOT anime, NOT 3D render, no text, no watermark.
```

**被逼问层** `r3_laowang_face_pressed_v1`

```text
Bust close-up portrait, same sturdy noodle-shop owner: brow furrowed deep, eyes dropped to the counter, jaw working, floury hands gripping the towel — a man hiding one truth under ten thousand honest ones. Warm amber light from below-front (#ffb15c), cold blue rim (#16324a). Palette: wheat brown #6e5a3e, flour beige #d8cdb4 accents, deep blue background (#0b1a2b). Head and shoulders only. Style: 2.5D narrative game illustration, thick-paint watercolor texture, muted rain-night palette, heavy vignette, painterly. NOT photorealistic, NOT anime, NOT 3D render, no text, no watermark.
```

**释然层** `r3_laowang_face_relief_v1`

```text
Bust close-up portrait, same sturdy noodle-shop owner: eyes finally crinkled into a real tired smile, shoulders dropped two inches, looking at an empty corner table as if someone finally came to eat. Warm amber light from below-front (#ffb15c) softened, cold blue rim (#16324a). Palette: wheat brown #6e5a3e, flour beige #d8cdb4 accents, deep blue background (#0b1a2b). Head and shoulders only. Style: 2.5D narrative game illustration, thick-paint watercolor texture, muted rain-night palette, heavy vignette, painterly. NOT photorealistic, NOT anime, NOT 3D render, no text, no watermark.
```

**光影层** `r3_laowang_light_v1`

```text
Lighting overlay pass for a game engine: the exact silhouette of a sturdy man in a flour-dusted apron holding a towel, rendered ONLY as warm amber rim light and soft shadow shapes — glowing #ffb15c edges on shoulders, bald patch and apron, deep blue-black shadow masses inside, no facial detail, no textures, like a light mask. Pure solid BLACK background. Style: 2.5D painterly light study, thick-paint texture, muted palette, heavy vignette. NOT photorealistic, NOT anime, NOT 3D render, no text, no watermark.
```

### B4 阿黎（r4-ali）· 纸人铺学徒，夜里不敢看自己扎的纸人

**身体层** `r4_ali_body_v1`

```text
Full-body character portrait for a rain-night mystery narrative game. A thin pale young Chinese paper-craft apprentice, fingers stained with cinnabar red and paste, dark circles under his eyes, timid hunched posture, holding a small unfinished paper figure half-hidden behind his back. Color signature: paper white #c9c2b4 main tone, cinnabar red #c0473b accents on fingertips and the paper figure's cheek dot. Standing pose, slight 3/4 angle, body centered, full body head to feet visible, feet near bottom edge, 10% headroom. Lit from below-front by a single warm amber soup-bowl light (#ffb15c), cold blue rim light (#16324a) from behind, heavy dark vignette. Plain solid dark blue background (#0b1a2b) for clean cutout. Style: 2.5D narrative game key illustration, thick-paint watercolor texture, muted rain-night palette of deep cold blues, heavy dark vignette, painterly brushwork, cinematic. Strictly NOT photorealistic, NOT anime cel-shading, NOT 3D render, no daylight, no neon, no text, no watermark.
```

**命中真相层** `r4_ali_face_hit_v1`

```text
Bust close-up portrait, same thin pale paper-craft apprentice with dark circles: pupils contracted to pinpoints, lips parted mid-stammer, a smear of cinnabar red on his cheekbone, the paper figure's edge visible at frame bottom — a boy who just heard his paper figures described doing something at night. Identical lighting: warm amber from below-front (#ffb15c), cold blue rim (#16324a). Palette: paper white #c9c2b4, cinnabar red #c0473b accents, deep blue background (#0b1a2b). Head and shoulders only, face centered. Style: 2.5D narrative game illustration, thick-paint watercolor texture, muted rain-night palette, heavy vignette, painterly. NOT photorealistic, NOT anime, NOT 3D render, no text, no watermark.
```

**被逼问层** `r4_ali_face_pressed_v1`

```text
Bust close-up portrait, same thin pale paper-craft apprentice: shoulders drawn up to his ears, eyes darting sideways avoiding the viewer, lower lip trembling slightly, cinnabar-stained fingers raised near his collarbone as if shielding something. Warm amber light from below-front (#ffb15c), cold blue rim (#16324a). Palette: paper white #c9c2b4, cinnabar red #c0473b accents, deep blue background (#0b1a2b). Head and shoulders only. Style: 2.5D narrative game illustration, thick-paint watercolor texture, muted rain-night palette, heavy vignette, painterly. NOT photorealistic, NOT anime, NOT 3D render, no text, no watermark.
```

**释然层** `r4_ali_face_relief_v1`

```text
Bust close-up portrait, same thin pale paper-craft apprentice: dark circles still there but eyes finally steady, a small wondering half-smile, holding the little paper figure out in front of him openly instead of hiding it. Warm amber light from below-front (#ffb15c) softened, cold blue rim (#16324a). Palette: paper white #c9c2b4, cinnabar red #c0473b accents, deep blue background (#0b1a2b). Head and shoulders only. Style: 2.5D narrative game illustration, thick-paint watercolor texture, muted rain-night palette, heavy vignette, painterly. NOT photorealistic, NOT anime, NOT 3D render, no text, no watermark.
```

**光影层** `r4_ali_light_v1`

```text
Lighting overlay pass for a game engine: the exact silhouette of a thin hunched apprentice holding a small paper figure behind his back, rendered ONLY as warm amber rim light and soft shadow shapes — glowing #ffb15c edges on hair, spine curve and the paper figure, deep blue-black shadow masses inside, no facial detail, no textures, like a light mask. Pure solid BLACK background. Style: 2.5D painterly light study, thick-paint texture, muted palette, heavy vignette. NOT photorealistic, NOT anime, NOT 3D render, no text, no watermark.
```

### B5 何叔（r5-heshu）· 钟楼修表匠（M1 首发角色）

**身体层** `r5_heshu_body_v1`

```text
Full-body character portrait for a rain-night mystery narrative game. A hunchbacked elderly Chinese clockmaker, single monocle lens over one eye, coat pockets bulging with tiny brass gears, meticulous cold expression, one hand raised holding a pocket watch at chest height as if listening to it. Color signature: bronze #7a6242 main tone, steel blue-grey #8aa0b4 accents. Standing pose, slight 3/4 angle, body centered, full body head to feet visible, feet near bottom edge, 10% headroom. Lit from below-front by a single warm amber soup-bowl light (#ffb15c), cold blue rim light (#16324a) from behind, heavy dark vignette. Plain solid dark blue background (#0b1a2b) for clean cutout. Style: 2.5D narrative game key illustration, thick-paint watercolor texture, muted rain-night palette of deep cold blues, heavy dark vignette, painterly brushwork, cinematic. Strictly NOT photorealistic, NOT anime cel-shading, NOT 3D render, no daylight, no neon, no text, no watermark.
```

**命中真相层** `r5_heshu_face_hit_v1`

```text
Bust close-up portrait, same hunchbacked elderly clockmaker with monocle: the monocle catching one gleam of amber light, pupil behind it frozen, mouth slightly open mid-word, pocket watch chain taut — a man who just realized the clock tower has stopped at the same minute again. Identical lighting: warm amber from below-front (#ffb15c), cold blue rim (#16324a). Palette: bronze #7a6242, steel blue-grey #8aa0b4 accents, deep blue background (#0b1a2b). Head and shoulders only, face centered. Style: 2.5D narrative game illustration, thick-paint watercolor texture, muted rain-night palette, heavy vignette, painterly. NOT photorealistic, NOT anime, NOT 3D render, no text, no watermark.
```

**被逼问层** `r5_heshu_face_pressed_v1`

```text
Bust close-up portrait, same hunchbacked elderly clockmaker: monocle lowered on its chain, bare eye narrowed with suspicion, deep frown lines, gears in pocket catching cold light — a man who trusts machines more than questions. Warm amber light from below-front (#ffb15c), cold blue rim (#16324a). Palette: bronze #7a6242, steel blue-grey #8aa0b4 accents, deep blue background (#0b1a2b). Head and shoulders only. Style: 2.5D narrative game illustration, thick-paint watercolor texture, muted rain-night palette, heavy vignette, painterly. NOT photorealistic, NOT anime, NOT 3D render, no text, no watermark.
```

**释然层** `r5_heshu_face_relief_v1`

```text
Bust close-up portrait, same hunchbacked elderly clockmaker: monocle back over his eye but the eye behind it soft, brow unclenched, holding the pocket watch against his ear with something like peace — the clock, for once, sounds right. Warm amber light from below-front (#ffb15c) softened, cold blue rim (#16324a). Palette: bronze #7a6242, steel blue-grey #8aa0b4 accents, deep blue background (#0b1a2b). Head and shoulders only. Style: 2.5D narrative game illustration, thick-paint watercolor texture, muted rain-night palette, heavy vignette, painterly. NOT photorealistic, NOT anime, NOT 3D render, no text, no watermark.
```

**光影层** `r5_heshu_light_v1`

```text
Lighting overlay pass for a game engine: the exact silhouette of a hunchbacked old man raising a pocket watch, rendered ONLY as warm amber rim light and soft shadow shapes — glowing #ffb15c edges on the hunched back, monocle rim and watch, deep blue-black shadow masses inside, no facial detail, no textures, like a light mask. Pure solid BLACK background. Style: 2.5D painterly light study, thick-paint texture, muted palette, heavy vignette. NOT photorealistic, NOT anime, NOT 3D render, no text, no watermark.
```

### B6 老鲞（r6-laoxiang）· 码头渔夫，涨水夜出船的人

**身体层** `r6_laoxiang_body_v1`

```text
Full-body character portrait for a rain-night mystery narrative game. A weathered loud Chinese fisherman, deeply tanned dark brown skin, rolled-up sleeves, rope coiled over one shoulder, a big grin showing smoke-stained teeth, stance wide and braced like a deck in a swell. Color signature: deep brown #5a4232 main tone, rope hemp #c9b08a accents. Standing pose, slight 3/4 angle, body centered, full body head to feet visible, feet near bottom edge, 10% headroom. Lit from below-front by a single warm amber soup-bowl light (#ffb15c), cold blue rim light (#16324a) from behind, heavy dark vignette. Plain solid dark blue background (#0b1a2b) for clean cutout. Style: 2.5D narrative game key illustration, thick-paint watercolor texture, muted rain-night palette of deep cold blues, heavy dark vignette, painterly brushwork, cinematic. Strictly NOT photorealistic, NOT anime cel-shading, NOT 3D render, no daylight, no neon, no text, no watermark.
```

**命中真相层** `r6_laoxiang_face_hit_v1`

```text
Bust close-up portrait, same deeply tanned fisherman with rope on shoulder: the big grin gone mid-laugh, mouth still open but eyes suddenly flat and far away, rain dripping off his chin — a man who just heard what he fishes for on rising-water nights named out loud. Identical lighting: warm amber from below-front (#ffb15c), cold blue rim (#16324a). Palette: deep brown #5a4232, rope hemp #c9b08a accents, deep blue background (#0b1a2b). Head and shoulders only, face centered. Style: 2.5D narrative game illustration, thick-paint watercolor texture, muted rain-night palette, heavy vignette, painterly. NOT photorealistic, NOT anime, NOT 3D render, no text, no watermark.
```

**被逼问层** `r6_laoxiang_face_pressed_v1`

```text
Bust close-up portrait, same deeply tanned fisherman: jaw set, eyes narrowed into slits, voice clearly dropped an octave, rope tightening across his shoulder — a loud man choosing to be quiet, which is worse. Warm amber light from below-front (#ffb15c), cold blue rim (#16324a). Palette: deep brown #5a4232, rope hemp #c9b08a accents, deep blue background (#0b1a2b). Head and shoulders only. Style: 2.5D narrative game illustration, thick-paint watercolor texture, muted rain-night palette, heavy vignette, painterly. NOT photorealistic, NOT anime, NOT 3D render, no text, no watermark.
```

**释然层** `r6_laoxiang_face_relief_v1`

```text
Bust close-up portrait, same deeply tanned fisherman: a small real laugh escaping, one eye squeezed shut, wiping his face with a rough forearm — the first honest sound he has made in years. Warm amber light from below-front (#ffb15c) softened, cold blue rim (#16324a). Palette: deep brown #5a4232, rope hemp #c9b08a accents, deep blue background (#0b1a2b). Head and shoulders only. Style: 2.5D narrative game illustration, thick-paint watercolor texture, muted rain-night palette, heavy vignette, painterly. NOT photorealistic, NOT anime, NOT 3D render, no text, no watermark.
```

**光影层** `r6_laoxiang_light_v1`

```text
Lighting overlay pass for a game engine: the exact silhouette of a broad-shouldered fisherman with rope coiled over his shoulder, rendered ONLY as warm amber rim light and soft shadow shapes — glowing #ffb15c edges on shoulders, rope and jaw, deep blue-black shadow masses inside, no facial detail, no textures, like a light mask. Pure solid BLACK background. Style: 2.5D painterly light study, thick-paint texture, muted palette, heavy vignette. NOT photorealistic, NOT anime, NOT 3D render, no text, no watermark.
```

### B7 郑爷（r7-zhengye）· 巡夜人，只信巡逻路线

**身体层** `r7_zhengye_body_v1`

```text
Full-body character portrait for a rain-night mystery narrative game. A stern Chinese night-watch guard in a worn old uniform, a brass whistle hanging at his neck, heavy dark eye bags, rigid spine, one hand resting on a dim hand-lantern (UNLIT, cold metal only — no warm light allowed), posture like a man mid-patrol who heard a wrong footstep. Color signature: navy blue #2b3a52 main tone, brass #b89a5a accents on whistle and buttons. Standing pose, slight 3/4 angle, body centered, full body head to feet visible, feet near bottom edge, 10% headroom. Lit from below-front by a single warm amber soup-bowl light (#ffb15c), cold blue rim light (#16324a) from behind, heavy dark vignette. Plain solid dark blue background (#0b1a2b) for clean cutout. Style: 2.5D narrative game key illustration, thick-paint watercolor texture, muted rain-night palette of deep cold blues, heavy dark vignette, painterly brushwork, cinematic. Strictly NOT photorealistic, NOT anime cel-shading, NOT 3D render, no daylight, no neon, no text, no watermark.
```

**命中真相层** `r7_zhengye_face_hit_v1`

```text
Bust close-up portrait, same stern night-watch guard in worn uniform: heavy eye bags suddenly deeper, pupils fixed on a point over the viewer's shoulder, whistle caught between two fingers but not raised — a man who just saw, in memory, the person who should not have been at the dock that night. Identical lighting: warm amber from below-front (#ffb15c), cold blue rim (#16324a). Palette: navy blue #2b3a52, brass #b89a5a accents, deep blue background (#0b1a2b). Head and shoulders only, face centered. Style: 2.5D narrative game illustration, thick-paint watercolor texture, muted rain-night palette, heavy vignette, painterly. NOT photorealistic, NOT anime, NOT 3D render, no text, no watermark.
```

**被逼问层** `r7_zhengye_face_pressed_v1`

```text
Bust close-up portrait, same stern night-watch guard: jaw clenched, one eyebrow twitching, hand closed into a fist around the whistle, uniform collar soaked with rain — order itself being questioned, and hating it. Warm amber light from below-front (#ffb15c), cold blue rim (#16324a). Palette: navy blue #2b3a52, brass #b89a5a accents, deep blue background (#0b1a2b). Head and shoulders only. Style: 2.5D narrative game illustration, thick-paint watercolor texture, muted rain-night palette, heavy vignette, painterly. NOT photorealistic, NOT anime, NOT 3D render, no text, no watermark.
```

**释然层** `r7_zhengye_face_relief_v1`

```text
Bust close-up portrait, same stern night-watch guard: spine still straight but the fist open now, whistle resting quiet on his chest, heavy eyes half-closed with something close to rest — a patrol finally allowed to end. Warm amber light from below-front (#ffb15c) softened, cold blue rim (#16324a). Palette: navy blue #2b3a52, brass #b89a5a accents, deep blue background (#0b1a2b). Head and shoulders only. Style: 2.5D narrative game illustration, thick-paint watercolor texture, muted rain-night palette, heavy vignette, painterly. NOT photorealistic, NOT anime, NOT 3D render, no text, no watermark.
```

**光影层** `r7_zhengye_light_v1`

```text
Lighting overlay pass for a game engine: the exact silhouette of a rigid uniformed guard with a whistle at his neck, rendered ONLY as warm amber rim light and soft shadow shapes — glowing #ffb15c edges on cap brim, shoulders and whistle, deep blue-black shadow masses inside, no facial detail, no textures, like a light mask. Pure solid BLACK background. Style: 2.5D painterly light study, thick-paint texture, muted palette, heavy vignette. NOT photorealistic, NOT anime, NOT 3D render, no text, no watermark.
```

### B8 小满（r8-xiaoman）· 来历不明的孩子，在等人

**身体层** `r8_xiaoman_body_v1`

```text
Full-body character portrait for a rain-night mystery narrative game. A 9-year-old Chinese child in clean but old patched clothes, hugging a cloth bundle tightly against his chest, unusually calm bright eyes that seem to know more than they should, hair slightly damp from drizzle, standing perfectly still. Color signature: grey blue #7d93a8 main tone, amber #d8a24a accents (a single amber thread tied around the cloth bundle). Standing pose, slight 3/4 angle, body centered, full body head to feet visible, feet near bottom edge, 10% headroom. Lit from below-front by a single warm amber soup-bowl light (#ffb15c), cold blue rim light (#16324a) from behind, heavy dark vignette. Plain solid dark blue background (#0b1a2b) for clean cutout. Style: 2.5D narrative game key illustration, thick-paint watercolor texture, muted rain-night palette of deep cold blues, heavy dark vignette, painterly brushwork, cinematic. Strictly NOT photorealistic, NOT anime cel-shading, NOT 3D render, no daylight, no neon, no text, no watermark.
```

**命中真相层** `r8_xiaoman_face_hit_v1`

```text
Bust close-up portrait, same 9-year-old child hugging the cloth bundle: bright eyes perfectly steady, not surprised at all, head tilted two degrees, the faintest knowing look — a child who was waiting for exactly this question. Identical lighting: warm amber from below-front (#ffb15c), cold blue rim (#16324a). Palette: grey blue #7d93a8, amber #d8a24a accents, deep blue background (#0b1a2b). Head and shoulders only, face centered. Style: 2.5D narrative game illustration, thick-paint watercolor texture, muted rain-night palette, heavy vignette, painterly. NOT photorealistic, NOT anime, NOT 3D render, no text, no watermark.
```

**被逼问层** `r8_xiaoman_face_pressed_v1`

```text
Bust close-up portrait, same 9-year-old child: arms tightening around the cloth bundle, chin lowered but eyes looking UP, unblinking, quiet as deep water — not fear, but a door closing politely. Warm amber light from below-front (#ffb15c), cold blue rim (#16324a). Palette: grey blue #7d93a8, amber #d8a24a accents, deep blue background (#0b1a2b). Head and shoulders only. Style: 2.5D narrative game illustration, thick-paint watercolor texture, muted rain-night palette, heavy vignette, painterly. NOT photorealistic, NOT anime, NOT 3D render, no text, no watermark.
```

**释然层** `r8_xiaoman_face_relief_v1`

```text
Bust close-up portrait, same 9-year-old child: for one instant just a child — eyes shining wet, a tiny real smile, one hand loosening on the cloth bundle as if the person he waits for finally walked out of the rain. Warm amber light from below-front (#ffb15c) softened, cold blue rim (#16324a). Palette: grey blue #7d93a8, amber #d8a24a accents, deep blue background (#0b1a2b). Head and shoulders only. Style: 2.5D narrative game illustration, thick-paint watercolor texture, muted rain-night palette, heavy vignette, painterly. NOT photorealistic, NOT anime, NOT 3D render, no text, no watermark.
```

**光影层** `r8_xiaoman_light_v1`

```text
Lighting overlay pass for a game engine: the exact silhouette of a small child hugging a cloth bundle, rendered ONLY as warm amber rim light and soft shadow shapes — glowing #ffb15c edges on hair, small shoulders and the bundle, deep blue-black shadow masses inside, no facial detail, no textures, like a light mask. Pure solid BLACK background. Style: 2.5D painterly light study, thick-paint texture, muted palette, heavy vignette. NOT photorealistic, NOT anime, NOT 3D render, no text, no watermark.
```

---

## C. 关键道具

### C1 汤碗（核心叙事光源载体）`prop_soup_bowl_v1`

参数：1:1，1024×1024，纯色底入库后抠透明。**M1 必备**，叠/替 R3F 自发光球体。

```text
A single rustic ceramic soup bowl seen from a high three-quarter angle, steam rising in thin curls, warm amber broth glowing from within (#ffb15c core, #ffd9a0 glow), the bowl's outer glaze dark and worn. It is the ONLY light source in the image: warm light spills onto the faint suggestion of a wet stone surface beneath, everything else falls away into darkness. Solid dark blue background (#0b1a2b) for clean cutout. Style: 2.5D narrative game prop illustration, thick-paint watercolor texture, muted rain-night palette, single warm amber light source, heavy vignette, painterly brushwork. NOT photorealistic, NOT anime, NOT 3D render, no text, no watermark.
```

### C2 渡船剪影 `prop_ferry_boat_v1`

参数：16:9 横幅 1920×640，纯色底。用于 death 相位"你又上船了"。

```text
Side silhouette of a small wooden ferry boat on black water, one curved prow, a single oar resting across the gunwale, thin cold mist around the hull, no figures, no lights. Deep cold blue palette (#0b1a2b water, #16324a mist, #9fc4e8 faint edge highlight along the hull). Solid dark blue background (#0b1a2b) merging with the water for easy cutout. Style: 2.5D narrative game prop illustration, thick-paint watercolor texture, muted rain-night palette, heavy vignette, painterly, quiet and final. NOT photorealistic, NOT anime, NOT 3D render, no warm light, no text, no watermark.
```

### C3 纸人 `prop_paper_figure_v1`

参数：1:1，1024×1024。

```text
A small hand-crafted Chinese paper funeral figure standing alone, pale paper white body (#c9c2b4), a single cinnabar red dot (#c0473b) on each cheek, hollow calm face, slightly crooked as if made by trembling hands. Lit from below-front by warm amber light (#ffb15c), long soft shadow behind, everything else dark. Solid dark blue background (#0b1a2b). Style: 2.5D narrative game prop illustration, thick-paint watercolor texture, muted rain-night palette, heavy vignette, painterly, quietly unsettling but not gory. NOT photorealistic, NOT anime, NOT 3D render, no text, no watermark.
```

### C4 花束 `prop_bouquet_v1`

参数：1:1，1024×1024。

```text
A half-wrapped bouquet of white and dusty-rose flowers (#b87d8a) in plain grey-blue paper, one stem broken and hanging, droplets of rain on the petals, held upright as if just set down on a counter. Warm amber light from below-front (#ffb15c), cold blue shadows (#16324a). Solid dark blue background (#0b1a2b). Style: 2.5D narrative game prop illustration, thick-paint watercolor texture, muted rain-night palette, heavy vignette, painterly, melancholy. NOT photorealistic, NOT anime, NOT 3D render, no text, no watermark.
```

### C5 停摆的钟 `prop_stopped_clock_v1`

参数：1:1，1024×1024。

```text
A round brass-rimmed clock face, hands frozen at one specific minute, glass cracked by a single thin fracture line, brass rim tarnished (#b89a5a), Roman numerals weathered, cold steel-blue tones (#8aa0b4) dominating, a faint warm amber reflection (#ffb15c) on the glass from an unseen bowl of soup below frame. Solid dark blue background (#0b1a2b). Style: 2.5D narrative game prop illustration, thick-paint watercolor texture, muted rain-night palette, heavy vignette, painterly. NOT photorealistic, NOT anime, NOT 3D render, no readable extra text besides clock numerals, no watermark.
```

### C6 布包 `prop_cloth_bundle_v1`

参数：1:1，1024×1024。

```text
A small cloth bundle tied with a single amber thread (#d8a24a), grey-blue patched fabric (#7d93a8), worn soft from years of being held, one corner slightly loose hinting at something small inside, resting as if just placed down. Warm amber light from below-front (#ffb15c), cold blue shadows. Solid dark blue background (#0b1a2b). Style: 2.5D narrative game prop illustration, thick-paint watercolor texture, muted rain-night palette, heavy vignette, painterly, quiet mystery. NOT photorealistic, NOT anime, NOT 3D render, no text, no watermark.
```

### C7 停摆怀表（何叔的 3:17，关键事实锚定）`prop_pocket_watch_v1`

参数：1:1，1024×1024。

```text
A single aged brass pocket watch with cracked glass, held in warm amber light from below frame (#ffb15c), hands stopped exactly at 3:17, Roman numeral dial weathered, brass rim tarnished (#b89a5a), a thin fracture across the glass catching cold blue reflection (#8aa0b4). The watch is the subject, everything else falls into darkness. Solid dark blue background (#0b1a2b). Style: 2.5D narrative game prop illustration, thick-paint watercolor texture, muted rain-night palette, heavy vignette, painterly. NOT photorealistic, NOT anime, NOT 3D render, no readable extra text, no watermark.
```

### C8 小孩的鞋（老鲞船舱里的秘密，仅记忆段出现）`prop_child_shoe_v1`

参数：1:1，1024×1024。

```text
One small worn child's cloth shoe lying on its side, faded red fabric dulled to rust tones (#a8532f) by years and river water, sole slightly separated, heavy emotional weight, dim warm amber light from one side (#ffb15c) as if from a soup bowl far away, everything else deep cold blue (#0b1a2b). Solid dark blue background. Style: 2.5D narrative game prop illustration, thick-paint watercolor texture, muted rain-night palette, heavy vignette, painterly, devastatingly quiet. NOT photorealistic, NOT anime, NOT 3D render, no text, no watermark.
```

### C9 未点睛纸人（阿黎的禁忌变体）`prop_paper_figure_unpainted_v1`

参数：1:1，1024×1024。

```text
A hand-crafted Chinese paper funeral figure standing upright, blank white paper body (#c9c2b4), the eye sockets LEFT COMPLETELY EMPTY with no pupils drawn at all, only one cinnabar red dot (#c0473b) beside each eye, slightly crooked, lit from below-front by warm amber light (#ffb15c) making long shadows inside the empty sockets, quietly uncanny but not horror. Solid dark blue background (#0b1a2b). Style: 2.5D narrative game prop illustration, thick-paint watercolor texture, muted rain-night palette, heavy vignette, painterly. NOT photorealistic, NOT anime, NOT 3D render, no text, no watermark.
```

---

## D. 记忆叠影碎片（memory 相位 ghost 素材）

> 琥珀/锈红半透明抽象碎片，用于 §4.4 叠影演出。入库后叠在 R3F ghost planes 上。

### D1 `mem_amber_shard_v1`

参数：1:1，1024×1024，入库后抠透明。

```text
An abstract floating shard of amber light (#d8a24a), shaped like a broken piece of memory — irregular crystal edges, glowing softly from inside, thin cracks of darker rust red (#a8532f) running through it, tiny particles drifting off its edges. No background context, the shard floats alone. Solid dark blue background (#0b1a2b) for clean cutout. Style: 2.5D narrative game abstract effect asset, thick-paint watercolor texture, muted rain-night palette, painterly glow, heavy vignette. NOT photorealistic, NOT anime, NOT 3D render, no text, no watermark.
```

### D2 `mem_rust_shard_v1`

参数：1:1，1024×1024。

```text
An abstract floating shard of rust-red light (#a8532f), heavier and older-looking than amber, edges crumbling like ash, faint ghost-beige residue (#c9b08a) trailing from it like an afterimage of a person, barely glowing. Floating alone. Solid dark blue background (#0b1a2b) for clean cutout. Style: 2.5D narrative game abstract effect asset, thick-paint watercolor texture, muted rain-night palette, painterly, heavy vignette. NOT photorealistic, NOT anime, NOT 3D render, no text, no watermark.
```

### D3 `mem_ghost_afterimage_v1`

参数：9:16 竖幅 1080×1920（直接作为 ghost plane 贴图）。

```text
A vertical ghostly afterimage of a person standing in rain, rendered ONLY as translucent streaks of ghost-beige light (#c9b08a) with amber (#d8a24a) at the heart position — no face, no details, just the memory-shape of someone who used to stand here, edges dissolving into drifting particles. Solid dark blue background (#0b1a2b) for clean cutout. Style: 2.5D narrative game abstract effect asset, thick-paint watercolor texture, muted rain-night palette, painterly glow, heavy vignette. NOT photorealistic, NOT anime, NOT 3D render, no text, no watermark.
```

### D4 渡口旧影（落水的一瞬）`mem_river_below_v1`

参数：1280×720。

```text
Abstract memory fragment: dark river surface seen from BELOW the water at night, a distorted silhouette of a person sinking slowly, amber-toned light leaking through the water from above (#d8a24a), dreamlike, grainy, impressionistic brushwork, no clear face, no gore, deep cold blue water (#0b1a2b) dominating. Solid dark blue background (#0b1a2b) for clean cutout. Style: 2.5D narrative game abstract effect asset, thick-paint watercolor texture, muted rain-night palette, painterly glow, heavy vignette. NOT photorealistic, NOT anime, NOT 3D render, no text, no watermark.
```

### D5 船难夜（翻覆的船灯）`mem_capsized_lantern_v1`

参数：1280×720。

```text
Abstract memory fragment: a capsized fishing boat silhouette in stormy black water, one boat lantern flickering warm amber (#d8a24a) underwater beneath the hull, rain streaks merging with grainy memory noise, rust-red accents (#a8532f) along the keel, no people visible, the whole image feels like something remembered badly. Solid dark blue background (#0b1a2b) for clean cutout. Style: 2.5D narrative game abstract effect asset, thick-paint watercolor texture, muted rain-night palette, painterly, heavy vignette. NOT photorealistic, NOT anime, NOT 3D render, no text, no watermark.
```

### D6 那碗没吃的面（角落的面碗）`mem_untouched_noodles_v1`

参数：1024×1024。

```text
Abstract memory fragment: a single bowl of noodles left untouched in a dark corner of a noodle shop, the steam risen into ghostly pale gold wisps (#c9b08a), warm amber afterglow around the bowl (#d8a24a), loneliness rendered as light, everything else dissolved into deep cold blue (#0b1a2b), painterly and grainy. Solid dark blue background (#0b1a2b) for clean cutout. Style: 2.5D narrative game abstract effect asset, thick-paint watercolor texture, muted rain-night palette, painterly glow, heavy vignette. NOT photorealistic, NOT anime, NOT 3D render, no text, no watermark.
```

---

## E. 海报级关键帧（M3 门面图，可选，候选翻倍再选）

### E1 汤碗特写海报 `key_soup_bowl_poster_v1`

参数：16:9，2560×1440。

```text
Cinematic key visual: extreme close-up of a rustic ceramic soup bowl on wet stone at rainy night, steam curling upward and dissolving into drizzle, warm amber broth glow (#ffb15c) the ONLY warm light in a world of deep cold blue (#0b1a2b), rain streaks catching the glow, heavy vignette, the whole mood of a ferry town condensed into one bowl. Composition: bowl at right third, steam leading the eye up into dark negative space. Style: 2.5D narrative game key illustration, thick-paint watercolor texture, muted rain-night palette, single warm light source, painterly brushwork, poster-grade detail. NOT photorealistic, NOT anime, NOT 3D render, no text, no watermark, no figures.
```

### E2 沉默三秒全景海报 `key_silence_poster_v1`

参数：16:9，2560×1440。

```text
Cinematic key visual: the ferry dock at rainy night in total silence, cold blue world (#0b1a2b, #16324a) faded to near-darkness, one small warm amber pool of light (#ffb15c) around a soup bowl at the center-bottom, and in that light a single hatted figure seen from behind at the end of the stone steps, rain frozen mid-air around him. Composition: vast dark negative space above, tiny warm focal point, heavy vignette squeezing the frame. Style: 2.5D narrative game key illustration, thick-paint watercolor texture, muted rain-night palette, single warm light source, painterly, poster-grade. NOT photorealistic, NOT anime, NOT 3D render, no text, no watermark.
```

### E3 释然拉远海报 `key_release_poster_v1`

参数：16:9，2560×1440。

```text
Cinematic key visual: wide pull-back shot — the whole ferry town in rain seen from far away, everything in deep cold blue (#0b1a2b, #16324a, #0a1422 fog), one tiny warm amber dot of light (#ffb15c) at the dock, an empty ferry boat drifting out into the black water, the sense of something finally being let go. Composition: horizon at lower third, massive quiet sky, heavy vignette. Style: 2.5D narrative game key illustration, thick-paint watercolor texture, muted rain-night palette, single distant warm light, painterly, poster-grade. NOT photorealistic, NOT anime, NOT 3D render, no text, no watermark.
```

---

## F. 验收速查（对照 `art-style-standard-2.5d.md` §8.1）

- [ ] 全图冷蓝基底 + 暗角常驻，无高饱和偏离
- [ ] 唯一暖光源 = 汤碗（背景图中无任何暖光）
- [ ] 立绘六层齐备、命名合规（`r{N}_{slug}_{layer}_v{N}`）
- [ ] 无文字乱码 / 手指畸变 / 第二光源 / 3D 质感
- [ ] 抠底后边缘无白边（ImageMagick floodfill 容差 ≤ 8%，边缘像素抽检）
- [ ] 文本压图区对比度 ≥ 4.5:1
- [ ] 体积达标：背景层 ≤ 250KB、立绘身体 ≤ 350KB、表情 overlay ≤ 90KB（WebP q82）

## G. 后处理命令备忘（ImageMagick，`D:\tools\ImageMagick`）

```bash
# 抠深蓝底（立绘）：边缘容差 8%
magick r5_heshu_body_v1.png -fuzz 8% -fill none -draw "color 0,0 floodfill" -alpha set r5_heshu_body_v1_alpha.png
# 转 WebP q82 + 规格化
magick r5_heshu_body_v1_alpha.png -resize 1080x1920 -quality 82 r5_heshu_body_v1.webp
# 体积体检
magick identify -format "%f %B bytes\n" *.webp
```

> ⚠️ 命令为骨架，实际容差/裁切坐标以当批素材为准；入库后更新资产清单。
