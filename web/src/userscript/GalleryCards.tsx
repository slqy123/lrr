import { Fragment, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { BookOpen, Languages, Library, Copy, Clock3, CircleAlert, LoaderCircle, Download, Star } from 'lucide-react'
import { categoryAppearance } from './categories'
import { Badge } from '../ui/yurui/badge'
import { IconButton } from '../ui/yurui/icon-button'
import { Checkbox } from '../ui/yurui/checkbox'
import { PosterCard } from '../ui/yurui/poster-card'
import { galleryStatusVariants } from './styles/gallery'
import { displayState, stateLabels, type GalleryState, type Gallery } from './model'
import { GalleryDetails, stateTab, type DetailTab, type LiveGalleryActions } from './GalleryDetails'

function GalleryRating({ rating }: { rating: NonNullable<Gallery['rating']> }) {
  const [x, y] = rating.position.split(' ').map(parseFloat)
  const score = Math.max(0, Math.min(5, 5 + x / 16 - (y < -1 ? 0.5 : 0)))
  return <Badge shape="soft" face="text" variant="warning" aria-label={`原站评分：${score} / 5`}><Star aria-hidden="true" />{score.toFixed(1)}</Badge>
}

const icons = { missing: BookOpen, downloaded: Library, duplicate: Copy, queued: Clock3, checking: LoaderCircle, error: CircleAlert }
export function Status({ state, count }: { state: GalleryState; count?: number }) {
  const Icon = icons[state]
  return <span className={galleryStatusVariants({ state })}><Icon size={14} className={state === 'checking' ? 'animate-spin' : ''} />{stateLabels[state]}{state === 'duplicate' && count ? ` · ${count} 本` : ''}</span>
}

export function GalleryCards({ items, selected, toggle, disabled, detail, live }: {
  items: Gallery[]; selected: Set<number>; toggle: (id: number) => void; disabled: boolean
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
  }, [])
  useEffect(() => { if (expanded && !items.some(item => item.url === expanded.url)) setExpanded(undefined) }, [items, expanded])
  const activeIndex = items.findIndex(item => item.url === expanded?.url)
  const rowEnd = activeIndex < 0 ? -1 : Math.min(items.length - 1, (Math.floor(activeIndex / columns) + 1) * columns - 1)
  const open = (item: Gallery, tab: DetailTab = 'detail') => setExpanded({ url: item.url, tab })
  const close = (restoreFocus = false) => {
    if (restoreFocus && expanded) grid.current?.querySelector<HTMLAnchorElement>(`[data-gallery-id="${items[activeIndex]?.id}"] .card-detail`)?.focus({ preventScroll: true })
    setExpanded(undefined)
  }
  return <div ref={grid} className="gallery-grid grid grid-cols-5 gap-x-[18px] gap-y-6 layout-narrow:grid-cols-3 layout-small:grid-cols-2" onKeyDown={event => { if (expanded && event.key === 'Escape') { event.stopPropagation(); close(true) } }}>{items.map((item, index) => <Fragment key={item.url}><PosterCard className={live ? 'gallery-marker' : undefined} title={item.title} subtitle={item.posted ? <time dateTime={item.posted.replace(' ', 'T')}>{item.posted.slice(0, 16)}</time> : undefined} selected={selected.has(item.id)} data-gallery-id={item.id} data-expanded={live && expanded?.url === item.url ? 'true' : undefined}
    image={item.cover ? <img className="absolute inset-0 size-full object-contain" src={item.cover} alt="" loading="lazy" onError={event => { event.currentTarget.hidden = true }} /> : <div className="cover-placeholder"><BookOpen /><span>暂无封面</span></div>}
    coverAction={<div className="card-category-row"><span className="card-category" style={categoryAppearance(item.category).style}>{categoryAppearance(item.category).label}</span><div className="cover-select"><Checkbox disabled={disabled} aria-label={`选择《${item.title}》`} checked={selected.has(item.id)} onCheckedChange={() => toggle(item.id)} /></div></div>}
    meta={<div className="card-tag-row"><Badge shape="soft" face="text" variant="res"><BookOpen aria-hidden="true" />{item.pages === null ? '页数未知' : `${item.pages} 页`}</Badge>{item.rating ? <GalleryRating rating={item.rating} /> : <Badge shape="soft" face="text" variant="warning"><Star aria-hidden="true" />暂无评分</Badge>}{/chinese|中文/i.test(item.language) && <Badge shape="soft" face="text" variant="lang"><Languages aria-hidden="true" />中文</Badge>}</div>}
    status={<div className={live ? 'card-status-stack' : undefined}>{live ? <button className="status-action" aria-label={`${item.title}：${stateLabels[displayState(item)]}${displayState(item) === 'duplicate' ? `，${item.hits.length} 个候选` : ''}`} onClick={() => open(item, stateTab(item) ? 'state' : 'detail')}><Status state={displayState(item)} count={item.hits.length} /></button> : <Status state={displayState(item)} count={item.hits.length} />}{live && item.links?.some(link => new URL(link.url).pathname === '/gallerytorrents.php') && <IconButton className="relative z-30 ml-auto" size="sm" label={`${item.title}的 BT 种子`} title="BT 下载" onClick={() => open(item, 'torrents')}><Download aria-hidden="true" /></IconButton>}</div>}>
    {detail ? <button className="card-detail" title={item.title} aria-label={`查看《${item.title}》详情`} onClick={() => detail(item)} /> : <a className="card-detail" title={item.title} href={item.url} aria-label={`打开《${item.title}》详情`} aria-expanded={expanded?.url === item.url} onClick={event => { if (live && !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey && event.button === 0) { event.preventDefault(); if (expanded?.url === item.url) close(); else open(item) } }} />}
  </PosterCard>{live && expanded && index === rowEnd && activeIndex >= 0 && <GalleryDetails key={expanded.url} item={items[activeIndex]} tab={expanded.tab} changeTab={tab => setExpanded({ ...expanded, tab })} close={close} live={live} />}</Fragment>)}</div>
}
