// AmbientAudio：Phase 2 程序化音频（对齐 web/src/audio/audio.ts 语义 → docs/audio-design.md）
// ------------------------------------------------------------------
// 全部用「生成 PCM → AudioStreamWav」实现，无外部音频文件：
//   雨声床 = 2s 白噪(低通感靠低音量)循环；暖光 pad = 65Hz 正弦+98Hz 泛音循环；
//   命中真相 = 钟鸣(523Hz 基频+谐波+指数衰减)；否决 = 140→70Hz 下滑；往生 = 低频拟钟沉入水；
//   远处笛音 = 五声音阶单音+颤音+慢起慢落（随机间隔，悬疑感）。
// 「沉默三秒」由 SetSilence(true) 把雨声/暖光压暗（对齐 SILENCE 留白）。
// headless（无音频设备）下 AudioStreamPlayer 不输出也不抛错，保证 CI 冒烟可跑。
namespace LunhuiDukou;

using System;
using System.Collections.Generic;
using Godot;

public partial class AmbientAudio : Node
{
    private const int Rate = 22050;

    private const float RainBase = 0.16f;
    private const double RainSilenceDb = -34f; // 沉默段雨声近乎静默
    private const double RainNormalDb = -16f;

    private const float WarmBase = 0.045f;
    private const double WarmSilenceDb = -38f;
    private const double WarmNormalDb = -26f;

    private AudioStreamPlayer? _rain;
    private AudioStreamPlayer? _warm;
    private bool _started;

    public override void _EnterTree() => Build();

    private void Build()
    {
        try
        {
            _rain = MakeLoop("rain", MakeNoise(2.0, GraysCloud), -1);
            _warm = MakeLoop("warm", MakePad(2.0), -1);
        }
        catch (Exception e)
        {
            GD.PushWarning($"[audio] 启动失败（跳过）：{e.Message}");
        }
    }

    // 用户正式进入游戏后启动环境音床
    public void Start()
    {
        if (_started) return;
        _started = true;
        _rain?.Play();
        _warm?.Play();
    }

    public void SetSilence(bool active)
    {
        SetTarget(_rain, active ? RainSilenceDb : RainNormalDb);
        SetTarget(_warm, active ? WarmSilenceDb : WarmNormalDb);
    }

    public void SetMuted(bool m)
    {
        if (!_started) return;
        var targetRain = m ? -80f : RainNormalDb;
        var targetWarm = m ? -80f : WarmNormalDb;
        if (m) { _rain?.Stop(); _warm?.Stop(); }
        else { _rain?.Play(); _warm?.Play(); SetTarget(_rain, targetRain); SetTarget(_warm, targetWarm); }
    }

    private static void SetTarget(AudioStreamPlayer? p, double targetDb) =>
        p?.CreateTween().TweenProperty(p, "volume_db", targetDb, 0.45f);

    // ---- 音效（一次性） ----
    public void PlayReveal() => PlayOnce(MakeBell(1.6f));
    public void PlayReject() => PlayOnce(MakeReject(0.5f));
    public void PlayDeath() => PlayOnce(MakeDeath(2.0f));
    public void PlayFlute() => PlayOnce(MakeFlute(3.2f));

    private void PlayOnce(AudioStreamWav wav)
    {
        if (!_started && _rain == null) return;
        try
        {
            var player = new AudioStreamPlayer { Stream = wav, VolumeDb = -14f };
            AddChild(player);
            player.Play();
            player.Finished += () => player.QueueFree();
        }
        catch (Exception e)
        {
            GD.PushWarning($"[audio] 音效失败：{e.Message}");
        }
    }

    // ---- 生成 PCM ----
    private static float GraysCloud() => (float)(Random.Shared.NextDouble() * 2.0 - 1.0);

    private AudioStreamPlayer? MakeLoop(string name, AudioStreamWav wav, int _)
    {
        wav.LoopMode = AudioStreamWav.LoopModeEnum.Forward;
        wav.LoopBegin = 0;
        wav.LoopEnd = SampleCount(wav);
        var player = new AudioStreamPlayer { Name = name, Stream = wav };
        AddChild(player);
        return player;
    }

    private static int SampleCount(AudioStreamWav wav) =>
        wav.Data != null ? wav.Data.Length / 2 : 0;

    private static AudioStreamWav Wav(float[] samples)
    {
        var bytes = new byte[samples.Length * 2];
        for (int i = 0; i < samples.Length; i++)
        {
            short s = (short)Mathf.Clamp(samples[i] * 32767f, short.MinValue, short.MaxValue);
            bytes[i * 2] = (byte)(s & 0xFF);
            bytes[i * 2 + 1] = (byte)((s >> 8) & 0xFF);
        }
        return new AudioStreamWav
        {
            Data = bytes,
            Format = AudioStreamWav.FormatEnum.Format16Bits,
            MixRate = Rate,
            Stereo = false,
        };
    }

    private static AudioStreamWav MakeNoise(double seconds, Func<float> sample) =>
        Wav(Times(seconds, _ => sample() * 0.5f));

    // 暖光 pad：65Hz 正弦 + 98Hz 三角泛音（在场感）
    private static AudioStreamWav MakePad(double seconds) => Wav(Times(seconds, t =>
    {
        var a = Mathf.Sin(2f * Mathf.Pi * 65f * t);
        var b = Mathf.Sin(2f * Mathf.Pi * 98f * t) * 0.6f;
        return (a + b) * WarmBase;
    }));

    // 命中关键：钟鸣（基频 + 2.01x + 2.99x 谐波，指数衰减）
    private static AudioStreamWav MakeBell(double dur) => Wav(Times(dur, t =>
    {
        var f = 523.25f;
        var env = Mathf.Pow(10f, -3.4f * t); // 快速衰减
        var s = Mathf.Sin(2f * Mathf.Pi * f * t)
              + 0.22f * Mathf.Sin(2f * Mathf.Pi * f * 2.01f * t)
              + 0.12f * Mathf.Sin(2f * Mathf.Pi * f * 2.99f * t);
        return s * env * 0.20f;
    }));

    // 被否决：140→70Hz 下滑低音
    private static AudioStreamWav MakeReject(double dur) => Wav(Times(dur, t =>
    {
        var f = Mathf.Lerp(140f, 70f, t / (float)dur);
        var env = 1f - t / (float)dur; // 线性衰减
        return Mathf.Sin(2f * Mathf.Pi * f * t) * env * 0.28f;
    }));

    // 死亡：低频沉水拟钟（55Hz 渐弱，更像沉入水里的一声闷响）
    private static AudioStreamWav MakeDeath(double dur) => Wav(Times(dur, t =>
    {
        var env = Mathf.Pow(10f, -1.4f * t);
        return (Mathf.Sin(2f * Mathf.Pi * 55f * t) * 0.6f + Mathf.Sin(2f * Mathf.Pi * 110f * t) * 0.2f) * env * 0.26f;
    }));

    // 远处笛音：五声音阶单音 + 轻颤音 + 慢起慢落 + 低通趋近远处感（用简化谐波削高频）
    private static AudioStreamWav MakeFlute(double dur) => Wav(Times(dur, t =>
    {
        float[] notes = { 440f, 392f, 349.23f, 329.63f, 293.66f };
        var f = notes[Random.Shared.Next(notes.Length)];
        var vib = 1f + 0.02f * Mathf.Sin(2f * Mathf.Pi * 5.2f * t); // 颤音
        var d = (float)dur; // 包络分段用 float，避免 t(float) 与 dur(double) 混算成 double
        // 慢起 → 持 → 慢落
        var env = t < d * 0.3f ? t / (d * 0.3f)
            : t > d * 0.6f ? Mathf.Max(0f, 1f - (t - d * 0.6f) / (d * 0.4f))
            : 1f;
        // 只保留基频 + 弱二次谐波 → 无刺耳高频（远感）
        var s = Mathf.Sin(2f * Mathf.Pi * f * vib * t) + 0.25f * Mathf.Sin(2f * Mathf.Pi * 2f * f * vib * t);
        return s * env * 0.05f;
    }));

    private static float[] Times(double seconds, Func<float, float> fn)
    {
        var n = (int)(Rate * seconds);
        var s = new float[n];
        for (int i = 0; i < n; i++) s[i] = fn(i / (float)Rate);
        return s;
    }
}