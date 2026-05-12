export type TaskStatus =
  | 'Created'
  | 'Planning'
  | 'Running'
  | 'WaitingForApproval'
  | 'Completed'
  | 'Failed'

export type RiskLevel = 'Low' | 'Medium' | 'High'

export type ApprovalStatus = 'NotRequired' | 'Pending' | 'Approved' | 'Rejected'

export type AgentTask = {
  id: string
  input: string
  requestedBy: string
  status: TaskStatus
  createdAt: string
  riskLevel: RiskLevel
  approvalStatus: ApprovalStatus
}

export type AgentTraceEvent = {
  sequence: number
  name: string
  toolName: string
  status: string
  message: string
  attributes: Record<string, string>
  occurredAt: string
}

export type ExecuteTaskRequest = {
  readFilePath?: string
  includeGitDiff: boolean
  scanRoot?: string
  scanExtension?: string
  logFilePath?: string
}

export type ToolCommandResult = {
  exitCode: number
  standardOutput: string
  standardError: string
}

export type ExecuteTaskResult = {
  task: AgentTask
  trace: AgentTraceEvent[]
  toolResults: ToolCommandResult[]
}

export type TraceExportResponse = {
  taskId: string
  input: string
  status: TaskStatus
  riskLevel: RiskLevel
  approvalStatus: ApprovalStatus
  trace: AgentTraceEvent[]
}

export type CreateTaskRequest = {
  input: string
  requestedBy: string
  riskLevel: RiskLevel
}
