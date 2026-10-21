import { useId, type ComponentProps, type ReactNode } from 'react'
import { cn } from './utils'

type FieldControlProps = {
  id: string
  'aria-label'?: string
  'aria-describedby'?: string
  'aria-invalid'?: true
}

type FormFieldProps = Omit<ComponentProps<'div'>, 'children'> & {
  label: ReactNode
  description?: ReactNode
  error?: ReactNode
  children: (props: FieldControlProps) => ReactNode
}

export function FormField({ id, label, description, error, children, className, ...props }: FormFieldProps) {
  const generatedId = useId()
  const controlId = id ?? generatedId
  const message = error || description
  const messageId = message ? `${controlId}-description` : undefined
  return <div data-slot="form-field" className={cn('flex flex-col gap-2 text-[13px]', className)} {...props}>
    <label htmlFor={controlId}>{label}</label>
    {children({ id: controlId, 'aria-label': typeof label === 'string' ? label : undefined, 'aria-describedby': messageId, 'aria-invalid': error ? true : undefined })}
    {message && <p id={messageId} role={error ? 'alert' : undefined} className={cn('text-[12px]', error ? 'text-destructive' : 'text-muted-foreground')}>{message}</p>}
  </div>
}
