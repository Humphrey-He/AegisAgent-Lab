using Agent.Application;
using Xunit;

namespace Agent.Tests;

public sealed class WorkspaceFileStoreTests : IDisposable
{
    private readonly string root = Path.Combine(Path.GetTempPath(), $"aegis-workspace-{Guid.NewGuid():N}");

    [Fact]
    public void ListReturnsFilesFromRequestedDirectory()
    {
        Directory.CreateDirectory(Path.Combine(root, "docs"));
        File.WriteAllText(Path.Combine(root, "docs", "guide.md"), "# Guide");

        var store = new WorkspaceFileStore(root);

        var response = store.List("docs");

        var file = Assert.Single(response.Files);
        Assert.Equal("docs/guide.md", file.Path);
        Assert.Equal("guide.md", file.Name);
    }

    [Fact]
    public void ListFiltersByExtension()
    {
        Directory.CreateDirectory(root);
        File.WriteAllText(Path.Combine(root, "notes.md"), "# Notes");
        File.WriteAllText(Path.Combine(root, "data.json"), "{}");

        var store = new WorkspaceFileStore(root);

        var response = store.List(extension: ".json");

        var file = Assert.Single(response.Files);
        Assert.Equal("data.json", file.Path);
    }

    [Fact]
    public void ReadReturnsTextFileContent()
    {
        Directory.CreateDirectory(root);
        File.WriteAllText(Path.Combine(root, "readme.txt"), "hello workspace");

        var store = new WorkspaceFileStore(root);

        var response = store.Read("readme.txt");

        Assert.False(response.TooLarge);
        Assert.Equal("hello workspace", response.Content);
        Assert.Null(response.Message);
    }

    [Fact]
    public void ReadRejectsTraversalPath()
    {
        Directory.CreateDirectory(root);
        var store = new WorkspaceFileStore(root);

        var error = Assert.Throws<InvalidOperationException>(() => store.Read("../outside.txt"));

        Assert.Contains("traversal", error.Message);
    }

    [Fact]
    public void ReadDoesNotReturnContentForOversizedFile()
    {
        Directory.CreateDirectory(root);
        var path = Path.Combine(root, "large.txt");
        File.WriteAllText(path, new string('a', 32));
        var store = new WorkspaceFileStore(root, maxFileSizeBytes: 16);

        var response = store.Read("large.txt");

        Assert.True(response.TooLarge);
        Assert.Null(response.Content);
        Assert.Contains("read limit", response.Message);
    }

    public void Dispose()
    {
        if (Directory.Exists(root))
        {
            Directory.Delete(root, recursive: true);
        }
    }
}
