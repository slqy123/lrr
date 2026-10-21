import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"

import { cn } from "./utils"
import { Spinner } from "./spinner"

const LINK = "bg-transparent text-accent-foreground hover:underline hover:underline-offset-4"

const DISABLED_FLAT =
  "disabled:not-aria-busy:bg-muted aria-disabled:not-aria-busy:bg-muted"

const FIELD =
  "anibt-field font-normal aria-expanded:outline-2 aria-expanded:outline-ring disabled:not-aria-busy:bg-muted"

const buttonVariants = cva(
  "relative inline-flex shrink-0 cursor-pointer items-center justify-center rounded-[3px_10px_3px_3px] text-[13px] leading-none font-bold whitespace-nowrap outline-hidden select-none aria-busy:cursor-wait disabled:pointer-events-none disabled:not-aria-busy:text-muted-foreground disabled:not-aria-busy:shadow-none aria-disabled:pointer-events-none aria-disabled:not-aria-busy:text-muted-foreground aria-disabled:not-aria-busy:shadow-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid aria-invalid:outline-2 aria-invalid:outline-anibt-danger-fill aria-invalid:outline-solid [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
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
