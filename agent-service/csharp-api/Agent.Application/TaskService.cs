using Agent.Domain;
using System.Collections.Concurrent;

namespace Agent.Application;

public sealed class TaskService
{
    private readonly ConcurrentDictionary<Guid, AgentTask> tasks = new();
    private readonly ConcurrentDictionary<Guid, List<AgentTraceEvent>> traces = new();

    public AgentTask Create(
        string input,
        string requestedBy,
        TaskRiskLevel riskLevel = TaskRiskLevel.Low)
    {
        var task = new AgentTask(
            Guid.NewGuid(),
            input,
            requestedBy,
            AgentTaskStatus.Created,
            DateTimeOffset.UtcNow,
            riskLevel,
            TaskRiskPolicy.InitialApprovalStatus(riskLevel));

        tasks[task.Id] = task;
        traces[task.Id] = new List<AgentTraceEvent>
        {
            new(
                1,
                "task.created",
                "task-service",
                "completed",
                "Task was created.",
                new Dictionary<string, string>
                {
                    ["risk_level"] = riskLevel.ToString(),
                    ["approval_status"] = task.ApprovalStatus.ToString(),
                },
                task.CreatedAt),
        };
        return task;
    }

    public IReadOnlyCollection<AgentTask> List()
    {
        return tasks.Values
            .OrderBy(task => task.CreatedAt)
            .ToArray();
    }

    public AgentTask? Get(Guid id)
    {
        return tasks.TryGetValue(id, out var task) ? task : null;
    }

    public AgentTask? Approve(Guid id)
    {
        return Update(id, task => task.ApprovalStatus == ApprovalStatus.Pending
            ? task with { ApprovalStatus = ApprovalStatus.Approved }
            : task);
    }

    public AgentTask? Reject(Guid id)
    {
        return Update(id, task => task.ApprovalStatus == ApprovalStatus.Pending
            ? task with { ApprovalStatus = ApprovalStatus.Rejected }
            : task);
    }

    public AgentTask? MoveTo(Guid id, AgentTaskStatus status)
    {
        return Update(id, task =>
        {
            if (TaskRiskPolicy.RequiresApproval(task.RiskLevel) &&
                task.ApprovalStatus != ApprovalStatus.Approved &&
                status is AgentTaskStatus.Planning or AgentTaskStatus.Running or AgentTaskStatus.Completed)
            {
                return task;
            }

            return AgentTaskTransitions.CanMoveTo(task.Status, status)
                ? task with { Status = status }
                : task;
        });
    }

    public AgentTask? Fail(Guid id)
    {
        return Update(id, task => task with { Status = AgentTaskStatus.Failed });
    }

    public AgentTraceEvent? AppendTrace(
        Guid id,
        string name,
        string toolName,
        string status,
        string message,
        IReadOnlyDictionary<string, string>? attributes = null)
    {
        if (!tasks.ContainsKey(id))
        {
            return null;
        }

        var events = traces.GetOrAdd(id, _ => new List<AgentTraceEvent>());
        lock (events)
        {
            var traceEvent = new AgentTraceEvent(
                events.Count + 1,
                name,
                toolName,
                status,
                message,
                new Dictionary<string, string>(attributes ?? new Dictionary<string, string>()),
                DateTimeOffset.UtcNow);
            events.Add(traceEvent);
            return traceEvent;
        }
    }

    public IReadOnlyCollection<AgentTraceEvent>? GetTrace(Guid id)
    {
        if (!tasks.ContainsKey(id))
        {
            return null;
        }

        var events = traces.GetOrAdd(id, _ => new List<AgentTraceEvent>());
        lock (events)
        {
            return events.ToArray();
        }
    }

    private AgentTask? Update(Guid id, Func<AgentTask, AgentTask> update)
    {
        while (true)
        {
            if (!tasks.TryGetValue(id, out var current))
            {
                return null;
            }

            var next = update(current);
            if (tasks.TryUpdate(id, next, current))
            {
                return next;
            }
        }
    }
}
