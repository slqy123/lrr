export type GalleryState = 'missing' | 'downloaded' | 'duplicate' | 'queued' | 'checking' | 'error'
export const stateLabels: Record<GalleryState, string> = {
  missing: '未收录', downloaded: '已入库', duplicate: '疑似重复', queued: '在队列中', checking: '检查中', error: '查询异常',
}
export interface Archive {
  id: string
  title: string
  tags?: string
  pagecount?: number
  filesize?: number
  filename?: string
  extension?: string
  progress?: number
}
export interface Gallery {
  id: number
  url: string
  title: string
  author: string
  category: string
  pages: number | null
  cover: string
  language: string
  rating?: { image: string; position: string; opacity: string }
  posted?: string
  links?: { title: string; url: string }[]
  status: GalleryState
  hits: Archive[]
  search?: string
  error?: string
  queue?: { label: string; error?: string; attempts: number; max_attempts: number; next_attempt_at?: number }
}
export function displayState(item: Gallery): GalleryState {
  return item.status === 'downloaded' || item.status === 'checking' ? item.status : item.queue ? item.queue.label === '队列查询失败' ? 'error' : 'queued' : item.status
}
