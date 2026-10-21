import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { BookOpen, Library, Copy, Clock3, CircleAlert, LoaderCircle, Download } from 'lucide-react'
import { categoryAppearance } from './categories'
import { Button } from '../ui/yurui/button'
import { Checkbox } from '../ui/yurui/checkbox'
import { PosterCard } from '../ui/yurui/poster-card'
import { galleryGridVariants, galleryStatusVariants, cardCategoryRowStyles, cardCategoryStyles, coverSelectStyles, coverPlaceholderStyles, cardDetailStyles, nativeRatingStyles, cardStatusStackStyles, cardNativeMetaStyles, statusActionStyles } from '../ui/yurui/gallery'
import { displayState, stateLabels, type GalleryState, type Gallery } from './model'
import { GalleryDetails, stateTab, type DetailTab, type LiveGalleryActions } from './GalleryDetails'

const icons = { missing: BookOpen, downloaded: Library, duplicate: Copy, queued: Clock3, checking: LoaderCircle, error: CircleAlert }
export function Status({ state }: { state: GalleryState }) {
  const Icon = icons[state]
  return <span className={galleryStatusVariants({ state })}><Icon size={14} className={state === 'checking' ? 'animate-spin' : ''} />{stateLabels[state]}</span>
}

export function GalleryCards({ items, selected, toggle, disabled, compact, detail, live }: {
  items: Gallery[]; selected: Set<number>; toggle: (id: number) => void; disabled: boolean; compact: boolean
  detail?: (item: Gallery) => void
  live?: LiveGalleryActions
}) {
  const grid = useRef<HTMLDivElement>(null)
  const [columns, setColumns] = useState(1)
  const [expanded, setExpanded] = useState<{ url: string; tab: DetailTab }>()
  useLayoutEffect(() => {
    if (!grid.current) return
    const observer = new ResizeObserver(() => {
      if (grid.current) setColumns(getComputedStyle(grid.current).gridTemplateColumns.split(' ').length)
    })
    observer.observe(grid.current)
    return () => observer.disconnect()
  }, [compact])
  useEffect(() => { if (expanded && !items.some(item => item.url === expanded.url)) setExpanded(undefined) }, [items, expanded])
  const activeIndex = items.findIndex(item => item.url === expanded?.url)
  const rowEnd = activeIndex < 0 ? -1 : Math.min(items.length - 1, (Math.floor(activeIndex / columns) + 1) * columns - 1)
  const open = (item: Gallery, tab: DetailTab = 'detail') => setExpanded({ url: item.url, tab })
  const close = (restoreFocus = false) => {
    if (restoreFocus && expanded) grid.current?.querySelector<HTMLAnchorElement>(`[data-gallery-id="${items[activeIndex]?.id}"] .card-detail`)?.focus({ preventScroll: true })
    setExpanded(undefined)
  }
  return <div ref={grid} className={galleryGridVariants({ compact })} data-compact={compact} onKeyDown={event => { if (expanded && event.key === 'Escape') { event.stopPropagation(); close(true) } }}>{items.map((item, index) => <Fragment key={item.url}><PosterCard className={live ? 'yurui-gallery-marker' : undefined} title={item.title} subtitle={item.author} selected={selected.has(item.id)} data-gallery-id={item.id} data-expanded={live && expanded?.url === item.url ? 'true' : undefined}
    image={item.cover ? <img className="absolute inset-0 size-full object-contain" src={item.cover} alt="" loading="lazy" onError={event => { event.currentTarget.hidden = true }} /> : <div className={coverPlaceholderStyles}><BookOpen /><span>暂无封面</span></div>}
    coverAction={<div className={cardCategoryRowStyles}><span className={cardCategoryStyles} style={categoryAppearance(item.category).style}>{categoryAppearance(item.category).label}</span><div className={coverSelectStyles}><Checkbox disabled={disabled} aria-label={`选择《${item.title}》`} checked={selected.has(item.id)} onCheckedChange={() => toggle(item.id)} /></div></div>}
    meta={<>{item.pages !== null && <span>{item.pages} 页</span>}{item.pages !== null && item.language && <span className="text-input">·</span>}<span>{item.language}</span>{item.rating && <span className={nativeRatingStyles} role="img" aria-label="原站评分" style={{ backgroundImage: item.rating.image, backgroundPosition: item.rating.position, opacity: item.rating.opacity }} />}</>}
    status={<div className={live ? cardStatusStackStyles : undefined}>{live && (item.posted || item.links?.some(link => new URL(link.url).pathname === '/gallerytorrents.php')) && <div className={cardNativeMetaStyles}>{item.posted && <time dateTime={item.posted.replace(' ', 'T')}>{item.posted.split(' ')[0]}</time>}{item.links?.some(link => new URL(link.url).pathname === '/gallerytorrents.php') && <Button className="z-30" variant="secondary" size="xs" aria-label={`${item.title}的 BT 种子`} onClick={() => open(item, 'torrents')}><Download />BT</Button>}</div>}{live ? <button className={statusActionStyles} aria-label={`${item.title}：${stateLabels[displayState(item)]}`} onClick={() => open(item, stateTab(item) ? 'state' : 'detail')}><Status state={displayState(item)} /></button> : <Status state={displayState(item)} />}</div>}>
    {detail ? <button className={cardDetailStyles} title={item.title} aria-label={`查看《${item.title}》详情`} onClick={() => detail(item)} /> : <a className={cardDetailStyles} title={item.title} href={item.url} aria-label={`打开《${item.title}》详情`} aria-expanded={expanded?.url === item.url} onClick={event => { if (live && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0) { event.preventDefault(); if (expanded?.url === item.url) close(); else open(item) } }} />}
  </PosterCard>{live && expanded && index === rowEnd && activeIndex >= 0 && <GalleryDetails key={expanded.url} item={items[activeIndex]} tab={expanded.tab} changeTab={tab => setExpanded({ ...expanded, tab })} close={close} live={live} />}</Fragment>)}</div>
}
