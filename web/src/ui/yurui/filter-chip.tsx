import type { ComponentProps } from 'react'
import { Check } from 'lucide-react'
import { cn } from './utils'

type FilterChipProps = Omit<ComponentProps<'button'>, 'aria-pressed'> & {
  checked: boolean
  indicator?: boolean
}

export function FilterChip({ checked, indicator = true, children, className, type = 'button', ...props }: FilterChipProps) {
  return <button type={type} data-slot="filter-chip" aria-pressed={checked} className={cn('yurui-chip', className)} {...props}>
    {checked && indicator && <Check size={14} aria-hidden="true" />}
    {children}
  </button>
}
