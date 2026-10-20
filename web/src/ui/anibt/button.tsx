import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "./utils"
import { Spinner } from "./spinner"

/**
 * Button — AniBT 「贴纸手账」.
 *
 * The variant and size names are shadcn's, so this file can replace
 * `components/ui/button.tsx` and every shadcn component that imports
 * `buttonVariants` keeps compiling. Each variant is one A paint, owned by an
 * `anibt-btn-*` recipe from `@anibt/theme`:
 *
 * - `default` — candy: the one filled action on a view. Pink gradient, white
 *   ink, a gloss on the top half, a deeper edge; hover lifts it and pops a ✦,
 *   press pushes it onto its edge.
 * - `secondary` / `outline` — raised: paper with an input-coloured ring and a
 *   1.5px bottom edge; hover lifts it and turns label and ring pink.
 * - `ghost` — quiet: nothing until the pointer is on it, then the pink wash.
 * - `destructive` — danger: red tint, red ink, red edge, the raised lift.
 * - `link` — the pink word, underlined on hover.
 * - `field` — a picker trigger (combobox) that reads as a field, not a key.
 *
 * Sizes are A's control heights: 32 (`default`), 28 (`sm`), 36 (`lg`), and
 * the matching icon squares; `xs` / `icon-xs` (24) exist for shadcn parity.
 *
 * States, the same in 白樱 and 夜樱 because every colour is a token:
 * focus-visible is a 2px ring-colour outline 2px outside the box (it never
 * replaces the paint's own edge); disabled is flat muted; `loading` sets
 * `aria-busy`, blocks interaction and overlays a spinner without resizing
 * the button — every disabled paint is gated on `not-aria-busy`, so work in
 * flight keeps its colour.
 */

const LINK = "bg-transparent text-accent-foreground hover:underline hover:underline-offset-4"

const DISABLED_FLAT =
  "disabled:not-aria-busy:bg-muted aria-disabled:not-aria-busy:bg-muted"

const FIELD =
  "bg-card font-normal text-foreground inset-ring-1 inset-ring-input hover:inset-ring-anibt-wash-line aria-expanded:inset-ring-[1.5px] aria-expanded:inset-ring-ring disabled:not-aria-busy:bg-muted"

const buttonVariants = cva(
  "relative inline-flex shrink-0 cursor-pointer items-center justify-center rounded-[10px] text-[13px] leading-none font-semibold whitespace-nowrap outline-hidden select-none aria-busy:cursor-wait disabled:pointer-events-none disabled:not-aria-busy:text-muted-foreground disabled:not-aria-busy:shadow-none aria-disabled:pointer-events-none aria-disabled:not-aria-busy:text-muted-foreground aria-disabled:not-aria-busy:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid aria-invalid:outline-2 aria-invalid:outline-anibt-danger-fill aria-invalid:outline-solid [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "anibt-btn-primary",
        secondary: `anibt-btn-raised ${DISABLED_FLAT}`,
        outline: `anibt-btn-raised ${DISABLED_FLAT}`,
        ghost: "anibt-btn-ghost",
        destructive: `anibt-btn-danger ${DISABLED_FLAT}`,
        link: LINK,
        field: FIELD,
      },
      size: {
        default: "h-8 gap-2 px-4 has-[>svg]:px-3.5",
        xs: "h-6 gap-1 px-2 text-[12px] has-[>svg]:px-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1.5 px-3 text-[12px] has-[>svg]:px-2.5",
        lg: "h-9 gap-2 px-5 text-[14px] has-[>svg]:px-4",
        icon: "size-8",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7",
        "icon-lg": "size-9",
      },
    },
    compoundVariants: [
      // A link is a word, whatever size it was given: no box, no padding.
      // Compound classes come after the size's, so they win the merge.
      { variant: "link", class: "h-auto px-0 has-[>svg]:px-0" },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Render the single child element (a link, say) with the button's paint. */
    asChild?: boolean
    /**
     * Base UI's form of `asChild`, so the components of shadcn's `base-*`
     * styles that render a button as another element keep working:
     * `render={<a href="…" />}`. The element takes the button's paint and
     * props; `children` go inside it.
     */
    render?: React.ReactElement
    /**
     * Base UI compatibility: `false` when `render` is not a `<button>`. It only
     * decides whether `type` and `disabled` are passed to the rendered element.
     */
    nativeButton?: boolean
    /** Busy: shows the spinner, sets `aria-busy` and blocks interaction. */
    loading?: boolean
    /**
     * Replaces the label while busy. Without it the label keeps its box and
     * the spinner is painted over it, so the button never changes width.
     */
    loadingText?: React.ReactNode
  }

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  render,
  nativeButton = true,
  type = "button",
  loading = false,
  loadingText,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const disabledNow = Boolean(disabled || loading)
  const overlaySpinner = loading && loadingText === undefined
  const classes = cn(buttonVariants({ variant, size, className }))

  if (asChild || render) {
    // A rendered <button> still gets its type and real `disabled`; anything
    // else (a link) is marked `aria-disabled` instead.
    const native = Boolean(render) && nativeButton
    const child = render && children !== undefined ? React.cloneElement(render, undefined, children) : (render ?? children)
    return (
      <Slot.Root
        data-slot="button"
        data-variant={variant}
        data-size={size}
        aria-busy={loading || undefined}
        aria-disabled={!native && disabledNow ? true : undefined}
        className={classes}
        {...(native ? { type, disabled: disabledNow } : {})}
        {...props}
      >
        {child}
      </Slot.Root>
    )
  }

  return (
    <button
      data-slot="button"
      data-variant={variant}
      data-size={size}
      aria-busy={loading || undefined}
      type={type}
      disabled={disabledNow}
      className={classes}
      {...props}
    >
      {overlaySpinner ? (
        <>
          <Spinner className="absolute inset-0 m-auto size-4" />
          {/* `opacity-0`, not `invisible`: the label stays in the
              accessibility tree, so the button keeps its name. */}
          <span className="inline-flex items-center gap-[inherit] opacity-0">{children}</span>
        </>
      ) : (
        <>
          {loading ? <Spinner className="size-4" /> : null}
          {loading ? loadingText : children}
        </>
      )}
    </button>
  )
}

export { Button, buttonVariants }
export type { ButtonProps }
