// Session：会话状态持久化到 user://（桌面本地存档，含版本迁移）
// ------------------------------------------------------------------
// 仅负责 Godot I/O（读/写 user://session.json）。数据结构与迁移逻辑见 SessionModel.cs
// （纯逻辑，可脱离 Godot 单测）。
namespace LunhuiDukou;

using System.Text.Json;
using Godot;

public static class SessionStore
{
    private const string Path_ = "user://session.json";

    public static Session? Load()
    {
        var data = FileAccess.FileExists(Path_) ? FileAccess.GetFileAsString(Path_) : null;
        if (string.IsNullOrEmpty(data)) return null;
        Session? session;
        try
        {
            // 旧存档（无 version 字段）会被 JSON 反序列化为 Version=0，走到迁移。
            session = JsonSerializer.Deserialize<Session>(data);
        }
        catch
        {
            return null; // 损坏的存档视为无会话（不崩溃）
        }
        if (session == null) return null;
        var migrated = SessionMigration.Migrate(session);
        if (!ReferenceEquals(migrated, session)) Save(migrated);
        return migrated;
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