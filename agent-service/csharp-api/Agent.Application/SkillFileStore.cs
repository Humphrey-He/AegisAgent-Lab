namespace Agent.Application;

public sealed record SkillFileRecord(
    string Id,
    string Name,
    string Source,
    string Content,
    string Directory,
    string FilePath,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt);

public sealed record SaveSkillFileRequest(
    string Name,
    string Source,
    string Content,
    string? Directory);

public sealed record SkillDirectoryResponse(string Directory);

public sealed record SkillDirectoryOption(
    string Path,
    string Name,
    bool IsRoot);

public sealed record SkillDirectoryOptionsResponse(
    string DefaultDirectory,
    string CurrentDirectory,
    IReadOnlyCollection<SkillDirectoryOption> Roots,
    IReadOnlyCollection<SkillDirectoryOption> Children);

public sealed class SkillFileStore
{
    private readonly string defaultDirectory;
    private readonly IReadOnlyCollection<string> allowedRoots;

    public SkillFileStore(string? defaultDirectory = null, IReadOnlyCollection<string>? allowedRoots = null)
    {
        this.defaultDirectory = Path.GetFullPath(defaultDirectory ?? Path.Combine(AppContext.BaseDirectory, "data", "skills"));
        this.allowedRoots = allowedRoots is null || allowedRoots.Count == 0
            ? new[] { ResolveRepositoryRoot(), Environment.GetFolderPath(Environment.SpecialFolder.UserProfile) }
            : allowedRoots.Select(Path.GetFullPath).ToArray();
    }

    public string DefaultDirectory => defaultDirectory;

    public SkillDirectoryOptionsResponse GetDirectoryOptions(string? directory = null)
    {
        var currentDirectory = ResolveDirectory(directory);
        Directory.CreateDirectory(currentDirectory);

        var roots = allowedRoots
            .Select(root => new SkillDirectoryOption(root, DisplayName(root), true))
            .ToArray();
        var children = Directory
            .EnumerateDirectories(currentDirectory, "*", SearchOption.TopDirectoryOnly)
            .OrderBy(Path.GetFileName)
            .Select(child => new SkillDirectoryOption(child, DisplayName(child), false))
            .ToArray();

        return new SkillDirectoryOptionsResponse(defaultDirectory, currentDirectory, roots, children);
    }

    public SkillFileRecord Save(SaveSkillFileRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
        {
            throw new ArgumentException("Skill name is required.", nameof(request));
        }

        if (string.IsNullOrWhiteSpace(request.Content))
        {
            throw new ArgumentException("Skill content is required.", nameof(request));
        }

        var directory = ResolveDirectory(request.Directory);
        Directory.CreateDirectory(directory);

        var now = DateTimeOffset.UtcNow;
        var id = CreateStableId(request.Name, request.Source, request.Content);
        var filePath = Path.Combine(directory, $"{SanitizeFileName(request.Name)}.md");
        var metadata = $"""
        ---
        id: {id}
        name: {request.Name}
        source: {request.Source}
        saved_at: {now:O}
        ---

        """;
        File.WriteAllText(filePath, metadata + request.Content);

        return new SkillFileRecord(
            id,
            request.Name,
            request.Source,
            request.Content,
            directory,
            filePath,
            now,
            now);
    }

    public IReadOnlyCollection<SkillFileRecord> List(string? directory = null)
    {
        var targetDirectory = ResolveDirectory(directory);
        if (!Directory.Exists(targetDirectory))
        {
            return Array.Empty<SkillFileRecord>();
        }

        return Directory
            .EnumerateFiles(targetDirectory, "*.md", SearchOption.TopDirectoryOnly)
            .OrderByDescending(File.GetLastWriteTimeUtc)
            .Select(ReadSkillFile)
            .ToArray();
    }

    private SkillFileRecord ReadSkillFile(string path)
    {
        var content = File.ReadAllText(path);
        var name = Path.GetFileNameWithoutExtension(path);
        var updatedAt = File.GetLastWriteTimeUtc(path);
        return new SkillFileRecord(
            Path.GetFileNameWithoutExtension(path),
            name,
            "local-file",
            content,
            Path.GetDirectoryName(path) ?? defaultDirectory,
            path,
            updatedAt,
            updatedAt);
    }

    private string ResolveDirectory(string? requestedDirectory)
    {
        var directory = string.IsNullOrWhiteSpace(requestedDirectory)
            ? defaultDirectory
            : Path.GetFullPath(Environment.ExpandEnvironmentVariables(requestedDirectory));

        if (!IsAllowedDirectory(directory))
        {
            throw new InvalidOperationException($"Skill directory is outside allowed roots: {directory}");
        }

        return directory;
    }

    private bool IsAllowedDirectory(string directory)
    {
        return allowedRoots.Any(root =>
        {
            var normalizedRoot = EnsureTrailingSeparator(Path.GetFullPath(root));
            var normalizedDirectory = EnsureTrailingSeparator(Path.GetFullPath(directory));
            return normalizedDirectory.StartsWith(normalizedRoot, StringComparison.OrdinalIgnoreCase);
        });
    }

    private static string EnsureTrailingSeparator(string path)
    {
        return path.EndsWith(Path.DirectorySeparatorChar) ? path : path + Path.DirectorySeparatorChar;
    }

    private static string SanitizeFileName(string value)
    {
        var invalid = Path.GetInvalidFileNameChars().ToHashSet();
        var cleaned = new string(value.Trim().Select(character => invalid.Contains(character) ? '-' : character).ToArray());
        cleaned = cleaned.Replace(' ', '-');
        return string.IsNullOrWhiteSpace(cleaned) ? "skill" : cleaned;
    }

    private static string CreateStableId(string name, string source, string content)
    {
        var hash = HashCode.Combine(name, source, content).ToString("x");
        return $"{SanitizeFileName(name)}-{hash}";
    }

    private static string DisplayName(string path)
    {
        var name = Path.GetFileName(path.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar));
        return string.IsNullOrWhiteSpace(name) ? path : name;
    }

    private static string ResolveRepositoryRoot()
    {
        var current = new DirectoryInfo(AppContext.BaseDirectory);
        while (current is not null)
        {
            if (Directory.Exists(Path.Combine(current.FullName, ".git")))
            {
                return current.FullName;
            }

            current = current.Parent;
        }

        return AppContext.BaseDirectory;
    }
}
