package tools

import (
	"bytes"
	"errors"
	"os/exec"
)

type GitDiffResult struct {
	ToolName string `json:"tool_name"`
	Args     string `json:"args"`
	Diff     string `json:"diff"`
	Bytes    int    `json:"bytes"`
}

type GitDiffTool struct {
	Root string
}

func (t GitDiffTool) Name() string {
	return "git_diff"
}

func (t GitDiffTool) Description() string {
	return "Read git diff output in read-only mode."
}

func (t GitDiffTool) RiskLevel() string {
	return "low"
}

func (t GitDiffTool) Execute(args map[string]string) (any, error) {
	diffArgs := args["args"]
	if diffArgs == "" {
		diffArgs = "--stat"
	}
	if diffArgs != "--stat" && diffArgs != "--" {
		return nil, errors.New("git_diff only supports --stat or --")
	}

	root := t.Root
	if root == "" {
		root = "."
	}

	cmd := exec.Command("git", "diff", diffArgs)
	cmd.Dir = root
	var stderr bytes.Buffer
	cmd.Stderr = &stderr
	output, err := cmd.Output()
	if err != nil {
		if stderr.Len() > 0 {
			return nil, errors.New(stderr.String())
		}
		return nil, err
	}

	return GitDiffResult{
		ToolName: "git_diff",
		Args:     diffArgs,
		Diff:     string(output),
		Bytes:    len(output),
	}, nil
}
