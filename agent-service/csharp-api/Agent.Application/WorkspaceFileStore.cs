namespace Agent.Application;

public sealed record WorkspaceConfigResponse(
    string Root,
    long MaxFileSizeBytes,
    IReadOnlyCollection<string> AllowedExtensions);

public sealed record WorkspaceFileListResponse(
    string Root,
    string RequestedRoot,
    int MaxDepth,
    IReadOnlyCollection<WorkspaceFileSummary> Files);

public sealed record WorkspaceFileSummary(
    string Path,
    string Name,
    string Extension,
    long SizeBytes,
    DateTimeOffset UpdatedAt);

public sealed record WorkspaceFileContentResponse(
    string Path,
    string Name,
    string Extension,
    long SizeBytes,
    bool TooLarge,
    string? Content,
    string? Message);

public sealed class WorkspaceFileStore
{
    public const long DefaultMaxFileSizeBytes = 262_144;

    private static readonly string[] DefaultAllowedExtensions =
    {
        ".cs",
        ".csproj",
        ".css",
        ".csv",
        ".html",
        ".js",
        ".json",
        ".jsx",
        ".log",
        ".md",
        ".sln",
        ".slnx",
        ".ts",
        ".tsx",
        ".txt",
        ".xml",
        ".yaml",
        ".yml",
    };

    private static readonly string[] SensitiveFileNames =
    {
        ".env",
        ".env.local",
        ".env.development",
        ".env.production",
        "id_rsa",
        "id_dsa",
        "id_ecdsa",
        "id_ed25519",
    };

    private static readonly string[] SensitiveNameFragments =
    {
        "secret",
        "secrets",
        "credential",
        "credentials",
        "apikey",
        "api-key",
        "privatekey",
        "private-key",
    };

    private readonly string root;
    private readonly long maxFileSizeBytes;
    private readonly HashSet<string> allowedExtensions;

    public WorkspaceFileStore(
        string? root = null,
        long maxFileSizeBytes = DefaultMaxFileSizeBytes,
        IReadOnlyCollection<string>? allowedExtensions = null)
    {
        this.root = Path.GetFullPath(root ?? ResolveRepositoryRoot());
        this.maxFileSizeBytes = maxFileSizeBytes;
        this.allowedExtensions = (allowedExtensions is null || allowedExtensions.Count == 0
                ? DefaultAllowedExtensions
                : allowedExtensions)
            .Select(NormalizeExtension)
            .ToHashSet(StringComparer.OrdinalIgnoreCase);
    }

    public WorkspaceConfigResponse GetConfig()
    {
        return new WorkspaceConfigResponse(root, maxFileSizeBytes, allowedExtensions.Order().ToArray());
    }

    public WorkspaceFileListResponse List(string? requestedRoot = null, string? extension = null, int? maxDepth = null)
    {
        var relativeRoot = NormalizeRelativePath(requestedRoot, allowEmpty: true);
        var directory = ResolvePath(relativeRoot);
        if (!Directory.Exists(directory))
        {
            throw new DirectoryNotFoundException($"Workspace directory was not found: {relativeRoot}");
        }

        var depth = Math.Clamp(maxDepth ?? 4, 0, 10);
        var requestedExtension = string.IsNullOrWhiteSpace(extension)
            ? null
            : NormalizeExtension(extension);
        if (requestedExtension is not null && !allowedExtensions.Contains(requestedExtension))
        {
            throw new InvalidOperationException($"Extension is not allowed: {requestedExtension}");
        }

        var files = EnumerateFiles(directory, depth)
            .Where(IsReadableFile)
            .Where(path => requestedExtension is null ||
                string.Equals(Path.GetExtension(path), requestedExtension, StringComparison.OrdinalIgnoreCase))
            .OrderBy(ToRelativePath, StringComparer.OrdinalIgnoreCase)
            .Select(ToSummary)
            .ToArray();

        return new WorkspaceFileListResponse(root, relativeRoot, depth, files);
    }

    public WorkspaceFileContentResponse Read(string requestedPath)
    {
        var relativePath = NormalizeRelativePath(requestedPath, allowEmpty: false);
        var path = ResolvePath(relativePath);
        if (!File.Exists(path))
        {
            throw new FileNotFoundException($"Workspace file was not found: {relativePath}");
        }

        if (!IsReadableFile(path))
        {
            throw new InvalidOperationException($"File is not allowed: {relativePath}");
        }

        var info = new FileInfo(path);
        if (info.Length > maxFileSizeBytes)
        {
            return new WorkspaceFileContentResponse(
                ToRelativePath(path),
                info.Name,
                info.Extension,
                info.Length,
                true,
                null,
                $"File exceeds the {maxFileSizeBytes} byte read limit.");
        }

        return new WorkspaceFileContentResponse(
            ToRelativePath(path),
            info.Name,
            info.Extension,
            info.Length,
            false,
            File.ReadAllText(path),
            null);
    }

    private IEnumerable<string> EnumerateFiles(string directory, int maxDepth)
    {
        foreach (var file in Directory.EnumerateFiles(directory, "*", SearchOption.TopDirectoryOnly))
        {
            yield return file;
        }

        if (maxDepth == 0)
        {
            yield break;
        }

        foreach (var child in Directory.EnumerateDirectories(directory, "*", SearchOption.TopDirectoryOnly))
        {
            if (IsIgnoredDirectory(child))
            {
                continue;
            }

            foreach (var file in EnumerateFiles(child, maxDepth - 1))
            {
                yield return file;
            }
        }
    }

    private WorkspaceFileSummary ToSummary(string path)
    {
        var info = new FileInfo(path);
        return new WorkspaceFileSummary(
            ToRelativePath(path),
            info.Name,
            info.Extension,
            info.Length,
            info.LastWriteTimeUtc);
    }

    private bool IsReadableFile(string path)
    {
        var fileName = Path.GetFileName(path);
        if (SensitiveFileNames.Contains(fileName, StringComparer.OrdinalIgnoreCase))
        {
            return false;
        }

        var nameWithoutExtension = Path.GetFileNameWithoutExtension(path).Replace("_", "-", StringComparison.Ordinal);
        if (SensitiveNameFragments.Any(fragment =>
            nameWithoutExtension.Contains(fragment, StringComparison.OrdinalIgnoreCase)))
        {
            return false;
        }

        return allowedExtensions.Contains(Path.GetExtension(path));
    }

    private static bool IsIgnoredDirectory(string path)
    {
        var name = Path.GetFileName(path);
        return name.Equals(".git", StringComparison.OrdinalIgnoreCase) ||
            name.Equals("bin", StringComparison.OrdinalIgnoreCase) ||
            name.Equals("obj", StringComparison.OrdinalIgnoreCase) ||
            name.Equals("node_modules", StringComparison.OrdinalIgnoreCase);
    }

    private string ResolvePath(string relativePath)
    {
        var resolved = Path.GetFullPath(Path.Combine(root, relativePath));
        if (!IsInsideRoot(resolved))
        {
            throw new InvalidOperationException("Path is outside the workspace root.");
        }

        return resolved;
    }

    private bool IsInsideRoot(string path)
    {
        var normalizedRoot = EnsureTrailingSeparator(root);
        var normalizedPath = EnsureTrailingSeparator(path);
        return string.Equals(path, root, StringComparison.OrdinalIgnoreCase) ||
            normalizedPath.StartsWith(normalizedRoot, StringComparison.OrdinalIgnoreCase);
    }

    private string ToRelativePath(string path)
    {
        return Path.GetRelativePath(root, path).Replace(Path.DirectorySeparatorChar, '/');
    }

    private static string NormalizeRelativePath(string? path, bool allowEmpty)
    {
        if (string.IsNullOrWhiteSpace(path))
        {
            if (allowEmpty)
            {
                return string.Empty;
            }

            throw new ArgumentException("Path is required.", nameof(path));
        }

        if (Path.IsPathRooted(path))
        {
            throw new InvalidOperationException("Path must be relative to the workspace root.");
        }

        var normalized = path.Replace('\\', '/').Trim('/');
        var segments = normalized.Split('/', StringSplitOptions.RemoveEmptyEntries);
        if (segments.Any(segment => segment == ".."))
        {
            throw new InvalidOperationException("Path traversal is not allowed.");
        }

        if (segments.Any(segment => segment == "." || string.IsNullOrWhiteSpace(segment)))
        {
            throw new InvalidOperationException("Path contains an invalid segment.");
        }

        return string.Join(Path.DirectorySeparatorChar, segments);
    }

    private static string NormalizeExtension(string extension)
    {
        var value = extension.Trim();
        if (string.IsNullOrWhiteSpace(value))
        {
            throw new ArgumentException("Extension is required.", nameof(extension));
        }

        return value.StartsWith('.') ? value : "." + value;
    }

    private static string EnsureTrailingSeparator(string path)
    {
        return path.EndsWith(Path.DirectorySeparatorChar) ? path : path + Path.DirectorySeparatorChar;
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
