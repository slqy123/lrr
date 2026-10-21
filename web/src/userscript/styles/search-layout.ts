import { cva } from 'class-variance-authority'

export const searchPanelVariants = cva('yurui-sheet px-8 pt-7 pb-6 mb-8', {
  variants: {
    variant: {
      live: 'relative border-t-[5px] border-t-(--club-stripe) before:content-[\'\'] before:absolute before:w-[72px] before:h-4 before:left-7 before:top-[-11px] before:-rotate-[4deg] before:[background:var(--yurui-tape-fill)] before:[clip-path:polygon(0_0,100%_0,96%_25%,100%_50%,96%_75%,100%_100%,0_100%,4%_75%,0_50%,4%_25%)] before:pointer-events-none',
      showcase: '',
    },
  },
  defaultVariants: { variant: 'live' },
})

export const searchHeadingVariants = cva('flex items-center justify-between gap-4 [&_h1]:flex [&_h1]:items-center [&_h1]:gap-[10px] [&_h1]:leading-[1.4] [&_h1]:font-extrabold [&_h1]:tracking-[.5px] [&_h1_svg]:text-(--yurui-mark) [&_p]:text-muted-foreground [&_p]:m-0 [&_p]:text-[12px]', {
  variants: {
    variant: {
      live: '[&_h1]:m-0 [&_h1]:text-[18px]',
      showcase: '[&_h1]:mt-[5px] [&_h1]:mb-2 [&_h1]:text-[24px]',
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

export const searchRowVariants = cva('flex items-center gap-[10px] [&>button]:min-w-[76px]', {
  variants: {
    variant: {
      live: '[&>a]:min-w-[76px]',
      showcase: '',
    },
  },
  defaultVariants: { variant: 'live' },
})

