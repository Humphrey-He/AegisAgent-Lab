using Agent.Application;
using Agent.Domain;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddSingleton<TaskService>();
builder.Services.AddSingleton<IToolCommandRunner, ProcessToolCommandRunner>();
builder.Services.AddSingleton<AgentExecutionService>();

var app = builder.Build();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));

app.MapGet("/tasks", (TaskService tasks) => Results.Ok(tasks.List()));

app.MapGet("/tasks/{id:guid}", (Guid id, TaskService tasks) =>
{
    var task = tasks.Get(id);
    return task is null ? Results.NotFound() : Results.Ok(task);
});

app.MapPost("/tasks", (CreateTaskRequest request, TaskService tasks) =>
{
    var task = tasks.Create(request.Input, request.RequestedBy, request.RiskLevel ?? TaskRiskLevel.Low);
    return Results.Created($"/tasks/{task.Id}", task);
});

app.MapPost("/tasks/{id:guid}/approve", (Guid id, TaskService tasks) =>
{
    var task = tasks.Approve(id);
    return task is null ? Results.NotFound() : Results.Ok(task);
});

app.MapPost("/tasks/{id:guid}/reject", (Guid id, TaskService tasks) =>
{
    var task = tasks.Reject(id);
    return task is null ? Results.NotFound() : Results.Ok(task);
});

app.MapGet("/tasks/{id:guid}/trace", (Guid id, TaskService tasks) =>
{
    var trace = tasks.GetTrace(id);
    return trace is null ? Results.NotFound() : Results.Ok(trace);
});

app.MapPost("/tasks/{id:guid}/trace", (Guid id, AppendTraceRequest request, TaskService tasks) =>
{
    var traceEvent = tasks.AppendTrace(
        id,
        request.Name,
        request.ToolName,
        request.Status,
        request.Message,
        request.Attributes ?? new Dictionary<string, string>());
    return traceEvent is null ? Results.NotFound() : Results.Created($"/tasks/{id}/trace/{traceEvent.Sequence}", traceEvent);
});

app.MapPost("/tasks/{id:guid}/execute", async (Guid id, ExecuteTaskApiRequest request, AgentExecutionService executor, CancellationToken cancellationToken) =>
{
    var result = await executor.ExecuteAsync(
        id,
        new ExecuteTaskRequest(request.ReadFilePath, request.ScanRoot, request.ScanExtension, request.LogFilePath),
        cancellationToken);
    return result is null ? Results.NotFound() : Results.Ok(result);
});

app.Run();

public sealed record CreateTaskRequest(string Input, string RequestedBy, TaskRiskLevel? RiskLevel);

public sealed record AppendTraceRequest(
    string Name,
    string ToolName,
    string Status,
    string Message,
    Dictionary<string, string>? Attributes);

public sealed record ExecuteTaskApiRequest(
    string? ReadFilePath,
    string? ScanRoot,
    string? ScanExtension,
    string? LogFilePath);
