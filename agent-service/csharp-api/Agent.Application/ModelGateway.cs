using System.Diagnostics;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace Agent.Application;

public sealed record ModelGatewayConfig(
    string Provider,
    string Endpoint,
    string Model,
    bool ApiKeyConfigured)
{
    public static ModelGatewayConfig FromEnvironment()
    {
        return new ModelGatewayConfig(
            Environment.GetEnvironmentVariable("AI_PROVIDER") ?? "OpenAICompatible",
            TrimTrailingSlash(Environment.GetEnvironmentVariable("AI_ENDPOINT") ?? "https://api.openai.com/v1"),
            Environment.GetEnvironmentVariable("AI_MODEL") ?? "gpt-4.1-mini",
            !string.IsNullOrWhiteSpace(Environment.GetEnvironmentVariable("AI_API_KEY")));
    }

    public static string? ApiKeyFromEnvironment()
    {
        return Environment.GetEnvironmentVariable("AI_API_KEY");
    }

    private static string TrimTrailingSlash(string value)
    {
        return value.TrimEnd('/');
    }
}

public sealed record ModelMessage(string Role, string Content);

public sealed record ModelRequest(
    IReadOnlyCollection<ModelMessage> Messages,
    double Temperature = 0.2,
    int MaxTokens = 800);

public sealed record ModelResponse(
    string Provider,
    string Endpoint,
    string Model,
    string Content,
    long LatencyMs,
    int? PromptTokens = null,
    int? CompletionTokens = null,
    int? TotalTokens = null);

public interface IModelClient
{
    ModelGatewayConfig GetConfig();
    Task<ModelResponse> CompleteAsync(ModelRequest request, CancellationToken cancellationToken = default);
}

public sealed class OpenAiCompatibleModelClient : IModelClient
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
    };

    private readonly HttpClient httpClient;
    private readonly Func<ModelGatewayConfig> configFactory;
    private readonly Func<string?> apiKeyFactory;

    public OpenAiCompatibleModelClient(
        HttpClient httpClient,
        Func<ModelGatewayConfig>? configFactory = null,
        Func<string?>? apiKeyFactory = null)
    {
        this.httpClient = httpClient;
        this.configFactory = configFactory ?? ModelGatewayConfig.FromEnvironment;
        this.apiKeyFactory = apiKeyFactory ?? ModelGatewayConfig.ApiKeyFromEnvironment;
    }

    public ModelGatewayConfig GetConfig()
    {
        return configFactory();
    }

    public async Task<ModelResponse> CompleteAsync(ModelRequest request, CancellationToken cancellationToken = default)
    {
        var config = configFactory();
        var apiKey = apiKeyFactory();
        if (string.IsNullOrWhiteSpace(apiKey))
        {
            throw new InvalidOperationException("AI_API_KEY is not configured.");
        }

        var payload = new
        {
            model = config.Model,
            messages = request.Messages.Select(message => new { role = message.Role, content = message.Content }),
            temperature = request.Temperature,
            max_tokens = request.MaxTokens,
        };

        using var httpRequest = new HttpRequestMessage(HttpMethod.Post, $"{config.Endpoint}/chat/completions");
        httpRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", apiKey);
        httpRequest.Content = new StringContent(JsonSerializer.Serialize(payload, JsonOptions), Encoding.UTF8, "application/json");

        var stopwatch = Stopwatch.StartNew();
        using var response = await httpClient.SendAsync(httpRequest, cancellationToken);
        var body = await response.Content.ReadAsStringAsync(cancellationToken);
        stopwatch.Stop();

        if (!response.IsSuccessStatusCode)
        {
            throw new InvalidOperationException($"Model request failed with {(int)response.StatusCode}: {Trim(body)}");
        }

        var completion = JsonSerializer.Deserialize<ChatCompletionResponse>(body, JsonOptions)
            ?? throw new InvalidOperationException("Model response was empty.");
        var content = completion.Choices.FirstOrDefault()?.Message.Content
            ?? throw new InvalidOperationException("Model response did not include message content.");

        return new ModelResponse(
            config.Provider,
            config.Endpoint,
            config.Model,
            content,
            stopwatch.ElapsedMilliseconds,
            completion.Usage?.PromptTokens,
            completion.Usage?.CompletionTokens,
            completion.Usage?.TotalTokens);
    }

    private static string Trim(string value)
    {
        const int maxLength = 500;
        return value.Length <= maxLength ? value : value[..maxLength];
    }

    private sealed record ChatCompletionResponse(
        IReadOnlyCollection<ChatChoice> Choices,
        ChatUsage? Usage);

    private sealed record ChatChoice(ChatMessage Message);

    private sealed record ChatMessage(string Content);

    private sealed record ChatUsage(
        [property: JsonPropertyName("prompt_tokens")] int? PromptTokens,
        [property: JsonPropertyName("completion_tokens")] int? CompletionTokens,
        [property: JsonPropertyName("total_tokens")] int? TotalTokens);
}
