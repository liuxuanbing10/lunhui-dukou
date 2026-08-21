// GameLogic：轮回渡口 Phase 3② —— 8 位居民本地真相表 + 轮回状态（纯逻辑，不依赖 Godot）
// ------------------------------------------------------------------
// 在线时真相判定由云端 @lunhui/server（engine judgeAsk）为准；本类为断网/离线兜底。
// 判定数据（facts/keywords/statement）对齐 docs/RESIDENTS.md 各居民 SOUL SecretFacts；
// 回答台词为第一人称点睛句（参照 web 演出 guide hints / LLM 示例文风），非旁白。
namespace LunhuiDukou;

using System.Linq;

/// 一次审问的结果：文本 + 模式 + 是否"汤主沉默三秒"。
public readonly record struct AnswerResult(string Text, string Mode, bool Pause);

/// 单个真相表事实；命中关键词即触发 Answer；IsKey 命中 → 沉默三秒 + 写入记忆。
public sealed record FactDef(string Id, string Statement, bool IsKey, string[] Keywords, string Answer);

/// 一位居民的本地判定档案。
public sealed record ResidentProfile(string Id, string Name, FactDef[] Facts, string Fallback);

public sealed class GameLogic
{
    public const int MaxQuestions = 10;

    // ---- 8 位居民真相表（facts 对齐各 SOUL SecretFacts） ----
    public static readonly ResidentProfile[] All =
    {
        new("r1", "蓑衣人", new[]
        {
            Key("f1", "蓑衣人捞过你 7 次", "……我捞过你。", "捞过", "捞我", "七次", "7次", "几次", "多少次"),
            Key("f2", "蓑衣人是面馆老王死去的弟弟", "（他别过脸。雨更大了。）", "弟弟", "兄弟", "老王", "面馆"),
            Plain("f3", "蓑衣人每年涨水时来渡口", "每年涨水的时候，我都在渡口。", "涨水", "每年", "为什么来"),
        }, "（他看了一会儿河面，没接话。）"),
        new("r2", "阿岚", new[]
        {
            Key("f1", "阿岚每晚往渡口放白花，是给一个没等到的人", "（她拨了拨白花，声音轻了）给没等到的人。石阶空着，总得有人放点什么。", "白花", "放花", "给谁", "等谁", "渡口"),
            Key("f2", "她等的人是 7 年前船难中消失的未婚夫", "（她别过脸）七年前……有个人走了。我每晚放花，等他从水里回来。", "未婚夫", "船难", "失踪", "7年前", "七年前"),
            Plain("f3", "她认出你上辈子的脸，但不敢说", "（她看了你很久，移开目光）我好像，见过你这张脸。在很久以前。", "见过我", "上辈子", "认得我", "认识我"),
        }, "（她笑着，话里却藏了根针）你知道么，渡口的水，最会骗人。"),
        new("r3", "老王", new[]
        {
            Key("f1", "老王每晚多煮的那碗面是给死去的弟弟", "（他擦着碗，没抬头）天冷了，多煮一碗，放着。", "多煮", "那碗面", "角落", "给谁", "面"),
            Key("f2", "他弟弟 20 年前死在渡口，尸体没找到", "（他手上的动作停了）我弟弟，二十年前在渡口落了水。我只捞到一只鞋。", "弟弟", "20年前", "二十年", "落水", "死"),
            Plain("f3", "他觉得蓑衣人眼熟，却想不起在哪见过", "（他眯眼看渡口那人）总觉得眼熟，像在哪儿见过。", "眼熟", "见过", "蓑衣", "哪里见过"),
        }, "（老王憨厚地笑）吃了吗？夜里凉，添件衣裳。"),
        new("r4", "阿黎", new[]
        {
            Key("f1", "阿黎扎的纸人，夜里会自己走到渡口", "（他小声）扎完的纸人，我不点眼睛。点了，它就活，就看人了。", "纸人", "活", "夜里", "自己走", "渡口"),
            Key("f2", "纸人替渡口的死者还愿，包括你", "（他缩了缩脖子）纸人……是替还没了心愿的人，去渡口上船的。", "还愿", "替", "死者", "上船"),
            Plain("f3", "他师傅 3 年前失踪，留话别给摆渡人扎纸人", "（他声音更低）师傅走前叮嘱：别给摆渡人扎纸人。我不懂。", "师傅", "失踪", "摆渡人", "别给"),
        }, "（阿黎吞吞吐吐）师傅说……夜里听见纸人动，就当没听见。"),
        new("r5", "何叔", new[]
        {
            Key("f1", "小镇的时间已经重复了 30 次", "（他继续调钟，头也不抬）小镇的时间，已经重复了三十次。", "重复", "几次", "30", "三十", "时间"),
            Key("f2", "钟停在 3:17——那是你第一次落水的时间", "（他停了手）钟停在三点十七——那是……你第一次落水的时候。", "3:17", "三点十七", "钟停", "落水"),
            Plain("f3", "何叔记得每一次重复，却装作不知道", "（他沉默很久）我记得每一次重复，但都装作不知道。说破了，会更糟。", "记得", "知道", "装不知道", "装"),
        }, "（何叔只和钟表说话）差一分。又停了。"),
        new("r6", "老鲞", new[]
        {
            Key("f1", "老鲞 7 年前船难时在岸上，没去救人", "（他压低了嗓门）七年前那场船难……我在岸上。我该出船的。我没敢。", "船难", "没救", "在岸上", "没出船", "7年前"),
            Key("f2", "他船舱里藏的鞋，是他女儿失踪时穿的", "（他脸色一变）船舱里有只小孩的鞋。我女儿失踪那天穿的。谁都不给看。", "女儿的鞋", "鞋子", "小孩的鞋", "船舱"),
            Plain("f3", "他每晚出船，是在捞女儿的尸体", "（他摆弄渔网）我每晚出船，是想捞回点什么。自己也知道，捞不回来了。", "捞", "女儿", "出船", "找"),
        }, "（老鲞嗓门大）那都不是事儿！涨水才有鱼！……也有别的。"),
        new("r7", "郑爷", new[]
        {
            Key("f1", "郑爷每晚 3:17 到渡口，是在等人", "（他提灯照了照你）巡逻路线。每晚三点十七到渡口，停三分钟。", "3:17", "三点十七", "渡口", "等人"),
            Key("f2", "他要等的人，是 30 年前死于渡口的妻子", "（他攥紧灯）三十年。我等的是我妻子，她在渡口落的水。", "妻子", "30年", "三十年", "落水"),
            Plain("f3", "他见过你从水里站起来，却假装没看见", "（他移开视线）巡夜人不能信鬼神。我什么都没看见。", "见过", "从水里", "假装", "没看见"),
        }, "（郑爷命令式）熄灯，关门，别问。"),
        new("r8", "小满", new[]
        {
            Key("f1", "小满认识你，知道每世的名字", "（他抱着布包，很平静）我知道你每一世叫什么名字。你不记得了。", "认识我", "我的名字", "每世", "怎么知道"),
            Key("f2", "小满是郑爷妻子的孩子，30 年前死于渡口", "（他低下头）我在等一个人……他大概，不记得我了。", "郑爷", "父亲", "妈妈", "孩子", "30年前"),
            Plain("f3", "他是渡口记性最好的乘客，从第一世就在", "（他抬头看你）我是渡口记性最好的那个。从第一世起，我就在。", "第一世", "记得", "摆渡人", "记性"),
        }, "（小满静静看着你，像认识你很久）你不记得了。"),
    };

    /// 构造关键事实（IsKey=true，命中 → 沉默三秒 + 写记忆）。
    private static FactDef Key(string id, string statement, string answer, params string[] keywords) =>
        new(id, statement, true, keywords, answer);

    /// 构造普通事实（IsKey=false，命中直接回答，不沉默）。
    private static FactDef Plain(string id, string statement, string answer, params string[] keywords) =>
        new(id, statement, false, keywords, answer);

    // 当前轮回 / 额度 / 记忆
    public int Loop { get; private set; } = 1;
    public int QuestionsLeft { get; private set; } = MaxQuestions;
    public string RetainedMemory { get; private set; } = "";

    public void Rebirth()
    {
        Loop++;
        QuestionsLeft = MaxQuestions;
    }

    /// 向某位居民提问 → 判定回答。额度用尽返回 deny。
    public AnswerResult Ask(string residentId, string question)
    {
        if (QuestionsLeft <= 0)
            return new AnswerResult("（你今晚已经问得够多了。雨还在下。）", "deny", false);
        QuestionsLeft--;

        var profile = All.FirstOrDefault(p => p.Id == residentId) ?? All[0]!;
        foreach (var f in profile.Facts)
        {
            if (ContainsAny(question, f.Keywords))
            {
                if (f.IsKey)
                    RetainedMemory = $"「{profile.Name}提到：{f.Statement}」";
                return new AnswerResult(f.Answer, "direct", f.IsKey);
            }
        }
        return new AnswerResult(profile.Fallback, "fallback", false);
    }

    private static bool ContainsAny(string q, string[] keywords)
    {
        foreach (var kw in keywords)
            if (!string.IsNullOrEmpty(kw) && q.Contains(kw))
                return true;
        return false;
    }
}