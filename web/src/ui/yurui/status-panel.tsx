import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './utils'

export const statusPanelVariants = cva('flex items-center', {
  variants: {
    variant: {
      empty: 'min-h-[360px] flex-col justify-center gap-[14px] text-center text-muted-foreground [&>svg]:size-[40px] [&>svg]:text-(--yurui-mark) [&_h3]:text-[18px] [&_h3]:font-bold [&_h3]:text-foreground',
      connection: 'mb-6 justify-between gap-4 px-5 py-4',
    },
    surface: {
      plain: '',
      sheet: 'yurui-sheet',
    },
  },
  defaultVariants: { variant: 'empty', surface: 'sheet' },
})

export function StatusPanel({ className, variant, surface, ...props }: ComponentProps<'div'> & VariantProps<typeof statusPanelVariants>) {
  return <div data-slot="status-panel" className={cn(statusPanelVariants({ variant, surface }), className)} {...props} />
}
