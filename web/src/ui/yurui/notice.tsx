import type { ComponentProps, ReactNode } from 'react'
import { StatusBadge, type StatusBadgeProps } from './badge'
import { cn } from './utils'

type NoticeProps = ComponentProps<'div'> & {
  tone?: StatusBadgeProps['tone']
  label?: ReactNode
  action?: ReactNode
}

export function Notice({ tone, label, action, children, className, ...props }: NoticeProps) {
  return <div data-slot="notice" role="status" className={cn('flex items-center gap-[10px] [&>[data-slot=status-badge]]:shrink-0 [&>button]:shrink-0', className)} {...props}>
    {label && <StatusBadge tone={tone}>{label}</StatusBadge>}
    <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{children}</span>
    {action}
  </div>
}
