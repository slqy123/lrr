"use client"

import * as React from "react"
import { CheckIcon, MinusIcon } from "lucide-react"
import { Checkbox as CheckboxPrimitive } from "radix-ui"

import { cn } from "./utils"

function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "anibt-check group/checkbox peer relative outline-hidden transition-[background-color,box-shadow] duration-150 after:absolute after:-inset-2",
        "enabled:hover:outline enabled:hover:outline-offset-2 enabled:hover:outline-input",
        "data-[state=checked]:anibt-check-on data-[state=indeterminate]:anibt-check-on",
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
