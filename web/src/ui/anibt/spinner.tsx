import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2Icon } from "lucide-react"

import { cn } from "./utils"

/**
 * Spinner — the inline loading mark (AniBT 「贴纸手账」).
 *
 * `<output>` already has `role="status"`, so screen readers announce the
 * label. The colour follows the surrounding ink by default, because most
 * spinners sit inside a button; a standalone one takes the pink stroke with
 * `tone="mark"`. `animate-spin` is the only motion and stops under the
 * theme's reduced-motion rule.
 */
const spinnerVariants = cva("inline-grid shrink-0 place-items-center", {
  variants: {
    size: {
      sm: "size-3",
      default: "size-4",
      lg: "size-6",
    },
    tone: {
      current: "text-current",
      mark: "text-anibt-mark",
    },
  },
  defaultVariants: {
    size: "default",
    tone: "current",
  },
})

type SpinnerProps = React.ComponentProps<"output"> &
  VariantProps<typeof spinnerVariants> & {
    /** What the spinner says to assistive technology. */
    label?: string
  }

function Spinner({ className, size, tone, label = "加载中", ...props }: SpinnerProps) {
  return (
    <output
      data-slot="spinner"
      aria-label={label}
      className={cn(spinnerVariants({ size, tone }), className)}
      {...props}
    >
      <Loader2Icon className="size-full animate-spin" aria-hidden="true" />
    </output>
  )
}

export { Spinner, spinnerVariants }
