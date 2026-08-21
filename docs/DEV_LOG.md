# 《轮回渡口》项目日志（DEV LOG）

> 本文件记录项目每次开发历程。**每次开发结束必须追加一条。**
> 格式见文末「日志格式模板」。
> 最新在前，旧记录在后。

---

## 2026-08-21 · 桌面化 Phase 3②：客户端接入 8 居民真相表 + 会话迁移

**本次内容**：
1. **GameLogic 扩到 8 位居民**（离线兜底真相表）：按各 SOUL SecretFacts 接入 r1..r8 关键事实/关键词；每条关键事实配第一人称点睛台词 + 命中→沉默三秒并写记忆；未命中走逐角色兜底台词。
2. **Main.cs**：新增"向谁问"居民选择器（OptionButton 选 8 人）；场景渲染 8 位占位居民（沿河街一排、按角色配色、小满最矮）；在线 `AskAsync`/离线 `GameLogic.Ask` 均传所选 resident_id。
3. **Session 版本迁移**：`Session` 加 `version`；`SessionStore.Load` 对旧存档（无 version，Phase 3① 产物）自动迁移并回写；新增 `LUNHUI_TEST_SESSION=1` 无头自检。

**验证**：
- `dotnet build` 0 错误；
- 8 居民离线自测 15/15 通过（8 人各命中关键事实→pause、记忆归属正确、未命中兜底、额度用尽 deny、轮回重置）；
- 存档迁移无头自检 `SESSION_MIGRATE_PASS`（旧无 version JSON → version=1 + baseUrl 回填）；
- 起 server + `LUNHUI_SMOKE=1` E2E `SMOKE_PASS`：r1（捞过你→pause）与 r8（小满·知道每世名字→pause）均云端命中真相表。

**坑**：
- 手改 Main.cs 时两度误删方法签名（`RunSmokeAsync`/`_BuildWorld`）致函数体孤立——编辑多行方法时要整段替换或核对签名；
- `GameLogic.FirstOrDefault` 需显式 `using System.Linq;`（项目未开 ImplicitUsings）。

**下一步**：Phase 2 演出细化（四相位/真模型立绘/雨与镜头/音频）；G1 决策门待你 GUI 实测。

---

## 2026-08-21 · 桌面化 Phase 3①：Godot 客户端接云端（登录/鉴权 + 真实回合 + 断网兜底）

**本次内容**：把 app/ 客户端从"本地真相表挂钩"升级为"接 @lunhui/server 真实回合"，并加登录/注册(JWT)与本地会话存档。
1. **ServerClient.cs**：HttpClient + System.Text.Json 封装 register/login/startLoop/ask/choice；非 2xx 抛 `ServerException{Code}`；字段 camelCase 兼容 API_CONTRACT；超时 20s。
2. **Session.cs**：会话（baseUrl/token/playerId/username/loopId）落盘 `user://session.json`，重启续用。
3. **Main.cs**：新增登录面板（用户名/密码/[注册并进入]/[登录]）；登录成功后接 server 开轮回、审问、选择；**断网/未登录自动降级本地 GameLogic**并明示"（本地判定·后端未连接）"；无头冒烟 `LUNHUI_SMOKE=1` 自动 E2E 后退出。

**验证**：
- `dotnet build` 0 错误；
- 起 server（`DB_PATH=:memory:`）+ `LUNHUI_SMOKE=1` 无头运行 → `SMOKE_PASS`：register→loopId=1 seq=1 left=10→ask"你捞过我吗?"→ server 返回 `direct+pause=True+left=9`（JWT 鉴权+云端真相表全链路打通）；
- 后端不可达(端口 7999) 无头运行 → 无异常、干净退出、进离线兜底。

**坑**：
- C# `JsonElement.ArrayEnumerator` 无 `.Select`（补 `using System.Linq;`）；`Label.MinSize` 在 Godot C# 里叫 `CustomMinimumSize`；
- `Control` 布局用 `SetAnchorsPreset`/`Position`+`Size` 而非对象初始化器里不存在的 `AnchorsPreset` 属性；
- 端口被占时记得清残留（见 DEVELOPMENT §7）。

**下一步**：Phase 3② 完整内容接入（8 居民真相表/SOUL/记忆复仇）+ 存档版本迁移；Phase 2 演出细化（四相位/立绘/音频）。

---

## 2026-08-21 · 桌面化 Phase 0：建成 Godot 桌面工程（app/）+ 垂直切片跑通

**本次内容**：把项目"变成 Godot 项目"——新建 `app/` 桌面客户端（C#/mono），跑通单居民 r1 垂直闭环。
1. **工程骨架**：`app/project.godot`（窗口 1280×720、GL Compatibility、主场景 Main.tscn）、`LunhuiDukou.csproj`（Godot.NET.Sdk 4.8.0-dev.3）、`NuGet.Config`（本地源指向编辑器自带 dev SDK，因 4.8.0-dev.3 不上 nuget.org）、`app/.gitignore`（排除 `.godot/ bin/ obj/`）。
2. **资产**：`dukou.glb`（渡口小雨镇）从 web 资产同源复制进 `app/assets/scene/`，经 `--headless --import` 导入（104 步）。
3. **纯逻辑层** `GameLogic.cs`：r1 蓑衣人本地真相表（f1 捞过你→沉默三秒+记忆 / f2 不揭底 / f3）+ 10 问额度 + 轮回状态——即迁移方案"本地预计算挂钩"（先不接 server）。
4. **场景+UI 层** `Main.cs`：运行时装配雨夜空镜（glb + 夜景方向光 + 相机 LookAtFromPosition）+ 蓑衣人占位（深青胶囊+斗笠）+ 雨 GPUParticles + 中文对话题（SystemFont·微软雅黑）；状态机 开场→提问→沉默三秒→选择(上船/留下)→死亡→轮回重启(第 N 世+记忆保留)。

**验证**：`dotnet build` 0 错误；`godot --headless --path app --quit-after 90` 干净退出无报错；`GameLogic` 独立控制台断言 9/9 通过（f1 沉默/额度耗尽 deny/轮回重置/记忆保留）；临时自测工程已删。

**坑**：
- `Camera3D.LookAt` 在节点入树前调用 → "Node not inside tree"，改用 `LookAtFromPosition`；
- `SystemFont` 无 `FontSize` 属性，字号改由 `Theme.DefaultFontSize` 统一设置；
- 4.8.0-dev.3 是 dev 版，只存在于编辑器自带 nupkgs，必须配本地 NuGet 源才能还原。

**下一步**：GUI 打开 `app/` 实测垂直切片可玩（过 G1 稳定关）；Phase 2 演出层细化（真模型/立绘/四相位/音频）；server 会话化接入（替换本地挂钩）。

---

## 2026-08-21 · 桌面化 Phase 1：server 云端化改造（账号/隔离/限流/WebSocket）

**本次内容**：按 DESKTOP_MIGRATION.md Phase 1，把 server 从"单机无鉴权"升级为"可服务多玩家桌面的云端后端"——四件套全做完。
1. **账号/鉴权**：新增 `players` 表 + `@fastify/jwt`（JWT 登录）。密码用 node:crypto `scrypt` + 随机盐 + `timingSafeEqual`（零新原生依赖）。`GET/POST /api/auth/register`、`/api/auth/login`；除 `health/auth/*/events/stream` 外全部受保护，无 token → `401 UNAUTHORIZED`。
2. **玩家维度隔离**：`loops/memories/events/questions/world_states` 五表加 `player_id`；`repository` 全部读写携带 `playerId`，`getLoop` 按 `(player_id,id)` 校验——B 玩家查/操作 A 的 loop 与记忆天然得空/undefined。旧 dev 库用 `ALTER TABLE ADD COLUMN player_id` 自动迁移。
3. **限流**：内存滑动窗口（`services/rate-limiter.ts`），`/api/ask` 按玩家（默认 20/min）、login 按 IP（5/min）、LLM 调用按玩家（30/min），超限 → `429 RATE_LIMITED`。
4. **事件流 SSE → WebSocket**：`services/broker.ts`（进程内按 player_id 发布订阅）+ `packages/server` 的 `GET /api/events/stream?token=`（手内验签），轮回开场事件实时推送。

**关键决策**：方向确认 D.A.（Web→桌面），桌面客户端为唯一面向客户端；`web` 包保留不动（待 Godot 演出层承接后废弃，属 Phase 2 范围）。

**验收证据**：52 个 server 测试全绿（含"双玩家额度/记忆隔离"核心用例）；全仓 90 测试通过；四件套（lint/typecheck/test/build）0 错误；实机冒烟——`register→loop→ask命中f1(pause)→无token返回401` 逐项符合 API_CONTRACT。

**坑**：
- `@fastify/websocket` 注册后非 WS 路由 `config` 需满足新重载 → 用 `interface FastifyContextConfig { public?: boolean }` 增强解决；
- loop-service 原 `db = getDb()` 默认参数随签名变更删除，需清理未用导入；
- 双玩家隔离用例一度断言 B 记忆为 0，但 B 自己提问命中 f1 会写记忆——正确校验应是"B 提问前看不到 A 的记忆"。

**下一步**：Phase 0 垂直切片（Godot + dukou.glb 单居民闭环）；server 会话化/云部署预研。

---

## 2026-08-11 · 全盘审视修复：死代码清理 + 人物动画 + 植被 + 性能

**本次内容**（审视报告 → 4 项修复）：
1. **P1 死代码清理**：删除 `portraits.ts` 死模块（3D 模型化后零引用；立绘资产保留供未来 2.5D 演出）；溅落粒子改为复用 BufferAttribute（不每帧 new → 减少 GC）。
2. **阶段 3 人物动画**（程序化骨骼，不依赖 Mixamo）：肢体重构为 pivot group（肩/髋），绕肩摆臂 + 绕髋迈步 + 头部轻转观察 + 站姿呼吸，相位错开（每人节奏不同）；选中仍 slerp 面向玩家。
3. **阶段 4 植被**（Blender 768 对象）：柳树 ×3（树干+斜枝+垂枝+叶团，河边镇边缘）、芦苇 ×6 簇（河岸成丛+穗头）、荷叶 ×7（水面点缀）；GLB 5.1MB。
4. **阶段 5 性能**：纹理单例缓存（避免每次加载重新生成 4 张 Canvas）；植被免程序化纹理覆盖（保持 Blender 原色）；51K 面/89K 顶点评估 PC 可接受不盲目减面。

**验证**：四件套全绿（69 用例）；浏览器实测植被渲染成功（43369 深绿像素均匀分布）+ 场景健康（22555 色/雨夜亮度 41.7/暖光 220）。

**下一步**：Mixamo 真骨骼动画（可选）；GLB 纹理 KTX2 压缩；移动端 LOD。

---

## 2026-08-11 · 细节精化：人物配饰差异化 + 场景生活件 + 远处笛音

**本次内容**（用户要求"更精美更细节"）：
1. **Blender 场景细节**（560 对象 / 4.7MB）：屋脊装饰翘角、门前盆栽/面馆蒸笼桌椅/纸扎铺纸人/渔屋晾网架/仓库木桶、南北岸系船柱+缆绳、民居间晾衣绳+挂布、窗台、灯笼挂绳、门前招牌、二级石阶、墙角青苔石、广场木桌凳。GLB 经导入恢复+加细节+重新导出（blend 源文件 dukou_scene.blend 已随仓库备份，*.blend* 加入 .gitignore）。
2. **人物配饰差异化**（RESIDENT_BODY + 按 id 渲染）：r1 蓑衣斗笠、r2 怀里花束、r3 面粉围裙、r4 手持纸人、r5 单片眼镜、r6 肩扛渔网、r7 胸前黄铜哨子+手提灯笼、r8 怀抱琥珀布包；体型参数（老鲞 1.12× 高大、小满 0.62× 孩童、何叔 0.22 lean 驼背）；**选中时 slerp 转向玩家**。
3. **防穿模**：居民站位全部移到 walkable 河街（南 z2.5 / 北 z-2.5），站在建筑正前方不嵌墙。
4. **远处笛音**（audio.ts）：WebAudio 随机间隔触发五声音阶单音（G4/A4/F4/E4/D4）+ 颤音 + 低通远处感 + 慢起慢落包络，营造"若有若无"阴森悬疑；dispose 清理 timer。

**验证**：四件套全绿（69 用例）；像素分析配饰色命中（斗笠绿/围裙白/花束粉/哨子黄铜/布包琥珀）。

**下一步**：阶段 3 Mixamo 骨骼行走动画；植被柳树/芦苇；音效笛音已加。

---

## 2026-08-11 · 阶段 4 水乡灵魂：水面灯影倒影 + 斜雨 + 溅落

**本次内容**（对照 R4 水面倒影 / R7 雨巷细节）：
1. **水面倒影 shader 重写**：灯影竖直拉长（汤碗中央光柱 + 左右窗灯双倒影）被噪声扭曲、随时间微动；雨滴随机落水同心圆涟漪（rainRings，泛蓝高光）；三层波噪声（大波纹+中波+细碎闪光）。
2. **河道专用倒影平面**：22×3.4 覆盖 GLB river_main，UV 校准河道；替换原 44×34 通用涟漪平面（避免与河道重叠）。
3. **斜雨**：雨滴风向漂移（-x 0.18×speed）+ 整体倾角 -0.10 rad + 环绕回收。
4. **落水溅落**：SplashPoints 120 颗粒子水面随机位置周期性闪烁（近汤碗暖光、余处冷光），单 draw call。

**验证**：typecheck 0；像素分析：河面暖色倒影 69px + 冷蓝波纹 4399px（倒影存在，俯瞰压缩需近看）。

**下一步**：阶段 3 人物（Mixamo 骨骼+配饰）；音效（雨声+笛音）。

---

## 2026-08-11 · 参考图驱动·阶段1+2（材质写实化 + 光照系统）

**参考图**（docs/references/，Qwen-image 3.0 生成，用户拍板"生成即用不再确认"）：
- R1 小镇全景 / R2 民居近景（材质基准）/ R3 湿石板路 / R4 水面倒影 / R7 雨巷氛围 + R5 人物立绘（已有）

**阶段 1 材质写实化**（textures.ts Canvas 程序化 PBR 纹理）：
- 白墙斑驳（竖雨渍+底部青苔潮痕+剥落斑）、黛瓦瓦楞（瓦脊线+错缝+浸润高光）、湿石板（石块缝+缝间青苔+湿镜面灯影）、湿木（木纹+湿高光）
- applyVillageTextures：GLB 按对象名替换材质 + roughness 湿感（墙0.72/瓦0.55/石板0.32/木0.45）；发光物件保持
- jsdom 无 canvas 2d 降级（空纹理，测试不崩）

**阶段 2 光照**：
- ACESFilmicToneMapping + exposure 1.15（电影感色调）
- 汤碗点光 castShadow（1024 shadow map + bias）；GLB 全对象 cast/receiveShadow
- 半球光（天蓝 #2c3d4f / 地暗 #0a1018 0.55）——建筑明暗体积感

**验证**：四件套全绿（69 用例）；vision 实测：斑驳墙/瓦楞/湿反光 + 电影感色调/阴影方向正确/冷暖对比接近参考图。

**下一步**：阶段 3 人物（Mixamo 骨骼动画+按立绘配饰）；阶段 4 环境（斜雨/水花/植被/音效）。

---

## 2026-08-11 · 3D 人物模型 + 视角转动 + 碰撞加固（v2 反馈修复）

**本次内容**（用户反馈：假/粗糙/穿模/无模型/视角不能转/道路差）：
1. **3D 居民模型**（ResidentModel 程序化人形）：头球+身盒+四肢圆柱，角色色签 8 色，emissive 自发光（雨夜可见），呼吸微动，选中暖光光环；替换剪影/立绘 billboard（NpcBillboard/ResidentSilhouette 已删）。浏览器实测：苔绿蓑衣人立体模型与"按F对话"提示关联可见。
2. **视角转动**：鼠标左键拖拽 yaw 旋转；WASD 移动相对视角方向（前/后/左/右），lookAt 跟随 yaw。UI 面板区不触发。
3. **碰撞加固**：walkable.ts 移除门前空地透口，建筑占地完全禁行；实测玩家被河道拦截、不可进建筑。
4. **道路质感**：Blender 加石板纵横缝（河街/巷/广场），GLB 461 对象 / 2.98MB。
5. 清理 portraitVariant 状态链（立绘表情联动随 billboard 移除）。

**验证**：四件套全绿（69 用例）；实测：步行→栈桥尽头→转身看到立体蓑衣人模型→近身对话触发。

**下一步**：人物动画（行走姿态/朝向玩家）；建筑材质细化（白墙斑驳）；雨滴斜向。

---

## 2026-08-11 · 江南水乡渡口小镇 v2（平面图规划 + 细节建筑 + 行走碰撞）

**本次内容**（用户要求：先规划平面图→按图建 3D；建筑细节丰富；多路径道路；行走贴合禁穿模；雨效自然）：
1. **平面图规划**（docs/village-map.md）：河道沿 x 贯穿（宽 3.2）、南北两岸沿河街双主干、双桥（西石拱/东平桥）成环、南北巷 ×3、渡口码头广场、支流水巷；多路径可达（任意建筑 ≥2 条路径）。
2. **Blender 按图重建**（321 对象 / 2.74MB）：8 栋细节民居（马头墙/飞檐翘角/瓦楞/窗棂/二层阳台/门前石阶/花盆/晾衣杆/灯笼串）+ 石拱桥 + 平桥 + 4 乌篷船 + 石板路/广场 + 钟楼 + 仓库 + 茶馆；渔屋前晾网架、纸扎铺纸灯。
3. **行走碰撞**（walkable.ts）：矩形可行走 mask（河街/巷/广场/桥/栈桥/门前），WASD 移动前检测，禁穿水面/建筑/支流，贴边滑动；初始俯瞰全景（y3.2 z9.5），首次按键吸附南沿河街进入步行。
4. **居民贴场景**：r1 栈桥尽头/r2 花店前/r3 面馆檐下/r4 纸扎铺前/r5 钟表铺门口/r6 渔屋晒网旁/r7 西桥北桥头/r8 东桥南桥头（桥下避雨）。
5. **雨效**：密度 500→900 线（水乡夜雨），silence 320。

**验证**：四件套全绿（69 用例）；浏览器实测：俯瞰→步行吸附→栈桥尽头被河道拦截→蓑衣人近身提示触发，无穿模。

**下一步**：雨滴斜向/屋檐滴水细节；北岸纵深（远山/雾）；音频（雨声+笛音）。

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
