import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  Check,
  ClipboardList,
  Code2,
  Copy,
  FileJson,
  GitBranch,
  Gauge,
  ListChecks,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
  X,
} from 'lucide-react'
import {
  approveTask,
  createTask,
  executeTask,
  exportTrace,
  getHealth,
  getTask,
  getTrace,
  listTasks,
  rejectTask,
} from './api'
import type {
  AgentTask,
  AgentTraceEvent,
  ExecuteTaskRequest,
  RiskLevel,
  ToolCommandResult,
  TraceExportResponse,
} from './types'
import './App.css'

const metrics = [
  { label: 'Phase completion', value: '4/4', hint: 'Phase 1-4 accepted' },
  { label: 'Automated tests', value: '31', hint: 'Go, C#, Rust' },
  { label: 'Callable tools', value: '4', hint: 'Read-only chain' },
  { label: 'Trace abilities', value: '11', hint: 'Persist and export' },
  { label: 'Eval samples', value: '0', hint: 'Real runs pending' },
  { label: 'Prompt templates', value: '5', hint: 'Reusable prompts' },
]

const toolCatalog = [
  { name: 'go-read-file', runtime: 'Go', capability: 'Read a relative file path' },
  { name: 'go-git-diff', runtime: 'Go', capability: 'Inspect git diff stat' },
  { name: 'rust-code-indexer', runtime: 'Rust', capability: 'Scan files by extension' },
  { name: 'rust-log-parser', runtime: 'Rust', capability: 'Summarize log keywords' },
]

const riskOptions: RiskLevel[] = ['Low', 'Medium', 'High']

type View = 'dashboard' | 'tasks' | 'detail' | 'tools'

function App() {
  const [view, setView] = useState<View>('dashboard')
  const [tasks, setTasks] = useState<AgentTask[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<AgentTask | null>(null)
  const [trace, setTrace] = useState<AgentTraceEvent[]>([])
  const [traceExport, setTraceExport] = useState<TraceExportResponse | null>(null)
  const [toolResults, setToolResults] = useState<ToolCommandResult[]>([])
  const [health, setHealth] = useState('unknown')
  const [notice, setNotice] = useState('Ready')
  const [loading, setLoading] = useState(false)

  const completedTasks = tasks.filter((task) => task.status === 'Completed').length
  const pendingApprovals = tasks.filter((task) => task.approvalStatus === 'Pending').length

  const selectedTraceStatus = useMemo(() => {
    const failed = trace.filter((event) => event.status === 'failed').length
    const blocked = trace.filter((event) => event.status === 'blocked').length
    const completed = trace.filter((event) => event.status === 'completed').length
    return { failed, blocked, completed }
  }, [trace])

  useEffect(() => {
    void refreshAll()
  }, [])

  useEffect(() => {
    if (selectedTaskId) {
      void loadTaskDetail(selectedTaskId)
    }
  }, [selectedTaskId])

  async function refreshAll() {
    setLoading(true)
    try {
      const [healthResult, taskResult] = await Promise.all([getHealth(), listTasks()])
      setHealth(healthResult.status)
      setTasks(sortTasks(taskResult))
      setNotice('Synced with API')
    } catch (error) {
      setNotice(toMessage(error))
    } finally {
      setLoading(false)
    }
  }

  async function loadTaskDetail(id: string) {
    setLoading(true)
    try {
      const [taskResult, traceResult] = await Promise.all([getTask(id), getTrace(id)])
      setSelectedTask(taskResult)
      setTrace(traceResult)
      setTraceExport(null)
      setView('detail')
    } catch (error) {
      setNotice(toMessage(error))
    } finally {
      setLoading(false)
    }
  }

  async function mutateTask(action: () => Promise<AgentTask>, success: string) {
    setLoading(true)
    try {
      const task = await action()
      setSelectedTask(task)
      setNotice(success)
      await refreshAll()
      if (selectedTaskId) {
        await loadTaskDetail(selectedTaskId)
      }
    } catch (error) {
      setNotice(toMessage(error))
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate(payload: { input: string; requestedBy: string; riskLevel: RiskLevel }) {
    setLoading(true)
    try {
      const task = await createTask(payload)
      setSelectedTaskId(task.id)
      setNotice('Task created')
      await refreshAll()
    } catch (error) {
      setNotice(toMessage(error))
    } finally {
      setLoading(false)
    }
  }

  async function handleExecute(payload: ExecuteTaskRequest) {
    if (!selectedTask) return
    setLoading(true)
    try {
      const result = await executeTask(selectedTask.id, payload)
      setSelectedTask(result.task)
      setTrace(result.trace)
      setToolResults(result.toolResults)
      setTraceExport(null)
      setNotice('Execution finished')
      await refreshAll()
    } catch (error) {
      setNotice(toMessage(error))
    } finally {
      setLoading(false)
    }
  }

  async function handleExportTrace() {
    if (!selectedTask) return
    setLoading(true)
    try {
      const result = await exportTrace(selectedTask.id)
      setTraceExport(result)
      setNotice('Trace export loaded')
    } catch (error) {
      setNotice(toMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand-block">
          <ShieldCheck size={28} />
          <div>
            <strong>AegisAgent Lab</strong>
            <span>Agent Control Plane</span>
          </div>
        </div>
        <nav className="nav-list" aria-label="Primary">
          <button className={view === 'dashboard' ? 'active' : ''} onClick={() => setView('dashboard')}>
            <Gauge size={18} /> Dashboard
          </button>
          <button className={view === 'tasks' ? 'active' : ''} onClick={() => setView('tasks')}>
            <ClipboardList size={18} /> Tasks
          </button>
          <button className={view === 'tools' ? 'active' : ''} onClick={() => setView('tools')}>
            <Code2 size={18} /> Tools
          </button>
        </nav>
        <div className="sidebar-footer">
          <span className={`health ${health === 'ok' ? 'ok' : ''}`}>API {health}</span>
          <button className="icon-button" title="Refresh" onClick={() => void refreshAll()} disabled={loading}>
            <RefreshCw size={17} />
          </button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Phase four operational MVP</p>
            <h1>{titleForView(view)}</h1>
          </div>
          <div className="notice">
            {loading ? <RefreshCw size={16} className="spin" /> : <Activity size={16} />}
            <span>{notice}</span>
          </div>
        </header>

        {view === 'dashboard' && (
          <Dashboard
            metrics={metrics}
            taskCount={tasks.length}
            completedTasks={completedTasks}
            pendingApprovals={pendingApprovals}
            onOpenTasks={() => setView('tasks')}
          />
        )}

        {view === 'tasks' && (
          <TasksView
            tasks={tasks}
            onCreate={(payload) => void handleCreate(payload)}
            onSelect={(id) => setSelectedTaskId(id)}
            onRefresh={() => void refreshAll()}
          />
        )}

        {view === 'detail' && selectedTask && (
          <TaskDetail
            task={selectedTask}
            trace={trace}
            traceStatus={selectedTraceStatus}
            traceExport={traceExport}
            toolResults={toolResults}
            onApprove={() => void mutateTask(() => approveTask(selectedTask.id), 'Task approved')}
            onReject={() => void mutateTask(() => rejectTask(selectedTask.id), 'Task rejected')}
            onExecute={(payload) => void handleExecute(payload)}
            onExportTrace={() => void handleExportTrace()}
          />
        )}

        {view === 'tools' && <ToolsView />}
      </section>
    </main>
  )
}

function Dashboard({
  metrics: dashboardMetrics,
  taskCount,
  completedTasks,
  pendingApprovals,
  onOpenTasks,
}: {
  metrics: typeof metrics
  taskCount: number
  completedTasks: number
  pendingApprovals: number
  onOpenTasks: () => void
}) {
  return (
    <div className="content-grid">
      <section className="metric-grid">
        {dashboardMetrics.map((metric) => (
          <article className="metric-card" key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.hint}</small>
          </article>
        ))}
      </section>

      <section className="panel wide">
        <div className="section-title">
          <h2>Execution Readiness</h2>
          <button onClick={onOpenTasks}>
            <ListChecks size={16} /> Open tasks
          </button>
        </div>
        <div className="readiness-row">
          <StatusBlock label="Tasks" value={String(taskCount)} tone="neutral" />
          <StatusBlock label="Completed" value={String(completedTasks)} tone="success" />
          <StatusBlock label="Pending approvals" value={String(pendingApprovals)} tone="warning" />
        </div>
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>Guardrails</h2>
          <AlertTriangle size={18} />
        </div>
        <ul className="plain-list">
          <li>Medium and high risk tasks require explicit approval.</li>
          <li>Tools stay read-only: file read, git diff, code scan, log summary.</li>
          <li>No production deployment or automatic code mutation is exposed.</li>
        </ul>
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>Next Evidence</h2>
          <Search size={18} />
        </div>
        <ul className="plain-list">
          <li>Run real eval cases with time and quality scores.</li>
          <li>Use exported trace JSON in acceptance reviews.</li>
          <li>Add backend metrics and tool catalog endpoints later.</li>
        </ul>
      </section>
    </div>
  )
}

function TasksView({
  tasks,
  onCreate,
  onSelect,
  onRefresh,
}: {
  tasks: AgentTask[]
  onCreate: (payload: { input: string; requestedBy: string; riskLevel: RiskLevel }) => void
  onSelect: (id: string) => void
  onRefresh: () => void
}) {
  const [input, setInput] = useState('Read README.md and summarize current project status.')
  const [requestedBy, setRequestedBy] = useState('agent-operator')
  const [riskLevel, setRiskLevel] = useState<RiskLevel>('Low')

  function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!input.trim() || !requestedBy.trim()) return
    onCreate({ input: input.trim(), requestedBy: requestedBy.trim(), riskLevel })
  }

  return (
    <div className="content-grid">
      <section className="panel create-panel">
        <div className="section-title">
          <h2>Create Task</h2>
          <ClipboardList size={18} />
        </div>
        <form onSubmit={submit} className="stack-form">
          <label>
            Task input
            <textarea value={input} onChange={(event) => setInput(event.target.value)} rows={4} />
          </label>
          <label>
            Requested by
            <input value={requestedBy} onChange={(event) => setRequestedBy(event.target.value)} />
          </label>
          <label>
            Risk level
            <select value={riskLevel} onChange={(event) => setRiskLevel(event.target.value as RiskLevel)}>
              {riskOptions.map((risk) => (
                <option key={risk} value={risk}>
                  {risk}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">
            <Check size={16} /> Create
          </button>
        </form>
      </section>

      <section className="panel wide">
        <div className="section-title">
          <h2>Task List</h2>
          <button onClick={onRefresh}>
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Input</th>
                <th>Status</th>
                <th>Risk</th>
                <th>Approval</th>
                <th>Created</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((task) => (
                <tr key={task.id}>
                  <td>
                    <strong>{task.input}</strong>
                    <small>{task.requestedBy}</small>
                  </td>
                  <td><Badge value={task.status} /></td>
                  <td><Badge value={task.riskLevel} /></td>
                  <td><Badge value={task.approvalStatus} /></td>
                  <td>{formatDate(task.createdAt)}</td>
                  <td>
                    <button className="small-button" onClick={() => onSelect(task.id)}>
                      Open
                    </button>
                  </td>
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-cell">No tasks yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function TaskDetail({
  task,
  trace,
  traceStatus,
  traceExport,
  toolResults,
  onApprove,
  onReject,
  onExecute,
  onExportTrace,
}: {
  task: AgentTask
  trace: AgentTraceEvent[]
  traceStatus: { failed: number; blocked: number; completed: number }
  traceExport: TraceExportResponse | null
  toolResults: ToolCommandResult[]
  onApprove: () => void
  onReject: () => void
  onExecute: (payload: ExecuteTaskRequest) => void
  onExportTrace: () => void
}) {
  return (
    <div className="content-grid">
      <section className="panel wide">
        <div className="section-title">
          <h2>Task Detail</h2>
          <div className="button-row">
            <button onClick={onApprove} disabled={task.approvalStatus !== 'Pending'}>
              <Check size={16} /> Approve
            </button>
            <button className="danger-button" onClick={onReject} disabled={task.approvalStatus !== 'Pending'}>
              <X size={16} /> Reject
            </button>
          </div>
        </div>
        <div className="detail-grid">
          <StatusBlock label="Status" value={task.status} tone={task.status === 'Completed' ? 'success' : 'neutral'} />
          <StatusBlock label="Risk" value={task.riskLevel} tone={task.riskLevel === 'Low' ? 'success' : 'warning'} />
          <StatusBlock label="Approval" value={task.approvalStatus} tone={task.approvalStatus === 'Pending' ? 'warning' : 'neutral'} />
          <StatusBlock label="Trace events" value={String(trace.length)} tone="neutral" />
        </div>
        <div className="detail-copy">
          <span>{task.id}</span>
          <p>{task.input}</p>
          <small>Requested by {task.requestedBy} at {formatDate(task.createdAt)}</small>
        </div>
      </section>

      <ExecutePanel onExecute={onExecute} />

      <section className="panel wide">
        <div className="section-title">
          <h2>Trace Timeline</h2>
          <div className="trace-stats">
            <Badge value={`completed ${traceStatus.completed}`} />
            <Badge value={`blocked ${traceStatus.blocked}`} />
            <Badge value={`failed ${traceStatus.failed}`} />
          </div>
        </div>
        <TraceTimeline events={trace} />
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>Trace Export</h2>
          <button onClick={onExportTrace}>
            <FileJson size={16} /> Load JSON
          </button>
        </div>
        <JsonViewer value={traceExport ?? { message: 'Click Load JSON to fetch export.' }} />
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>Tool Results</h2>
          <GitBranch size={18} />
        </div>
        <JsonViewer value={toolResults.length > 0 ? toolResults : { message: 'No execution result in this UI session.' }} />
      </section>
    </div>
  )
}

function ExecutePanel({ onExecute }: { onExecute: (payload: ExecuteTaskRequest) => void }) {
  const [readFilePath, setReadFilePath] = useState('go.mod')
  const [includeGitDiff, setIncludeGitDiff] = useState(true)
  const [scanRoot, setScanRoot] = useState('crates')
  const [scanExtension, setScanExtension] = useState('rs')
  const [logFilePath, setLogFilePath] = useState('')

  function submit(event: React.FormEvent) {
    event.preventDefault()
    onExecute({
      readFilePath: optional(readFilePath),
      includeGitDiff,
      scanRoot: optional(scanRoot),
      scanExtension: optional(scanExtension),
      logFilePath: optional(logFilePath),
    })
  }

  return (
    <section className="panel">
      <div className="section-title">
        <h2>Execute</h2>
        <Play size={18} />
      </div>
      <form className="stack-form" onSubmit={submit}>
        <label>
          Read file path
          <input value={readFilePath} onChange={(event) => setReadFilePath(event.target.value)} />
        </label>
        <label className="check-row">
          <input type="checkbox" checked={includeGitDiff} onChange={(event) => setIncludeGitDiff(event.target.checked)} />
          Include git diff stat
        </label>
        <label>
          Scan root
          <input value={scanRoot} onChange={(event) => setScanRoot(event.target.value)} />
        </label>
        <label>
          Scan extension
          <input value={scanExtension} onChange={(event) => setScanExtension(event.target.value)} />
        </label>
        <label>
          Log file path
          <input value={logFilePath} onChange={(event) => setLogFilePath(event.target.value)} placeholder="Optional absolute path" />
        </label>
        <button type="submit">
          <Play size={16} /> Execute
        </button>
      </form>
    </section>
  )
}

function TraceTimeline({ events }: { events: AgentTraceEvent[] }) {
  if (events.length === 0) {
    return <p className="muted">No trace events.</p>
  }

  return (
    <ol className="timeline">
      {events.map((event) => (
        <li key={`${event.sequence}-${event.name}`}>
          <div className="timeline-dot" />
          <div className="timeline-body">
            <div className="timeline-head">
              <strong>#{event.sequence} {event.name}</strong>
              <Badge value={event.status} />
            </div>
            <p>{event.message}</p>
            <small>{event.toolName} · {formatDate(event.occurredAt)}</small>
            <details>
              <summary>Attributes JSON</summary>
              <pre>{JSON.stringify(event.attributes, null, 2)}</pre>
            </details>
          </div>
        </li>
      ))}
    </ol>
  )
}

function ToolsView() {
  return (
    <div className="content-grid">
      <section className="panel wide">
        <div className="section-title">
          <h2>Tool Catalog</h2>
          <Code2 size={18} />
        </div>
        <div className="tool-grid">
          {toolCatalog.map((tool) => (
            <article className="tool-card" key={tool.name}>
              <Badge value={tool.runtime} />
              <strong>{tool.name}</strong>
              <p>{tool.capability}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="panel">
        <div className="section-title">
          <h2>Boundary</h2>
          <ShieldCheck size={18} />
        </div>
        <ul className="plain-list">
          <li>All current tools are read-only.</li>
          <li>Execution is routed through C# API and recorded in trace.</li>
          <li>Frontend exposes no write-to-repo action.</li>
        </ul>
      </section>
    </div>
  )
}

function StatusBlock({ label, value, tone }: { label: string; value: string; tone: 'neutral' | 'success' | 'warning' }) {
  return (
    <div className={`status-block ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function Badge({ value }: { value: string }) {
  const normalized = value.toLowerCase()
  const tone = normalized.includes('failed') || normalized.includes('rejected')
    ? 'bad'
    : normalized.includes('pending') || normalized.includes('medium') || normalized.includes('high') || normalized.includes('blocked')
      ? 'warn'
      : normalized.includes('completed') || normalized.includes('approved') || normalized.includes('low') || normalized.includes('ok')
        ? 'good'
        : 'neutral'
  return <span className={`badge ${tone}`}>{value}</span>
}

function JsonViewer({ value }: { value: unknown }) {
  async function copy() {
    await navigator.clipboard.writeText(JSON.stringify(value, null, 2))
  }

  return (
    <div className="json-viewer">
      <button className="copy-button" onClick={() => void copy()} title="Copy JSON">
        <Copy size={15} />
      </button>
      <pre>{JSON.stringify(value, null, 2)}</pre>
    </div>
  )
}

function sortTasks(items: AgentTask[]) {
  return [...items].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
}

function optional(value: string) {
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function titleForView(view: View) {
  if (view === 'tasks') return 'Tasks'
  if (view === 'detail') return 'Task Detail'
  if (view === 'tools') return 'Tools'
  return 'Dashboard'
}

function toMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error'
}

export default App
