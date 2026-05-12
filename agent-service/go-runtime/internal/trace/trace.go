package trace

import (
	"fmt"
	"time"
)

type Run struct {
	ID        string
	Actor     string
	TaskType  string
	StartedAt time.Time
	events    []Event
}

type Event struct {
	Sequence   int               `json:"sequence"`
	Name       string            `json:"name"`
	ToolName   string            `json:"tool_name"`
	Attributes map[string]string `json:"attributes"`
	OccurredAt time.Time         `json:"occurred_at"`
}

func NewRun(actor string, taskType string) Run {
	startedAt := time.Now().UTC()
	return Run{
		ID:        fmt.Sprintf("run-%d", startedAt.UnixNano()),
		Actor:     actor,
		TaskType:  taskType,
		StartedAt: startedAt,
	}
}

func (r *Run) Record(name string, toolName string, attributes map[string]string) {
	copied := make(map[string]string, len(attributes))
	for key, value := range attributes {
		copied[key] = value
	}

	r.events = append(r.events, Event{
		Sequence:   len(r.events) + 1,
		Name:       name,
		ToolName:   toolName,
		Attributes: copied,
		OccurredAt: time.Now().UTC(),
	})
}

func (r Run) Events() []Event {
	events := make([]Event, len(r.events))
	copy(events, r.events)
	return events
}
