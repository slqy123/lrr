import { cva } from 'class-variance-authority'
import { pageWidthStyles } from './page-layout'

export const brandVariants = cva('brand flex text-foreground no-underline [font:600_23px/1.15_var(--font-yurui-display)] [&_b]:text-accent-foreground [&_b]:font-semibold [&_small]:block [&_small]:mt-[6px] [&_small]:text-muted-foreground [&_small]:[font:11px/1.4_var(--font-sans)] [&_small]:tracking-[1px]', {
  variants: {
    variant: {
      live: 'flex-col items-start shrink-0 gap-0 py-2',
      showcase: 'items-center gap-3',
    },
  },
  defaultVariants: { variant: 'live' },
})

export const brandWordmarkStyles = 'brand-wordmark block w-[160px] h-auto [@media(max-width:700px)]:w-[144px]'
export const brandMarkStyles = 'grid place-items-center size-[44px] text-white border-[3px] border-(--yurui-sticker-edge) rounded-[15px] bg-(--yurui-candy) shadow-(--yurui-shadow-sticker) -rotate-[8deg]'

export const siteHeaderVariants = cva('bg-card', {
  variants: {
    variant: {
      live: 'border-t-[5px] border-t-(--club-sun) border-b-2 border-b-input [border-bottom-style:dashed]',
      showcase: 'border-b border-border',
    },
  },
  defaultVariants: { variant: 'live' },
})

export const headerInnerVariants = cva(`${pageWidthStyles} flex items-center gap-9 [@media(max-width:1150px)]:flex-wrap [@media(max-width:1150px)]:gap-5 [@media(max-width:1150px)]:py-3`, {
  variants: {
    variant: {
      live: 'min-h-[90px] [@media(max-width:700px)]:min-h-[76px]',
      showcase: 'min-h-[84px]',
    },
  },
  defaultVariants: { variant: 'live' },
})
