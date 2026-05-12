package tools

import (
	"errors"
	"fmt"
	"os"
	"path/filepath"
)

type ReadFileResult struct {
	ToolName string `json:"tool_name"`
	Path     string `json:"path"`
	Content  string `json:"content"`
	Bytes    int    `json:"bytes"`
}

type ReadFileTool struct {
	Root string
}

func (t ReadFileTool) Name() string {
	return "read_file"
}

func (t ReadFileTool) Description() string {
	return "Read local project files in read-only mode."
}

func (t ReadFileTool) RiskLevel() string {
	return "low"
}

func (t ReadFileTool) Execute(args map[string]string) (any, error) {
	path, ok := args["path"]
	if !ok || path == "" {
		return nil, errors.New("read_file requires path")
	}

	root := t.Root
	if root == "" {
		root = "."
	}

	return ReadFile(root, path)
}

func ReadFile(root string, requestedPath string) (ReadFileResult, error) {
	if filepath.IsAbs(requestedPath) {
		return ReadFileResult{}, errors.New("read_file path must be relative")
	}

	rootAbs, err := filepath.Abs(root)
	if err != nil {
		return ReadFileResult{}, fmt.Errorf("resolve root: %w", err)
	}

	targetAbs := filepath.Clean(filepath.Join(rootAbs, requestedPath))
	rel, err := filepath.Rel(rootAbs, targetAbs)
	if err != nil {
		return ReadFileResult{}, fmt.Errorf("validate path: %w", err)
	}
	if rel == ".." || rel == "."+string(filepath.Separator)+".." || len(rel) >= 3 && rel[:3] == ".."+string(filepath.Separator) {
		return ReadFileResult{}, errors.New("read_file path escapes root")
	}

	info, err := os.Stat(targetAbs)
	if err != nil {
		return ReadFileResult{}, fmt.Errorf("stat file: %w", err)
	}
	if info.IsDir() {
		return ReadFileResult{}, errors.New("read_file refuses directories")
	}

	content, err := os.ReadFile(targetAbs)
	if err != nil {
		return ReadFileResult{}, fmt.Errorf("read file: %w", err)
	}

	return ReadFileResult{
		ToolName: "read_file",
		Path:     filepath.ToSlash(rel),
		Content:  string(content),
		Bytes:    len(content),
	}, nil
}
