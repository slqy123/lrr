import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const dir = mkdtempSync(join(tmpdir(), 'lrr-isolation-'))
const script = readFileSync(new URL('../lanraragi-checker.user.js', import.meta.url), 'utf8')
const test = async () => {
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
  const assert = (value, message) => { if (!value) throw new Error(message) }
  await wait(150)
  const host = document.getElementById('lrr-app')
  assert(host, document.body.dataset.error || document.querySelector('[role=alert]')?.textContent || 'missing host')
  const root = host.shadowRoot
  const button = text => [...root.querySelectorAll('button')].find(node => node.textContent === text)
  const trigger = button('跳转')
  assert(trigger, 'React renders inside Shadow DOM')
  assert(getComputedStyle(document.querySelector('.itg')).display === 'none', 'original content hidden')
  assert(trigger.getBoundingClientRect().height === 32, 'control size independent of original root font')
  assert(getComputedStyle(trigger).fontSize === '13px', 'original button font cannot leak')
  assert(getComputedStyle(trigger).backgroundColor !== 'rgb(0, 255, 0)', 'original button background cannot leak')
  const theme = root.querySelector('select')
  theme.value = 'dark'; theme.dispatchEvent(new Event('change', { bubbles: true }))
  await wait(30)
  assert(getComputedStyle(host).getPropertyValue('--background').trim() === '#13111a', 'dark tokens on host')
  theme.value = 'light'; theme.dispatchEvent(new Event('change', { bubbles: true }))
  await wait(30)
  assert(getComputedStyle(host).getPropertyValue('--background').trim() === '#f7f5fa', 'light tokens on host')
  assert(values.theme === 'light', 'theme persisted')
  const triggerWidth = trigger.getBoundingClientRect().width
  trigger.click(); await wait(100)
  assert(trigger.getBoundingClientRect().width === triggerWidth, 'opening popover does not resize trigger')
  let popover = root.querySelector('[data-slot=popover-content]')
  assert(popover && root.querySelector('#lrr-portals').contains(popover), 'portal stays inside Shadow DOM')
  assert(!document.querySelector('[data-slot=popover-content]'), 'no light DOM overlay')
  const input = popover.querySelector('input')
  input.focus()
  assert(root.activeElement === input, 'input receives focus inside shadow')
  button('1w').click(); await wait(30)
  assert(input.value === '1w', 'popover controls remain interactive')
  input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }))
  await wait(250)
  assert(!root.querySelector('[data-slot=popover-content]'), 'Escape dismisses popover')
  assert(root.activeElement === trigger, 'closing popover restores trigger focus')
  trigger.click(); await wait(100)
  for (const type of ['pointerdown', 'pointerup', 'click']) root.querySelector('h1').dispatchEvent(new PointerEvent(type, { bubbles: true, composed: true, pointerType: 'mouse', button: 0 }))
  await wait(250)
  assert(!root.querySelector('[data-slot=popover-content]'), 'outside pointer dismisses popover')
  button('返回原站').click(); await wait(50)
  assert(!document.getElementById('lrr-app'), 'host removed on restore')
  assert(getComputedStyle(document.querySelector('.itg')).display === 'block', 'original display restored')
  assert(document.querySelector('.itg').textContent === 'Original gallery', 'original DOM unchanged')
  document.body.dataset.result = 'PASS'
}
try {
  const file = join(dir, 'test.html')
  writeFileSync(file, `<!doctype html><meta charset="utf-8">
    <meta http-equiv="Content-Security-Policy" content="connect-src 'none'; img-src data:; font-src data:;">
    <style>html {font-size:27px} button,input {font-size:60px!important;background:lime!important;width:500px!important} .itg {display:block}</style>
    <div class="itg">Original gallery</div>
    <script>window.addEventListener('error',event=>document.body.dataset.error=event.message);const values={}; window.GM_getValue=(key,fallback)=>values[key]??fallback;window.GM_setValue=(key,value)=>values[key]=value;</script>
    <script>${script.replaceAll('</script', '<\\/script')}</script>
    <script>(${test.toString()})().catch(error=>document.body.dataset.result='FAIL '+error.message)</script>`)
  const result = spawnSync(process.env.CHROMIUM || 'chromium', [
    '--headless', '--no-sandbox', '--disable-gpu', '--no-proxy-server', '--force-prefers-reduced-motion',
    `--user-data-dir=${join(dir, 'profile')}`, '--virtual-time-budget=4000',
    '--window-size=1440,1000', '--dump-dom', `file://${file}?view=isolation`,
  ], { encoding: 'utf8', timeout: 30000, maxBuffer: 8 * 1024 * 1024 })
  const status = result.stdout?.match(/data-result="([^"]*)"/)?.[1]
  if (status !== 'PASS') throw new Error(status || String(result.error || result.stderr))
  console.log('PASS: isolated styles, themes, portal, focus, dismissal, native restoration (Chromium offline)')
  for (const [name, content, setup] of [
    ['render failure', '<div class="itg">Original gallery</div>', 'window.matchMedia=()=>{throw new Error("simulated failure")};'],
    ['unsupported page', '<main>Original gallery</main>', ''],
  ]) {
    writeFileSync(file, `<!doctype html><meta charset="utf-8">${content}
      <script>${setup}</script><script>${script.replaceAll('</script', '<\\/script')}</script>
      <script>setTimeout(()=>{const visible=getComputedStyle(document.querySelector('main,.itg')).display!=='none';document.body.dataset.result=!document.getElementById('lrr-app')&&visible${name === 'render failure' ? '&&!!document.querySelector("[role=alert]")' : ''}?'PASS':'FAIL'},200)</script>`)
    const check = spawnSync(process.env.CHROMIUM || 'chromium', [
      '--headless', '--no-sandbox', '--disable-gpu', '--no-proxy-server',
      `--user-data-dir=${join(dir, name.replaceAll(' ', '-'))}`, '--virtual-time-budget=1000',
      '--dump-dom', `file://${file}?view=isolation`,
    ], { encoding: 'utf8', timeout: 30000, maxBuffer: 8 * 1024 * 1024 })
    if (!check.stdout?.includes('data-result="PASS"')) throw new Error(`${name}: ${check.error || 'FAIL'}`)
    console.log(`PASS: ${name}`)
  }
} finally { rmSync(dir, { recursive: true, force: true }) }
