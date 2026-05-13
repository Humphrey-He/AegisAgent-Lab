import type {
  AgentTask,
  AgentTraceEvent,
  CreateTaskRequest,
  ExecuteTaskRequest,
  ExecuteTaskResult,
  TraceExportResponse,
} from './types'

export type SkillFileRecord = {
  id: string
  name: string
  source: string
  content: string
  directory: string
  filePath: string
  createdAt: string
  updatedAt: string
}

export type SaveSkillFilePayload = {
  name: string
  source: string
  content: string
  directory?: string
}

export type SkillDirectoryOption = {
  path: string
  name: string
  isRoot: boolean
}

export type SkillDirectoryOptionsResponse = {
  defaultDirectory: string
  currentDirectory: string
  roots: SkillDirectoryOption[]
  children: SkillDirectoryOption[]
}

export type ModelConfig = {
  provider: string
  endpoint: string
  model: string
  apiKeyConfigured: boolean
}

export type ModelTestResult = {
  config: ModelConfig
  content: string
  latencyMs: number
  totalTokens?: number
}

export type ModelResponse = {
  provider: string
  endpoint: string
  model: string
  content: string
  latencyMs: number
  totalTokens?: number
}

export type TaskPlanResult = {
  task: AgentTask
  trace: AgentTraceEvent[]
  modelResponse: ModelResponse
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? '/api'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
    ...init,
  })

  if (!response.ok) {
    const detail = await response.text()
    throw new Error(detail || `Request failed with ${response.status}`)
  }

  return response.json() as Promise<T>
}

export function getHealth() {
  return request<{ status: string }>('/health')
}

export function getModelConfig() {
  return request<ModelConfig>('/models/config')
}

export function testModel() {
  return request<ModelTestResult>('/models/test', { method: 'POST' })
}

export function listTasks() {
  return request<AgentTask[]>('/tasks')
}

export function getTask(id: string) {
  return request<AgentTask>(`/tasks/${id}`)
}

export function createTask(payload: CreateTaskRequest) {
  return request<AgentTask>('/tasks', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function approveTask(id: string) {
  return request<AgentTask>(`/tasks/${id}/approve`, { method: 'POST' })
}

export function rejectTask(id: string) {
  return request<AgentTask>(`/tasks/${id}/reject`, { method: 'POST' })
}

export function executeTask(id: string, payload: ExecuteTaskRequest) {
  return request<ExecuteTaskResult>(`/tasks/${id}/execute`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export function planTask(id: string) {
  return request<TaskPlanResult>(`/tasks/${id}/plan`, { method: 'POST' })
}

export function getTrace(id: string) {
  return request<AgentTraceEvent[]>(`/tasks/${id}/trace`)
}

export function exportTrace(id: string) {
  return request<TraceExportResponse>(`/tasks/${id}/trace/export`)
}

export function getSkillDirectory() {
  return request<{ directory: string }>('/skills/directory')
}

export function getSkillDirectories(directory?: string) {
  const query = directory ? `?directory=${encodeURIComponent(directory)}` : ''
  return request<SkillDirectoryOptionsResponse>(`/skills/directories${query}`)
}

export function listSkillFiles(directory?: string) {
  const query = directory ? `?directory=${encodeURIComponent(directory)}` : ''
  return request<SkillFileRecord[]>(`/skills${query}`)
}

export function saveSkillFile(payload: SaveSkillFilePayload) {
  return request<SkillFileRecord>('/skills', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
