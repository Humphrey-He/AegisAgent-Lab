using System.Diagnostics;

namespace Agent.Application;

public sealed record ToolCommandResult(int ExitCode, string StandardOutput, string StandardError);

public interface IToolCommandRunner
{
    Task<ToolCommandResult> RunAsync(
        string fileName,
        string arguments,
        string workingDirectory,
        CancellationToken cancellationToken = default);
}

public sealed class ProcessToolCommandRunner : IToolCommandRunner
{
    public async Task<ToolCommandResult> RunAsync(
        string fileName,
        string arguments,
        string workingDirectory,
        CancellationToken cancellationToken = default)
    {
        var startInfo = new ProcessStartInfo
        {
            FileName = fileName,
            Arguments = arguments,
            WorkingDirectory = workingDirectory,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true,
        };

        using var process = Process.Start(startInfo)
            ?? throw new InvalidOperationException($"Failed to start command {fileName}.");
        var stdout = process.StandardOutput.ReadToEndAsync(cancellationToken);
        var stderr = process.StandardError.ReadToEndAsync(cancellationToken);
        await process.WaitForExitAsync(cancellationToken);

        return new ToolCommandResult(process.ExitCode, await stdout, await stderr);
    }
}
