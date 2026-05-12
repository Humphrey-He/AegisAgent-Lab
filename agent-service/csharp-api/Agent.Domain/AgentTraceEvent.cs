namespace Agent.Domain;

public sealed record AgentTraceEvent(
    int Sequence,
    string Name,
    string ToolName,
    string Status,
    string Message,
    IReadOnlyDictionary<string, string> Attributes,
    DateTimeOffset OccurredAt);
