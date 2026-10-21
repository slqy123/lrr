import { cva } from 'class-variance-authority'

export const appearancePickerStyles = 'w-[min(260px,calc(100vw-32px))] max-h-[calc(100dvh-32px)] overflow-y-auto [&>p]:text-[12px] [&>p]:mt-[6px] [&>p]:mb-3'
export const paletteOptionsStyles = 'grid gap-[6px] mt-[10px]'
export const paletteOptionStyles = 'h-auto min-h-12 p-[10px] justify-start gap-3 whitespace-normal text-left aria-pressed:bg-accent aria-pressed:[box-shadow:inset_3px_0_0_var(--ring)]'

export const paletteSwatchesVariants = cva('flex flex-none [&_i]:w-3 [&_i]:h-7 [&_i]:border-y [&_i]:border-[#0002] [&_i:first-child]:rounded-[4px_0_0_4px] [&_i:last-child]:rounded-[0_4px_4px_0]', {
  variants: {
    palette: {
      festival: '[&_i:first-child]:bg-[#f29ab2] [&_i:nth-child(2)]:bg-[#f5e8ed] [&_i:last-child]:bg-[#a9cfc4]',
      original: '[&_i:first-child]:bg-[#b82d56] [&_i:nth-child(2)]:bg-[#f7e7bb] [&_i:last-child]:bg-[#d9b96c]',
    },
  },
})
