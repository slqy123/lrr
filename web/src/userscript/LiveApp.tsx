import * as React from 'react'
import { useEffect, useState } from 'react'
import { Flower2, Settings, Sun, Moon, ExternalLink, RefreshCw, Copy, ArrowRight, Check, BookOpen, Search, Filter, FilterX, Grid2X2, Grid3X3 } from 'lucide-react'
import { statusPanelVariants, floatingFeedbackVariants } from '../ui/yurui/status-panel'
import { ActionBar, SelectionCount, ActionBarDivider } from '../ui/yurui/action-bar'
import { mainContentVariants, pageFooterVariants } from '../ui/yurui/page-layout'
import { siteHeaderVariants, headerInnerVariants, brandVariants, brandWordmarkStyles } from '../ui/yurui/header-layout'
import { detailContentStyles } from '../ui/yurui/detail-content'
import { Button } from '../ui/yurui/button'
import { ToolbarGroup, toolbarGroupVariants, toolbarVariants, ResultStat } from '../ui/yurui/toolbar'
import wordmark from './assets/yurulib-wordmark.png'
import { AppearancePicker } from './AppearancePicker'
import { Badge, StatusBadge } from '../ui/yurui/badge'
import { FieldLabel } from '../ui/yurui/field-label'
import { Checkbox } from '../ui/yurui/checkbox'
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from '../ui/yurui/popover'
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
  const errorCount = items.filter(item => displayState(item) === 'error').length
  const checkingCount = items.filter(item => displayState(item) === 'checking').length
  return <div className="surface yurui-ground text-[14px] leading-[1.5] showcase live-app yurui-live-motion">
    <header className={siteHeaderVariants({ variant: 'live' })}><div className={headerInnerVariants({ variant: 'live' })}>
      <a className={brandVariants()} href={page.action}><img className={brandWordmarkStyles} src={wordmark} alt="YuruLib" width={480} height={160} /></a>
      <nav className="flex items-center gap-2" aria-label="导航"><Button asChild variant="secondary"><a href={page.action}>发现作品</a></Button>{/^https?:\/\//.test(settings.queueServerUrl) && <Button asChild variant="ghost"><a href={settings.queueServerUrl} target="_blank" rel="noopener noreferrer">队列后台 <ExternalLink size={13} /></a></Button>}
        {!!page.links.length && <Popover><PopoverTrigger asChild><Button variant="ghost">原站导航</Button></PopoverTrigger><PopoverContent container={portal}><PopoverTitle>原站导航</PopoverTitle><nav className="yurui-menu">{page.links.map((link, index) => <a className="yurui-menu-item h-auto min-h-8 py-[6px] [overflow-wrap:anywhere] focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 focus-visible:outline-solid focus-visible:bg-accent focus-visible:text-accent-foreground" key={index} href={link.url}>{link.title}</a>)}</nav></PopoverContent></Popover>}
      </nav>
      <div className="ml-auto flex items-center gap-2"><AppearancePicker host={host} portal={portal} /><Button variant="ghost" size="icon" aria-label="切换主题" onClick={() => setTheme(host.classList.contains('dark') ? 'light' : 'dark')}><Sun className="hidden [:host(.dark)_&]:block" /><Moon className="[:host(.dark)_&]:hidden" /></Button><Button variant="ghost" size="icon" aria-label="重新检查" onClick={recheck}><RefreshCw /></Button><Button variant="ghost" size="icon" aria-label="设置" onClick={() => setSettingsOpen(true)}><Settings /></Button><Button variant="ghost" size="sm" onClick={() => restore()}>原站界面 <ExternalLink size={13} /></Button></div>
    </div></header>
    <main className={mainContentVariants({ variant: 'live' })}>
      {!configured && <div className={statusPanelVariants({ variant: 'connection' })} role="status"><span>请填写图库和队列服务地址，查询异常不会计入“未收录”。</span><Button size="sm" onClick={() => setSettingsOpen(true)}>连接设置</Button></div>}
      <SearchPanel page={page} portal={portal} />
      <section aria-label="作品画廊">
        <div className="block mb-[18px]">
          <div className="flex min-w-0 flex-wrap items-center gap-3">
            <h2 className="m-0 flex items-center gap-2 text-[17px] font-extrabold whitespace-nowrap"><span className="yurui-tape h-auto bg-(--club-sun-wash) text-foreground px-[14px] py-[5px] [clip-path:polygon(0_0,100%_0,96%_50%,100%_100%,0_100%,4%_50%)]">发现作品</span></h2>
            <span className="yurui-stitch min-w-6 flex-1" aria-hidden="true" />
          </div>
        </div>
        <div className={toolbarVariants({ variant: 'live' })}>
          <ToolbarGroup><FieldLabel variant="selection"><Checkbox aria-label="选择全部作品" disabled={sending || !items.length} checked={!items.some(item => selected.has(item.id)) ? false : items.every(item => selected.has(item.id)) ? true : 'indeterminate'} onCheckedChange={() => selectGroup(items.map(item => item.id))} />全选</FieldLabel>{groups.map(state => {
          const matching = items.filter(item => displayState(item) === state)
          const count = matching.filter(item => selected.has(item.id)).length
          return <FieldLabel key={state} variant="selection"><Checkbox aria-label={`选择${stateLabels[state]}`} disabled={sending || !matching.length} checked={!count ? false : count === matching.length ? true : 'indeterminate'} onCheckedChange={() => selectGroup(matching.map(item => item.id))} /><Status state={state} /><span className="text-muted-foreground">{matching.length}</span></FieldLabel>
        })}</ToolbarGroup>
          <ToolbarGroup variant="summary" aria-label="搜索结果">
            {page.resultStats ? <>
              <ResultStat title={`${page.resultStats.approximate ? '约 ' : ''}${page.resultStats.total} 个搜索结果`} aria-label={`${page.resultStats.approximate ? '约 ' : ''}${page.resultStats.total} 个搜索结果`}><Search size={15} aria-hidden="true" /><span>{page.resultStats.total}</span></ResultStat>
              {page.resultStats.filtered !== undefined && <ResultStat title={`原站本页已过滤 ${page.resultStats.filtered} 项`} aria-label={`原站本页已过滤 ${page.resultStats.filtered} 项`}><Filter size={15} aria-hidden="true" /><span>{page.resultStats.filtered}</span></ResultStat>}
            </> : <span>{page.summary}</span>}
            {page.summaryLinks.map((link, index) => link.title === '关闭原站过滤' ? <Button key={index} asChild variant="ghost" size="icon-sm"><a href={link.url} title={link.title} aria-label={link.title}><FilterX aria-hidden="true" /></a></Button> : <a className={`library-link ${detailContentStyles['library-link']}`} key={index} href={link.url}>{link.title}</a>)}
          </ToolbarGroup>
          {(errorCount > 0 || checkingCount > 0) && <ToolbarGroup variant="health" role="status">
            {errorCount > 0 && <StatusBadge tone="fail">{stateLabels.error} {errorCount}</StatusBadge>}
            {checkingCount > 0 && <StatusBadge tone="run">{stateLabels.checking} {checkingCount}</StatusBadge>}
          </ToolbarGroup>}
          <div className="ml-auto flex shrink-0 items-center gap-3">
            <div className={toolbarGroupVariants({ variant: 'density' })} role="group" aria-label="显示密度"><Button size="icon-sm" variant={!compact ? 'secondary' : 'ghost'} title="标准布局" aria-label="标准布局" aria-pressed={!compact} onClick={() => density(false)}><Grid2X2 aria-hidden="true" /></Button><Button size="icon-sm" variant={compact ? 'secondary' : 'ghost'} title="紧凑布局" aria-label="紧凑布局" aria-pressed={compact} onClick={() => density(true)}><Grid3X3 aria-hidden="true" /></Button></div>
            <Pager page={page} portal={portal} />
          </div>
        </div>
        {items.length ? <GalleryCards items={items} selected={selected} toggle={toggle} disabled={sending} compact={compact} live={{ server: settings.lrrServerUrl, recheck, client, refreshQueue }} /> : <div className={statusPanelVariants()}><BookOpen /><h3>这里还没有故事</h3><p>换个关键词，下一本喜欢的作品也许就在附近。</p><Button asChild variant="secondary"><a href={page.action}>重置筛选</a></Button></div>}
        <div className="mt-7 flex justify-center"><Pager page={page} portal={portal} /></div>
      </section>
      <footer className={pageFooterVariants({ variant: 'live' })}><span><Flower2 size={14} />アッカリーン♪ 今日もお気に入りを見つけよう。</span><span>yurui · credit: AniBT UI · <a href="https://github.com/OpenAniBT/ui">AGPL-3.0-only</a> · <a href="https://github.com/slqy123/lrr">对应源码</a></span></footer>
    </main>
    {selected.size > 0 && <ActionBar aria-label="批量操作"><SelectionCount><Check size={17} />已选择 <Badge asChild variant="count"><strong>{selected.size}</strong></Badge> 部</SelectionCount><Button variant="ghost" size="sm" disabled={sending} onClick={() => setSelected(new Set())}>取消选择</Button><ActionBarDivider /><Button variant="secondary" disabled={sending} onClick={() => { try { copyLinks(items.filter(item => selected.has(item.id)).map(item => item.url).join('\n')); setFeedback({ tone: 'ok', message: `已复制 ${selected.size} 个链接。` }) } catch { setFeedback({ tone: 'fail', message: '无法写入剪贴板，选择已保留。' }) } }}><Copy />复制链接</Button><Button loading={sending} onClick={() => void send()}>发送队列 <ArrowRight /></Button></ActionBar>}
    <Feedback value={feedback} className={floatingFeedbackVariants({ variant: 'operation' })} onClose={() => setFeedback(null)} />
    <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} portal={portal} settings={settings} save={value => { configure({ ...value, density: compact ? 'compact' : 'standard' }); setFeedback({ tone: 'mute', message: '设置已保存，正在重新检查当前页。' }) }} theme={theme} setTheme={setTheme} />
  </div>
}
