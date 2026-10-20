import * as React from 'react'
import { useState } from 'react'
import { BookOpen, Copy, CircleAlert, Search, SlidersHorizontal, Flower2, Settings, Sun, Moon, ArrowRight, ChevronLeft, ChevronRight, RefreshCw, Check, Upload, X, Pause, Play, ExternalLink } from 'lucide-react'
import { Button } from '../ui/anibt/button'
import { Input } from '../ui/anibt/input'
import { Badge } from '../ui/anibt/badge'
import { Checkbox } from '../ui/anibt/checkbox'
import { PosterCardSkeleton } from '../ui/anibt/poster-card'
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from '../ui/anibt/popover'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/anibt/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/anibt/table'
import { mockGalleries, stateLabels, type GalleryState } from './mock'
import { useTheme } from './useTheme'
import { GalleryCards, Status } from './GalleryCards'

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

  return <div className="surface anibt-ground showcase">
    <header className="site-header">
      <div className="page-width header-inner">
        <a className="brand" href="#" onClick={event => { event.preventDefault(); setView('gallery') }}><span className="brand-mark"><Flower2 size={24} /></span><span>LRR <b>Gallery</b><small>把喜欢的故事，收进书架。</small></span></a>
        <nav className="header-nav" aria-label="样板页面">
          <Button variant={view === 'gallery' ? 'secondary' : 'ghost'} onClick={() => setView('gallery')}>发现作品</Button>
          <Button variant={view === 'queue' ? 'secondary' : 'ghost'} onClick={() => setView('queue')}>队列后台 <Badge variant="count-quiet">8</Badge></Button>
        </nav>
        <div className="header-tools">
          <Button variant="ghost" size="icon" aria-label="切换主题" onClick={() => setTheme(host.classList.contains('dark') ? 'light' : 'dark')}><Sun className="theme-sun" /><Moon className="theme-moon" /></Button>
          <Button variant="ghost" size="icon" aria-label="设置" onClick={() => setSettings(true)}><Settings /></Button>
          <Button variant="ghost" size="sm" onClick={restore}>原站界面 <ExternalLink size={13} /></Button>
        </div>
      </div>
    </header>
    <main className="page-width main-content">
      <div className="preview-strip"><span><Badge variant="candy">DESIGN PREVIEW</Badge> 交互样板 · 原创示意封面 · 所有操作仅模拟</span><label>状态预览 <select aria-label="状态预览" value={scene} onChange={event => setScene(event.target.value as Scene)}><option value="normal">正常</option><option value="loading">加载中</option><option value="empty">空结果</option><option value="error">失败</option></select></label></div>
      {view === 'gallery' ? <>
        <section className="search-panel anibt-sheet">
          <div className="section-heading"><div><span className="eyebrow">YOUR NEXT FAVORITE</span><h1>今天，也有新的心动 <Flower2 size={22} /></h1><p>在一页页故事里，遇见喜欢的世界。</p></div><span className="anibt-sticker anibt-sticker-water header-sticker">小小书架 · 大大世界 ✦</span></div>
          <div className="category-row" role="group" aria-label="作品分类">{categories.map(value => <Button key={value} size="sm" variant={category === value ? 'default' : 'ghost'} aria-pressed={category === value} onClick={() => setCategory(value)}>{value}</Button>)}</div>
          <form className="search-row" onSubmit={event => { event.preventDefault(); setSearch(query); setPage(1) }}>
            <div className="search-field"><Search size={17} /><Input aria-label="搜索作品" placeholder="搜索标题、作者，发现下一本喜欢的作品…" value={query} onChange={event => setQuery(event.target.value)} /></div>
            <Button type="submit">搜索</Button><Button variant="secondary" onClick={() => { setQuery(''); setSearch('') }}>清空</Button>
            <Popover><PopoverTrigger asChild><Button variant="secondary"><SlidersHorizontal />筛选与工具</Button></PopoverTrigger><PopoverContent container={portal} align="end" className="w-96"><PopoverTitle>高级筛选</PopoverTitle><label className="check-label"><Checkbox checked={minimumRating} onCheckedChange={value => setMinimumRating(value === true)} />仅显示评分 4 星以上 <span className="muted">（示意）</span></label><label>页数范围<div className="flex gap-2 mt-2"><Input type="number" min={0} placeholder="最少页数" aria-label="最少页数" /><Input type="number" min={0} placeholder="最多页数" aria-label="最多页数" /></div></label><div className="anibt-stitch-over pt-3"><label className="file-label"><Upload size={16} />文件搜索<Input type="file" accept="image/*" onChange={event => setFeedback(event.target.files?.[0] ? `已选择 ${event.target.files[0].name}，样板不会上传文件。` : '')} /></label></div></PopoverContent></Popover>
          </form>
          {minimumRating && <div className="mt-3"><Badge variant="lang">评分 ≥ 4 ★ · 示意条件</Badge></div>}
        </section>
        <section aria-label="作品画廊">
          <div className="collection-heading"><div><h2><span className="anibt-tape">发现作品</span> <span className="muted count">{visible.length}</span></h2><p className="muted">已入库 2 · 队列中 2 · 查询异常 1</p></div><div className="density-control"><Button size="sm" variant={!compact ? 'secondary' : 'ghost'} aria-pressed={!compact} onClick={() => setCompact(false)}>标准</Button><Button size="sm" variant={compact ? 'secondary' : 'ghost'} aria-pressed={compact} onClick={() => setCompact(true)}>紧凑</Button></div></div>
          <div className="gallery-toolbar"><div className="selection-groups">{groups.map(state => {
            const matching = visible.filter(item => item.status === state)
            const count = matching.filter(item => selected.has(item.id)).length
            return <label key={state} className="group-choice"><Checkbox aria-label={`选择${stateLabels[state]}`} disabled={!matching.length || sending} checked={count === 0 ? false : count === matching.length ? true : 'indeterminate'} onCheckedChange={() => selectGroup(state)} /><Status state={state} /><span className="muted">{matching.length}</span></label>
          })}<Button variant="ghost" size="sm" disabled={sending || !visible.length} onClick={() => selectGroup()}>全选</Button></div>
          <div className="pager" aria-label="分页"><Button size="icon-sm" variant="ghost" aria-label="上一页" disabled={page === 1} onClick={() => setPage(page - 1)}><ChevronLeft /></Button><span>{page}</span><Popover open={jumpOpen} onOpenChange={setJumpOpen}><PopoverTrigger asChild><Button size="sm" variant="ghost">跳转</Button></PopoverTrigger><PopoverContent container={portal} align="end"><PopoverTitle>跳到某个时间</PopoverTitle><label htmlFor="preview-jump">日期或偏移量</label><Input id="preview-jump" value={jump} placeholder="2026-01-01 或 1w" onChange={event => setJump(event.target.value)} /><div className="grid grid-cols-4 gap-2">{['1d', '3d', '1w', '2w', '1m', '6m', '1y', '2y'].map(value => <Button key={value} size="sm" variant="secondary" onClick={() => setJump(value)}>{value}</Button>)}</div><Button onClick={() => { setJumpOpen(false); setFeedback(`模拟跳转：${jump || '尚未指定日期'}，未访问原站。`) }}>确认跳转</Button></PopoverContent></Popover><Button size="icon-sm" variant="ghost" aria-label="下一页" onClick={() => { setPage(page + 1); setFeedback('样板分页仅改变页码，作品使用同一组模拟数据。') }}><ChevronRight /></Button></div></div>
          {scene === 'loading' ? <div className="gallery-grid" data-compact={compact}>{Array.from({ length: 6 }, (_, index) => <PosterCardSkeleton key={index} />)}</div> : scene === 'error' ? <div className="empty-panel anibt-sheet"><CircleAlert /><h3>暂时没能找到书架</h3><p>模拟连接失败，你的选择不会丢失。</p><Button onClick={() => setScene('normal')}><RefreshCw />重试</Button></div> : scene === 'empty' || !visible.length ? <div className="empty-panel anibt-sheet"><BookOpen /><h3>这里还没有故事</h3><p>换个关键词，下一本喜欢的作品也许就在附近。</p><Button variant="secondary" onClick={() => { setQuery(''); setSearch(''); setCategory('全部'); setScene('normal') }}>重置筛选</Button></div> : <GalleryCards items={visible} selected={selected} toggle={toggle} disabled={sending} compact={compact} detail={setDetail} />}
        </section>
      </> : <section aria-label="队列后台">
        <div className="collection-heading"><div><span className="eyebrow">YOUR COLLECTION, ON ITS WAY</span><h1>故事正在送达 <span className="anibt-sticker anibt-sticker-water">QUEUE</span></h1><p className="muted">慢慢收集，也是一件让人期待的事。</p></div><Button variant={paused ? 'default' : 'secondary'} onClick={() => setPaused(!paused)}>{paused ? <Play /> : <Pause />}{paused ? '恢复队列' : '暂停队列'}</Button></div>
        <div className="queue-stats">{[['等待中', '等待下一次启程'], ['下载中', '正在加入你的书架'], ['已完成', '又收藏了一点喜欢'], ['下载失败', '可以再试一次']].map(([label, hint]) => <div className="anibt-sheet stat-card" key={label}><span className="muted">{label}</span><strong className="anibt-num">{tasks.filter(task => task.taskState === label).length}</strong><small>{hint}</small></div>)}</div>
        <div className="anibt-sheet task-panel"><div className="task-toolbar"><div className="flex gap-1">{['全部任务', '等待中', '下载中', '已完成', '下载失败'].map(value => <Button size="sm" key={value} variant={queueFilter === value ? 'secondary' : 'ghost'} onClick={() => setQueueFilter(value)}>{value}</Button>)}</div><Button size="sm" variant="ghost" onClick={() => { setTasks(tasks.map(task => task.taskState === '下载失败' ? { ...task, taskState: '等待中' } : task)); setFeedback('已模拟重试失败任务。') }}><RefreshCw />重试失败项</Button></div>
        {scene !== 'normal' ? <div className="empty-panel"><h3>{scene === 'loading' ? '正在整理任务…' : scene === 'error' ? '暂时无法连接队列' : '还没有任务'}</h3><Button variant="secondary" onClick={() => setScene('normal')}>恢复示例</Button></div> : <Table><TableHeader><TableRow><TableHead>作品</TableHead><TableHead>状态</TableHead><TableHead>进度</TableHead><TableHead>添加时间</TableHead><TableHead className="text-right">操作</TableHead></TableRow></TableHeader><TableBody>{tasks.filter(task => queueFilter === '全部任务' || task.taskState === queueFilter).map(task => <TableRow key={task.id}><TableCell><div className="task-identity"><img src={task.cover} alt="" /><div><strong>{task.title}</strong><small>{task.author} · {task.pages} 页</small></div></div></TableCell><TableCell><Badge variant={task.taskState === '已完成' ? 'success' : task.taskState === '下载失败' ? 'destructive' : 'lang'}>{task.taskState}</Badge></TableCell><TableCell>{task.taskState === '下载中' ? <div className="progress-track"><span /></div> : task.taskState === '已完成' ? '100%' : '—'}</TableCell><TableCell className="muted">今天 14:32</TableCell><TableCell className="text-right"><Button variant="ghost" size="sm" disabled={task.taskState === '已完成' || task.taskState === '已取消'} onClick={() => setTasks(tasks.map(value => value.id === task.id ? { ...value, taskState: task.taskState === '下载失败' ? '等待中' : '已取消' } : value))}>{task.taskState === '下载失败' ? '重试' : '取消'}</Button></TableCell></TableRow>)}</TableBody></Table>}
        </div>
      </section>}
      <footer className="page-footer"><span><Flower2 size={14} />为每一次心动，留一个位置。</span><span>AniBT UI · <a href="https://github.com/OpenAniBT/ui">AGPL-3.0-only</a> · <a href="https://github.com/slqy123/lrr">对应源码</a></span></footer>
    </main>
    {selected.size > 0 && view === 'gallery' && <aside className="selection-bar anibt-pop" aria-label="批量操作"><span className="selected-count"><Check size={17} />已选择 <strong>{selected.size}</strong> 部</span><Button variant="ghost" size="sm" disabled={sending} onClick={() => setSelected(new Set())}>取消选择</Button><span className="selection-divider" /><Button variant="secondary" disabled={sending} onClick={() => setFeedback(`已模拟复制 ${selected.size} 个链接，未修改剪贴板。`)}><Copy />复制链接</Button><Button loading={sending} onClick={send}>发送队列 <ArrowRight /></Button></aside>}
    {feedback && <div className="preview-feedback anibt-pop" role="status">{feedback}<Button variant="ghost" size="icon-sm" aria-label="关闭提示" onClick={() => setFeedback('')}><X /></Button></div>}
    <Dialog open={settings} onOpenChange={setSettings}><DialogContent container={portal}><DialogHeader><DialogTitle><Settings size={18} />让书架更合心意</DialogTitle><DialogDescription>设置样板：仅主题会保存，其余字段不连接服务。</DialogDescription></DialogHeader><DialogBody><div className="settings-fields"><label>外观主题<select aria-label="外观主题" className="anibt-input" value={theme} onChange={event => setTheme(event.target.value as typeof theme)}><option value="auto">跟随系统</option><option value="light">白樱 · 浅色</option><option value="dark">夜樱 · 深色</option></select></label><label>图库服务地址<Input placeholder="填写你的 LANraragi 地址" /></label><label>API 密钥<Input type="password" placeholder="本地保存，不向第三方发送" autoComplete="off" /></label><label>队列服务地址<Input placeholder="填写你的队列服务地址" /></label><label className="check-label"><Checkbox defaultChecked />启用标题匹配检查</label><label className="check-label"><Checkbox checked={simulateFailure} onCheckedChange={value => setSimulateFailure(value === true)} />模拟发送失败（用于验收失败保留选择）</label></div></DialogBody><DialogFooter><Button variant="ghost" onClick={() => setSettings(false)}>取消</Button><Button onClick={() => { setSettings(false); setFeedback('样板设置已确认；服务配置尚未接入。') }}>保存设置</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={!!detail} onOpenChange={open => { if (!open) setDetail(null) }}><DialogContent container={portal}><DialogHeader><DialogTitle>{detail?.title}</DialogTitle><DialogDescription>{detail?.author} · {detail?.category} · {detail?.pages} 页</DialogDescription></DialogHeader><DialogBody>{detail && <div className="detail-body"><img src={detail.cover} alt={detail.title} /><div><Status state={detail.status} /><p className="mt-4 muted">原创示意封面，仅用于评估画廊布局。正式版本将在此展示图库匹配与队列状态详情。</p></div></div>}</DialogBody><DialogFooter><Button variant="secondary" onClick={() => setDetail(null)}>关闭</Button></DialogFooter></DialogContent></Dialog>
  </div>
}
