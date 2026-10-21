"use client"

import * as React from "react"
import { XIcon } from "lucide-react"
import { Dialog as DialogPrimitive } from "radix-ui"

import { cn } from "./utils"
import { Button } from "./button"

/**
 * Dialog — AniBT 「贴纸手账」: the one container for "one record".
 *
 * Scrolling has one convention: the content is a flex column capped at the
 * viewport, `DialogHeader` and `DialogFooter` stay put, and `DialogBody` is the
 * region that scrolls. A dialog without a body still reaches its footer,
 * because the content itself is the fallback scroll region.
 *
 * Export names and props are shadcn's, so this file can replace
 * `components/ui/dialog.tsx`. Triggers and closes also take Base UI's
 * `render` (shadcn's `base-*` styles) as a form of `asChild`.
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

function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />
}

function DialogTrigger(props: React.ComponentProps<typeof DialogPrimitive.Trigger> & RenderCompat) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...renderAsChild(props)} />
}

function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />
}

function DialogClose(props: React.ComponentProps<typeof DialogPrimitive.Close> & RenderCompat) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...renderAsChild(props)} />
}

/** The scrim: the theme's `--yurui-scrim`, fading in and out. */
function DialogOverlay({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-yurui-scrim duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  closeLabel = "关闭",
  container,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  container: HTMLElement
  /** The quiet ✕ square in the header bar. */
  showCloseButton?: boolean
  /** The close button's accessible name. */
  closeLabel?: string
}) {
  return (
    <DialogPortal container={container}>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "yurui-pop fixed top-1/2 left-1/2 z-50 flex max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100%-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 overflow-y-auto overscroll-contain p-4 text-[14px] duration-200 outline-none sm:max-w-lg",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
          // A title never runs under the close button.
          showCloseButton && "[&>[data-slot=dialog-header]]:pe-12",
          className
        )}
        {...props}
      >
        {children}
        {showCloseButton ? (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="yurui-icobtn yurui-icobtn-ghost absolute top-2 right-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring focus-visible:outline-solid disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
            <span className="sr-only">{closeLabel}</span>
          </DialogPrimitive.Close>
        ) : null}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

/** A's 48px bar: title (and description) over the stitched bottom edge. */
function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn(
        "yurui-stitch-under -mx-4 -mt-4 flex min-h-12 shrink-0 flex-col justify-center gap-1 bg-secondary px-4 py-3 text-left",
        className
      )}
      {...props}
    />
  )
}

/** The one scrolling region of a dialog; the header and the footer stay reachable. */
function DialogBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-body"
      className={cn("-m-1 min-h-0 flex-1 overflow-y-auto overscroll-contain p-1 text-yurui-ink2", className)}
      {...props}
    />
  )
}

/** Buttons at the foot, right-aligned: the quiet one first, the action last. */
function DialogFooter({
  className,
  showCloseButton = false,
  closeLabel = "关闭",
  children,
  ...props
}: React.ComponentProps<"div"> & {
  /** Adds a quiet 关闭 button before the footer's own buttons. */
  showCloseButton?: boolean
  closeLabel?: React.ReactNode
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn("flex shrink-0 flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end", className)}
      {...props}
    >
      {showCloseButton ? (
        <DialogPrimitive.Close {...{ asChild: true }}>
          <Button variant="ghost">{closeLabel}</Button>
        </DialogPrimitive.Close>
      ) : null}
      {children}
    </div>
  )
}

/** 14/700 ink, one line of the bar. */
function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn("flex items-center gap-2 text-[14px] leading-snug font-bold text-foreground", className)}
      {...props}
    />
  )
}

/** 13, the secondary ink. */
function DialogDescription({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn("text-[13px] leading-normal text-yurui-ink2", className)}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
