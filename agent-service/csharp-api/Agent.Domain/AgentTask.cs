namespace Agent.Domain;

public sealed record AgentTask(
    Guid Id,
    string Input,
    string RequestedBy,
    AgentTaskStatus Status,
    DateTimeOffset CreatedAt,
    TaskRiskLevel RiskLevel,
    ApprovalStatus ApprovalStatus);

public static class AgentTaskTransitions
{
    public static bool CanMoveTo(AgentTaskStatus current, AgentTaskStatus next)
    {
        return (current, next) switch
        {
            (AgentTaskStatus.Created, AgentTaskStatus.Planning) => true,
            (AgentTaskStatus.Planning, AgentTaskStatus.Running) => true,
            (AgentTaskStatus.Running, AgentTaskStatus.Completed) => true,
            (_, AgentTaskStatus.Failed) => true,
            _ => false,
        };
    }
}

public static class TaskRiskPolicy
{
    public static bool RequiresApproval(TaskRiskLevel riskLevel)
    {
        return riskLevel is TaskRiskLevel.Medium or TaskRiskLevel.High;
    }

    public static ApprovalStatus InitialApprovalStatus(TaskRiskLevel riskLevel)
    {
        return RequiresApproval(riskLevel)
            ? ApprovalStatus.Pending
            : ApprovalStatus.NotRequired;
    }
}

public enum AgentTaskStatus
{
    Created = 0,
    Planning = 1,
    Running = 2,
    WaitingForApproval = 3,
    Completed = 4,
    Failed = 5
}

public enum TaskRiskLevel
{
    Low = 0,
    Medium = 1,
    High = 2
}

public enum ApprovalStatus
{
    NotRequired = 0,
    Pending = 1,
    Approved = 2,
    Rejected = 3
}
