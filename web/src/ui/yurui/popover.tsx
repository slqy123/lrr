"use client"

import * as React from "react"
import { Popover as PopoverPrimitive } from "radix-ui"

import { cn } from "./utils"

/**
 * Popover — AniBT 「贴纸手账」: a small panel anchored to its trigger.
 *
 * Export names and props are shadcn's, so this file can replace
 * `components/ui/popover.tsx`.
 */

type RenderCompat = {
  /** Base UI's `asChild`: render this element instead, with the part's props. */
  render?: React.ReactElement
  /** Base UI compatibility; ignored (Radix decides from the rendered element). */
  nativeButton?: boolean
}

/** Maps Base UI's `render` onto Radix's `asChild`. */
function renderAsChild<P extends { asChild?: boolean; children?: React.ReactNode }>({
  render,
  nativeButton: _nativeButton,
  ...props
}: P & RenderCompat): P {
  void _nativeButton
  if (!render) return props as P
  const children = props.children === undefined ? render : React.cloneElement(render, undefined, props.children)
  return { ...props, asChild: true, children } as P
}

function Popover({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger(props: React.ComponentProps<typeof PopoverPrimitive.Trigger> & RenderCompat) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...renderAsChild(props)} />
}

function PopoverContent({
  className,
  align = "center",
  sideOffset = 6,
  container,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content> & {
  container: HTMLElement
}) {
  return (
    <PopoverPrimitive.Portal container={container}>
      <PopoverPrimitive.Content
        data-slot="popover-content"
        align={align}
        sideOffset={sideOffset}
        className={cn(
          "yurui-pop z-50 flex w-72 max-w-[calc(100vw-1rem)] origin-(--radix-popover-content-transform-origin) flex-col gap-3 p-4 text-[13px] duration-150 outline-hidden",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[side=bottom]:slide-in-from-top-2 data-[side=bottom]:slide-out-to-top-2 data-[side=left]:slide-in-from-right-2 data-[side=left]:slide-out-to-right-2 data-[side=right]:slide-in-from-left-2 data-[side=right]:slide-out-to-left-2 data-[side=top]:slide-in-from-bottom-2 data-[side=top]:slide-out-to-bottom-2",
          className
        )}
        {...props}
      />
    </PopoverPrimitive.Portal>
  )
}

function PopoverAnchor({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />
}

function PopoverHeader({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="popover-header" className={cn("flex flex-col gap-1", className)} {...props} />
}

/** 14/700 ink. */
function PopoverTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <div
      data-slot="popover-title"
      className={cn("text-[14px] leading-snug font-bold text-foreground", className)}
      {...props}
    />
  )
}

/** 12, muted. */
function PopoverDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <p
      data-slot="popover-description"
      className={cn("text-[12px] leading-normal text-muted-foreground", className)}
      {...props}
    />
  )
}

export { Popover, PopoverTrigger, PopoverContent, PopoverAnchor, PopoverHeader, PopoverTitle, PopoverDescription }
