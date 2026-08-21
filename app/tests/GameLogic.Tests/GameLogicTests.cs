// GameLogic 单元测试（纯逻辑，不依赖 Godot，可离线跑）
// --------------------------------------------------
// 覆盖：初始额度、普通/关键/未命中判定、未知居民回退、额度用尽、重生重置。
using Xunit;

namespace LunhuiDukou.Tests;

public class GameLogicTests
{
    [Fact]
    public void 初始额度为10()
    {
        var logic = new GameLogic();
        Assert.Equal(10, logic.QuestionsLeft);
        Assert.Equal(1, logic.Loop);
    }

    [Fact]
    public void 命中普通事实_直接回答且不暂停()
    {
        var logic = new GameLogic();
        // r1 f3 关键词“涨水”→ plain
        var res = logic.Ask("r1", "你为什么每年涨水的时候都来？");
        Assert.Equal("direct", res.Mode);
        Assert.False(res.Pause);
        Assert.Equal(9, logic.QuestionsLeft);
        Assert.Equal("", logic.RetainedMemory);
    }

    [Fact]
    public void 命中关键事实_暂停并写入记忆()
    {
        var logic = new GameLogic();
        // r1 f1 关键词“几次”→ key
        var res = logic.Ask("r1", "你捞过我几次？");
        Assert.Equal("direct", res.Mode);
        Assert.True(res.Pause);
        Assert.NotEqual("", logic.RetainedMemory);
        Assert.Contains("蓑衣人", logic.RetainedMemory);
    }

    [Fact]
    public void 未命中_使用兜底回答()
    {
        var logic = new GameLogic();
        var res = logic.Ask("r1", "今天的晚饭吃什么？");
        Assert.Equal("fallback", res.Mode);
        Assert.False(res.Pause);
        Assert.NotEqual("", res.Text);
    }

    [Fact]
    public void 未知居民_回退到蓑衣人()
    {
        var logic = new GameLogic();
        // 未知 id → All[0]=r1；用 r1 f3 关键词“涨水”验证确实落到 r1
        var res = logic.Ask("unknown_zzz", "涨水的时候你会来吗？");
        Assert.Equal("direct", res.Mode); // 落到 r1 的关键逻辑（f3 为普通事实）
        Assert.NotEqual("", res.Text);
    }

    [Fact]
    public void 额度用尽_返回deny并不再扣减()
    {
        var logic = new GameLogic();
        for (int i = 0; i < 10; i++) logic.Ask("r1", "问题" + i);
        Assert.Equal(0, logic.QuestionsLeft);
        var res = logic.Ask("r1", "还有额度吗");
        Assert.Equal("deny", res.Mode);
        Assert.Equal(0, logic.QuestionsLeft); // 不越减
    }

    [Fact]
    public void 重生_轮回加一且额度重置()
    {
        var logic = new GameLogic();
        logic.Ask("r1", "问题");
        logic.Rebirth();
        Assert.Equal(2, logic.Loop);
        Assert.Equal(10, logic.QuestionsLeft);
    }
}