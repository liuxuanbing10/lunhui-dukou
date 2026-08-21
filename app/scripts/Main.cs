// Main：轮回渡口 · Phase 0 垂直切片（桌面 Godot 客户端入口）
// ------------------------------------------------------------------
// 闭环：渡口雨夜空镜 → 审问（真相表+沉默三秒）→ 选择(上船/留下) → 死亡 → 轮回重启。
// 技巧：全部装配在 C# 运行时完成（避免手写复杂 .tscn）；真相判定用 GameLogic（本地挂钩）。
// 中文字体：用 SystemFont 指向微软雅黑/黑体（Windows 内置），避免默认字体对汉字显示为方块。
namespace LunhuiDukou;

using Godot;

public partial class Main : Node3D
{
    private GameLogic _logic = new();

    // 世界节点
    private Node3D? _world;
    private Node3D? _resident;

    // UI
    private CanvasLayer? _ui;
    private Label? _header;
    private Label? _narrator;
    private LineEdit? _input;
    private Button? _askBtn;
    private HBoxContainer? _choiceBox;

    private bool _transitioning;

    public override void _Ready()
    {
        _BuildWorld();
        _BuildUi();
        _StartIntro();
    }

    // ---------- 3D 世界 ----------
    private void _BuildWorld()
    {
        // 渡口小镇 glb（web 资产同源，见 README 资产归属）
        try
        {
            var scene = GD.Load<PackedScene>("res://assets/scene/dukou.glb");
            _world = scene.Instantiate<Node3D>();
            AddChild(_world);
        }
        catch (System.Exception e)
        {
            GD.PushWarning($"[main] 场景加载失败（继续以空场运行）: {e.Message}");
        }

        // 夜景方向光（雨夜：蓝灰、压暗）
        var light = new DirectionalLight3D
        {
            LightColor = new Color(0.55f, 0.6f, 0.75f),
            LightEnergy = 0.6f,
            RotationDegrees = new Vector3(-45, 30, 0),
        };
        AddChild(light);

        // 相机（在入树后用 LookAtFromPosition，避免 "Node not inside tree"）
        var camera = new Camera3D { Fov = 60 };
        AddChild(camera);
        camera.LookAtFromPosition(new Vector3(0, 6, 14), new Vector3(0, 0, 0), Vector3.Up);

        // 蓑衣人 r1：Phase 0 占位立绘（深青胶囊 + 斗笠；真模型在 Phase 2 用 Blender 产出接入）
        _resident = new Node3D { Position = new Vector3(0, 0, 2.4f) };
        var mesh = new MeshInstance3D
        {
            Mesh = new CapsuleMesh { Radius = 0.32f, Height = 1.7f },
            Position = new Vector3(0, 0.85f, 0),
        };
        mesh.MaterialOverride = new StandardMaterial3D
        {
            AlbedoColor = new Color(0.16f, 0.26f, 0.22f), // 破蓑衣深青
            Roughness = 0.9f,
        };
        _resident.AddChild(mesh);

        // 头顶斗笠（薄圆柱）
        var hat = new MeshInstance3D
        {
            Mesh = new CylinderMesh { TopRadius = 0.42f, BottomRadius = 0.42f, Height = 0.12f },
            Position = new Vector3(0, 1.72f, 0),
        };
        hat.MaterialOverride = new StandardMaterial3D
        {
            AlbedoColor = new Color(0.13f, 0.2f, 0.17f),
            Roughness = 0.95f,
        };
        _resident.AddChild(hat);
        AddChild(_resident);

        _TryAddRain();
    }

    // 雨（GPUParticles3D）；失败只告警不打断闭环
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
    private SystemFont _ChineseFont()
    {
        // 字号由 Theme.DefaultFontSize 统一管控，这里只指定字体族。
        return new SystemFont { FontNames = new[] { "Microsoft YaHei", "微软雅黑", "SimHei" } };
    }

    private void _BuildUi()
    {
        _ui = new CanvasLayer { Layer = 10 };
        AddChild(_ui);

        var root = new Control { Name = "Root", AnchorsPreset = 15 }; // FULL_RECT
        root.SetAnchorsAndOffsetsPreset(Control.LayoutPreset.FullRect);
        var theme = new Theme { DefaultFont = _ChineseFont(), DefaultFontSize = 18 };
        root.Theme = theme;
        _ui.AddChild(root);

        var outer = new VBoxContainer
        {
            Name = "Outer",
            OffsetLeft = 40,
            OffsetTop = 24,
            OffsetRight = -40,
            OffsetBottom = -24,
        };
        root.AddChild(outer);

        _header = new Label { Name = "Header" };
        outer.AddChild(_header);

        _narrator = new Label
        {
            Name = "Narrator",
            SizeFlagsVertical = Control.SizeFlags.ExpandFill,
            AutowrapMode = TextServer.AutowrapMode.WordSmart,
        };
        outer.AddChild(_narrator);

        var inputRow = new HBoxContainer { Name = "InputRow" };
        _input = new LineEdit
        {
            Name = "AskInput",
            PlaceholderText = "问蓑衣人一句话（试试：你捞过我吗？）",
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

        // 事件
        _askBtn.Pressed += HandleAsk;
        _input.TextSubmitted += _ => HandleAsk();
        leave.Pressed += () => HandleChoice("leave");
        stay.Pressed += () => HandleChoice("stay");
    }

    // ---------- 状态 ------------------------------
    private void Narrate(string text) => _narrator.Text = text;
    private void RefreshHeader() =>
        _header.Text =
            $"轮回 第{_logic.Loop}世　·　今晚还能问 {_logic.QuestionsLeft} 句";

    private void _StartIntro()
    {
        RefreshHeader();
        Narrate(
            "雨夜。你从水里醒来。8 个人站在岸边，等你摆渡。\n你数了两次：9 个。再数，8 个。没人承认多出来的那个是谁。\n蓑衣人站在渡口最近水的地方，看着你。");
        _input.Editable = true;
        _askBtn.Disabled = false;
        _input.GrabFocus();
    }

    private void ShowChoice()
    {
        _choiceBox.Visible = true;
    }

    private void HideChoice()
    {
        _choiceBox.Visible = false;
    }

    private void HandleAsk()
    {
        if (_transitioning) return;
        var q = _input.Text.Trim();
        if (string.IsNullOrEmpty(q)) return;

        _transitioning = true;
        _askBtn.Disabled = true;
        _input.Editable = false;
        _input.Text = "";

        var res = _logic.Ask(q);
        RefreshHeader();
        RunAskResult(res);
    }

    private async void RunAskResult(AnswerResult res)
    {
        if (res.Pause)
        {
            Narrate("（蓑衣人沉默了三秒。只能听见雨。）");
            await WaitSeconds(3.0);
        }
        Narrate($"{res.Text}\n\n他在等你回答一个问题。水涨了。");
        ShowChoice();
        _transitioning = false;
        _askBtn.Disabled = true;
    }

    private async void HandleChoice(string choice)
    {
        if (_transitioning) return;
        _transitioning = true;
        HideChoice();

        var death = choice == "leave"
            ? "……你又上船了。第七次了。船在河心沉没。"
            : "你留下来，也留不住。你本来就属于水里。";
        Narrate(death);
        RefreshHeader();

        await WaitSeconds(2.0);

        _logic.Rebirth();
        RefreshHeader();
        Narrate(
            $"\n——轮回重启·第 {_logic.Loop} 世——\n你再次从水里醒来。岸边 8 个人。\n蓑衣人不见了。\n你还记得：{_logic.RetainedMemory}\n\n（再问蓑衣人的位置，只有空水声。雨还在下。）");
        _transitioning = false;
        _input.Editable = true;
        _input.GrabFocus();
    }

    private async System.Threading.Tasks.Task WaitSeconds(double seconds)
    {
        var timer = GetTree().CreateTimer(seconds);
        await ToSignal(timer, SceneTreeTimer.SignalName.Timeout);
    }
}