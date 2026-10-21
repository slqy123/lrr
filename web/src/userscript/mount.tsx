import * as React from 'react'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import styles from './styles.css?inline'
import { loadDisplayFonts } from './fonts'

type MountContext = { host: HTMLElement; portal: HTMLElement; restore: (message?: string) => void }

class RecoveryBoundary extends Component<{ restore: (message?: string) => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(_error: Error, _info: ErrorInfo) {
    this.props.restore('LRR 新界面启动失败，已恢复原站。')
  }
  render() { return this.state.failed ? null : this.props.children }
}

export function mount(render: (context: MountContext) => ReactNode) {
  if (document.getElementById('lrr-app')) return
  const host = document.createElement('div')
  host.id = 'lrr-app'
  host.style.setProperty('display', 'block', 'important')
  const shadow = host.attachShadow({ mode: 'open' })
  const sheet = document.createElement('style')
  // Shadow DOM does not isolate rem units from the original document's root font size.
  const isolatedStyles = styles.replace(/(-?\d*\.?\d+)rem\b/g, (_, value: string) => `${Number(value) * 16}px`)
  const parsed = new CSSStyleSheet()
  parsed.replaceSync(isolatedStyles)
  // Shadow styles cannot register @property; enable Tailwind's local initialization fallback.
  const defaults = [...parsed.cssRules].find(rule => rule instanceof CSSLayerBlockRule && rule.name === 'properties') as CSSLayerBlockRule | undefined
  const fallback = defaults ? [...defaults.cssRules].filter(rule => rule instanceof CSSSupportsRule).flatMap(rule => [...(rule as CSSSupportsRule).cssRules]).map(rule => rule.cssText).join('\n') : ''
  sheet.textContent = `${isolatedStyles}\n@layer properties { ${fallback} }`
  const mountPoint = document.createElement('div')
  const portal = document.createElement('div')
  portal.id = 'lrr-portals'
  shadow.append(sheet, mountPoint, portal)
  const nativeStyle = document.createElement('style')
  nativeStyle.textContent = 'html, body { margin: 0 !important; padding: 0 !important; min-width: 0 !important; max-width: none !important; width: auto !important; height: auto !important; overflow: visible !important; } body > :not(#lrr-app):not(script):not(style):not(link) { display: none !important; }'
  const root = createRoot(mountPoint)
  const unloadFonts = loadDisplayFonts()
  let restored = false
  const restore = (message?: string) => {
    if (restored) return
    restored = true
    nativeStyle.remove()
    unloadFonts()
    host.remove()
    queueMicrotask(() => root.unmount())
    if (message) {
      const notice = document.createElement('p')
      notice.setAttribute('role', 'alert')
      notice.textContent = message
      document.body.prepend(notice)
    }
  }
  try {
    document.body.append(host)
    document.head.append(nativeStyle)
    root.render(<RecoveryBoundary restore={restore}>{render({ host, portal, restore })}</RecoveryBoundary>)
  } catch {
    restore('LRR 新界面启动失败，已恢复原站。')
  }
}

