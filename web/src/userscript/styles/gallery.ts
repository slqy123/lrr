import { cva } from 'class-variance-authority'


export const galleryStatusVariants = cva('gallery-status inline-flex items-center gap-[5px] text-[12px] whitespace-nowrap', {
  variants: {
    state: {
      missing: 'text-(--yurui-ink2)',
      downloaded: 'text-(--yurui-ok)',
      duplicate: 'text-accent-foreground',
      queued: 'text-(--yurui-time-ink)',
      checking: 'text-muted-foreground',
      error: 'text-destructive',
    },
  },
})
