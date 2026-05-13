import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Activity,
  AlertTriangle,
  BookOpen,
  Check,
  ClipboardList,
  Code2,
  Copy,
  Download,
  ExternalLink,
  FileJson,
  FileText,
  GitBranch,
  Gauge,
  Globe2,
  Monitor,
  ListChecks,
  Play,
  RefreshCw,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  Smartphone,
  Tablet,
  X,
} from 'lucide-react'
import {
  approveTask,
  createTask,
  executeTask,
  exportTrace,
  getHealth,
  getModelConfig,
  getSkillDirectories,
  getTask,
  getTrace,
  getWorkspaceConfig,
  getWorkspaceFile,
  listSkillFiles,
  listTasks,
  listWorkspaceFiles,
  planTask,
  rejectTask,
  saveSkillFile,
  testModel,
  type ModelConfig,
  type ModelTestResult,
  type SkillDirectoryOptionsResponse,
  type SkillFileRecord,
  type WorkspaceConfig,
  type WorkspaceFileItem,
  type WorkspaceFileResponse,
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

type View = 'dashboard' | 'tasks' | 'detail' | 'tools' | 'workspace' | 'preview' | 'docs' | 'skills' | 'ai'

type TaskTemplate = {
  id: string
  icon: React.ReactNode
  riskLevel: RiskLevel
  titleKey: string
  descriptionKey: string
  input: string
  executeDefaults: ExecuteTaskRequest
}

const taskTemplates: TaskTemplate[] = [
  {
    id: 'project-health',
    icon: <Gauge size={17} />,
    riskLevel: 'Low',
    titleKey: 'templateProjectHealth',
    descriptionKey: 'templateProjectHealthDesc',
    input: 'Run a read-only project health check. Review README.md, inspect current Git changes, scan source directories, and summarize status, risks, and next actions.',
    executeDefaults: { readFilePath: 'README.md', includeGitDiff: true, scanRoot: '.', scanExtension: 'md' },
  },
  {
    id: 'code-reading',
    icon: <Code2 size={17} />,
    riskLevel: 'Low',
    titleKey: 'templateCodeReading',
    descriptionKey: 'templateCodeReadingDesc',
    input: 'Read the codebase structure and explain the main modules, runtime responsibilities, public APIs, and likely extension points.',
    executeDefaults: { readFilePath: 'README.md', includeGitDiff: true, scanRoot: 'agent-service', scanExtension: 'cs' },
  },
  {
    id: 'log-analysis',
    icon: <Search size={17} />,
    riskLevel: 'Low',
    titleKey: 'templateLogAnalysis',
    descriptionKey: 'templateLogAnalysisDesc',
    input: 'Analyze logs in read-only mode. Count error, warn, panic, and timeout keywords, summarize likely causes, and propose next checks.',
    executeDefaults: { includeGitDiff: false, scanRoot: 'reports', scanExtension: 'md', logFilePath: '' },
  },
  {
    id: 'product-plan',
    icon: <Rocket size={17} />,
    riskLevel: 'Low',
    titleKey: 'templateProductPlan',
    descriptionKey: 'templateProductPlanDesc',
    input: 'Create a product planning brief. Clarify user personas, core scenarios, MVP scope, phased roadmap, risks, and measurable acceptance criteria.',
    executeDefaults: { readFilePath: 'docs/frontend-admin-product-plan.md', includeGitDiff: true, scanRoot: 'docs', scanExtension: 'md' },
  },
  {
    id: 'skill-writing',
    icon: <Sparkles size={17} />,
    riskLevel: 'Low',
    titleKey: 'templateSkillWriting',
    descriptionKey: 'templateSkillWritingDesc',
    input: 'Draft a Skill design brief. Define trigger conditions, non-use cases, workflow, input/output contract, pitfalls, examples, source, and versioning.',
    executeDefaults: { readFilePath: 'docs/frontend-admin-implementation.md', includeGitDiff: false, scanRoot: 'docs', scanExtension: 'md' },
  },
  {
    id: 'ecommerce-research',
    icon: <Search size={17} />,
    riskLevel: 'Medium',
    titleKey: 'templateEcommerceResearch',
    descriptionKey: 'templateEcommerceResearchDesc',
    input: 'Analyze how to build Taobao-like e-commerce software. Break down user roles, marketplace modules, product/search/order/payment/merchant systems, data needs, MVP scope, and phased delivery. Use only provided or local project context unless web browsing is explicitly added later.',
    executeDefaults: { readFilePath: 'README.md', includeGitDiff: false, scanRoot: 'docs', scanExtension: 'md' },
  },
]

function App() {
  const [language, setLanguage] = useState<Language>('zh')
  const [view, setView] = useState<View>('dashboard')
  const [tasks, setTasks] = useState<AgentTask[]>([])
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<AgentTask | null>(null)
  const [trace, setTrace] = useState<AgentTraceEvent[]>([])
  const [traceExport, setTraceExport] = useState<TraceExportResponse | null>(null)
  const [toolResults, setToolResults] = useState<ToolCommandResult[]>([])
  const [modelConfig, setModelConfig] = useState<ModelConfig | null>(null)
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
      const [healthResult, taskResult, modelResult] = await Promise.all([getHealth(), listTasks(), getModelConfig()])
      setHealth(healthResult.status)
      setTasks(sortTasks(taskResult))
      setModelConfig(modelResult)
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

  async function handlePlanTask() {
    if (!selectedTask) return
    setLoading(true)
    try {
      const result = await planTask(selectedTask.id)
      setSelectedTask(result.task)
      setTrace(result.trace)
      setNotice(t(language, 'aiPlanDone'))
      await refreshAll()
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
          <NavButton active={view === 'workspace'} onClick={() => setView('workspace')} icon={<FileText size={18} />} label={t(language, 'navWorkspace')} />
          <NavButton active={view === 'preview'} onClick={() => setView('preview')} icon={<Monitor size={18} />} label={t(language, 'navPreview')} />
          <NavButton active={view === 'ai'} onClick={() => setView('ai')} icon={<Sparkles size={18} />} label={t(language, 'navAI')} />
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
            onPlanTask={() => void handlePlanTask()}
          />
        )}

        {view === 'tools' && <ToolsView language={language} />}
        {view === 'workspace' && <WorkspaceView language={language} setNotice={setNotice} />}
        {view === 'preview' && <PreviewView language={language} />}
        {view === 'ai' && <AiView language={language} config={modelConfig} setNotice={setNotice} />}
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
  const [selectedTemplateId, setSelectedTemplateId] = useState(taskTemplates[0].id)
  const [input, setInput] = useState(taskTemplates[0].input)
  const [requestedBy, setRequestedBy] = useState('agent-operator')
  const [riskLevel, setRiskLevel] = useState<RiskLevel>(taskTemplates[0].riskLevel)

  function applyTemplate(template: TaskTemplate) {
    setSelectedTemplateId(template.id)
    setInput(template.input)
    setRiskLevel(template.riskLevel)
  }

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
        <div className="template-grid">
          {taskTemplates.map((template) => (
            <button
              className={selectedTemplateId === template.id ? 'template-card selected' : 'template-card'}
              key={template.id}
              onClick={() => applyTemplate(template)}
              type="button"
            >
              <span>{template.icon}</span>
              <strong>{t(language, template.titleKey)}</strong>
              <small>{t(language, template.descriptionKey)}</small>
            </button>
          ))}
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
  onPlanTask,
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
  onPlanTask: () => void
}) {
  const aiPlan = latestAiPlan(trace)
  const suggestedExecution = useMemo(() => deriveExecutionRequest(task, aiPlan), [task, aiPlan])
  const suggestedExecutionKey = JSON.stringify(suggestedExecution)
  const evidence = summarizeTrace(trace, language)
  const nextStep = recommendedNextStep(task, aiPlan, language)
  const executionReport = useMemo(
    () => generateExecutionReport(task, trace, toolResults, aiPlan, language),
    [task, trace, toolResults, aiPlan, language],
  )

  return (
    <div className="content-grid task-detail-layout">
      <section className="panel task-hero">
        <div className="task-hero-main">
          <div className="task-objective">
            <span className="panel-kicker">{t(language, 'taskObjective')}</span>
            <h2>{task.input}</h2>
            <small>{task.id} / {t(language, 'requestedBy')} {task.requestedBy} / {formatDate(task.createdAt)}</small>
          </div>
          <div className="next-action-card">
            <span>{t(language, 'recommendedNextStep')}</span>
            <strong>{nextStep}</strong>
          </div>
        </div>
        <div className="section-title task-detail-actions">
          <h2>{t(language, 'taskDetail')}</h2>
          <div className="button-row">
            <button onClick={onPlanTask}>
              <Sparkles size={16} /> {aiPlan ? t(language, 'regenerateAiPlan') : t(language, 'runAiPlan')}
            </button>
            <button onClick={onApprove} disabled={task.approvalStatus !== 'Pending'}>
              <Check size={16} /> {t(language, 'approve')}
            </button>
            <button className="danger-button" onClick={onReject} disabled={task.approvalStatus !== 'Pending'}>
              <X size={16} /> {t(language, 'reject')}
            </button>
          </div>
        </div>
        <div className="task-status-strip">
          <StatusChip label={t(language, 'status')} value={task.status} tone={task.status === 'Completed' ? 'success' : 'neutral'} />
          <StatusChip label={t(language, 'risk')} value={task.riskLevel} tone={task.riskLevel === 'Low' ? 'success' : 'warning'} />
          <StatusChip label={t(language, 'approval')} value={task.approvalStatus} tone={task.approvalStatus === 'Pending' ? 'warning' : 'neutral'} />
          <StatusChip label={t(language, 'traceEvents')} value={String(trace.length)} tone="neutral" />
        </div>
        <div className="detail-copy legacy-detail-copy">
          <span>{task.id}</span>
          <p>{task.input}</p>
          <small>{t(language, 'requestedBy')} {task.requestedBy} · {formatDate(task.createdAt)}</small>
        </div>
      </section>

      <section className="panel ai-plan-panel">
        <div className="section-title">
          <h2>{t(language, 'aiSuggestedPlan')}</h2>
          <Sparkles size={18} />
        </div>
        {aiPlan ? (
          <div className="ai-plan-content">{aiPlan}</div>
        ) : (
          <div className="empty-state">
            <Sparkles size={20} />
            <strong>{t(language, 'noAiPlanYet')}</strong>
            <p>{t(language, 'generatePlanFirst')}</p>
            <button onClick={onPlanTask}>
              <Sparkles size={16} /> {t(language, 'runAiPlan')}
            </button>
          </div>
        )}
      </section>

      <ExecutePanel
        key={suggestedExecutionKey}
        language={language}
        suggestedRequest={suggestedExecution}
        onExecute={onExecute}
      />

      <section className="panel evidence-summary-panel">
        <div className="section-title">
          <h2>{t(language, 'executionEvidence')}</h2>
          <div className="trace-stats">
            <Badge value={`completed ${traceStatus.completed}`} />
            <Badge value={`blocked ${traceStatus.blocked}`} />
            <Badge value={`failed ${traceStatus.failed}`} />
          </div>
        </div>
        <div className="evidence-grid">
          {evidence.map((item) => (
            <article className="evidence-card" key={item.label}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
              <small>{item.hint}</small>
            </article>
          ))}
        </div>
        <details className="advanced-trace">
          <summary><Glossary language={language} term="Trace" label={t(language, 'advancedTrace')} /></summary>
          <TraceTimeline language={language} events={trace} />
        </details>
      </section>

      <section className="panel">
        <div className="section-title">
          <h2>{t(language, 'executionReport')}</h2>
          <div className="button-row">
            <button onClick={() => void copyText(executionReport)}>
              <Copy size={16} /> {t(language, 'copyReport')}
            </button>
            <button onClick={() => downloadText(`task-${task.id}-report.md`, executionReport)}>
              <Download size={16} /> {t(language, 'downloadReport')}
            </button>
          </div>
        </div>
        <pre className="report-viewer">{executionReport}</pre>
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

      <section className="panel tool-results-panel">
        <div className="section-title">
          <h2>{t(language, 'toolResults')}</h2>
          <GitBranch size={18} />
        </div>
        <JsonViewer language={language} value={toolResults.length > 0 ? toolResults : { message: t(language, 'noExecutionResult') }} />
      </section>
    </div>
  )
}

function ExecutePanel({
  language,
  suggestedRequest,
  onExecute,
}: {
  language: Language
  suggestedRequest: ExecuteTaskRequest
  onExecute: (payload: ExecuteTaskRequest) => void
}) {
  const [readFilePath, setReadFilePath] = useState(suggestedRequest.readFilePath ?? '')
  const [includeGitDiff, setIncludeGitDiff] = useState(suggestedRequest.includeGitDiff)
  const [scanRoot, setScanRoot] = useState(suggestedRequest.scanRoot ?? '')
  const [scanExtension, setScanExtension] = useState(suggestedRequest.scanExtension ?? '')
  const [logFilePath, setLogFilePath] = useState(suggestedRequest.logFilePath ?? '')

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
    <section className="panel readonly-panel">
      <div className="section-title">
        <h2>{t(language, 'readonlyInspection')}</h2>
        <Play size={18} />
      </div>
      <p className="lead-text compact">{t(language, 'readonlyInspectionHint')}</p>
      <form className="stack-form" onSubmit={submit}>
        <label>
          {t(language, 'readProjectFile')}
          <input value={readFilePath} onChange={(event) => setReadFilePath(event.target.value)} />
        </label>
        <label className="check-row">
          <input type="checkbox" checked={includeGitDiff} onChange={(event) => setIncludeGitDiff(event.target.checked)} />
          {t(language, 'inspectGitChanges')}
        </label>
        <label>
          {t(language, 'scanCodeDirectory')}
          <input value={scanRoot} onChange={(event) => setScanRoot(event.target.value)} />
        </label>
        <label>
          {t(language, 'scanExtension')}
          <input value={scanExtension} onChange={(event) => setScanExtension(event.target.value)} />
        </label>
        <label>
          {t(language, 'analyzeLogFile')}
          <input value={logFilePath} onChange={(event) => setLogFilePath(event.target.value)} placeholder={t(language, 'optionalAbsolutePath')} />
        </label>
        <button type="submit">
          <Play size={16} /> {t(language, 'runReadonlyCheck')}
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

function WorkspaceView({ language, setNotice }: { language: Language; setNotice: (notice: string) => void }) {
  const [config, setConfig] = useState<WorkspaceConfig | null>(null)
  const [files, setFiles] = useState<WorkspaceFileItem[]>([])
  const [selectedFile, setSelectedFile] = useState<WorkspaceFileResponse | null>(null)
  const [root, setRoot] = useState('docs')
  const [extension, setExtension] = useState('md')
  const [busy, setBusy] = useState(false)

  const loadFiles = useCallback(async () => {
    setBusy(true)
    try {
      const [configResult, fileResult] = await Promise.all([
        getWorkspaceConfig(),
        listWorkspaceFiles({ root: root.trim() || undefined, ext: extension.trim() || undefined, maxDepth: 5 }),
      ])
      setConfig(configResult)
      setFiles(fileResult.files)
      setNotice(t(language, 'workspaceLoaded'))
    } catch (error) {
      setNotice(toMessage(error))
    } finally {
      setBusy(false)
    }
  }, [extension, language, root, setNotice])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      void loadFiles()
    }, 0)
    return () => window.clearTimeout(handle)
  }, [loadFiles])

  async function openFile(path: string) {
    setBusy(true)
    try {
      const file = await getWorkspaceFile(path)
      setSelectedFile(file)
      setNotice(`${t(language, 'fileLoaded')}: ${path}`)
    } catch (error) {
      setNotice(toMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="workspace-browser">
      <section className="panel file-list-panel">
        <div className="section-title">
          <h2>{t(language, 'workspaceFiles')}</h2>
          <button disabled={busy} onClick={() => void loadFiles()}>
            <RefreshCw size={16} /> {t(language, 'refresh')}
          </button>
        </div>
        <div className="workspace-filters">
          <label>
            {t(language, 'workspaceRoot')}
            <input value={root} onChange={(event) => setRoot(event.target.value)} placeholder="docs" />
          </label>
          <label>
            {t(language, 'workspaceExtension')}
            <input value={extension} onChange={(event) => setExtension(event.target.value)} placeholder="md" />
          </label>
        </div>
        <div className="workspace-config">
          <small>{t(language, 'workspaceRootPath')}</small>
          <code>{config?.root ?? '-'}</code>
          <small>{t(language, 'workspaceLimit')}: {config?.maxFileSizeBytes ?? '-'}</small>
        </div>
        <div className="file-list">
          {files.map((file) => (
            <button
              className={selectedFile?.path === file.path ? 'file-row selected' : 'file-row'}
              key={file.path}
              onClick={() => void openFile(file.path)}
              type="button"
            >
              <FileText size={15} />
              <span>{file.path}</span>
              <small>{formatBytes(file.sizeBytes)}</small>
            </button>
          ))}
          {files.length === 0 && <p className="muted">{t(language, 'noWorkspaceFiles')}</p>}
        </div>
      </section>

      <section className="panel file-preview-panel">
        <div className="section-title">
          <h2>{selectedFile?.path ?? t(language, 'filePreview')}</h2>
          <div className="button-row">
            <button disabled={!selectedFile} onClick={() => selectedFile && void copyText(selectedFile.path)}>
              <Copy size={16} /> {t(language, 'copyPath')}
            </button>
            <button disabled={!selectedFile?.content} onClick={() => selectedFile?.content && void copyText(selectedFile.content)}>
              <Copy size={16} /> {t(language, 'copyContent')}
            </button>
          </div>
        </div>
        {selectedFile ? <FilePreview language={language} file={selectedFile} /> : <p className="muted">{t(language, 'selectFileToPreview')}</p>}
      </section>
    </div>
  )
}

function FilePreview({ language, file }: { language: Language; file: WorkspaceFileResponse }) {
  if (file.tooLarge) {
    return <p className="muted">{file.message ?? t(language, 'fileTooLarge')}</p>
  }
  if (file.isBinary) {
    return <p className="muted">{t(language, 'binaryFileBlocked')}</p>
  }
  if (!file.content) {
    return <p className="muted">{t(language, 'emptyFile')}</p>
  }
  if (file.extension.toLowerCase() === 'md') {
    return (
      <div className="markdown-preview">
        {file.content.split(/\n{2,}/).map((block, index) => renderMarkdownBlock(block, index))}
      </div>
    )
  }
  return (
    <pre className="code-preview">
      {file.content.split('\n').map((line, index) => `${String(index + 1).padStart(4, ' ')}  ${line}`).join('\n')}
    </pre>
  )
}

function PreviewView({ language }: { language: Language }) {
  const [url, setUrl] = useState('http://localhost:5173')
  const [frameUrl, setFrameUrl] = useState('http://localhost:5173')
  const [device, setDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')

  const width = device === 'desktop' ? 1440 : device === 'tablet' ? 768 : 390

  return (
    <div className="preview-layout">
      <section className="panel preview-toolbar">
        <div className="section-title">
          <h2>{t(language, 'uiPreview')}</h2>
          <div className="button-row">
            <button onClick={() => setFrameUrl(url)}>
              <RefreshCw size={16} /> {t(language, 'refreshPreview')}
            </button>
            <button onClick={() => window.open(frameUrl, '_blank', 'noopener,noreferrer')}>
              <ExternalLink size={16} /> {t(language, 'openNewWindow')}
            </button>
          </div>
        </div>
        <div className="preview-controls">
          <label>
            {t(language, 'previewUrl')}
            <input value={url} onChange={(event) => setUrl(event.target.value)} />
          </label>
          <div className="device-switcher">
            <button className={device === 'desktop' ? 'selected' : ''} onClick={() => setDevice('desktop')} type="button">
              <Monitor size={16} /> Desktop
            </button>
            <button className={device === 'tablet' ? 'selected' : ''} onClick={() => setDevice('tablet')} type="button">
              <Tablet size={16} /> Tablet
            </button>
            <button className={device === 'mobile' ? 'selected' : ''} onClick={() => setDevice('mobile')} type="button">
              <Smartphone size={16} /> Mobile
            </button>
          </div>
        </div>
        <p className="field-hint">{t(language, 'previewReadonlyHint')}</p>
      </section>
      <section className="preview-stage">
        <div className="preview-frame-shell" style={{ width: `${width}px` }}>
          <iframe title={t(language, 'uiPreview')} src={frameUrl} />
        </div>
      </section>
    </div>
  )
}

function AiView({
  language,
  config,
  setNotice,
}: {
  language: Language
  config: ModelConfig | null
  setNotice: (notice: string) => void
}) {
  const [result, setResult] = useState<ModelTestResult | null>(null)
  const [busy, setBusy] = useState(false)

  async function runTest() {
    setBusy(true)
    try {
      const response = await testModel()
      setResult(response)
      setNotice(t(language, 'modelTestDone'))
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
          <h2>{t(language, 'aiConfig')}</h2>
          <Sparkles size={18} />
        </div>
        <div className="model-config-grid">
          <StatusBlock label={t(language, 'aiProvider')} value={config?.provider ?? '-'} tone="neutral" />
          <StatusBlock label={t(language, 'aiModel')} value={config?.model ?? '-'} tone="neutral" />
          <StatusBlock label={t(language, 'aiKeyConfigured')} value={config?.apiKeyConfigured ? t(language, 'aiKeyReady') : t(language, 'aiKeyMissing')} tone={config?.apiKeyConfigured ? 'success' : 'warning'} />
        </div>
        <div className="detail-copy">
          <span>{t(language, 'aiEndpoint')}</span>
          <p>{config?.endpoint ?? '-'}</p>
        </div>
      </section>

      <section className="panel wide">
        <div className="section-title">
          <h2>{t(language, 'aiGateway')}</h2>
          <button disabled={busy} onClick={() => void runTest()}>
            <Sparkles size={16} /> {t(language, 'testModel')}
          </button>
        </div>
        <JsonViewer language={language} value={result ?? { message: t(language, 'testResult') }} />
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

function StatusChip({ label, value, tone }: { label: string; value: string; tone: 'neutral' | 'success' | 'warning' }) {
  return (
    <div className={`status-chip ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
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

function latestAiPlan(events: AgentTraceEvent[]) {
  return [...events].reverse().find((event) => event.name === 'task.ai_planned')?.message
}

function deriveExecutionRequest(task: AgentTask, aiPlan?: string): ExecuteTaskRequest {
  const template = taskTemplates.find((item) => task.input.includes(item.input.slice(0, 48)))
  const fromJson = aiPlan ? parseExecutionRequestFromPlan(aiPlan) : null

  return normalizeExecutionRequest(fromJson ?? template?.executeDefaults ?? inferExecutionRequest(task.input))
}

function parseExecutionRequestFromPlan(plan: string): ExecuteTaskRequest | null {
  const jsonBlocks = [
    ...plan.matchAll(/```(?:json)?\s*([\s\S]*?)```/gi),
    ...plan.matchAll(/({[\s\S]*})/g),
  ]

  for (const match of jsonBlocks) {
    try {
      const parsed = JSON.parse(match[1])
      const candidate = parsed.execution_request ?? parsed.executionRequest ?? parsed.read_only_execution ?? parsed
      if (isRecord(candidate)) {
        return {
          readFilePath: stringValue(candidate.readFilePath ?? candidate.read_file_path),
          includeGitDiff: booleanValue(candidate.includeGitDiff ?? candidate.include_git_diff, true),
          scanRoot: stringValue(candidate.scanRoot ?? candidate.scan_root),
          scanExtension: stringValue(candidate.scanExtension ?? candidate.scan_extension),
          logFilePath: stringValue(candidate.logFilePath ?? candidate.log_file_path),
        }
      }
    } catch {
      // Ignore non-JSON plan text and fall back to heuristic defaults.
    }
  }

  return null
}

function inferExecutionRequest(input: string): ExecuteTaskRequest {
  const lower = input.toLowerCase()
  if (lower.includes('log') || lower.includes('日志')) {
    return { includeGitDiff: false, scanRoot: 'reports', scanExtension: 'md' }
  }
  if (lower.includes('skill')) {
    return { readFilePath: 'docs/frontend-admin-implementation.md', includeGitDiff: false, scanRoot: 'docs', scanExtension: 'md' }
  }
  if (lower.includes('product') || lower.includes('产品') || lower.includes('淘宝') || lower.includes('e-commerce')) {
    return { readFilePath: 'README.md', includeGitDiff: false, scanRoot: 'docs', scanExtension: 'md' }
  }
  if (lower.includes('code') || lower.includes('代码')) {
    return { readFilePath: 'README.md', includeGitDiff: true, scanRoot: 'agent-service', scanExtension: 'cs' }
  }
  return { readFilePath: 'README.md', includeGitDiff: true, scanRoot: '.', scanExtension: 'md' }
}

function normalizeExecutionRequest(request: ExecuteTaskRequest): ExecuteTaskRequest {
  return {
    readFilePath: request.readFilePath,
    includeGitDiff: request.includeGitDiff ?? true,
    scanRoot: request.scanRoot,
    scanExtension: request.scanExtension,
    logFilePath: request.logFilePath,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function stringValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function booleanValue(value: unknown, fallback: boolean) {
  return typeof value === 'boolean' ? value : fallback
}

function recommendedNextStep(task: AgentTask, aiPlan: string | undefined, language: Language) {
  if (task.approvalStatus === 'Pending') return t(language, 'nextApproveThenInspect')
  if (task.approvalStatus === 'Rejected') return t(language, 'nextCreateNewTask')
  if (!aiPlan) return t(language, 'nextGeneratePlan')
  if (task.status === 'Completed') return t(language, 'nextReviewEvidence')
  if (task.status === 'Failed') return t(language, 'nextReviewFailure')
  return t(language, 'nextRunReadonlyCheck')
}

function summarizeTrace(events: AgentTraceEvent[], language: Language) {
  const modelEvents = events.filter((event) => event.name.startsWith('model.')).length
  const toolEvents = events.filter((event) => event.name.startsWith('tool.') || event.toolName !== 'system').length
  const failedEvents = events.filter((event) => event.status === 'failed').length
  const lastEvent = events.at(-1)

  return [
    { label: 'Trace', value: String(events.length), hint: t(language, 'traceTotalEvents') },
    { label: 'AI', value: String(modelEvents), hint: t(language, 'traceModelEvents') },
    { label: 'Tools', value: String(toolEvents), hint: t(language, 'traceReadonlyCalls') },
    { label: t(language, 'traceLatest'), value: lastEvent?.name ?? '-', hint: failedEvents > 0 ? `${failedEvents} ${t(language, 'traceFailed')}` : t(language, 'traceNoFailure') },
  ]
}

function generateExecutionReport(
  task: AgentTask,
  events: AgentTraceEvent[],
  toolResults: ToolCommandResult[],
  aiPlan: string | undefined,
  language: Language,
) {
  const completed = events.filter((event) => event.status === 'completed').length
  const blocked = events.filter((event) => event.status === 'blocked').length
  const failed = events.filter((event) => event.status === 'failed').length
  const tools = Array.from(new Set(events.filter((event) => event.toolName !== 'system').map((event) => event.toolName)))
  const latest = events.at(-1)
  const outputPreview = toolResults
    .map((result, index) => {
      const output = result.standardOutput || result.standardError || ''
      return `- Tool result ${index + 1}: exit=${result.exitCode}, preview=${trimReport(output)}`
    })
    .join('\n')

  if (language === 'en') {
    return `# Task Execution Report

## Objective
${task.input}

## Status
- Task ID: ${task.id}
- Status: ${task.status}
- Risk: ${task.riskLevel}
- Approval: ${task.approvalStatus}

## AI Suggested Plan
${aiPlan || 'No AI plan was generated yet.'}

## Execution Evidence
- Trace events: ${events.length}
- Completed: ${completed}
- Blocked: ${blocked}
- Failed: ${failed}
- Tools: ${tools.join(', ') || 'None'}
- Latest event: ${latest?.name ?? 'None'}

## Tool Result Preview
${outputPreview || 'No tool result is available in this UI session.'}

## Recommended Next Step
${recommendedNextStep(task, aiPlan, language)}
`
  }

  return `# 任务执行报告

## 任务目标
${task.input}

## 当前状态
- 任务 ID：${task.id}
- 状态：${task.status}
- 风险：${task.riskLevel}
- 审批：${task.approvalStatus}

## AI 建议方案
${aiPlan || '尚未生成 AI 建议方案。'}

## 执行证据
- Trace 事件数：${events.length}
- 已完成事件：${completed}
- 阻塞事件：${blocked}
- 失败事件：${failed}
- 工具：${tools.join('、') || '无'}
- 最新事件：${latest?.name ?? '无'}

## 工具结果预览
${outputPreview || '当前 UI 会话暂无工具结果。'}

## 推荐下一步
${recommendedNextStep(task, aiPlan, language)}
`
}

function trimReport(value: string) {
  const normalized = value.replace(/\s+/g, ' ').trim()
  return normalized.length > 180 ? `${normalized.slice(0, 180)}...` : normalized || 'empty'
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
  if (view === 'workspace') return t(language, 'workspace')
  if (view === 'preview') return t(language, 'preview')
  if (view === 'ai') return t(language, 'aiGateway')
  if (view === 'docs') return t(language, 'docs')
  if (view === 'skills') return t(language, 'skills')
  return t(language, 'dashboard')
}

function renderMarkdownBlock(block: string, index: number) {
  const trimmed = block.trim()
  if (trimmed.startsWith('### ')) return <h3 key={index}>{trimmed.slice(4)}</h3>
  if (trimmed.startsWith('## ')) return <h2 key={index}>{trimmed.slice(3)}</h2>
  if (trimmed.startsWith('# ')) return <h1 key={index}>{trimmed.slice(2)}</h1>
  if (trimmed.startsWith('```')) return <pre key={index}>{trimmed.replace(/^```[a-z]*\n?/i, '').replace(/```$/, '')}</pre>
  if (trimmed.startsWith('- ')) {
    return (
      <ul key={index}>
        {trimmed.split('\n').map((line) => <li key={line}>{line.replace(/^- /, '')}</li>)}
      </ul>
    )
  }
  return <p key={index}>{trimmed}</p>
}

function formatBytes(value: number) {
  if (value < 1024) return `${value} B`
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

function toMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unknown error'
}

async function copyText(value: string) {
  await navigator.clipboard.writeText(value)
}

function downloadText(filename: string, value: string) {
  const blob = new Blob([value], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export default App
