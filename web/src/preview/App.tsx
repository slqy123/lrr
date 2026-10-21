import * as React from 'react'
import { useState } from 'react'
import { BookOpen, BookHeart, Copy, CircleAlert, Search, SlidersHorizontal, Flower2, Settings, Sun, Moon, ArrowRight, ChevronLeft, ChevronRight, RefreshCw, Check, Upload, X, Pause, Play, ExternalLink } from 'lucide-react'
import { StatusPanel } from '../ui/yurui/status-panel'
import { ActionBar, SelectionCount, ActionBarDivider } from '../ui/yurui/action-bar'
import { categoryRowVariants, searchRowVariants, searchPanelVariants, searchHeadingVariants } from '../userscript/styles/search-layout'
import { mainContentVariants, pageFooterVariants } from '../userscript/styles/page-layout'
import { siteHeaderVariants, headerInnerVariants, brandVariants, brandMarkStyles } from '../userscript/styles/header-layout'
import { previewLayoutStyles } from './layout'
import { Button } from '../ui/yurui/button'
import { IconButton } from '../ui/yurui/icon-button'
import { SegmentedControl } from '../ui/yurui/segmented-control'
import { FloatingNotice } from '../ui/yurui/floating-notice'
import { Toolbar, ToolbarGroup } from '../ui/yurui/toolbar'
import { Input } from '../ui/yurui/input'
import { InputGroup } from '../ui/yurui/input-group'
import { FormFields } from '../ui/yurui/form-fields'
import { FormField } from '../ui/yurui/form-field'
import { FieldGroup } from '../ui/yurui/field-group'
import { NativeSelect } from '../ui/yurui/native-select'
import { Pagination } from '../ui/yurui/pagination'
import { Badge } from '../ui/yurui/badge'
import { FieldLabel } from '../ui/yurui/field-label'
import { Checkbox } from '../ui/yurui/checkbox'
import { PosterCardSkeleton } from '../ui/yurui/poster-card'
import { galleryGridVariants } from '../userscript/styles/gallery'
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from '../ui/yurui/popover'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/yurui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/yurui/table'
import { mockGalleries, stateLabels, type GalleryState } from './mock'
import { useTheme } from '../userscript/useTheme'
import { GalleryCards, Status } from '../userscript/GalleryCards'

const groups = ['missing', 'duplicate', 'queued', 'downloaded'] as const
const categories = ['全部', '同人志', '漫画', '画集']
type Scene = 'normal' | 'loading' | 'empty' | 'error'


export function App({ host, portal, restore }: { host: HTMLElement; portal: HTMLElement; restore: () => void }) {
  const [theme, setTheme] = useTheme(host)
  const [view, setView] = useState<'gallery' | 'queue'>('gallery')
  const [scene, setScene] = useState<Scene>('normal')
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('全部')
  const [compact, setCompact] = useState(false)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [settings, setSettings] = useState(false)
  const [detail, setDetail] = useState<(typeof mockGalleries)[number] | null>(null)
  const [page, setPage] = useState(1)
  const [jump, setJump] = useState('')
  const [jumpOpen, setJumpOpen] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [sending, setSending] = useState(false)
  const [simulateFailure, setSimulateFailure] = useState(false)
  const [paused, setPaused] = useState(false)
  const [queueFilter, setQueueFilter] = useState('全部任务')
  const [minimumRating, setMinimumRating] = useState(false)
  const [tasks, setTasks] = useState(mockGalleries.slice(0, 8).map((item, index) => ({ ...item, taskState: ['等待中', '下载中', '已完成', '下载失败'][index % 4] })))
  const visible = mockGalleries.filter(item => (category === '全部' || item.category === category) && (!search || `${item.title}${item.author}`.includes(search)))
  const toggle = (id: number) => setSelected(previous => {
    const next = new Set(previous)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    return next
  })
  const selectGroup = (state?: GalleryState) => {
    const matching = visible.filter(item => !state || item.status === state)
    const all = matching.every(item => selected.has(item.id))
    setSelected(previous => {
      const next = new Set(previous)
      matching.forEach(item => all ? next.delete(item.id) : next.add(item.id))
      return next
    })
  }
  const send = () => {
    const batch = new Set(selected)
    setSending(true)
    setFeedback('')
    setTimeout(() => {
      setSending(false)
      if (simulateFailure) setFeedback('模拟发送失败：选择已保留，可以重试。')
      else {
        setSelected(previous => new Set([...previous].filter(id => !batch.has(id))))
        setFeedback(`已模拟发送 ${batch.size} 部作品，未向服务器发送请求。`)
      }
    }, 700)
  }

  return <div className="surface yurui-ground text-[14px] leading-[1.5] showcase">
    <header className={siteHeaderVariants({ variant: 'showcase' })}>
      <div className={headerInnerVariants({ variant: 'showcase' })}>
        <a className={brandVariants({ variant: 'showcase' })} href="#" onClick={event => { event.preventDefault(); setView('gallery') }}><span className={brandMarkStyles}><BookHeart size={24} /></span><span>Yuru<b>Lib</b><small>今日もゆるっと、好きな作品を。</small></span></a>
        <nav className="flex items-center gap-2" aria-label="样板页面">
          <Button variant={view === 'gallery' ? 'secondary' : 'ghost'} onClick={() => setView('gallery')}>发现作品</Button>
          <Button variant={view === 'queue' ? 'secondary' : 'ghost'} onClick={() => setView('queue')}>队列后台 <Badge variant="count-quiet">8</Badge></Button>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label="切换主题" onClick={() => setTheme(host.classList.contains('dark') ? 'light' : 'dark')}><Sun className="hidden [:host(.dark)_&]:block" /><Moon className="[:host(.dark)_&]:hidden" /></Button>
          <Button variant="ghost" size="icon" aria-label="设置" onClick={() => setSettings(true)}><Settings /></Button>
          <Button variant="ghost" size="sm" onClick={restore}>原站界面 <ExternalLink size={13} /></Button>
        </div>
      </div>
    </header>
    <main className={mainContentVariants({ variant: 'showcase' })}>
      <div className={`preview-strip ${previewLayoutStyles['preview-strip']}`}><span><Badge variant="candy">DESIGN PREVIEW</Badge> 交互样板 · 原创示意封面 · 所有操作仅模拟</span><label>状态预览 <select aria-label="状态预览" value={scene} onChange={event => setScene(event.target.value as Scene)}><option value="normal">正常</option><option value="loading">加载中</option><option value="empty">空结果</option><option value="error">失败</option></select></label></div>
      {view === 'gallery' ? <>
        <section className={searchPanelVariants({ variant: 'showcase' })}>
          <div className={searchHeadingVariants({ variant: 'showcase' })}><div><span className={`eyebrow ${previewLayoutStyles['eyebrow']}`}>ごらく部へようこそ</span><h1>今日も、ゆるっと作品探し！ <Flower2 size={22} /></h1><p>部室で見つけたお気に入り、書架にしまおう。</p></div><span className={`yurui-sticker yurui-sticker-water header-sticker ${previewLayoutStyles['header-sticker']}`}>アッカリーン♪</span></div>
          <div className={categoryRowVariants({ variant: 'showcase' })} role="group" aria-label="作品分类">{categories.map(value => <Button key={value} size="sm" variant={category === value ? 'default' : 'ghost'} aria-pressed={category === value} onClick={() => setCategory(value)}>{value}</Button>)}</div>
          <form className={searchRowVariants({ variant: 'showcase' })} onSubmit={event => { event.preventDefault(); setSearch(query); setPage(1) }}>
            <InputGroup className="search-field"><Search size={17} aria-hidden="true" /><Input aria-label="搜索作品" placeholder="搜索标题、作者，发现下一本喜欢的作品…" value={query} onChange={event => setQuery(event.target.value)} /></InputGroup>
            <Button type="submit">搜索</Button><Button variant="secondary" onClick={() => { setQuery(''); setSearch('') }}>清空</Button>
            <Popover><PopoverTrigger asChild><Button variant="secondary"><SlidersHorizontal />筛选与工具</Button></PopoverTrigger><PopoverContent container={portal} align="end" className="w-96"><PopoverTitle>高级筛选</PopoverTitle><FieldLabel><Checkbox checked={minimumRating} onCheckedChange={value => setMinimumRating(value === true)} />仅显示评分 4 星以上 <span className="text-muted-foreground">（示意）</span></FieldLabel><FieldGroup label="页数范围"><div className="flex gap-2"><Input type="number" min={0} placeholder="最少页数" aria-label="最少页数" /><Input type="number" min={0} placeholder="最多页数" aria-label="最多页数" /></div></FieldGroup><div className="yurui-stitch-over pt-3"><FieldLabel variant="file"><Upload size={16} />文件搜索<Input type="file" accept="image/*" onChange={event => setFeedback(event.target.files?.[0] ? `已选择 ${event.target.files[0].name}，样板不会上传文件。` : '')} /></FieldLabel></div></PopoverContent></Popover>
          </form>
          {minimumRating && <div className="mt-3"><Badge variant="lang">评分 ≥ 4 ★ · 示意条件</Badge></div>}
        </section>
        <section aria-label="作品画廊">
          <div className={`collection-heading ${previewLayoutStyles['collection-heading']}`}><div><h2><span className="yurui-tape">发现作品</span> <Badge className={`count ${previewLayoutStyles['count']}`} variant="count-quiet">{visible.length}</Badge></h2><p className="text-muted-foreground">已入库 2 · 队列中 2 · 查询异常 1</p></div><SegmentedControl aria-label="显示密度" value={compact ? 'compact' : 'standard'} onValueChange={value => setCompact(value === 'compact')} items={[{ value: 'standard', label: '标准', content: '标准' }, { value: 'compact', label: '紧凑', content: '紧凑' }]} /></div>
          <Toolbar variant="spread"><ToolbarGroup><FieldLabel variant="selection"><Checkbox aria-label="选择全部作品" disabled={sending || !visible.length} checked={!visible.some(item => selected.has(item.id)) ? false : visible.every(item => selected.has(item.id)) ? true : 'indeterminate'} onCheckedChange={() => selectGroup()} />全选</FieldLabel>{groups.map(state => {
            const matching = visible.filter(item => item.status === state)
            const count = matching.filter(item => selected.has(item.id)).length
            return <FieldLabel key={state} variant="selection"><Checkbox aria-label={`选择${stateLabels[state]}`} disabled={!matching.length || sending} checked={count === 0 ? false : count === matching.length ? true : 'indeterminate'} onCheckedChange={() => selectGroup(state)} /><Status state={state} /><span className="text-muted-foreground">{matching.length}</span></FieldLabel>
          })}</ToolbarGroup>
          <Pagination aria-label="分页"><Button size="icon-sm" variant="ghost" aria-label="上一页" disabled={page === 1} onClick={() => setPage(page - 1)}><ChevronLeft /></Button><span>{page}</span><Popover open={jumpOpen} onOpenChange={setJumpOpen}><PopoverTrigger asChild><Button size="sm" variant="ghost">跳转</Button></PopoverTrigger><PopoverContent container={portal} align="end"><PopoverTitle>跳到某个时间</PopoverTitle><label htmlFor="preview-jump">日期或偏移量</label><Input id="preview-jump" value={jump} placeholder="2026-01-01 或 1w" onChange={event => setJump(event.target.value)} /><div className="grid grid-cols-4 gap-2">{['1d', '3d', '1w', '2w', '1m', '6m', '1y', '2y'].map(value => <Button key={value} size="sm" variant="secondary" onClick={() => setJump(value)}>{value}</Button>)}</div><Button onClick={() => { setJumpOpen(false); setFeedback(`模拟跳转：${jump || '尚未指定日期'}，未访问原站。`) }}>确认跳转</Button></PopoverContent></Popover><Button size="icon-sm" variant="ghost" aria-label="下一页" onClick={() => { setPage(page + 1); setFeedback('样板分页仅改变页码，作品使用同一组模拟数据。') }}><ChevronRight /></Button></Pagination></Toolbar>
          {scene === 'loading' ? <div className={galleryGridVariants({ compact })} data-compact={compact}>{Array.from({ length: 6 }, (_, index) => <PosterCardSkeleton key={index} />)}</div> : scene === 'error' ? <StatusPanel><CircleAlert /><h3>暂时没能找到书架</h3><p>模拟连接失败，你的选择不会丢失。</p><Button onClick={() => setScene('normal')}><RefreshCw />重试</Button></StatusPanel> : scene === 'empty' || !visible.length ? <StatusPanel><BookOpen /><h3>这里还没有故事</h3><p>换个关键词，下一本喜欢的作品也许就在附近。</p><Button variant="secondary" onClick={() => { setQuery(''); setSearch(''); setCategory('全部'); setScene('normal') }}>重置筛选</Button></StatusPanel> : <GalleryCards items={visible} selected={selected} toggle={toggle} disabled={sending} compact={compact} detail={setDetail} />}
        </section>
      </> : <section aria-label="队列后台">
        <div className={`collection-heading ${previewLayoutStyles['collection-heading']}`}><div><span className={`eyebrow ${previewLayoutStyles['eyebrow']}`}>YOUR COLLECTION, ON ITS WAY</span><h1>故事正在送达 <span className="yurui-sticker yurui-sticker-water">QUEUE</span></h1><p className="text-muted-foreground">慢慢收集，也是一件让人期待的事。</p></div><Button variant={paused ? 'default' : 'secondary'} onClick={() => setPaused(!paused)}>{paused ? <Play /> : <Pause />}{paused ? '恢复队列' : '暂停队列'}</Button></div>
        <div className={`queue-stats ${previewLayoutStyles['queue-stats']}`}>{[['等待中', '等待下一次启程'], ['下载中', '正在加入你的书架'], ['已完成', '又收藏了一点喜欢'], ['下载失败', '可以再试一次']].map(([label, hint]) => <div className={`yurui-sheet stat-card ${previewLayoutStyles['stat-card']}`} key={label}><span className="text-muted-foreground">{label}</span><strong className="yurui-num">{tasks.filter(task => task.taskState === label).length}</strong><small>{hint}</small></div>)}</div>
        <div className={`yurui-sheet task-panel ${previewLayoutStyles['task-panel']}`}><div className={`task-toolbar ${previewLayoutStyles['task-toolbar']}`}><div className="flex gap-1">{['全部任务', '等待中', '下载中', '已完成', '下载失败'].map(value => <Button size="sm" key={value} variant={queueFilter === value ? 'secondary' : 'ghost'} onClick={() => setQueueFilter(value)}>{value}</Button>)}</div><Button size="sm" variant="ghost" onClick={() => { setTasks(tasks.map(task => task.taskState === '下载失败' ? { ...task, taskState: '等待中' } : task)); setFeedback('已模拟重试失败任务。') }}><RefreshCw />重试失败项</Button></div>
        {scene !== 'normal' ? <StatusPanel surface="plain"><h3>{scene === 'loading' ? '正在整理任务…' : scene === 'error' ? '暂时无法连接队列' : '还没有任务'}</h3><Button variant="secondary" onClick={() => setScene('normal')}>恢复示例</Button></StatusPanel> : <Table><TableHeader><TableRow><TableHead>作品</TableHead><TableHead>状态</TableHead><TableHead>进度</TableHead><TableHead>添加时间</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader><TableBody>{tasks.filter(task => queueFilter === '全部任务' || task.taskState === queueFilter).map(task => <TableRow key={task.id}><TableCell><div className={`task-identity ${previewLayoutStyles['task-identity']}`}><img src={task.cover} alt="" /><div><strong>{task.title}</strong><small>{task.author} · {task.pages} 页</small></div></div></TableCell><TableCell><Badge variant={task.taskState === '已完成' ? 'success' : task.taskState === '下载失败' ? 'destructive' : 'lang'}>{task.taskState}</Badge></TableCell><TableCell>{task.taskState === '下载中' ? <div className={`progress-track ${previewLayoutStyles['progress-track']}`}><span /></div> : task.taskState === '已完成' ? '100%' : '—'}</TableCell><TableCell className="text-muted-foreground">今天 14:32</TableCell><TableCell className="text-right"><Button variant="ghost" size="sm" disabled={task.taskState === '已完成' || task.taskState === '已取消'} onClick={() => setTasks(tasks.map(value => value.id === task.id ? { ...value, taskState: task.taskState === '下载失败' ? '等待中' : '已取消' } : value))}>{task.taskState === '下载失败' ? '重试' : '取消'}</Button></TableCell></TableRow>)}</TableBody></Table>}
        </div>
      </section>}
      <footer className={pageFooterVariants({ variant: 'showcase' })}><span><Flower2 size={14} />アッカリーン♪ 今日もお気に入りを見つけよう。</span><span>yurui · credit: AniBT UI · <a href="https://github.com/OpenAniBT/ui">AGPL-3.0-only</a> · <a href="https://github.com/slqy123/lrr">对应源码</a></span></footer>
    </main>
    {selected.size > 0 && view === 'gallery' && <ActionBar variant="plain" aria-label="批量操作"><SelectionCount><Check size={17} />已选择 <Badge asChild variant="count"><strong>{selected.size}</strong></Badge> 部</SelectionCount><Button variant="ghost" size="sm" disabled={sending} onClick={() => setSelected(new Set())}>取消选择</Button><ActionBarDivider /><Button variant="secondary" disabled={sending} onClick={() => setFeedback(`已模拟复制 ${selected.size} 个链接，未修改剪贴板。`)}><Copy />复制链接</Button><Button loading={sending} onClick={send}>发送队列 <ArrowRight /></Button></ActionBar>}
    {feedback && <FloatingNotice spacing="relaxed" action={<IconButton size="sm" label="关闭提示" onClick={() => setFeedback('')}><X /></IconButton>}>{feedback}</FloatingNotice>}
    <Dialog open={settings} onOpenChange={setSettings}><DialogContent container={portal}><DialogHeader><DialogTitle><Settings size={18} />让书架更合心意</DialogTitle><DialogDescription>设置样板：仅主题会保存，其余字段不连接服务。</DialogDescription></DialogHeader><DialogBody><FormFields><FormField label="外观主题">{control => <NativeSelect {...control} value={theme} onChange={event => setTheme(event.target.value as typeof theme)}><option value="auto">跟随系统</option><option value="light">白樱 · 浅色</option><option value="dark">夜樱 · 深色</option></NativeSelect>}</FormField><FormField label="图库服务地址">{control => <Input {...control} placeholder="填写你的 LANraragi 地址" />}</FormField><FormField label="API 密钥">{control => <Input {...control} type="password" placeholder="本地保存，不向第三方发送" autoComplete="off" />}</FormField><FormField label="队列服务地址">{control => <Input {...control} placeholder="填写你的队列服务地址" />}</FormField><FieldLabel><Checkbox defaultChecked />启用标题匹配检查</FieldLabel><FieldLabel><Checkbox checked={simulateFailure} onCheckedChange={value => setSimulateFailure(value === true)} />模拟发送失败（用于验收失败保留选择）</FieldLabel></FormFields></DialogBody><DialogFooter><Button variant="ghost" onClick={() => setSettings(false)}>取消</Button><Button onClick={() => { setSettings(false); setFeedback('样板设置已确认；服务配置尚未接入。') }}>保存设置</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={!!detail} onOpenChange={open => { if (!open) setDetail(null) }}><DialogContent container={portal}><DialogHeader><DialogTitle>{detail?.title}</DialogTitle><DialogDescription>{detail?.author} · {detail?.category} · {detail?.pages} 页</DialogDescription></DialogHeader><DialogBody>{detail && <div className={`detail-body ${previewLayoutStyles['detail-body']}`}><img src={detail.cover} alt={detail.title} /><div><Status state={detail.status} /><p className="mt-4 text-muted-foreground">原创示意封面，仅用于评估画廊布局。正式版本将在此展示图库匹配与队列状态详情。</p></div></div>}</DialogBody><DialogFooter><Button variant="secondary" onClick={() => setDetail(null)}>关闭</Button></DialogFooter></DialogContent></Dialog>
  </div>
}
