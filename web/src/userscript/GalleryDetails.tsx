import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { CalendarDays, HardDrive, ArrowUp, ArrowDown, UserRound, TriangleAlert, Star, ChevronDown, ChevronUp, Copy, Download, ExternalLink, Link, RefreshCw, X } from 'lucide-react'
import { Button } from '../ui/yurui/button'
import { IconButton } from '../ui/yurui/icon-button'
import { TabsList, TabsPanel } from '../ui/yurui/tabs'
import { TextLink } from '../ui/yurui/text-link'
import { DescriptionList, DescriptionItem } from '../ui/yurui/description-list'
import { Badge } from '../ui/yurui/badge'
import { useToast } from '../ui/yurui/toast'
import { copyLinks, type createClient } from './client'
import { displayState, type Gallery } from './model'
import type { Torrent, TorrentMetadataKind } from './torrents'
import type { CommentContent, GallerySummary, PreviewPage } from './details'
import { ArchiveComparison } from './ArchiveComparison'
import { categoryAppearance } from './categories'

const torrentMetadata: Record<TorrentMetadataKind, { label: string; icon: typeof CalendarDays }> = {
  posted: { label: '上传时间', icon: CalendarDays },
  size: { label: '大小', icon: HardDrive },
  seeds: { label: '做种', icon: ArrowUp },
  peers: { label: '下载中', icon: ArrowDown },
  downloads: { label: '下载次数', icon: Download },
  uploader: { label: '上传者', icon: UserRound },
}

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
  return state === 'downloaded' ? '书库' : state === 'duplicate' ? '作品对比' : state === 'queued' ? '队列' : undefined
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
  return <DescriptionItem term={<><span>{label}</span><small>{group.tags.length}</small></>}><div className="detail-tags" ref={container}>
    {group.tags.map(tag => <Badge key={tag.url} asChild face="text"><a href={tag.url} target="_blank" rel="noopener noreferrer">{tag.title}</a></Badge>)}
    <button type="button" className="detail-tags-toggle" hidden={!expanded && !hiddenCount} aria-expanded={expanded} aria-label={expanded ? `收起${label}标签` : `展开${label}其余 ${hiddenCount} 个标签`} title={expanded ? '收起标签' : `展开其余 ${hiddenCount} 个标签`} onClick={() => setExpanded(value => !value)}><span hidden={expanded}>+{hiddenCount}</span>{expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}</button>
  </div></DescriptionItem>
}

function CommentBody({ content }: { content: CommentContent[] }) {
  return content.map((node, index) => {
    if (typeof node === 'string') return node
    if (node.tag === 'a') return <TextLink key={index} href={node.href} target="_blank" rel="noopener noreferrer"><CommentBody content={node.children} /></TextLink>
    const Tag = node.tag
    return <Tag key={index}>{Tag === 'br' ? undefined : <CommentBody content={node.children} />}</Tag>
  })
}

function GalleryInformation({ summary, item }: { summary: GallerySummary; item: Gallery }) {
  const author = summary.facts.find(fact => fact.label === '上传者')
  const posted = summary.facts.find(fact => fact.label === '发布时间')
  const metrics = summary.facts.filter(fact => ['页数', '文件大小', '评分'].includes(fact.label))
  const notes = summary.facts.filter(fact => !metrics.includes(fact) && !['分类', '上传者', '发布时间'].includes(fact.label) && (fact.label !== '语言' || !summary.tagGroups.some(group => group.name === 'language')))
  return <>
    <div className="detail-editorial">
      <div className="detail-cover">{item.cover ? <img src={item.cover} alt={`${item.title}封面`} onError={event => { event.currentTarget.hidden = true }} /> : <span>暂无封面</span>}</div>
      <div className="detail-story">
        <div className="detail-genre">{categoryAppearance(item.category).label}</div>
        <h3>{item.title}</h3>
        {author && <p className="detail-byline">由 {author.url ? <TextLink href={author.url} target="_blank" rel="noopener noreferrer">{author.value}</TextLink> : author.value} 上传</p>}
        {metrics.length > 0 && <dl className="detail-metrics" aria-label="作品参数">{metrics.map(fact => {
          const [value, count] = fact.value.split(' · ')
          const score = fact.label === '评分' ? Number.parseFloat(value) : NaN
          return <div key={fact.label}><dt>{count || fact.label}</dt><dd>{Number.isFinite(score) ? <span className="detail-rating-stars" role="img" aria-label={`${score} / 5`} title={`${score} / 5`}>{Array.from({ length: 5 }, (_, index) => <span key={index}><Star aria-hidden="true" /><span style={{ width: `${Math.max(0, Math.min(1, score - index)) * 100}%` }}><Star aria-hidden="true" /></span></span>)}</span> : value.replace(/\bpages\b/i, '页')}</dd></div>
        })}</dl>}
        {posted && <p className="detail-published">发布于 <time dateTime={posted.value.replace(' ', 'T')}>{posted.value}</time></p>}
        <div className="detail-notes">{notes.map(fact => <span key={fact.label}>{fact.url ? <TextLink href={fact.url} target="_blank" rel="noopener noreferrer">{fact.label}：{fact.value}</TextLink> : fact.label === '父画廊' && fact.value === 'None' ? '无父画廊' : fact.label === '可见性' && /^(Yes|No)$/.test(fact.value) ? (fact.value === 'Yes' ? '公开可见' : '不可见') : `${fact.label}：${fact.label === '收藏' && fact.value === 'Once' ? '1 次' : fact.value}`}</span>)}</div>
      </div>
    </div>
    {summary.tagGroups.length > 0 && <section className="detail-tag-section"><h4>作品标签 <span className="text-muted-foreground">{summary.tagGroups.reduce((total, group) => total + group.tags.length, 0)}</span></h4><DescriptionList variant="grouped" className="detail-tag-groups" aria-label="作品标签">{summary.tagGroups.map((group, index) => <TagGroup key={`${group.name}-${index}`} group={group} />)}</DescriptionList></section>}
    {(summary.descriptionContent?.length || summary.description) ? <section className="detail-description" aria-label="上传者评论">{summary.descriptionContent?.length ? <CommentBody content={summary.descriptionContent} /> : summary.description}</section> : null}
  </>
}

function PagePreview({ page }: { page: PreviewPage }) {
  const [failed, setFailed] = useState(false)
  const sprite = page.sprite
  return <a className="detail-preview-page" href={page.url} target="_blank" rel="noopener noreferrer" aria-label={`打开第 ${page.page} 页`}>
    <span className="detail-preview-image">
      {failed || (!sprite && !page.image) ? <span className="text-muted-foreground">图片不可用</span> : sprite ? <span className="detail-preview-sprite" style={{ width: sprite.width, height: sprite.height, backgroundImage: `url("${sprite.image}")`, backgroundPosition: sprite.position, backgroundSize: sprite.size, transform: `translate(-50%, -50%) scale(${Math.min(104 / sprite.width, 140 / sprite.height)})` }}><img hidden src={sprite.image} alt="" onError={() => setFailed(true)} /></span> : <img src={page.image} alt={`第 ${page.page} 页预览`} onError={() => setFailed(true)} />}
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
  const loadedRevisions = useRef({ detail: 0, torrents: 0 })
  useEffect(() => {
    if (tab !== 'detail') return
    let active = true
    const controller = new AbortController()
    setSummary(undefined)
    setDetailError('')
    void live.client.details(item.url, controller.signal, detailRevision !== loadedRevisions.current.detail).then(value => { if (active) { loadedRevisions.current.detail = detailRevision; setSummary(value) } }, reason => { if (active) setDetailError(reason instanceof Error ? reason.message : '详情加载失败') })
    return () => { active = false; controller.abort() }
  }, [tab, item.url, live.client, detailRevision])
  const [resources, setResources] = useState<Torrent[]>()
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  const [sending, setSending] = useState(false)
  const { notify: setFeedback } = useToast()
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
    void live.client.torrents(torrentLink.url, controller.signal, revision !== loadedRevisions.current.torrents).then(value => { if (active) { loadedRevisions.current.torrents = revision; setResources(value) } }, reason => { if (active) setError(reason instanceof Error ? reason.message : '种子加载失败') })
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
  return <section className="gallery-details" aria-label={`${item.title}详情`} onKeyDown={event => { if (event.key === 'Escape') { event.stopPropagation(); close(true) } }}>
    <header ref={heading} className="detail-heading">
      <div className="detail-heading-text">{tab === 'detail' ? '作品档案' : item.title}</div>
      <div className="detail-heading-actions">
        {item.links?.filter(link => link !== torrentLink).map((link, index) => <Button key={index} asChild variant="ghost" size="sm"><a href={link.url} target="_blank" rel="noopener noreferrer">{link.title} <ExternalLink size={13} /></a></Button>)}
        <Button asChild variant="ghost" size="sm"><a href={item.url} target="_blank" rel="noopener noreferrer">打开详情页 <ExternalLink size={13} /></a></Button>
        <IconButton size="sm" label="收起作品详情" onClick={() => close()}><X /></IconButton>
      </div>
    </header>
    <TabsList variant="notebook" className="detail-tabs" items={tabs} value={tab} onValueChange={changeTab} id={id} panelId={`${id}-content`} aria-label="作品信息" />
    <TabsPanel key={tab} className="detail-content" id={`${id}-content`} aria-labelledby={`${id}-${tab}`}>
      {tab === 'detail' && <div className="detail-summary">
        {detailError ? <div className="detail-load-error"><p role="alert">{detailError}</p><Button variant="ghost" size="sm" onClick={() => setDetailRevision(value => value + 1)}><RefreshCw size={14} />重试详情</Button></div> : !summary ? <p className="text-muted-foreground" role="status">正在加载作品详情…</p> : <>
          <GalleryInformation summary={summary} item={item} />
          <div className="detail-previews" aria-label="前五页图片预览">{summary.previews.map(page => <PagePreview key={page.url} page={page} />)}<div className="detail-preview-more"><TextLink href={item.url} target="_blank" rel="noopener noreferrer">查看全部{summary.pages !== undefined ? ` ${summary.pages} 页` : ''} <ExternalLink size={12} /></TextLink><span className="text-muted-foreground">{summary.previews.length ? `按原站顺序预览前 ${summary.previews.length} 页` : '未能读取图片预览，请打开详情页查看'}</span></div></div>
        </>}
        {item.status === 'checking' && <p role="status">正在检查书库，尚不能判断是否收录。</p>}
        {item.error && <p role="alert">书库：{item.error}。查询异常不代表未收录。</p>}
        {item.queue?.label === '队列查询失败' && <p role="alert">队列：{item.queue.error || item.queue.label}。查询异常不代表未入队。</p>}
        {(item.error || item.queue?.label === '队列查询失败') && <Button variant="ghost" size="sm" onClick={live.recheck}><RefreshCw size={14} />重新检查</Button>}
      </div>}
      {tab === 'torrents' && <div className="torrent-list"><div className="torrent-toolbar"><span className="text-muted-foreground">{resources ? `${resources.length} 个种子` : '原站种子'}</span><Button variant="ghost" size="sm" onClick={() => setRevision(value => value + 1)}><RefreshCw size={14} />重新加载</Button><TextLink href={torrentLink!.url} target="_blank" rel="noopener noreferrer">打开原站种子页 <ExternalLink size={12} /></TextLink></div>
        {error ? <p role="alert">{error}。可重新加载，或打开原站确认。</p> : !resources ? <p role="status">正在加载种子列表…</p> : !resources.length ? <p>原站暂无种子。</p> : resources.map(resource => <article className="torrent-row" data-outdated={resource.outdated || undefined} key={resource.url}><div><div className="flex flex-wrap items-center gap-2">{resource.outdated && <Badge variant="warning" shape="soft" face="text"><TriangleAlert aria-hidden="true" />已过期</Badge>}<h4>{resource.title}</h4></div><div className="torrent-metadata">{resource.metadata.map(({ kind, value }) => {
          const { label, icon: Icon } = torrentMetadata[kind]
          return <Badge key={kind} shape="soft" face="text" variant="secondary" title={`${label}：${value}`} aria-label={`${label}：${value}`}><Icon aria-hidden="true" />{value}</Badge>
        })}</div></div><div className="torrent-actions">{resource.magnet && <Button asChild variant="secondary" size="sm"><a href={resource.magnet}><Link size={14} />磁力</a></Button>}<Button asChild variant="secondary" size="sm"><a href={resource.url}><Download size={14} />下载种子</a></Button></div></article>)}
      </div>}
      {tab === 'state' && (stateLabel === '队列' ? <div className="queue-detail"><h4>{item.queue?.label}</h4><p>尝试 {item.queue?.attempts} / {item.queue?.max_attempts}</p>{item.queue?.next_attempt_at && <p>下次尝试：{new Date(item.queue.next_attempt_at * 1000).toLocaleString()}</p>}{item.queue?.error && <p role="alert">{item.queue.error}</p>}</div> : item.status === 'duplicate' ? <ArchiveComparison item={item} live={live} /> : <div className="library-details"><h4>已在书库中找到该作品</h4>{!item.hits.length && <p>原站 URL 已命中，但服务未返回可打开的条目 ID。</p>}{item.hits.map(hit => <article className="archive-hit" key={hit.id}><div className="archive-hit-heading"><img src={`${base}/api/archivethumbnail?id=${encodeURIComponent(hit.id)}`} alt="" loading="lazy" referrerPolicy="no-referrer" onError={event => { event.currentTarget.hidden = true }} /><strong>{hit.title}</strong></div><p className="text-muted-foreground">{[hit.pagecount ? `${hit.pagecount} 页` : '', hit.filesize ? `${(hit.filesize / 1048576).toFixed(1)} MB` : ''].filter(Boolean).join(' · ')}</p>{hit.tags && <p className="archive-tags">{hit.tags}</p>}<div className="torrent-actions"><Button asChild size="sm"><a href={`${base}/reader?id=${encodeURIComponent(hit.id)}`} target="_blank" rel="noopener noreferrer">阅读器</a></Button><Button asChild variant="secondary" size="sm"><a href={`${base}/edit?id=${encodeURIComponent(hit.id)}`} target="_blank" rel="noopener noreferrer">编辑</a></Button></div></article>)}{item.search && base && <TextLink href={`${base}/?${new URLSearchParams({ sort: '1', sortdir: 'desc', q: item.search })}`} target="_blank" rel="noopener noreferrer">在 LANraragi 中查看全部 →</TextLink>}</div>)}
      {tab === 'state' && <Button variant="ghost" size="sm" onClick={live.recheck}><RefreshCw size={14} />重新检查</Button>}
    </TabsPanel>
    <footer className="detail-footer"><div className="torrent-actions"><Button variant="secondary" size="sm" onClick={() => { try { copyLinks(item.url); setFeedback({ tone: 'ok', message: '链接已复制' }) } catch { setFeedback({ tone: 'fail', message: '无法写入剪贴板' }) } }}><Copy size={14} />复制链接</Button><Button size="sm" loading={sending} onClick={() => void send()}>{item.status === 'duplicate' ? '仍然加入队列' : '发送到队列'}</Button></div></footer>
  </section>
}
