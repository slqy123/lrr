import * as React from 'react'
import { useEffect, useState } from 'react'
import { Settings as SettingsIcon } from 'lucide-react'
import { Button } from '../ui/yurui/button'
import { Input } from '../ui/yurui/input'
import { FormFields } from '../ui/yurui/form-fields'
import { FieldLabel } from '../ui/yurui/field-label'
import { Checkbox } from '../ui/yurui/checkbox'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/yurui/dialog'
import type { Settings } from './settings'
import type { Theme } from './useTheme'

export function SettingsDialog({ open, onOpenChange, portal, settings, save, theme, setTheme }: {
  open: boolean; onOpenChange: (open: boolean) => void; portal: HTMLElement; settings: Settings
  save: (settings: Settings) => void; theme: Theme; setTheme: (theme: Theme) => void
}) {
  const [draft, setDraft] = useState(settings)
  const [error, setError] = useState('')
  useEffect(() => { if (open) { setDraft(settings); setError('') } }, [open, settings])
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent container={portal}><DialogHeader><DialogTitle><SettingsIcon size={18} />让书架更合心意</DialogTitle><DialogDescription>兼容读取旧版设置。连接配置仅存于 Tampermonkey，保存后重新检查。</DialogDescription></DialogHeader>
    <DialogBody><FormFields>
      <label>外观主题<select aria-label="外观主题" className="yurui-input" value={theme} onChange={event => setTheme(event.target.value as Theme)}><option value="auto">跟随系统</option><option value="light">部室手帐 · 浅色</option><option value="dark">放课后 · 深色</option></select></label>
      {([['lrrServerUrl', '图库服务地址', 'url'], ['lrrApiKey', 'API 密钥', 'password'], ['queueServerUrl', '队列服务地址', 'url']] as const).map(([key, label, type]) => <label key={key}>{label}<Input aria-label={label} type={type} value={draft[key]} autoComplete="off" onChange={event => setDraft({ ...draft, [key]: event.target.value })} /></label>)}
      <FieldLabel><Checkbox checked={draft.enableAltSearch} onCheckedChange={checked => setDraft({ ...draft, enableAltSearch: checked === true })} />启用标题匹配检查</FieldLabel>
      <details className="yurui-well px-[14px] py-3 [&>summary]:cursor-pointer [&>summary]:text-[13px] [&>summary]:font-semibold"><summary>高级检查选项</summary><FormFields variant="inset">{([['lrrConcurrency', 'URL 检查并发数'], ['altSearchConcurrency', '标题搜索并发数'], ['requestTimeoutMs', 'URL 请求超时（毫秒）'], ['searchTimeoutMs', '标题请求超时（毫秒）']] as const).map(([key, label]) => <label key={key}>{label}<Input type="number" min="1" step="1" aria-label={label} value={draft[key]} onChange={event => setDraft({ ...draft, [key]: Number(event.target.value) })} /></label>)}<FieldLabel><Checkbox checked={draft.enableLogging} onCheckedChange={checked => setDraft({ ...draft, enableLogging: checked === true })} />控制台日志</FieldLabel></FormFields></details>
      {error && <p role="alert">{error}</p>}
    </FormFields></DialogBody><DialogFooter><Button variant="ghost" onClick={() => onOpenChange(false)}>取消</Button><Button onClick={() => {
      try { save({ ...draft, lrrServerUrl: draft.lrrServerUrl.trim().replace(/\/+$/, ''), queueServerUrl: draft.queueServerUrl.trim().replace(/\/+$/, '') }); onOpenChange(false) } catch (reason) { setError((reason as Error).message) }
    }}>保存并重新检查</Button></DialogFooter>
  </DialogContent></Dialog>
}
