using Agent.Application;
using Xunit;

namespace Agent.Tests;

public sealed class SkillFileStoreTests : IDisposable
{
    private readonly string root = Path.Combine(Path.GetTempPath(), $"aegis-skills-{Guid.NewGuid():N}");

    [Fact]
    public void SaveWritesSkillToRequestedDirectory()
    {
        var store = new SkillFileStore(Path.Combine(root, "default"), new[] { root });
        var directory = Path.Combine(root, "custom");

        var skill = store.Save(new SaveSkillFileRequest("Code Review Skill", "local", "# SKILL.md", directory));

        Assert.Equal(directory, skill.Directory);
        Assert.True(File.Exists(skill.FilePath));
        Assert.EndsWith("Code-Review-Skill.md", skill.FilePath);
        Assert.Contains("# SKILL.md", File.ReadAllText(skill.FilePath));
    }

    [Fact]
    public void ListReturnsSavedSkills()
    {
        var store = new SkillFileStore(Path.Combine(root, "default"), new[] { root });
        var saved = store.Save(new SaveSkillFileRequest("Log Skill", "url", "content", null));

        var skills = store.List().ToArray();

        var skill = Assert.Single(skills);
        Assert.Equal(saved.FilePath, skill.FilePath);
        Assert.Contains("content", skill.Content);
    }

    [Fact]
    public void SaveRejectsDirectoryOutsideAllowedRoots()
    {
        var store = new SkillFileStore(Path.Combine(root, "default"), new[] { root });
        var outside = Path.Combine(Path.GetTempPath(), $"outside-{Guid.NewGuid():N}");

        var error = Assert.Throws<InvalidOperationException>(() =>
            store.Save(new SaveSkillFileRequest("Bad Skill", "local", "content", outside)));

        Assert.Contains("outside allowed roots", error.Message);
    }

    [Fact]
    public void GetDirectoryOptionsReturnsRootsAndChildren()
    {
        var defaultDirectory = Path.Combine(root, "default");
        var childDirectory = Path.Combine(defaultDirectory, "team-skills");
        Directory.CreateDirectory(childDirectory);
        var store = new SkillFileStore(defaultDirectory, new[] { root });

        var options = store.GetDirectoryOptions(defaultDirectory);

        Assert.Equal(defaultDirectory, options.CurrentDirectory);
        Assert.Contains(options.Roots, option => option.Path == root && option.IsRoot);
        Assert.Contains(options.Children, option => option.Path == childDirectory && !option.IsRoot);
    }

    public void Dispose()
    {
        if (Directory.Exists(root))
        {
            Directory.Delete(root, recursive: true);
        }
    }
}
