package tools

import "ai-backend-practice/agent-service/go-runtime/internal/trace"

type ToolCall struct {
	Name      string            `json:"name"`
	RiskLevel string            `json:"risk_level"`
	Arguments map[string]string `json:"arguments,omitempty"`
	Status    string            `json:"status"`
	Result    any               `json:"result,omitempty"`
	Error     string            `json:"error,omitempty"`
}

type Response struct {
	Summary     string        `json:"summary"`
	ToolCalls   []ToolCall    `json:"tool_calls"`
	Trace       []trace.Event `json:"trace"`
	Risks       []string      `json:"risks"`
	NextActions []string      `json:"next_actions"`
}
