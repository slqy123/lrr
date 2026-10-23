import type { Gallery } from './model'
import type { Settings } from './settings'

type Result = Pick<Gallery, 'status' | 'hits' | 'search'>
type Entry = { url: string; timestamp: number; result: Result }
const key = 'lrr-ui-cache-v2'
const lifetime = 3 * 24 * 60 * 60 * 1000

export async function lookupCache(settings: Settings) {
  const entries = new Map<string, Entry>()
  let context = ''
  try {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(JSON.stringify([settings.lrrServerUrl, settings.lrrApiKey, settings.enableAltSearch])))
    context = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
    const saved = GM_getValue<{ context: string; entries: Entry[] } | null>(key, null)
    if (saved?.context === context && Array.isArray(saved.entries)) {
      for (const entry of saved.entries.slice(-2000)) {
        if (typeof entry?.url === 'string' && Number.isFinite(entry.timestamp) && Date.now() - entry.timestamp >= 0 && Date.now() - entry.timestamp < lifetime && entry.result?.status === 'downloaded' && Array.isArray(entry.result.hits)) entries.set(entry.url, entry)
      }
    }
  } catch {}
  let timer: ReturnType<typeof setTimeout> | undefined
  const flush = () => {
    if (timer === undefined) return
    clearTimeout(timer)
    timer = undefined
    window.removeEventListener('pagehide', flush)
    if (context) { try { GM_setValue(key, { context, entries: [...entries.values()] }) } catch {} }
  }
  return {
    flush,
    get(url: string): Result | undefined {
      const entry = entries.get(url)
      return entry && Date.now() - entry.timestamp < lifetime ? entry.result : undefined
    },
    set(url: string, result: Result) {
      const removed = entries.delete(url)
      if (result.status === 'downloaded') entries.set(url, { url, result, timestamp: Date.now() })
      else if (!removed) return
      if (entries.size > 2000) entries.delete(entries.keys().next().value!)
      if (timer === undefined) {
        timer = setTimeout(flush, 100)
        window.addEventListener('pagehide', flush, { once: true })
      }
    },
  }
}
