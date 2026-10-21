import type { ComponentProps } from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Notice } from './notice'
import { cn } from './utils'

const floatingNoticeVariants = cva('preview-feedback yurui-pop fixed bottom-[96px] left-1/2 -translate-x-1/2 px-[14px] py-[10px] z-[60] text-[13px] max-w-[calc(100%-48px)]', {
  variants: { spacing: { default: 'gap-[10px]', relaxed: 'gap-4' } },
  defaultVariants: { spacing: 'default' },
})

export function FloatingNotice({ className, spacing, ...props }: ComponentProps<typeof Notice> & VariantProps<typeof floatingNoticeVariants>) {
  return <Notice className={cn(floatingNoticeVariants({ spacing }), className)} {...props} />
}
