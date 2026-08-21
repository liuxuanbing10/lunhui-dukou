// Session 会话模型：数据结构 + 存档结构迁移（纯逻辑，不依赖 Godot，可离线单测）
// ------------------------------------------------------------------
// 会话字段：baseUrl / token / playerId / username / loopId / version。
// 迁移规则集中在 SessionMigration：结构变化时 CurrentVersion+1 并补升级逻辑，
// 保证旧存档（Phase 3① 无 version，视为 v0）可无缝升级到当前版本。
namespace LunhuiDukou;

public sealed record Session(
    string BaseUrl, string Token, int PlayerId, string Username, int LoopId, int Version);

/// 存档版本迁移（纯函数）。低于当前版本 → 升级并补默认值；已是当前/更高版本 → 原样返回。
public static class SessionMigration
{
    /// 当前存档格式版本。结构变化时 +1，并在 Migrate 中补迁移逻辑。
    public const int CurrentVersion = 1;

    public static Session Migrate(Session s)
    {
        if (s.Version >= CurrentVersion) return s;

        return s with
        {
            // v0（Phase 3① 无 version）→ v1：baseUrl 为空时回退默认
            BaseUrl = string.IsNullOrEmpty(s.BaseUrl) ? "http://127.0.0.1:8787" : s.BaseUrl,
            Version = CurrentVersion,
        };
    }
}