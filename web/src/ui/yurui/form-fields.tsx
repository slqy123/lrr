import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './utils'

const formFieldsVariants = cva('flex flex-col gap-5', {
  variants: {
    variant: {
      default: 'py-[10px]',
      inset: 'pt-4 pb-0',
    },
  },
  defaultVariants: { variant: 'default' },
})

export function FormFields({ className, variant, ...props }: ComponentProps<'div'> & VariantProps<typeof formFieldsVariants>) {
  return <div className={cn(formFieldsVariants({ variant }), className)} {...props} />
}
