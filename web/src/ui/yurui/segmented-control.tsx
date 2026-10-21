import type { ComponentProps, ReactNode } from 'react'
import { Button } from './button'
import { cn } from './utils'

type SegmentedControlProps<T extends string> = Omit<ComponentProps<'div'>, 'children' | 'onChange'> & {
  items: readonly { value: T; label: string; content: ReactNode; title?: string }[]
  value: T
  onValueChange: (value: T) => void
  size?: 'sm' | 'icon-sm'
  disabled?: boolean
}

export function SegmentedControl<T extends string>({ items, value, onValueChange, size = 'sm', disabled, className, ...props }: SegmentedControlProps<T>) {
  return <div data-slot="segmented-control" role="group" className={cn('yurui-well flex flex-nowrap items-center gap-[2px] p-[3px]', className)} {...props}>
    {items.map(item => <Button key={item.value} size={size} variant={value === item.value ? 'secondary' : 'ghost'} disabled={disabled} aria-label={item.label} aria-pressed={value === item.value} title={item.title} onClick={() => onValueChange(item.value)}>{item.content}</Button>)}
  </div>
}
