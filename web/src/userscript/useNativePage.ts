import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { readPage, type GalleryPage } from './page'

type Snapshot = { page: GalleryPage; url: string; title: string; scroll: number }

export function useNativePage(initial: GalleryPage, restore: (message?: string) => void) {
  const [page, setPage] = useState(initial)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const current = useRef<Snapshot>({ page: initial, url: location.href, title: document.title, scroll: window.scrollY })
  const cache = useRef(new Map<string, Snapshot>())
  const pending = useRef<AbortController | null>(null)
  const managed = useRef(false)
  const scroll = useRef<number | null>(null)

  useLayoutEffect(() => {
    if (scroll.current !== null) {
      window.scrollTo({ top: scroll.current, behavior: 'instant' })
      scroll.current = null
    }
  }, [page])

  const navigate = useCallback(async (href: string, fromHistory = false): Promise<boolean> => {
    pending.current?.abort()
    const controller = new AbortController()
    pending.current = controller
    setError('')
    setLoading(true)
    const leaving = { ...current.current, scroll: window.scrollY }
    cache.current.set(leaving.url, leaving)
    let timeout: ReturnType<typeof setTimeout> | undefined
    try {
      const target = new URL(href, location.href)
      if (target.origin !== location.origin || !['http:', 'https:'].includes(target.protocol)) throw new Error('无法在当前页面加载此地址')
      let next = fromHistory ? cache.current.get(target.href) : undefined
      if (!next) {
        timeout = setTimeout(() => controller.abort(new Error('原站响应超时，请重试')), 30000)
        const response = await fetch(target.href, { credentials: 'same-origin', signal: controller.signal })
        if (!response.ok) throw new Error(`原站请求失败（HTTP ${response.status}）`)
        const resolved = new URL(response.url)
        if (resolved.origin !== location.origin) throw new Error('原站跳转到了其他站点，请检查登录状态')
        const doc = new DOMParser().parseFromString(await response.text(), 'text/html')
        const parsed = readPage(doc, resolved.href, current.current.page.galleries.find(item => item.rating)?.rating?.image)
        if (!parsed) throw new Error('原站未返回作品列表，可能需要重新登录或完成验证')
        next = { page: parsed, url: resolved.href, title: doc.title, scroll: 0 }
      }
      if (controller.signal.aborted) throw controller.signal.reason
      // The original hidden document is stale after the first asynchronous navigation.
      if (!fromHistory && next.url !== current.current.url) history.pushState(null, '', next.url)
      managed.current = true
      current.current = next
      cache.current.set(next.url, next)
      while (cache.current.size > 20) cache.current.delete(cache.current.keys().next().value!)
      document.title = next.title
      if (fromHistory) scroll.current = next.scroll
      setPage(previous => previous === next.page ? { ...next.page } : next.page)
      return true
    } catch (cause) {
      if (pending.current !== controller) return false
      if (fromHistory) history.replaceState(history.state, '', current.current.url)
      setError(cause instanceof Error ? cause.message : '加载失败，请重试')
      return false
    } finally {
      clearTimeout(timeout)
      if (pending.current === controller) { pending.current = null; setLoading(false) }
    }
  }, [])

  useEffect(() => {
    const previousRestoration = history.scrollRestoration
    history.scrollRestoration = 'manual'
    const back = () => { void navigate(location.href, true) }
    window.addEventListener('popstate', back)
    return () => {
      window.removeEventListener('popstate', back)
      history.scrollRestoration = previousRestoration
      pending.current?.abort()
      pending.current = null
    }
  }, [navigate])

  useEffect(() => {
    const list = document.querySelector('.itg')
    if (!list) return
    let timer: ReturnType<typeof setTimeout>
    const observer = new MutationObserver(() => {
      if (managed.current) return
      clearTimeout(timer)
      timer = setTimeout(() => {
        if (managed.current) return
        try {
          const next = readPage()
          if (!next) throw new Error('无法解析更新后的列表')
          setPage(previous => {
            if (JSON.stringify(previous) === JSON.stringify(next)) return previous
            current.current = { ...current.current, page: next }
            return next
          })
        } catch { restore('LRR 无法解析更新后的列表，已恢复原站。') }
      }, 200)
    })
    observer.observe(list, { childList: true, subtree: true, characterData: true })
    return () => { clearTimeout(timer); observer.disconnect() }
  }, [restore])

  const restoreNative = () => {
    if (managed.current) {
      sessionStorage.setItem('lrr-native-once', location.href)
      location.reload()
    } else restore()
  }
  return { page, loading, error, navigate, restoreNative }
}
