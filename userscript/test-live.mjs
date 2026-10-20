import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { createServer } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)
const dir = mkdtempSync(join(tmpdir(), 'lrr-live-'))
const script = readFileSync(process.env.LRR_PREVIEW_SCRIPT || new URL('../lanraragi-checker.user.js', import.meta.url), 'utf8').replaceAll('</script', '<\\/script')
const manualPreview = process.env.LRR_LIVE_PREVIEW === 'manual'
const testScript = test => manualPreview ? '' : `<script>(${test.toString()})().catch(error=>document.body.dataset.result='FAIL '+error.stack)</script>`
const boot = (savedPage = false, pendingSearch = false) => {
  window.values = { lrrServerUrl: location.origin + '/library', queueServerUrl: location.origin + '/queue', lrrApiKey: 'offline-key', theme: 'light', lrrConcurrency: 2, altSearchConcurrency: 1 }
  window.GM_getValue = (key, fallback) => values[key] ?? fallback
  window.GM_setValue = (key, value) => { values[key] = value }
  window.GM_setClipboard = value => { window.copied = value }
  window.activeRequests = { library: 0, search: 0 }; window.maximumRequests = { library: 0, search: 0 }
  window.requests = []; window.failSend = true; window.partialSend = false; window.failQueue = false; window.stale = false
  window.GM_xmlhttpRequest = options => {
    requests.push(options)
    const url = new URL(options.url)
    const index = Number(new URL(url.searchParams.get('arg') || location.href).pathname.match(/\/g\/(\d+)/)?.[1]) - 100
    const kind = url.pathname.endsWith('/use') ? 'library' : url.pathname.endsWith('/search') ? 'search' : null
    if (kind) maximumRequests[kind] = Math.max(maximumRequests[kind], ++activeRequests[kind])
    let completed = false
    const complete = () => { if (!completed && kind) activeRequests[kind]--; completed = true }
    const delayed = stale && index === 7 || url.pathname === '/gallerytorrents.php' && window.slowTorrents || url.pathname.startsWith('/g/') && window.slowDetails
    let cancelled = false
    const timer = setTimeout(() => {
      if (cancelled && !delayed) return
      complete()
      const respond = value => options.onload({ status: 200, responseText: JSON.stringify(value) })
      if (url.pathname.startsWith('/g/')) {
        if (window.failDetails) return options.onerror()
        const gid = url.pathname.split('/')[2]
        const count = window.shortDetails ? 2 : 7
        const pages = Array.from({ length: count }, (_, index) => {
          const page = index + 1
          const image = window.legacyDetails ? `<img src="/placeholder.png" data-src="/page-${page}.png" alt="Page ${page}">` : `<div title="Page ${page}" style="width:200px;height:${page === 4 ? 141 : 282}px;background:transparent url(/sprite-${gid}.png) -${index * 200}px 0 no-repeat"></div>`
          return `<a href="/s/token/${gid}-${page}">${image}</a>`
        }).join('')
        const text = window.invalidDetails ? '<h1>Login required</h1>' : `<h1 id="gn">Gallery ${gid}</h1><div id="gdd"><table><tr><td>File Size:</td><td>56.46 MiB</td></tr><tr><td>Length:</td><td>${count} pages</td></tr></table></div><div id="taglist"><table><tr><td>artist:</td><td><a href="/tag/artist:author">Author ${gid}</a></td></tr><tr><td>parody:</td><td><a href="/tag/parody:series">Original series</a></td></tr><tr><td>language:</td><td><a href="/tag/language:chinese">chinese</a></td></tr></table></div><div id="gdt">${window.noPreviews ? '' : pages}</div><div id="cdiv"><div class="c1"><div><a name="ulcomment"></a>Uploader Comment</div><div class="c6">Uploader summary<br>Translation credits</div></div><div class="c1"><div class="c6">Reader comment must not become uploader summary</div></div></div><scr${'ipt'}>window.detailInjected=true</scr${'ipt'}>`
        return options.onload({ status: 200, responseText: text })
      }
      if (url.pathname === '/gallerytorrents.php') {
        if (window.failTorrents) return options.onerror()
        const text = window.invalidTorrents ? '<h1>Login required</h1>' : window.emptyTorrents ? '<div id="torrentinfo">There are no torrents for this gallery.</div>' : `<div id="torrentinfo"><form><input name="gtid" value="1"><table><tr><td><span>Posted:</span> <span>2026-08-21 10:26</span></td><td><span>Size:</span> 128 MiB</td><td><span>Seeds:</span> 4</td></tr><tr><td><a href="https://ehtracker.org/get/example.torrent">Example torrent.zip</a><a href="magnet:?xt=urn:btih:example">Magnet</a></td></tr></table></form></div>`
        return options.onload({ status: 200, responseText: text })
      }
      if (url.pathname.endsWith('/add')) return failSend ? options.onerror() : partialSend ? respond({ ok: true, added: 0, duplicates: 0 }) : respond({ ok: true, added: JSON.parse(options.data).urls.length - 1, duplicates: 1 })
      if (url.pathname.endsWith('/lookup')) return savedPage ? respond({ items: [] }) : failQueue ? options.onerror() : respond({ items: ['running', '', 'pending', 'running', 'failed', 'dead', '', 'done'].flatMap((status, i) => status ? [{ url: location.origin + `/g/${100 + i}/token/`, status, attempts: 1, max_attempts: 3, error: status === 'dead' ? 'offline download failed' : '' }] : []) })
      if (url.pathname.endsWith('/search') && pendingSearch) { pendingSearch = false; return options.onload({ status: 204, responseText: '' }) }
      if (url.pathname.endsWith('/search')) return respond({ data: url.searchParams.get('filter') === 'Offline Author,Duplicate Gallery' ? [{ arcid: 'duplicate', title: 'Duplicate result', pagecount: 44, tags: 'language:chinese,artist:offline' }] : [] })
      if (url.pathname.endsWith('/use')) {
        if (index === 6) return options.onerror()
        if (index === 9) return respond({ unexpected: 'invalid response' })
        return respond(index === 0 || delayed ? { success: 1, data: { id: 'archive', title: 'Existing archive' } } : { success: 0, error: 'URL not found in database.', data: { error: 'URL not found in database.', total: 0 } })
      }
      options.onerror()
    }, delayed ? 500 : 5)
    return { abort() { if (url.pathname.startsWith('/g/')) window.abortedDetails = (window.abortedDetails || 0) + 1; if (url.pathname === '/gallerytorrents.php') window.abortedTorrents = (window.abortedTorrents || 0) + 1; complete(); cancelled = true; if (!delayed) clearTimeout(timer); options.onabort() } }
  }
  window.addEventListener('error', event => { document.body.dataset.error = event.message })
  window.originalMarkup = document.querySelector('.itg').innerHTML
}

const tests = async () => {
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
  const assert = (value, message) => { if (!value) throw new Error(message) }
  await wait(400)
  const host = document.getElementById('lrr-app')
  assert(host, document.body.dataset.error || document.querySelector('[role=alert]')?.textContent || 'live UI mounted')
  const root = host.shadowRoot
  for (let attempt = 0; attempt < 30 && [...root.querySelectorAll('.gallery-grid .gallery-status')].some(node => node.textContent === '检查中'); attempt++) await wait(100)
  const button = text => [...root.querySelectorAll('button')].find(node => node.textContent.trim() === text)
  const input = (label, value) => {
    const node = root.querySelector(`[aria-label="${label}"]`)
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(node, value)
    node.dispatchEvent(new Event('input', { bubbles: true, composed: true }))
  }
  assert(root.querySelector('.live-app') && !root.querySelector('.preview-strip'), 'real pages never show mock galleries')
  assert(document.documentElement.scrollWidth <= innerWidth, 'live UI has no horizontal overflow')
  assert(root.querySelectorAll('[data-slot=poster-card]').length === 12, 'all native galleries adapted')
  const categoryLabels = [...root.querySelectorAll('.card-category')]
  assert(categoryLabels[0].textContent === '漫画' && categoryLabels[1].textContent === '全年龄' && new Set(categoryLabels.map(node => node.textContent)).size === 10, 'native categories use consistent Chinese labels')
  assert(!root.querySelector('[data-slot=poster-card-sticker]'), 'categories no longer overlay covers')
  for (const card of root.querySelectorAll('[data-slot=poster-card]')) {
    const row = card.querySelector('.card-category-row').getBoundingClientRect()
    const category = card.querySelector('.card-category').getBoundingClientRect()
    const checkbox = card.querySelector('.cover-select [role=checkbox]').getBoundingClientRect()
    assert(Math.abs(category.top - checkbox.top) < 1 && Math.abs(category.height - checkbox.height) < 1 && Math.abs(checkbox.width - checkbox.height) < 1, 'card checkbox is square and matches category height and alignment')
    assert(row.top >= card.querySelector('[data-slot=poster-card-cover]').getBoundingClientRect().bottom && row.bottom <= card.querySelector('[data-slot=poster-card-title]').getBoundingClientRect().top, 'category and checkbox sit between cover and title')
  }
  const categoryKeys = [...root.querySelectorAll('.category-filter[style][aria-pressed=true]')]
  assert(new Set(categoryKeys.map(node => getComputedStyle(node).color)).size === categoryKeys.length, 'enabled categories have distinct text colors')
  assert(new Set(categoryKeys.map(node => getComputedStyle(node).backgroundImage)).size === 1, 'category backgrounds share the neutral theme material')
  const secondaryMaterial = getComputedStyle(root.querySelector('.search-row > a'))
  assert([...categoryKeys, ...categoryLabels].every(node => {
    const style = getComputedStyle(node)
    return style.backgroundImage === secondaryMaterial.backgroundImage && style.backgroundColor === secondaryMaterial.backgroundColor && style.boxShadow === secondaryMaterial.boxShadow
  }), 'category filters and labels reuse the standard secondary button material')
  const lightCategoryColor = getComputedStyle(categoryLabels[0]).color
  root.host.classList.add('dark')
  assert(getComputedStyle(categoryLabels[0]).color !== lightCategoryColor, 'category text adapts to the dark theme')
  root.host.classList.remove('dark')
  const cardCheckbox = root.querySelector('.card-category-row [role=checkbox]')
  cardCheckbox.scrollIntoView({ block: 'center' }); await wait(30)
  const checkboxBounds = cardCheckbox.getBoundingClientRect()
  assert(root.elementFromPoint(checkboxBounds.x + checkboxBounds.width / 2, checkboxBounds.y + checkboxBounds.height / 2)?.closest('[role=checkbox]') === cardCheckbox, 'checkbox remains above the stretched detail link')
  cardCheckbox.click(); await wait(30)
  assert(cardCheckbox.getAttribute('aria-checked') === 'true' && !root.querySelector('.gallery-details'), 'below-cover checkbox selects without opening details')
  cardCheckbox.click(); await wait(30)
  const states = () => [...root.querySelectorAll('.gallery-grid .gallery-status')].map(node => node.textContent)
  assert(JSON.stringify(states()) === JSON.stringify(['已入库', '疑似重复', '在队列中', '在队列中', '在队列中', '在队列中', '查询异常', '未收录', '疑似重复', '查询异常', '未收录', '未收录']), 'library and queue state precedence: ' + states())
  assert(maximumRequests.library <= 2 && maximumRequests.search <= 1, 'configured request concurrency respected')
  assert(values['lrr-ui-cache-v2']?.entries.length > 0 && !JSON.stringify(values['lrr-ui-cache-v2']).includes('offline-key'), 'persistent cache contains no plaintext credentials')
  assert(requests.filter(request => request.url.includes('/search?') && new URL(request.url).searchParams.get('filter') === 'Offline Author,Duplicate Gallery').length === (location.pathname === '/pending-search' ? 2 : 1), 'duplicate title searches deduplicated and 204 retried once')
  assert(requests.filter(request => request.url.includes('/library/')).every(request => request.headers.Authorization === 'Bearer ' + btoa('offline-key')), 'library authorization preserved')
  assert(requests.filter(request => request.url.includes('/queue/')).every(request => !request.headers.Authorization), 'library key never sent to queue')
  assert(root.querySelector('.gallery-grid a.card-detail').href === location.origin + '/g/100/token/', 'real gallery links retained')
  assert(root.querySelector('.gallery-grid img').getAttribute('src').includes('data:image/'), 'lazy cover source retained')
  assert(root.querySelector('[data-slot=poster-card]').textContent.includes('20 页') && !root.querySelector('[data-slot=poster-card]').textContent.includes('3820 页'), 'page count is separate from adjacent timestamp')
  assert(root.querySelector('.native-rating').style.backgroundPosition === '0px -21px', 'native rating sprite preserved')
  const openCard = async (index, target = '.card-detail') => { root.querySelectorAll('[data-slot=poster-card]')[index].querySelector(target).click(); await wait(80) }
  const detailTabs = () => [...root.querySelectorAll('.detail-tabs [role=tab]')].map(node => node.textContent)
  assert(!requests.some(request => new URL(request.url).pathname.startsWith('/g/')), 'gallery details are fetched only after opening their detail tab')
  await openCard(0)
  assert(detailTabs().join(',') === '详情,BT 种子,书库', 'downloaded gallery has only the library state tab')
  assert(root.querySelector('[role=tab][aria-selected=true]').textContent === '详情' && root.querySelector('.detail-summary'), 'card opens compact details without navigating')
  assert(root.querySelector('.detail-facts').textContent.includes('56.46 MiB') && root.querySelector('.detail-facts').textContent.includes('Original series'), 'native filesize and metadata shown')
  assert(root.querySelector('.detail-description').textContent === 'Uploader summary Translation credits' && !window.detailInjected, 'only uploader text extracted without executing native scripts')
  assert(root.querySelectorAll('.detail-preview-page').length === 5, 'default preview is exactly the first five native pages')
  assert([...root.querySelectorAll('.detail-preview-page')].every((node, index) => node.href.endsWith(`/100-${index + 1}`)), 'native preview order starts at page one without deduplication')
  assert(root.querySelectorAll('.detail-preview-sprite')[1].style.backgroundPosition === '-200px 0px', 'sprite offset retained')
  assert(root.querySelectorAll('.detail-preview-sprite')[3].style.height === '141px', 'landscape page keeps its native aspect ratio')
  assert(root.querySelector('.detail-preview-more').textContent.includes('7 页') && !root.querySelector('.detail-cover'), 'total count retained without repeating a large cover')
  root.querySelector('.detail-preview-sprite img').dispatchEvent(new Event('error')); await wait(20)
  assert(root.querySelector('.detail-preview-page').textContent.includes('图片不可用') && root.querySelector('.detail-preview-page').href.endsWith('/100-1'), 'failed thumbnail keeps its page number and native reader link')
  assert(root.querySelector('.detail-previews').scrollHeight <= 190 && document.documentElement.scrollWidth <= innerWidth, 'five previews remain in one row without page overflow')
  assert(requests.filter(request => new URL(request.url).pathname.startsWith('/g/')).every(request => !request.headers.Authorization), 'detail requests never receive library credentials')
  const favoriteLink = root.querySelector('.gallery-details a[href*="gallerypopups.php"]')
  assert(favoriteLink?.closest('.detail-heading-actions') && favoriteLink.nextElementSibling.textContent.includes('打开详情页'), 'native favorite link precedes the full detail link in the header')
  assert(root.querySelectorAll('.gallery-details a[href*="gallerypopups.php"]').length === 1 && !root.querySelector('.detail-summary a[href*="gallerypopups.php"]'), 'favorite link appears only once and no longer occupies the preview footer')
  assert(!root.querySelector('.card-more'), 'more menu removed')
  await openCard(1)
  assert(detailTabs().join(',') === '详情,BT 种子,重复作品', 'duplicate gallery reuses library UI under duplicate tab')
  await openCard(2)
  assert(detailTabs().join(',') === '详情,BT 种子,队列', 'queued gallery has only the queue state tab')
  await openCard(7)
  assert(detailTabs().join(',') === '详情,BT 种子', 'missing gallery has no state tab')
  await openCard(6)
  assert(detailTabs().join(',') === '详情,BT 种子' && root.querySelector('.detail-summary [role=alert]'), 'unknown library result has no state tab and retains error')
  await openCard(11)
  assert(detailTabs().join(',') === '详情', 'gallery without native torrent link has no BT tab')
  assert(!requests.some(request => request.url.includes('gallerytorrents.php')), 'native torrent pages are fetched only when their tab is opened')
  window.failDetails = true; await openCard(0)
  assert(root.querySelector('.detail-load-error [role=alert]'), 'detail request failures have an explicit retry state')
  window.failDetails = false; window.invalidDetails = true; button('重试详情').click(); await wait(60)
  assert(root.querySelector('.detail-load-error [role=alert]'), 'login pages are not treated as empty details')
  window.invalidDetails = false; window.shortDetails = true; button('重试详情').click(); await wait(60)
  assert(root.querySelectorAll('.detail-preview-page').length === 2, 'short galleries show their real page count without padding')
  window.shortDetails = false; window.legacyDetails = true; await openCard(1)
  assert(root.querySelectorAll('.detail-preview-image > img').length === 5 && root.querySelector('.detail-preview-image > img').getAttribute('src') === location.origin + '/page-1.png', 'legacy image previews preserve lazy source and page one')
  assert(!performance.getEntriesByType('resource').some(entry => /\/(?:page-[67]|placeholder)\.png$/.test(new URL(entry.name).pathname)), 'parsing native HTML does not load discarded previews or lazy placeholders')
  window.legacyDetails = false; window.noPreviews = true; await openCard(2)
  assert(!root.querySelector('.detail-preview-page') && root.querySelector('.detail-preview-more').textContent.includes('未能读取'), 'unrecognized previews retain full-page fallback')
  window.noPreviews = false; window.slowDetails = true; await openCard(0)
  assert(root.querySelector('.detail-summary [role=status]'), 'details have an explicit loading state')
  window.slowDetails = false; await openCard(1); await wait(550)
  assert(window.abortedDetails > 0 && root.querySelector('.detail-facts').textContent.includes('Author 101'), 'changing gallery aborts details and rejects late results')
  window.slowDetails = true; await openCard(0)
  root.querySelector('[aria-label=收起作品详情]').click(); await wait(550)
  assert(!root.querySelector('.gallery-details'), 'closing details prevents late requests from reopening the panel')
  window.slowDetails = false
  await openCard(0, '.card-torrents')
  assert(root.querySelector('[role=tab][aria-selected=true]').textContent === 'BT 种子' && root.querySelectorAll('.torrent-row').length === 1, 'BT shortcut loads native torrents inline')
  assert(root.querySelector('.torrent-row').textContent.includes('大小：128 MiB') && root.querySelector('.torrent-row').textContent.includes('做种：4'), 'native torrent metadata parsed')
  assert(root.querySelector('.torrent-row a[href^="magnet:"]') && root.querySelector('.torrent-row a[href$=".torrent"]'), 'actual torrent and magnet links retained')
  assert(!requests.find(request => request.url.includes('gallerytorrents.php')).headers.Authorization, 'torrent request never receives library credentials')
  window.failTorrents = true; button('重新加载').click(); await wait(60)
  assert(root.querySelector('.torrent-list [role=alert]'), 'torrent failures remain errors')
  window.failTorrents = false; window.invalidTorrents = true; button('重新加载').click(); await wait(60)
  assert(root.querySelector('.torrent-list [role=alert]'), 'login or invalid torrent pages are not empty results')
  window.invalidTorrents = false; window.emptyTorrents = true; button('重新加载').click(); await wait(60)
  assert(root.querySelector('.torrent-list').textContent.includes('原站暂无种子'), 'definitive empty torrent response displayed')
  window.emptyTorrents = false
  root.querySelector('[aria-label=收起作品详情]').click(); await wait(40)
  assert(!root.querySelector('.gallery-details'), 'inline details close explicitly')
  window.slowTorrents = true
  await openCard(0, '.card-torrents')
  assert(root.querySelector('.torrent-list [role=status]'), 'torrent tab has an explicit loading state')
  root.querySelector('[aria-label=收起作品详情]').click(); await wait(550)
  assert(window.abortedTorrents > 0 && !root.querySelector('.gallery-details'), 'closing details aborts torrent requests and rejects late updates')
  window.slowTorrents = false
  assert(getComputedStyle(root.querySelector('.gallery-grid img')).objectFit === 'contain', 'covers remain uncropped')
  assert(document.querySelector('.itg').innerHTML === originalMarkup, 'source DOM untouched')
  const next = root.querySelector('[aria-label=下一页]')
  assert(next.href === location.origin + '/?f_search=original&next=99&f_cats=767', 'cursor pagination retained')
  button('跳转').click(); await wait(50)
  button('1w').click(); await wait(20)
  button('应用跳转').click(); await wait(50)
  assert(new URL(root.querySelector('[aria-label=向后跳转]').href).searchParams.get('jump') === '1w', 'jump retains original cursor and filters')
  assert(new URL(root.querySelector('[aria-label=向后跳转]').href).searchParams.get('next') === '99', 'jump does not invent page numbers')
  button('1w').click(); await wait(50)
  input('日期或偏移量', '1234'); await wait(20)
  button('应用跳转').click(); await wait(50)
  assert(new URL(root.querySelector('[aria-label=向后跳转]').href).searchParams.get('jump') === '1234', 'four-digit offsets outside supported years remain relative jumps')
  const form = root.querySelector('#lrr-search')
  assert(new FormData(form).get('opaque') === 'preserve-me', 'unknown native fields retained')
  input('搜索作品', 'new query'); await wait(20)
  assert(new FormData(form).get('f_search') === 'new query', 'native search GET field')
  root.querySelector('[aria-label=搜索作品]').focus(); await wait(50)
  button('仅中文').click(); await wait(20)
  assert(new FormData(form).get('f_search').includes('language:chinese'), 'language suggestions affect real search')
  const allAges = () => [...root.querySelectorAll('button')].find(node => node.textContent === '全年龄' && node.closest('[data-slot=popover-content]'))
  allAges().click(); await wait(20)
  assert(new FormData(form).get('f_cats') === '767', 'all-ages category uses exclusion mask')
  allAges().click(); await wait(20)
  assert(new FormData(form).get('f_cats') === '4', 'all-ages preset restores previous categories')
  root.querySelector('[aria-label=搜索作品]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true })); await wait(200)
  button('筛选与工具').click(); await wait(50)
  input('最少页数', '20'); await wait(20)
  assert(new FormData(form).get('f_spf') === '20', 'portaled filter synchronizes form field')
  assert(button('应用筛选并搜索').form === form, 'portaled submit belongs to isolated form')
  button('文件搜索').click(); await wait(20)
  const file = root.querySelector('form[enctype="multipart/form-data"]')
  assert(file && file.action === 'https://upld.e-hentai.org/image_lookup.php' && new FormData(file).get('fs_similar') === 'on', 'native file-search protocol')
  root.querySelector('[aria-label=最少页数]').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true })); await wait(200)
  const choice = name => root.querySelector(`[aria-label="选择${name}"]`)
  choice('未收录').click(); await wait(20)
  assert(root.querySelector('.selected-count strong').textContent === '3', 'unknown, queue and lookup errors excluded from missing selection')
  assert(!root.querySelector('.gallery-details'), 'batch selection never opens gallery details')
  choice('疑似重复').click(); await wait(20)
  assert(root.querySelector('.selected-count strong').textContent === '5', 'selection groups are additive')
  button('复制链接').click(); await wait(20)
  assert(copied.split('\n').length === 5 && !copied.includes('/106/'), 'real selected URLs copied')
  button('发送队列').click(); await wait(50)
  assert(root.querySelector('.selected-count strong').textContent === '5' && root.querySelector('[role=status]').textContent.includes('保留'), 'failed send retains selection')
  failSend = false; partialSend = true
  button('发送队列').click(); await wait(70)
  assert(root.querySelector('.selected-count strong').textContent === '5', 'ambiguous partial acknowledgment retains entire selection')
  partialSend = false
  button('发送队列').click(); await wait(70)
  assert(!root.querySelector('.selection-bar'), 'successful send clears only submitted batch')
  const sent = requests.filter(request => request.url.endsWith('/add'))
  assert(sent.length === 3 && JSON.parse(sent[2].data).urls.length === 5, 'queue contract preserved')
  await openCard(0, '.status-action')
  assert(root.querySelector('.library-details a[href*="/reader?id=archive"]'), 'inline library tab has actual reader link')
  assert(root.querySelectorAll('.gallery-details').length === 1, 'only one inline detail panel is mounted')
  const cards = [...root.querySelectorAll('[data-slot=poster-card]')]
  const columns = getComputedStyle(root.querySelector('.gallery-grid')).gridTemplateColumns.split(' ').length
  assert(root.querySelector('.gallery-details').previousElementSibling === cards[columns - 1], 'detail panel inserted after the selected card row')
  assert(root.querySelector('.gallery-details').getBoundingClientRect().width > cards[0].getBoundingClientRect().width * 2, 'detail panel spans the full gallery row')
  root.querySelector('.gallery-details').dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true })); await wait(80)
  assert(!root.querySelector('.gallery-details'), 'Escape closes inline details')
  root.querySelector('.gallery-grid .status-action').dispatchEvent(new PointerEvent('pointerover', { bubbles: true })); await wait(60)
  assert(!root.querySelector('.gallery-details'), 'hover never opens or pins a detail panel')
  failQueue = true
  root.querySelector('[aria-label=重新检查]').click(); await wait(300)
  assert(states()[0] === '已入库' && states()[7] === '查询异常', 'queue lookup failure is unknown, not missing; library hit wins')
  failQueue = false
  stale = true; root.querySelector('[aria-label=重新检查]').click(); await wait(40)
  stale = false; root.querySelector('[aria-label=重新检查]').click(); await wait(650)
  assert(states()[7] === '未收录', 'stale responses cannot replace new checks')
  button('紧凑').click(); await wait(20)
  root.querySelector('[aria-label=设置]').click(); await wait(80)
  assert(root.querySelector('[aria-label="API 密钥"]').value === 'offline-key', 'old settings migrated without losing key')
  input('图库服务地址', 'javascript:invalid'); await wait(20)
  button('保存并重新检查').click(); await wait(30)
  assert(root.querySelector('[role=alert]') && values.lrrServerUrl.endsWith('/library'), 'invalid configuration not persisted')
  input('图库服务地址', location.origin + '/library'); await wait(20)
  button('保存并重新检查').click(); await wait(300)
  assert(values['lrr-settings-version'] === 2, 'settings schema saved with compatibility marker')
  assert(values.density === 'compact', 'saving connection settings preserves current density')
  assert(!document.body.dataset.error, 'no uncaught runtime errors: ' + document.body.dataset.error)
  button('原站界面').click(); await wait(50)
  assert(!document.getElementById('lrr-app') && document.querySelector('.itg').innerHTML === originalMarkup, 'restore returns original DOM')
  assert(getComputedStyle(document.querySelector('.itg')).display !== 'none', 'native list visible after restore')
  const bundle = [...document.scripts].find(node => node.textContent.includes('// @name         Lanraragi Checker')).textContent
  const remount = async () => { const node = document.createElement('script'); node.textContent = bundle; document.body.append(node); await wait(300); return document.getElementById('lrr-app').shadowRoot }
  let before = requests.length
  let cachedRoot = await remount()
  assert(requests.slice(before).filter(request => request.url.includes('/plugins/use')).length === 2, 'persistent cache reuses definitive results, not errors')
  assert([...cachedRoot.querySelectorAll('.gallery-grid .gallery-status')][7].textContent === '未收录', 'stale response did not poison persistent cache')
  ;[...cachedRoot.querySelectorAll('button')].find(node => node.textContent.trim().startsWith('原站界面')).click(); await wait(30)
  values.lrrApiKey = 'different-offline-key'
  before = requests.length; cachedRoot = await remount()
  assert(requests.slice(before).filter(request => request.url.includes('/plugins/use')).length === 12, 'cache isolated by API credentials')
  const list = document.querySelector('.itg')
  const originalCard = list.querySelector('.gl1t, tr')
  const appended = originalCard.cloneNode(true)
  appended.querySelectorAll('a[href*="/g/"]').forEach(link => link.href = location.origin + '/g/112/token/')
  appended.querySelector('.glink').textContent = '[New Author] Added gallery'
  originalCard.parentElement.append(appended); await wait(500)
  assert(cachedRoot.querySelectorAll('[data-slot=poster-card]').length === 13, 'native list additions adapted')
  appended.remove(); await wait(500)
  assert(cachedRoot.querySelectorAll('[data-slot=poster-card]').length === 12, 'native list removals reflected')
  ;[...cachedRoot.querySelectorAll('button')].find(node => node.textContent.trim().startsWith('原站界面')).click(); await wait(30)
  document.body.dataset.result = 'PASS'
}

const mobileDetailTests = async () => {
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
  const assert = (value, message) => { if (!value) throw new Error(message) }
  await wait(400)
  const root = document.getElementById('lrr-app')?.shadowRoot
  root.querySelector('.card-detail').click(); await wait(100)
  const panel = root.querySelector('.gallery-details')
  const strip = root.querySelector('.detail-previews')
  assert(panel.getBoundingClientRect().right <= innerWidth, 'inline panel fits the narrow viewport')
  assert(root.querySelector('.detail-heading-actions').getBoundingClientRect().right <= panel.getBoundingClientRect().right, 'header actions fit the narrow inline panel')
  assert(strip.scrollWidth > strip.clientWidth && strip.scrollHeight <= 190, 'five thumbnails scroll horizontally in one row')
  assert(root.querySelectorAll('.detail-preview-page').length === 5, 'narrow screens retain all five preview pages')
  document.body.dataset.result = 'PASS'
}

const historyTests = async () => {
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
  const forward = () => {
    if (location.pathname === '/history' && sessionStorage.getItem('navigation') === 'back') {
      sessionStorage.setItem('navigation', 'forward'); history.forward()
    } else if (location.search && sessionStorage.getItem('navigation') === 'forward') {
      const valid = new URL(location.href).searchParams.get('next') === '99' && document.getElementById('lrr-app')?.shadowRoot.querySelector('.live-app')
      document.body.dataset.result = valid ? 'PASS' : 'FAIL restored cursor page'
    }
  }
  window.addEventListener('pageshow', forward)
  await wait(300)
  const root = document.getElementById('lrr-app')?.shadowRoot
  if (!root?.querySelector('.live-app')) throw new Error('navigation page did not mount')
  if (location.search) {
    if (new URL(location.href).searchParams.get('next') !== '99') throw new Error('cursor lost in navigation')
    if (sessionStorage.getItem('navigation') === 'forward') document.body.dataset.result = 'PASS'
    else { sessionStorage.setItem('navigation', 'back'); history.back() }
  } else if (sessionStorage.getItem('navigation') === 'back') forward()
  else { sessionStorage.setItem('navigation', 'next'); root.querySelector('[aria-label=下一页]').click() }
}

const recoveryTests = async () => {
  await new Promise(resolve => setTimeout(resolve, 250))
  const mode = new URL(location.href).pathname.slice(1)
  const host = document.getElementById('lrr-app')
  const root = host?.shadowRoot
  if (mode === 'empty') {
    if (!root?.querySelector('.empty-panel') || root.querySelector('[data-slot=poster-card]')) throw new Error('empty results not rendered')
  } else if (host || !document.querySelector('[role=alert]') || getComputedStyle(document.querySelector('.itg')).display === 'none') throw new Error('parse failure did not preserve native page')
  document.body.dataset.result = 'PASS'
}
const savedTests = async () => {
  await new Promise(resolve => setTimeout(resolve, 600))
  const root = document.getElementById('lrr-app')?.shadowRoot
  if (!root?.querySelector('.live-app')) throw new Error('saved page did not mount')
  const titles = [...document.querySelectorAll('.itg .glink')]
  const cards = [...root.querySelectorAll('[data-slot=poster-card]')]
  if (!titles.length || cards.length !== titles.length) throw new Error('saved gallery count changed')
  titles.forEach((title, index) => {
    if (cards[index].querySelector('a.card-detail').href !== title.closest('a').href || !cards[index].textContent.includes(title.textContent.trim())) throw new Error('saved title/link changed')
    const count = [...title.closest('.gl1t').querySelectorAll('div')].map(node => node.textContent.match(/^(\d+) pages$/)?.[1]).find(Boolean)
    if (count && !cards[index].textContent.includes(`${count} 页`)) throw new Error('saved page count changed')
  })
  const native = new FormData(document.querySelector('#searchbox form'))
  const isolated = new FormData(root.querySelector('#lrr-search'))
  for (const [name, value] of native) {
    if (value && value !== '0' && isolated.get(name) !== value) throw new Error('saved search parameter changed: ' + name)
  }
  if (root.querySelector('[aria-label=下一页]').href !== document.querySelector('#unext').href) throw new Error('saved next link changed')
  if (document.querySelector('.itg').innerHTML !== originalMarkup) throw new Error('source page mutated')
  document.body.dataset.result = 'PASS'
}

function fixture(mode) {
  const cards = Array.from({ length: 12 }, (_, index) => {
    const title = [1, 8].includes(index) ? '[Offline Author] Duplicate Gallery' : index === 10 ? 'No author gallery' : `[Author ${index}] Gallery ${index} [Chinese]`
    const content = `<a href="/g/${100 + index}/token/"><div class="glink">${title}</div></a><div class="gl3t"><img src="data:image/gif;base64,R0lGODlhAQABAAAAACw=" data-src="data:image/gif;base64,R0lGODlhAQABAAAAACw="></div><div class="gl5t"><div class="cs">${['Manga', 'Non-H', 'Doujinshi', 'Artist CG', 'Game CG', 'Western', 'Image Set', 'Cosplay', 'Asian Porn', 'Misc'][index % 10]}</div><div id="posted_${index}" onclick="popUp('/gallerypopups.php?gid=${100 + index}&amp;t=token',675,415)">2026-01-01 12:38</div><div>${index + 20} pages</div><div class="ir" style="background-image:url(data:image/gif;base64,R0lGODlhAQABAAAAACw=);background-position:0px -21px;opacity:.66"></div>${index === 11 ? '' : `<a href="/gallerytorrents.php?gid=${100 + index}&amp;t=token">T</a>`}</div>`
    return mode === 'table' ? `<tr><td>${content}</td></tr>` : `<div class="gl1t">${content}</div>`
  }).join('')
  const list = mode === 'empty' ? '<div class="itg gld"></div>' : mode === 'malformed' ? '<div class="itg"><div class="gl1t"><a href="/g/100/token/">Unrecognized markup</a></div></div>' : mode === 'table' ? `<table class="itg"><tbody>${cards}</tbody></table>` : `<div class="itg gld">${cards}</div>`
  return `<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="connect-src 'none'; img-src data: 'self'; font-src data:;"><div id="nb"><a href="/favorites.php">Favorites</a></div><div id="searchbox"><form action="/" method="get"><input name="f_search" value="original"><input name="f_cats" value="4" ${mode === 'default-categories' ? 'disabled' : ''}><input name="opaque" value="preserve-me"></form></div><div class="searchtext">12 results</div><div class="searchnav"><span id="uprev"></span><a id="unext" href="/?f_search=original&amp;next=99&amp;f_cats=767">Next</a></div>${list}<script>(${boot.toString()})(false, ${mode === 'pending-search'})</script><script>${script}</script>${testScript(mode === 'inline-mobile' ? mobileDetailTests : mode.startsWith('history') ? historyTests : ['empty', 'malformed'].includes(mode) ? recoveryTests : tests)}`
}

const saved = process.argv[2] ? readFileSync(process.argv[2], 'utf8').replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '') : ''
const server = createServer((req, res) => {
  if (/^\/(?:sprite-\d+|page-\d+|placeholder)\.png$/.test(req.url)) {
    res.setHeader('Content-Type', 'image/gif')
    return res.end(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'))
  }
  res.setHeader('Content-Type', 'text/html; charset=utf-8')
  if (req.url === '/saved') {
    const source = saved.replaceAll('https://exhentai.org', `http://${req.headers.host}`)
    res.end(`<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:; connect-src 'none';">${source}<script>(${boot.toString()})(true)</script><script>${script}</script>${testScript(savedTests)}`)
  } else res.end(fixture(req.url.startsWith('/?') ? 'history-next' : req.url.slice(1)))
})
try {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  if (process.env.LRR_LIVE_PREVIEW) {
    console.log(`${process.env.LRR_PREVIEW_LABEL || 'Live preview'}: http://127.0.0.1:${server.address().port}/${saved ? 'saved' : 'history'}`)
    process.once('SIGTERM', () => { server.closeAllConnections(); server.close() })
    await new Promise(resolve => server.once('close', resolve))
  } else for (const [mode, width] of [['thumbnail', 1440], ['thumbnail', 900], ['inline-mobile', 390], ['table', 1440], ['default-categories', 1440], ['pending-search', 1440], ['empty', 1440], ['malformed', 1440], ...(saved ? [['saved', 1440]] : [])]) {
    const { stdout } = await run(process.env.CHROMIUM || 'chromium', ['--headless', '--no-sandbox', '--disable-gpu', '--no-proxy-server', '--force-prefers-reduced-motion', `--user-data-dir=${join(dir, `${mode}-${width}`)}`, '--virtual-time-budget=10000', `--window-size=${width},1000`, '--dump-dom', `http://127.0.0.1:${server.address().port}/${mode}`], { timeout: 30000, maxBuffer: 12 * 1024 * 1024 })
    const status = stdout.match(/data-result="([^"]*)"/)?.[1]
    if (status !== 'PASS') { writeFileSync('/tmp/lrr-live-failure.html', stdout); throw new Error(`${mode}: ${status || 'no result'}`) }
    console.log(`PASS: ${['thumbnail', 'table', 'default-categories', 'pending-search'].includes(mode) ? `${mode} live UI, API semantics, settings, cache, mutations and restoration` : mode === 'inline-mobile' ? 'inline details with five horizontally scrolling previews' : mode === 'saved' ? 'saved gallery DOM, titles, links, filters and cursors' : mode === 'history' ? 'real cursor navigation with browser back and forward' : `${mode} page handling`} (${width}px, offline Chromium)`)
  }
} finally { server.close(); rmSync(dir, { recursive: true, force: true }) }
