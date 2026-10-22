import type { ComponentProps, ReactNode } from 'react'
import { cn } from './utils'

type DescriptionListProps = ComponentProps<'dl'> & {
  variant?: 'default' | 'grouped'
}

export function DescriptionList({ variant = 'default', className, ...props }: DescriptionListProps) {
  return <dl data-slot="description-list" data-variant={variant} className={cn('yurui-description-list', className)} {...props} />
}

export function DescriptionItem({ term, children, ...props }: ComponentProps<'div'> & { term: ReactNode }) {
  return <div data-slot="description-item" {...props}><dt>{term}</dt><dd>{children}</dd></div>
}
