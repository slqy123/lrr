import * as React from "react"

import { cn } from "./utils"

/**
 * Input — the AniBT 「贴纸手账」 text field.
 *
 * 32 high on radius 10: paper under a 1px `--input` inset ring. Hover turns
 * the ring pink; focus is a 1.5px `--ring` edge with the soft pink halo
 * outside; invalid (`aria-invalid`) is the same in red and stays red while
 * focused; read-only is the sunk `--muted` well; disabled is `--muted` under
 * the weak ink — never an opacity wash. A phone keeps 16px text so iOS does
 * not zoom the page on focus; from `md` it is A's 13.
 *
 * Inside shadcn's `InputGroup` (`data-slot="input-group-control"`) the field
 * drops its own ring and paper, so the group draws the one edge.
 *
 * Textarea, the select trigger and the search and password fields spell the
 * same material out — shadcn keeps each primitive self-contained.
 */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "bg-card text-foreground inset-ring-1 inset-ring-input placeholder:text-muted-foreground selection:bg-anibt-wash2 selection:text-foreground hover:inset-ring-anibt-wash-line focus-visible:inset-ring-[1.5px] focus-visible:inset-ring-ring focus-visible:ring-4 focus-visible:ring-ring/20 aria-invalid:inset-ring-[1.5px] aria-invalid:inset-ring-anibt-danger-fill aria-invalid:ring-4 aria-invalid:ring-anibt-danger-fill/15 [&[readonly]]:bg-muted [&[readonly]]:text-anibt-ink2 disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground disabled:inset-ring-border",
        "h-8 w-full min-w-0 rounded-[10px] border-0 px-3 py-0 text-base transition-[background-color,box-shadow] duration-150 outline-none md:text-[13px]",
        "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-[13px] file:font-semibold file:text-foreground",
        "data-[slot=input-group-control]:bg-transparent data-[slot=input-group-control]:inset-ring-0 data-[slot=input-group-control]:ring-0",
        className
      )}
      {...props}
    />
  )
}

export { Input }
