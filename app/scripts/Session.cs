// Session：会话状态持久化到 user://（桌面本地存档，含版本迁移）
// ------------------------------------------------------------------
// 字段：baseUrl / token / playerId / username / loopId / version。
// Phase 3② 新增 version：用于存档**结构迁移**。Load 时若旧存档无 version（Phase 3① 产物）
// 视为 version 0 → 迁移到当前版本（补默认值并回写），保证旧存档可无缝升级。
namespace LunhuiDukou;

using System.Text.Json;
using Godot;

public sealed record Session(
    string BaseUrl, string Token, int PlayerId, string Username, int LoopId, int Version);

public static class SessionStore
{
    private const string Path_ = "user://session.json";

    /// 当前存档格式版本。结构变化时 +1，并在 Migrate 中补迁移逻辑。
    public const int CurrentVersion = 1;

    public static Session? Load()
    {
        var data = FileAccess.FileExists(Path_) ? FileAccess.GetFileAsString(Path_) : null;
        if (string.IsNullOrEmpty(data)) return null;
        Session? session;
        try
        {
            // 旧存档（无 version 字段）会被 JSON 反序列化为 Version=0，走到 Migrate。
            session = JsonSerializer.Deserialize<Session>(data);
        }
        catch
        {
            return null; // 损坏的存档视为无会话（不崩溃）
        }
        if (session == null) return null;
        var migrated = Migrate(session);
        if (!ReferenceEquals(migrated, session)) Save(migrated);
        return migrated;
    }

    /// 版本迁移：低于当前版本 → 升级并补默认值；返回是否改写。
    private static Session Migrate(Session s)
    {
        if (s.Version >= CurrentVersion) return s;

        Session next = s with
        {
            // v0（Phase 3① 无 version）→ v1：baseUrl 为空时回退默认，不带入无效 token 语境。
            BaseUrl = string.IsNullOrEmpty(s.BaseUrl) ? "http://127.0.0.1:8787" : s.BaseUrl,
            Version = CurrentVersion,
        };
        return next;
    }

    public static void Save(Session session)
    {
        using var file = FileAccess.Open(Path_, FileAccess.ModeFlags.Write);
        file.StoreString(JsonSerializer.Serialize(session));
    }

    public static void Clear()
    {
        if (FileAccess.FileExists(Path_)) FileAccess.Open(Path_, FileAccess.ModeFlags.Write).StoreString("");
    }
}