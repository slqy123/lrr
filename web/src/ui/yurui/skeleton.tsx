import type { ComponentProps } from 'react'
import { cn } from './utils'

export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="skeleton" aria-hidden="true" className={cn('animate-pulse rounded-[6px] bg-yurui-deep2 motion-reduce:animate-none', className)} {...props} />
}
