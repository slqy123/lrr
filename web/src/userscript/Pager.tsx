import * as React from 'react'
import { useState } from 'react'
import { Button } from '../ui/yurui/button'
import { Input } from '../ui/yurui/input'
import { FormField } from '../ui/yurui/form-field'
import { Pagination, PaginationStep } from '../ui/yurui/pagination'
import { FilterChip } from '../ui/yurui/filter-chip'
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from '../ui/yurui/popover'
import { jumpURL, type GalleryPage } from './page'

export function Pager({ page, portal }: { page: GalleryPage; portal: HTMLElement }) {
  const [value, setValue] = useState('')
  const [applied, setApplied] = useState('')
  const [date, setDate] = useState(false)
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const previous = jumpURL(page.previous, applied)
  const next = jumpURL(page.next, applied)
  return <Pagination aria-label="分页">
    <PaginationStep direction="previous" href={previous} label={applied ? '向前跳转' : '上一页'} />
    <Popover open={open} onOpenChange={setOpen}><PopoverTrigger asChild><Button size="sm" variant="ghost">{applied || '跳转'}</Button></PopoverTrigger><PopoverContent container={portal} align="end"><PopoverTitle>跳到某个时间</PopoverTitle><FormField label="日期或偏移量">{control => <Input {...control} type={date ? 'date' : 'text'} value={value} placeholder="2026-01-01 或 1w" onChange={event => setValue(event.target.value)} />}</FormField>
      <Button size="sm" variant="secondary" onClick={() => { setDate(!date); setValue('') }}>{date ? '输入偏移量' : '按日期选择'}</Button>
      {!date && <div className="grid grid-cols-4 gap-2" role="group" aria-label="快捷偏移量">{['1d', '3d', '1w', '2w', '1m', '6m', '1y', '2y'].map(offset => <FilterChip key={offset} checked={value === offset} indicator={false} onClick={() => setValue(offset)}>{offset}</FilterChip>)}</div>}
      {error && <p role="alert">{error}</p>}
      <p className="text-muted-foreground">应用后，使用左右箭头选择跳转方向。</p>
      <div className="yurui-stitch-over flex gap-2 pt-3">
        <Button variant="ghost" onClick={() => { setValue(''); setApplied(''); setError(''); setOpen(false) }}>取消跳转</Button>
        <Button className="flex-1" onClick={() => { try { jumpURL(page.previous || page.next, value); if (!value) throw new Error('请输入跳转位置'); setApplied(value); setError(''); setOpen(false) } catch (reason) { setError((reason as Error).message) } }}>应用跳转</Button>
      </div>
    </PopoverContent></Popover>
    <PaginationStep direction="next" href={next} label={applied ? '向后跳转' : '下一页'} />
  </Pagination>
}
