import { useId, useState, type Dispatch, type SetStateAction } from 'react'
import { ArrowRight, CalendarDays, Clock3, Hash, SlidersHorizontal, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, LocateFixed } from 'lucide-react'
import { Button } from '../ui/yurui/button'
import { IconButton } from '../ui/yurui/icon-button'
import { DatePicker } from '../ui/yurui/date-picker'
import { Input } from '../ui/yurui/input'
import { FormField } from '../ui/yurui/form-field'
import { Popover, PopoverContent, PopoverTrigger } from '../ui/yurui/popover'
import { TabsList, TabsPanel } from '../ui/yurui/tabs'
import { FieldGroup } from '../ui/yurui/field-group'
import { SegmentedControl } from '../ui/yurui/segmented-control'
import type { GalleryPage } from './page'
import { jumpURL, type JumpInput, type JumpMode } from './navigation'

const modes: { value: JumpMode; label: string; icon: typeof CalendarDays }[] = [{ value: 'range', label: '范围', icon: SlidersHorizontal }, { value: 'date', label: '日期', icon: CalendarDays }, { value: 'offset', label: '时间跨度', icon: Clock3 }, { value: 'gid', label: '图库编号', icon: Hash }]

type PagerProps = {
  page: GalleryPage
  input: JumpInput
  setInput: Dispatch<SetStateAction<JumpInput>>
  position: 'top' | 'bottom'
  portal: HTMLElement
  navigate: (href: string) => Promise<boolean>
  loading: boolean
}

export function Pager({ page, input, setInput, position, portal, navigate, loading }: PagerProps) {
  const [open, setOpen] = useState(false)
  const { navigation } = page
  const step = (href: string | undefined, label: string, Icon: typeof ChevronLeft) => href
    ? <Button asChild variant="ghost" size="icon-sm"><a href={href} title={label} aria-label={label} onClick={event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      event.preventDefault()
      void navigate(href)
    }}><Icon aria-hidden="true" /></a></Button>
    : <IconButton size="sm" label={label} title={label} disabled><Icon aria-hidden="true" /></IconButton>
  return <nav className="result-navigation" data-position={position} aria-label={position === 'top' ? '顶部结果导航' : '底部结果导航'}>
    <div className="result-navigation-actions">
      {step(navigation.first, '最新端', ChevronsLeft)}
      {step(page.previous, '上一批', ChevronLeft)}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild><IconButton size="sm" label="定位" title="定位"><LocateFixed aria-hidden="true" /></IconButton></PopoverTrigger>
        <PopoverContent container={portal} align="end" side={position === 'top' ? 'bottom' : 'top'} className="result-locate-popover w-[420px] max-h-[var(--radix-popover-content-available-height)] overflow-y-auto gap-0 p-0" aria-label="定位">
          <LocateForm page={page} input={input} setInput={setInput} loading={loading} navigate={async href => { const changed = await navigate(href); if (changed) setOpen(false); return changed }} />
        </PopoverContent>
      </Popover>
      {step(page.next, '下一批', ChevronRight)}
      {step(navigation.last, '最早端', ChevronsRight)}
    </div>
  </nav>
}

function LocateForm({ page, input, setInput, navigate, loading }: Pick<PagerProps, 'page' | 'input' | 'setInput' | 'navigate' | 'loading'>) {
  const id = useId()
  const update = (patch: Partial<JumpInput>) => setInput(previous => ({ ...previous, ...patch, error: '' }))
  const { navigation } = page
  const ranges = navigation.ranges.filter(range => range.url)
  const mode = input.mode === 'range' && !ranges.length ? 'date' : input.mode
  const currentRange = Math.max(0, ranges.findIndex(range => range.current))
  const rangeIndex = Math.max(0, Math.min(ranges.length - 1, input.range ?? currentRange))
  const rangeURL = ranges[rangeIndex]?.url
  const rangeLabel = `${rangeURL ? Number(new URL(rangeURL).searchParams.get('range') || 0) : 0}%`
  return <form id={id} onSubmit={async event => {
      event.preventDefault()
      try {
        if (mode === 'date' && ((navigation.minDate && input.date < navigation.minDate) || (navigation.maxDate && input.date > navigation.maxDate))) throw new Error('请选择可用范围内的日期')
        const target = mode === 'range' ? ranges[rangeIndex]?.url : jumpURL(page.previous, page.next, { ...input, mode })
        if (!target) throw new Error('当前结果没有可用的范围定位地址')
        await navigate(target)
      }
      catch (error) { setInput(previous => ({ ...previous, error: (error as Error).message })) }
    }}>
      <TabsList<JumpMode> variant="notebook" className="result-locate-tabs" aria-label="定位方式" id={`${id}-mode`} panelId={`${id}-panel`} value={mode} onValueChange={mode => update({ mode })} items={modes.filter(option => option.value !== 'range' || ranges.length > 0).map(({ value, label, icon: Icon }) => ({ key: value, label: <><Icon aria-hidden="true" />{label}</> }))} />
      <div className="result-locate-body">
      <TabsPanel id={`${id}-panel`} className="min-w-0" aria-labelledby={`${id}-mode-${mode}`}>
      {mode === 'range' ? <div className="py-1">
        <div className="flex justify-between gap-2 text-[11px] text-muted-foreground"><span>最新</span><output htmlFor={`${id}-range`}>{rangeLabel}</output><span>最早</span></div>
        <input id={`${id}-range`} className="result-locate-slider" type="range" min="0" max={Math.max(0, ranges.length - 1)} step="1" value={rangeIndex} aria-label="搜索结果中的大致位置" aria-valuetext={rangeLabel} onChange={event => update({ range: Number(event.target.value) })} />
      </div> : <div className="grid gap-3">
        {mode === 'date' && <FormField label="指定日期">{control => <DatePicker {...control} required min={navigation.minDate} max={navigation.maxDate} value={input.date} onValueChange={date => update({ date })} />}</FormField>}
        {mode === 'offset' && <div className="grid grid-cols-2 gap-2">
          <FormField label="移动跨度">{control => <Input {...control} type="number" min="1" step="1" required value={input.amount} onChange={event => update({ amount: event.target.value })} />}</FormField>
          <FieldGroup label="单位">
            <SegmentedControl<JumpInput['unit']> aria-label="时间单位" className="[&>button]:min-w-0 [&>button]:flex-1" value={input.unit} onValueChange={unit => update({ unit })} items={[
              { value: 'd', label: '天', content: '天' }, { value: 'w', label: '周', content: '周' },
              { value: 'm', label: '月', content: '月' }, { value: 'y', label: '年', content: '年' },
            ]} />
          </FieldGroup>
        </div>}
        {mode === 'gid' && <FormField label="图库编号（GID）">{control => <Input {...control} type="text" inputMode="numeric" pattern="[1-9][0-9]*" required value={input.gid} placeholder="例如 123456" onChange={event => update({ gid: event.target.value })} />}</FormField>}
        <FieldGroup label={mode === 'date' ? '当天位置' : '定位方向'}>
          <SegmentedControl<JumpInput['direction']> aria-label={mode === 'date' ? '当天位置' : '定位方向'} className="[&>button]:min-w-0 [&>button]:flex-1" value={input.direction} onValueChange={direction => update({ direction })} items={[
            { value: 'newer', label: mode === 'date' ? '当天最新端' : '往更新', content: mode === 'date' ? '当天最新端' : '往更新' },
            { value: 'older', label: mode === 'date' ? '当天最旧端' : '往更早', content: mode === 'date' ? '当天最旧端' : '往更早' },
          ]} />
        </FieldGroup>
      </div>}
      </TabsPanel>
      {input.error && <p role="alert" className="mt-3 text-[12px] text-destructive">{input.error}</p>}
      <div className="mt-4 flex justify-end border-t border-border pt-3"><Button type="submit" variant="emphasis" loading={loading} title="跳转到此处" disabled={mode === 'range' ? !ranges[rangeIndex]?.url : !page.previous && !page.next}>跳转 <ArrowRight aria-hidden="true" /></Button></div>
      </div>
  </form>
}
