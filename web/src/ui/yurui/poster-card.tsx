import * as React from "react"
import { StarIcon } from "lucide-react"

import { cn } from "./utils"

/**
 * PosterCard — the AniBT 「贴纸手账」 collectible card: one show on a poster
 * wall (a timetable, a season, search results, a group's works).
 *
 * **Fixed height.** The title is at most two lines and always reserves two;
 * the full title rides in `title=`. The subtitle is one line, reserved even
 * when empty, and dropped on a narrow card; meta and status sit at the foot.
 * Every card in a row is the same height whatever it holds.
 *
 * **Sharp covers.** Pass `src` plus `srcSet` with real widths; the browser
 * picks from `sizes` × the device pixel ratio, so a 180px card on a 3× phone
 * wants a 540w source. `sizes` defaults to `POSTER_SIZES`, which matches
 * `PosterGrid`'s 3 / 4 / 6 / 8 columns — a card outside `PosterGrid` passes
 * its own. `posterSrcSet` builds the list from a
 * URL-per-width function. Or pass your own element (`next/image`) as `image`.
 *
 * **Links.** `href` (or `link={<Link href="…" />}` for a router) makes the
 * title a link stretched over the whole card, so the card opens the show
 * while `coverAction` stays a separate control above it.
 *
 * `tone="next" | "airing"` is the blue card (time is blue in A); `selected`
 * puts the pink ring on the open card.
 */

/** `sizes` for a cover in `PosterGrid` (3 / 4 / 6 / 8 columns). */
const POSTER_SIZES = "(min-width: 1440px) 176px, (min-width: 1024px) 17vw, (min-width: 600px) 25vw, 33vw"

/**
 * A `srcSet` from a URL-per-width function:
 * `posterSrcSet((w) => \`/covers/42.webp?w=${w}\`)` →
 * `/covers/42.webp?w=200 200w, …, /covers/42.webp?w=900 900w`.
 * The default widths cover a 3× phone and a 2× desktop wall.
 */
function posterSrcSet(urlForWidth: (width: number) => string, widths: readonly number[] = [200, 300, 400, 600, 900]) {
  return widths.map((width) => `${urlForWidth(width)} ${width}w`).join(", ")
}

type PosterCardProps = Omit<React.ComponentProps<"div">, "title"> & {
  /** Cover URL. */
  src?: string
  /** Width descriptors (`… 400w, … 600w`); see `posterSrcSet`. */
  srcSet?: string
  /**
   * The card's CSS width. Defaults to `POSTER_SIZES` when `srcSet` is set,
   * which is right only inside `PosterGrid`: a card anywhere else needs its
   * own (`"176px"`), or a phone picks a source too small for a 3× screen.
   */
  sizes?: string
  /** The title already names the show, so the cover is decorative by default. */
  alt?: string
  /** Above the fold: load eagerly at high priority. */
  priority?: boolean
  /** Your own cover element instead of `src` (`next/image` with `fill`). */
  image?: React.ReactNode
  /** Under the cover: shows while it loads, and when it fails or is missing. */
  imageFallback?: React.ReactNode
  /** A die-cut sticker for the cover's top-left corner (the airtime). */
  sticker?: React.ReactNode
  /** `PosterCardBadge`s on the cover's top corners. */
  badges?: React.ReactNode
  /** A `PosterCardAction` in the cover's bottom-right corner. */
  coverAction?: React.ReactNode
  /** Anything over the whole cover (a "no releases yet" tag). */
  coverOverlay?: React.ReactNode
  title: React.ReactNode
  /** The full title for the browser tooltip; defaults to `title` when it is a string. */
  titleTooltip?: string
  /** The `lang` of the title (`ja` for a Japanese name). */
  titleLang?: string
  /** The alternate name: one line, muted. */
  subtitle?: React.ReactNode
  /** One row of facts that never wraps: episode, format, score. */
  meta?: React.ReactNode
  /** A `PosterCardStatus` under the facts. */
  status?: React.ReactNode
  /** Makes the card a link (stretched from the title). */
  href?: string
  /** A link element for a router (`<Link href="…" />`); wins over `href`. */
  link?: React.ReactElement<{ className?: string; children?: React.ReactNode }>
  /** `next` / `airing` paint the blue card. */
  tone?: "next" | "airing"
  /** The open card on a wall that expands one. */
  selected?: boolean
  headingLevel?: "h2" | "h3" | "h4"
  titleClassName?: string
  /** Extra rows under the foot: a command row in a back office. */
  children?: React.ReactNode
}

function PosterCard({
  src,
  srcSet,
  sizes,
  alt = "",
  priority = false,
  image,
  imageFallback,
  sticker,
  badges,
  coverAction,
  coverOverlay,
  title,
  titleTooltip,
  titleLang,
  subtitle,
  meta,
  status,
  href,
  link,
  tone,
  selected = false,
  headingLevel: Heading = "h3",
  className,
  titleClassName,
  children,
  ...props
}: PosterCardProps) {
  const tooltip = titleTooltip ?? (typeof title === "string" ? title : undefined)
  const stretched =
    "outline-hidden after:absolute after:inset-0 after:z-20 after:rounded-[3px] after:content-['']"
  const linkedTitle = link
    ? React.cloneElement(link, { className: cn(stretched, link.props.className), children: title })
    : href
      ? (
          <a href={href} className={stretched}>
            {title}
          </a>
        )
      : title

  return (
    <div
      data-slot="poster-card"
      data-tone={tone}
      data-selected={selected ? "true" : undefined}
      className={cn(
        "group/poster @container/poster relative flex h-full min-w-0 flex-col rounded-[3px] bg-card p-1.5 text-left text-card-foreground",
        "shadow-[0_0_0_1px_var(--input),var(--yurui-shadow-panel)] transition-[box-shadow,background-color] duration-150",
        "hover:z-[2] hover:shadow-[0_0_0_1.5px_var(--yurui-time-line),var(--yurui-shadow-lift)] focus-within:z-[2]",
        "data-[tone]:bg-yurui-time-wash data-[tone]:shadow-[0_0_0_1.5px_var(--yurui-time-line),var(--yurui-shadow-panel)] data-[tone]:hover:shadow-[0_0_0_1.5px_var(--yurui-time-line),var(--yurui-shadow-lift)]",
        "data-[selected=true]:shadow-[0_0_0_2px_var(--yurui-mark),var(--yurui-shadow-lift)] data-[selected=true]:hover:shadow-[0_0_0_2px_var(--yurui-mark),var(--yurui-shadow-lift)]",
        "has-[[data-slot=poster-card-title]_:focus-visible]:outline-2 has-[[data-slot=poster-card-title]_:focus-visible]:outline-offset-2 has-[[data-slot=poster-card-title]_:focus-visible]:outline-ring has-[[data-slot=poster-card-title]_:focus-visible]:outline-solid",
        "@max-[10rem]/poster:p-1",
        className
      )}
      {...props}
    >
      <div data-slot="poster-card-art" className="relative flex-none">
        <div
          data-slot="poster-card-cover"
          className="group/cover @container/poster-cover relative aspect-[2/3] overflow-hidden rounded-[1px] bg-muted"
        >
          {imageFallback ?? <PosterCardPlaceholder />}
          {image ??
            (src ? (
              // eslint-disable-next-line @next/next/no-img-element -- a registry component: no framework image
              <img
                src={src}
                srcSet={srcSet}
                sizes={srcSet ? (sizes ?? POSTER_SIZES) : sizes}
                alt={alt}
                width={400}
                height={600}
                loading={priority ? "eager" : "lazy"}
                fetchPriority={priority ? "high" : undefined}
                decoding="async"
                className="absolute inset-0 block size-full object-contain"
              />
            ) : null)}
          {badges}
          {coverOverlay}
        </div>
        {sticker ? (
          <span
            data-slot="poster-card-sticker"
            className="pointer-events-none absolute top-1.5 left-1.5 z-[25] flex origin-top-left [--yurui-tilt:var(--yurui-poster-tilt,-3deg)] group-hover/poster:[--yurui-tilt:calc(var(--yurui-poster-tilt,-3deg)*-1)] @max-[10rem]/poster:scale-90"
          >
            {sticker}
          </span>
        ) : null}
        {coverAction}
      </div>

      <div
        data-slot="poster-card-body"
        className="mt-2 flex min-w-0 flex-1 flex-col gap-0.5 border-t border-dashed border-input px-1 pt-2 pb-1 @max-[10rem]/poster:px-[3px] @max-[10rem]/poster:pt-1.5"
      >
        <Heading
          data-slot="poster-card-title"
          title={tooltip}
          lang={titleLang}
          className={cn(
            "yurui-clamp2-fixed m-0 text-[14px] leading-[18px] font-bold text-foreground transition-colors duration-150 group-hover/poster:text-accent-foreground @max-[10rem]/poster:text-[13px] @max-[10rem]/poster:leading-[17px]",
            titleClassName
          )}
        >
          {linkedTitle}
        </Heading>
        {/* Always drawn: an empty line still holds its height. */}
        <p
          data-slot="poster-card-subtitle"
          aria-hidden={subtitle ? undefined : true}
          className="yurui-ell m-0 h-[18px] text-[12px] leading-[18px] text-muted-foreground @max-[10rem]/poster:hidden"
        >
          {subtitle}
        </p>
        {meta || status ? (
          <div data-slot="poster-card-foot" className="mt-auto grid min-w-0 gap-0.5 pt-1">
            {meta ? (
              <div className="flex min-w-0 items-center gap-1.5 overflow-hidden text-[12px] leading-[18px] whitespace-nowrap text-yurui-ink2 @max-[10rem]/poster:gap-1">
                {meta}
              </div>
            ) : null}
            {status ? <div className="flex min-w-0 leading-[18px]">{status}</div> : null}
          </div>
        ) : null}
      </div>
      {children}
    </div>
  )
}

/** The default cover placeholder: the sunk tone and a faint dot ground. */
function PosterCardPlaceholder({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      data-slot="poster-card-placeholder"
      className={cn(
        "absolute inset-0 bg-yurui-deep2 bg-(image:--yurui-dots) bg-size-[16px_16px] bg-position-[0_0,8px_8px]",
        className
      )}
    />
  )
}

/** A square paper sticker on a top corner of the cover: a format, a count. */
function PosterCardBadge({
  corner = "start",
  className,
  ...props
}: React.ComponentProps<"span"> & { corner?: "start" | "end" }) {
  return (
    <span
      data-slot="poster-card-badge"
      data-corner={corner}
      className={cn(
        "absolute top-1.5 z-10 flex h-5 max-w-[calc(100%-16px)] items-center gap-[3px] overflow-hidden rounded-[6px] bg-card px-1.5 font-yurui-display text-[12px] leading-none font-semibold whitespace-nowrap text-foreground shadow-[0_0_0_2px_var(--yurui-sticker-edge),var(--yurui-shadow-sticker)] [&>svg]:size-3",
        corner === "end" ? "right-1.5" : "left-1.5",
        // On a narrow cover two opposite badges no longer fit side by side:
        // the end one drops under the start one.
        corner === "end" &&
          "@max-[8.75rem]/poster-cover:group-has-[[data-corner=start]]/cover:top-8 @max-[8.75rem]/poster-cover:group-has-[[data-corner=start]]/cover:right-auto @max-[8.75rem]/poster-cover:group-has-[[data-corner=start]]/cover:left-1.5",
        className
      )}
      {...props}
    />
  )
}

/**
 * The key in the cover's bottom-right corner (subscribe, favourite): a 28px
 * paper square drawn inside a 40px target. `pressed` is the pink wash — not a
 * candy fill, so a wall of subscribed cards never becomes a wall of buttons.
 * Give it an `aria-label`.
 */
function PosterCardAction({
  className,
  pressed,
  type = "button",
  ...props
}: React.ComponentProps<"button"> & { pressed?: boolean }) {
  return (
    <button
      type={type}
      data-slot="poster-card-action"
      aria-pressed={pressed}
      className={cn(
        "absolute right-0 bottom-0 z-30 flex size-10 cursor-pointer items-center justify-center border-0 bg-transparent text-yurui-ink2 outline-hidden transition-colors duration-150",
        "before:absolute before:top-1.5 before:left-1.5 before:size-7 before:rounded-[9px] before:bg-card before:shadow-[inset_0_0_0_1px_var(--input),var(--yurui-shadow-sticker)] before:transition-[background-color,box-shadow] before:duration-150 before:content-['']",
        "hover:text-accent-foreground hover:before:shadow-[inset_0_0_0_1px_var(--yurui-wash-line),var(--yurui-shadow-sticker)]",
        "aria-pressed:text-accent-foreground aria-pressed:before:bg-accent aria-pressed:before:shadow-[inset_0_0_0_1.5px_var(--yurui-wash-line),var(--yurui-shadow-sticker)]",
        "focus-visible:before:outline-2 focus-visible:before:outline-offset-2 focus-visible:before:outline-ring focus-visible:before:outline-solid",
        "[&>svg]:relative [&>svg]:size-3.5",
        className
      )}
      {...props}
    />
  )
}

/** The 3px dot between two facts on the meta line. */
function PosterCardSep({ className }: { className?: string }) {
  return <i aria-hidden="true" className={cn("size-[3px] flex-none rounded-full bg-muted-foreground", className)} />
}

/** A score with A's pink star; `null` is an unrated show (a muted dash). */
function PosterCardRating({ value, className, label = "评分" }: { value: number | null; className?: string; label?: string }) {
  const none = value === null
  return (
    <span
      data-slot="poster-card-rating"
      aria-label={none ? `${label}：暂无` : `${label} ${value.toFixed(1)}`}
      className={cn(
        "inline-flex flex-none items-center gap-0.5 font-yurui-display font-medium tabular-nums",
        none ? "text-muted-foreground" : "text-yurui-ink2",
        className
      )}
    >
      <StarIcon aria-hidden="true" className={cn("size-3 fill-current", none ? "text-muted-foreground" : "text-yurui-mark")} />
      {none ? "–" : value.toFixed(1)}
    </span>
  )
}

/**
 * The status line: a dot and a word. `ok` mint (seeded), `run` / `next` blue
 * with a blinking dot (airing, next up), `wait` ink, `none` a hollow muted
 * dot. The word is required — the colour never speaks alone.
 */
function PosterCardStatus({
  tone = "wait",
  className,
  children,
  ...props
}: React.ComponentProps<"span"> & { tone?: "ok" | "run" | "next" | "wait" | "none" }) {
  return (
    <span
      data-slot="poster-card-status"
      data-tone={tone}
      className={cn(
        "inline-flex min-w-0 items-center gap-1 text-[12px] leading-[18px] font-semibold whitespace-nowrap",
        "before:size-1.5 before:flex-none before:rounded-full before:bg-current before:content-['']",
        tone === "ok" && "text-yurui-ok",
        (tone === "run" || tone === "next") && "text-yurui-time-ink before:animate-yurui-blink",
        tone === "wait" && "text-yurui-ink2",
        tone === "none" && "text-muted-foreground before:bg-transparent before:shadow-[inset_0_0_0_1.5px_currentColor]",
        className
      )}
      {...props}
    >
      {/* The word ellipsises on a narrow card; the dot never does. */}
      <span className="yurui-ell">{children}</span>
    </span>
  )
}

/** A card-shaped placeholder of the same height, for a loading wall. */
function PosterCardSkeleton({ className, meta = true }: { className?: string; meta?: boolean }) {
  return (
    <div
      data-slot="poster-card-skeleton"
      aria-hidden="true"
      className={cn(
        "@container/poster flex h-full min-w-0 flex-col rounded-[14px] bg-card p-1 shadow-[0_0_0_1px_var(--border),var(--yurui-shadow-panel)] @max-[10rem]/poster:p-[3px]",
        className
      )}
    >
      <div className="aspect-[2/3] animate-pulse rounded-[10px] bg-yurui-deep2 motion-reduce:animate-none" />
      <div className="flex flex-col gap-1.5 px-1 pt-2.5 pb-1">
        <div className="h-3 w-11/12 animate-pulse rounded-[6px] bg-yurui-deep2 motion-reduce:animate-none" />
        <div className="h-3 w-2/3 animate-pulse rounded-[6px] bg-yurui-deep2 motion-reduce:animate-none" />
        {meta ? <div className="mt-2 h-2.5 w-1/2 animate-pulse rounded-[6px] bg-yurui-deep2 motion-reduce:animate-none" /> : null}
      </div>
    </div>
  )
}

/**
 * The poster wall: 3 columns under 600px of its own width, 4 from 600, 6 from
 * 960, 8 from 1360 (a container query — the wall counts its own width, not
 * the window's). Equal 1fr tracks; a short row stays on the left. It also
 * gives each card's sticker its tilt, so a row reads as stuck on by hand.
 */
function PosterGrid({ className, children, ...props }: React.ComponentProps<"div">) {
  return (
    <div data-slot="poster-grid" className="@container/poster-grid w-full min-w-0">
      <div
        className={cn(
          "grid grid-cols-3 gap-2 @min-[37.5rem]/poster-grid:grid-cols-4 @min-[37.5rem]/poster-grid:gap-3 @min-[60rem]/poster-grid:grid-cols-6 @min-[60rem]/poster-grid:gap-4 @min-[85rem]/poster-grid:grid-cols-8",
          "[&>:nth-child(4n+1)]:[--yurui-poster-tilt:-4deg] [&>:nth-child(4n+2)]:[--yurui-poster-tilt:3deg] [&>:nth-child(4n+3)]:[--yurui-poster-tilt:-2deg] [&>:nth-child(4n+4)]:[--yurui-poster-tilt:4deg]",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  )
}

export {
  PosterCard,
  PosterCardAction,
  PosterCardBadge,
  PosterCardPlaceholder,
  PosterCardRating,
  PosterCardSep,
  PosterCardSkeleton,
  PosterCardStatus,
  PosterGrid,
  POSTER_SIZES,
  posterSrcSet,
}
export type { PosterCardProps }
