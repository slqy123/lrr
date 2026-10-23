import { useId, useState, type Dispatch, type SetStateAction } from 'react'
import { ArrowRight, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, LocateFixed } from 'lucide-react'
import { Button } from '../ui/yurui/button'
import { IconButton } from '../ui/yurui/icon-button'
import { Input } from '../ui/yurui/input'
import { FormField } from '../ui/yurui/form-field'
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from '../ui/yurui/popover'
import { FieldGroup } from '../ui/yurui/field-group'
import { SegmentedControl } from '../ui/yurui/segmented-control'
import type { GalleryPage } from './page'
import { jumpURL, type JumpInput, type JumpMode } from './navigation'

const modes: { value: JumpMode; label: string }[] = [{ value: 'range', label: '范围' }, { value: 'date', label: '日期' }, { value: 'offset', label: '时间跨度' }, { value: 'gid', label: '图库编号' }]

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
  const titleId = useId()
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
        <PopoverContent container={portal} align="end" side={position === 'top' ? 'bottom' : 'top'} className="w-96 max-h-[var(--radix-popover-content-available-height)] overflow-y-auto" aria-labelledby={titleId}>
          <PopoverTitle id={titleId}>定位</PopoverTitle>
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
        const target = mode === 'range' ? ranges[rangeIndex]?.url : jumpURL(page.previous, page.next, { ...input, mode })
        if (!target) throw new Error('当前结果没有可用的范围定位地址')
        await navigate(target)
      }
      catch (error) { setInput(previous => ({ ...previous, error: (error as Error).message })) }
    }}>
      <FieldGroup label="定位方式" className="mb-2">
        <div className="flex flex-wrap gap-3">{modes.filter(option => option.value !== 'range' || ranges.length > 0).map(option => <label key={option.value} className="flex cursor-pointer items-center gap-2"><input type="radio" name={`${id}-mode`} value={option.value} checked={mode === option.value} onChange={() => update({ mode: option.value })} className="accent-ring" />{option.label}</label>)}</div>
      </FieldGroup>
      {mode === 'range' ? <div className="py-1">
        <div className="flex justify-between gap-2 text-[11px] text-muted-foreground"><span>最新</span><output htmlFor={`${id}-range`}>{rangeLabel}</output><span>最早</span></div>
        <input id={`${id}-range`} className="result-locate-slider" type="range" min="0" max={Math.max(0, ranges.length - 1)} step="1" value={rangeIndex} aria-label="搜索结果中的大致位置" aria-valuetext={rangeLabel} onChange={event => update({ range: Number(event.target.value) })} />
      </div> : <div className="grid gap-3">
        {mode === 'date' && <FormField label="指定日期">{control => <Input {...control} type="date" required min={navigation.minDate} max={navigation.maxDate} value={input.date} onChange={event => update({ date: event.target.value })} />}</FormField>}
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
      {input.error && <p role="alert" className="mt-3 text-[12px] text-destructive">{input.error}</p>}
      <div className="mt-2 flex justify-end"><IconButton type="submit" loading={loading} label="跳转到此处" title="跳转到此处" disabled={mode === 'range' ? !ranges[rangeIndex]?.url : !page.previous && !page.next}><ArrowRight aria-hidden="true" /></IconButton></div>
  </form>
}
