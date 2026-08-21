// ResidentRig：真3D 演出层 —— 给居民模型加"活"的程序化动画（不依赖骨骼/动画资产）
// ------------------------------------------------------------------
// 思路：GLB 内的 Coat/Head/ArmL/ArmR 等是独立 MeshInstance3D 子节点，可在运行时
// 各自驱动 transform 以表达"活"。Web 版曾用 pivot-group 程序化骨骼（DEV_LOG
// 2026-08-11），本类在 Godot C# 侧复刻等价语义，避免重导出 8 个 GLB（R4）。
// 能力：整体呼吸起伏、手臂摆动、头部转向、整身朝向目标（slerp）、命中反应、
//       选中强调。全部 try-catch 兜底，节点缺名/缺失直接跳过，不崩。
using Godot;

namespace LunhuiDukou;

public partial class ResidentRig : Node3D
{
    private Node3D _model = null!;
    private MeshInstance3D? _head, _armL, _armR;

    // 各部位初始姿态（保存以免覆盖原配饰倾角）
    private Vector3 _baseArmL, _baseArmR, _baseHead;
    private Vector3 _basePos;
    private Vector3 _baseRot;

    private float _time;
    private float _seed;          // 每人节奏错开（身高差/站姿差异）
    private float _yaw;           // 当前朝向角
    private float _facingYaw;     // 目标朝向角
    private float _hit;           // 命中反应强度(0..1)，随时间衰减
    private float _selected;      // 选中强调强度(0..1)，随时间衰减

    /// 挂载真模型（或其胶囊兜底）；模型会成为本刚体的子节点。
    public void Setup(Node3D model)
    {
        _model = model;
        AddChild(model);
        _seed = ((float)GD.Randi()) / float.MaxValue * Mathf.Tau;

        _head = FindMesh("Head");
        _armL = FindMesh("ArmL");
        _armR = FindMesh("ArmR");

        if (_head != null) _baseHead = _head.Rotation;
        if (_armL != null) _baseArmL = _armL.Rotation;
        if (_armR != null) _baseArmR = _armR.Rotation;
        _basePos = model.Position;
        _baseRot = model.Rotation;
        _yaw = Rotation.Y;
        // 记录相机侧/是否分层模型（影响动画模式）
        _segmented = _armL != null || _armR != null || _head != null;
    }

    private bool _segmented;

    private MeshInstance3D? FindMesh(string name)
    {
        if (_model == null) return null;
        foreach (var child in _model.GetChildren())
            if (child is MeshInstance3D mi && mi.Name == name)
                return mi;
        return null;
    }

    /// 朝向某个全局位置（如相机/玩家）。只设目标，由 _Process 平滑逼近。
    public void FaceTarget(Vector3 globalPos)
    {
        if (!IsInsideTree()) return;
        var dir = GlobalPosition - globalPos; // 背面朝向让模型"面向"目标，效果自定
        var yaw = GlobalTransform.Basis.GetEuler().Y + Mathf.Atan2(dir.X, -dir.Z);
        _facingYaw = Mathf.Wrap(yaw, -Mathf.Pi, Mathf.Pi);
    }

    public void SetSelected(bool on) => _selected = on ? 1f : 0f;
    public void TriggerHit() => _hit = 1f;

    public override void _Process(double delta)
    {
        if (_model == null) return;
        var d = (float)delta;
        _time += d;
        float t = _time + _seed;

        // 衰减
        _hit = Mathf.Max(0, _hit - d * 2.0f);
        _selected = Mathf.Max(0, _selected - d * 3.0f);

        // 1) 呼吸/站姿：整体轻微起落（幅度随选中/命中增强）
        float breath = Mathf.Abs(Mathf.Sin(t * 2.2f)) * (0.02f + _selected * 0.02f + _hit * 0.04f);
        _model.Position = _basePos + new Vector3(0, breath, 0);

        if (_segmented)
        {
            // ===== 分层模型（带 Head/ArmL/ArmR）：驱动各部位 =====
            // 2) 手臂摆动（幅度随选中/命中放大；保留原 z 倾角）
            float amp = 0.10f + _selected * 0.22f + _hit * 0.50f;
            float freq = 2.0f + _selected * 1.6f + _hit * 3.0f;
            float swing = Mathf.Sin(t * freq) * amp;
            if (_armL != null) _armL.Rotation = new Vector3(swing, _baseArmL.Y, _baseArmL.Z);
            if (_armR != null) _armR.Rotation = new Vector3(-swing, _baseArmR.Y, _baseArmR.Z);

            // 3) 头部转向：轻微环视 + 选中时加大左右转动
            float headYaw = Mathf.Sin(t * 0.9f) * (0.12f + _selected * 0.45f);
            float headPitch = Mathf.Sin(t * 1.6f) * 0.04f;
            if (_head != null) _head.Rotation = new Vector3(headPitch, _baseHead.Y + headYaw, _baseHead.Z);
        }
        else
        {
            // ===== 单块 mesh（AI 生成模型）：整体摆动模拟"活"感 =====
            // 上身轻微前后俯仰（呼吸）＋左右摆动（站姿不稳感）
            float bobPitch = Mathf.Sin(t * 1.6f) * (0.02f + _selected * 0.03f);
            float swayRoll = Mathf.Sin(t * 0.7f) * 0.015f;
            _model.Rotation = new Vector3(bobPitch, _baseRot.Y, swayRoll);
        }

        // 4) 整身朝向 + 待机微摆
        _yaw = Mathf.LerpAngle(_yaw, _facingYaw, Mathf.Min(1f, d * 3f));
        float swayYaw = Mathf.Sin(t * 0.5f) * 0.04f;
        Rotation = new Vector3(0, _yaw + swayYaw, 0);

        // 5) 命中反馈：整体略微后仰受压
        Rotation = new Vector3(Rotation.X + _hit * 0.06f, Rotation.Y, Rotation.Z);
    }
}