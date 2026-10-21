import { X } from 'lucide-react'
import { IconButton } from '../ui/yurui/icon-button'
import { Notice } from '../ui/yurui/notice'
import { FloatingNotice } from '../ui/yurui/floating-notice'

export type FeedbackMessage = { message: string; tone: 'ok' | 'fail' | 'mute' }

const labels = { ok: '成功', fail: '失败', mute: '提示' }

export function Feedback({ value, className, floating = false, onClose }: { value: FeedbackMessage | null; className?: string; floating?: boolean; onClose?: () => void }) {
  if (!value) return null
  const Container = floating ? FloatingNotice : Notice
  return <Container tone={value.tone} label={labels[value.tone]} className={className} action={onClose && <IconButton size="sm" label="关闭提示" onClick={onClose}><X /></IconButton>}>
    {value.message}
  </Container>
}
