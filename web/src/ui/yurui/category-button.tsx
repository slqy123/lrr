import type { ComponentProps } from 'react'
import { Button } from './button'
import { cn } from './utils'

type CategoryButtonProps = Omit<ComponentProps<typeof Button>, 'variant' | 'aria-pressed' | 'asChild'> & {
  checked: boolean
  indicator?: boolean
}

export function CategoryButton({ checked, indicator = true, children, className, size = 'sm', type = 'button', ...props }: CategoryButtonProps) {
  return <Button type={type} size={size} variant={checked ? 'secondary' : 'ghost'} aria-pressed={checked} className={cn('category-filter yurui-category-filter yurui-category-key gap-[6px] border border-transparent px-3 aria-[pressed=false]:text-(--category-foreground) aria-[pressed=false]:opacity-[.45] aria-[pressed=false]:border-input aria-[pressed=false]:border-dashed aria-[pressed=false]:bg-card aria-[pressed=false]:shadow-none', className)} {...props}>
    {indicator && <span aria-hidden="true">{checked ? '✓' : '○'}</span>}
    {children}
  </Button>
}
