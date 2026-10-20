import { useEffect, useId, useRef, useState } from 'react'
import { BookOpen, Copy, Download, ExternalLink, Link, RefreshCw, X } from 'lucide-react'
import { Button } from '../ui/anibt/button'
import { copyLinks, type createClient } from './client'
import { displayState, type Gallery } from './model'
import type { Torrent } from './torrents'

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

export function GalleryDetails({ item, tab: requestedTab, changeTab, close, live }: {
  item: Gallery; tab: DetailTab; changeTab: (tab: DetailTab) => void; close: (restoreFocus?: boolean) => void; live: LiveGalleryActions
}) {
  const id = useId()
  const heading = useRef<HTMLElement>(null)
  useEffect(() => { heading.current?.scrollIntoView({ block: 'nearest' }) }, [item.url])
  const stateLabel = stateTab(item)
  const torrentLink = item.links?.find(link => new URL(link.url).pathname === '/gallerytorrents.php')
  const tab = requestedTab === 'state' && !stateLabel || requestedTab === 'torrents' && !torrentLink ? 'detail' : requestedTab
  const [resources, setResources] = useState<Torrent[]>()
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState('')
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
      setFeedback(`队列已接收：新增 ${result.added}，已有 ${result.duplicates}。`)
      live.refreshQueue()
    } catch (reason) { setFeedback(reason instanceof Error ? reason.message : '发送失败，可以重试') }
    finally { setSending(false) }
  }
  const tabs: { key: DetailTab; label: string }[] = [{ key: 'detail', label: '详情' }, ...(torrentLink ? [{ key: 'torrents' as const, label: 'BT 种子' }] : []), ...(stateLabel ? [{ key: 'state' as const, label: stateLabel }] : [])]
  return <section className="gallery-details anibt-sheet" aria-label={`${item.title}详情`} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); close(true) } }}>
    <header ref={heading} className="gallery-details-heading">
      {item.cover && <img className="detail-cover" src={item.cover} alt="" />}
      <div className="detail-heading-text"><h3>{item.title}</h3><p className="muted">{[item.author, item.category, item.language, item.pages === null ? '' : `${item.pages} 页`].filter(Boolean).join(' · ')}</p>{item.posted && <p className="muted">发布于 {item.posted}</p>}</div>
      <Button asChild variant="ghost" size="sm"><a href={item.url} target="_blank" rel="noopener noreferrer">打开原站 <ExternalLink size={13} /></a></Button>
      <Button variant="ghost" size="icon-sm" aria-label="收起作品详情" onClick={() => close()}><X /></Button>
    </header>
    <nav className="detail-tabs" role="tablist" aria-label="作品信息">{tabs.map((entry, index) => <button key={entry.key} type="button" role="tab" id={`${id}-${entry.key}`} aria-controls={`${id}-content`} aria-selected={tab === entry.key} tabIndex={tab === entry.key ? 0 : -1} onClick={() => changeTab(entry.key)} onKeyDown={event => {
      const next = event.key === 'ArrowRight' ? (index + 1) % tabs.length : event.key === 'ArrowLeft' ? (index + tabs.length - 1) % tabs.length : event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : -1
      if (next < 0) return
      event.preventDefault()
      changeTab(tabs[next].key)
      event.currentTarget.parentElement?.querySelectorAll<HTMLButtonElement>('[role=tab]')[next]?.focus()
    }}>{entry.label}</button>)}</nav>
    <div className="detail-content" id={`${id}-content`} role="tabpanel" aria-labelledby={`${id}-${tab}`}>
      {tab === 'detail' && <div className="detail-placeholder"><BookOpen size={30} /><div><h4>作品详情 · 布局示例</h4><p className="muted">作品详情页美化尚未接入，当前仅展示列表已有的信息。</p></div>
        {item.status === 'checking' && <p role="status">正在检查书库，尚不能判断是否收录。</p>}
        {item.error && <p role="alert">书库：{item.error}。查询异常不代表未收录。</p>}
        {item.queue?.label === '队列查询失败' && <p role="alert">队列：{item.queue.error || item.queue.label}。查询异常不代表未入队。</p>}
        <nav className="native-links">{item.links?.filter(link => link !== torrentLink).map((link, index) => <a key={index} href={link.url} target="_blank" rel="noopener noreferrer">{link.title} <ExternalLink size={12} /></a>)}</nav>
      </div>}
      {tab === 'torrents' && <div className="torrent-list"><div className="torrent-toolbar"><span className="muted">{resources ? `${resources.length} 个种子` : '原站种子'}</span><Button variant="ghost" size="sm" onClick={() => setRevision(value => value + 1)}><RefreshCw size={14} />重新加载</Button><a className="library-link" href={torrentLink!.url} target="_blank" rel="noopener noreferrer">打开原站种子页 <ExternalLink size={12} /></a></div>
        {error ? <p role="alert">{error}。可重新加载，或打开原站确认。</p> : !resources ? <p role="status">正在加载种子列表…</p> : !resources.length ? <p>原站暂无种子。</p> : resources.map(resource => <article className="torrent-row" key={resource.url}><div><h4>{resource.title}</h4><p className="muted">{resource.metadata.join(' · ')}</p></div><div className="torrent-actions">{resource.magnet && <Button asChild variant="secondary" size="sm"><a href={resource.magnet}><Link size={14} />磁力</a></Button>}<Button asChild variant="secondary" size="sm"><a href={resource.url}><Download size={14} />下载种子</a></Button></div></article>)}
      </div>}
      {tab === 'state' && (stateLabel === '队列' ? <div className="queue-detail"><h4>{item.queue?.label}</h4><p>尝试 {item.queue?.attempts} / {item.queue?.max_attempts}</p>{item.queue?.next_attempt_at && <p>下次尝试：{new Date(item.queue.next_attempt_at * 1000).toLocaleString()}</p>}{item.queue?.error && <p role="alert">{item.queue.error}</p>}</div> : <div className="library-details"><h4>{stateLabel === '重复作品' ? '标题检查发现疑似重复作品' : '已在书库中找到该作品'}</h4>{!item.hits.length && <p>原站 URL 已命中，但服务未返回可打开的条目 ID。</p>}{item.hits.map(hit => <article className="archive-hit" key={hit.id}><div className="archive-hit-heading"><img src={`${base}/api/archivethumbnail?id=${encodeURIComponent(hit.id)}`} alt="" loading="lazy" referrerPolicy="no-referrer" onError={event => { event.currentTarget.hidden = true }} /><strong>{hit.title}</strong></div><p className="muted">{[hit.pagecount ? `${hit.pagecount} 页` : '', hit.filesize ? `${(hit.filesize / 1048576).toFixed(1)} MB` : ''].filter(Boolean).join(' · ')}</p>{hit.tags && <p className="archive-tags">{hit.tags}</p>}<div className="torrent-actions"><Button asChild size="sm"><a href={`${base}/reader?id=${encodeURIComponent(hit.id)}`} target="_blank" rel="noopener noreferrer">阅读器</a></Button><Button asChild variant="secondary" size="sm"><a href={`${base}/edit?id=${encodeURIComponent(hit.id)}`} target="_blank" rel="noopener noreferrer">编辑</a></Button></div></article>)}{item.search && base && <a className="library-link" href={`${base}/?${new URLSearchParams({ sort: '1', sortdir: 'desc', q: item.search })}`} target="_blank" rel="noopener noreferrer">在 LANraragi 中查看全部 →</a>}</div>)}
    </div>
    <footer className="detail-footer"><Button variant="ghost" size="sm" onClick={live.recheck}><RefreshCw size={14} />重新检查</Button><div className="torrent-actions"><Button variant="secondary" size="sm" onClick={() => { try { copyLinks(item.url); setFeedback('链接已复制') } catch { setFeedback('无法写入剪贴板') } }}><Copy size={14} />复制链接</Button><Button size="sm" loading={sending} onClick={() => void send()}>发送到队列</Button></div></footer>
    {feedback && <p className="detail-feedback" role="status">{feedback}</p>}
  </section>
}
