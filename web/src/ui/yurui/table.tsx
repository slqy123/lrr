import * as React from "react"

import { cn } from "./utils"

/**
 * Table — the AniBT 「贴纸手账」 data table, on a real `<table>`.
 *
 * It draws no box of its own: a table sits straight on the panel it is placed
 * in (put it in a `Card`, with the card's padding off). The head row is 36px
 * of 12/600 muted labels; body rows are at least 48px, parted by the dashed
 * stitch; the pointer presses a row to the sunk tone and a selected row
 * (`data-state="selected"`) takes the pink wash. Numbers set `numeric` on the
 * head and the cell: right-aligned, in the round face, tabular.
 *
 * `TableHeader sticky` pins the head to the top of a height-capped container
 * (`containerClassName="max-h-80"`); the pinned cells repeat the card's paper
 * so rows scrolling under them do not show through.
 *
 * `TableIdentity` is the first cell of an entity row: an optional picture, the
 * name on one line and a muted line under it, always 32px tall.
 *
 * The parts and props are shadcn's, plus `containerClassName`, `sticky`,
 * `numeric` and `TableIdentity`.
 */
function Table({
  className,
  containerClassName,
  ...props
}: React.ComponentProps<"table"> & { containerClassName?: string }) {
  return (
    <div data-slot="table-container" className={cn("relative w-full overflow-x-auto", containerClassName)}>
      <table
        data-slot="table"
        className={cn("w-full caption-bottom border-separate border-spacing-0 text-[13px]", className)}
        {...props}
      />
    </div>
  )
}

function TableHeader({
  className,
  sticky = false,
  ...props
}: React.ComponentProps<"thead"> & { sticky?: boolean }) {
  return (
    <thead
      data-slot="table-header"
      data-sticky={sticky ? "true" : undefined}
      className={cn("yurui-table-header", className)}
      {...props}
    />
  )
}

function TableBody({ className, ...props }: React.ComponentProps<"tbody">) {
  return <tbody data-slot="table-body" className={cn("yurui-table-body", className)} {...props} />
}

function TableFooter({ className, ...props }: React.ComponentProps<"tfoot">) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        "yurui-table-footer font-semibold text-foreground",
        className
      )}
      {...props}
    />
  )
}

function TableRow({ className, ...props }: React.ComponentProps<"tr">) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        "h-12 bg-(image:--yurui-stitch) bg-size-[8px_1px] bg-bottom bg-repeat-x transition-colors duration-150 hover:bg-muted data-[state=selected]:bg-accent",
        className
      )}
      {...props}
    />
  )
}

const NUMERIC = "data-[numeric=true]:text-right data-[numeric=true]:yurui-num"

function TableHead({ className, numeric, ...props }: React.ComponentProps<"th"> & { numeric?: boolean }) {
  return (
    <th
      data-slot="table-head"
      data-numeric={numeric ? "true" : undefined}
      className={cn(
        "h-9 px-3 text-left align-middle text-[12px] leading-4 font-semibold whitespace-nowrap text-muted-foreground first:pl-4 last:pr-4 [&:has([role=checkbox])]:pr-0",
        NUMERIC,
        className
      )}
      {...props}
    />
  )
}

function TableCell({ className, numeric, ...props }: React.ComponentProps<"td"> & { numeric?: boolean }) {
  return (
    <td
      data-slot="table-cell"
      data-numeric={numeric ? "true" : undefined}
      className={cn(
        "px-3 py-2 align-middle text-[13px] leading-5 text-yurui-ink2 first:pl-4 last:pr-4 [&:has([role=checkbox])]:pr-0",
        NUMERIC,
        className
      )}
      {...props}
    />
  )
}

function TableCaption({ className, ...props }: React.ComponentProps<"caption">) {
  return (
    <caption data-slot="table-caption" className={cn("mt-3 text-[12px] text-muted-foreground", className)} {...props} />
  )
}

/** Picture, name and a muted line: the first cell of an entity row. */
function TableIdentity({
  className,
  media,
  title,
  meta,
  ...props
}: Omit<React.ComponentProps<"div">, "title"> & {
  media?: React.ReactNode
  title: React.ReactNode
  meta?: React.ReactNode
}) {
  return (
    <div data-slot="table-identity" className={cn("flex min-w-0 items-center gap-2.5", className)} {...props}>
      {media}
      <div className="flex h-8 min-w-0 flex-col justify-center">
        <span className="yurui-ell text-[14px] leading-4 font-semibold text-foreground">{title}</span>
        {meta ? <span className="yurui-ell mt-0.5 text-[12px] leading-4 text-muted-foreground">{meta}</span> : null}
      </div>
    </div>
  )
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption, TableIdentity }
