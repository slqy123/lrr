import { useEffect, useState } from 'react'
import { Button } from '../ui/yurui/button'
import { TextLink } from '../ui/yurui/text-link'
import { DescriptionList, DescriptionItem } from '../ui/yurui/description-list'
import type { Gallery, Archive } from './model'
import type { GallerySummary } from './details'
import type { LiveGalleryActions } from './GalleryDetails'
import { ComparisonMetrics } from './ComparisonMetrics'
import { archiveTags, archiveSource, ehGallery, languages, summaryTags, summaryLanguageValues, fileBytes, sourceRelation } from './comparison'
import { GitBranch, Link as LinkIcon, Search } from 'lucide-react'

function addedDate(values: string[] = []) {
  const timestamp = Number(values[0])
  const date = new Date(timestamp * 1000)
  return timestamp > 0 && Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(date) : '未记录'
}

function Cover({ src, title }: { src: string; title: string }) {
  const [failed, setFailed] = useState(false)
  return <div className="detail-cover comparison-cover">{src && !failed ? <img src={src} alt={`${title}封面`} loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} /> : <span>封面不可用</span>}</div>
}

function Candidate({ item, hit, summary, live }: { item: Gallery; hit: Archive; summary?: GallerySummary; live: LiveGalleryActions }) {
  const [metadata, setMetadata] = useState<Archive>()
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    let active = true
    setMetadata(undefined)
    setError('')
    void live.client.archive(hit.id, controller.signal).then(value => { if (active) setMetadata(value) }, reason => { if (active) setError(reason instanceof Error ? reason.message : '元数据加载失败') })
    return () => { active = false; controller.abort() }
  }, [hit.id, live.client, revision])
  const archive = metadata || hit
  const grouped = archiveTags(archive.tags)
  const source = archiveSource(grouped.get('source'), item.url)
  const gallerySource = source?.gallery
  const sameGallery = !!gallerySource && gallerySource.id === ehGallery(item.url)?.id
  const browsingEH = ['e-hentai.org', 'exhentai.org', 'g.e-hentai.org'].includes(location.hostname)
  const sourceHref = gallerySource ? browsingEH ? new URL(gallerySource.path, location.origin).href : gallerySource.url : undefined
  const [sourceResult, setSourceResult] = useState<{ url: string; summary?: GallerySummary; error?: string }>()
  const [sourceRevision, setSourceRevision] = useState(0)
  useEffect(() => {
    if (!sourceHref || sameGallery) return
    const controller = new AbortController()
    let active = true
    setSourceResult(undefined)
    void live.client.details(sourceHref, controller.signal, sourceRevision > 0).then(
      value => { if (active) setSourceResult({ url: sourceHref, summary: value }) },
      reason => { if (active) setSourceResult({ url: sourceHref, error: reason instanceof Error ? reason.message : '来源信息加载失败' }) },
    )
    return () => { active = false; controller.abort() }
  }, [sourceHref, sameGallery, live.client, sourceRevision])
  const sourceInfo = sameGallery ? summary : sourceResult?.url === sourceHref ? sourceResult?.summary : undefined
  const sourceError = sourceResult?.url === sourceHref ? sourceResult?.error : undefined
  const relation = sourceRelation(item.url, source?.url || '', summary, sourceInfo)
  const originalLanguage = summaryLanguageValues(summary)
  const originalLanguages = languages(originalLanguage.length ? originalLanguage : item.language ? [item.language] : [])
  const libraryLanguage = grouped.get('language') || []
  const libraryLanguages = languages(libraryLanguage.length ? libraryLanguage : summaryLanguageValues(sourceInfo))
  const pageCount = summary?.pages ?? item.pages
  const originalPages = pageCount != null && Number.isFinite(pageCount) && pageCount > 0 ? pageCount : undefined
  const libraryPages = archive.pagecount != null && Number.isFinite(archive.pagecount) && archive.pagecount > 0 ? archive.pagecount : undefined
  const originalSize = fileBytes(summary?.facts.find(fact => fact.label === '文件大小')?.value)
  const librarySize = archive.filesize != null && Number.isFinite(archive.filesize) && archive.filesize > 0 ? archive.filesize : undefined
  const base = live.server.replace(/\/+$/, '')
  const relationTitle = relation === 'same' ? '来源指向当前画廊' : relation === 'parent' ? '库内来源是当前画廊的父版本' : relation === 'child' ? '库内来源是当前画廊的后续版本' : relation === 'different' ? '库内来源指向另一个 EH 画廊' : '仅标题搜索匹配'
  const RelationIcon = relation === 'same' ? LinkIcon : relation === 'parent' || relation === 'child' ? GitBranch : Search
  const rows = [
    { label: '作者', original: summaryTags(summary, 'artist').join('、') || item.author || '未知', library: grouped.get('artist')?.join('、') || (summaryTags(sourceInfo, 'artist').length ? `${summaryTags(sourceInfo, 'artist').join('、')}（来源页）` : '未记录') },
    { label: '社团', original: summaryTags(summary, 'group').join('、') || '未知', library: grouped.get('group')?.join('、') || (summaryTags(sourceInfo, 'group').length ? `${summaryTags(sourceInfo, 'group').join('、')}（来源页）` : '未记录') },
  ]
  return <>
    <div className="comparison-provenance" data-relation={relation}>
      <RelationIcon size={20} aria-hidden="true" />
      <div><strong>{relationTitle}</strong><p>{relation === 'same' ? '来源标签对应同一画廊；仍可核对本地文件的页数与体积。' : relation === 'parent' || relation === 'child' ? '原站父画廊链接已确认版本关联。' : relation === 'different' ? '可以直接查看库内版本的原站档案，比较语言与版本。' : '暂未找到可定位的 EH 来源，保留为疑似重复。'}</p>{source && <TextLink href={source.url} target="_blank" rel="noopener noreferrer">{gallerySource ? `查看来源画廊 #${gallerySource.id}` : '查看来源'} →</TextLink>}</div>
    </div>
    <div className="comparison-grid">
      <article className="comparison-work">
        <div className="comparison-heading"><span className="detail-genre">当前原站作品</span></div>
        <div className="comparison-identity"><Cover key={item.cover} src={item.cover} title={item.title} /><h3>{summary?.title || item.title}</h3></div>
        <DescriptionList>{rows.map(row => <DescriptionItem key={row.label} term={row.label}>{row.original}</DescriptionItem>)}<DescriptionItem term="原站发布">{item.posted || '未知'}</DescriptionItem></DescriptionList>
        <TextLink href={item.url} target="_blank" rel="noopener noreferrer">查看原站作品 →</TextLink>
      </article>
      <article className="comparison-work">
        <div className="comparison-heading"><span className="detail-genre">库内候选</span>{archive.progress != null && archive.progress > 0 && <span className="text-muted-foreground">{libraryPages && archive.progress >= libraryPages ? '已读完' : `读至 ${archive.progress} 页`}</span>}</div>
        <div className="comparison-identity"><Cover key={archive.id} src={`${base}/api/archives/${encodeURIComponent(archive.id)}/thumbnail`} title={archive.title} /><div><h3>{archive.title}</h3>{sourceInfo?.title && sourceInfo.title !== archive.title && <p className="comparison-source-title">来源标题：{sourceInfo.title}</p>}</div></div>
        <DescriptionList>{rows.map(row => <DescriptionItem key={row.label} term={row.label}>{row.library}</DescriptionItem>)}<DescriptionItem term="入库时间">{addedDate(grouped.get('date_added'))}</DescriptionItem></DescriptionList>
        {!metadata && !error && <p role="status" className="text-muted-foreground">正在补齐库内信息…</p>}
        {error && <div className="detail-load-error"><p role="alert">库内信息未能补齐：{error}</p><Button variant="ghost" size="sm" onClick={() => setRevision(value => value + 1)}>重试</Button></div>}
        {sourceHref && !sameGallery && !sourceInfo && !sourceError && <p role="status" className="text-muted-foreground">正在读取来源画廊…</p>}
        {sourceError && <div className="detail-load-error"><p role="alert">来源画廊不可用：{sourceError}。仍可比较库内信息。</p><Button variant="ghost" size="sm" onClick={() => setSourceRevision(value => value + 1)}>重试来源</Button></div>}
      </article>
    </div>
    <ComparisonMetrics originalLanguages={originalLanguages} libraryLanguages={libraryLanguages} languageFromSource={!libraryLanguage.length && libraryLanguages.length > 0} originalPages={originalPages} libraryPages={libraryPages} originalSize={originalSize} librarySize={librarySize} />
    <div className="torrent-actions"><Button asChild size="sm"><a href={`${base}/reader?id=${encodeURIComponent(archive.id)}`} target="_blank" rel="noopener noreferrer">打开库内阅读器</a></Button>{source && <Button asChild variant="secondary" size="sm"><a href={source.url} target="_blank" rel="noopener noreferrer">查看库内来源</a></Button>}</div>
    <details className="comparison-more"><summary>库内文件与标签</summary><DescriptionList><DescriptionItem term="文件名">{archive.filename || '未记录'}</DescriptionItem><DescriptionItem term="格式">{archive.extension?.toUpperCase() || '未记录'}</DescriptionItem><DescriptionItem term="全部标签">{archive.tags || '未记录'}</DescriptionItem></DescriptionList><TextLink href={`${base}/edit?id=${encodeURIComponent(archive.id)}`} target="_blank" rel="noopener noreferrer">编辑库内元数据 →</TextLink></details>
  </>
}

export function ArchiveComparison({ item, live }: { item: Gallery; live: LiveGalleryActions }) {
  const [selected, setSelected] = useState(item.hits[0]?.id)
  const [summary, setSummary] = useState<GallerySummary>()
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    let active = true
    setSummary(undefined)
    setError('')
    void live.client.details(item.url, controller.signal, revision > 0).then(value => { if (active) setSummary(value) }, reason => { if (active) setError(reason instanceof Error ? reason.message : '原站详情加载失败') })
    return () => { active = false; controller.abort() }
  }, [item.url, live.client, revision])
  const current = item.hits.find(hit => hit.id === selected) || item.hits[0]
  const base = live.server.replace(/\/+$/, '')
  return <div className="library-details">
    <div><h4>作品对比 · {item.hits.length} 个候选</h4><p className="text-muted-foreground text-[12px]">对比封面、语言和页数，确认是否需要另存这个版本。</p></div>
    {item.hits.length > 1 && <div className="comparison-candidates" role="group" aria-label="选择库内候选">{item.hits.map((hit, index) => <button type="button" key={hit.id} aria-pressed={current?.id === hit.id} className="comparison-candidate" onClick={() => setSelected(hit.id)}><Cover src={`${base}/api/archives/${encodeURIComponent(hit.id)}/thumbnail`} title={hit.title} /><span><strong>{index + 1}. {hit.title}</strong><small>{hit.pagecount ? `${hit.pagecount} 页` : '页数未记录'}</small></span></button>)}</div>}
    {!summary && !error && <p role="status" className="text-muted-foreground">正在补齐原站信息…</p>}
    {error && <div className="detail-load-error"><p role="alert">原站信息未能补齐：{error}。仍可使用列表信息比较。</p><Button variant="ghost" size="sm" onClick={() => setRevision(value => value + 1)}>重试原站信息</Button></div>}
    {current ? <Candidate key={current.id} item={item} hit={current} summary={summary} live={live} /> : <p>没有可比较的库内候选，请重新检查。</p>}
    {item.search && <TextLink href={`${base}/?${new URLSearchParams({ sort: '1', sortdir: 'desc', q: item.search })}`} target="_blank" rel="noopener noreferrer">在 LANraragi 中查看全部 →</TextLink>}
  </div>
}
