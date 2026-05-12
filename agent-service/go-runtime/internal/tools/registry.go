package tools

import "fmt"

type Tool interface {
	Name() string
	Description() string
	RiskLevel() string
	Execute(args map[string]string) (any, error)
}

type Registry struct {
	tools map[string]Tool
}

func NewRegistry() *Registry {
	registry := &Registry{
		tools: make(map[string]Tool),
	}
	registry.Register(ReadFileTool{Root: "."})
	registry.Register(GitDiffTool{Root: "."})
	return registry
}

func (r *Registry) Register(tool Tool) {
	r.tools[tool.Name()] = tool
}

func (r *Registry) Count() int {
	return len(r.tools)
}

func (r *Registry) List() []Tool {
	result := make([]Tool, 0, len(r.tools))
	for _, tool := range r.tools {
		result = append(result, tool)
	}
	return result
}

func (r *Registry) Get(name string) (Tool, bool) {
	tool, ok := r.tools[name]
	return tool, ok
}

func (r *Registry) Execute(name string, args map[string]string) (Tool, any, error) {
	tool, ok := r.Get(name)
	if !ok {
		return nil, nil, fmt.Errorf("tool %q not found", name)
	}

	result, err := tool.Execute(args)
	return tool, result, err
}
