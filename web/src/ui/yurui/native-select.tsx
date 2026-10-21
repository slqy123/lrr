import type { ComponentProps } from 'react'
import { cn } from './utils'

export function NativeSelect({ className, ...props }: ComponentProps<'select'>) {
  return <select data-slot="native-select" className={cn('yurui-input', className)} {...props} />
}
