import type {
  AgentTask,
  AgentTraceEvent,
  CreateTaskRequest,
  ExecuteTaskRequest,
  ExecuteTaskResult,
  TraceExportResponse,
} from './types'

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

export function getTrace(id: string) {
  return request<AgentTraceEvent[]>(`/tasks/${id}/trace`)
}

export function exportTrace(id: string) {
  return request<TraceExportResponse>(`/tasks/${id}/trace/export`)
}
