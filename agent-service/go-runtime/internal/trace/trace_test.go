package trace

import "testing"

func TestRunRecordsTraceEvents(t *testing.T) {
	run := NewRun("local-cli", "read-only-demo")

	run.Record("tool.started", "read_file", map[string]string{"path": "README.md"})
	run.Record("tool.completed", "read_file", nil)

	events := run.Events()
	if len(events) != 2 {
		t.Fatalf("len(events) = %d, want 2", len(events))
	}
	if events[0].Name != "tool.started" {
		t.Fatalf("first event name = %q, want tool.started", events[0].Name)
	}
	if events[0].ToolName != "read_file" {
		t.Fatalf("first event tool = %q, want read_file", events[0].ToolName)
	}
	if events[0].Attributes["path"] != "README.md" {
		t.Fatalf("first event path = %q, want README.md", events[0].Attributes["path"])
	}
	if events[1].Sequence != 2 {
		t.Fatalf("second event sequence = %d, want 2", events[1].Sequence)
	}
}
