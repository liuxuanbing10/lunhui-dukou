// Session：会话状态持久化到 user://（桌面本地存档，Phase 3②前置）。
// ------------------------------------------------------------------
// 保存 baseUrl / token / playerId / username / 当前 loopId，重启后自动续用（"它记得你"）。
// 用 Godot FileAccess 读写 user://session.json；System.Text.Json 序列化。
namespace LunhuiDukou;

using System.Text.Json;
using Godot;

public sealed record Session(
    string BaseUrl, string Token, int PlayerId, string Username, int LoopId);

public static class SessionStore
{
    private const string Path_ = "user://session.json";

    public static Session? Load()
    {
        var data = FileAccess.FileExists(Path_) ? FileAccess.GetFileAsString(Path_) : null;
        if (string.IsNullOrEmpty(data)) return null;
        try
        {
            return JsonSerializer.Deserialize<Session>(data);
        }
        catch
        {
            return null;
        }
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