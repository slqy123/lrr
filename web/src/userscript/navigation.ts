export interface ResultNavigation {
  first?: string
  last?: string
  ranges: { url?: string; current: boolean }[]
  minDate?: string
  maxDate?: string
}

export function readNavigation(doc: Document, base: string): ResultNavigation {
  const scripts = [...doc.querySelectorAll('script:not([src])')].map(script => script.textContent || '').join('\n')
  const literal = (name: string) => {
    const match = scripts.match(new RegExp(`\\bvar\\s+${name}\\s*=\\s*("(?:[^"\\\\]|\\\\.)*"|\\d+)\\s*;`))
    if (!match) return undefined
    try { return JSON.parse(match[1]) as string | number } catch { return undefined }
  }
  const url = (value: string | null | undefined) => {
    if (!value) return undefined
    const target = new URL(value, base)
    return target.origin === new URL(base).origin && /^https?:$/.test(target.protocol) ? target.href : undefined
  }
  const endpoint = (selector: string) => url(doc.querySelector(selector)?.getAttribute('href'))
  const date = (name: string) => {
    const value = literal(name)
    return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined
  }
  const ranges: ResultNavigation['ranges'] = [...doc.querySelectorAll('#rangebar > a, #rangebar > div')].map(node => ({
    url: node.matches('a') ? url(node.getAttribute('href')) : undefined,
    current: node.matches('[data-inrange="1"]') || !!node.querySelector('[data-inrange="1"]'),
  }))
  // Saved pages may contain only the declarations; read literals without executing site scripts.
  if (!ranges.length) {
    const span = literal('rangespan'), min = literal('rangemin'), max = literal('rangemax'), source = literal('rangeurl')
    if (typeof span === 'number' && span >= 1 && span <= 99 && typeof min === 'number' && typeof max === 'number' && typeof source === 'string') {
      const decoder = doc.createElement('textarea')
      decoder.innerHTML = source
      const href = url(decoder.value)
      for (let position = 0; position < 99; position += span) {
        const target = href ? new URL(href) : undefined
        if (position) target?.searchParams.set('range', String(position))
        ranges.push({ url: target?.href, current: (position >= min && position <= max) || (position === 98 && min === 99) })
      }
    }
  }
  return { first: endpoint('#ufirst, #dfirst'), last: endpoint('#ulast, #dlast'), ranges, minDate: date('mindate'), maxDate: date('maxdate') }
}

export type JumpMode = 'range' | 'date' | 'offset' | 'gid'
export type JumpDirection = 'newer' | 'older'
export interface JumpInput {
  mode: JumpMode
  range: number | null
  date: string
  amount: string
  unit: 'd' | 'w' | 'm' | 'y'
  gid: string
  direction: JumpDirection
  error: string
}
export const initialJump: JumpInput = { mode: 'range', range: null, date: '', amount: '1', unit: 'm', gid: '', direction: 'newer', error: '' }

export function jumpURL(previous: string | undefined, next: string | undefined, input: JumpInput & { mode: Exclude<JumpMode, 'range'> }): string {
  // Relative moves need a real cursor in the requested direction, including at the boundaries.
  const href = input.direction === 'newer' ? previous : next
  if (input.mode === 'offset' && !href) throw new Error('当前方向已到结果边界，请选择另一方向')
  const source = href || previous || next
  if (!source) throw new Error('当前结果没有可用的定位地址')
  const target = new URL(source)
  const cursor = input.direction === 'newer' ? 'prev' : 'next'
  const anchor = target.searchParams.get('prev') || target.searchParams.get('next')
  target.searchParams.delete('seek')
  target.searchParams.delete('jump')
  target.searchParams.delete('range')
  if (input.mode === 'offset') {
    if (!/^[1-9]\d*$/.test(input.amount) || !Number.isSafeInteger(Number(input.amount))) throw new Error('请输入正整数跨度')
    target.searchParams.set('jump', `${input.amount}${input.unit}`)
  } else {
    target.searchParams.delete('prev')
    target.searchParams.delete('next')
    if (input.mode === 'gid') {
      if (!/^[1-9]\d*$/.test(input.gid) || !Number.isSafeInteger(Number(input.gid) + 1)) throw new Error('请输入有效的图库编号')
      target.searchParams.set(cursor, String(Number(input.gid) + (cursor === 'prev' ? -1 : 1)))
    } else {
      const parsed = new Date(`${input.date}T00:00:00Z`)
      if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== input.date) throw new Error('请选择有效日期')
      if (!anchor) throw new Error('无法识别原站定位游标')
      target.searchParams.set(cursor, anchor)
      target.searchParams.set('seek', input.date)
    }
  }
  return target.href
}
