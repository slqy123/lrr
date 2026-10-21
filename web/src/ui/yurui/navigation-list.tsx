import type { ComponentProps } from 'react'
import { cn } from './utils'

export function NavigationList({ className, ...props }: ComponentProps<'nav'>) {
  return <nav data-slot="navigation-list" className={cn('yurui-menu', className)} {...props} />
}

export function NavigationLink({ className, ...props }: ComponentProps<'a'>) {
  return <a data-slot="navigation-link" className={cn('yurui-menu-item h-auto min-h-8 py-[6px] [overflow-wrap:anywhere] focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:bg-accent focus-visible:text-accent-foreground', className)} {...props} />
}
