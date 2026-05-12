using Agent.Application;
using Agent.Domain;
using Xunit;

namespace Agent.Tests;

public sealed class AgentExecutionServiceTests
{
    [Fact]
    public async Task ExecuteRunsToolsAndWritesTrace()
    {
        var tasks = new TaskService();
        var runner = new FakeToolCommandRunner();
        var executor = new AgentExecutionService(tasks, runner, "go-runtime", "rust-tools");
        var task = tasks.Create("inspect logs", "agent-operator");

        var result = await executor.ExecuteAsync(
            task.Id,
            new ExecuteTaskRequest(
                ReadFilePath: "go.mod",
                ScanRoot: "crates",
                ScanExtension: "rs",
                LogFilePath: "sample.log",
                IncludeGitDiff: true));

        Assert.NotNull(result);
        Assert.Equal(AgentTaskStatus.Completed, result.Task.Status);
        Assert.Equal(4, result.ToolResults.Count);
        Assert.Contains(result.Trace, trace => trace.Name == "execution.started");
        Assert.Contains(result.Trace, trace => trace.Name == "tool.started" && trace.ToolName == "go-read-file");
        Assert.Contains(result.Trace, trace => trace.Name == "tool.completed" && trace.ToolName == "go-git-diff");
        Assert.Contains(result.Trace, trace => trace.Name == "tool.completed" && trace.ToolName == "rust-log-parser");
        Assert.Contains(runner.Commands, command => command.FileName == "go" && command.Arguments.Contains("read_file"));
        Assert.Contains(runner.Commands, command => command.FileName == "go" && command.Arguments.Contains("git_diff"));
        Assert.Contains(runner.Commands, command => command.FileName == "cargo" && command.Arguments.Contains("code-indexer"));
        Assert.Contains(runner.Commands, command => command.FileName == "cargo" && command.Arguments.Contains("log-parser"));
    }

    [Fact]
    public async Task ExecuteBlocksHighRiskTaskWithoutApproval()
    {
        var tasks = new TaskService();
        var runner = new FakeToolCommandRunner();
        var executor = new AgentExecutionService(tasks, runner, "go-runtime", "rust-tools");
        var task = tasks.Create("deploy to production", "agent-operator", TaskRiskLevel.High);

        var result = await executor.ExecuteAsync(task.Id, new ExecuteTaskRequest(ReadFilePath: "go.mod"));

        Assert.NotNull(result);
        Assert.Equal(AgentTaskStatus.Created, result.Task.Status);
        Assert.Empty(result.ToolResults);
        Assert.Empty(runner.Commands);
        Assert.Contains(result.Trace, trace => trace.Name == "execution.blocked");
    }

    [Fact]
    public async Task ExecuteReturnsNullForMissingTask()
    {
        var executor = new AgentExecutionService(new TaskService(), new FakeToolCommandRunner(), "go-runtime", "rust-tools");

        var result = await executor.ExecuteAsync(Guid.NewGuid(), new ExecuteTaskRequest(ReadFilePath: "go.mod"));

        Assert.Null(result);
    }

    private sealed class FakeToolCommandRunner : IToolCommandRunner
    {
        public List<(string FileName, string Arguments, string WorkingDirectory)> Commands { get; } = new();

        public Task<ToolCommandResult> RunAsync(
            string fileName,
            string arguments,
            string workingDirectory,
            CancellationToken cancellationToken = default)
        {
            Commands.Add((fileName, arguments, workingDirectory));
            return Task.FromResult(new ToolCommandResult(0, "{\"summary\":\"ok\"}", string.Empty));
        }
    }
}
