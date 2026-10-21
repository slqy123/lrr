import * as React from "react"

import { cn } from "./utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "yurui-input min-w-0 text-base placeholder:text-muted-foreground selection:bg-yurui-wash2 selection:text-foreground transition-[background-color,box-shadow] duration-150 md:text-[13px] [&[readonly]]:bg-muted [&[readonly]]:text-yurui-ink2",
        "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-[13px] file:font-semibold file:text-foreground",
        "data-[slot=input-group-control]:bg-transparent data-[slot=input-group-control]:shadow-none",
        className
      )}
      {...props}
    />
  )
}

export { Input }
