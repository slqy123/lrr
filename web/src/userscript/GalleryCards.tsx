import * as React from 'react'
import { useEffect, useRef, useState } from 'react'
import { BookOpen, Library, Copy, Clock3, CircleAlert, LoaderCircle, MoreHorizontal } from 'lucide-react'
import { Badge } from '../ui/anibt/badge'
import { Button } from '../ui/anibt/button'
import { Checkbox } from '../ui/anibt/checkbox'
import { PosterCard } from '../ui/anibt/poster-card'
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from '../ui/anibt/popover'
import { displayState, stateLabels, type GalleryState, type Gallery } from './model'

const icons = { missing: BookOpen, downloaded: Library, duplicate: Copy, queued: Clock3, checking: LoaderCircle, error: CircleAlert }
export function Status({ state }: { state: GalleryState }) {
  const Icon = icons[state]
  return <span className={`gallery-status status-${state}`}><Icon size={14} className={state === 'checking' ? 'animate-spin' : ''} />{stateLabels[state]}</span>
}

function LibraryDetails({ item, portal, server, recheck }: { item: Gallery; portal: HTMLElement; server: string; recheck: () => void }) {
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const restoringFocus = useRef(false)
  const keyboardInteraction = useRef(false)
  const enter = () => { clearTimeout(timer.current); setOpen(true) }
  const leave = () => { timer.current = setTimeout(() => setOpen(false), 180) }
  useEffect(() => () => clearTimeout(timer.current), [])
  const state = displayState(item)
  const base = server.replace(/\/+$/, '')
  return <Popover open={open} onOpenChange={setOpen}>
    <PopoverTrigger asChild><button className="status-action" aria-label={`${item.title}：${stateLabels[state]}`} onPointerEnter={() => { keyboardInteraction.current = false; enter() }} onPointerLeave={leave} onKeyDown={() => { keyboardInteraction.current = true }} onFocus={event => { if (!restoringFocus.current) { keyboardInteraction.current = event.currentTarget.matches(':focus-visible'); enter() } }} onBlur={leave} onClick={event => { event.preventDefault(); enter() }}><Status state={state} /></button></PopoverTrigger>
    <PopoverContent container={portal} className="library-details" onKeyDown={() => { keyboardInteraction.current = true }} onPointerEnter={enter} onPointerLeave={leave} onFocusCapture={enter} onBlurCapture={leave} onOpenAutoFocus={event => event.preventDefault()} onCloseAutoFocus={event => { if (!keyboardInteraction.current) event.preventDefault(); restoringFocus.current = true; queueMicrotask(() => { restoringFocus.current = false }) }}>
      <PopoverTitle>{stateLabels[state]}</PopoverTitle>
      {item.status === 'checking' && <p>正在查询书库；尚不能判断是否收录。</p>}
      {item.status === 'missing' && !item.queue && <p>URL 未命中，且已启用的标题检查未找到匹配。</p>}
      {item.error && <p role="alert">书库：{item.error}。查询异常不代表未收录。</p>}
      {item.queue && <div className="queue-detail"><strong>{item.queue.label}</strong>{item.queue.label !== '队列查询失败' && <p>尝试 {item.queue.attempts} / {item.queue.max_attempts}</p>}{item.queue.next_attempt_at && <p>下次尝试：{new Date(item.queue.next_attempt_at * 1000).toLocaleString()}</p>}{item.queue.error && <p>{item.queue.error}</p>}</div>}
      {item.hits.slice(0, 10).map(hit => <article className="archive-hit" key={hit.id}>
        <div className="archive-hit-heading"><img src={`${base}/api/archivethumbnail?id=${encodeURIComponent(hit.id)}`} alt="" loading="lazy" referrerPolicy="no-referrer" onError={event => { event.currentTarget.hidden = true }} /><strong>{hit.title}</strong></div>
        <p className="muted">{hit.pagecount ? `${hit.pagecount} 页 · ` : ''}{hit.filesize ? `${(hit.filesize / 1048576).toFixed(1)} MB` : ''}</p>
        {hit.tags && <p className="archive-tags">{hit.tags}</p>}
        <div className="flex gap-2"><Button asChild size="sm"><a href={`${base}/reader?id=${encodeURIComponent(hit.id)}`} target="_blank" rel="noopener noreferrer">阅读器</a></Button><Button asChild size="sm" variant="secondary"><a href={`${base}/edit?id=${encodeURIComponent(hit.id)}`} target="_blank" rel="noopener noreferrer">编辑</a></Button></div>
      </article>)}
      {item.search && base && <a className="library-link" href={`${base}/?${new URLSearchParams({ sort: '1', sortdir: 'desc', q: item.search })}`} target="_blank" rel="noopener noreferrer">在 LANraragi 中查看全部 →</a>}
      <Button size="sm" variant="ghost" onClick={() => { setOpen(false); recheck() }}>重新检查</Button>
    </PopoverContent>
  </Popover>
}

export function GalleryCards({ items, selected, toggle, disabled, compact, detail, live }: {
  items: Gallery[]; selected: Set<number>; toggle: (id: number) => void; disabled: boolean; compact: boolean
  detail?: (item: Gallery) => void
  live?: { portal: HTMLElement; server: string; recheck: () => void }
}) {
  return <div className="gallery-grid" data-compact={compact}>{items.map(item => <PosterCard key={item.url} title={item.title} subtitle={item.author} selected={selected.has(item.id)}
    image={item.cover ? <img className="absolute inset-0 size-full object-contain" src={item.cover} alt="" loading="lazy" onError={event => { event.currentTarget.hidden = true }} /> : <div className="cover-placeholder"><BookOpen /><span>暂无封面</span></div>}
    sticker={<Badge variant={item.category === '画集' ? 'water' : 'sticker'}>{item.category}</Badge>}
    coverAction={<div className="cover-select"><Checkbox disabled={disabled} aria-label={`选择《${item.title}》`} checked={selected.has(item.id)} onCheckedChange={() => toggle(item.id)} /></div>}
    meta={<>{item.pages !== null && <span>{item.pages} 页</span>}{item.pages !== null && item.language && <span className="meta-dot">·</span>}<span>{item.language}</span>{item.rating && <span className="native-rating" role="img" aria-label="原站评分" style={{ backgroundImage: item.rating.image, backgroundPosition: item.rating.position, opacity: item.rating.opacity }} />}</>}
    status={live ? <LibraryDetails item={item} {...live} /> : <Status state={displayState(item)} />}>
    {detail ? <button className="card-detail" title={item.title} aria-label={`查看《${item.title}》详情`} onClick={() => detail(item)} /> : <a className="card-detail" title={item.title} href={item.url} aria-label={`打开《${item.title}》`} />}
    {live && (item.posted || item.links?.length) && <Popover><PopoverTrigger asChild><Button className="card-more" variant="secondary" size="icon-sm" aria-label={`${item.title}的原站操作`}><MoreHorizontal /></Button></PopoverTrigger><PopoverContent container={live.portal} align="end"><PopoverTitle>原站操作</PopoverTitle>{item.posted && <p className="muted">发布于 {item.posted}</p>}<nav className="native-links">{item.links?.map((link, index) => <a key={index} href={link.url} target="_blank" rel="noopener noreferrer">{link.title}</a>)}</nav></PopoverContent></Popover>}
  </PosterCard>)}</div>
}
