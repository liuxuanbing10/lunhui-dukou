// SessionMigration 纯逻辑单测（不依赖 Godot）：验证存档版本迁移规则。
using Xunit;

namespace LunhuiDukou.Tests;

public class SessionMigrationTests
{
    [Fact]
    public void 已是最新版本_返回原对象不重写()
    {
        var s = new Session("http://x", "t", 1, "u", 0, SessionMigration.CurrentVersion);
        var migrated = SessionMigration.Migrate(s);
        Assert.True(ReferenceEquals(s, migrated)); // 无需改写
    }

    [Fact]
    public void 未来版本_保持不变()
    {
        var s = new Session("http://x", "t", 1, "u", 0, SessionMigration.CurrentVersion + 5);
        var migrated = SessionMigration.Migrate(s);
        Assert.Equal(SessionMigration.CurrentVersion + 5, migrated.Version);
    }

    [Fact]
    public void 旧版本且baseUrl为空_补默认地址并升到当前版本()
    {
        var s = new Session("", "t", 2, "u", 0, 0);
        var migrated = SessionMigration.Migrate(s);
        Assert.Equal(SessionMigration.CurrentVersion, migrated.Version);
        Assert.Equal("http://127.0.0.1:8787", migrated.BaseUrl);
    }

    [Fact]
    public void 旧版本且已有baseUrl_保留地址只升版本()
    {
        var s = new Session("http://example.com:9000", "t", 2, "u", 0, 0);
        var migrated = SessionMigration.Migrate(s);
        Assert.Equal(SessionMigration.CurrentVersion, migrated.Version);
        Assert.Equal("http://example.com:9000", migrated.BaseUrl);
        Assert.Equal("t", migrated.Token); // 其余字段原样保留
    }
}