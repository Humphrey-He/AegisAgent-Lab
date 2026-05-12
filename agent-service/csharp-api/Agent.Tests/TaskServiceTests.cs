using Agent.Application;
using Agent.Domain;
using Xunit;

namespace Agent.Tests;

public sealed class TaskServiceTests
{
    [Fact]
    public void CreateDefaultsToLowRiskWithoutApproval()
    {
        var service = new TaskService();

        var task = service.Create("inspect logs", "agent-operator");

        Assert.Equal(TaskRiskLevel.Low, task.RiskLevel);
        Assert.Equal(ApprovalStatus.NotRequired, task.ApprovalStatus);
    }

    [Fact]
    public void CreateHighRiskTaskRequiresPendingApproval()
    {
        var service = new TaskService();

        var task = service.Create("deploy to production", "agent-operator", TaskRiskLevel.High);

        Assert.Equal(TaskRiskLevel.High, task.RiskLevel);
        Assert.Equal(ApprovalStatus.Pending, task.ApprovalStatus);
    }

    [Theory]
    [InlineData(TaskRiskLevel.Low, false)]
    [InlineData(TaskRiskLevel.Medium, true)]
    [InlineData(TaskRiskLevel.High, true)]
    public void MediumAndHighRiskTasksRequireApproval(TaskRiskLevel riskLevel, bool expected)
    {
        Assert.Equal(expected, TaskRiskPolicy.RequiresApproval(riskLevel));
    }

    [Fact]
    public void CreatedTasksCanBeQueriedAndListed()
    {
        var service = new TaskService();

        var first = service.Create("inspect logs", "agent-operator");
        var second = service.Create("read code", "agent-operator");

        Assert.Equal(first, service.Get(first.Id));
        Assert.Equal(second, service.Get(second.Id));
        Assert.Equal(new[] { first.Id, second.Id }, service.List().Select(task => task.Id).ToArray());
    }

    [Fact]
    public void PendingTaskCanBeApprovedOrRejected()
    {
        var service = new TaskService();
        var task = service.Create("deploy to production", "agent-operator", TaskRiskLevel.High);

        var approved = service.Approve(task.Id);
        var rejected = service.Reject(task.Id);

        Assert.Equal(ApprovalStatus.Approved, approved?.ApprovalStatus);
        Assert.Equal(ApprovalStatus.Approved, rejected?.ApprovalStatus);
    }

    [Fact]
    public void PendingTaskCanBeRejected()
    {
        var service = new TaskService();
        var task = service.Create("run migration", "agent-operator", TaskRiskLevel.Medium);

        var rejected = service.Reject(task.Id);

        Assert.Equal(ApprovalStatus.Rejected, rejected?.ApprovalStatus);
    }

    [Fact]
    public void LowRiskTaskCanMoveThroughExecutionStates()
    {
        var service = new TaskService();
        var task = service.Create("read README", "agent-operator");

        var planning = service.MoveTo(task.Id, AgentTaskStatus.Planning);
        var running = service.MoveTo(task.Id, AgentTaskStatus.Running);
        var completed = service.MoveTo(task.Id, AgentTaskStatus.Completed);

        Assert.Equal(AgentTaskStatus.Planning, planning?.Status);
        Assert.Equal(AgentTaskStatus.Running, running?.Status);
        Assert.Equal(AgentTaskStatus.Completed, completed?.Status);
    }

    [Fact]
    public void HighRiskTaskCannotRunBeforeApproval()
    {
        var service = new TaskService();
        var task = service.Create("deploy to production", "agent-operator", TaskRiskLevel.High);

        var planning = service.MoveTo(task.Id, AgentTaskStatus.Planning);
        service.Approve(task.Id);
        var approvedPlanning = service.MoveTo(task.Id, AgentTaskStatus.Planning);

        Assert.Equal(AgentTaskStatus.Created, planning?.Status);
        Assert.Equal(AgentTaskStatus.Planning, approvedPlanning?.Status);
    }

    [Fact]
    public void AnyTaskCanFail()
    {
        var service = new TaskService();
        var task = service.Create("inspect logs", "agent-operator");

        var failed = service.Fail(task.Id);

        Assert.Equal(AgentTaskStatus.Failed, failed?.Status);
    }

    [Fact]
    public void CreatedTaskStartsWithTraceEvent()
    {
        var service = new TaskService();

        var task = service.Create("inspect logs", "agent-operator");
        var trace = service.GetTrace(task.Id);

        Assert.NotNull(trace);
        var traceEvent = Assert.Single(trace);
        Assert.Equal(1, traceEvent.Sequence);
        Assert.Equal("task.created", traceEvent.Name);
        Assert.Equal("task-service", traceEvent.ToolName);
        Assert.Equal("completed", traceEvent.Status);
        Assert.Equal("Low", traceEvent.Attributes["risk_level"]);
    }

    [Fact]
    public void AppendTraceAddsOrderedEvents()
    {
        var service = new TaskService();
        var task = service.Create("inspect logs", "agent-operator");

        var started = service.AppendTrace(
            task.Id,
            "tool.started",
            "read_file",
            "started",
            "Reading log file.",
            new Dictionary<string, string> { ["path"] = "logs/app.log" });
        var completed = service.AppendTrace(
            task.Id,
            "tool.completed",
            "read_file",
            "completed",
            "Read log file.",
            new Dictionary<string, string> { ["bytes"] = "128" });

        var trace = service.GetTrace(task.Id)?.ToArray();

        Assert.Equal(2, started?.Sequence);
        Assert.Equal(3, completed?.Sequence);
        Assert.Equal(3, trace?.Length);
        Assert.Equal("logs/app.log", trace?[1].Attributes["path"]);
        Assert.Equal("128", trace?[2].Attributes["bytes"]);
    }

    [Fact]
    public void TraceForMissingTaskReturnsNull()
    {
        var service = new TaskService();

        Assert.Null(service.GetTrace(Guid.NewGuid()));
        Assert.Null(service.AppendTrace(Guid.NewGuid(), "tool.started", "read_file", "started", "missing"));
    }
}
