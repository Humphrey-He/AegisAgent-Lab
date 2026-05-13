using Agent.Application;
using Xunit;

namespace Agent.Tests;

public sealed class AgentPlanningServiceTests
{
    [Fact]
    public async Task TestAsyncReturnsModelResponse()
    {
        var service = new AgentPlanningService(new TaskService(), new FakeModelClient("ready"));

        var result = await service.TestAsync();

        Assert.Equal("ready", result.Content);
        Assert.True(result.Config.ApiKeyConfigured);
    }

    [Fact]
    public async Task PlanTaskWritesModelTraceEvents()
    {
        var tasks = new TaskService();
        var task = tasks.Create("Inspect README and propose a safe plan.", "tester");
        var service = new AgentPlanningService(tasks, new FakeModelClient("1. Read context\n2. Summarize risks"));

        var result = await service.PlanTaskAsync(task.Id);

        Assert.NotNull(result);
        Assert.Equal("1. Read context\n2. Summarize risks", result.ModelResponse.Content);
        Assert.Contains(result.Trace, trace => trace.Name == "model.requested");
        Assert.Contains(result.Trace, trace => trace.Name == "model.completed");
        Assert.Contains(result.Trace, trace => trace.Name == "task.ai_planned");
    }

    [Fact]
    public async Task PlanTaskReturnsNullForMissingTask()
    {
        var service = new AgentPlanningService(new TaskService(), new FakeModelClient("unused"));

        var result = await service.PlanTaskAsync(Guid.NewGuid());

        Assert.Null(result);
    }

    private sealed class FakeModelClient : IModelClient
    {
        private readonly string content;

        public FakeModelClient(string content)
        {
            this.content = content;
        }

        public ModelGatewayConfig GetConfig()
        {
            return new ModelGatewayConfig("Fake", "https://example.test/v1", "fake-model", true);
        }

        public Task<ModelResponse> CompleteAsync(ModelRequest request, CancellationToken cancellationToken = default)
        {
            return Task.FromResult(new ModelResponse("Fake", "https://example.test/v1", "fake-model", content, 12, TotalTokens: 8));
        }
    }
}
