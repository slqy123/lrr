import { X } from 'lucide-react'
import { StatusBadge } from '../ui/yurui/badge'
import { Button } from '../ui/yurui/button'
import { cn } from '../ui/yurui/utils'

export type FeedbackMessage = { message: string; tone: 'ok' | 'fail' | 'mute' }

const labels = { ok: '成功', fail: '失败', mute: '提示' }

export function Feedback({ value, className, onClose }: { value: FeedbackMessage | null; className: string; onClose?: () => void }) {
  if (!value) return null
  return <div className={cn('flex items-center gap-[10px] [&>[data-slot=status-badge]]:shrink-0 [&>button]:shrink-0', className)} role="status">
    <StatusBadge tone={value.tone}>{labels[value.tone]}</StatusBadge>
    <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{value.message}</span>
    {onClose && <Button variant="ghost" size="icon-sm" aria-label="关闭提示" onClick={onClose}><X /></Button>}
  </div>
}
