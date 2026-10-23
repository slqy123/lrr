import { useState, type ComponentProps } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from './button'
import { IconButton } from './icon-button'
import { Input } from './input'

const formatDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const presets = [
  { label: '今天', days: 0 }, { label: '昨天', days: 1 },
  { label: '一周前', days: 7 }, { label: '一个月前', months: 1 },
  { label: '三个月前', months: 3 }, { label: '一年前', months: 12 },
]

type DatePickerProps = Omit<ComponentProps<typeof Input>, 'type' | 'value' | 'onChange' | 'min' | 'max'> & {
  value: string
  onValueChange: (value: string) => void
  min?: string
  max?: string
}

export function DatePicker({ value, onValueChange, min, max, ...props }: DatePickerProps) {
  const [month, setMonth] = useState(() => (value || max || formatDate(new Date())).slice(0, 7))
  const [year, monthNumber] = month.split('-').map(Number)
  const first = new Date(year, monthNumber - 1, 1)
  const count = new Date(year, monthNumber, 0).getDate()
  const unavailable = (date: string) => Boolean((min && date < min) || (max && date > max))
  const choose = (date: string) => { onValueChange(date); setMonth(date.slice(0, 7)) }
  const shift = (amount: number) => formatDate(new Date(year, monthNumber - 1 + amount, 1)).slice(0, 7)
  const previous = shift(-1), next = shift(1)
  return <div className="grid gap-2">
    <Input {...props} type="text" inputMode="numeric" placeholder="YYYY-MM-DD" pattern="[0-9]{4}-[0-9]{2}-[0-9]{2}" value={value} onChange={event => {
      const date = event.target.value
      onValueChange(date)
      const parsed = new Date(`${date}T00:00:00`)
      if (/^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(parsed.getTime()) && formatDate(parsed) === date) setMonth(date.slice(0, 7))
    }} />
    <div className="flex flex-wrap gap-1" aria-label="快捷日期">{presets.map(preset => {
      const date = new Date()
      if (preset.months) {
        const day = date.getDate()
        date.setDate(1)
        date.setMonth(date.getMonth() - preset.months)
        date.setDate(Math.min(day, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()))
      } else date.setDate(date.getDate() - (preset.days || 0))
      const target = formatDate(date)
      return <Button key={preset.label} size="xs" variant="secondary" disabled={unavailable(target)} onClick={() => choose(target)}>{preset.label}</Button>
    })}</div>
    <div className="rounded border border-border bg-card p-2">
      <div className="mb-2 flex items-center justify-between gap-2">
        <IconButton size="sm" label="上个月" disabled={Boolean(min && previous < min.slice(0, 7))} onClick={() => setMonth(previous)}><ChevronLeft /></IconButton>
        <span aria-live="polite" className="text-[13px] font-bold">{year} 年 {monthNumber} 月</span>
        <IconButton size="sm" label="下个月" disabled={Boolean(max && next > max.slice(0, 7))} onClick={() => setMonth(next)}><ChevronRight /></IconButton>
      </div>
      <div className="grid grid-cols-7 gap-1" role="group" aria-label={`${year} 年 ${monthNumber} 月`}>
        {['日', '一', '二', '三', '四', '五', '六'].map(day => <span key={day} className="text-center text-[11px] text-muted-foreground">{day}</span>)}
        {Array.from({ length: first.getDay() }, (_, index) => <span key={`blank-${index}`} />)}
        {Array.from({ length: count }, (_, index) => {
          const date = `${month}-${String(index + 1).padStart(2, '0')}`
          return <Button key={date} size="sm" className="min-w-0 px-0" variant={date === value ? 'default' : 'ghost'} aria-pressed={date === value} aria-label={date} disabled={unavailable(date)} onClick={() => choose(date)}>{index + 1}</Button>
        })}
      </div>
    </div>
  </div>
}
