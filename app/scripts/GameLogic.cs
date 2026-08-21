// GameLogic：轮回渡口 Phase 0 本地预计算挂钩（纯逻辑，不依赖 Godot）
// ------------------------------------------------------------------
// 迁移方案 Phase 0 说明：垂直切片"先不接 server"，真相判定用本地预计算真相表跑通闭环。
// 本类即该挂钩的真相表 + 轮回状态机，后续可原样替换为对 @lunhui/server 的 HTTP 调用
// （技能判定数据与 docs/RESIDENTS.md 一致，答案文案对齐 docs/PHASE1_STORY.md 与 web 演出）。
namespace LunhuiDukou;

/// 一次审问的结果：文本 + 模式 + 是否"汤主沉默三秒"。
public readonly record struct AnswerResult(string Text, string Mode, bool Pause);

/// 蓑衣人 r1 的本地真相表（Phase 0 内置；面向桌面端多玩家文本暂不在此——账号/隔离在云端）。
public sealed class GameLogic
{
    public const int MaxQuestions = 10;

    /// 当前轮回次数（从 1 起）。
    public int Loop { get; private set; } = 1;
    /// 本轮回剩余提问额度（server 层强制的 10 问，本地切片一致性）。
    public int QuestionsLeft { get; private set; } = MaxQuestions;
    /// 跨轮回保留的一句记忆（"它记得我"）。
    public string RetainedMemory { get; private set; } = "";

    // 真相表事实（id, isKey, keywords）——源自 docs/RESIDENTS.md r1.
    private sealed record Fact(string Id, bool IsKey, string[] Keywords);

    private static readonly Fact[] Facts =
    {
        // f1 是 Phase 1 第一夜情绪高点：命中 → 沉默三秒 + "我捞过你。"
        new("f1", true, new[] { "捞过", "捞我", "七次", "7次", "几次", "多少次" }),
        new("f2", true, new[] { "弟弟", "兄弟", "老王", "面馆" }),
        new("f3", false, new[] { "涨水", "每年", "为什么来" }),
    };

    /// 开始/重开一个轮回（死亡后调用）。
    public void Rebirth()
    {
        Loop++;
        QuestionsLeft = MaxQuestions;
    }

    /// 提问 → 判定回答。questionsLeft 归零后调用返回额度用尽提示。
    public AnswerResult Ask(string question)
    {
        if (QuestionsLeft <= 0)
            return new AnswerResult("（你今晚已经问得够多了。蓑衣人在雨里沉默。）", "deny", false);
        QuestionsLeft--;

        // 真相表优先（纯规则，不烧 LLM）——命中 f1 是"沉默三秒"信号并留记忆。
        foreach (var f in Facts)
        {
            if (ContainsAny(question, f.Keywords))
                return HandleHit(f);
        }

        // 未命中 → 保守兜底台词（Phase 0 不接 LLM）。
        return new AnswerResult("（他看了一会儿河面，没接话。）", "fallback", false);
    }

    private AnswerResult HandleHit(Fact f)
    {
        switch (f.Id)
        {
            case "f1":
                RetainedMemory = "「蓑衣人提到：蓑衣人捞过你 7 次」";
                return new AnswerResult("……我捞过你。", "direct", true);
            case "f2":
                return new AnswerResult("（他别过脸。雨更大了。）", "silence", false);
            default: // f3
                return new AnswerResult("每年涨水的时候，我都在渡口。", "direct", false);
        }
    }

    private static bool ContainsAny(string q, string[] keywords)
    {
        foreach (var kw in keywords)
            if (q.ToLowerInvariant().Contains(kw))
                return true;
        return false;
    }
}