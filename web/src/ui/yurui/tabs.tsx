import type { ComponentProps, ReactNode } from 'react'
import { cn } from './utils'

type TabsListProps<T extends string> = Omit<ComponentProps<'nav'>, 'onChange' | 'children'> & {
  items: readonly { key: T; label: ReactNode }[]
  value: T
  onValueChange: (value: T) => void
  variant?: 'default' | 'unstyled'
  panelId: string
  id: string
}

export function TabsList<T extends string>({ items, value, onValueChange, panelId, id, variant = 'default', className, ...props }: TabsListProps<T>) {
  return <nav role="tablist" data-slot="tabs-list" className={cn(variant === 'default' && 'yurui-tabs', className)} {...props}>
    {items.map((item, index) => <button key={item.key} type="button" role="tab" id={`${id}-${item.key}`} aria-controls={panelId} aria-selected={value === item.key} tabIndex={value === item.key ? 0 : -1} className={cn('focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid', variant === 'default' && ['yurui-tab', value === item.key && 'yurui-tab-on'])} onClick={() => onValueChange(item.key)} onKeyDown={event => {
      const next = event.key === 'ArrowRight' ? (index + 1) % items.length : event.key === 'ArrowLeft' ? (index + items.length - 1) % items.length : event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : -1
      if (next < 0) return
      event.preventDefault()
      onValueChange(items[next].key)
      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role=tab]')[next]?.focus()
    }}>{item.label}</button>)}
  </nav>
}

export function TabsPanel(props: ComponentProps<'div'>) {
  return <div data-slot="tabs-panel" role="tabpanel" {...props} />
}
