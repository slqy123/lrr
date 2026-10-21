import { cva } from 'class-variance-authority'

export const floatingFeedbackVariants = cva('preview-feedback yurui-pop fixed bottom-[96px] left-1/2 -translate-x-1/2 flex items-center px-[14px] py-[10px] z-[60] text-[13px] max-w-[calc(100%-48px)]', {
  variants: {
    variant: {
      operation: 'gap-[10px]',
      showcase: 'gap-4',
    },
  },
  defaultVariants: { variant: 'operation' },
})

export const statusPanelVariants = cva('flex items-center', {
  variants: {
    variant: {
      empty: 'min-h-[360px] flex-col justify-center gap-[14px] text-center text-muted-foreground [&>svg]:size-[40px] [&>svg]:text-(--yurui-mark) [&_h3]:text-[18px] [&_h3]:font-bold [&_h3]:text-foreground',
      connection: 'mb-6 justify-between gap-4 px-5 py-4',
    },
    surface: {
      plain: '',
      sheet: 'yurui-sheet',
    },
  },
  defaultVariants: { variant: 'empty', surface: 'sheet' },
})
