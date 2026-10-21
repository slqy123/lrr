import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './utils'

export const toolbarVariants = cva('flex items-center gap-3 mb-[22px]', {
  variants: {
    variant: {
      live: 'flex-wrap justify-start',
      showcase: 'justify-between',
    },
  },
  defaultVariants: { variant: 'live' },
})

export const toolbarGroupVariants = cva('flex flex-wrap items-center', {
  variants: {
    variant: {
      selection: 'selection-groups yurui-selection-controls yurui-well gap-x-[18px] gap-y-3 px-[14px] py-[10px] max-[1150px]:gap-[10px]',
      summary: 'min-w-0 gap-x-[10px] gap-y-1 text-[12px] text-muted-foreground [overflow-wrap:anywhere]',
      health: 'gap-2',
      density: 'yurui-well flex-nowrap gap-[2px] p-[3px]',
      pager: 'yurui-well flex-nowrap gap-[5px] p-[3px] [&>span]:min-w-[18px] [&>span]:text-center [&>span]:text-accent-foreground [&>span]:[font:500_14px/1_var(--font-yurui-display)]',
    },
  },
  defaultVariants: { variant: 'selection' },
})

export function ResultStat({ className, ...props }: ComponentProps<'span'>) {
  return <span className={cn('inline-flex items-center gap-[5px] whitespace-nowrap tabular-nums', className)} {...props} />
}

export function ToolbarGroup({ className, variant, ...props }: ComponentProps<'div'> & VariantProps<typeof toolbarGroupVariants>) {
  return <div className={cn(toolbarGroupVariants({ variant }), className)} {...props} />
}
