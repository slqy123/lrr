import { cva } from 'class-variance-authority'

export const pageWidthStyles = 'mx-auto w-[min(1320px,calc(100%-64px))] [@media(max-width:1150px)]:w-[calc(100%-40px)]'

export const mainContentVariants = cva(`${pageWidthStyles} pb-4`, {
  variants: {
    variant: {
      live: 'pt-7',
      showcase: 'pt-[22px]',
    },
  },
  defaultVariants: { variant: 'live' },
})

export const pageFooterVariants = cva('flex justify-between gap-5 pt-8 pb-3 mt-7 text-muted-foreground text-[11px] [&>span]:flex [&>span]:items-center [&>span]:gap-[6px] [&_a]:underline [&_a]:underline-offset-[3px]', {
  variants: {
    variant: {
      live: 'border-t-2 border-dashed border-input',
      showcase: '',
    },
  },
  defaultVariants: { variant: 'live' },
})
