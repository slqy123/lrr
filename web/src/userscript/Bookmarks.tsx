import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Search, Save, Trash2, Play, Plus, CalendarDays, Clock, Filter, Files, Check, X } from 'lucide-react'
import type { CSSProperties } from 'react'
import { IconButton } from '../ui/yurui/icon-button'
import { useToast } from '../ui/yurui/toast'
import { categories, type GalleryPage } from './page'

type SaveSlot = { url: string; time: number; query: string; id?: number; title: string; cover?: string; offset: number; scroll: number; fields?: [string, string][]; minDate?: string; maxDate?: string }

const parameterLabels: Record<string, string> = { f_sh: '包括已删除画廊', f_sto: '必须有种子', f_sfl: '忽略语言过滤', f_sfu: '忽略上传者过滤', f_sft: '忽略标签过滤', f_srdd: '最低评分', next: '向后游标', prev: '向前游标', seek: '定位日期', jump: '时间跨度', range: '结果区间', page: '列表页码' }
function SearchSnapshot({ slot }: { slot: SaveSlot }) {
  const params = new URLSearchParams(new URL(slot.url).search)
  if (Array.isArray(slot.fields)) for (const [name, value] of slot.fields) if (!params.has(name)) params.append(name, value)
  const mask = Number(params.get('f_cats') || 0)
  const excluded = new Set(['f_search', 'f_cats', 'advsearch', 'f_spf', 'f_spt', 'apply', 'inline_set'])
  const extra = [...params].filter(([name, value]) => !excluded.has(name) && value !== '' && value !== '0')
  return <div className="bookmark-search">
    <div className="bookmark-search-heading">
      {slot.cover && <img key={slot.cover} className="bookmark-cover" src={slot.cover} alt="" onError={event => { event.currentTarget.hidden = true }} />}
      <div className="bookmark-search-summary">
    <div className="bookmark-fact"><Search size={16} aria-label="搜索内容" /><strong>{params.get('f_search') || slot.query || '全部作品'}</strong></div>
    <div className="bookmark-fact"><Filter size={15} aria-label="作品分类" /><span>{mask === 0 ? '全部分类' : categories.filter(([bit]) => !(mask & bit)).map(([, title]) => title).join(' · ') || '无分类'}</span></div>
    {(params.get('f_spf') || params.get('f_spt')) && <div className="bookmark-fact"><Files size={15} aria-label="页数范围" /><span>{params.get('f_spf') || '0'}–{params.get('f_spt') || '∞'} 页</span></div>}
    {(slot.minDate || slot.maxDate) && <div className="bookmark-fact"><CalendarDays size={15} aria-label="结果日期范围" /><span>{slot.minDate || '…'} — {slot.maxDate || '…'}</span></div>}
      </div>
    </div>
    {extra.length > 0 && <dl className="bookmark-parameters">{extra.map(([name, value], index) => <div key={index}><dt>{parameterLabels[name] || name}</dt><dd>{value === 'on' ? <Check size={14} aria-label="已开启" /> : value}</dd></div>)}</dl>}
    <div className="bookmark-fact text-muted-foreground"><Clock size={14} aria-label="存档时间" /><time>{new Date(slot.time).toLocaleString()}</time></div>
  </div>
}
const storageKey = `yurulib-bookmarks-v1:${location.origin}`
function readSlots(): (SaveSlot | null)[] {
  try {
    const value = GM_getValue<unknown>(storageKey, [])
    return Array.from({ length: 12 }, (_, index) => {
      const slot = Array.isArray(value) ? value[index] : null
      if (!slot || typeof slot.url !== 'string' || new URL(slot.url).origin !== location.origin || typeof slot.title !== 'string' || typeof slot.query !== 'string' || !Number.isFinite(slot.time) || !Number.isFinite(slot.scroll) || !Number.isFinite(slot.offset) || (slot.id !== undefined && !Number.isSafeInteger(slot.id))) return null
      return slot
    })
  } catch { return Array(12).fill(null) }
}

export function Bookmarks({ page, host, loading, navigate }: { page: GalleryPage; host: HTMLElement; loading: boolean; navigate: (url: string) => Promise<boolean> }) {
  const [slots, setSlots] = useState(readSlots)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [confirm, setConfirm] = useState<string>()
  const dock = useRef<HTMLElement>(null)
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const cancelClose = () => { clearTimeout(closeTimer.current); closeTimer.current = undefined }
  const close = () => { cancelClose(); setOpen(false); setConfirm(undefined) }
  const reveal = () => { cancelClose(); setOpen(true) }
  const scheduleClose = () => {
    if (closeTimer.current !== undefined) return
    closeTimer.current = setTimeout(() => {
      closeTimer.current = undefined
      if (!document.hasFocus() || dock.current?.querySelector(':focus-visible') || dock.current?.matches(':focus-visible')) return
      close()
    }, 240)
  }
  useEffect(() => {
    if (!open) return
    const move = (event: PointerEvent) => {
      if (event.composedPath().includes(dock.current!) || event.clientX >= document.documentElement.clientWidth - 4) cancelClose()
      else scheduleClose()
    }
    const press = (event: PointerEvent) => {
      if (!event.composedPath().includes(dock.current!) && event.clientX < document.documentElement.clientWidth - 4) close()
    }
    document.addEventListener('pointermove', move)
    document.addEventListener('pointerdown', press)
    window.addEventListener('blur', cancelClose)
    return () => {
      cancelClose()
      document.removeEventListener('pointermove', move)
      document.removeEventListener('pointerdown', press)
      window.removeEventListener('blur', cancelClose)
    }
  }, [open])
  const busy = useRef(false)
  const [restoring, setRestoring] = useState(false)
  const { notify } = useToast()
  const disabled = loading || restoring
  const persist = (index: number, value: SaveSlot | null) => {
    const next = [...slots]
    next[index] = value
    try { GM_setValue(storageKey, next); setSlots(next); setConfirm(undefined); return true }
    catch { notify({ tone: 'fail', message: '存档写入失败，原存档已保留。' }); return false }
  }
  const save = (index: number) => {
    if (disabled) return
    if (slots[index] && confirm !== `save-${index}`) { setConfirm(`save-${index}`); return }
    const cards = [...(host.shadowRoot?.querySelectorAll<HTMLElement>('[data-gallery-id]') || [])]
    const card = cards.find(node => node.getBoundingClientRect().bottom > 0 && node.getBoundingClientRect().top < window.innerHeight) || cards[0]
    const gallery = page.galleries.find(item => item.id === Number(card?.dataset.galleryId))
    if (persist(index, { url: location.href, time: Date.now(), query: new URLSearchParams(page.fields).get('f_search') || '全部作品', fields: page.fields, minDate: page.navigation.minDate, maxDate: page.navigation.maxDate, id: gallery?.id, title: gallery?.title || '列表位置', cover: gallery?.cover, offset: card?.getBoundingClientRect().top || 0, scroll: window.scrollY })) notify({ tone: 'ok', message: `已保存到书签 ${index + 1}。` })
  }
  const load = async (index: number) => {
    const slot = slots[index]
    if (!slot || disabled || busy.current) return
    busy.current = true
    setRestoring(true)
    setConfirm(undefined)
    try {
      if (!await navigate(slot.url)) return
      requestAnimationFrame(() => {
        const card = slot.id === undefined ? null : host.shadowRoot?.querySelector<HTMLElement>(`[data-gallery-id="${slot.id}"]`)
        window.scrollTo({ top: card ? window.scrollY + card.getBoundingClientRect().top - slot.offset : slot.scroll, behavior: 'instant' })
        notify({ tone: card || slot.id === undefined ? 'ok' : 'mute', message: card || slot.id === undefined ? `已读取书签 ${index + 1}。` : '原作品已不在此页，已恢复到保存的列表位置。' })
        setOpen(false)
      })
    } finally { busy.current = false; setRestoring(false) }
  }
  const slot = slots[active]
  const info = useRef<HTMLDivElement>(null)
  const [infoHeight, setInfoHeight] = useState(0)
  useLayoutEffect(() => {
    if (!info.current) return
    const observer = new ResizeObserver(() => setInfoHeight(info.current?.getBoundingClientRect().height || 0))
    observer.observe(info.current)
    return () => observer.disconnect()
  }, [])
  return <aside ref={dock} className="bookmark-dock" data-open={open} tabIndex={0} aria-label="浏览进度书签" onFocus={reveal} onBlur={event => { if (event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) scheduleClose() }} onPointerEnter={reveal} onPointerLeave={event => {
    if (!event.relatedTarget || event.clientX >= document.documentElement.clientWidth - 4) cancelClose()
    else scheduleClose()
  }} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); close() } }}>
    <section className="bookmark-panel" style={{ '--bookmark-index': active, '--bookmark-info-height': `${infoHeight}px` } as CSSProperties} inert={!open} aria-label="浏览手帖">
      <div className="bookmark-slots">{slots.map((saved, index) => <div key={index} className="bookmark-slot" data-active={active === index} onMouseEnter={() => { setActive(index); setConfirm(undefined) }} onFocus={() => setActive(index)}>
        <button className="bookmark-tab" data-saved={!!saved} disabled={disabled} onClick={() => saved ? void load(index) : save(index)} aria-label={`书签 ${index + 1}：${saved ? `读取 ${saved.query}` : '空，点击存档'}`}><span>{index + 1}</span>{!saved && <Plus className="bookmark-empty" size={12} aria-hidden="true" />}{saved && <span className="bookmark-saved" aria-hidden="true" />}</button>
      </div>)}</div>
      <div ref={info} className="bookmark-info" data-visible={!!slot} aria-live="polite" inert={!slot}>
        {slot && <><SearchSnapshot slot={slot} /><div className="flex justify-end gap-2 mt-3"><IconButton label="读取存档" disabled={disabled} onClick={() => void load(active)}><Play size={16} /></IconButton><IconButton label={`覆盖书签 ${active + 1}`} disabled={disabled} onClick={() => save(active)}><Save size={14} /></IconButton><IconButton label={`删除书签 ${active + 1}`} disabled={disabled} onClick={() => setConfirm(`delete-${active}`)}><Trash2 size={14} /></IconButton></div></>}
        {confirm && <div className="mt-3 flex items-center gap-2" role="alert"><span>{confirm.startsWith('save') ? '覆盖此存档？' : '删除此存档？'}</span><IconButton label="确认" disabled={disabled} onClick={() => confirm.startsWith('save') ? save(active) : persist(active, null)}><Check size={16} /></IconButton><IconButton label="取消" onClick={() => setConfirm(undefined)}><X size={16} /></IconButton></div>}
      </div>
    </section>
  </aside>
}
