import type { ComponentProps } from 'react'
import { cn } from './utils'

export function InputGroup({ className, ...props }: ComponentProps<'div'>) {
  return <div data-slot="input-group" className={cn('yurui-input-group', className)} {...props} />
}
