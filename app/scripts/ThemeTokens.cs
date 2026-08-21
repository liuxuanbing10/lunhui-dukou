// ThemeTokens：Phase 2 主题 token（对齐 web/src/visual/theme.ts 语义 → docs/art-style-standard-2.5d.md）
// ------------------------------------------------------------------
// 「雨夜冷蓝基底 + 汤碗单一暖光 + 墨色文本 + 记忆琥珀 + 沉默收束暗调」。
// 占位色，上线前由美术定稿（承自 web theme.ts 同一批占位值）。
namespace LunhuiDukou;

using Godot;

public static class ThemeTokens
{
    // 雨夜冷蓝基底
    public static readonly Color RainBase = Color.FromHtml("#0b1a2b");
    public static readonly Color RainMist = Color.FromHtml("#16324a");
    public static readonly Color RainDrop = Color.FromHtml("#9fc4e8");
    public static readonly Color RainFog = Color.FromHtml("#0a1422");

    // 汤碗单一暖光（叙事核心光源）
    public static readonly Color WarmSoul = Color.FromHtml("#ffb15c");
    public static readonly Color WarmGlow = Color.FromHtml("#ffd9a0");
    public static readonly Color WarmEmber = Color.FromHtml("#ff8a3d");

    // 墨色文本
    public static readonly Color InkPrimary = Color.FromHtml("#e8eef5");
    public static readonly Color InkDim = Color.FromHtml("#8aa0b4");
    public static readonly Color InkFaint = Color.FromHtml("#4a5b6e");

    // 记忆碎片光（琥珀/锈红/叠影残光）
    public static readonly Color MemoryAmber = Color.FromHtml("#d8a24a");
    public static readonly Color MemoryRust = Color.FromHtml("#a8532f");
    public static readonly Color MemoryGhost = Color.FromHtml("#c9b08a");

    // 界面
    public static readonly Color UiPanel = new(10f / 255f, 20f / 255f, 34f / 255f, 0.72f);
    public static readonly Color UiBorder = new(159f / 255f, 196f / 255f, 232f / 255f, 0.18f);
    public static readonly Color UiDanger = Color.FromHtml("#c0473b");
    public static readonly Color UiGood = Color.FromHtml("#5fcf80");
    public static readonly Color UiAccent = Color.FromHtml("#58a6ff");

    // 沉默三秒：暖光收束后的暗调
    public static readonly Color SilenceWarmDim = Color.FromHtml("#7a4a1f");

    /// 生成 `--c-{group}-{key}` 风格的俄墨 id（与新时代一致，仅命名对齐）。
    public static string Token(Color c) => c.ToHtml();
}