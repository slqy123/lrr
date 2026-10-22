import type { ComponentProps } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './button'
import { IconButton } from './icon-button'
import { cn } from './utils'

export function Pagination({ className, ...props }: ComponentProps<'nav'>) {
  return <nav data-slot="pagination" className={cn('yurui-pagination', className)} {...props} />
}

type PaginationStepProps = {
  direction: 'previous' | 'next'
  label: string
  href?: string
}

export function PaginationStep({ direction, label, href }: PaginationStepProps) {
  const Icon = direction === 'previous' ? ChevronLeft : ChevronRight
  return href ? <Button asChild size="icon-sm" variant="ghost"><a href={href} aria-label={label}><Icon aria-hidden="true" /></a></Button> : <IconButton size="sm" label={label} className="opacity-30" disabled><Icon aria-hidden="true" /></IconButton>
}
