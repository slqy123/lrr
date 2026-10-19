import { collect, galleries, labels, notify, select, type GalleryStatus } from './state'
import styles from './ui.css?inline'
import themeStyles from './theme.css?inline'

type Config = Record<string, string | number | boolean>
interface Options {
  config: Config
  defaults: Config
  persist: (key: string, value: unknown) => void
  recheck: () => void
  send: (urls: string[]) => Promise<{ added: number; duplicates: number }>
  copy: (text: string) => void
}
const paths: Record<string, string> = {
  menu: 'M4 6h16M4 12h16M4 18h16', close: 'm6 6 12 12M6 18 18 6',
  send: 'm22 2-7 20-4-9-9-4 20-7ZM22 2 11 13', copy: 'M9 9h12v12H9zM15 9V3H3v12h6',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8ZM12 2v3m0 14v3M2 12h3m14 0h3M5 5l2 2m10 10 2 2M5 19l2-2M17 7l2-2',
  external: 'M14 3h7v7m0-7L10 14M10 3H3v18h18v-7', refresh: 'M20 7a9 9 0 1 0 1 9M20 2v6h-6',
}
function icon(name: string) { return `<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="${paths[name]}"/></svg>` }

export function mountPanel(options: Options) {
  const { config, defaults, persist } = options
  const host = document.createElement('div')
  host.id = 'lrr-tools'
  document.body.append(host)
  const root = host.attachShadow({ mode: 'open' })
  root.innerHTML = `<style>${themeStyles}\n${styles}</style>
    <button class="launcher" aria-label="打开 LRR 工具" aria-expanded="false">${icon('menu')} LRR <span id="launcher-count"></span></button>
    <aside class="panel" aria-label="LRR 画廊工具" hidden>
      <header><strong>LRR <small>画廊工具</small></strong><button data-action="close" aria-label="关闭面板">${icon('close')}</button></header>
      <section><div class="summary" aria-live="polite"></div><p class="hint">按状态替换选择，也可在画廊上逐项勾选。</p>
        <div class="choices"><button data-select="missing">选择未入库</button><button data-select="duplicate">选择疑似重复</button><button data-select="all">全选</button><button data-select="none">清空</button></div>
        <p class="scope hint"></p><div class="counts"></div>
      </section>
      <section class="actions"><button class="primary" data-action="send">${icon('send')}发送到队列</button><button data-action="copy">${icon('copy')}复制链接</button></section>
      <p class="feedback" role="status" aria-live="polite"></p>
      <footer><button data-action="recheck">${icon('refresh')}重新检查</button><button data-action="settings">${icon('settings')}设置</button><button data-action="backend">${icon('external')}后台</button></footer>
    </aside>
    <dialog aria-labelledby="settings-title"><form><header><strong id="settings-title">设置</strong><button type="button" data-action="cancel" aria-label="关闭设置">${icon('close')}</button></header><div class="fields"></div><p class="settings-error" role="alert"></p><footer><button type="button" data-action="reset">恢复默认</button><button type="button" data-action="cancel">取消</button><button class="primary" type="submit">保存并重新检查</button></footer></form></dialog>`
  const get = <T extends Element = HTMLElement>(selector: string) => root.querySelector<T>(selector)!
  const panel = get<HTMLElement>('.panel')
  const launcher = get<HTMLButtonElement>('.launcher')
  const dialog = get<HTMLDialogElement>('dialog')
  let sending = false
  let baseline = ''
  const feedback = (message: string, error = false) => {
    get('.feedback').textContent = message
    get('.feedback').classList.toggle('error', error)
  }
  function theme() {
    const mode = String(config.theme || 'auto')
    host.dataset.theme = mode === 'auto' ? (location.hostname === 'exhentai.org' ? 'dark' : 'light') : mode
    document.documentElement.dataset.lrrTheme = host.dataset.theme
  }
  function expanded(open: boolean) {
    const wasOpen = !panel.hidden
    panel.hidden = !open
    launcher.setAttribute('aria-expanded', String(open))
    config.panelCollapsed = !open
    persist('panelCollapsed', !open)
    if (!open && wasOpen) launcher.focus()
  }
  function render() {
    const items = [...galleries.values()]
    const count = items.filter(item => item.selected).length
    get('.summary').textContent = `已选 ${count} / ${items.length} 个画廊`
    get('#launcher-count').textContent = count ? String(count) : ''
    get('.scope').textContent = config.enableAltSearch ? '未入库：URL 与可提取标题均无匹配；未知与失败不计入。' : '未入库仅表示 URL 未命中；标题搜索已关闭。'
    get('.counts').replaceChildren(...Object.entries(labels).map(([status, label]) => {
      const span = document.createElement('span')
      span.textContent = `${label} ${items.filter(item => item.status === status).length}`
      return span
    }))
    get<HTMLButtonElement>('[data-action="send"]').disabled = sending || count === 0
    get<HTMLButtonElement>('[data-action="copy"]').disabled = count === 0
  }
  const groups: [string, [string, string, string][]][] = [
    ['连接', [['lrrServerUrl', 'LANraragi 地址', 'url'], ['lrrApiKey', 'API Key', 'password'], ['queueServerUrl', '队列服务器地址', 'url']]],
    ['检查行为', [['enableAltSearch', '备用标题搜索', 'checkbox'], ['lrrConcurrency', 'URL 检查并发数', 'number'], ['altSearchConcurrency', '标题搜索并发数', 'number']]],
    ['高级', [['requestTimeoutMs', 'URL 请求超时（毫秒）', 'number'], ['searchTimeoutMs', '标题搜索超时（毫秒）', 'number'], ['enableLogging', '控制台日志', 'checkbox']]],
  ]
  function fill(values: Config) {
    const fields = get('.fields')
    fields.replaceChildren()
    for (const [name, entries] of groups) {
      const group = document.createElement('fieldset')
      const legend = document.createElement('legend')
      legend.textContent = name
      group.append(legend)
      for (const [key, text, type] of entries) {
        const label = document.createElement('label')
        label.textContent = text
        const input = document.createElement('input')
        input.name = key
        input.type = type
        if (type === 'checkbox') input.checked = Boolean(values[key])
        else input.value = String(values[key])
        if (type === 'number') { input.required = true; input.min = key.endsWith('Ms') ? '1000' : '1'; input.step = '1' }
        if (type === 'url') { input.required = true; input.pattern = 'https?://.+' }
        input.autocomplete = 'off'
        label.append(input)
        group.append(label)
      }
      fields.append(group)
    }
    const label = document.createElement('label')
    label.textContent = '外观'
    const select = document.createElement('select')
    select.name = 'theme'
    for (const [value, text] of [['auto', '随站点'], ['light', '浅色'], ['dark', '深色']]) {
      const option = new Option(text, value)
      select.append(option)
    }
    select.value = String(values.theme || 'auto')
    label.append(select)
    fields.append(label)
  }
  const snapshot = () => JSON.stringify([...get<HTMLFormElement>('form').elements].filter((item): item is HTMLInputElement | HTMLSelectElement => item instanceof HTMLInputElement || item instanceof HTMLSelectElement).map(item => [item.name, item instanceof HTMLInputElement && item.type === 'checkbox' ? item.checked : item.value]))
  function cancelSettings() {
    if (snapshot() !== baseline && !confirm('放弃未保存的设置？')) return
    dialog.close()
  }
  launcher.addEventListener('click', () => expanded(Boolean(panel.hidden)))
  root.addEventListener('click', async event => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button')
    if (!button) return
    const choice = button.dataset.select
    if (choice) select(item => choice === 'all' || item.status === (choice as GalleryStatus))
    const action = button.dataset.action
    if (action === 'close') expanded(false)
    if (action === 'settings') { fill(config); baseline = snapshot(); get('.settings-error').textContent = ''; dialog.showModal() }
    if (action === 'cancel') cancelSettings()
    if (action === 'reset' && confirm('将表单恢复默认？保存后生效。')) fill(defaults)
    if (action === 'backend') window.open(String(config.queueServerUrl), '_blank', 'noopener')
    if (action === 'recheck') { options.recheck(); feedback('已重新检查当前页') }
    const selected = [...galleries.values()].filter(item => item.selected)
    if (action === 'copy') {
      try { options.copy(selected.map(item => item.url).join('\n')); feedback(`已复制 ${selected.length} 条链接`) }
      catch { feedback('复制失败，请重试', true) }
    }
    if (action === 'send' && !sending && selected.length) {
      sending = true
      render()
      feedback('正在发送…')
      try {
        const result = await options.send(selected.map(item => item.url))
        const sent = new Set(selected)
        select(item => !sent.has(item) && item.selected)
        feedback(`新增 ${result.added} 条，已存在 ${result.duplicates} 条`)
      } catch (error) { feedback(`发送失败：${error instanceof Error ? error.message : '请重试'}，选择已保留`, true) }
      finally { sending = false; render() }
    }
  })
  get<HTMLFormElement>('form').addEventListener('submit', event => {
    event.preventDefault()
    const form = get<HTMLFormElement>('form')
    if (!form.reportValidity()) return
    for (const [, entries] of groups) for (const [key, , type] of entries) {
      const input = form.elements.namedItem(key) as HTMLInputElement
      config[key] = type === 'checkbox' ? input.checked : type === 'number' ? Number(input.value) : input.value.trim().replace(type === 'url' ? /\/+$/ : /$^/, '')
      persist(key, config[key])
    }
    config.theme = (form.elements.namedItem('theme') as HTMLSelectElement).value
    persist('theme', config.theme)
    theme()
    dialog.close()
    options.recheck()
    feedback('设置已保存，正在重新检查；检查失败可点击重新检查重试')
  })
  dialog.addEventListener('cancel', event => { event.preventDefault(); cancelSettings() })
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !dialog.open && !panel.hidden) expanded(false)
  })
  document.addEventListener('lrr:state', render)
  collect()
  theme()
  expanded(!config.panelCollapsed)
  notify()
}
