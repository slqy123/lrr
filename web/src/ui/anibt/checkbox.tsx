"use client"

import * as React from "react"
import { CheckIcon, MinusIcon } from "lucide-react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"

import { cn } from "./utils"

/**
 * Checkbox — A's candy box (AniBT 「贴纸手账」).
 *
 * 18px on radius 6: paper inside a 1.5px `--input` ring when empty (pink
 * under the pointer); checked is candy with a deeper bottom edge and a white
 * tick that pops in; indeterminate is the same candy with a dash. A ticked
 * box always shows its tick — the state never rides on colour alone.
 *
 * Focus is a 2px `--ring` outline 2px outside, so it never replaces the
 * box's own ring; invalid is the same outline in red. Disabled is the sunk
 * well under the weak ink, checked or not — still readable, never an
 * opacity wash. The hit area reaches 8px past the box.
 *
 * The paint is the `anibt-check` / `anibt-check-on` recipe spelled out in
 * classes, so the disabled compounds below win by order, not by luck.
 */
function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "group/checkbox peer relative inline-flex size-[18px] shrink-0 items-center justify-center rounded-[6px] bg-card text-anibt-candy-ink shadow-[inset_0_0_0_1.5px_var(--input)] outline-hidden transition-[background-color,box-shadow] duration-150 after:absolute after:-inset-2",
        "enabled:hover:shadow-[inset_0_0_0_1.5px_var(--anibt-wash-line)]",
        "data-[state=checked]:bg-anibt-candy-edge data-[state=checked]:bg-(image:--anibt-candy) data-[state=checked]:shadow-[0_1px_0_var(--anibt-candy-edge)]",
        "data-[state=indeterminate]:bg-anibt-candy-edge data-[state=indeterminate]:bg-(image:--anibt-candy) data-[state=indeterminate]:shadow-[0_1px_0_var(--anibt-candy-edge)]",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid",
        "aria-invalid:outline-2 aria-invalid:outline-offset-2 aria-invalid:outline-anibt-danger-fill aria-invalid:outline-solid",
        "disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:shadow-[inset_0_0_0_1.5px_var(--border)]",
        "disabled:data-[state=checked]:bg-anibt-deep2 disabled:data-[state=checked]:bg-none disabled:data-[state=checked]:shadow-[inset_0_0_0_1.5px_var(--border)]",
        "disabled:data-[state=indeterminate]:bg-anibt-deep2 disabled:data-[state=indeterminate]:bg-none disabled:data-[state=indeterminate]:shadow-[inset_0_0_0_1.5px_var(--border)]",
        className
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="grid place-content-center text-current transition-none"
      >
        <CheckIcon
          className="size-3 animate-anibt-pop group-data-[state=indeterminate]/checkbox:hidden"
          strokeWidth={3.5}
          aria-hidden="true"
        />
        <MinusIcon
          className="hidden size-3 group-data-[state=indeterminate]/checkbox:block"
          strokeWidth={3.5}
          aria-hidden="true"
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}

export { Checkbox }
