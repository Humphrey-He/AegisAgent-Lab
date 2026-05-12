package main

import (
	"encoding/json"
	"os/exec"
	"strings"
	"testing"
)

func TestCLIOutputsJSONForReadFile(t *testing.T) {
	cmd := exec.Command("go", "run", ".", "--json", "read_file", "main.go")
	output, err := cmd.CombinedOutput()
	if err != nil {
		t.Fatalf("go run failed: %v\n%s", err, output)
	}

	var response struct {
		Summary   string `json:"summary"`
		ToolCalls []struct {
			Name   string `json:"name"`
			Status string `json:"status"`
		} `json:"tool_calls"`
		Trace []struct {
			Sequence int    `json:"sequence"`
			Name     string `json:"name"`
			ToolName string `json:"tool_name"`
		} `json:"trace"`
		Risks       []string `json:"risks"`
		NextActions []string `json:"next_actions"`
	}

	if err := json.Unmarshal(output, &response); err != nil {
		t.Fatalf("invalid json: %v\n%s", err, output)
	}
	if !strings.Contains(response.Summary, "read_file completed") {
		t.Fatalf("summary = %q, want read_file completion", response.Summary)
	}
	if len(response.ToolCalls) != 1 || response.ToolCalls[0].Name != "read_file" || response.ToolCalls[0].Status != "completed" {
		t.Fatalf("unexpected tool calls: %+v", response.ToolCalls)
	}
	if len(response.Trace) < 3 {
		t.Fatalf("len(trace) = %d, want at least 3", len(response.Trace))
	}
	if response.Trace[0].Sequence != 1 {
		t.Fatalf("first trace sequence = %d, want 1", response.Trace[0].Sequence)
	}
	if len(response.Risks) == 0 || len(response.NextActions) == 0 {
		t.Fatal("response should include risks and next_actions")
	}
}
