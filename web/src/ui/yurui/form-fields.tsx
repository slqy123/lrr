import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './utils'

const formFieldsVariants = cva('flex flex-col gap-5 [&>label:not([data-slot=field-label])]:flex [&>label:not([data-slot=field-label])]:flex-col [&>label:not([data-slot=field-label])]:gap-2 [&>label:not([data-slot=field-label])]:text-[13px]', {
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
