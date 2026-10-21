import { cva } from 'class-variance-authority'

export const nativeRatingStyles = 'inline-block w-[80px] h-4 ml-auto bg-no-repeat shrink-0 [@container_poster_(max-width:170px)]:hidden'
export const cardStatusStackStyles = 'flex flex-col items-start w-full min-w-0'
export const cardNativeMetaStyles = 'flex w-full items-center justify-between gap-2 mb-2 text-muted-foreground text-[11px]'
export const statusActionStyles = 'relative z-30 inline-flex cursor-pointer rounded-[4px] focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-4 focus-visible:outline-solid'

export const cardCategoryRowStyles = 'flex items-center gap-2 mt-2 mx-[3px] pointer-events-none'
export const cardCategoryStyles = 'category-key flex flex-1 min-w-0 h-[27px] items-center justify-center rounded-[7px] text-[11px] font-bold whitespace-nowrap'
export const coverSelectStyles = 'cover-select yurui-selection-controls relative z-30 flex flex-none pointer-events-auto [&_[data-slot=checkbox]]:size-[27px] [&_[data-slot=checkbox]_svg]:size-[14px]'
export const coverPlaceholderStyles = 'absolute inset-0 grid content-center justify-items-center gap-[10px] text-muted-foreground'
export const cardDetailStyles = 'card-detail absolute inset-0 z-20 cursor-pointer rounded-[14px] bg-transparent focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-4 focus-visible:outline-solid'

export const galleryGridVariants = cva('gallery-grid yurui-gallery-skin grid', {
  variants: {
    compact: {
      false: 'grid-cols-6 gap-x-[18px] gap-y-6 [@media(max-width:1150px)]:grid-cols-5',
      true: 'grid-cols-8 gap-x-3 gap-y-[18px] [@media(max-width:1150px)]:grid-cols-6',
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
