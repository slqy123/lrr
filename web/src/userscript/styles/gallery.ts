import { cva } from 'class-variance-authority'

export const galleryGridVariants = cva('gallery-grid grid', {
  variants: {
    compact: {
      false: 'grid-cols-6 gap-x-[18px] gap-y-6 layout-compact:grid-cols-5 layout-narrow:grid-cols-3 layout-small:grid-cols-2',
      true: 'grid-cols-8 gap-x-3 gap-y-[18px] layout-compact:grid-cols-6 layout-narrow:grid-cols-4 layout-small:grid-cols-3',
    },
  },
  defaultVariants: { compact: false },
})

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
