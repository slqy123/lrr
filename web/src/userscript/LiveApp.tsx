import * as React from 'react'
import { useEffect, useState } from 'react'
import { Flower2, Settings, Sun, Moon, ExternalLink, RefreshCw, Copy, ArrowRight, Check, BookOpen } from 'lucide-react'
import { Button } from '../ui/anibt/button'
import { Badge } from '../ui/anibt/badge'
import { Checkbox } from '../ui/anibt/checkbox'
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from '../ui/anibt/popover'
import { GalleryCards, Status } from './GalleryCards'
import { Feedback, type FeedbackMessage } from './Feedback'
import { SettingsDialog } from './SettingsDialog'
import { SearchPanel } from './SearchPanel'
import { Pager } from './Pager'
import { displayState, stateLabels } from './model'
import { copyLinks } from './client'
import { useGalleries } from './useGalleries'
import { useTheme } from './useTheme'
import { useNativePage } from './useNativePage'
import type { GalleryPage } from './page'

const groups = ['missing', 'duplicate', 'queued', 'downloaded'] as const

export function LiveApp({ page: initialPage, host, portal, restore }: { page: GalleryPage; host: HTMLElement; portal: HTMLElement; restore: (message?: string) => void }) {
  const page = useNativePage(initialPage, restore)
  const [theme, setTheme] = useTheme(host)
  const { items, settings, configure, client, recheck, refreshQueue } = useGalleries(page)
  const [compact, setCompact] = useState(settings.density === 'compact')
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackMessage | null>(null)
  useEffect(() => {
    const available = new Set(page.galleries.map(item => item.id))
    setSelected(previous => new Set([...previous].filter(id => available.has(id))))
  }, [page])
  const toggle = (id: number) => setSelected(previous => {
    const next = new Set(previous)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })
  const selectGroup = (ids: number[]) => setSelected(previous => {
    const all = ids.every(id => previous.has(id))
    const next = new Set(previous)
    ids.forEach(id => all ? next.delete(id) : next.add(id))
    return next
  })
  const density = (value: boolean) => {
    try { GM_setValue('density', value ? 'compact' : 'standard'); setCompact(value) } catch { setFeedback({ tone: 'fail', message: '无法保存显示密度，请检查 Tampermonkey 权限。' }) }
  }
  const send = async () => {
    if (sending) return
    const batch = items.filter(item => selected.has(item.id))
    if (!batch.length) return
    setSending(true)
    try {
      const result = await client.send(batch.map(item => item.url))
      const sent = new Set(batch.map(item => item.id))
      setSelected(previous => new Set([...previous].filter(id => !sent.has(id))))
      setFeedback({ tone: 'ok', message: `队列已接收：新增 ${result.added}，已有 ${result.duplicates}。` })
      refreshQueue()
    } catch (error) { setFeedback({ tone: 'fail', message: `${(error as Error).message}；选择已保留，可以重试。` }) }
    finally { setSending(false) }
  }
  const configured = !!settings.lrrServerUrl && !!settings.queueServerUrl
  return <div className="surface anibt-ground showcase live-app">
    <header className="site-header"><div className="page-width header-inner">
      <a className="brand" href={page.action}><span className="brand-mark"><Flower2 size={24} /></span><span>LRR <b>Gallery</b><small>把喜欢的故事，收进书架。</small></span></a>
      <nav className="header-nav" aria-label="导航"><Button asChild variant="secondary"><a href={page.action}>发现作品</a></Button>{/^https?:\/\//.test(settings.queueServerUrl) && <Button asChild variant="ghost"><a href={settings.queueServerUrl} target="_blank" rel="noopener noreferrer">队列后台 <ExternalLink size={13} /></a></Button>}
        {!!page.links.length && <Popover><PopoverTrigger asChild><Button variant="ghost">原站导航</Button></PopoverTrigger><PopoverContent container={portal}><PopoverTitle>原站导航</PopoverTitle><nav className="native-links">{page.links.map((link, index) => <a key={index} href={link.url}>{link.title}</a>)}</nav></PopoverContent></Popover>}
      </nav>
      <div className="header-tools"><Button variant="ghost" size="icon" aria-label="切换主题" onClick={() => setTheme(host.classList.contains('dark') ? 'light' : 'dark')}><Sun className="theme-sun" /><Moon className="theme-moon" /></Button><Button variant="ghost" size="icon" aria-label="重新检查" onClick={recheck}><RefreshCw /></Button><Button variant="ghost" size="icon" aria-label="设置" onClick={() => setSettingsOpen(true)}><Settings /></Button><Button variant="ghost" size="sm" onClick={() => restore()}>原站界面 <ExternalLink size={13} /></Button></div>
    </div></header>
    <main className="page-width main-content">
      {!configured && <div className="connection-notice anibt-sheet" role="status"><span>请填写图库和队列服务地址，查询异常不会计入“未收录”。</span><Button size="sm" onClick={() => setSettingsOpen(true)}>连接设置</Button></div>}
      <SearchPanel page={page} portal={portal} />
      <section aria-label="作品画廊">
        <div className="collection-heading"><div><h2><span className="anibt-tape">发现作品</span><span className="muted count">{items.length}</span></h2><p className="muted">{page.summary} {page.summaryLinks.map((link, index) => <a className="library-link" key={index} href={link.url}>{link.title}</a>)}</p><p className="muted">{(['downloaded', 'queued', 'error', 'checking'] as const).map(state => `${stateLabels[state]} ${items.filter(item => displayState(item) === state).length}`).join(' · ')}</p></div><div className="density-control anibt-well"><Button size="sm" variant={!compact ? 'secondary' : 'ghost'} aria-pressed={!compact} onClick={() => density(false)}>标准</Button><Button size="sm" variant={compact ? 'secondary' : 'ghost'} aria-pressed={compact} onClick={() => density(true)}>紧凑</Button></div></div>
        <p className="selection-scope muted">{settings.enableAltSearch ? '未收录：URL 与可提取的标题均未命中；检查中、队列和查询异常不计入。' : '未收录仅表示 URL 未命中；标题搜索已关闭。'}</p>
        <div className="gallery-toolbar"><div className="selection-groups">{groups.map(state => {
          const matching = items.filter(item => displayState(item) === state)
          const count = matching.filter(item => selected.has(item.id)).length
          return <label key={state} className="group-choice"><Checkbox aria-label={`选择${stateLabels[state]}`} disabled={sending || !matching.length} checked={!count ? false : count === matching.length ? true : 'indeterminate'} onCheckedChange={() => selectGroup(matching.map(item => item.id))} /><Status state={state} /><span className="muted">{matching.length}</span></label>
        })}<Button variant="ghost" size="sm" disabled={sending || !items.length} onClick={() => selectGroup(items.map(item => item.id))}>全选</Button></div><Pager page={page} portal={portal} /></div>
        {items.length ? <GalleryCards items={items} selected={selected} toggle={toggle} disabled={sending} compact={compact} live={{ server: settings.lrrServerUrl, recheck, client, refreshQueue }} /> : <div className="empty-panel anibt-sheet"><BookOpen /><h3>这里还没有故事</h3><p>换个关键词，下一本喜欢的作品也许就在附近。</p><Button asChild variant="secondary"><a href={page.action}>重置筛选</a></Button></div>}
        <div className="bottom-pagination"><Pager page={page} portal={portal} /></div>
      </section>
      <footer className="page-footer"><span><Flower2 size={14} />为每一次心动，留一个位置。</span><span>AniBT UI · <a href="https://github.com/OpenAniBT/ui">AGPL-3.0-only</a> · <a href="https://github.com/slqy123/lrr">对应源码</a></span></footer>
    </main>
    {selected.size > 0 && <aside className="selection-bar anibt-pop" aria-label="批量操作"><span className="selected-count"><Check size={17} />已选择 <Badge asChild variant="count"><strong>{selected.size}</strong></Badge> 部</span><Button variant="ghost" size="sm" disabled={sending} onClick={() => setSelected(new Set())}>取消选择</Button><span className="selection-divider" /><Button variant="secondary" disabled={sending} onClick={() => { try { copyLinks(items.filter(item => selected.has(item.id)).map(item => item.url).join('\n')); setFeedback({ tone: 'ok', message: `已复制 ${selected.size} 个链接。` }) } catch { setFeedback({ tone: 'fail', message: '无法写入剪贴板，选择已保留。' }) } }}><Copy />复制链接</Button><Button loading={sending} onClick={() => void send()}>发送队列 <ArrowRight /></Button></aside>}
    <Feedback value={feedback} className="preview-feedback anibt-pop" onClose={() => setFeedback(null)} />
    <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} portal={portal} settings={settings} save={value => { configure({ ...value, density: compact ? 'compact' : 'standard' }); setFeedback({ tone: 'mute', message: '设置已保存，正在重新检查当前页。' }) }} theme={theme} setTheme={setTheme} />
  </div>
}
