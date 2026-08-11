# 《轮回渡口》项目日志（DEV LOG）

> 本文件记录项目每次开发历程。**每次开发结束必须追加一条。**
> 格式见文末「日志格式模板」。
> 最新在前，旧记录在后。

---

## 2026-08-11 · 江南水乡渔村场景（渡口→枕水小镇）

**本次内容**（用户方向：渡口应为"江南水乡渔村"，融合诡异悬疑）：
1. **Blender 重建水乡**：8 栋白墙黛瓦民居（双坡顶、木基座、暖窗、檐下灯笼）错落两岸；石拱桥跨河（torus 拱+桥面+桥栏）；2 艘乌篷船（黑篷+船头灯）；3 处青石阶河埠头（民居前伸向河）；保留栈桥护栏/系船柱/灯塔/浮标/渔网。
2. **港口升级**（前一轮）：栈桥加长+双侧护栏+系船柱+缆绳；主渡船+远处渔舟；浮标航标灯；灯塔；岸边渔网/木桩。
3. **可见性修复**：雾距 8-22 → 12-32（船/灯塔/浮标露出）；船/灯塔/浮标移入视野+提亮（boat_hull 材质）。
4. **居民分布小镇化**：RESIDENT_SPOTS 重排——r1 渡口、r2 花店前、r3 面馆前、r4 纸扎铺、r5 钟表铺、r6 乌篷船边、r7 石拱桥桥头、r8 巷口。玩家 WASD 探索小镇找人对话。

**验证**：四件套全绿（69 用例）；浏览器实测水乡氛围（白墙黛瓦/石拱桥/暖窗灯笼/温润+悬疑）达成。

**下一步**：民居细节打磨（白墙提亮/暖光对比）；空寂小巷+笛音氛围（音频）；居民站位微调。

---

## 2026-08-11 · Qwen-image 3.0 全角色立绘生产 + 多角色渲染管线

**本次内容**：
1. **Qwen-image 3.0 生成立绘**（chat.qwen.ai，GitHub OAuth 静默登录）：r2-r8 七位居民 body 立绘全部生成并逐张 vision 过审。管线：聊天输入 prompt（强化"MUST vertical 9:16 full-body"）→ 下载原图 → 裁中央 9:16 → u2net 抠图 → WebP（44-63KB/张）→ 入库。
2. **踩坑**：Qwen 默认横版（1664×928）+ 常出半身像——修正指令"Redo the same character but extend to FULL-BODY"触发 image_edit 扩展成全身（r2/r5/r6 需重做，r4/r7/r8 一次过）；背景色≈服装色（r2 雾蓝围裙）时颜色抠图失效，u2net 人像识别可靠（30-47% 覆盖率）。
3. **多角色渲染管线**：NpcBillboard 支持任意位置 + 表情变体；RainScene 遍历 RESIDENT_SPOTS——有立绘用 billboard（selected 显示表情层，他人 body），无立绘回退剪影；删除 npcTexture prop 链（portraitSrc 内部处理），App 改传 portraitVariant。
4. 清理 App 死 import（portraitSrc）。

**资产现状**：r1 四层齐；r2-r8 body 层齐（表情层/light 层待产）。

**验证**：四件套全绿（69 用例）；浏览器实测 r2 阿岚立绘在场景栈桥右侧可见。

**下一步**：r2-r8 表情层（face_hit/pressed/relief，带 body 参考图）；light 层；.tmp-qwen 原始高清留档或清理。

---

## 2026-08-11 · 交互形态重构：点击场景人物（按钮退场）

**本次内容**（用户拍板"不要面板交互，要跟真实人物模型交互"）：
1. **居民选择按钮退场**：AskingPhase 移除 resident-bar/chips，只剩字幕式提问区；选择逻辑移到 3D 场景。
2. **8 居民全部站进场景**：r1 写实立绘 billboard（栈桥汤碗旁）+ 7 个剪影人形（柱体+头，深色材质）分布渡口（r2 栈桥右/r3 栈桥左/r4 左中远/r5 右中远/r6 渡船边/r7 左/r8 中央远）。点击场景人物 → selected 联动；选中者高亮（亮色 + 暖光光环）；hover 指针。
3. **Canvas pointerEvents auto**（场景可点，DOM 面板 z1 在上不受影响）。
4. **面板压缩**：dialog 改底部细条（padding 10/16、字号 15、输入区紧凑），人物露出在面板上方可点区域。
5. 剪影站位经投影计算校准（前版 z 太近全部出画/被面板挡）。

**验证**：浏览器实测点击 r3 剪影 → 选中色/光环出现（像素证据 3294 差异像素）；phases.test 更新（chips 测试改为提问区断言，69 用例全绿）。

**下一步**：点击选中后镜头推近面对人物；其余 7 位立绘生产（Qwen-image 3.0 或 Blender）；跑图。

---

## 2026-08-11 · Blender 3D 渡口小镇建模（替代程序化几何）

**本次内容**：
1. **Blender 建模**：blender-mcp 驱动 Blender 5.2 建渡口小镇——栈桥（14 木板+4 桩）、岸堤岩石、钟楼（塔身+尖顶+钟面微光）、面馆（窗暖光）、花店、渡船（船体+桅杆+帆+船灯）、3 根灯笼灯柱（自发光）、汤碗台座（自发光）。材质库对齐 theme.ts 色值（wood/silhouette/rock/lantern/soup_glow）。
2. **导出 GLB**（412KB / 44 对象）：排除水面（前端 shader 渲染）、默认相机/灯光（前端自有）。glTF Y-up 自动转换与前端坐标对齐。
3. **前端接入**：Townscape 程序化几何 → `DukouModel`（GLTFLoader 异步加载 + ready state，jsdom 下 try-catch 静默降级）；移除前端汤碗 mesh（GLB 自带）；汤碗加 Bloom halo 焦点；雾距 8-22 让远景建筑露出。

**决策**：场景主体用 Blender GLB（低模+材质可控），雨/水面/雾/后期/立绘 billboard 仍由前端程序化。

**坑**：jsdom 测试环境无法解析 `/src/assets/...` URL（FileLoader 抛 Invalid URL）——DukouModel 包 try-catch，测试降级不加载 GLB。

**下一步**：建筑细节/材质打磨（木板纹理、建筑墙面）；跑图（WASD+站位）；立绘 WebP 压缩。

---

## 2026-08-11 · 场景重建（渡口小镇）+ 审计问题修复落地

**本次内容**：
1. **场景重建（场景感）**：RainNight 加程序化渡口小镇——近景栈桥+木桩+3 盏暖光灯笼 → 中景汤碗+渡船剪影+船灯 → 远景钟楼（钟面微光）/面馆（窗光）/花店剪影，雾距收紧（5.5-17）增强纵深，相机拉远（y1.9 z8.5）看全景、silence 推近（z4.6）面对渡口。全部几何体程序化，零资产。
2. **NPC 立绘进场景**：蓑衣人 billboard 站在栈桥渡口（1.25×3.4，alphaTest=0.3 透明，每帧对齐相机）。踩坑：R3F useLoader 挂起 → EffectComposer.addPass 读 null 白屏，改 TextureLoader+ready state 修复；立绘 PNG 做 gamma 1.35 提亮。
3. **审计问题修复**（此前报告全部落地）：
   - P1-1 主题双轨制：styles.css 改为别名层（--ink/--accent 等映射 theme.ts 注入的 --c-*，带兜底），theme.ts 增 ui.accent；
   - P1-2 死亡后果文案三处重复 → engine `death-lines.ts` 单一真源（server/web/offline 三端引用）；
   - P1-3 livingTown 居民复制 → 由 RESIDENTS 派生 + INTERROGATES 表；
   - P2 死代码：删 useAudio.ts、Portrait.tsx（右侧浮窗方案被场景 billboard 取代）、RainNight 的 SILENCE_MS re-export、styles.css .silence 类；
   - P2-3 错误码：新增 AppError 类（code 稳定），loop-service 抛 AppError，routes/toError 按 code 查表。

**决策**：
- web 端禁止 import `@lunhui/engine` 主入口（含 node:fs resident-loader，浏览器崩溃）——DEATH_LINES 走新子路径 `@lunhui/engine/death-lines`（package.json exports 新增）；
- 立绘 PNG 未压缩（body 688KB/face_hit 1.27MB），后续转 WebP 优化。

**坑**：
- vite dev 不重启，package.json exports 变更不生效（App.tsx 500 + node:fs externalized 残留）——改 exports 必须重启 vite；
- tsconfig noUncheckedIndexedAccess：元组解构得 `number|undefined`，需显式类型标注数据数组；
- engine 改 src 后必须 rebuild（server/web 解析 dist 产物）。

**下一步**：r2 阿岚立绘生产；跑图（WASD 移动 + 站位）骨架；立绘 WebP 压缩。

---

## 2026-08-11 · 视觉风格定稿：写实电影感 + 立绘提示词投喂包 + 3D 跑图方向

**本次内容**：
1. **风格大方向拍板**：r1 蓑衣人首版立绘（5 面板合成图）出图后，主理人当场定夺——**写实电影感数字绘画**为全资产风格锁，替代原「厚涂水彩」定位。血渍细节保留（与"捞过玩家 7 次"设定暗合），渐变底抠图时处理。
2. **40 条立绘提示词落盘**：`docs/prompts/character-art/`（8 角色 × 5 层：body / face_hit / face_pressed / face_relief / light），逐字保留原 AI_IMAGE_PROMPTS.md B 节内容，脚本校验 40/40 一致。
3. **风格锁全量改写实**：character-art 8 文件 + AI_IMAGE_PROMPTS.md 全部 80 处 prompt（含 A/C/D/E 节场景/道具/记忆/海报）统一替换为 `cinematic photorealistic` 锁，`thick-paint / painterly / NOT photorealistic` 清零。
4. **宪法同步修订**：art-style-standard-2.5d.md §1.1、ART_MASTER_PLAN.md §1.1 风格锚 + §2.2 风格锁措辞。
5. **3D 跑图方向确认**（对话中）：浏览器跑 MC 级 3D 无压力 → 修正为"程序化 3D 小镇 + billboard 2D 立绘"路线，2.5D 宪法 §1.3 排除条款待跑图实施时再修订（本次未动）。

**决策**：
- 风格锁 = `cinematic photorealistic digital painting, film concept art, rain-night muted blue palette, single warm soup-bowl light, heavy vignette, film grain, not anime cel-shading, not cartoon, no flat illustration`；
- 全资产统一写实（立绘/场景/道具/记忆/海报），不回头；
- r1 蓑衣人 = 方向基准图，后续 7 角色全按此风格生成。

**坑**：
- read_file 相对路径偶发解析失败（docs/ 下部分文件需绝对路径）；
- 反引号在 bash 命令内触发命令替换，复杂 grep 被安全拦截——批量替换改用 Python 脚本处理。

**下一步**：r2 阿岚定妆图（或按 r1 流程继续全阵容）；3D 跑图骨架实施计划落盘。

---

## 2026-08-02 · 部署调研与服务器规划

**本次内容**：讨论云服务器部署方案。

**决策**：
- 目标服务器：京东云 2C4G（¥528/3年，¥14.7/月）——比现有阿里云（2C~1.6G，¥60+/月）便宜 4 倍、内存大一倍；
- **战略**：京东云只放 lunhui-dukou，阿里云继续跑 Hermes + campus-forum（零迁移成本，数据不动）；
- 暂不部署（等买完服务器再说）。

**坑**：
- 本地 D 盘一度全盘只读（写被拒、读正常），疑似磁盘/同步服务锁——重启后恢复，原因未明；
- 项目 dist 被残留 node 进程锁定 → 杀进程后恢复（`powershell Get-Process node | Stop-Process -Force`）。

**下一步**：买京东云 → 部署 lunhui-dukou → 真机试玩。

---

## 2026-08-02 · 去 AI 味重构（居民会"像人"说话了）

**本次内容**：LLM 生成的回答曾带 AI 味，重构 prompt 让居民有真实代入感。

**做法**（调研 SillyTavern/Trappu 角色卡指南）：
1. **示例对话（few-shot）> 指令**：8 居民每人 2-3 组示例对话（源自定稿背景长文文风），模型从示例学语气；
2. **负面清单**：`作为AI/总而言之/综上所述/首先其次/值得注意的是/让我们` 绝对禁止；
3. **物象化铁律**：用雨/河/白花/面粉/齿轮说话，不抽象总结、不讲道理、不评价自己；
4. **标签式人格**（`沉默,话少,秤砣`）替代长段落。

**实测验收**（sophnet 真实生成）：
- 蓑衣人："一个摆渡的。有时候也捞人。"（人设+悬念）
- 小满："你叫陈远。你上个月来的时候，踩碎了桥头第三块青石板。"（记忆级表现）
- 老鲞："没啥。就是些旧物件……不值钱的。"（欲盖弥彰）

**验证**：lint 0 / typecheck 0 / test 37 pass / build ok。提交 `d3bb168`。

---

## 2026-08-02 · sophnet 思考模式 bug + 模型确认

**本次内容**：确认 LLM 用的确实是 DeepSeek v4-flash，并修复空回答 bug。

**关键发现**：
- sophnet 实测返回 `model: DeepSeek-V4-Flash`（主链路用对了模型）；DeepSeek 官方 `model: deepseek-v4-flash`（备用确认）；
- **Bug**：V4-Flash 默认开"思考模式"，`max_tokens` 被 reasoning 吃光 → `content` 空回答；
- **修复**：sophnet 调用显式 `thinking:{type:"disabled"}`（关思考，也省钱）+ max_tokens 150→200。

**成本确认**：sophnet 免费 100k/天（签到：每日 100k，连 3 天 +100k，连 7 天 +200k）；提现汇率 100k=0.2 元；v4-flash 官方价输入 ¥1/输出 ¥2 每百万。

**验证**：test 37 pass。提交 `ae4c1b1`。

---

## 2026-08-02 · LLM 血肉层接入 + 测试 mock（烧额度教训）

**本次内容**：接入 LLM 生成器（sophnet 主 → DeepSeek 备 → 保守兜底）。

**架构**：真相表命中 → 纯规则（¥0）；未命中 → LLM 生成；引导问题（"多出来的是谁"）→ 预写台词（不烧钱）。

**重大教训（烧了 0.05 元免费额度）**：
- 修 bug 期间反复跑测试，测试含**真实 LLM 调用** → 烧 ~25k tokens；
- **根治**：`LLM_MOCK=1` 默认 mock（cross-env 兼容 Windows），`npm run test:live` 单独真调；
- 全仓 test 从 30s+ 降到 5.6s，零消耗。

**密钥管理**：SOPHNET + DEEPSEEK key 只进 `.env`（gitignore 排除，不入库）；用户 sophnet key 曾在聊天暴露 → 提醒轮换。

**验证**：lint 0 / typecheck 0 / test 37 pass。提交 `a601cfd`。

---

## 2026-08-02 · 玩法说明文档

**本次内容**：用户反馈"不知道具体怎么玩"——写了 GAMEPLAY_GUIDE.md（从零讲起的操作指南）。

**内容**：游戏概述 / 扮演与目标 / 核心循环 / 六步操作（含真实可复现对话）/ 提问的艺术（具体事实 > 哲学问题）/ 规则速查 / 当前可玩边界（诚实标注 LLM 未接）/ 主创自测四步指引。

**关键认知**：玩法"说不清"= 游戏还没长出"引导"——这份文档同时是未来新手引导的底稿。提交 `8968219`。

---

## 2026-08-02 · Phase 1 后端可玩闭环（六块全做）

**本次内容**：按 plan 完成 6 块——数据层/状态机/API/集成测试/前端演出层/第一夜剧情。

| # | 任务 | 提交 | 验证 |
|---|---|---|---|
| ① | 数据层（SQLite 六表 + 种子导入 8 居民） | `4aa4e65` | 8 测试 |
| ② | 状态机（LoopService：轮回/10问额度/记忆衰减） | `6a982d9` | 17 测试 |
| ③ | API 路由（loop/ask/choice/memory + 错误码） | `598834d` | 6 集成测试 |
| ④ | 集成测试（完整第一夜：发问→判定→选择→轮回） | `598834d` | 实机 curl 200 |
| ⑤ | 前端演出层（雨夜氛围/对话窗/选择/轮回动画） | `02faa45` | build ok + vite 代理通 |
| ⑥ | 第一夜剧情引导（7 人指向蓑衣人的线索链） | `687e515` | 3 引导测试 |

**真实链路验证**：`问"你捞过我吗" →（蓑衣人停住了。蓑衣人捞过玩家 7 次）→ pause:true → 选上船 → "船在河心沉没。你从水里又醒来——第七次了。"`

**踩坑**：Windows 下 kill npm 脚本不杀子进程 → 必须按端口找 PID 杀（`netstat -ano | grep :8787` + `taskkill -F -PID`）；`/* */` 注释里 `*/` 提前终止（写注释别含 `*/` 序列）；NodeNext 要求显式 `.js` 扩展名。

---

## 2026-08-02 · 世界成型（背景长文 + 主线 + 玩法）

**本次内容**：8 篇背景长文全稿（AI 生成 + 玉衡逐篇验收）、world-lore v2.0、Phase 1 主线、玩法说明。

**背景长文验收成果**（每篇都有满分级"情感之刺"）：
| 居民 | 情感之刺 |
|---|---|
| 蓑衣人 | "他大概会应一声。就一声。" |
| 阿岚 | "她怕承认了，那两千五百多束花就白送了。" |
| 老王 | "怕什么，水又不会吃人。"（回旋镖） |
| 阿黎 | "他扎过那张脸……像记得自己的手。" |
| 何叔 | "多给一分钟。也许够爬上来。也许不够。" |
| 老鲞 | "他喊了七年没喊出口的那两个字。" |
| 郑爷 | "他不等。他只是停。"（克制巅峰） |
| 小满 | "他受不起那个。"（全作总爆发） |

**跨篇矛盾修复**：年龄（二十七 vs 20 岁）、鞋（一双 vs 一只）、面位置（门口 vs 北面角落）——教训：**新长文必须与已入库长文交叉验证**（不止对 SOUL）。

**核心谜底定稿**：玩家=摆渡人；渡口=未了心愿收容所；**3:17=渡口"呼吸"时刻**（郑爷等妻子/玩家被吐出/何叔记录）。

**提交**：`adfdcae`~`8c9bbf4`。

---

## 2026-08-02 · 角色文件 Hermes 化 + 提示词包

**本次内容**：居民从单文件 SOUL 升级为目录结构（对齐 Hermes skill），背景长文提示词包。

**目录结构**（8 居民相同）：
```
residents/r1-suoyi/
├── SOUL.md          ← 人格宪法（frontmatter + 真相表 + 关系网）
├── references/      ← 深度档案（背景长文已填）
├── templates/       ← 对话模板【待填】
├── scripts/         ← 专属逻辑【待填】
└── assets/          ← 立绘/音效【待填】
```

**提示词包 DRY 重构**：world-lore.md（公共世界观）独立，backstory-{id}.md 只含角色专属——投递时两个文件一起给 AI，改世界观只改一处。

**提交**：`594cd5f`、`b1e73df`、`d975aaf`、`2a2809f`。

---

## 2026-08-02 · 真相表引擎 + 8 居民定稿

**本次内容**：TruthTable 判定引擎（纯规则优先，省钱+防失控）+ 8 位居民人格卡定稿。

**核心设计**：
- `judgeAsk(question, resident)`：命中真相表 → `direct/pause`（纯规则，不调 LLM）；未命中 → fallback；
- **命中关键事实 = pause（汤主沉默三秒）**——最强信号；
- 真相试探（"你是谁"）→ 不揭底，守悬念；
- fallback 可返回 `{text, usedLlm}` 结构——保守回答不算 LLM 调用（省钱）。

**8 位居民**：蓑衣人（捞玩家 7 次的死者）/ 阿岚（等船难未婚夫）/ 老王（等弟弟）/ 阿黎（纸人会活）/ 何叔（时间重复 30 次）/ 老鲞（赎罪）/ 郑爷（等妻子 30 年）/ 小满（记得一切的钥匙）。关系网互相咬合，全部指向共同核心真相。

**提交**：`d0be001`、`594cd5f`。

---

## 2026-08-02 · 项目创建与宪法定稿

**本次内容**：项目从零建立，完成全案规格与工程地基。

**里程碑**：
1. 完整 SPEC（产品全案：世界观/玩法/变现/合规/路线图）；
2. 9 份定稿文档（技术栈/架构/数据模型/API契约/内容资产/决策记录等）；
3. monorepo 骨架（engine/server/web 三包）+ TS/ESLint/Prettier/CI 全绿；
4. 8 位居民人格卡（含真相表 + 关系网）。

**关键决策**（DECISIONS.md）：
- 成本 ¥0-30/月（后因 sophnet 免费额度实际 ≈0）；
- 内容尺度：恐怖为皮、情感为骨；
- 纯中文首发、Web 形态、免费完整版 + 付费抢先（不合规不碰）。

**提交**：`0349b07`~`fbee4d2`。

---

## 日志格式模板（每次开发结束追加）

```markdown
## YYYY-MM-DD · 一句话标题

**本次内容**：做了什么（功能/修复/调研）。

**关键决策**：
- 决策 1（理由）

**坑**：
- 坑 1（教训）

**验证**：lint / typecheck / test / build 结果；真实调用证据。

**下一步**：下个目标。
```

**规则**：最新在前；每次开发结束必须追加；数据只写真实发生的（不编造）。
