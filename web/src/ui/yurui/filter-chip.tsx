import type { ComponentProps } from 'react'
import { Check } from 'lucide-react'
import { cva } from 'class-variance-authority'
import { cn } from './utils'

const filterChipVariants = cva('yurui-chip', {
  variants: { checked: { true: 'yurui-chip-on', false: '' } },
})

type FilterChipProps = Omit<ComponentProps<'button'>, 'aria-pressed'> & {
  checked: boolean
  indicator?: boolean
}

export function FilterChip({ checked, indicator = true, children, className, type = 'button', ...props }: FilterChipProps) {
  return <button type={type} data-slot="filter-chip" aria-pressed={checked} className={cn(filterChipVariants({ checked }), className)} {...props}>
    {checked && indicator && <Check size={14} aria-hidden="true" />}
    {children}
  </button>
}
