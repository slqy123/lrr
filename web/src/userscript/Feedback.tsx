import { X } from 'lucide-react'
import { StatusBadge } from '../ui/anibt/badge'
import { Button } from '../ui/anibt/button'

export type FeedbackMessage = { message: string; tone: 'ok' | 'fail' | 'mute' }

const labels = { ok: '成功', fail: '失败', mute: '提示' }

export function Feedback({ value, className, onClose }: { value: FeedbackMessage | null; className: string; onClose?: () => void }) {
  if (!value) return null
  return <div className={`operation-feedback ${className}`} role="status">
    <StatusBadge tone={value.tone}>{labels[value.tone]}</StatusBadge>
    <span className="feedback-message">{value.message}</span>
    {onClose && <Button variant="ghost" size="icon-sm" aria-label="关闭提示" onClick={onClose}><X /></Button>}
  </div>
}
