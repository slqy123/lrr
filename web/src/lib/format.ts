export const statusLabels: Record<string, string> = {
  pending: '排队',
  running: '下载中',
  done: '完成',
  failed: '待重试',
  dead: '失败',
  cancelled: '已取消',
}

export const statusTone: Record<string, string> = {
  pending: 'bg-line text-muted',
  running: 'bg-accent/15 text-accent',
  done: 'bg-ok/15 text-ok',
  failed: 'bg-warn/15 text-warn',
  dead: 'bg-err/15 text-err',
  cancelled: 'bg-line text-muted',
}

export function relativeTime(timestamp: number | null | undefined): string {
  if (!timestamp) return '—'
  const seconds = Math.max(0, Math.floor(Date.now() / 1000 - timestamp))
  if (seconds < 60) return `${seconds} 秒前`
  if (seconds < 3600) return `${Math.floor(seconds / 60)} 分钟前`
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} 小时前`
  return `${Math.floor(seconds / 86400)} 天前`
}

export function secondsUntil(timestamp: number | null | undefined): string {
  if (!timestamp) return '—'
  const seconds = Math.max(0, Math.ceil(timestamp - Date.now() / 1000))
  if (seconds === 0) return '即将重试'
  if (seconds < 60) return `${seconds} 秒后重试`
  return `${Math.ceil(seconds / 60)} 分钟后重试`
}
