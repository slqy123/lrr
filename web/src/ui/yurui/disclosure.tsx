import type { ComponentProps, ReactNode } from 'react'
import { cn } from './utils'

type DisclosureProps = ComponentProps<'details'> & {
  summary: ReactNode
}

export function Disclosure({ summary, children, className, ...props }: DisclosureProps) {
  return <details data-slot="disclosure" className={cn('yurui-well px-[14px] py-3 [&>summary]:cursor-pointer [&>summary]:text-[13px] [&>summary]:font-semibold', className)} {...props}>
    <summary>{summary}</summary>
    {children}
  </details>
}
