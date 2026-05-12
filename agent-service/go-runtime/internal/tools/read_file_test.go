package tools

import (
	"os"
	"path/filepath"
	"testing"
)

func TestReadFileReturnsStructuredResult(t *testing.T) {
	root := t.TempDir()
	path := filepath.Join(root, "notes.txt")
	if err := os.WriteFile(path, []byte("hello agent"), 0o600); err != nil {
		t.Fatal(err)
	}

	result, err := ReadFile(root, "notes.txt")
	if err != nil {
		t.Fatalf("ReadFile returned error: %v", err)
	}

	if result.ToolName != "read_file" {
		t.Fatalf("ToolName = %q, want read_file", result.ToolName)
	}
	if result.Path != "notes.txt" {
		t.Fatalf("Path = %q, want notes.txt", result.Path)
	}
	if result.Content != "hello agent" {
		t.Fatalf("Content = %q, want hello agent", result.Content)
	}
	if result.Bytes != len("hello agent") {
		t.Fatalf("Bytes = %d, want %d", result.Bytes, len("hello agent"))
	}
}

func TestReadFileRejectsPathOutsideRoot(t *testing.T) {
	root := t.TempDir()
	outside := filepath.Join(t.TempDir(), "secret.txt")
	if err := os.WriteFile(outside, []byte("secret"), 0o600); err != nil {
		t.Fatal(err)
	}

	_, err := ReadFile(root, filepath.Join("..", filepath.Base(filepath.Dir(outside)), "secret.txt"))
	if err == nil {
		t.Fatal("ReadFile accepted a path outside the root")
	}
}

func TestReadFileRejectsDirectory(t *testing.T) {
	root := t.TempDir()

	_, err := ReadFile(root, ".")
	if err == nil {
		t.Fatal("ReadFile accepted a directory")
	}
}
