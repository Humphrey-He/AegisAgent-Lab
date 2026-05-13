package tools

import "testing"
import "os"

func TestRegistryExecutesRegisteredTool(t *testing.T) {
	root := t.TempDir()
	if err := os.WriteFile(root+"/notes.txt", []byte("hello"), 0o600); err != nil {
		t.Fatal(err)
	}
	registry := &Registry{tools: make(map[string]Tool)}
	registry.Register(ReadFileTool{Root: root})

	tool, result, err := registry.Execute("read_file", map[string]string{"path": "notes.txt"})
	if err != nil {
		t.Fatalf("Execute returned error: %v", err)
	}

	readFileResult, ok := result.(ReadFileResult)
	if !ok {
		t.Fatalf("result type = %T, want ReadFileResult", result)
	}
	if tool.Name() != "read_file" {
		t.Fatalf("tool name = %q, want read_file", tool.Name())
	}
	if readFileResult.Path != "notes.txt" {
		t.Fatalf("path = %q, want notes.txt", readFileResult.Path)
	}
}

func TestRegistryRejectsUnknownTool(t *testing.T) {
	registry := NewRegistry()

	_, _, err := registry.Execute("missing", map[string]string{})

	if err == nil {
		t.Fatal("Execute accepted an unknown tool")
	}
}

func TestNewRegistryUsesWorkspaceRootEnvironment(t *testing.T) {
	root := t.TempDir()
	if err := os.WriteFile(root+"/README.md", []byte("workspace"), 0o600); err != nil {
		t.Fatal(err)
	}
	t.Setenv("AEGIS_WORKSPACE_ROOT", root)

	registry := NewRegistry()
	_, result, err := registry.Execute("read_file", map[string]string{"path": "README.md"})
	if err != nil {
		t.Fatalf("Execute returned error: %v", err)
	}

	readFileResult, ok := result.(ReadFileResult)
	if !ok {
		t.Fatalf("result type = %T, want ReadFileResult", result)
	}
	if readFileResult.Content != "workspace" {
		t.Fatalf("Content = %q, want workspace", readFileResult.Content)
	}
}
