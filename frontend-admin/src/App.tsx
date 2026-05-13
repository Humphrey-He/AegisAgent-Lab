import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Check,
  ClipboardList,
  Code2,
  Copy,
  FileJson,
  GitBranch,
  Gauge,
  Globe2,
  ListChecks,
  Play,
  RefreshCw,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react'
import {
  approveTask,
  createTask,
  executeTask,
  exportTrace,
  getHealth,
  getSkillDirectories,
  getTask,
  getTrace,
  listSkillFiles,
  listTasks,
  rejectTask,
  saveSkillFile,
  type SkillDirectoryOptionsResponse,
  type SkillFileRecord,
} from './api'
import { type GlossaryTerm, getGlossaryText } from './glossary'
import { t, type Language } from './i18n'
import { fetchSkillText } from './skillStore'
import type {
  AgentTask,
  AgentTraceEvent,
  ExecuteTaskRequest,
  RiskLevel,
  ToolCommandResult,
  TraceExportResponse,
} from './types'
import './App.css'

const toolCatalog = [
  { name: 'go-read-file', runtime: 'Go', capability: 'Read a relative file path' },
  { name: 'go-git-diff', runtime: 'Go', capability: 'Inspect git diff stat' },
  { name: 'rust-code-indexer', runtime: 'Rust', capability: 'Scan files by extension' },
  { name: 'rust-log-parser', runtime: 'Rust', capability: 'Summarize log keywords' },
]

const riskOptions: RiskLevel[] = ['Low', 'Medium', 'High']

type View = 'dashboard' | 'tasks' | 'detail' | 'tools' | 'docs' | 'skills'

function App() {
  const [language, setLanguage] = useState<Language>('zh')
  const [view, setView] = useState<View>('dashboard')
  const [tasks, setTasks] = useState<AgentTask[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<AgentTask | null>(null)
  const [trace, setTrace] = useState<AgentTraceEvent[]>([])
  const [traceExport, setTraceExport] = useState<TraceExportResponse | null>(null)
  const [toolResults, setToolResults] = useState<ToolCommandResult[]>([])
  const [health, setHealth] = useState('unknown')
  const [notice, setNotice] = useState(t(language, 'ready'))
  const [loading, setLoading] = useState(false)

  const metrics = useMemo(
    () => [
      { label: t(language, 'phaseCompletion'), value: '4/4', hint: t(language, 'phaseHint') },
      { label: t(language, 'automatedTests'), value: '31', hint: t(language, 'testsHint') },
      { label: t(language, 'callableTools'), value: '4', hint: t(language, 'toolsHint') },
      { label: t(language, 'traceAbilities'), value: '11', hint: t(language, 'traceHint') },
      { label: t(language, 'evalSamples'), value: '0', hint: t(language, 'evalHint') },
      { label: t(language, 'promptTemplates'), value: '5', hint: t(language, 'promptHint') },
    ],
    [language],
  )

  const completedTasks = tasks.filter((task) => task.status === 'Completed').length
  const pendingApprovals = tasks.filter((task) => task.approvalStatus === 'Pending').length

  const selectedTraceStatus = useMemo(() => {
    const failed = trace.filter((event) => event.status === 'failed').length
    const blocked = trace.filter((event) => event.status === 'blocked').length
    const completed = trace.filter((event) => event.status === 'completed').length
    return { failed, blocked, completed }
  }, [trace])

  const refreshAll = useCallback(async () => {
    setLoading(true)
    try {
      const [healthResult, taskResult] = await Promise.all([getHealth(), listTasks()])
      setHealth(healthResult.status)
      setTasks(sortTasks(taskResult))
      setNotice(t(language, 'synced'))
    } catch (error) {
      setNotice(toMessage(error))
    } finally {
      setLoading(false)
    }
  }, [language])

  const loadTaskDetail = useCallback(async (id: string) => {
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
  }, [])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void refreshAll()
    }, 0)
    return () => window.clearTimeout(handle)
  }, [refreshAll])

  useEffect(() => {
    if (selectedTaskId) {
      const handle = window.setTimeout(() => {
        void loadTaskDetail(selectedTaskId)
      }, 0)
      return () => window.clearTimeout(handle)
    }
    return undefined
  }, [loadTaskDetail, selectedTaskId])

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
      setNotice(t(language, 'taskCreated'))
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
      setNotice(t(language, 'executionFinished'))
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
      setNotice(t(language, 'traceExportLoaded'))
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
          <ShieldCheck size={30} />
          <div>
            <strong>AegisAgent Lab</strong>
            <span>
              <Glossary language={language} term="Agent" label="Agent" /> Control Plane
            </span>
          </div>
        </div>
        <nav className="nav-list" aria-label="Primary">
          <NavButton active={view === 'dashboard'} onClick={() => setView('dashboard')} icon={<Gauge size={18} />} label={t(language, 'navDashboard')} />
          <NavButton active={view === 'tasks'} onClick={() => setView('tasks')} icon={<ClipboardList size={18} />} label={t(language, 'navTasks')} />
          <NavButton active={view === 'tools'} onClick={() => setView('tools')} icon={<Code2 size={18} />} label={t(language, 'navTools')} />
          <NavButton active={view === 'docs'} onClick={() => setView('docs')} icon={<BookOpen size={18} />} label={t(language, 'navDocs')} />
          <NavButton active={view === 'skills'} onClick={() => setView('skills')} icon={<Sparkles size={18} />} label={t(language, 'navSkills')} />
        </nav>
        <div className="language-switcher">
          <Globe2 size={16} />
          <span>{t(language, 'language')}</span>
          <button className={language === 'zh' ? 'active' : ''} onClick={() => setLanguage('zh')}>中文</button>
          <button className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}>EN</button>
        </div>
        <div className="sidebar-footer">
          <span className={`health ${health === 'ok' ? 'ok' : ''}`}>
            <Glossary language={language} term="API" label={t(language, 'api')} /> {health}
          </span>
          <button className="icon-button" title={t(language, 'refresh')} onClick={() => void refreshAll()} disabled={loading}>
            <RefreshCw size={17} />
          </button>
        </div>
      </aside>

      <section className="workspace">
        <div className="starfield" />
        <header className="topbar">
          <div>
            <p className="eyebrow">{t(language, 'subtitle')}</p>
            <h1>{titleForView(view, language)}</h1>
          </div>
          <div className="notice">
            {loading ? <RefreshCw size={16} className="spin" /> : <Activity size={16} />}
            <span>{notice}</span>
          </div>
        </header>

        {view === 'dashboard' && (
          <Dashboard
            language={language}
            metrics={metrics}
            taskCount={tasks.length}
            completedTasks={completedTasks}
            pendingApprovals={pendingApprovals}
            onOpenTasks={() => setView('tasks')}
          />
        )}

        {view === 'tasks' && (
          <TasksView
            language={language}
            tasks={tasks}
            onCreate={(payload) => void handleCreate(payload)}
            onSelect={(id) => setSelectedTaskId(id)}
            onRefresh={() => void refreshAll()}
          />
        )}

        {view === 'detail' && selectedTask && (
          <TaskDetail
            language={language}
            task={selectedTask}
            trace={trace}
            traceStatus={selectedTraceStatus}
            traceExport={traceExport}
            toolResults={toolResults}
            onApprove={() => void mutateTask(() => approveTask(selectedTask.id), t(language, 'taskApproved'))}
            onReject={() => void mutateTask(() => rejectTask(selectedTask.id), t(language, 'taskRejected'))}
            onExecute={(payload) => void handleExecute(payload)}
            onExportTrace={() => void handleExportTrace()}
          />
        )}

        {view === 'tools' && <ToolsView language={language} />}
        {view === 'docs' && <DocsView language={language} />}
        {view === 'skills' && <SkillsView language={language} setNotice={setNotice} />}
      </section>
    </main>
  )
}

function Dashboard({
  language,
  metrics: dashboardMetrics,
  taskCount,
  completedTasks,
  pendingApprovals,
  onOpenTasks,
}: {
  language: Language
  metrics: Array<{ label: string; value: string; hint: string }>
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
          <h2>{t(language, 'executionReadiness')}</h2>
          <button onClick={onOpenTasks}>
            <ListChecks size={16} /> {t(language, 'openTasks')}
          </button>
        </div>
        <div className="readiness-row">
          <StatusBlock label={t(language, 'tasks')} value={String(taskCount)} tone="neutral" />
          <StatusBlock label={t(language, 'completed')} value={String(completedTasks)} tone="success" />
          <StatusBlock label={t(language, 'pendingApprovals')} value={String(pendingApprovals)} tone="warning" />
        </div>
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>{t(language, 'guardrails')}</h2>
          <AlertTriangle size={18} />
        </div>
        <ul className="plain-list">
          <li>{t(language, 'guardrailApproval')}</li>
          <li>{t(language, 'guardrailReadonly')}</li>
          <li>{t(language, 'guardrailNoProd')}</li>
        </ul>
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>{t(language, 'nextEvidence')}</h2>
          <Search size={18} />
        </div>
        <ul className="plain-list">
          <li><Glossary language={language} term="Eval" label="Eval" />: {t(language, 'evidenceEval')}</li>
          <li><Glossary language={language} term="Trace" label="Trace" />: {t(language, 'evidenceTrace')}</li>
          <li>{t(language, 'evidenceMetrics')}</li>
        </ul>
      </section>
    </div>
  )
}

function TasksView({
  language,
  tasks,
  onCreate,
  onSelect,
  onRefresh,
}: {
  language: Language
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
          <h2>{t(language, 'createTask')}</h2>
          <ClipboardList size={18} />
        </div>
        <form onSubmit={submit} className="stack-form">
          <label>
            {t(language, 'taskInput')}
            <textarea value={input} onChange={(event) => setInput(event.target.value)} rows={4} />
          </label>
          <label>
            {t(language, 'requestedBy')}
            <input value={requestedBy} onChange={(event) => setRequestedBy(event.target.value)} />
          </label>
          <label>
            <Glossary language={language} term="Risk Level" label={t(language, 'riskLevel')} />
            <select value={riskLevel} onChange={(event) => setRiskLevel(event.target.value as RiskLevel)}>
              {riskOptions.map((risk) => (
                <option key={risk} value={risk}>{risk}</option>
              ))}
            </select>
          </label>
          <button type="submit">
            <Check size={16} /> {t(language, 'create')}
          </button>
        </form>
      </section>

      <section className="panel wide">
        <div className="section-title">
          <h2>{t(language, 'taskList')}</h2>
          <button onClick={onRefresh}>
            <RefreshCw size={16} /> {t(language, 'refresh')}
          </button>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{t(language, 'input')}</th>
                <th>{t(language, 'status')}</th>
                <th>{t(language, 'risk')}</th>
                <th>{t(language, 'approval')}</th>
                <th>{t(language, 'created')}</th>
                <th>{t(language, 'action')}</th>
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
                      {t(language, 'open')}
                    </button>
                  </td>
                </tr>
              ))}
              {tasks.length === 0 && (
                <tr>
                  <td colSpan={6} className="empty-cell">{t(language, 'noTasks')}</td>
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
  language,
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
  language: Language
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
          <h2>{t(language, 'taskDetail')}</h2>
          <div className="button-row">
            <button onClick={onApprove} disabled={task.approvalStatus !== 'Pending'}>
              <Check size={16} /> {t(language, 'approve')}
            </button>
            <button className="danger-button" onClick={onReject} disabled={task.approvalStatus !== 'Pending'}>
              <X size={16} /> {t(language, 'reject')}
            </button>
          </div>
        </div>
        <div className="detail-grid">
          <StatusBlock label={t(language, 'status')} value={task.status} tone={task.status === 'Completed' ? 'success' : 'neutral'} />
          <StatusBlock label={t(language, 'risk')} value={task.riskLevel} tone={task.riskLevel === 'Low' ? 'success' : 'warning'} />
          <StatusBlock label={t(language, 'approval')} value={task.approvalStatus} tone={task.approvalStatus === 'Pending' ? 'warning' : 'neutral'} />
          <StatusBlock label={t(language, 'traceEvents')} value={String(trace.length)} tone="neutral" />
        </div>
        <div className="detail-copy">
          <span>{task.id}</span>
          <p>{task.input}</p>
          <small>{t(language, 'requestedBy')} {task.requestedBy} · {formatDate(task.createdAt)}</small>
        </div>
      </section>

      <ExecutePanel language={language} onExecute={onExecute} />

      <section className="panel wide">
        <div className="section-title">
          <h2><Glossary language={language} term="Trace" label={t(language, 'traceTimeline')} /></h2>
          <div className="trace-stats">
            <Badge value={`completed ${traceStatus.completed}`} />
            <Badge value={`blocked ${traceStatus.blocked}`} />
            <Badge value={`failed ${traceStatus.failed}`} />
          </div>
        </div>
        <TraceTimeline language={language} events={trace} />
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>{t(language, 'traceExport')}</h2>
          <button onClick={onExportTrace}>
            <FileJson size={16} /> {t(language, 'loadJson')}
          </button>
        </div>
        <JsonViewer language={language} value={traceExport ?? { message: t(language, 'clickLoadJson') }} />
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>{t(language, 'toolResults')}</h2>
          <GitBranch size={18} />
        </div>
        <JsonViewer language={language} value={toolResults.length > 0 ? toolResults : { message: t(language, 'noExecutionResult') }} />
      </section>
    </div>
  )
}

function ExecutePanel({ language, onExecute }: { language: Language; onExecute: (payload: ExecuteTaskRequest) => void }) {
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
        <h2>{t(language, 'execute')}</h2>
        <Play size={18} />
      </div>
      <form className="stack-form" onSubmit={submit}>
        <label>
          {t(language, 'readFilePath')}
          <input value={readFilePath} onChange={(event) => setReadFilePath(event.target.value)} />
        </label>
        <label className="check-row">
          <input type="checkbox" checked={includeGitDiff} onChange={(event) => setIncludeGitDiff(event.target.checked)} />
          {t(language, 'includeGitDiff')}
        </label>
        <label>
          {t(language, 'scanRoot')}
          <input value={scanRoot} onChange={(event) => setScanRoot(event.target.value)} />
        </label>
        <label>
          {t(language, 'scanExtension')}
          <input value={scanExtension} onChange={(event) => setScanExtension(event.target.value)} />
        </label>
        <label>
          {t(language, 'logFilePath')}
          <input value={logFilePath} onChange={(event) => setLogFilePath(event.target.value)} placeholder={t(language, 'optionalAbsolutePath')} />
        </label>
        <button type="submit">
          <Play size={16} /> {t(language, 'execute')}
        </button>
      </form>
    </section>
  )
}

function TraceTimeline({ language, events }: { language: Language; events: AgentTraceEvent[] }) {
  if (events.length === 0) {
    return <p className="muted">{t(language, 'noTraceEvents')}</p>
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
              <summary>{t(language, 'attributesJson')}</summary>
              <pre>{JSON.stringify(event.attributes, null, 2)}</pre>
            </details>
          </div>
        </li>
      ))}
    </ol>
  )
}

function ToolsView({ language }: { language: Language }) {
  return (
    <div className="content-grid">
      <section className="panel wide">
        <div className="section-title">
          <h2>{t(language, 'toolCatalog')}</h2>
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
          <h2>{t(language, 'boundary')}</h2>
          <ShieldCheck size={18} />
        </div>
        <ul className="plain-list">
          <li>{t(language, 'toolBoundaryReadonly')}</li>
          <li>{t(language, 'toolBoundaryTrace')}</li>
          <li>{t(language, 'toolBoundaryNoWrite')}</li>
        </ul>
      </section>
    </div>
  )
}

function DocsView({ language }: { language: Language }) {
  return (
    <div className="content-grid">
      <section className="panel wide">
        <div className="section-title">
          <h2>{t(language, 'usageDoc')}</h2>
          <BookOpen size={18} />
        </div>
        <p className="lead-text">{t(language, 'docsIntro')}</p>
        <div className="doc-grid">
          <article>
            <strong><Glossary language={language} term="Agent" label="Agent" /></strong>
            <p>{t(language, 'docsAgentShort')}</p>
          </article>
          <article>
            <strong><Glossary language={language} term="Runtime" label="Runtime" /></strong>
            <p>{t(language, 'docsRuntimeShort')}</p>
          </article>
          <article>
            <strong><Glossary language={language} term="Tool Chain" label="Tool Chain" /></strong>
            <p>{t(language, 'docsToolShort')}</p>
          </article>
          <article>
            <strong><Glossary language={language} term="CI" label="CI" /></strong>
            <p>{t(language, 'docsCiShort')}</p>
          </article>
        </div>
      </section>
      <section className="panel manual-panel">
        <div className="section-title">
          <h2>{t(language, 'operationManual')}</h2>
          <Rocket size={18} />
        </div>
        <ol className="manual-list">
          <li>{t(language, 'manualStep1')}</li>
          <li>{t(language, 'manualStep2')}</li>
          <li>{t(language, 'manualStep3')}</li>
          <li>{t(language, 'manualStep4')}</li>
          <li>{t(language, 'manualStep5')}</li>
        </ol>
      </section>
      <section className="panel wide docs-guide-panel">
        <div className="section-title">
          <h2><Glossary language={language} term="Skill" label={t(language, 'skillWritingGuide')} /></h2>
          <Sparkles size={18} />
        </div>
        <div className="guide-summary">
          <p>{t(language, 'skillGuideIntro')}</p>
          <div className="guide-pill-row">
            <span>Progressive Loading</span>
            <span>Description Hook</span>
            <span>RED-GREEN-REFACTOR</span>
            <span>Tool Wrapper</span>
          </div>
        </div>
        <div className="guide-card-grid">
          <article>
            <strong>{t(language, 'skillDescriptionTip')}</strong>
            <p>{t(language, 'skillDescriptionBody')}</p>
          </article>
          <article>
            <strong>{t(language, 'skillStructureTip')}</strong>
            <p>{t(language, 'skillStructureBody')}</p>
          </article>
          <article>
            <strong>{t(language, 'skillPatternTip')}</strong>
            <p>{t(language, 'skillPatternBody')}</p>
          </article>
        </div>
        <details className="review-details">
          <summary>{t(language, 'skillArticleReview')}</summary>
          <ul className="review-list">
            <li>{t(language, 'skillReviewOne')}</li>
            <li>{t(language, 'skillReviewTwo')}</li>
            <li>{t(language, 'skillReviewThree')}</li>
            <li>{t(language, 'skillReviewFour')}</li>
            <li>{t(language, 'skillReviewFive')}</li>
            <li>{t(language, 'skillReviewSix')}</li>
          </ul>
        </details>
        <div className="rule-grid compact">
          <span>{t(language, 'skillRuleOne')}</span>
          <span>{t(language, 'skillRuleTwo')}</span>
          <span>{t(language, 'skillRuleThree')}</span>
          <span>{t(language, 'skillRuleFour')}</span>
          <span>{t(language, 'skillRuleFive')}</span>
          <span>{t(language, 'skillRuleSix')}</span>
        </div>
      </section>
    </div>
  )
}

function SkillsView({ language, setNotice }: { language: Language; setNotice: (notice: string) => void }) {
  const [skills, setSkills] = useState<SkillFileRecord[]>([])
  const [directoryOptions, setDirectoryOptions] = useState<SkillDirectoryOptionsResponse | null>(null)
  const [directory, setDirectory] = useState('')
  const [url, setUrl] = useState('')
  const [name, setName] = useState('New Skill')
  const [source, setSource] = useState('local')
  const [content, setContent] = useState('# SKILL.md\n\n')
  const [busy, setBusy] = useState(false)

  const reloadSkills = useCallback(async (targetDirectory = directory) => {
    setBusy(true)
    try {
      const options = await getSkillDirectories(targetDirectory || undefined)
      const files = await listSkillFiles(options.currentDirectory)
      setDirectoryOptions(options)
      setDirectory(options.currentDirectory)
      setSkills(files)
      setNotice(t(language, 'directoryLoaded'))
    } catch (error) {
      setNotice(toMessage(error))
    } finally {
      setBusy(false)
    }
  }, [directory, language, setNotice])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      async function loadDirectory() {
        setBusy(true)
        try {
          const result = await getSkillDirectories()
          setDirectory(result.currentDirectory)
          setDirectoryOptions(result)
          const files = await listSkillFiles(result.currentDirectory)
          setSkills(files)
          setNotice(t(language, 'directoryLoaded'))
        } catch (error) {
          setNotice(toMessage(error))
        } finally {
          setBusy(false)
        }
      }

      void loadDirectory()
    }, 0)
    return () => window.clearTimeout(handle)
  }, [language, setNotice])

  async function fetchFromUrl() {
    if (!url.trim()) return
    setBusy(true)
    try {
      const text = await fetchSkillText(url.trim())
      const importedName = url.split('/').filter(Boolean).at(-1) ?? 'Imported Skill'
      setContent(text)
      setSource(url.trim())
      setName(importedName)
      const saved = await saveSkillFile({
        name: importedName,
        source: url.trim(),
        content: text,
        directory: directory || undefined,
      })
      await reloadSkills(saved.directory)
      setNotice(`${t(language, 'savedToDirectory')}: ${saved.filePath}`)
    } catch (error) {
      setNotice(toMessage(error))
    } finally {
      setBusy(false)
    }
  }

  async function persistSkill(event: React.FormEvent) {
    event.preventDefault()
    if (!name.trim() || !content.trim()) return
    setBusy(true)
    try {
      const saved = await saveSkillFile({
        name: name.trim(),
        source: source.trim() || 'local',
        content,
        directory: directory || undefined,
      })
      await reloadSkills(saved.directory)
      setNotice(`${t(language, 'savedToDirectory')}: ${saved.filePath}`)
    } catch (error) {
      setNotice(toMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="content-grid">
      <section className="panel">
        <div className="section-title">
          <h2><Glossary language={language} term="SkillHub" label={t(language, 'skillHubUrl')} /></h2>
          <Sparkles size={18} />
        </div>
        <div className="stack-form">
          <DirectoryPicker
            language={language}
            directory={directory}
            options={directoryOptions}
            busy={busy}
            onSelect={(path) => void reloadSkills(path)}
          />
          <label>
            {t(language, 'skillHubUrl')}
            <input value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://example.com/SKILL.md" />
          </label>
          <button type="button" disabled={busy} onClick={() => void fetchFromUrl()}>
            <RefreshCw size={16} /> {t(language, 'fetchSkill')}
          </button>
          <button type="button" disabled={busy} onClick={() => void reloadSkills()}>
            <RefreshCw size={16} /> {t(language, 'reloadFiles')}
          </button>
        </div>
      </section>

      <section className="panel wide">
        <div className="section-title">
          <h2>{t(language, 'newSkill')}</h2>
          <Code2 size={18} />
        </div>
        <form className="stack-form" onSubmit={persistSkill}>
          <label>
            {t(language, 'skillName')}
            <input value={name} onChange={(event) => setName(event.target.value)} />
          </label>
          <label>
            {t(language, 'skillSource')}
            <input value={source} onChange={(event) => setSource(event.target.value)} />
          </label>
          <label>
            {t(language, 'skillContent')}
            <textarea className="code-editor" value={content} onChange={(event) => setContent(event.target.value)} rows={12} />
          </label>
          <button type="submit">
            <Check size={16} /> {t(language, 'saveSkill')}
          </button>
        </form>
      </section>

      <section className="panel wide">
        <div className="section-title">
          <h2>{t(language, 'savedSkills')}</h2>
          <Badge value={String(skills.length)} />
        </div>
        <div className="skill-list">
          {skills.map((skill) => (
            <article className="skill-card" key={skill.id}>
              <div>
                <strong>{skill.name}</strong>
                <small>{skill.source} · {formatDate(skill.updatedAt)}</small>
                <small>{t(language, 'filePath')}: {skill.filePath}</small>
              </div>
              <pre>{skill.content}</pre>
            </article>
          ))}
          {skills.length === 0 && <p className="muted">{t(language, 'noSkills')}</p>}
        </div>
      </section>
    </div>
  )
}

function DirectoryPicker({
  language,
  directory,
  options,
  busy,
  onSelect,
}: {
  language: Language
  directory: string
  options: SkillDirectoryOptionsResponse | null
  busy: boolean
  onSelect: (path: string) => void
}) {
  return (
    <div className="directory-picker">
      <div>
        <strong>{t(language, 'skillDirectory')}</strong>
        <small>{t(language, 'skillDirectoryHint')}</small>
      </div>
      <code>{directory || options?.defaultDirectory || '-'}</code>
      <div className="directory-section">
        <span>{t(language, 'skillDirectoryRoots')}</span>
        <div className="directory-options">
          {options?.roots.map((option) => (
            <button
              className={option.path === directory ? 'selected' : ''}
              disabled={busy}
              key={option.path}
              onClick={() => onSelect(option.path)}
              type="button"
            >
              {option.name}
            </button>
          ))}
        </div>
      </div>
      <div className="directory-section">
        <span>{t(language, 'skillDirectoryChildren')}</span>
        <div className="directory-options">
          {options && options.children.length > 0 ? (
            options.children.map((option) => (
              <button
                disabled={busy}
                key={option.path}
                onClick={() => onSelect(option.path)}
                type="button"
              >
                {option.name}
              </button>
            ))
          ) : (
            <small className="field-hint">{t(language, 'noChildDirectories')}</small>
          )}
        </div>
      </div>
    </div>
  )
}

function NavButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button className={active ? 'active' : ''} onClick={onClick}>
      {icon} {label}
    </button>
  )
}

function Glossary({ language, term, label }: { language: Language; term: GlossaryTerm; label: string }) {
  return (
    <span className="glossary-term" tabIndex={0}>
      {label}
      <span className="glossary-tip" role="tooltip">{getGlossaryText(term, language)}</span>
    </span>
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

function JsonViewer({ language, value }: { language: Language; value: unknown }) {
  async function copy() {
    await navigator.clipboard.writeText(JSON.stringify(value, null, 2))
  }

  return (
    <div className="json-viewer">
      <button className="copy-button" onClick={() => void copy()} title={t(language, 'copyJson')}>
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

function titleForView(view: View, language: Language) {
  if (view === 'tasks') return t(language, 'tasks')
  if (view === 'detail') return t(language, 'taskDetail')
  if (view === 'tools') return t(language, 'tools')
  if (view === 'docs') return t(language, 'docs')
  if (view === 'skills') return t(language, 'skills')
  return t(language, 'dashboard')
}

function toMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error'
}

export default App
