import type { ComponentProps } from 'react'
import { cn } from './utils'

export function InputGroup({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="input-group" className={cn('relative flex-1 [&>svg]:absolute [&>svg]:left-3 [&>svg]:top-1/2 [&>svg]:[transform:translateY(-50%)] [&>svg]:text-muted-foreground [&_input]:pl-[38px]', className)} {...props} />
}
