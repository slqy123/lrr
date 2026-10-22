import { cva } from 'class-variance-authority'

export const mainContentVariants = cva('page-width pb-4', {
  variants: {
    variant: {
      live: 'pt-7',
      showcase: 'pt-[22px]',
    },
  },
  defaultVariants: { variant: 'live' },
})

export const pageFooterVariants = cva('page-footer', {
  variants: {
    variant: {
      live: 'border-t-2 border-dashed border-input',
      showcase: '',
    },
  },
  defaultVariants: { variant: 'live' },
})
