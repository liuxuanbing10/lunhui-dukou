// Main：轮回渡口 · Phase 0 垂直切片 + Phase 3① 接线（桌面 Godot 客户端入口）
// ------------------------------------------------------------------
// 闭环：登录/注册(JWT) → 渡口雨夜空镜 → 审问（命中真相表→沉默三秒）→ 选择 → 死亡 → 轮回。
// 数据源：有会话 token 时走云端 @lunhui/server（真实回合）；断网/未登录走 GameLogic 本地兜底。
// 装配技巧：全部在 C# 运行时完成；中文用 SystemFont（微软雅黑）。
namespace LunhuiDukou;

using System.Threading.Tasks;
using Godot;

public partial class Main : Node3D
{
    private const string DefaultBaseUrl = "http://127.0.0.1:8787";

    private GameLogic _logic = new();

    // 云端接线
    private ServerClient? _server;
    private Session? _session; // null=未登录（走本地兜底）

    // 当前被审问的居民（r1..r8）
    private string _residentId = GameLogic.All[0].Id;

    // 显示状态
    private int _loopSeq = 1;
    private int _left;

    // UI
    private CanvasLayer? _ui;
    private Control? _loginPanel;
    private LineEdit? _loginUser;
    private LineEdit? _loginPass;
    private Label? _loginStatus;

    private Label? _header;
    private Label? _narrator;
    private OptionButton? _residentSel;
    private LineEdit? _input;
    private Button? _askBtn;
    private HBoxContainer? _choiceBox;

    private bool _transitioning;

    public override void _Ready()
    {
        _server = new ServerClient(OS.GetEnvironment("LUNHUI_SERVER") ?? DefaultBaseUrl);
        _session = SessionStore.Load();
        _left = GameLogic.MaxQuestions;

        _BuildWorld();
        _BuildUi();

        if (OS.GetEnvironment("LUNHUI_SMOKE") == "1")
        {
            RunSmokeAsync(); // 无头端到端验证（CI），完成后自动退出
            return;
        }
        if (OS.GetEnvironment("LUNHUI_TEST_SESSION") == "1")
        {
            RunSessionCheck(); // 存档版本迁移自检
            return;
        }

        // 有存量会话则直接进入，否则先登录/注册
        if (_session is { Token.Length: > 0 })
            StartGameAfterAuth();
        else
            ShowLogin();
    }

    // ---------- 云端/E2E ----------
    // 无头端到端冒烟：注册→开局→审问命中 f1→退出。失败退出码 1。
    private async void RunSmokeAsync()
    {
        try
        {
            GD.Print($"[smoke] base={DefaultBaseUrl}");
            var server = new ServerClient(DefaultBaseUrl);
            var username = "smoke" + (GD.Randi() % 900000 + 100000);
            GD.Print($"[smoke] register {username}");
            var auth = await server.RegisterAsync(username, "secret123");
            GD.Print($"[smoke] token_len={auth.Token.Length}");
            var loop = await server.StartLoopAsync(auth.Token);
            GD.Print($"[smoke] loopId={loop.LoopId} seq={loop.Sequence} left={loop.QuestionsLeft}");
            var ask = await server.AskAsync(auth.Token, loop.LoopId, "r1", "你捞过我吗？");
            GD.Print($"[smoke] r1 answer='{ask.Answer}' mode={ask.AnswerMode} pause={ask.Pause} left={ask.QuestionsLeft}");
            var ask2 = await server.AskAsync(auth.Token, loop.LoopId, "r8", "你怎么知道我的名字？");
            GD.Print($"[smoke] r8 answer='{ask2.Answer}' mode={ask2.AnswerMode} pause={ask2.Pause}");
            if (ask.Pause && ask.AnswerMode == "direct" && ask.QuestionsLeft == 9
                && ask2.Pause && !string.IsNullOrEmpty(ask2.Answer))
            {
                GD.Print("SMOKE_PASS");
                GetTree().Quit(0);
            }
            else
            {
                GD.PrintErr("SMOKE_FAIL: 判定不符");
                GetTree().Quit(1);
            }
        }
        catch (System.Exception e)
        {
            GD.PrintErr($"[smoke] ERROR: {e.Message}");
            GetTree().Quit(1);
        }
    }

    // 存档版本迁移自检：写入无 version 的旧格式 → Load 应迁移到当前版本（跑完即退）。
    private void RunSessionCheck()
    {
        SessionStore.Clear();
        using (var f = FileAccess.Open("user://session.json", FileAccess.ModeFlags.Write))
            f.StoreString("{\"BaseUrl\":\"\",\"Token\":\"legacy\",\"PlayerId\":7,\"Username\":\"u\",\"LoopId\":5}");
        var loaded = SessionStore.Load();
        bool ok = loaded != null
            && loaded.Version == SessionStore.CurrentVersion
            && loaded.Token == "legacy"
            && loaded.BaseUrl == "http://127.0.0.1:8787";
        GD.Print(ok ? "SESSION_MIGRATE_PASS" : "SESSION_MIGRATE_FAIL");
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

        var light = new DirectionalLight3D
        {
            LightColor = new Color(0.55f, 0.6f, 0.75f),
            LightEnergy = 0.6f,
            RotationDegrees = new Vector3(-45, 30, 0),
        };
        AddChild(light);

        var camera = new Camera3D { Fov = 60 };
        AddChild(camera);
        camera.LookAtFromPosition(new Vector3(0, 6, 14), new Vector3(0, 0, 0), Vector3.Up);

        // 8 位居民占位立绘（Phase 3②；真模型在 Phase 2 用 Blender 产出接入）
        // 沿河街排成略弧的一排，颜色按角色区分；小满(r8)最矮。
        for (int i = 0; i < GameLogic.All.Length; i++)
        {
            float childScale = GameLogic.All[i].Id == "r8" ? 0.62f : 1f;
            var node = new Node3D
            {
                Position = new Vector3((i - 3.5f) * 1.7f, 0, 2.6f + (i % 2) * 0.4f),
                Scale = new Vector3(childScale, childScale, childScale),
            };
            var body = new MeshInstance3D
            {
                Mesh = new CapsuleMesh { Radius = 0.32f, Height = 1.6f },
                Position = new Vector3(0, 0.8f, 0),
            };
            body.MaterialOverride = new StandardMaterial3D
            {
                AlbedoColor = Color.FromHtml(new[] { "#2E4A3F", "#9A6B4F", "#D8B46A", "#6E4B3A", "#5C6B73", "#6E5A3E", "#4A5A6B", "#7A8B6E" }[i]!),
                Roughness = 0.9f,
            };
            node.AddChild(body);
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
            node.AddChild(hat);
            AddChild(node);
        }

        _TryAddRain();
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

        var root = new Control { Name = "Root" };
        root.SetAnchorsAndOffsetsPreset(Control.LayoutPreset.FullRect);
        root.Theme = new Theme { DefaultFont = _ChineseFont(), DefaultFontSize = 18 };
        _ui.AddChild(root);

        _BuildLoginPanel(root);
        _BuildGamePanel(root);
    }

    // 登录/注册面板
    private void _BuildLoginPanel(Control root)
    {
        _loginPanel = new VBoxContainer { Name = "LoginPanel" };
        _loginPanel.SetAnchorsPreset(Control.LayoutPreset.Center, true);
        _loginPanel.Size = new Vector2(440, 300);
        _loginPanel.Position = new Vector2(-220, -150);
        _loginPanel.AddChild(new Label { Text = "轮回渡口·登临" });
        _loginUser = new LineEdit { PlaceholderText = "用户名" };
        _loginPass = new LineEdit { PlaceholderText = "密码（≥6 位）", Secret = true };
        var row = new HBoxContainer();
        var regBtn = new Button { Text = "注册并进入" };
        var loginBtn = new Button { Text = "登录" };
        row.AddChild(regBtn);
        row.AddChild(loginBtn);
        _loginStatus = new Label { Name = "LoginStatus" };
        _loginStatus.CustomMinimumSize = new Vector2(0, 28);
        _loginPanel.AddChild(_loginUser);
        _loginPanel.AddChild(_loginPass);
        _loginPanel.AddChild(row);
        _loginPanel.AddChild(_loginStatus);

        regBtn.Pressed += () => _AuthenticateAsync(register: true);
        loginBtn.Pressed += () => _AuthenticateAsync(register: false);
        root.AddChild(_loginPanel);
    }

    // 游戏面板
    private void _BuildGamePanel(Control root)
    {
        var outer = new VBoxContainer
        {
            Name = "GamePanel",
            OffsetLeft = 40,
            OffsetTop = 24,
            OffsetRight = -40,
            OffsetBottom = -24,
        };
        _header = new Label { Name = "Header" };
        outer.AddChild(_header);

        _narrator = new Label
        {
            Name = "Narrator",
            SizeFlagsVertical = Control.SizeFlags.ExpandFill,
            AutowrapMode = TextServer.AutowrapMode.WordSmart,
        };
        outer.AddChild(_narrator);

        // 向谁问：8 位居民选择器
        var selRow = new HBoxContainer { Name = "SelRow" };
        selRow.AddChild(new Label { Text = "向谁问：" });
        _residentSel = new OptionButton { SizeFlagsHorizontal = Control.SizeFlags.ExpandFill };
        for (int i = 0; i < GameLogic.All.Length; i++)
            _residentSel.AddItem($"{GameLogic.All[i].Name}");
        _residentSel.ItemSelected += idx => _residentId = GameLogic.All[(int)idx].Id;
        selRow.AddChild(_residentSel);
        outer.AddChild(selRow);

        var inputRow = new HBoxContainer { Name = "InputRow" };
        _input = new LineEdit
        {
            Name = "AskInput",
            PlaceholderText = "问一句，看看能不能套出真相（如「你捞过我吗？」）",
            SizeFlagsHorizontal = Control.SizeFlags.ExpandFill,
        };
        _askBtn = new Button { Name = "AskBtn", Text = "开口问" };
        inputRow.AddChild(_input);
        inputRow.AddChild(_askBtn);
        outer.AddChild(inputRow);

        _choiceBox = new HBoxContainer { Name = "ChoiceBox", Visible = false };
        var leave = new Button { Text = "上船｜我想离开这个镇子" };
        var stay = new Button { Text = "留下｜我得先弄清我是谁" };
        _choiceBox.AddChild(leave);
        _choiceBox.AddChild(stay);
        outer.AddChild(_choiceBox);

        _askBtn.Pressed += HandleAsk;
        _input.TextSubmitted += _ => HandleAsk();
        leave.Pressed += () => HandleChoice("leave");
        stay.Pressed += () => HandleChoice("stay");
        root.AddChild(outer);
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
            var auth = await _server!.RegisterAsync(user, pass);
            SaveSession(auth, loopId: 0);
            StartGameAfterAuth();
        }
        catch (ServerException e)
        {
            if (!register && e.Code == "INVALID_CREDENTIALS")
            {
                // 尝试注册兜底：全新桌面用户直接注册进入
                try
                {
                    var auth = await _server!.RegisterAsync(user, pass);
                    SaveSession(auth, 0);
                    StartGameAfterAuth();
                }
                catch (System.Exception e2)
                {
                    _loginStatus!.Text = $"登录失败且自动注册失败（{e2.Message}）——将进入本地判定";
                    EnterOfflineGame();
                }
            }
            else
            {
                _loginStatus!.Text = $"{e.Code}　将进入本地判定";
                EnterOfflineGame();
            }
        }
        catch (System.Exception)
        {
            _loginStatus!.Text = "后端不可达——进入本地判定";
            EnterOfflineGame();
        }
    }

    private void SaveSession(AuthResult auth, int loopId)
    {
        var baseUrl = _session?.BaseUrl ?? DefaultBaseUrl;
        _session = new Session(baseUrl, auth.Token, auth.PlayerId, auth.Username, loopId, SessionStore.CurrentVersion);
        SessionStore.Save(_session);
    }

    private async void StartGameAfterAuth() => await BeginLoopAsync();

    // 用 server 开新轮回（在线）；失败则本地兜底开局
    private async Task BeginLoopAsync(bool offline = false)
    {
        _loginPanel!.Visible = false;
        if (_session is { Token.Length: > 0 } && !offline)
        {
            try
            {
                var loop = await _server!.StartLoopAsync(_session.Token);
                _session = _session with { LoopId = loop.LoopId };
                SessionStore.Save(_session);
                _loopSeq = loop.Sequence;
                _left = loop.QuestionsLeft;
                Narrate(loop.Intro);
                RefreshHeader();
                EnableAsk();
                return;
            }
            catch (System.Exception e)
            {
                GD.PushWarning($"[main] 后端开局失败，转本地兜底: {e.Message}");
            }
        }
        EnterOfflineGame();
    }

    private void EnterOfflineGame()
    {
        _loginPanel!.Visible = false;
        _left = _logic.QuestionsLeft;
        Narrate(
            $"[本地判定 · 后端未连接]\n雨夜。你从水里醒来。8 个人站在岸边。\n蓑衣人站在渡口最近水的地方，看着你。\n\n（就近离线可玩；登录后即可接云端真实世界。）");
        RefreshHeader();
        EnableAsk();
    }

    private void EnableAsk()
    {
        _input!.Editable = true;
        _askBtn!.Disabled = false;
        _input.GrabFocus();
    }

    // ---------- 游戏 ----------
    private void Narrate(string text) => _narrator!.Text = text;
    private void RefreshHeader() =>
        _header!.Text = $"轮回 第{_loopSeq}世　·　今晚还能问 {_left} 句";

    private void ShowChoice() => _choiceBox!.Visible = true;
    private void HideChoice() => _choiceBox!.Visible = false;

    private async void HandleAsk()
    {
        if (_transitioning) return;
        var q = _input!.Text.Trim();
        if (string.IsNullOrEmpty(q)) return;

        _transitioning = true;
        _askBtn!.Disabled = true;
        _input.Editable = false;
        _input.Text = "";

        // 在线：真实回合；离线：本地真相表（均可选 8 位居民任意审问）
        if (_session is { Token.Length: > 0 })
        {
            try
            {
                var res = await _server!.AskAsync(_session.Token, _session.LoopId, _residentId, q);
                _left = res.QuestionsLeft;
                RefreshHeader();
                await PlayAnswerAsync(res.Answer, res.Pause);
                return;
            }
            catch (System.Exception e)
            {
                GD.PushWarning($"[main] 审问失败转本地兜底: {e.Message}");
            }
        }
        var local = _logic.Ask(_residentId, q);
        _left = _logic.QuestionsLeft;
        RefreshHeader();
        await PlayAnswerAsync(local.Text, local.Pause);
    }

    private async Task PlayAnswerAsync(string text, bool pause)
    {
        if (pause)
        {
            Narrate("（蓑衣人沉默了三秒。只能听见雨。）");
            await WaitSeconds(3.0);
        }
        Narrate($"{text}\n\n他在等你回答一个问题。水涨了。");
        ShowChoice();
        _transitioning = false;
        _askBtn!.Disabled = true;
    }

    private async void HandleChoice(string choice)
    {
        if (_transitioning) return;
        _transitioning = true;
        HideChoice();

        string death;
        if (_session is { Token.Length: > 0 })
        {
            try
            {
                death = (await _server!.ChoiceAsync(_session.Token, _session.LoopId, choice)).Consequence;
            }
            catch
            {
                death = choice == "leave" ? "（离线）……你又上船了。第七次了。" : "（离线）你留下来，也留不住。";
            }
        }
        else
        {
            death = choice == "leave" ? "……你又上船了。第七次了。船在河心沉没。" : "你留下来，也留不住。你本来就属于水里。";
        }
        Narrate(death);
        RefreshHeader();
        await WaitSeconds(2.0);

        // 重生：在线再开新轮回拿 service 侧 sequence；离线本地 Rebirth
        _left = 0;
        if (_session is { Token.Length: > 0 })
        {
            try
            {
                await BeginLoopAsync();
                return;
            }
            catch (System.Exception)
            {
                // 落到本地重生
            }
        }
        _logic.Rebirth();
        _loopSeq = _logic.Loop;
        _left = _logic.QuestionsLeft;
        RefreshHeader();
        Narrate(
            $"\n——轮回重启·第 {_loopSeq} 世——\n你再次从水里醒来。岸边 8 个人。\n蓑衣人不见了。\n你还记得：{_logic.RetainedMemory}\n\n（再问蓑衣人的位置，只有空水声。雨还在下。）");
        _transitioning = false;
        EnableAsk();
    }

    private async Task WaitSeconds(double seconds)
    {
        var timer = GetTree().CreateTimer(seconds);
        await ToSignal(timer, SceneTreeTimer.SignalName.Timeout);
    }
}