import type { ComponentProps, ReactNode } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './utils'

const descriptionListVariants = cva('grid gap-3 m-0 [&>div]:grid [&_dd]:m-0', {
  variants: {
    variant: {
      default: 'text-[12px] [&>div]:grid-cols-[64px_minmax(0,1fr)] [&>div]:items-baseline [&>div]:gap-2 [&_dt]:text-muted-foreground [&_dd]:[overflow-wrap:anywhere]',
      grouped: '[&>div]:grid-cols-[72px_minmax(0,1fr)] [&>div]:gap-[10px] [&>div]:items-start [&_dt]:flex [&_dt]:items-center [&_dt]:gap-[6px] [&_dt]:min-h-6 [&_dt]:text-[12px] [&_dt]:font-[650] [&_dt]:[overflow-wrap:anywhere] [&_dt]:before:content-[""] [&_dt]:before:w-[3px] [&_dt]:before:h-3 [&_dt]:before:flex-none [&_dt]:before:rounded-[2px] [&_dt]:before:bg-ring [&_dt]:before:opacity-[.65] [&_dt_small]:text-muted-foreground [&_dt_small]:text-[10px] [&_dt_small]:font-normal [&_dt_small]:tabular-nums [&_dd]:min-w-0',
    },
  },
  defaultVariants: { variant: 'default' },
})

export function DescriptionList({ variant, className, ...props }: ComponentProps<'dl'> & VariantProps<typeof descriptionListVariants>) {
  return <dl data-slot="description-list" className={cn(descriptionListVariants({ variant }), className)} {...props} />
}

export function DescriptionItem({ term, children, ...props }: ComponentProps<'div'> & { term: ReactNode }) {
  return <div data-slot="description-item" {...props}><dt>{term}</dt><dd>{children}</dd></div>
}
