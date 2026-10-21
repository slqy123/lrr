import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './utils'
import { Separator } from './separator'

const actionBarVariants = cva('selection-bar yurui-pop fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-3 whitespace-nowrap', {
  variants: {
    variant: {
      accent: '[border-top:4px_solid_var(--club-stripe)]',
      plain: '',
    },
  },
  defaultVariants: { variant: 'accent' },
})

export function ActionBar({ className, variant, ...props }: ComponentProps<'aside'> & VariantProps<typeof actionBarVariants>) {
  return <aside className={cn(actionBarVariants({ variant }), className)} {...props} />
}

export function SelectionCount({ className, ...props }: ComponentProps<'span'>) {
  return <span className={cn('flex items-center gap-[7px] text-[12px] [&>svg]:text-accent-foreground', className)} {...props} />
}

export function ActionBarDivider() {
  return <Separator orientation="vertical" className="h-6 flex-none" />
}
