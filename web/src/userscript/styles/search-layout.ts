import { cva } from 'class-variance-authority'

export const searchPanelVariants = cva('yurui-sheet px-8 pt-7 pb-6 mb-8', {
  variants: {
    variant: {
      live: 'search-panel-live',
      showcase: '',
    },
  },
  defaultVariants: { variant: 'live' },
})

export const searchHeadingVariants = cva('search-heading', {
  variants: {
    variant: {
      live: 'search-heading-live',
      showcase: 'search-heading-showcase',
    },
  },
  defaultVariants: { variant: 'live' },
})

export const categoryRowVariants = cva('flex mb-[14px]', {
  variants: {
    variant: {
      live: 'mt-4 flex-wrap gap-[6px]',
      showcase: 'mt-6 gap-2',
    },
  },
  defaultVariants: { variant: 'live' },
})

export const searchRowVariants = cva('search-row', {
  variants: {
    variant: {
      live: 'search-row-live',
      showcase: '',
    },
  },
  defaultVariants: { variant: 'live' },
})

