using Agent.Application;
using Agent.Domain;
using Xunit;

namespace Agent.Tests;

public sealed class TaskStoreTests
{
    [Fact]
    public void JsonFileTaskStorePersistsTasksAndTrace()
    {
        var path = Path.Combine(Path.GetTempPath(), $"aegisagent-{Guid.NewGuid()}.json");
        try
        {
            var firstService = new TaskService(new JsonFileTaskStore(path));
            var task = firstService.Create("inspect logs", "agent-operator", TaskRiskLevel.Medium);
            firstService.Approve(task.Id);
            firstService.AppendTrace(
                task.Id,
                "tool.completed",
                "read_file",
                "completed",
                "Read file.",
                new Dictionary<string, string> { ["bytes"] = "64" });

            var secondService = new TaskService(new JsonFileTaskStore(path));
            var restoredTask = secondService.Get(task.Id);
            var restoredTrace = secondService.GetTrace(task.Id)?.ToArray();

            Assert.NotNull(restoredTask);
            Assert.Equal(ApprovalStatus.Approved, restoredTask.ApprovalStatus);
            Assert.Equal(TaskRiskLevel.Medium, restoredTask.RiskLevel);
            Assert.NotNull(restoredTrace);
            Assert.Equal(2, restoredTrace.Length);
            Assert.Equal("task.created", restoredTrace[0].Name);
            Assert.Equal("tool.completed", restoredTrace[1].Name);
            Assert.Equal("64", restoredTrace[1].Attributes["bytes"]);
        }
        finally
        {
            if (File.Exists(path))
            {
                File.Delete(path);
            }
        }
    }
}
