import type { ComponentProps } from 'react'
import { cn } from './utils'

export function TextLink({ className, ...props }: ComponentProps<'a'>) {
  return <a data-slot="text-link" className={cn('text-accent-foreground underline underline-offset-[3px]', className)} {...props} />
}
