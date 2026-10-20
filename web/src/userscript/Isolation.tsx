import * as React from 'react'
import { useState } from 'react'
import { useTheme } from './useTheme'
import { Button } from '../ui/anibt/button'
import { Input } from '../ui/anibt/input'
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from '../ui/anibt/popover'

export function IsolationApp({ host, portal, restore }: {
  host: HTMLElement
  portal: HTMLElement
  restore: () => void
}) {
  const [theme, setTheme] = useTheme(host)
  const [open, setOpen] = useState(false)
  const [offset, setOffset] = useState('')

  return <main className="surface anibt-ground p-8">
    <section className="anibt-sheet mx-auto flex max-w-3xl flex-col gap-6 p-6">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold">LRR · 新界面技术验证</h1>
        <Button variant="ghost" onClick={restore}>返回原站</Button>
      </header>
      <p className="text-sm text-muted-foreground">当前仅验证独立样式、主题与弹层，不执行图库查询或队列操作。</p>
      <div className="flex items-center gap-3">
        <label htmlFor="lrr-theme">主题</label>
        <select id="lrr-theme" className="anibt-input" value={theme} onChange={event => setTheme(event.target.value as typeof theme)}>
          <option value="auto">跟随系统</option>
          <option value="light">白樱</option>
          <option value="dark">夜樱</option>
        </select>
      </div>
      <div className="flex items-center gap-3">
        <Button>糖果按钮</Button>
        <Button variant="secondary">次要操作</Button>
        <Button disabled>不可用</Button>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild><Button variant="outline">跳转</Button></PopoverTrigger>
          <PopoverContent container={portal}>
            <PopoverTitle>日期与偏移量</PopoverTitle>
            <label htmlFor="lrr-offset">输入日期或偏移量</label>
            <Input id="lrr-offset" value={offset} placeholder="2026-01-01 或 1w" onChange={event => setOffset(event.target.value)} />
            <div className="grid grid-cols-4 gap-2">
              {['1d', '3d', '1w', '2w', '1m', '6m', '1y', '2y'].map(value =>
                <Button key={value} size="sm" variant="secondary" onClick={() => setOffset(value)}>{value}</Button>)}
            </div>
            <Button variant="ghost" onClick={() => setOpen(false)}>取消</Button>
          </PopoverContent>
        </Popover>
      </div>
      <footer className="anibt-stitch-over pt-4 text-xs text-muted-foreground">
        AniBT UI · AGPL-3.0-only · <a className="underline" href="https://github.com/OpenAniBT/ui">上游源码与许可</a>
        {' · '}<a className="underline" href="https://github.com/slqy123/lrr">本项目对应源码</a>
      </footer>
    </section>
  </main>
}
