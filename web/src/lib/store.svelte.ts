import { api, type TaskQuery } from './api'
import type { Stats, Task } from './types'

const emptyStats = (): Stats => ({
  pending: 0,
  running: 0,
  done: 0,
  failed: 0,
  dead: 0,
  cancelled: 0,
  exhausted: 0,
  paused: false,
  pause_reason: '',
})

class QueueStore {
  stats = $state<Stats>(emptyStats())
  tasks = $state<Task[]>([])
  total = $state(0)
  query = $state<TaskQuery>({ status: '', q: '', limit: 50, offset: 0 })
  online = $state(false)
  error = $state('')

  async refresh(): Promise<void> {
    try {
      const [stats, tasks] = await Promise.all([
        api.stats(),
        api.tasks({
          status: this.query.status || undefined,
          q: this.query.q || undefined,
          limit: this.query.limit,
          offset: this.query.offset,
        }),
      ])
      this.stats = stats
      this.tasks = tasks.items
      this.total = tasks.total
      this.online = true
      this.error = ''
    } catch (cause) {
      this.online = false
      this.error = cause instanceof Error ? cause.message : String(cause)
    }
  }

  async mutate(action: () => Promise<unknown>): Promise<void> {
    try {
      await action()
      await this.refresh()
    } catch (cause) {
      this.error = cause instanceof Error ? cause.message : String(cause)
    }
  }

  async pause(): Promise<void> {
    await this.mutate(() => api.pause())
  }

  async resume(): Promise<void> {
    await this.mutate(() => api.resume())
  }
}

export const store = new QueueStore()
