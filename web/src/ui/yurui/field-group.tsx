import type { ComponentProps, ReactNode } from 'react'
import { cn } from './utils'

type FieldGroupProps = ComponentProps<'fieldset'> & {
  label: ReactNode
}

export function FieldGroup({ label, children, className, ...props }: FieldGroupProps) {
  return <fieldset data-slot="field-group" className={cn('min-w-0 m-0 border-0 p-0 text-[13px]', className)} {...props}>
    <legend className="mb-2 p-0">{label}</legend>
    {children}
  </fieldset>
}
