import { cva } from 'class-variance-authority'

export const brandVariants = cva('brand', {
  variants: {
    variant: {
      live: 'flex-col items-start shrink-0 gap-0 py-2',
      showcase: 'items-center gap-3',
    },
  },
  defaultVariants: { variant: 'live' },
})

export const siteHeaderVariants = cva('bg-card', {
  variants: {
    variant: {
      live: 'border-t-[5px] border-t-(--club-sun) border-b-2 border-b-input [border-bottom-style:dashed]',
      showcase: 'border-b border-border',
    },
  },
  defaultVariants: { variant: 'live' },
})

export const headerInnerVariants = cva('page-width site-header-inner', {
  variants: {
    variant: {
      live: 'min-h-[90px] layout-narrow:min-h-[76px]',
      showcase: 'min-h-[84px]',
    },
  },
  defaultVariants: { variant: 'live' },
})
