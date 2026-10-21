import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'
import { test } from 'node:test'

registerHooks({
  resolve(specifier, context, next) {
    if (specifier === 'react' && context.parentURL?.endsWith('/useGalleries.ts')) {
      return { url: 'data:text/javascript,export const {useEffect,useMemo,useState}=globalThis.hooks', shortCircuit: true }
    }
    if (specifier.startsWith('./') && context.parentURL?.endsWith('.ts')) specifier += '.ts'
    return next(specifier, context)
  },
})

const values = new Map()
globalThis.GM_getValue = (key, fallback) => values.get(key) ?? fallback
let writes = 0
globalThis.GM_setValue = (key, value) => { writes++; values.set(key, structuredClone(value)) }
globalThis.window = new EventTarget()
globalThis.document = { hidden: false }
globalThis.location = new URL('https://exhentai.org/')
const { createClient } = await import('../web/src/userscript/client.ts')
const { defaultSettings } = await import('../web/src/userscript/settings.ts')
const { parseTitle } = await import('../web/src/userscript/title.ts')
const settings = { ...defaultSettings, lrrServerUrl: 'https://library.test', queueServerUrl: 'https://queue.test', lrrApiKey: 'dummy', lrrConcurrency: 2 }
const gallery = (id = 1, title = '[Circle (Artist)] Work Title') => ({ id, url: `https://exhentai.org/g/${id}/token/`, title, author: 'Circle (Artist)', status: 'checking', hits: [] })
let response = () => ({ success: 0, error: 'URL not found in database.' })
let requests = []
let active = 0
let maximum = 0
let delay = 0
let pendingSearch = false
globalThis.GM_xmlhttpRequest = options => {
  requests.push(options)
  const limited = new URL(options.url).pathname.endsWith('/use')
  if (limited) maximum = Math.max(maximum, ++active)
  let complete = false
  const finish = callback => { if (!complete) { complete = true; if (limited) active--; callback() } }
  const timer = setTimeout(() => finish(() => {
    const url = new URL(options.url)
    if (url.pathname.endsWith('/lookup')) return options.onload({ status: 200, responseText: '{"items":[]}' })
    if (url.pathname.endsWith('/search')) {
      if (pendingSearch) { pendingSearch = false; return options.onload({ status: 204, responseText: '' }) }
      return options.onload({ status: 200, responseText: '{"data":[{"id":"duplicate"}]}' })
    }
    if (url.pathname === '/__native') return options.onload({ status: 404, responseText: '' })
    options.onload({ status: 200, responseText: JSON.stringify(response()) })
  }), delay)
  return { abort() { clearTimeout(timer); finish(options.onabort) } }
}
const reset = () => { values.clear(); requests = []; maximum = 0; delay = 0; response = () => ({ success: 0, error: 'URL not found in database.' }) }

test('title parsing handles metadata, events, consecutive prefixes and series', () => {
  for (const title of ['(C104) [Circle (Artist)] Work Title [Chinese]', '[Chinese] [Circle (Artist)] Work Title', '[Circle (Artist)] (Series) Work Title', '[汉化] [Circle (Artist)] Work Title']) {
    assert.deepEqual(parseTitle(title), { author: 'Circle (Artist)', title: 'Work Title' })
  }
  assert.deepEqual(parseTitle('Unprefixed Work'), { author: '', title: 'Unprefixed Work' })
})

test('ambiguous urlfinder failures are errors and never cached', async () => {
  for (const value of [{ success: 0 }, { success: false, data: {} }, { success: 0, error: 42 }]) {
    reset(); response = () => value
    const client = createClient({ ...settings, enableAltSearch: false })
    assert.equal((await client.check(gallery())).status, 'error')
    client.dispose()
    await new Promise(resolve => setTimeout(resolve, 0))
    assert.equal(values.has('lrr-ui-cache-v2'), false)
  }
})

test('concurrency, title search deduplication, 204 retry and auth isolation', async () => {
  reset(); delay = 5; pendingSearch = true
  const client = createClient(settings, true)
  const results = await Promise.all(Array.from({ length: 8 }, (_, index) => client.check(gallery(index + 1, '[Chinese] [Circle (Artist)] Work Title'))))
  assert(results.every(result => result.status === 'duplicate'))
  assert(maximum <= 2)
  assert.equal(requests.filter(request => request.url.includes('/search?')).length, 2)
  assert.equal(new URL(requests.find(request => request.url.includes('/search?')).url).searchParams.get('filter'), 'Circle (Artist),Work Title')
  await client.lookup([gallery().url])
  assert(requests.filter(request => request.url.startsWith(settings.lrrServerUrl)).every(request => request.headers.Authorization === 'Bearer ' + btoa('dummy')))
  assert(requests.filter(request => request.url.startsWith(settings.queueServerUrl)).every(request => !request.headers.Authorization))
  client.dispose()
})

test('cache batches writes, flushes on pagehide, isolates credentials and bypasses explicit rechecks', async () => {
  reset(); writes = 0
  const client = createClient({ ...settings, enableAltSearch: false })
  const missing = await Promise.all([client.check(gallery(1)), client.check(gallery(2))])
  assert(missing.every(result => result.status === 'missing'))
  assert.equal(writes, 0)
  window.dispatchEvent(new Event('pagehide'))
  assert.equal(writes, 1)
  client.dispose()
  const cached = createClient({ ...settings, enableAltSearch: false })
  let count = requests.length
  await cached.check(gallery())
  assert.equal(requests.length, count)
  cached.dispose()
  const fresh = createClient({ ...settings, enableAltSearch: false }, true)
  await fresh.check(gallery())
  assert.equal(requests.length, count + 1)
  fresh.dispose()
  await new Promise(resolve => setTimeout(resolve, 0))
  const changed = createClient({ ...settings, enableAltSearch: false, lrrApiKey: 'different' })
  count = requests.length
  await changed.check(gallery())
  assert.equal(requests.length, count + 1)
  changed.dispose()
})

test('disposal rejects requests without poisoning cache', async () => {
  reset(); delay = 100
  const client = createClient(settings, true)
  const checking = client.check(gallery())
  await new Promise(resolve => setTimeout(resolve, 10))
  client.dispose()
  assert.equal((await checking).status, 'error')
  requests[0].onload({ status: 200, responseText: '{"success":1,"data":{"id":"stale"}}' })
  await new Promise(resolve => setTimeout(resolve, 0))
  assert.equal(values.has('lrr-ui-cache-v2'), false)
})

test('offline native requests stay local and report missing snapshots explicitly', async () => {
  reset(); globalThis.location = new URL('http://127.0.0.1:29683/snapshot.html')
  const client = createClient(settings)
  await assert.rejects(client.details(gallery().url), /LRR_NATIVE_PAGES/)
  await assert.rejects(client.torrents('https://exhentai.org/gallerytorrents.php?gid=1&t=token'), /LRR_NATIVE_PAGES/)
  assert(requests.every(request => new URL(request.url).origin === location.origin && !request.headers.Authorization))
  client.dispose()
  globalThis.location = new URL('https://exhentai.org/')
})

test('page changes replace the disposed client and keep lookup and send usable', async () => {
  reset()
  for (const [key, value] of Object.entries(settings)) values.set(key, value)
  const slots = []
  let cursor = 0
  let effects = []
  const changed = (before, after) => !before || after.some((value, index) => value !== before[index])
  globalThis.hooks = {
    useState(initial) {
      const index = cursor++
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial
      return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value }]
    },
    useMemo(create, deps) {
      const index = cursor++
      if (changed(slots[index]?.deps, deps)) slots[index] = { deps, value: create() }
      return slots[index].value
    },
    useEffect(create, deps) {
      const index = cursor++
      if (changed(slots[index]?.deps, deps)) effects.push(() => { slots[index]?.cleanup?.(); slots[index] = { deps, cleanup: create() } })
    },
  }
  const { useGalleries } = await import('../web/src/userscript/useGalleries.ts')
  const render = page => { cursor = 0; effects = []; const result = useGalleries(page); effects.forEach(effect => effect()); return result }
  try {
    const first = render({ galleries: [gallery()] })
    await new Promise(resolve => setTimeout(resolve, 20))
    const second = render({ galleries: [gallery(), gallery(2)] })
    assert.notEqual(first.client, second.client)
    await new Promise(resolve => setTimeout(resolve, 20))
    assert.equal((await second.client.check(gallery(2))).status, 'duplicate')
    await second.client.lookup([gallery(2).url])
    response = () => ({ ok: true, added: 1, duplicates: 0 })
    assert.deepEqual(await second.client.send([gallery(2).url]), { ok: true, added: 1, duplicates: 0 })
  } finally {
    slots.forEach(slot => slot?.cleanup?.())
    delete globalThis.hooks
  }
})
