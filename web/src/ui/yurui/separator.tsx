import type { ComponentProps } from 'react'
import { cva } from 'class-variance-authority'
import { cn } from './utils'

const separatorVariants = cva('block shrink-0', {
  variants: {
    orientation: {
      horizontal: 'yurui-stitch',
      vertical: 'yurui-stitch-side w-px',
    },
  },
})

type SeparatorProps = ComponentProps<'span'> & {
  orientation?: 'horizontal' | 'vertical'
  decorative?: boolean
}

export function Separator({ orientation = 'horizontal', decorative = true, className, ...props }: SeparatorProps) {
  return <span data-slot="separator" data-orientation={orientation} role={decorative ? undefined : 'separator'} aria-hidden={decorative || undefined} aria-orientation={decorative ? undefined : orientation} className={cn(separatorVariants({ orientation }), className)} {...props} />
}
