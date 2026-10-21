import type { ComponentProps } from 'react'
import { Button } from './button'

type IconButtonProps = Omit<ComponentProps<typeof Button>, 'asChild' | 'size' | 'aria-label'> & {
  label: string
  size?: 'default' | 'sm'
}

export function IconButton({ label, size = 'default', variant = 'ghost', ...props }: IconButtonProps) {
  return <Button variant={variant} size={size === 'sm' ? 'icon-sm' : 'icon'} aria-label={label} {...props} />
}
