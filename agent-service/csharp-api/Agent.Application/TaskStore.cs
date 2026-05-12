using Agent.Domain;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Agent.Application;

public sealed record TaskStoreSnapshot(
    IReadOnlyCollection<AgentTask> Tasks,
    IReadOnlyDictionary<Guid, IReadOnlyCollection<AgentTraceEvent>> Traces);

public interface ITaskStore
{
    TaskStoreSnapshot Load();
    void Save(TaskStoreSnapshot snapshot);
}

public sealed class JsonFileTaskStore : ITaskStore
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        WriteIndented = true,
        Converters = { new JsonStringEnumConverter() },
    };

    private readonly string path;

    public JsonFileTaskStore(string path)
    {
        this.path = path;
    }

    public TaskStoreSnapshot Load()
    {
        if (!File.Exists(path))
        {
            return Empty();
        }

        var json = File.ReadAllText(path);
        return JsonSerializer.Deserialize<TaskStoreSnapshot>(json, JsonOptions) ?? Empty();
    }

    public void Save(TaskStoreSnapshot snapshot)
    {
        var directory = Path.GetDirectoryName(path);
        if (!string.IsNullOrWhiteSpace(directory))
        {
            Directory.CreateDirectory(directory);
        }

        var json = JsonSerializer.Serialize(snapshot, JsonOptions);
        File.WriteAllText(path, json);
    }

    private static TaskStoreSnapshot Empty()
    {
        return new TaskStoreSnapshot(Array.Empty<AgentTask>(), new Dictionary<Guid, IReadOnlyCollection<AgentTraceEvent>>());
    }
}

public sealed class InMemoryTaskStore : ITaskStore
{
    private TaskStoreSnapshot snapshot = new(Array.Empty<AgentTask>(), new Dictionary<Guid, IReadOnlyCollection<AgentTraceEvent>>());

    public TaskStoreSnapshot Load()
    {
        return snapshot;
    }

    public void Save(TaskStoreSnapshot snapshot)
    {
        this.snapshot = snapshot;
    }
}
