import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from './utils'

const fieldLabelVariants = cva('flex items-center gap-[10px] text-[13px]', {
  variants: {
    variant: {
      check: '',
      selection: 'cursor-pointer gap-[7px] text-[12px] has-[[data-slot=checkbox]:disabled]:cursor-not-allowed has-[[data-slot=checkbox]:disabled]:opacity-[.45]',
      file: 'flex-wrap [&_input]:w-full [&_input]:text-[12px]',
    },
  },
  defaultVariants: { variant: 'check' },
})

export function FieldLabel({ className, variant, ...props }: ComponentProps<'label'> & VariantProps<typeof fieldLabelVariants>) {
  return <label data-slot="field-label" className={cn(fieldLabelVariants({ variant }), className)} {...props} />
}
