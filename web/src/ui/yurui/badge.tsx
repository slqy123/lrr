import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "./utils"

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "yurui-tag",
        secondary: "yurui-tag",
        outline: "yurui-tag bg-transparent inset-ring-1 inset-ring-input",
        res: "yurui-tag yurui-tag-res",
        lang: "yurui-tag yurui-tag-lang",
        success: "yurui-tag yurui-tag-ok",
        warning: "yurui-tag yurui-tag-warn",
        destructive: "yurui-tag yurui-tag-danger",
        sticker: "yurui-sticker",
        candy: "yurui-sticker yurui-sticker-candy",
        water: "yurui-sticker yurui-sticker-water",
        count: "yurui-count",
        "count-quiet": "yurui-count yurui-count-quiet",
      },
      /** Specs and figures take the round face; a word takes the body face. */
      shape: {
        default: "",
        soft: "yurui-tag-soft",
      },
      face: {
        spec: "yurui-num",
        text: "",
      },
      size: {
        default: "",
        /** A 24px tag for a header row. */
        lg: "h-6 px-2.5",
      },
    },
    defaultVariants: {
      variant: "default",
      face: "spec",
      size: "default",
    },
  }
)

type BadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & {
    asChild?: boolean
    /** Tilt in degrees for the sticker variants (A uses −4 … 4). */
    tilt?: number
  }

function Badge({ className, variant, shape, face, size, asChild = false, tilt, style, ...props }: BadgeProps) {
  const Comp = asChild ? Slot.Root : "span"
  const tiltStyle =
    tilt === undefined ? style : ({ ...style, "--yurui-tilt": `${tilt}deg` } as React.CSSProperties)

  return (
    <Comp
      data-slot="badge"
      data-variant={variant ?? "default"}
      className={cn(badgeVariants({ variant, shape, face, size }), className)}
      style={tiltStyle}
      {...props}
    />
  )
}

const statusBadgeVariants = cva("yurui-status", {
  variants: {
    tone: {
      ok: "yurui-status-ok",
      run: "yurui-status-run",
      fail: "yurui-status-fail",
      warn: "yurui-status-warn",
      mute: "yurui-status-mute",
      on: "yurui-status-on",
    },
  },
  defaultVariants: {
    tone: "mute",
  },
})

type StatusBadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof statusBadgeVariants> & {
    /** The word that names the state. */
    children: React.ReactNode
  }

function StatusBadge({ className, tone, ...props }: StatusBadgeProps) {
  return (
    <span
      data-slot="status-badge"
      data-tone={tone ?? "mute"}
      className={cn(statusBadgeVariants({ tone }), className)}
      {...props}
    />
  )
}

const statusDotVariants = cva("yurui-dot", {
  variants: {
    variant: {
      default: "",
      ok: "yurui-dot-ok",
      warn: "yurui-dot-warn",
      danger: "yurui-dot-danger",
      time: "yurui-dot-time",
      hollow: "yurui-dot-hollow",
      mute: "yurui-dot-mute",
    },
  },
  defaultVariants: {
    variant: "default",
  },
})

type StatusDotProps = Omit<React.ComponentProps<"span">, "children"> &
  VariantProps<typeof statusDotVariants>

function StatusDot({ className, variant, ...props }: StatusDotProps) {
  return (
    <span
      data-slot="status-dot"
      aria-hidden="true"
      className={cn(statusDotVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants, StatusBadge, statusBadgeVariants, StatusDot, statusDotVariants }
export type { BadgeProps, StatusBadgeProps, StatusDotProps }
