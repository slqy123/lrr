import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "./utils"

/**
 * Badge, StatusBadge and StatusDot — the AniBT 「贴纸手账」 label family.
 *
 * `Badge`:
 * - tags (20px, radius 6): `default` (neutral — a spec, a category), `res`
 *   (blue: resolution, format, time — in the round face), `lang` (pink:
 *   language, subtitles), and the status words `success` / `warning` /
 *   `destructive` (mint / amber / red, no dot).
 * - stickers (die-cut white rim, tilted by `tilt`): `sticker`, and the filled
 *   `candy` and `water`. A label stuck on — use sparingly.
 * - counts (20px pill): `count` (candy) and `count-quiet` (neutral).
 * - `secondary` and `outline` exist only so code written against shadcn's
 *   badge keeps compiling; both are the neutral tag.
 *
 * `StatusBadge` is a state with its word and a 6px dot: ok (mint), run (blue,
 * the dot blinks), fail (red), warn (amber), mute (grey), on (pink). The word
 * is required — colour never speaks alone.
 *
 * `StatusDot` is the label-less 6px dot beside copy that already says the
 * state (a legend, a rail count). It is `aria-hidden`.
 */
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "anibt-tag",
        secondary: "anibt-tag",
        outline: "anibt-tag",
        res: "anibt-tag anibt-tag-res",
        lang: "anibt-tag anibt-tag-lang",
        success: "anibt-tag anibt-tag-ok",
        warning: "anibt-tag anibt-tag-warn",
        destructive: "anibt-tag anibt-tag-danger",
        sticker: "anibt-sticker",
        candy: "anibt-sticker anibt-sticker-candy",
        water: "anibt-sticker anibt-sticker-water",
        count: "anibt-count",
        "count-quiet": "anibt-count anibt-count-quiet",
      },
      /** Specs and figures take the round face; a word takes the body face. */
      face: {
        spec: "anibt-num",
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

function Badge({ className, variant, face, size, asChild = false, tilt, style, ...props }: BadgeProps) {
  const Comp = asChild ? Slot.Root : "span"
  const tiltStyle =
    tilt === undefined ? style : ({ ...style, "--anibt-tilt": `${tilt}deg` } as React.CSSProperties)

  return (
    <Comp
      data-slot="badge"
      data-variant={variant ?? "default"}
      className={cn(badgeVariants({ variant, face, size }), className)}
      style={tiltStyle}
      {...props}
    />
  )
}

const statusBadgeVariants = cva("anibt-status", {
  variants: {
    tone: {
      ok: "anibt-status-ok",
      run: "anibt-status-run",
      fail: "anibt-status-fail",
      warn: "anibt-status-warn",
      mute: "anibt-status-mute",
      on: "anibt-status-on",
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

const statusDotVariants = cva("anibt-dot", {
  variants: {
    variant: {
      default: "",
      ok: "anibt-dot-ok",
      warn: "anibt-dot-warn",
      danger: "anibt-dot-danger",
      time: "anibt-dot-time",
      hollow: "anibt-dot-hollow",
      mute: "anibt-dot-mute",
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
