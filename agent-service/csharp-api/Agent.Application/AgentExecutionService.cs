using Agent.Domain;

namespace Agent.Application;

public sealed record ExecuteTaskRequest(
    string? ReadFilePath = null,
    string? ScanRoot = null,
    string? ScanExtension = null,
    string? LogFilePath = null,
    bool IncludeGitDiff = false);

public sealed record ExecuteTaskResult(
    AgentTask Task,
    IReadOnlyCollection<AgentTraceEvent> Trace,
    IReadOnlyCollection<ToolCommandResult> ToolResults);

public sealed class AgentExecutionService
{
    private readonly TaskService tasks;
    private readonly IToolCommandRunner runner;
    private readonly string goRuntimeDirectory;
    private readonly string rustToolsDirectory;

    public AgentExecutionService(
        TaskService tasks,
        IToolCommandRunner runner,
        string? goRuntimeDirectory = null,
        string? rustToolsDirectory = null)
    {
        this.tasks = tasks;
        this.runner = runner;
        this.goRuntimeDirectory = goRuntimeDirectory ?? ResolvePath("go-runtime");
        this.rustToolsDirectory = rustToolsDirectory ?? ResolvePath("rust-tools");
    }

    public async Task<ExecuteTaskResult?> ExecuteAsync(
        Guid taskId,
        ExecuteTaskRequest request,
        CancellationToken cancellationToken = default)
    {
        var task = tasks.Get(taskId);
        if (task is null)
        {
            return null;
        }

        tasks.AppendTrace(taskId, "execution.started", "agent-executor", "started", "Task execution started.");

        if (TaskRiskPolicy.RequiresApproval(task.RiskLevel) && task.ApprovalStatus != ApprovalStatus.Approved)
        {
            tasks.AppendTrace(
                taskId,
                "execution.blocked",
                "agent-executor",
                "blocked",
                "Task requires approval before execution.",
                new Dictionary<string, string>
                {
                    ["risk_level"] = task.RiskLevel.ToString(),
                    ["approval_status"] = task.ApprovalStatus.ToString(),
                });
            return new ExecuteTaskResult(task, tasks.GetTrace(taskId) ?? Array.Empty<AgentTraceEvent>(), Array.Empty<ToolCommandResult>());
        }

        tasks.MoveTo(taskId, AgentTaskStatus.Planning);
        tasks.AppendTrace(taskId, "task.planning", "agent-executor", "completed", "Task moved to planning.");
        tasks.MoveTo(taskId, AgentTaskStatus.Running);
        tasks.AppendTrace(taskId, "task.running", "agent-executor", "completed", "Task moved to running.");

        var results = new List<ToolCommandResult>();
        try
        {
            if (!string.IsNullOrWhiteSpace(request.ReadFilePath))
            {
                results.Add(await RunToolAsync(
                    taskId,
                    "go-read-file",
                    "go",
                    $"run ./cmd/aicli --json read_file {Quote(request.ReadFilePath)}",
                    goRuntimeDirectory,
                    cancellationToken));
            }

            if (request.IncludeGitDiff)
            {
                results.Add(await RunToolAsync(
                    taskId,
                    "go-git-diff",
                    "go",
                    "run ./cmd/aicli --json git_diff --stat",
                    goRuntimeDirectory,
                    cancellationToken));
            }

            if (!string.IsNullOrWhiteSpace(request.ScanRoot))
            {
                var extension = string.IsNullOrWhiteSpace(request.ScanExtension) ? "rs" : request.ScanExtension;
                results.Add(await RunToolAsync(
                    taskId,
                    "rust-code-indexer",
                    "cargo",
                    $"run -p code-indexer -- scan --root {Quote(request.ScanRoot)} --ext {Quote(extension)}",
                    rustToolsDirectory,
                    cancellationToken));
            }

            if (!string.IsNullOrWhiteSpace(request.LogFilePath))
            {
                results.Add(await RunToolAsync(
                    taskId,
                    "rust-log-parser",
                    "cargo",
                    $"run -p log-parser -- summarize --file {Quote(request.LogFilePath)}",
                    rustToolsDirectory,
                    cancellationToken));
            }

            var completed = tasks.MoveTo(taskId, AgentTaskStatus.Completed) ?? tasks.Get(taskId)!;
            tasks.AppendTrace(taskId, "execution.completed", "agent-executor", "completed", "Task execution completed.");
            return new ExecuteTaskResult(completed, tasks.GetTrace(taskId) ?? Array.Empty<AgentTraceEvent>(), results);
        }
        catch (Exception ex)
        {
            var failed = tasks.Fail(taskId) ?? tasks.Get(taskId)!;
            tasks.AppendTrace(
                taskId,
                "execution.failed",
                "agent-executor",
                "failed",
                ex.Message);
            return new ExecuteTaskResult(failed, tasks.GetTrace(taskId) ?? Array.Empty<AgentTraceEvent>(), results);
        }
    }

    private async Task<ToolCommandResult> RunToolAsync(
        Guid taskId,
        string toolName,
        string fileName,
        string arguments,
        string workingDirectory,
        CancellationToken cancellationToken)
    {
        tasks.AppendTrace(
            taskId,
            "tool.started",
            toolName,
            "started",
            $"Running {toolName}.",
            new Dictionary<string, string> { ["command"] = $"{fileName} {arguments}" });

        var result = await runner.RunAsync(fileName, arguments, workingDirectory, cancellationToken);
        tasks.AppendTrace(
            taskId,
            result.ExitCode == 0 ? "tool.completed" : "tool.failed",
            toolName,
            result.ExitCode == 0 ? "completed" : "failed",
            result.ExitCode == 0 ? $"{toolName} completed." : $"{toolName} failed.",
            new Dictionary<string, string>
            {
                ["exit_code"] = result.ExitCode.ToString(),
                ["stdout"] = TrimForTrace(result.StandardOutput),
                ["stderr"] = TrimForTrace(result.StandardError),
            });
        return result;
    }

    private static string ResolvePath(string child)
    {
        var current = new DirectoryInfo(AppContext.BaseDirectory);
        while (current is not null)
        {
            var candidate = Path.Combine(current.FullName, "..", "..", child);
            var fullCandidate = Path.GetFullPath(candidate);
            if (Directory.Exists(fullCandidate))
            {
                return fullCandidate;
            }

            current = current.Parent;
        }

        return Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "..", "..", child));
    }

    private static string Quote(string value)
    {
        return $"\"{value.Replace("\"", "\\\"")}\"";
    }

    private static string TrimForTrace(string value)
    {
        const int maxLength = 800;
        return value.Length <= maxLength ? value : value[..maxLength];
    }
}
