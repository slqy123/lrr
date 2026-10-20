import type { Archive, Gallery } from './model'
import type { Settings } from './settings'
import { lookupCache } from './cache'
import { readTorrents } from './torrents'

class SearchPending extends Error {}

type Response = { status: number; responseText: string }
declare function GM_xmlhttpRequest(options: {
  method: string; url: string; headers: Record<string, string>; data?: string; timeout: number
  onload: (response: Response) => void; onerror: () => void; ontimeout: () => void; onabort: () => void
}): { abort(): void }
declare function GM_setClipboard(text: string): void

export function copyLinks(text: string) { GM_setClipboard(text) }

function pool(limit: number) {
  let active = 0
  const pending: (() => void)[] = []
  return <T,>(run: () => Promise<T>): Promise<T> => new Promise((resolve, reject) => {
    const start = () => {
      active++
      void Promise.resolve().then(run).then(resolve, reject).finally(() => { active--; pending.shift()?.() })
    }
    if (active >= limit) pending.push(start)
    else start()
  })
}

export function createClient(settings: Settings, fresh = false) {
  const cache = lookupCache(settings)
  const controller = new AbortController()
  const libraryPool = pool(settings.lrrConcurrency)
  const searchPool = pool(settings.altSearchConcurrency)
  const searches = new Map<string, Promise<Archive[]>>()
  const endpoint = (base: string, path: string) => {
    if (!base) throw new Error('请先在设置中填写服务地址')
    const url = new URL(base)
    if (!['http:', 'https:'].includes(url.protocol)) throw new Error('服务地址必须使用 HTTP(S)')
    return base.replace(/\/+$/, '') + path
  }
  async function request(base: string, path: string, method = 'GET', data?: unknown, headers: Record<string, string> = {}, timeout = settings.requestTimeoutMs, raw = false, abortSignal?: AbortSignal): Promise<unknown> {
    const signal = abortSignal ? AbortSignal.any([controller.signal, abortSignal]) : controller.signal
    if (signal.aborted) throw new Error('检查已取消')
    const url = endpoint(base, path)
    if (settings.enableLogging) console.info('[LRR]', method, new URL(url).pathname)
    return new Promise((resolve, reject) => {
      const finish = (error?: Error, value?: unknown) => {
        signal.removeEventListener('abort', abort)
        if (error) reject(error)
        else resolve(value)
      }
      let handle: { abort(): void } | undefined
      const abort = () => { handle?.abort(); finish(new Error('检查已取消')) }
      signal.addEventListener('abort', abort, { once: true })
      try {
        handle = GM_xmlhttpRequest({
          method, url, headers: { ...headers, ...(data === undefined ? {} : { 'Content-Type': 'application/json' }) },
          data: data === undefined ? undefined : JSON.stringify(data), timeout,
          onload(response) {
            if (response.status < 200 || response.status >= 300) return finish(new Error(`HTTP ${response.status}`))
            if (response.status === 204) return finish(new SearchPending('标题搜索尚未就绪，请重新检查'))
            try { finish(undefined, raw ? response.responseText : JSON.parse(response.responseText)) } catch { finish(new Error('服务响应不是有效 JSON')) }
          },
          onerror: () => finish(new Error('无法连接服务')),
          ontimeout: () => finish(new Error('服务请求超时')),
          onabort: () => finish(new Error('检查已取消')),
        })
      } catch { finish(new Error('无法发起服务请求')) }
    })
  }
  const library = (path: string, method = 'GET') => {
    const auth: Record<string, string> = settings.lrrApiKey ? { Authorization: `Bearer ${btoa(settings.lrrApiKey)}` } : {}
    return request(settings.lrrServerUrl, path, method, undefined, auth, method === 'GET' ? settings.searchTimeoutMs : settings.requestTimeoutMs)
  }
  function archives(value: unknown): Archive[] {
    if (!Array.isArray(value)) throw new Error('标题搜索响应格式异常')
    return value.map(item => {
      if (!item || typeof item !== 'object') throw new Error('书库条目格式异常')
      const id = typeof item.id === 'string' ? item.id : typeof item.arcid === 'string' ? item.arcid : undefined
      if (!id) throw new Error('书库条目格式异常')
      return { id, title: typeof item.title === 'string' ? item.title : id, tags: typeof item.tags === 'string' ? item.tags : undefined, pagecount: typeof item.pagecount === 'number' ? item.pagecount : undefined, filesize: typeof item.filesize === 'number' ? item.filesize : undefined }
    })
  }
  async function checkRemote(item: Gallery): Promise<Partial<Gallery>> {
    try {
      const result = await libraryPool(() => library(`/api/plugins/use?plugin=urlfinder&arg=${encodeURIComponent(item.url)}`, 'POST')) as { success?: boolean | number; error?: string; data?: { id?: string; arcid?: string; error?: string; title?: string; tags?: string; pagecount?: number; filesize?: number } }
      if (!result || typeof result !== 'object' || (result.data != null && typeof result.data !== 'object') || (!('success' in result) && !result.data)) throw new Error('书库响应格式异常')
      if ([result.error, result.data?.error].some(error => error && !/^URL not found in database\.?$/i.test(error))) throw new Error('书库查询失败')
      if (result.success === true || result.success === 1 || result.data?.id || result.data?.arcid) {
        const id = typeof result.data?.id === 'string' ? result.data.id : typeof result.data?.arcid === 'string' ? result.data.arcid : ''
        return { status: 'downloaded', hits: id ? archives([{ ...result.data, id, title: result.data?.title || item.title }]) : [], error: undefined }
      }
      if (result.success !== false && result.success !== 0) throw new Error('无法判断书库查询结果')
      const title = item.title.match(/\]([^\[\]()]+)/)?.[1]?.trim()
      if (!settings.enableAltSearch || !item.author || !title || title === item.author) return { status: 'missing', hits: [], error: undefined }
      const search = `${item.author},${title}`
      if (!searches.has(search)) searches.set(search, searchPool(async () => {
        const path = `/api/search?${new URLSearchParams({ filter: search, start: '0', groupby_tanks: 'false' })}`
        let response: { data?: unknown; recordsFiltered?: number }
        try { response = await library(path) as typeof response }
        catch (error) {
          if (!(error instanceof SearchPending)) throw error
          await new Promise<void>((resolve, reject) => {
            const abort = () => { clearTimeout(timer); reject(new Error('检查已取消')) }
            const timer = setTimeout(() => { controller.signal.removeEventListener('abort', abort); resolve() }, 2000)
            controller.signal.addEventListener('abort', abort, { once: true })
            if (controller.signal.aborted) abort()
          })
          response = await library(path) as typeof response
        }
        const hits = archives(response?.data)
        if (typeof response.recordsFiltered === 'number' && response.recordsFiltered > 0 && !hits.length) throw new Error('标题搜索返回数量与条目不一致')
        return hits
      }))
      const hits = await searches.get(search)!
      return { status: hits.length ? 'duplicate' : 'missing', hits, search, error: undefined }
    } catch (error) { return { status: 'error', hits: [], error: error instanceof Error ? error.message : '书库查询失败' } }
  }
  async function check(item: Gallery): Promise<Partial<Gallery>> {
    const store = await cache
    if (!fresh) {
      const saved = store.get(item.url)
      if (saved) return saved
    }
    const result = await checkRemote(item)
    if (!controller.signal.aborted && result.status && result.hits) store.set(item.url, { status: result.status, hits: result.hits, search: result.search })
    return result
  }
  async function lookup(urls: string[]): Promise<Map<string, Gallery['queue']>> {
    const result = new Map<string, Gallery['queue']>()
    for (let offset = 0; offset < urls.length; offset += 500) {
      const batch = urls.slice(offset, offset + 500)
      try {
        const response = await request(settings.queueServerUrl, '/api/tasks/lookup', 'POST', { urls: batch }) as { items?: unknown }
        if (!Array.isArray(response?.items)) throw new Error('队列响应格式异常')
        for (const url of batch) result.set(url, undefined)
        for (const task of response.items) {
          if (!task || typeof task.url !== 'string' || !batch.includes(task.url) || !Number.isInteger(task.attempts) || !Number.isInteger(task.max_attempts) || !['pending', 'running', 'failed', 'dead', 'done', 'cancelled'].includes(task.status)) throw new Error('队列任务格式异常')
          const label = task.status === 'pending' ? '待下载' : task.status === 'running' ? '下载中' : task.status === 'failed' && task.attempts < task.max_attempts ? '等待重试' : ['dead', 'failed'].includes(task.status) ? '下载失败' : ''
          result.set(task.url, label ? { label, attempts: task.attempts, max_attempts: task.max_attempts, error: task.error, next_attempt_at: task.next_attempt_at } : undefined)
        }
      } catch (error) {
        batch.forEach(url => result.set(url, { label: '队列查询失败', attempts: 0, max_attempts: 0, error: error instanceof Error ? error.message : '无法查询队列' }))
      }
    }
    return result
  }
  async function send(urls: string[]) {
    const response = await request(settings.queueServerUrl, '/add', 'POST', { urls }) as { ok?: boolean; added?: number; duplicates?: number }
    if (response?.ok !== true || !Number.isInteger(response.added) || !Number.isInteger(response.duplicates) || response.added! < 0 || response.duplicates! < 0 || response.added! + response.duplicates! !== urls.length) throw new Error('队列未确认整批接收，选择已保留')
    return response as { added: number; duplicates: number }
  }
  async function torrents(href: string, signal?: AbortSignal) {
    const url = new URL(href, location.href)
    if (url.origin !== location.origin || url.pathname !== '/gallerytorrents.php') throw new Error('无效的原站种子地址')
    const html = await request(url.origin, url.pathname + url.search, 'GET', undefined, {}, settings.requestTimeoutMs, true, signal) as string
    return readTorrents(html, url.href)
  }
  return { check, lookup, send, torrents, dispose: () => controller.abort() }
}
