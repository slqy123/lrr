import { createServer } from 'node:http'
import { readFileSync, realpathSync, statSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { dirname, extname, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

const source = realpathSync(process.argv[2] || (() => { throw new Error('Supply a read-only saved real HTML page') })())
const directory = dirname(source)
const nativePages = process.env.LRR_NATIVE_PAGES ? JSON.parse(readFileSync(process.env.LRR_NATIVE_PAGES, 'utf8')) : {}
if (!nativePages || typeof nativePages !== 'object' || Array.isArray(nativePages)) throw new Error('Native page manifest must map original URLs to local HTML paths')
const nativeSnapshots = new Map(Object.entries(nativePages).map(([href, file]) => {
  const url = new URL(href)
  if (url.protocol !== 'https:' || !['exhentai.org', 'e-hentai.org', 'g.e-hentai.org'].includes(url.hostname) || !(/^\/g\/\d+\/[a-zA-Z0-9]+\/$/.test(url.pathname) || url.pathname === '/gallerytorrents.php') || typeof file !== 'string') throw new Error('Invalid native snapshot mapping')
  const path = realpathSync(resolve(directory, file))
  if (!path.startsWith(directory + sep) || extname(path).toLowerCase() !== '.html') throw new Error('Native snapshots must be HTML files inside the snapshot directory')
  return [url.href, readFileSync(path)]
}))
const page = readFileSync(source)
const hash = value => createHash('sha256').update(value).digest('hex')
const digest = hash(page)
const label = process.env.LRR_PREVIEW_LABEL || 'current'
if (!/^[a-z-]+$/.test(label)) throw new Error('Invalid preview label')
const scriptPath = realpathSync(process.env.LRR_PREVIEW_SCRIPT || new URL('../lanraragi-checker.user.js', import.meta.url))
const requests = []
const tasks = new Map()
let scenario = 'normal'
const json = (res, value, status = 200) => {
  res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' })
  res.end(JSON.stringify(value))
}
const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost')
    const origin = `http://127.0.0.1:${server.address().port}`
    if (url.pathname === '/install.user.js') {
      const script = readFileSync(scriptPath, 'utf8')
      const header = script.match(/^\/\/ ==UserScript==\r?\n[\s\S]*?^\/\/ ==\/UserScript==/m)?.[0]
      if (!header) throw new Error('Build has no userscript metadata')
      const loader = header.replace(/^\/\/ @name\s+.*$/m, `// @name         LRR offline ${label}`)
        .replace(/^\/\/ @namespace\s+.*$/m, '// @namespace    urn:lrr:offline')
        .replace(/^\/\/ @version\s+.*$/m, '// @version      1.0.0')
        .replace(/^\/\/ @(?:match|include|exclude|require|updateURL|downloadURL|connect)\s+.*\r?\n/gm, '')
        .replace('// ==/UserScript==', `// @include      /^http:\\/\\/127\\.0\\.0\\.1:${server.address().port}\\/snapshot\\.html(?:[?#].*)?$/\n// @connect      127.0.0.1\n// @require      ${pathToFileURL(scriptPath).href}\n// ==/UserScript==`)
      res.writeHead(200, { 'Content-Type': 'application/javascript', 'Cache-Control': 'no-store' })
      return res.end(`${loader}\nvoid 0;\n`)
    }
    if (url.pathname === '/__native') {
      const html = nativeSnapshots.get(url.searchParams.get('url'))
      if (!html) return json(res, { error: 'Native snapshot unavailable' }, 404)
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; script-src 'none'; form-action 'none'" })
      return res.end(html)
    }
    if (url.pathname === '/__state') return json(res, { scenario, requests, tasks: [...tasks.values()], nativePages: [...nativeSnapshots.keys()], sha256: digest })
    if (url.pathname === '/__scenario' && req.method === 'POST') {
      const value = url.searchParams.get('value')
      if (!['normal', 'library-error', 'queue-error', 'send-error', 'library-hit', 'library-hit-queue-error'].includes(value)) return json(res, { error: 'Unknown scenario' }, 400)
      scenario = value
      requests.length = 0
      tasks.clear()
      return json(res, { scenario })
    }
    if (url.pathname.startsWith('/library/') || url.pathname.startsWith('/queue/')) {
      let body = ''
      for await (const chunk of req) {
        body += chunk
        if (body.length > 1024 * 1024) throw new Error('Request too large')
      }
      const data = body ? JSON.parse(body) : {}
      requests.push({ method: req.method, path: url.pathname, authorization: Boolean(req.headers.authorization) })
      if (url.pathname.startsWith('/queue/') && req.headers.authorization) return json(res, { error: 'Library authorization leaked to queue' }, 400)
      if ((scenario === 'library-error' && url.pathname.startsWith('/library/')) || (['queue-error', 'library-hit-queue-error'].includes(scenario) && url.pathname.endsWith('/lookup')) || (scenario === 'send-error' && url.pathname.endsWith('/add'))) return json(res, { error: 'Simulated failure' }, 503)
      if (url.pathname === '/library/api/plugins/use') return json(res, scenario.startsWith('library-hit') ? { success: 1, data: { id: 'offline-archive', title: 'Local library hit' } } : { success: 0, error: 'URL not found in database.' })
      if (url.pathname === '/library/api/search') return json(res, { data: [], recordsFiltered: 0 })
      if (url.pathname === '/queue/api/tasks/lookup') return json(res, { items: (data.urls || []).flatMap(url => tasks.has(url) ? [tasks.get(url)] : []) })
      if (url.pathname === '/queue/add') {
        if (!Array.isArray(data.urls) || !data.urls.every(url => typeof url === 'string')) return json(res, { error: 'Invalid URLs' }, 400)
        let added = 0
        for (const url of data.urls) if (!tasks.has(url)) { tasks.set(url, { url, status: 'pending', attempts: 0, max_attempts: 3 }); added++ }
        return json(res, { ok: true, added, duplicates: data.urls.length - added })
      }
      return json(res, { error: 'Unknown endpoint' }, 404)
    }
    res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'none'; frame-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'")
    res.setHeader('Cache-Control', 'no-store')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    if (url.pathname === '/' || url.pathname === '/snapshot.html') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8')
      return res.end(page)
    }
    const path = realpathSync(resolve(directory, '.' + decodeURIComponent(url.pathname)))
    if (!path.startsWith(directory + sep) || !statSync(path).isFile() || !['.css', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.woff', '.woff2', '.ico'].includes(extname(path).toLowerCase())) return res.writeHead(404).end()
    res.setHeader('Content-Type', ({ '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.woff': 'font/woff', '.woff2': 'font/woff2', '.ico': 'image/x-icon' })[extname(path).toLowerCase()])
    res.end(readFileSync(path))
  } catch { if (!res.headersSent) res.writeHead(404); res.end() }
})
server.listen(Number(process.env.LRR_PREVIEW_PORT || 0), '127.0.0.1', () => {
  const origin = `http://127.0.0.1:${server.address().port}`
  console.log(`${label}: ${origin}/snapshot.html\nInstall in Tampermonkey: ${origin}/install.user.js\nLibrary setting: ${origin}/library\nQueue setting: ${origin}/queue\nSnapshot SHA-256: ${digest}`)
})
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => {
  server.closeAllConnections()
  server.close()
  if (hash(readFileSync(source)) !== digest) { console.error('Snapshot changed during session'); process.exitCode = 1 }
})
