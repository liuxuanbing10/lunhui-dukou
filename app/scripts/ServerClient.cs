// ServerClient：对 @lunhui/server 的 HTTP 客户端（Phase 3①：客户端↔云端接线）
// ------------------------------------------------------------------
// 使用 .NET HttpClient + System.Text.Json；async/await 由 Godot 的 SynchronizationContext
// 回到主线程，访问节点安全。非 2xx 统一抛 ServerException（携带后端错误码/文案）。
// 约定见 docs/API_CONTRACT.md（身份校验 Bearer token；字段 camelCase）。
namespace LunhuiDukou;

using System.Linq;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

/// 后端业务错误（携带稳定错误码与文案）。
public sealed class ServerException : System.Exception
{
    public string Code { get; }
    public ServerException(string code, string message) : base(message)
    {
        Code = code;
    }
}

public sealed record AuthResult(int PlayerId, string Username, string Token);
public sealed record LoopResult(
    int LoopId, int Sequence, string Intro, int QuestionsLeft, string[] ActiveResidents);
public sealed record AskResult(
    string Answer, string AnswerMode, string? HitFactId, bool Pause, int QuestionsLeft);
public sealed record ChoiceResult(string Consequence, string LoopStatus);

/// 单个 R 行数据（供后续读取 events 用，当前先用 Intro）。
public sealed class ServerClient
{
    private readonly HttpClient _http = new();
    private readonly string _base;
    private static readonly JsonSerializerOptions _json =
        new() { PropertyNameCaseInsensitive = true };

    public ServerClient(string baseUrl)
    {
        _base = baseUrl.TrimEnd('/');
        _http.Timeout = System.TimeSpan.FromSeconds(20);
    }

    // ---- 鉴权 ----
    public async Task<AuthResult> RegisterAsync(string username, string password)
    {
        var res = await PostAsync("/api/auth/register", new { username, password });
        var doc = JsonDocument.Parse(res).RootElement;
        return new AuthResult(doc.GetInt("playerId"), doc.GetString("username")!, doc.GetString("token")!);
    }

    public async Task<AuthResult> LoginAsync(string username, string password)
    {
        var res = await PostAsync("/api/auth/login", new { username, password });
        var doc = JsonDocument.Parse(res).RootElement;
        return new AuthResult(doc.GetInt("playerId"), doc.GetString("username")!, doc.GetString("token")!);
    }

    // ---- 游戏 ----
    public async Task<LoopResult> StartLoopAsync(string token)
    {
        var res = await PostAsync("/api/loop", new { }, token);
        var doc = JsonDocument.Parse(res).RootElement;
        var residents = doc.GetProperty("activeResidents")
            .EnumerateArray().Select(e => e.GetString()!).ToArray();
        return new LoopResult(
            doc.GetInt("loopId"),
            doc.GetInt("sequence"),
            doc.GetString("intro")!,
            doc.GetInt("questionsLeft"),
            residents);
    }

    public async Task<AskResult> AskAsync(string token, int loopId, string residentId, string question)
    {
        var res = await PostAsync("/api/ask", new { loop_id = loopId, resident_id = residentId, question }, token);
        var doc = JsonDocument.Parse(res).RootElement;
        return new AskResult(
            doc.GetString("answer")!,
            doc.GetString("answerMode")!,
            doc.TryGetProperty("hitFactId", out var hf) ? hf.GetString() : null,
            doc.TryGetProperty("pause", out var p) && p.GetBoolean(),
            doc.GetInt("questionsLeft"));
    }

    public async Task<ChoiceResult> ChoiceAsync(string token, int loopId, string choice)
    {
        var res = await PostAsync($"/api/loop/{loopId}/choice", new { choice }, token);
        var doc = JsonDocument.Parse(res).RootElement;
        return new ChoiceResult(doc.GetString("consequence")!, doc.GetString("loopStatus")!);
    }

    // ---- 底层 ----
    private async Task<string> PostAsync(string path, object body, string? token = null)
    {
        var req = new HttpRequestMessage(HttpMethod.Post, _base + path)
        {
            Content = new StringContent(JsonSerializer.Serialize(body), Encoding.UTF8, "application/json"),
        };
        if (token != null)
            req.Headers.Authorization = new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", token);

        using var resp = await _http.SendAsync(req);
        var text = await resp.Content.ReadAsStringAsync();
        if (!resp.IsSuccessStatusCode)
            throw BuildException(resp, text);
        return text;
    }

    private static ServerException BuildException(HttpResponseMessage resp, string body)
    {
        try
        {
            var doc = JsonDocument.Parse(body).RootElement;
            if (doc.TryGetProperty("error", out var err))
            {
                var code = err.TryGetProperty("code", out var c) ? c.GetString() ?? "UNKNOWN" : "UNKNOWN";
                var msg = err.TryGetProperty("message", out var m) ? m.GetString() ?? code : code;
                return new ServerException(code, msg);
            }
        }
        catch
        {
            // 非 JSON 响应 → 走 HTTP 状态兜底
        }
        return new ServerException($"HTTP_{(int)resp.StatusCode}", body);
    }
}

internal static class JsonElementExtensions
{
    public static int GetInt(this JsonElement e, string name) => e.GetProperty(name).GetInt32();
    public static string GetString(this JsonElement e, string name) => e.GetProperty(name).GetString() ?? "";
}