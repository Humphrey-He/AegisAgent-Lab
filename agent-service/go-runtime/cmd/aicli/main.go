package main

import (
	"encoding/json"
	"fmt"
	"os"

	"ai-backend-practice/agent-service/go-runtime/internal/tools"
	"ai-backend-practice/agent-service/go-runtime/internal/trace"
)

func main() {
	args := os.Args[1:]
	jsonOutput := false
	if len(args) > 0 && args[0] == "--json" {
		jsonOutput = true
		args = args[1:]
	}

	registry := tools.NewRegistry()
	run := trace.NewRun("local-cli", "bootstrap")
	run.Record("tool.registry.loaded", "registry", map[string]string{
		"tool_count": fmt.Sprintf("%d", registry.Count()),
	})

	response := tools.Response{
		Summary: "AI CLI ready.",
		Risks: []string{
			"Only read-only tools are available in this runtime.",
		},
		NextActions: []string{
			"Use read_file with a relative path to inspect project files.",
		},
	}

	if len(args) == 2 && args[0] == "read_file" {
		path := args[1]
		arguments := map[string]string{"path": path}

		call := executeTool(registry, &run, "read_file", arguments)
		response.Summary = summarizeCall(call, "read_file")
		response.ToolCalls = append(response.ToolCalls, call)
	}

	if len(args) >= 1 && args[0] == "git_diff" {
		diffArgs := "--stat"
		if len(args) == 2 {
			diffArgs = args[1]
		}
		arguments := map[string]string{"args": diffArgs}
		call := executeTool(registry, &run, "git_diff", arguments)
		response.Summary = summarizeCall(call, "git_diff")
		response.ToolCalls = append(response.ToolCalls, call)
	}

	response.Trace = run.Events()
	if jsonOutput {
		encoder := json.NewEncoder(os.Stdout)
		encoder.SetIndent("", "  ")
		if err := encoder.Encode(response); err != nil {
			fmt.Fprintf(os.Stderr, "encode response: %v\n", err)
			os.Exit(1)
		}
		return
	}

	printText(registry, run, response)
}

func executeTool(registry *tools.Registry, run *trace.Run, name string, arguments map[string]string) tools.ToolCall {
	run.Record("tool.started", name, arguments)
	tool, result, err := registry.Execute(name, arguments)
	call := tools.ToolCall{
		Name:      name,
		RiskLevel: "unknown",
		Arguments: arguments,
		Status:    "started",
	}
	if tool != nil {
		call.Name = tool.Name()
		call.RiskLevel = tool.RiskLevel()
	}
	if err != nil {
		run.Record("tool.failed", name, map[string]string{"error": err.Error()})
		call.Status = "failed"
		call.Error = err.Error()
		return call
	}

	run.Record("tool.completed", name, map[string]string{"bytes": resultBytes(result)})
	call.Status = "completed"
	call.Result = result
	return call
}

func resultBytes(result any) string {
	switch value := result.(type) {
	case tools.ReadFileResult:
		return fmt.Sprintf("%d", value.Bytes)
	case tools.GitDiffResult:
		return fmt.Sprintf("%d", value.Bytes)
	default:
		return "0"
	}
}

func summarizeCall(call tools.ToolCall, fallback string) string {
	if call.Error != "" {
		return fmt.Sprintf("%s failed.", fallback)
	}
	return fmt.Sprintf("%s completed.", call.Name)
}

func printText(registry *tools.Registry, run trace.Run, response tools.Response) {
	fmt.Printf("AI CLI ready. tools=%d trace_id=%s\n", registry.Count(), run.ID)
	for _, tool := range registry.List() {
		fmt.Printf("tool name=%s risk=%s description=%q\n", tool.Name(), tool.RiskLevel(), tool.Description())
	}

	for _, call := range response.ToolCalls {
		if call.Error != "" {
			fmt.Printf("%s error=%q\n", call.Name, call.Error)
			continue
		}
		if result, ok := call.Result.(tools.ReadFileResult); ok {
			fmt.Printf("read_file path=%s bytes=%d\n%s\n", result.Path, result.Bytes, result.Content)
		}
		if result, ok := call.Result.(tools.GitDiffResult); ok {
			fmt.Printf("git_diff args=%s bytes=%d\n%s\n", result.Args, result.Bytes, result.Diff)
		}
	}

	for _, event := range run.Events() {
		fmt.Printf("trace_event seq=%d name=%s tool=%s\n", event.Sequence, event.Name, event.ToolName)
	}
}
