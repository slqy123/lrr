import { readFileSync, mkdtempSync, writeFileSync, rmSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

const directory = mkdtempSync(join(tmpdir(), 'lrr-showcase-'))
const script = readFileSync(new URL('./dist/preview.js', import.meta.url), 'utf8')
const output = resolve('userscript/dist')
const run = async () => {
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
  const assert = (condition, message) => { if (!condition) throw new Error(message) }
  await wait(200)
  const host = document.querySelector('#lrr-app')
  assert(host, document.body.dataset.error || 'mounted')
  const root = host.shadowRoot
  const button = text => [...root.querySelectorAll('button')].find(item => item.textContent.trim() === text)
  assert(root.querySelectorAll('[data-slot=poster-card]').length === 12, 'twelve sample works')
  assert(getComputedStyle(root.querySelector('.search-field input')).boxShadow !== 'none', 'input ring renders inside Shadow DOM')
  assert(getComputedStyle(root.querySelector('[data-slot=poster-card]')).boxShadow !== 'none', 'poster shadow renders inside Shadow DOM')
  assert([...root.querySelectorAll('[data-slot=poster-card] img')].every(image => getComputedStyle(image).objectFit === 'contain'), 'uncropped covers')
  await document.fonts.ready
  assert(document.fonts.check('500 16px "LRR Fredoka"'), 'display font available without external requests')
  const grid = root.querySelector('.gallery-grid').getBoundingClientRect()
  assert(grid.left >= 0 && grid.right <= innerWidth, 'grid within viewport')
  const missing = root.querySelector('[aria-label="选择未收录"]')
  const missingIcon = missing.closest('label').querySelector('.gallery-status svg').innerHTML
  assert([...root.querySelectorAll('.status-missing svg')].every(icon => icon.innerHTML === missingIcon), 'shared group and card icons')
  missing.click(); await wait(20)
  assert(root.querySelector('.selected-count strong').textContent === '4', 'missing selection excludes errors and checking')
  button('取消选择').click(); await wait(20)
  assert(!root.querySelector('.selection-bar'), 'deselect hides floating bar')
  root.querySelector('[aria-label="选择《放学后的蓝色时刻》"]').click(); await wait(20)
  assert(root.querySelector('.selected-count strong').textContent === '1', 'individual selection')
  button('复制链接').click(); await wait(20)
  assert(root.querySelector('[role=status]').textContent.includes('未修改剪贴板'), 'copy explicitly simulated')
  root.querySelector('.card-detail').click(); await wait(50)
  assert(root.querySelector('[data-slot=dialog-title]').textContent.includes('蓝色时刻'), 'gallery detail dialog')
  root.querySelector('[data-slot=dialog-close]').click(); await wait(50)
  button('紧凑').click(); await wait(20)
  assert(root.querySelector('.gallery-grid').dataset.compact === 'true', 'compact layout')
  button('标准').click()
  button('跳转').click(); await wait(50)
  assert(root.querySelector('#lrr-portals [data-slot=popover-content]'), 'jump isolated')
  button('1w').click(); await wait(20)
  assert(root.querySelector('#preview-jump').value === '1w', 'jump presets')
  button('确认跳转').click(); await wait(50)
  root.querySelector('[aria-label=设置]').click(); await wait(80)
  assert(root.querySelector('#lrr-portals [data-slot=dialog-content]'), 'settings dialog isolated')
  root.querySelector('[aria-label="外观主题"]').value = 'dark'
  root.querySelector('[aria-label="外观主题"]').dispatchEvent(new Event('change', { bubbles: true }))
  await wait(30)
  assert(host.classList.contains('dark'), 'settings theme switch')
  const failureLabel = [...root.querySelectorAll('label')].find(label => label.textContent.includes('模拟发送失败'))
  failureLabel.querySelector('[role=checkbox]').click(); await wait(20)
  button('保存设置').click(); await wait(80)
  button('发送队列').click(); await wait(800)
  assert(root.querySelector('.selected-count strong').textContent === '1', 'failed simulation preserves selection')
  assert(root.querySelector('[role=status]').textContent.includes('失败'), 'failed feedback')
  root.querySelector('[aria-label=设置]').click(); await wait(50)
  const failure = [...root.querySelectorAll('label')].find(label => label.textContent.includes('模拟发送失败'))
  failure.querySelector('[role=checkbox]').click(); await wait(20)
  button('保存设置').click(); await wait(50)
  button('发送队列').click(); await wait(800)
  assert(!root.querySelector('.selection-bar'), 'successful simulation clears sent selection')
  button('画集').click(); await wait(20)
  assert(root.querySelectorAll('[data-slot=poster-card]').length === 4, 'category filters gallery')
  button('全部').click(); await wait(20)
  const searchInput = root.querySelector('[aria-label="搜索作品"]')
  Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(searchInput, '蓝色')
  searchInput.dispatchEvent(new Event('input', { bubbles: true, composed: true })); await wait(20)
  root.querySelector('.search-row').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); await wait(20)
  assert(root.querySelectorAll('[data-slot=poster-card]').length === 1, 'search filters gallery')
  button('清空').click(); await wait(20)
  root.querySelector('[aria-label="选择《放学后的蓝色时刻》"]').click(); await wait(20)
  const scene = root.querySelector('[aria-label="状态预览"]')
  for (const state of ['loading', 'empty', 'error', 'normal']) {
    scene.value = state; scene.dispatchEvent(new Event('change', { bubbles: true })); await wait(20)
    if (state === 'normal') assert(root.querySelectorAll('[data-slot=poster-card]').length === 12, 'restore gallery')
    else if (state === 'loading') assert(!root.querySelector('[data-slot=poster-card]'), 'loading replaces works')
    else assert(root.querySelector('.empty-panel'), `${state} panel`)
  }
  const queue = [...root.querySelectorAll('nav button')].find(item => item.textContent.includes('队列后台'))
  queue.click(); await wait(30)
  assert(root.querySelectorAll('tbody tr').length === 8, 'queue table')
  button('暂停队列').click(); await wait(20)
  assert(button('恢复队列'), 'queue pause simulation')
  button('下载失败').click(); await wait(20)
  assert(root.querySelectorAll('tbody tr').length === 2, 'queue filter')
  button('重试失败项').click(); await wait(20)
  assert(root.querySelectorAll('tbody tr').length === 0, 'queue retry simulation')
  button('全部任务').click()
  const shot = new URLSearchParams(location.search).get('shot') || 'light'
  if (!shot.startsWith('queue')) button('发现作品').click()
  await wait(30)
  if (host.classList.contains('dark') !== shot.endsWith('dark')) root.querySelector('[aria-label="切换主题"]').click()
  root.querySelector('[aria-label="关闭提示"]')?.click()
  if (shot.startsWith('settings')) root.querySelector('[aria-label=设置]').click()
  if (shot === 'filters') button('筛选与工具').click()
  if (shot === 'jump') button('跳转').click()
  if (shot === 'compact') button('紧凑').click()
  if (['loading', 'empty', 'error'].includes(shot)) {
    scene.value = shot; scene.dispatchEvent(new Event('change', { bubbles: true }))
  }
  await wait(100)
  assert(root.querySelector('.surface').scrollWidth <= innerWidth, 'no horizontal page overflow')
  document.body.dataset.result = 'PASS'
}
try {
  mkdirSync(output, { recursive: true })
  const fixture = join(directory, 'preview.html')
  writeFileSync(fixture, `<!doctype html><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="connect-src 'none';img-src data:;font-src data:">
    <style>html{font-size:12px}body{margin:0}button{font-size:45px!important}</style><div class="itg">Original</div>
    <script>const values={theme:'light'};window.GM_getValue=(key,fallback)=>values[key]??fallback;window.GM_setValue=(key,value)=>values[key]=value;window.addEventListener('error',event=>document.body.dataset.error=event.message)</script>
    <script>${script.replaceAll('</script', '<\\/script')}</script><script>(${run.toString()})().catch(error=>document.body.dataset.result='FAIL '+error.message)</script>`)
  for (const [width, shot] of [[1440, 'light'], [1440, 'dark'], [1440, 'queue'], [1440, 'queue-dark'], [1440, 'settings'], [1440, 'settings-dark'], [1440, 'filters'], [1440, 'jump'], [1440, 'compact'], [1440, 'loading'], [1440, 'empty'], [1440, 'error'], [1024, 'light'], [900, 'light']]) {
    const result = spawnSync(process.env.CHROMIUM || 'chromium', [
      '--headless', '--no-sandbox', '--disable-gpu', '--no-proxy-server', '--force-prefers-reduced-motion',
      `--user-data-dir=${join(directory, `${width}-${shot}`)}`, '--virtual-time-budget=5000',
      `--window-size=${width},1100`, `--screenshot=${join(output, `showcase-${width}-${shot}.png`)}`, '--dump-dom', `file://${fixture}?shot=${shot}`,
    ], { encoding: 'utf8', timeout: 30000, maxBuffer: 8 * 1024 * 1024 })
    const status = result.stdout?.match(/data-result="([^"]*)"/)?.[1]
    if (status !== 'PASS') throw new Error(`${width} ${shot}: ${status || result.error || result.stderr}`)
    console.log(`PASS: showcase ${width} ${shot} (offline Chromium)`)
  }
} finally { rmSync(directory, { recursive: true, force: true }) }
