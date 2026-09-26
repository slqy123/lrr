export interface Stats {
  pending: number
  running: number
  done: number
  failed: number
  dead: number
  cancelled: number
  exhausted: number
  paused: boolean
  pause_reason: string
}

export interface Task {
  id: number
  url: string
  status: string
  priority: number
  attempts: number
  max_attempts: number
  lrr_job_id: number | null
  lrr_archive_id: string | null
  title: string | null
  error: string
  source: string
  next_attempt_at: number
  created_at: number
  updated_at: number
  submitted_at: number | null
  finished_at: number | null
}

export interface TaskList {
  items: Task[]
  total: number
}

export interface AddResult {
  ok: boolean
  added: number
  duplicates: number
}

export interface MutationResult {
  ok: boolean
  affected: number
}

export interface Health {
  db: boolean
  worker_alive: boolean
  paused: boolean
  lrr: boolean
  lrr_error: string
}
