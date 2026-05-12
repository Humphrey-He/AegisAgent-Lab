package tools

import (
	"os/exec"
	"testing"
)

func TestGitDiffReturnsStructuredResult(t *testing.T) {
	if _, err := exec.LookPath("git"); err != nil {
		t.Skip("git is not available")
	}

	result, err := GitDiffTool{Root: "../../.."}.Execute(map[string]string{"args": "--stat"})
	if err != nil {
		t.Fatalf("GitDiff returned error: %v", err)
	}

	diff, ok := result.(GitDiffResult)
	if !ok {
		t.Fatalf("result type = %T, want GitDiffResult", result)
	}
	if diff.ToolName != "git_diff" {
		t.Fatalf("ToolName = %q, want git_diff", diff.ToolName)
	}
	if diff.Args != "--stat" {
		t.Fatalf("Args = %q, want --stat", diff.Args)
	}
}

func TestGitDiffRejectsUnsupportedArgs(t *testing.T) {
	_, err := GitDiffTool{Root: "."}.Execute(map[string]string{"args": "status"})
	if err == nil {
		t.Fatal("GitDiff accepted unsupported args")
	}
}
