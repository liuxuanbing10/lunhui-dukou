// Main：轮回渡口 桌面客户端（Phase 0/3①/3② + Phase 2 演出细化）
// ------------------------------------------------------------------
// Phase 2 语义（对齐 web/src/App.tsx + useTypewriter + theme + audio）：
//   - 相位状态机 boot→intro → choice → death → memory（web 同款五种相位）
//   - 打字机对话：intro/memory 相位逐字揭示（web useTypewriter 35ms/字）
//   - 「沉默三秒」视听留白：命中关键真相 → 暖光收束(dim) + 雨声/暖压暗 + 钟鸣泛音 → choice
//   - 死亡相位：全屏暗调 + 后果 + 死因，点「进入下一轮」续玩
//   - 记忆相位：跨世记忆叠影，点「继续」进入新轮回
//   - 主题 token：用 ThemeTokens（对齐 art-style-2.5d）给面板/文本/强调上色
// 数据源：有会话走云端 @lunhui/server；断网/未登录走本地 8 居民真相表兜底。
namespace LunhuiDukou;

using System.Linq;
using System.Threading.Tasks;
using Godot;

public partial class Main : Node3D
{
    private const string DefaultBaseUrl = "http://127.0.0.1:8787";
    private const double SilenceMs = 2600;
    private const double TypeSpeedMs = 35;

    private enum Phase { Intro, Choice, Death, Memory }

    private readonly GameLogic _logic = new();

    private ServerClient? _server;
    private Session? _session;
    private AmbientAudio? _audio;

    private string _residentId = GameLogic.All[0].Id;
    private Phase _phase = Phase.Intro;
    private string _lastMemory = "";
    private string _pendingIntro = "";

    // 显示状态
    private int _loopSeq = 1;
    private int _left;
    private bool _transitioning;

    // 世界节点/灯
    private DirectionalLight3D? _moodLight;

    // UI
    private CanvasLayer? _ui;
    private Control? _loginPanel;
    private LineEdit? _loginUser;
    private LineEdit? _loginPass;
    private Label? _loginStatus;

    private Label? _header;
    private Label? _narrator;
    private TextureRect? _portrait;
    private OptionButton? _residentSel;
    private LineEdit? _input;
    private Button? _askBtn;
    private HBoxContainer? _choiceBox;
    private ColorRect? _silenceDim;

    private Control? _deathPanel;
    private Label? _deathConsequence;
    private Label? _deathLine;

    private Control? _memoryPanel;
    private Label? _memoryLines;

    private Camera3D _camera = null!;
    private readonly System.Collections.Generic.Dictionary<string, ResidentRig> _rigs = new();
    // 第一人称：相机在主角眼睛高度，放在小镇街道中央
    private Vector3 _baseCam = new(0, 1.7f, 0);
    private float _baseFov = 75f;
    private float _time;

    public override void _Process(double delta)
    {
        if (_camera == null) return;
        _time += (float)delta;
        // 第一人称：轻微呼吸晃动（模拟主角站立时的自然晃动）
        var sway = new Vector3(
            Mathf.Sin(_time * 0.8f) * 0.008f,
            Mathf.Sin(_time * 1.2f) * 0.015f,
            0);
        var desired = _baseCam + sway;
        _camera.Position = _camera.Position.Lerp(desired, (float)delta * 5f);
        _camera.Fov = Mathf.Lerp(_camera.Fov, _baseFov, (float)delta * 3f);
        // 第一人称：相机看向正前方（居民站的方向）
        _camera.LookAt(new Vector3(0, 1.5f, -5f), Vector3.Up);

        // 确保 UI root 始终匹配视口尺寸
        if (_ui != null && _ui.GetChildCount() > 0 && _ui.GetChild(0) is Control rootCtrl)
        {
            var targetSize = GetTree().Root.Size;
            if (rootCtrl.Size != targetSize)
                rootCtrl.Size = targetSize;
        }
    }

    public override void _Ready()
    {
        _server = new ServerClient(OS.GetEnvironment("LUNHUI_SERVER") ?? DefaultBaseUrl);
        _session = SessionStore.Load();
        _left = GameLogic.MaxQuestions;
        _audio = new AmbientAudio();
        AddChild(_audio);

        _BuildWorld();
        _BuildUi();

        // CanvasLayer 不会自动给子 Control 提供视口尺寸
        // 必须在 _Ready 中显式设置 root 尺寸
        if (_ui != null && _ui.GetChildCount() > 0 && _ui.GetChild(0) is Control rootCtrl)
            rootCtrl.Size = GetTree().Root.Size;

        if (OS.GetEnvironment("LUNHUI_SMOKE") == "1") { _RunSmokeAsync(); return; }
        if (OS.GetEnvironment("LUNHUI_TEST_SESSION") == "1")
        {
            GetTree().Quit(DevChecks.RunSessionCheck() ? 0 : 1);
            return;
        }

        if (_session is { Token.Length: > 0 }) BeginLoopAsync();
        else ShowLogin();
    }

    // ---------- 开发期诊断触发（实现见 DevChecks，仅负责退出码） ----------
    private async void _RunSmokeAsync()
    {
        bool ok = await DevChecks.RunSmokeAsync(DefaultBaseUrl);
        GetTree().Quit(ok ? 0 : 1);
    }

    // ---------- 3D 世界 ----------
    private void _BuildWorld()
    {
        try
        {
            var scene = GD.Load<PackedScene>("res://assets/scene/dukou.glb");
            AddChild(scene.Instantiate<Node3D>());
        }
        catch (System.Exception e)
        {
            GD.PushWarning($"[main] 场景加载失败（继续以空场运行）: {e.Message}");
        }

        _moodLight = new DirectionalLight3D
        {
            LightColor = new Color(0.55f, 0.6f, 0.75f),
            LightEnergy = 0.6f,
            RotationDegrees = new Vector3(-45, 30, 0),
        };
        AddChild(_moodLight);

        _camera = new Camera3D { Fov = 75 };
        AddChild(_camera);
        _camera.LookAtFromPosition(new Vector3(0, 1.7f, 0), new Vector3(0, 1.5f, -5f), Vector3.Up);

        // 8 位居民：排成弧形站在主角面前（z=-3~-5），第一人称视角下清晰可见
        for (int i = 0; i < GameLogic.All.Length; i++)
        {
            string rid = GameLogic.All[i].Id;
            float childScale = rid == "r8" ? 0.62f : 1f;
            float angle = (i - 3.5f) * 0.22f; // 弧形分布，跨度更大
            var rig = new ResidentRig
            {
                Position = new Vector3(Mathf.Sin(angle) * 4f, 0, -3.5f - Mathf.Cos(angle) * 0.8f),
                Scale = new Vector3(childScale, childScale, childScale),
            };
            var body = _TryLoadResidentModel(rid);
            if (body == null) body = _CapsuleBody();
            rig.Setup(body);
            AddChild(rig);
            _rigs[rid] = rig;
        }

        _TryAddRain();
    }

    // 载入 Blender 真模型（resident_r{id}.glb；加载失败回退胶囊）
    private Node3D? _TryLoadResidentModel(string id)
    {
        try
        {
            var scene = GD.Load<PackedScene>($"res://assets/models/resident_{id}.glb");
            return scene.Instantiate<Node3D>();
        }
        catch (System.Exception e)
        {
            GD.PushWarning($"[main] 真模型{id}加载失败（回退胶囊）: {e.Message}");
            return null;
        }
    }

    // 占位胶囊（含斗笠）——无真模型时的兜底立绘
    private Node3D _CapsuleBody()
    {
        var root = new Node3D();
        var body = new MeshInstance3D
        {
            Mesh = new CapsuleMesh { Radius = 0.32f, Height = 1.6f },
            Position = new Vector3(0, 0.8f, 0),
        };
        body.MaterialOverride = new StandardMaterial3D
        {
            AlbedoColor = Color.FromHtml("#4A5A6B"),
            Roughness = 0.9f,
        };
        root.AddChild(body);
        var hat = new MeshInstance3D
        {
            Mesh = new CylinderMesh { TopRadius = 0.4f, BottomRadius = 0.4f, Height = 0.12f },
            Position = new Vector3(0, 1.62f, 0),
        };
        hat.MaterialOverride = new StandardMaterial3D
        {
            AlbedoColor = new Color(0.13f, 0.2f, 0.17f),
            Roughness = 0.95f,
        };
        root.AddChild(hat);
        return root;
    }

    private void _TryAddRain()
    {
        try
        {
            var ppm = new ParticleProcessMaterial
            {
                Gravity = new Vector3(0, -25, 0),
                Direction = new Vector3(0, -1, 0),
                Spread = 8f,
                InitialVelocityMin = 18f,
                InitialVelocityMax = 26f,
                ScaleMin = 0.02f,
                ScaleMax = 0.05f,
            };
            var rain = new GpuParticles3D
            {
                ProcessMaterial = ppm,
                Amount = 600,
                Emitting = true,
                Lifetime = 0.9f,
                Position = new Vector3(0, 14, 0),
            };
            AddChild(rain);
        }
        catch (System.Exception e)
        {
            GD.PushWarning($"[main] 雨粒创建失败（跳过）: {e.Message}");
        }
    }

    // ---------- UI ----------
    private SystemFont _ChineseFont() =>
        new() { FontNames = new[] { "Microsoft YaHei", "微软雅黑", "SimHei" } };

    private void _BuildUi()
    {
        _ui = new CanvasLayer { Layer = 10 };
        AddChild(_ui);

        // root: 用 Control 做容器，显式设置尺寸（CanvasLayer 不提供大小）
        var root = new Control { Name = "Root" };
        root.Size = GetTree().Root.Size;
        _ui.AddChild(root);

        _BuildLoginPanel(root);
        _BuildSilenceDim(root);
        _BuildGamePanel(root);
        _BuildDeathPanel(root);
        _BuildMemoryPanel(root);
    }

    private void _BuildLoginPanel(Control root)
    {
        _loginPanel = new VBoxContainer { Name = "LoginPanel" };
        _loginPanel.SetAnchorsPreset(Control.LayoutPreset.Center, true);
        _loginPanel.Size = new Vector2(440, 300);
        _loginPanel.Position = new Vector2(-220, -150);
        var title = new Label { Text = "轮回渡口·登临" };
        title.AddThemeColorOverride("font_color", ThemeTokens.WarmSoul);
        _loginPanel.AddChild(title);
        _loginUser = new LineEdit { PlaceholderText = "用户名" };
        _loginPass = new LineEdit { PlaceholderText = "密码（≥6 位）", Secret = true };
        var row = new HBoxContainer();
        var regBtn = _AccentButton("注册并进入");
        var loginBtn = _AccentButton("登录");
        row.AddChild(regBtn);
        row.AddChild(loginBtn);
        _loginStatus = new Label { Name = "LoginStatus" };
        _loginStatus.CustomMinimumSize = new Vector2(0, 28);
        _loginStatus.AddThemeColorOverride("font_color", ThemeTokens.InkDim);
        _loginPanel.AddChild(_loginUser);
        _loginPanel.AddChild(_loginPass);
        _loginPanel.AddChild(row);
        _loginPanel.AddChild(_loginStatus);

        regBtn.Pressed += () => _AuthenticateAsync(register: true);
        loginBtn.Pressed += () => _AuthenticateAsync(register: false);
        root.AddChild(_loginPanel);
    }

    // 「沉默三秒」暗调遮罩（暖光收束）：命中关键真相时淡入，结束淡出
    private void _BuildSilenceDim(Control root)
    {
        _silenceDim = new ColorRect
        {
            Color = new Color(0, 0, 0, 0),
            MouseFilter = Control.MouseFilterEnum.Ignore,
        };
        _silenceDim.SetAnchorsAndOffsetsPreset(Control.LayoutPreset.FullRect);
        root.AddChild(_silenceDim);
    }

    private void _BuildGamePanel(Control root)
    {
        // vbox 用 anchors 铺满 root（减去边距），不依赖 root 的初始尺寸
        var vbox = new VBoxContainer { Name = "GamePanel" };
        vbox.AnchorLeft = 0f;
        vbox.AnchorTop = 0f;
        vbox.AnchorRight = 1f;
        vbox.AnchorBottom = 1f;
        vbox.OffsetLeft = 40;
        vbox.OffsetTop = 24;
        vbox.OffsetRight = -40;
        vbox.OffsetBottom = -24;

        _header = new Label { Name = "Header" };
        _header.AddThemeColorOverride("font_color", ThemeTokens.InkDim);
        vbox.AddChild(_header);

        _narrator = new Label
        {
            Name = "Narrator",
            SizeFlagsVertical = Control.SizeFlags.ExpandFill,
            SizeFlagsHorizontal = Control.SizeFlags.ExpandFill,
            AutowrapMode = TextServer.AutowrapMode.WordSmart,
        };
        _narrator.AddThemeColorOverride("font_color", ThemeTokens.InkPrimary);

        // narRow 限制最大高度，避免把下面的控件挤出屏幕
        var narRow = new HBoxContainer { Name = "NarRow" };
        narRow.SizeFlagsVertical = Control.SizeFlags.ExpandFill;
        narRow.SizeFlagsHorizontal = Control.SizeFlags.ExpandFill;
        _portrait = new TextureRect
        {
            Name = "Portrait",
            CustomMinimumSize = new Vector2(150, 210),
            StretchMode = TextureRect.StretchModeEnum.KeepAspectCentered,
            ExpandMode = TextureRect.ExpandModeEnum.IgnoreSize,
        };
        _portrait.CustomMinimumSize = new Vector2(150, 210);
        narRow.AddChild(_portrait);
        narRow.AddChild(_narrator);
        vbox.AddChild(narRow);

        // 交互行：确保不被 ExpandFill 挤掉
        var selRow = new HBoxContainer { Name = "SelRow" };
        selRow.SizeFlagsVertical = Control.SizeFlags.ShrinkCenter;
        selRow.SizeFlagsHorizontal = Control.SizeFlags.ExpandFill;
        var selLabel = new Label { Text = "向谁问：" };
        selLabel.AddThemeColorOverride("font_color", ThemeTokens.InkDim);
        selRow.AddChild(selLabel);
        _residentSel = new OptionButton { SizeFlagsHorizontal = Control.SizeFlags.ExpandFill };
        for (int i = 0; i < GameLogic.All.Length; i++)
            _residentSel.AddItem(GameLogic.All[i].Name);
        _residentSel.ItemSelected += idx =>
        {
            _residentId = GameLogic.All[(int)idx].Id;
            _UpdatePortrait();
            if (_rigs.TryGetValue(_residentId, out var rig))
            {
                rig.SetSelected(true);
                if (_camera != null) rig.FaceTarget(_camera.GlobalPosition);
            }
        };
        selRow.AddChild(_residentSel);
        vbox.AddChild(selRow);

        var inputRow = new HBoxContainer { Name = "InputRow" };
        inputRow.SizeFlagsVertical = Control.SizeFlags.ShrinkCenter;
        inputRow.SizeFlagsHorizontal = Control.SizeFlags.ExpandFill;
        _input = new LineEdit
        {
            Name = "AskInput",
            PlaceholderText = "问一句，看看能不能套出真相（如「你捞过我吗？」）",
            SizeFlagsHorizontal = Control.SizeFlags.ExpandFill,
        };
        _askBtn = _AccentButton("开口问");
        inputRow.AddChild(_input);
        inputRow.AddChild(_askBtn);
        vbox.AddChild(inputRow);

        _choiceBox = new HBoxContainer { Name = "ChoiceBox", Visible = false };
        _choiceBox.SizeFlagsVertical = Control.SizeFlags.ShrinkCenter;
        _choiceBox.SizeFlagsHorizontal = Control.SizeFlags.ExpandFill;
        var leave = _AccentButton("上船｜我想离开这个镇子");
        var stay = _AccentButton("留下｜我得先弄清我是谁");
        _choiceBox.AddChild(leave);
        _choiceBox.AddChild(stay);
        vbox.AddChild(_choiceBox);

        _askBtn.Pressed += HandleAsk;
        _input.TextSubmitted += _ => HandleAsk();
        leave.Pressed += () => HandleChoice("leave");
        stay.Pressed += () => HandleChoice("stay");
        root.AddChild(vbox);
    }

    private void _BuildDeathPanel(Control root)
    {
        _deathPanel = new Control { Name = "DeathPanel", Visible = false };
        _deathPanel.SetAnchorsAndOffsetsPreset(Control.LayoutPreset.FullRect);

        var veil = new ColorRect { Color = new Color(0.02f, 0.03f, 0.05f, 0.9f) };
        veil.SetAnchorsAndOffsetsPreset(Control.LayoutPreset.FullRect);
        _deathPanel.AddChild(veil);

        var box = new VBoxContainer();
        box.SetAnchorsPreset(Control.LayoutPreset.Center, true);
        box.Size = new Vector2(720, 320);
        box.Position = new Vector2(-360, -170);
        box.CustomMinimumSize = new Vector2(0, 0);

        var title = new Label { Text = "—— 这一世，结束了 ——" };
        title.AddThemeColorOverride("font_color", ThemeTokens.UiDanger);
        title.HorizontalAlignment = HorizontalAlignment.Center;
        box.AddChild(title);

        _deathConsequence = new Label { AutowrapMode = TextServer.AutowrapMode.WordSmart };
        _deathConsequence.AddThemeColorOverride("font_color", ThemeTokens.InkPrimary);
        box.AddChild(_deathConsequence);

        _deathLine = new Label { AutowrapMode = TextServer.AutowrapMode.WordSmart };
        _deathLine.AddThemeColorOverride("font_color", ThemeTokens.InkDim);
        box.AddChild(_deathLine);

        var next = _AccentButton("进入下一轮");
        var row = new CenterContainer();
        row.AddChild(next);
        box.AddChild(row);

        next.Pressed += () => _ = BeginLoopAsync();
        _deathPanel.AddChild(box);
        root.AddChild(_deathPanel);
    }

    private void _BuildMemoryPanel(Control root)
    {
        _memoryPanel = new Control { Name = "MemoryPanel", Visible = false };
        _memoryPanel.SetAnchorsAndOffsetsPreset(Control.LayoutPreset.FullRect);

        var veil = new ColorRect { Color = new Color(0.03f, 0.03f, 0.05f, 0.85f) };
        veil.SetAnchorsAndOffsetsPreset(Control.LayoutPreset.FullRect);
        _memoryPanel.AddChild(veil);

        var box = new VBoxContainer();
        box.SetAnchorsPreset(Control.LayoutPreset.Center, true);
        box.Size = new Vector2(720, 320);
        box.Position = new Vector2(-360, -170);

        var title = new Label { Text = "—— 记忆叠影 ——" };
        title.AddThemeColorOverride("font_color", ThemeTokens.MemoryAmber);
        title.HorizontalAlignment = HorizontalAlignment.Center;
        box.AddChild(title);

        _memoryLines = new Label { AutowrapMode = TextServer.AutowrapMode.WordSmart };
        _memoryLines.AddThemeColorOverride("font_color", ThemeTokens.MemoryGhost);
        box.AddChild(_memoryLines);

        var cont = _AccentButton("继续");
        var row = new CenterContainer { SizeFlagsVertical = Control.SizeFlags.ShrinkEnd };
        row.AddChild(cont);
        box.AddChild(row);

        cont.Pressed += () => _ = EnterIntroPhase(_pendingIntro);
        _memoryPanel.AddChild(box);
        root.AddChild(_memoryPanel);
    }

    private Button _AccentButton(string text)
    {
        var b = new Button { Text = text };
        // 用 Godot 默认按钮样式，只覆盖字体颜色
        b.AddThemeColorOverride("font_color", ThemeTokens.InkPrimary);
        b.AddThemeColorOverride("font_hover_color", ThemeTokens.WarmGlow);
        return b;
    }

    private static StyleBoxFlat _PanelStyle(Color bg)
    {
        var sb = new StyleBoxFlat
        {
            BgColor = bg,
            CornerRadiusTopLeft = 4,
            CornerRadiusTopRight = 4,
            CornerRadiusBottomLeft = 4,
            CornerRadiusBottomRight = 4,
            BorderColor = ThemeTokens.UiBorder,
            BorderWidthLeft = 1,
            BorderWidthRight = 1,
            BorderWidthTop = 1,
            BorderWidthBottom = 1,
            ContentMarginLeft = 10,
            ContentMarginRight = 10,
            ContentMarginTop = 6,
            ContentMarginBottom = 6,
        };
        return sb;
    }

    // ---------- 登录流程 ----------
    private void ShowLogin()
    {
        _loginPanel!.Visible = true;
        _loginUser!.GrabFocus();
        _loginStatus!.Text = _session == null
            ? "请登录或注册（若后端未启动将进入本地判定）"
            : "已登出";
    }

    private async void _AuthenticateAsync(bool register)
    {
        var user = _loginUser!.Text.Trim();
        var pass = _loginPass!.Text;
        if (string.IsNullOrEmpty(user) || string.IsNullOrEmpty(pass))
        {
            _loginStatus!.Text = "用户名与密码不能为空";
            return;
        }
        _loginStatus!.Text = register ? "注册中…" : "登录中…";
        try
        {
            // 分路径：注册走 register、登录走 login（原先两者都调 register，导致已注册用户无法登录）
            var auth = register
                ? await _server!.RegisterAsync(user, pass)
                : await _server!.LoginAsync(user, pass);
            SaveSession(auth, 0);
            BeginLoopAsync();
        }
        catch (ServerException e)
        {
            if (register && e.Code == "USERNAME_TAKEN")
            {
                // 注册时账号已存在 → 改走登录（容错：既有账号直接登录）
                _loginStatus!.Text = "账号已存在，尝试直接登录…";
                try
                {
                    var auth = await _server!.LoginAsync(user, pass);
                    SaveSession(auth, 0);
                    BeginLoopAsync();
                }
                catch (System.Exception e2)
                {
                    _loginStatus!.Text = $"登录失败（{e2.Message}）——将进入本地判定";
                    _loginPanel!.Visible = false;
                    BeginLoopAsync();
                }
            }
            else if (!register && e.Code == "INVALID_CREDENTIALS")
            {
                // 登录失败：账号不存在则自动注册；账号存在但密码错 → 本地判定
                try
                {
                    var auth = await _server!.RegisterAsync(user, pass);
                    SaveSession(auth, 0);
                    BeginLoopAsync();
                }
                catch (System.Exception e2)
                {
                    _loginStatus!.Text = $"登录失败且自动注册失败（{e2.Message}）——将进入本地判定";
                    _loginPanel!.Visible = false;
                    BeginLoopAsync();
                }
            }
            else
            {
                _loginStatus!.Text = $"{e.Code}　将进入本地判定";
                _loginPanel!.Visible = false;
                BeginLoopAsync();
            }
        }
        catch (System.Exception)
        {
            _loginStatus!.Text = "后端不可达——进入本地判定";
            _loginPanel!.Visible = false;
            BeginLoopAsync();
        }
    }

    private void SaveSession(AuthResult auth, int loopId)
    {
        var baseUrl = _session?.BaseUrl ?? DefaultBaseUrl;
        _session = new Session(baseUrl, auth.Token, auth.PlayerId, auth.Username, loopId, SessionMigration.CurrentVersion);
        SessionStore.Save(_session);
    }

    // ---------- 轮回流转 ----------
    private async Task BeginLoopAsync()
    {
        // 复位过渡锁：死亡轮回后也能重新开始提问（否则第二世起 HandleAsk 被永久拦截）
        _transitioning = false;
        _loginPanel!.Visible = false;
        _audio?.Start();

        string intro;
        if (_session is { Token.Length: > 0 })
        {
            try
            {
                var loop = await _server!.StartLoopAsync(_session.Token);
                _session = _session with { LoopId = loop.LoopId };
                SessionStore.Save(_session);
                _loopSeq = loop.Sequence;
                _left = loop.QuestionsLeft;
                intro = loop.Intro;
            }
            catch (System.Exception e)
            {
                GD.PushWarning($"[main] 后端开局失败，转本地兜底: {e.Message}");
                _ToLocalIntro(out intro);
            }
        }
        else
        {
            _ToLocalIntro(out intro);
        }

        _pendingIntro = intro;
        if (!string.IsNullOrEmpty(_lastMemory))
        {
            _memoryLines!.Text = $"— 你还记得 —\n{_lastMemory}";
            _EnterPhase(Phase.Memory);
        }
        else
        {
            await EnterIntroPhase(intro);
        }
    }

    private void _ToLocalIntro(out string intro)
    {
        _loopSeq = _logic.Loop;
        _left = _logic.QuestionsLeft;
        intro = _session == null
            ? "[本地判定 · 后端未连接]\n雨夜。你从水里醒来。8 个人站在岸边。\n蓑衣人站在渡口最近水的地方，看着你。"
            : "雨夜。你从水里醒来。8 个人站在岸边，等你摆渡。你数了两次：9 个。再数，8 个。没人承认多出来的那个是谁。";
    }

    private async Task EnterIntroPhase(string intro)
    {
        RefreshHeader();
        _EnterPhase(Phase.Intro);
        _UpdatePortrait();
        // 真3D：开局让当前居民面向玩家（玩家视角默认在相机处）
        if (_rigs.TryGetValue(_residentId, out var rig) && _camera != null)
            rig.FaceTarget(_camera.GlobalPosition);
        await TypewriterAsync(intro);
        EnableAsk();
    }

    // ---------- 审问 ----------
    private void HandleAsk()
    {
        if (_transitioning || _phase != Phase.Intro) return;
        var q = _input!.Text.Trim();
        if (string.IsNullOrEmpty(q)) return;

        _transitioning = true;
        _askBtn!.Disabled = true;
        _input.Editable = false;
        _input.Text = "";

        _ = AskAsync(q);
    }

    private async Task AskAsync(string q)
    {
        AnswerResult res;
        if (_session is { Token.Length: > 0 })
        {
            try
            {
                var r = await _server!.AskAsync(_session.Token, _session.LoopId, _residentId, q);
                _left = r.QuestionsLeft;
                RefreshHeader();
                res = new AnswerResult(r.Answer, r.AnswerMode, r.Pause);
            }
            catch (System.Exception e)
            {
                GD.PushWarning($"[main] 审问失败转本地兜底: {e.Message}");
                res = _logic.Ask(_residentId, q);
                _left = _logic.QuestionsLeft;
                RefreshHeader();
            }
        }
        else
        {
            res = _logic.Ask(_residentId, q);
            _left = _logic.QuestionsLeft;
            RefreshHeader();
        }

        if (res.Pause)
        {
            _lastMemory = res.Text; // 「它记得我」跨世记忆碎片
            await SilenceRevealAsync(res.Text);
            _EnterPhase(Phase.Choice);
        }
        else
        {
            await TypewriterAsync(res.Text);
            if (_left <= 0) _EnterPhase(Phase.Choice);
            else
            {
                await WaitSeconds(0.5); // 一记"节拍"再恢复提问，避免赶场
                EnableAsk();
            }
        }
        _transitioning = false;
    }

    // 命中关键真相：「沉默三秒」视听收束（暖光 dim + 雨声压暗 + 钟鸣）→ 揭示
    private async Task SilenceRevealAsync(string text)
    {
        _audio?.SetSilence(true);
        _audio?.PlayReveal();
        if (_residentId == "r1") _UpdatePortrait("face_hit"); // 蓑衣人命中 → 表情帧
        // 真3D：命中关键真相 → 当事人触发命中反应（后仰受压 + 手臂猛地扬起）
        if (_rigs.TryGetValue(_residentId, out var rig)) rig.TriggerHit();
        _moodLight?.CreateTween().TweenProperty(_moodLight, "light_energy", 0.18f, 0.5f);
        _silenceDim!.Color = new Color(0, 0, 0, 0);
        _silenceDim.CreateTween().TweenProperty(_silenceDim, "color", new Color(0, 0, 0, 0.55f), 0.5f);
        _silenceDim.Visible = true;

        await TypewriterAsync(text); // 打字机揭示那句点睛真相
        await WaitSeconds(SilenceMs / 1000.0 * 0.6);

        _audio?.SetSilence(false);
        _UpdatePortrait(); // 恢复立绘默认帧
        _moodLight?.CreateTween().TweenProperty(_moodLight, "light_energy", 0.6f, 0.6f);
        _silenceDim.CreateTween().TweenProperty(_silenceDim, "color", new Color(0, 0, 0, 0), 0.5f);
        _silenceDim.Visible = false;
    }

    // ---------- 选择 / 死亡 ----------
    private async void HandleChoice(string choice)
    {
        if (_transitioning || _phase != Phase.Choice) return;
        _transitioning = true;
        _EnterPhase(Phase.Death); // 由死亡面板呈现
        _audio?.PlayDeath();

        if (_session is { Token.Length: > 0 })
        {
            try
            {
                var r = await _server!.ChoiceAsync(_session.Token, _session.LoopId, choice);
                _deathConsequence!.Text = r.Consequence;
            }
            catch
            {
                _deathConsequence!.Text = choice == "leave"
                    ? "（离线）船在河心沉没了。"
                    : "（离线）你被水拉回了岸边。";
            }
        }
        else
        {
            _deathConsequence!.Text = choice == "leave"
                ? "船在河心沉没了。你从水里又醒来。"
                : "你被水拉回了岸边，还是没能离开。";
        }
        var residentName = GameLogic.All.FirstOrDefault(p => p.Id == _residentId)?.Name ?? "蓑衣人";
        _deathLine!.Text = choice == "leave"
            ? $"蓑衣人在岸上看着你沉下去。「你又走了。」{residentName}低声道。"
            : $"你留下，却还是被水拉回岸边。天亮时，轮回重置了。{residentName}不见了。";
    }

    // ---------- 打字机 ----------
    private async Task TypewriterAsync(string text)
    {
        _narrator!.Text = "";
        for (int i = 0; i <= text.Length; i++)
        {
            _narrator.Text = text[..i];
            await WaitSeconds(TypeSpeedMs / 1000.0);
        }
    }

    // ---------- 相位 / UI ----------
    private void _EnterPhase(Phase p)
    {
        _phase = p;
        _choiceBox!.Visible = p == Phase.Choice;
        _residentSel!.Visible = p == Phase.Intro;
        _input!.Visible = p == Phase.Intro;
        _askBtn!.Visible = p == Phase.Intro;
        _deathPanel!.Visible = p == Phase.Death;
        _memoryPanel!.Visible = p == Phase.Memory;
        _silenceDim!.Visible = false;
        if (p == Phase.Memory) _narrator!.Visible = false;
        else _narrator!.Visible = true;

        // 相位机位/焦距（第一人称，_Process 缓动逼近）
        (_baseCam, _baseFov) = p switch
        {
            Phase.Choice => (new Vector3(0, 1.7f, 0), 75f),
            Phase.Death => (new Vector3(0, 1.7f, 0.5f), 80f), // 死亡时微微前倾
            Phase.Memory => (new Vector3(0, 1.7f, 0), 70f),   // 记忆稍窄视角
            _ => (new Vector3(0, 1.7f, 0), 75f),              // Intro
        };
    }

    private void EnableAsk()
    {
        _input!.Editable = true;
        _askBtn!.Disabled = false;
        _input.GrabFocus();
    }

    // 对话立绘：默认 body.webp；face 传 e.g. "face_hit"（仅 r1 有表情帧）
    private void _UpdatePortrait(string? face = null)
    {
        if (_portrait == null) return;
        var file = face != null
            ? $"res://assets/portraits/{_residentId}/{face}.webp"
            : $"res://assets/portraits/{_residentId}/body.webp";
        try
        {
            _portrait.Texture = GD.Load<Texture2D>(file);
        }
        catch (System.Exception e)
        {
            GD.PushWarning($"[main] 立绘加载失败: {e.Message}");
        }
    }

    private void NarrateFull(string text) => _narrator!.Text = text;
    private void RefreshHeader() =>
        _header!.Text = $"轮回 第{_loopSeq}世　·　今晚还能问 {_left} 句";

    private async Task WaitSeconds(double seconds)
    {
        var timer = GetTree().CreateTimer(seconds);
        await ToSignal(timer, SceneTreeTimer.SignalName.Timeout);
    }
}