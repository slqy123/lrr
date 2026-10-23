import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Check, CircleAlert, Info, X } from 'lucide-react'
import { IconButton } from './icon-button'
import { Spinner } from './spinner'

export type ToastMessage = { message: string; tone: 'ok' | 'fail' | 'mute' | 'run' }
type ToastEntry = ToastMessage & { id: string; revision: number }
type ToastActions = { notify: (value: ToastMessage, id?: string) => void; dismiss: (id: string) => void }
const ToastContext = createContext<ToastActions | null>(null)

function Toast({ value, dismiss }: { value: ToastEntry; dismiss: (id: string) => void }) {
  const close = useCallback(() => dismiss(value.id), [dismiss, value.id])
  const [paused, setPaused] = useState(false)
  useEffect(() => {
    if (paused || value.tone === 'run' || value.tone === 'fail') return
    const timer = setTimeout(close, 5000)
    return () => clearTimeout(timer)
  }, [value.revision, value.tone, paused, close])
  const Icon = value.tone === 'ok' ? Check : value.tone === 'fail' ? CircleAlert : Info
  return <div data-slot="toast" className="yurui-pop pointer-events-auto flex items-center gap-3 px-[14px] py-[10px] text-[13px] leading-normal text-foreground" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)} onFocusCapture={() => setPaused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false) }}>
    <div role={value.tone === 'fail' ? 'alert' : 'status'} aria-atomic="true" className="flex min-w-0 flex-1 items-center gap-3">
      {value.tone === 'run' ? <Spinner aria-hidden="true" /> : <Icon aria-hidden="true" className={`size-4 shrink-0 ${value.tone === 'fail' ? 'text-destructive' : 'text-muted-foreground'}`} />}
      <span className="min-w-0 [overflow-wrap:anywhere]">{value.message}</span>
    </div>
    {value.tone !== 'run' && <IconButton size="sm" label="关闭提示" onClick={close}><X /></IconButton>}
  </div>
}

export function ToastProvider({ container, children }: { container: HTMLElement; children: ReactNode }) {
  const [entries, setEntries] = useState<ToastEntry[]>([])
  const sequence = useRef(0)
  const notify = useCallback((value: ToastMessage, id?: string) => {
    const revision = ++sequence.current
    const key = id ?? `toast-${revision}`
    setEntries(previous => {
      const next = [...previous.filter(entry => entry.id !== key), { ...value, id: key, revision }]
      if (next.length > 5) next.splice(next.findIndex(entry => entry.tone !== 'run'), 1)
      return next
    })
  }, [])
  const dismiss = useCallback((id: string) => setEntries(previous => previous.filter(entry => entry.id !== id)), [])
  return <ToastContext.Provider value={{ notify, dismiss }}>{children}{createPortal(
    <div data-slot="toaster" aria-label="通知" className="pointer-events-none fixed bottom-[96px] left-1/2 z-[80] flex w-[380px] max-w-[calc(100%-32px)] -translate-x-1/2 flex-col gap-2">
      {entries.map(entry => <Toast key={`${entry.id}-${entry.revision}`} value={entry} dismiss={dismiss} />)}
    </div>, container,
  )}</ToastContext.Provider>
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast requires ToastProvider')
  return context
}
