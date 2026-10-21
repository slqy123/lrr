import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { ChevronDown, ChevronUp, Copy, Download, ExternalLink, Link, RefreshCw, X } from 'lucide-react'
import { Button } from '../ui/anibt/button'
import { Badge } from '../ui/anibt/badge'
import { Feedback, type FeedbackMessage } from './Feedback'
import { copyLinks, type createClient } from './client'
import { displayState, type Gallery } from './model'
import type { Torrent } from './torrents'
import type { GallerySummary, PreviewPage } from './details'
import { categoryAppearance } from './categories'

const tagGroupLabels: Record<string, string> = { language: '语言', parody: '原作', character: '角色', group: '社团', artist: '作者', male: '男性', female: '女性', mixed: '混合', other: '其他', location: '地点', cosplayer: '角色扮演者', reclass: '重新分类', temp: '临时' }

export type DetailTab = 'detail' | 'torrents' | 'state'
export interface LiveGalleryActions {
  server: string
  recheck: () => void
  client: ReturnType<typeof createClient>
  refreshQueue: () => void
}

export function stateTab(item: Gallery) {
  const state = displayState(item)
  return state === 'downloaded' ? '书库' : state === 'duplicate' ? '重复作品' : state === 'queued' ? '队列' : undefined
}

function TagGroup({ group }: { group: GallerySummary['tagGroups'][number] }) {
  const container = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [hiddenCount, setHiddenCount] = useState(0)
  const label = tagGroupLabels[group.name] || group.name
  useLayoutEffect(() => {
    const list = container.current!
    const tags = [...list.querySelectorAll<HTMLAnchorElement>('a')]
    const button = list.querySelector<HTMLButtonElement>('button')!
    const count = button.querySelector('span')!
    let width = -1
    const fit = () => {
      width = list.clientWidth
      tags.forEach(tag => { tag.hidden = false })
      button.hidden = true
      if (expanded) { button.hidden = false; return }
      const tops = tags.map(tag => Math.round(tag.getBoundingClientRect().top))
      const rows = [...new Set(tops)]
      if (rows.length <= 2) { setHiddenCount(0); return }
      const limit = rows[1] + 1
      let visible = tops.findIndex(top => top > limit)
      tags.slice(visible).forEach(tag => { tag.hidden = true })
      button.hidden = false
      count.textContent = `+${tags.length - visible}`
      while (visible > 0 && button.getBoundingClientRect().top > limit) {
        tags[--visible].hidden = true
        count.textContent = `+${tags.length - visible}`
      }
      setHiddenCount(tags.length - visible)
    }
    fit()
    const observer = new ResizeObserver(() => { if (list.clientWidth !== width) fit() })
    observer.observe(list)
    return () => observer.disconnect()
  }, [group, expanded])
  return <div><dt><span>{label}</span><small>{group.tags.length}</small></dt><dd><div className="detail-tags" ref={container}>
    {group.tags.map(tag => <Badge key={tag.url} asChild face="text"><a href={tag.url} target="_blank" rel="noopener noreferrer">{tag.title}</a></Badge>)}
    <button type="button" className="detail-tags-toggle" hidden={!expanded && !hiddenCount} aria-expanded={expanded} aria-label={expanded ? `收起${label}标签` : `展开${label}其余 ${hiddenCount} 个标签`} title={expanded ? '收起标签' : `展开其余 ${hiddenCount} 个标签`} onClick={() => setExpanded(value => !value)}><span hidden={expanded}>+{hiddenCount}</span>{expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}</button>
  </div></dd></div>
}

function GalleryInformation({ summary }: { summary: GallerySummary }) {
  const facts = summary.facts.filter(fact => fact.label !== '语言' || !summary.tagGroups.some(group => group.name === 'language'))
  return <>
    {(facts.length > 0 || summary.tagGroups.length > 0) && <div className="detail-columns">
      {facts.length > 0 && <section className="detail-info"><h4>画廊资料</h4><dl className="detail-facts">{facts.map((fact, index) => <div key={index}><dt>{fact.label}</dt><dd>{fact.url ? <a className="library-link" href={fact.url} target="_blank" rel="noopener noreferrer">{fact.label === '分类' ? categoryAppearance(fact.value).label : fact.value}</a> : fact.value}</dd></div>)}</dl></section>}
      {facts.length > 0 && summary.tagGroups.length > 0 && <div className="detail-column-divider anibt-stitch-side" aria-hidden="true" />}
      {summary.tagGroups.length > 0 && <section className="detail-tag-section"><h4>作品标签 <span className="muted">{summary.tagGroups.reduce((total, group) => total + group.tags.length, 0)}</span></h4><dl className="detail-tag-groups" aria-label="作品标签">{summary.tagGroups.map((group, index) => <TagGroup key={`${group.name}-${index}`} group={group} />)}</dl></section>}
    </div>}
    {summary.description && <p className="detail-description anibt-stitch-over">{summary.description}</p>}
  </>
}

function PagePreview({ page }: { page: PreviewPage }) {
  const [failed, setFailed] = useState(false)
  const sprite = page.sprite
  return <a className="detail-preview-page anibt-well" href={page.url} target="_blank" rel="noopener noreferrer" aria-label={`打开第 ${page.page} 页`}>
    <span className="detail-preview-image">
      {failed || (!sprite && !page.image) ? <span className="muted">图片不可用</span> : sprite ? <span className="detail-preview-sprite" style={{ width: sprite.width, height: sprite.height, backgroundImage: `url("${sprite.image}")`, backgroundPosition: sprite.position, backgroundSize: sprite.size, transform: `translate(-50%, -50%) scale(${Math.min(104 / sprite.width, 140 / sprite.height)})` }}><img hidden src={sprite.image} alt="" onError={() => setFailed(true)} /></span> : <img src={page.image} alt={`第 ${page.page} 页预览`} onError={() => setFailed(true)} />}
    </span><small>第 {page.page} 页</small>
  </a>
}

export function GalleryDetails({ item, tab: requestedTab, changeTab, close, live }: {
  item: Gallery; tab: DetailTab; changeTab: (tab: DetailTab) => void; close: (restoreFocus?: boolean) => void; live: LiveGalleryActions
}) {
  const id = useId()
  const heading = useRef<HTMLElement>(null)
  useEffect(() => { heading.current?.scrollIntoView({ block: 'nearest' }) }, [item.url])
  const stateLabel = stateTab(item)
  const torrentLink = item.links?.find(link => new URL(link.url).pathname === '/gallerytorrents.php')
  const tab = requestedTab === 'state' && !stateLabel || requestedTab === 'torrents' && !torrentLink ? 'detail' : requestedTab
  const [summary, setSummary] = useState<GallerySummary>()
  const [detailError, setDetailError] = useState('')
  const [detailRevision, setDetailRevision] = useState(0)
  useEffect(() => {
    if (tab !== 'detail') return
    let active = true
    const controller = new AbortController()
    setSummary(undefined)
    setDetailError('')
    void live.client.details(item.url, controller.signal).then(value => { if (active) setSummary(value) }, reason => { if (active) setDetailError(reason instanceof Error ? reason.message : '详情加载失败') })
    return () => { active = false; controller.abort() }
  }, [tab, item.url, live.client, detailRevision])
  const [resources, setResources] = useState<Torrent[]>()
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null)
  useEffect(() => {
    setResources(undefined)
    setError('')
  }, [item.url, live.client])
  useEffect(() => {
    if (tab !== 'torrents' || !torrentLink) return
    let active = true
    const controller = new AbortController()
    setError('')
    setResources(undefined)
    void live.client.torrents(torrentLink.url, controller.signal).then(value => { if (active) setResources(value) }, reason => { if (active) setError(reason instanceof Error ? reason.message : '种子加载失败') })
    return () => { active = false; controller.abort() }
  }, [tab, torrentLink?.url, live.client, revision])
  const base = live.server.replace(/\/+$/, '')
  const send = async () => {
    if (sending) return
    setSending(true)
    try {
      const result = await live.client.send([item.url])
      setFeedback({ tone: 'ok', message: `队列已接收：新增 ${result.added}，已有 ${result.duplicates}。` })
      live.refreshQueue()
    } catch (reason) { setFeedback({ tone: 'fail', message: reason instanceof Error ? reason.message : '发送失败，可以重试' }) }
    finally { setSending(false) }
  }
  const tabs: { key: DetailTab; label: string }[] = [{ key: 'detail', label: '详情' }, ...(torrentLink ? [{ key: 'torrents' as const, label: 'BT 种子' }] : []), ...(stateLabel ? [{ key: 'state' as const, label: stateLabel }] : [])]
  return <section className="gallery-details anibt-sheet" aria-label={`${item.title}详情`} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); close(true) } }}>
    <header ref={heading} className="gallery-details-heading">
      <div className="detail-heading-text"><h3>{item.title}</h3></div>
      <div className="detail-heading-actions">
        {item.links?.filter(link => link !== torrentLink).map((link, index) => <Button key={index} asChild variant="ghost" size="sm"><a href={link.url} target="_blank" rel="noopener noreferrer">{link.title} <ExternalLink size={13} /></a></Button>)}
        <Button asChild variant="ghost" size="sm"><a href={item.url} target="_blank" rel="noopener noreferrer">打开详情页 <ExternalLink size={13} /></a></Button>
        <Button variant="ghost" size="icon-sm" aria-label="收起作品详情" onClick={() => close()}><X /></Button>
      </div>
    </header>
    <nav className="detail-tabs anibt-tabs" role="tablist" aria-label="作品信息">{tabs.map((entry, index) => <button key={entry.key} type="button" className={tab === entry.key ? 'anibt-tab anibt-tab-on' : 'anibt-tab'} role="tab" id={`${id}-${entry.key}`} aria-controls={`${id}-content`} aria-selected={tab === entry.key} tabIndex={tab === entry.key ? 0 : -1} onClick={() => changeTab(entry.key)} onKeyDown={event => {
      const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1
      if (next < 0) return
      event.preventDefault()
      changeTab(tabs[next].key)
      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role=tab]')[next]?.focus()
    }}>{entry.label}</button>)}</nav>
    <div className="detail-content" id={`${id}-content`} role="tabpanel" aria-labelledby={`${id}-${tab}`}>
      {tab === 'detail' && <div className="detail-summary">
        {detailError ? <div className="detail-load-error"><p role="alert">{detailError}</p><Button variant="ghost" size="sm" onClick={() => setDetailRevision(value => value + 1)}><RefreshCw size={14} />重试详情</Button></div> : !summary ? <p className="muted" role="status">正在加载作品详情…</p> : <>
          <GalleryInformation summary={summary} />
          <div className="detail-previews anibt-stitch-over" aria-label="前五页图片预览">{summary.previews.map(page => <PagePreview key={page.url} page={page} />)}<div className="detail-preview-more"><a className="library-link" href={item.url} target="_blank" rel="noopener noreferrer">查看全部{summary.pages !== undefined ? ` ${summary.pages} 页` : ''} <ExternalLink size={12} /></a><span className="muted">{summary.previews.length ? `按原站顺序预览前 ${summary.previews.length} 页` : '未能读取图片预览，请打开详情页查看'}</span></div></div>
        </>}
        {item.status === 'checking' && <p role="status">正在检查书库，尚不能判断是否收录。</p>}
        {item.error && <p role="alert">书库：{item.error}。查询异常不代表未收录。</p>}
        {item.queue?.label === '队列查询失败' && <p role="alert">队列：{item.queue.error || item.queue.label}。查询异常不代表未入队。</p>}
        {(item.error || item.queue?.label === '队列查询失败') && <Button variant="ghost" size="sm" onClick={live.recheck}><RefreshCw size={14} />重新检查</Button>}
      </div>}
      {tab === 'torrents' && <div className="torrent-list"><div className="torrent-toolbar"><span className="muted">{resources ? `${resources.length} 个种子` : '原站种子'}</span><Button variant="ghost" size="sm" onClick={() => setRevision(value => value + 1)}><RefreshCw size={14} />重新加载</Button><a className="library-link" href={torrentLink!.url} target="_blank" rel="noopener noreferrer">打开原站种子页 <ExternalLink size={12} /></a></div>
        {error ? <p role="alert">{error}。可重新加载，或打开原站确认。</p> : !resources ? <p role="status">正在加载种子列表…</p> : !resources.length ? <p>原站暂无种子。</p> : resources.map(resource => <article className="torrent-row anibt-stitch-over" key={resource.url}><div><h4>{resource.title}</h4><p className="muted">{resource.metadata.join(' · ')}</p></div><div className="torrent-actions">{resource.magnet && <Button asChild variant="secondary" size="sm"><a href={resource.magnet}><Link size={14} />磁力</a></Button>}<Button asChild variant="secondary" size="sm"><a href={resource.url}><Download size={14} />下载种子</a></Button></div></article>)}
      </div>}
      {tab === 'state' && (stateLabel === '队列' ? <div className="queue-detail"><h4>{item.queue?.label}</h4><p>尝试 {item.queue?.attempts} / {item.queue?.max_attempts}</p>{item.queue?.next_attempt_at && <p>下次尝试：{new Date(item.queue.next_attempt_at * 1000).toLocaleString()}</p>}{item.queue?.error && <p role="alert">{item.queue.error}</p>}</div> : <div className="library-details"><h4>{stateLabel === '重复作品' ? '标题检查发现疑似重复作品' : '已在书库中找到该作品'}</h4>{!item.hits.length && <p>原站 URL 已命中，但服务未返回可打开的条目 ID。</p>}{item.hits.map(hit => <article className="archive-hit anibt-stitch-over" key={hit.id}><div className="archive-hit-heading"><img src={`${base}/api/archivethumbnail?id=${encodeURIComponent(hit.id)}`} alt="" loading="lazy" referrerPolicy="no-referrer" onError={event => { event.currentTarget.hidden = true }} /><strong>{hit.title}</strong></div><p className="muted">{[hit.pagecount ? `${hit.pagecount} 页` : '', hit.filesize ? `${(hit.filesize / 1048576).toFixed(1)} MB` : ''].filter(Boolean).join(' · ')}</p>{hit.tags && <p className="archive-tags">{hit.tags}</p>}<div className="torrent-actions"><Button asChild size="sm"><a href={`${base}/reader?id=${encodeURIComponent(hit.id)}`} target="_blank" rel="noopener noreferrer">阅读器</a></Button><Button asChild variant="secondary" size="sm"><a href={`${base}/edit?id=${encodeURIComponent(hit.id)}`} target="_blank" rel="noopener noreferrer">编辑</a></Button></div></article>)}{item.search && base && <a className="library-link" href={`${base}/?${new URLSearchParams({ sort: '1', sortdir: 'desc', q: item.search })}`} target="_blank" rel="noopener noreferrer">在 LANraragi 中查看全部 →</a>}</div>)}
      {tab === 'state' && <Button variant="ghost" size="sm" onClick={live.recheck}><RefreshCw size={14} />重新检查</Button>}
    </div>
    <footer className="detail-footer anibt-stitch-over"><div className="torrent-actions"><Button variant="secondary" size="sm" onClick={() => { try { copyLinks(item.url); setFeedback({ tone: 'ok', message: '链接已复制' }) } catch { setFeedback({ tone: 'fail', message: '无法写入剪贴板' }) } }}><Copy size={14} />复制链接</Button><Button size="sm" loading={sending} onClick={() => void send()}>发送到队列</Button></div></footer>
    <Feedback value={feedback} className="detail-feedback" />
  </section>
}
