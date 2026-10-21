import type { AddResult, Health, MutationResult, Stats, Task, TaskList } from './types'

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`)
  }
  return (await response.json()) as T
}

export interface TaskQuery {
  status?: string
  q?: string
  limit?: number
  offset?: number
}

export const api = {
  stats: () => request<Stats>('/api/stats'),
  health: () => request<Health>('/api/health'),
  tasks: (query: TaskQuery = {}) => {
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') params.set(key, String(value))
    }
    const suffix = params.size > 0 ? `?${params}` : ''
    return request<TaskList>(`/api/tasks${suffix}`)
  },
  add: (urls: string[], priority = 0) =>
    request<AddResult>('/api/tasks', { method: 'POST', body: JSON.stringify({ urls, priority }) }),
  retry: (id: number) => request<Task>(`/api/tasks/${id}/retry`, { method: 'POST' }),
  cancel: (id: number) => request<Task>(`/api/tasks/${id}/cancel`, { method: 'POST' }),
  remove: (id: number) => request<MutationResult>(`/api/tasks/${id}`, { method: 'DELETE' }),
  retryFailed: () => request<MutationResult>('/api/tasks/retry-failed', { method: 'POST' }),
  pause: () => request<{ paused: boolean }>('/api/control/pause', { method: 'POST' }),
  resume: () => request<{ paused: boolean }>('/api/control/resume', { method: 'POST' }),
  recheck: () => request<MutationResult>('/api/maintenance/urlfinder-recheck', { method: 'POST' }),
}
