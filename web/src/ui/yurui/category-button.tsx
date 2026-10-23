import type { ComponentProps } from 'react'
import { Button } from './button'
import { cn } from './utils'

type CategoryButtonProps = Omit<ComponentProps<typeof Button>, 'variant' | 'aria-pressed' | 'asChild'> & {
  checked: boolean
  indicator?: boolean
}

export function CategoryButton({ checked, indicator = true, children, className, size = 'sm', type = 'button', ...props }: CategoryButtonProps) {
  return <Button type={type} size={size} variant="category" aria-pressed={checked} className={cn('category-filter gap-[6px] px-3', className)} {...props}>
    {indicator && <span aria-hidden="true">{checked ? '✓' : '○'}</span>}
    {children}
  </Button>
}
