// DevChecks：开发期诊断（冒烟 / 存档迁移自检）
// ------------------------------------------------------------------
// 从 Main.cs 移出：把「云端 E2E 冒烟」与「本地存档迁移自检」从生产节点类中剥离，
// 由 Main 触发后根据返回值决定退出码。方法只依赖 Godot 静态 API（GD/FileAccess/SessionStore），
// 不耦合任何节点实例，便于独立维护。正式发布构建不会走到这里。
namespace LunhuiDukou;

using System.Threading.Tasks;
using Godot;

public static class DevChecks
{
    /// 云端/E2E 冒烟：注册 → 开局 → 对 r1/r8 两次审问 → 断言判定结果。返回是否通过。
    public static async Task<bool> RunSmokeAsync(string baseUrl)
    {
        try
        {
            GD.Print($"[smoke] base={baseUrl}");
            var server = new ServerClient(baseUrl);
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
                return true;
            }
            GD.PrintErr("SMOKE_FAIL: 判定不符");
            return false;
        }
        catch (System.Exception e)
        {
            GD.PrintErr($"[smoke] ERROR: {e.Message}");
            return false;
        }
    }

    /// 本地存档版本迁移自检：写入一支旧版存档并验证 Load 自动升级。返回是否通过。
    public static bool RunSessionCheck()
    {
        SessionStore.Clear();
        using (var f = FileAccess.Open("user://session.json", FileAccess.ModeFlags.Write))
            f.StoreString("{\"BaseUrl\":\"\",\"Token\":\"legacy\",\"PlayerId\":7,\"Username\":\"u\",\"LoopId\":5}");
        var loaded = SessionStore.Load();
        bool ok = loaded != null
            && loaded.Version == SessionMigration.CurrentVersion
            && loaded.Token == "legacy"
            && loaded.BaseUrl == "http://127.0.0.1:8787";
        GD.Print(ok ? "SESSION_MIGRATE_PASS" : "SESSION_MIGRATE_FAIL");
        return ok;
    }
}