using Agent.Domain;

namespace Agent.Application;

public sealed record ModelTestResult(
    ModelGatewayConfig Config,
    string Content,
    long LatencyMs,
    int? TotalTokens);

public sealed record TaskPlanResult(
    AgentTask Task,
    IReadOnlyCollection<AgentTraceEvent> Trace,
    ModelResponse ModelResponse);

public sealed class AgentPlanningService
{
    private readonly TaskService tasks;
    private readonly IModelClient modelClient;

    public AgentPlanningService(TaskService tasks, IModelClient modelClient)
    {
        this.tasks = tasks;
        this.modelClient = modelClient;
    }

    public ModelGatewayConfig GetConfig()
    {
        return modelClient.GetConfig();
    }

    public async Task<ModelTestResult> TestAsync(CancellationToken cancellationToken = default)
    {
        var response = await modelClient.CompleteAsync(new ModelRequest(new[]
        {
            new ModelMessage("system", "You are a connectivity test responder. Reply with one short sentence."),
            new ModelMessage("user", "Return: AegisAgent cloud AI gateway is ready."),
        }, MaxTokens: 80), cancellationToken);

        return new ModelTestResult(modelClient.GetConfig(), response.Content, response.LatencyMs, response.TotalTokens);
    }

    public async Task<TaskPlanResult?> PlanTaskAsync(Guid taskId, CancellationToken cancellationToken = default)
    {
        var task = tasks.Get(taskId);
        if (task is null)
        {
            return null;
        }

        tasks.AppendTrace(
            taskId,
            "model.requested",
            "model-gateway",
            "started",
            "Cloud model planning requested.",
            ModelAttributes("started"));

        try
        {
            var trace = tasks.GetTrace(taskId) ?? Array.Empty<AgentTraceEvent>();
            var response = await modelClient.CompleteAsync(new ModelRequest(new[]
            {
                new ModelMessage("system", BuildSystemPrompt()),
                new ModelMessage("user", BuildTaskPrompt(task, trace)),
            }), cancellationToken);

            tasks.AppendTrace(
                taskId,
                "model.completed",
                "model-gateway",
                "completed",
                "Cloud model planning completed.",
                ModelAttributes(
                    "completed",
                    response.LatencyMs,
                    response.Content,
                    response.TotalTokens));

            tasks.AppendTrace(
                taskId,
                "task.ai_planned",
                "model-gateway",
                "completed",
                response.Content,
                new Dictionary<string, string>
                {
                    ["model"] = response.Model,
                    ["provider"] = response.Provider,
                    ["response_preview"] = Trim(response.Content),
                });

            return new TaskPlanResult(task, tasks.GetTrace(taskId) ?? Array.Empty<AgentTraceEvent>(), response);
        }
        catch (Exception ex)
        {
            tasks.AppendTrace(
                taskId,
                "model.failed",
                "model-gateway",
                "failed",
                ex.Message,
                ModelAttributes("failed", error: ex.Message));
            throw;
        }
    }

    private Dictionary<string, string> ModelAttributes(
        string status,
        long? latencyMs = null,
        string? response = null,
        int? totalTokens = null,
        string? error = null)
    {
        var config = modelClient.GetConfig();
        var attributes = new Dictionary<string, string>
        {
            ["provider"] = config.Provider,
            ["model"] = config.Model,
            ["endpoint"] = SafeEndpoint(config.Endpoint),
            ["status"] = status,
        };

        if (latencyMs is not null)
        {
            attributes["latency_ms"] = latencyMs.Value.ToString();
        }

        if (!string.IsNullOrWhiteSpace(response))
        {
            attributes["response_preview"] = Trim(response);
        }

        if (totalTokens is not null)
        {
            attributes["total_tokens"] = totalTokens.Value.ToString();
        }

        if (!string.IsNullOrWhiteSpace(error))
        {
            attributes["error"] = Trim(error);
        }

        return attributes;
    }

    private static string BuildSystemPrompt()
    {
        return """
        You are the planning module for AegisAgent Lab.
        Produce a concise, safe, read-only execution plan.
        Do not claim to modify code, deploy, or call production write APIs.
        Use numbered steps and include risks and next actions.
        Also include one fenced JSON block named execution_request so the UI can prefill read-only tool parameters.
        The JSON shape must be:
        {
          "execution_request": {
            "readFilePath": "README.md",
            "includeGitDiff": true,
            "scanRoot": "docs",
            "scanExtension": "md",
            "logFilePath": ""
          }
        }
        Leave optional string fields empty only when no safe local value is relevant.
        """;
    }

    private static string BuildTaskPrompt(AgentTask task, IReadOnlyCollection<AgentTraceEvent> trace)
    {
        var recentTrace = string.Join(
            "\n",
            trace.OrderByDescending(item => item.Sequence)
                .Take(8)
                .OrderBy(item => item.Sequence)
                .Select(item => $"- #{item.Sequence} {item.Name} [{item.Status}] {item.Message}"));

        return $"""
        Task:
        {task.Input}

        Requested by: {task.RequestedBy}
        Status: {task.Status}
        Risk: {task.RiskLevel}
        Approval: {task.ApprovalStatus}

        Recent trace:
        {recentTrace}
        """;
    }

    private static string SafeEndpoint(string endpoint)
    {
        return Uri.TryCreate(endpoint, UriKind.Absolute, out var uri)
            ? uri.Host
            : endpoint;
    }

    private static string Trim(string value)
    {
        const int maxLength = 800;
        return value.Length <= maxLength ? value : value[..maxLength];
    }
}
