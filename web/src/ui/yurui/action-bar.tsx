import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './utils'

const actionBarVariants = cva('selection-bar yurui-pop fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-3 whitespace-nowrap', {
  variants: {
    variant: {
      live: '[border-top:4px_solid_var(--club-stripe)]',
      showcase: '',
    },
  },
  defaultVariants: { variant: 'live' },
})

export function ActionBar({ className, variant, ...props }: ComponentProps<'aside'> & VariantProps<typeof actionBarVariants>) {
  return <aside className={cn(actionBarVariants({ variant }), className)} {...props} />
}

export function SelectionCount({ className, ...props }: ComponentProps<'span'>) {
  return <span className={cn('flex items-center gap-[7px] text-[12px] [&>svg]:text-accent-foreground', className)} {...props} />
}

export function ActionBarDivider() {
  return <span className="yurui-stitch-side h-6 w-px flex-none" aria-hidden="true" />
}
