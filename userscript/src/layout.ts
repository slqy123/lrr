import { galleries, queueStatuses, select, type Gallery } from './state'
import styles from './layout.css?inline'

const categoryColors: Record<string, string> = {
  ct0: 'rgb(0, 0, 0)', ct1: 'rgb(128, 132, 141)', ct2: 'rgb(164, 76, 74)', ct3: 'rgb(184, 119, 75)',
  ct4: 'rgb(185, 147, 70)', ct5: 'rgb(117, 148, 119)', ct6: 'rgb(90, 125, 171)',
  ct7: 'rgb(137, 105, 167)', ct8: 'rgb(166, 104, 146)', ct9: 'rgb(99, 151, 178)', cta: 'rgb(157, 150, 103)',
}
const selectionGroups = [
  { id: 'missing', label: '未收录', icon: '<path d="M4 19V5a2 2 0 0 1 2-2h14v18H6a2 2 0 0 1 0-4h14"/>' },
  { id: 'duplicate', label: '疑似重复', icon: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M16 8V3H4v13h4"/>' },
  { id: 'queue', label: '队列中', icon: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>' },
  { id: 'downloaded', label: '已入库', icon: '<path d="M4 3v18M9 3v18M14 3v18M18 3l3 18M2 21h20"/>' },
]
const matchesGroup = (item: Gallery, choice: string) => choice === 'all' || (choice === 'queue' ? queueStatuses.has(item.status) : item.status === choice)

type Config = Record<string, string | number | boolean>

export function mountLayout(config: Config, persist: (key: string, value: unknown) => void) {
  const grid = document.querySelector<HTMLElement>('.itg.gld')
  if (!grid) return null
  const switchView = (enabled: boolean) => { persist('redesigned', enabled); location.reload() }
  if (config.redesigned === false) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'lrr-redesigned-view'
    button.textContent = '美化界面'
    button.onclick = () => switchView(true)
    const toolbar = document.querySelector('.searchnav')
    if (toolbar) toolbar.append(button)
    else grid.before(button)
    return null
  }
  const form = document.querySelector<HTMLFormElement>('#searchbox form')
  const nav = document.querySelector('#nb')
  const pagers = [...document.querySelectorAll<HTMLElement>('.searchnav')]
  const resultText = document.querySelector('.searchtext')
  const input = document.querySelector<HTMLInputElement>('#f_search')
  const view = document.querySelector<HTMLSelectElement>('.searchnav select')
  if (!form || !input) return null
  for (const category of document.querySelectorAll<HTMLElement>('.cs')) {
    const nativeStyle = getComputedStyle(category)
    const categoryClass = [...category.classList].find(name => name in categoryColors)
    const color = categoryClass ? categoryColors[categoryClass]
      : nativeStyle.backgroundImage === 'none' ? nativeStyle.backgroundColor : nativeStyle.borderTopColor
    category.style.setProperty('--lrr-category-color', color)
    const [red, green, blue] = color.match(/[\d.]+/g)!.slice(0, 3).map(value => {
      const channel = Number(value) / 255
      return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4
    })
    const luminance = .2126 * red + .7152 * green + .0722 * blue
    const blackContrast = (luminance + .05) / .05
    const whiteContrast = 1.05 / (luminance + .05)
    category.style.setProperty('--lrr-category-ink', blackContrast >= whiteContrast ? '#000' : '#fff')
  }
  GM_addStyle(styles)
  for (const child of document.body.children) {
    if (!['SCRIPT', 'STYLE', 'LINK'].includes(child.tagName)) child.classList.add('lrr-native-shell')
  }
  document.documentElement.classList.add('lrr-redesigned')
  const page = document.createElement('div')
  page.className = 'lrr-page'
  page.innerHTML = `<header class="lrr-topbar"><div class="lrr-shell"><a class="lrr-brand" href="/">▥ Gallery</a><nav class="lrr-navigation" aria-label="站点导航"></nav><div class="lrr-top-actions"><button data-tool="backend" class="lrr-backend">▣ 队列后台 ↗</button><button data-tool="recheck">↻ 重新检查</button><button data-tool="settings">设置</button><details class="lrr-more-nav"><summary>更多</summary><div><button data-tool="recheck">重新检查</button></div></details></div></div></header>
    <main class="lrr-shell"><section class="lrr-search" aria-label="搜索与筛选"></section>
    <section class="lrr-result-section" aria-label="作品结果"><div class="lrr-results"><div class="lrr-statistics" aria-live="polite"></div><div class="lrr-result-actions"><div class="lrr-density" role="group" aria-label="网格密度"><button data-density="compact">紧凑</button><button data-density="standard">标准</button></div><button class="lrr-native-view">原站界面</button></div></div><div class="lrr-list-toolbar"><div class="lrr-bulk" role="group" aria-label="批量选择"><details class="lrr-selection-groups"><summary>按状态选择</summary><div>${selectionGroups.map(group => `<button data-choice="${group.id}"><svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${group.icon}</svg><span>${group.label}</span><span class="lrr-choice-count">0</span><span class="lrr-choice-state" aria-hidden="true"></span></button>`).join('')}</div></details><button data-choice="all"><span class="lrr-all-state" aria-hidden="true"></span>全选</button></div><div class="lrr-top-pagination"></div></div><div class="lrr-grid-slot"></div><div class="lrr-bottom-pagination"></div></section>
    <footer class="lrr-page-footer"><span class="lrr-native-results"></span><button data-tool="backend">打开队列面板 ↗</button></footer></main>
    <aside class="lrr-selection-bar" aria-label="批量操作" hidden><span>已选择 <strong>0</strong> 部</span><div><button data-tool="copy">复制链接</button><button data-tool="send" class="lrr-primary">发送队列 →</button></div></aside><p class="lrr-feedback" role="status" hidden></p>`
  document.body.append(page)
  const get = <T extends Element = HTMLElement>(selector: string) => page.querySelector<T>(selector)!
  if (nav) {
    const links = [...nav.querySelectorAll('a')]
    get('.lrr-navigation').append(...links)
    get('.lrr-more-nav > div').append(...links.map(link => link.cloneNode(true)))
  }
  const nativeButton = get<HTMLButtonElement>('.lrr-native-view')
  nativeButton.onclick = () => switchView(false)
  if (view) {
    view.classList.add('lrr-view-select')
    const mobile = matchMedia('(max-width: 620px)')
    const placeView = () => get(mobile.matches ? '.lrr-more-nav > div' : '.lrr-result-actions').append(view)
    mobile.addEventListener('change', placeView)
    placeView()
  }
  if (resultText) {
    resultText.classList.remove('lrr-native-shell')
    get('.lrr-native-results').append(resultText)
  }
  for (const [index, pager] of pagers.entries()) {
    pager.classList.remove('lrr-native-shell')
    pager.setAttribute('aria-label', index === 0 ? '顶部分页' : '底部分页')
    const translatePager = () => {
      const labels: Record<string, string> = {
        '<< First': '« 首页', '< Prev': '‹ 上一页', 'Jump/Seek': '跳转 ⌄', 'Next >': '下一页 ›', 'Last >>': '末页 »',
        '< Jump': '‹ 向前跳转', 'Jump >': '向后跳转 ›', '< Seek': '‹ 向前定位', 'Seek >': '向后定位 ›',
        'Use Date Selector': '按日期选择', Close: '收起', Cancel: '取消',
      }
      for (const control of pager.querySelectorAll<HTMLElement>('a, span, button')) {
        const label = labels[control.textContent?.trim() || '']
        if (label) control.textContent = label
        if (control.id) control.dataset.pageAction = control.id.slice(1)
        if (control.tagName === 'SPAN') control.setAttribute('aria-disabled', 'true')
      }
    }
    translatePager()
    new MutationObserver(translatePager).observe(pager, { childList: true, subtree: true })
    get(index === 0 ? '.lrr-top-pagination' : '.lrr-bottom-pagination').append(pager)
  }
  grid.classList.remove('lrr-native-shell')
  get('.lrr-grid-slot').append(grid)
  if (form && input) {
    const categoryTable = form.querySelector('.itc')
    const advanced = form.querySelector<HTMLElement>('#advdiv')
    const submit = form.querySelector<HTMLInputElement>('input[type=submit]')
    const clear = form.querySelector<HTMLInputElement>('input[type=button]')
    const fileSearch = document.querySelector<HTMLElement>('#fsdiv')
    const rangeBar = document.querySelector<HTMLElement>('#rangebar')
    const advancedToggle = form.querySelector<HTMLAnchorElement>('a[onclick*="toggle_advsearch_pane"]')
    const tools = [...form.querySelectorAll<HTMLAnchorElement>('a[onclick]')].filter(link => link !== advancedToggle)
    let categories: HTMLDivElement | undefined
    for (const child of form.children) if (!child.matches('input[type=hidden]')) child.classList.add('lrr-native-form-part')
    form.classList.add('lrr-search-form')
    const row = document.createElement('div')
    row.className = 'lrr-search-row'
    const searchBox = document.createElement('div')
    searchBox.className = 'lrr-search-box'
    input.classList.remove('lrr-native-form-part')
    input.placeholder = '搜索标题、作者或标签…'
    input.setAttribute('aria-label', '搜索作品')
    searchBox.append(input)
    row.append(searchBox)
    if (submit) { submit.classList.remove('lrr-native-form-part'); submit.value = '搜索'; row.append(submit) }
    if (clear) { clear.classList.remove('lrr-native-form-part'); clear.value = '清空'; row.append(clear) }
    const filters = document.createElement('div')
    filters.className = 'lrr-filter-bar'
    if (categoryTable) {
      categoryTable.classList.remove('lrr-native-form-part')
      categories = document.createElement('div')
      categories.className = 'lrr-categories'
      categories.append(categoryTable)
    }
    const options = document.createElement('details')
    const optionsSummary = document.createElement('summary')
    const optionsContent = document.createElement('div')
    optionsSummary.textContent = '筛选与工具'
    optionsContent.className = 'lrr-extra-options'
    if (advanced) {
      advanced.classList.remove('lrr-native-form-part')
      advanced.style.display = ''
      optionsContent.append(advanced)
    }
    optionsContent.append(...tools)
    if (fileSearch) fileSearch.classList.remove('lrr-native-shell')
    if (rangeBar) { rangeBar.classList.remove('lrr-native-shell'); optionsContent.append(rangeBar) }
    options.append(optionsSummary, optionsContent)
    options.className = 'lrr-search-options'
    options.addEventListener('toggle', () => {
      if (options.open && advanced && !advanced.querySelector('input')) { advancedToggle?.click(); form.dispatchEvent(new Event('change')) }
    })
    row.append(options)
    const chips = document.createElement('div')
    chips.className = 'lrr-filter-chips'
    filters.append(chips)
    form.append(row, filters)
    if (categories) get('.lrr-search').append(categories)
    get('.lrr-search').append(form)
    const renderFilters = () => {
      chips.replaceChildren()
      const add = (text: string, remove: () => void) => {
        const chip = document.createElement('button')
        chip.type = 'button'
        chip.className = 'lrr-filter-chip'
        chip.textContent = text + ' ×'
        chip.setAttribute('aria-label', '移除条件 ' + text)
        chip.onclick = () => { remove(); renderFilters() }
        chips.append(chip)
      }
      for (const field of form.elements) {
        if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement)) continue
        if (field instanceof HTMLInputElement && field.type === 'checkbox' && field.checked) {
          add(field.labels?.[0]?.textContent?.trim() || field.name, () => { field.checked = false; field.dispatchEvent(new Event('change', { bubbles: true })) })
        } else if (['f_srdd', 'f_spf', 'f_spt'].includes(field.name) && field.value && field.value !== '0') {
          const prefix = field.name === 'f_srdd' ? '评分 ≥ ' : field.name === 'f_spf' ? '至少页数 ' : '最多页数 '
          add(prefix + field.value, () => { field.value = field instanceof HTMLSelectElement ? '0' : ''; field.dispatchEvent(new Event('change', { bubbles: true })) })
        }
      }
    }
    form.addEventListener('change', renderFilters)
    document.addEventListener('lrr:filters', renderFilters)
    renderFilters()
  }
  let toolsRoot: ShadowRoot | undefined
  let sending = false
  function density(value: string) {
    page.dataset.density = value
    page.querySelectorAll<HTMLButtonElement>('[data-density]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.density === value)))
    config.density = value
    persist('density', value)
  }
  function choiceState(choice: string) {
    const matching = [...galleries.values()].filter(item => matchesGroup(item, choice))
    const selected = matching.filter(item => item.selected).length
    return { count: matching.length, pressed: selected === 0 ? 'false' : selected === matching.length ? 'true' : 'mixed' }
  }
  const groupMenu = get<HTMLDetailsElement>('.lrr-selection-groups')
  const narrowToolbar = matchMedia('(max-width: 1100px)')
  const placeGroups = () => { groupMenu.open = !narrowToolbar.matches }
  narrowToolbar.addEventListener('change', placeGroups)
  placeGroups()
  groupMenu.addEventListener('keydown', event => {
    if (event.key === 'Escape' && narrowToolbar.matches) {
      groupMenu.open = false
      groupMenu.querySelector('summary')!.focus()
    }
  })
  document.addEventListener('click', event => {
    if (narrowToolbar.matches && !groupMenu.contains(event.target as Node)) groupMenu.open = false
  })
  density(String(config.density || 'standard'))
  page.addEventListener('click', event => {
    const target = (event.target as Element).closest<HTMLElement>('[data-tool], [data-density], [data-choice]')
    if (!target) return
    if (target.dataset.tool) toolsRoot?.querySelector<HTMLButtonElement>(`[data-action="${target.dataset.tool}"]`)?.click()
    if (target.dataset.density) density(target.dataset.density)
    if (target.dataset.choice) {
      const choice = target.dataset.choice
      const active = choiceState(choice).pressed === 'true'
      select(item => matchesGroup(item, choice) ? !active : item.selected)
    }
    const details = target.closest('details')
    if (details !== groupMenu) details?.removeAttribute('open')
  })
  document.addEventListener('lrr:sending', event => { sending = (event as CustomEvent<boolean>).detail; render() })
  let feedbackTimer: ReturnType<typeof setTimeout>
  document.addEventListener('lrr:feedback', event => {
    const detail = (event as CustomEvent<{ message: string; error: boolean; sending: boolean }>).detail
    sending = detail.sending
    const feedback = get('.lrr-feedback')
    feedback.textContent = detail.message
    feedback.classList.toggle('error', detail.error)
    feedback.hidden = false
    clearTimeout(feedbackTimer)
    feedbackTimer = setTimeout(() => { feedback.hidden = true }, 6000)
    render()
  })
  function decorate(gallery: Gallery) {
    const { card, title, controls } = gallery
    if (card.dataset.lrrCard) return
    card.dataset.lrrCard = 'true'
    const cover = card.querySelector('.gl3t')
    const titleLink = title.closest('a')!
    const nativeMeta = card.querySelector<HTMLElement>('.gl5t')
    const category = nativeMeta?.querySelector('.cs')
    const pageText = [...nativeMeta?.querySelectorAll('div') || []].find(node => /^\d+ pages$/.test(node.textContent?.trim() || ''))
    if (cover) card.prepend(cover)
    if (cover) cover.after(controls)
    else card.prepend(controls)
    controls.after(titleLink)
    const meta = document.createElement('div')
    meta.className = 'lrr-card-meta'
    if (category) { category.classList.add('lrr-category'); meta.append(category) }
    if (pageText) {
      const pages = document.createElement('span')
      pages.textContent = (pageText.textContent || '').replace('pages', '页')
      meta.append(pages)
    }
    if (nativeMeta) {
      const details = document.createElement('details')
      details.className = 'lrr-card-details'
      const summary = document.createElement('summary')
      summary.textContent = '···'
      summary.setAttribute('aria-label', '发布时间、收藏与下载入口')
      details.append(summary, nativeMeta)
      meta.append(details)
    }
    titleLink.after(meta)
  }
  function render() {
    const items = [...galleries.values()]
    items.forEach(decorate)
    page.querySelectorAll<HTMLButtonElement>('.lrr-bulk [data-choice]').forEach(button => {
      const { count, pressed } = choiceState(button.dataset.choice!)
      button.setAttribute('aria-pressed', pressed)
      button.disabled = count === 0
      const countLabel = button.querySelector('.lrr-choice-count')
      if (countLabel) countLabel.textContent = String(count)
      const indicator = button.querySelector('.lrr-choice-state, .lrr-all-state')!
      indicator.textContent = pressed === 'true' ? '✓' : pressed === 'mixed' ? '−' : ''
    })
    const count = items.filter(item => item.selected).length
    const queued = items.filter(item => matchesGroup(item, 'queue')).length
    const downloaded = items.filter(item => item.status === 'downloaded').length
    const checking = items.filter(item => item.status === 'checking').length
    const errors = items.filter(item => item.status === 'error' || item.status === 'queue-unknown').length
    get('.lrr-statistics').textContent = `${items.length} 部作品 · 已入库 ${downloaded} · 队列中 ${queued}${checking ? ` · 查询中 ${checking}` : ''}${errors ? ` · 查询异常 ${errors}` : ''}`
    get<HTMLElement>('.lrr-selection-bar').hidden = count === 0
    get('.lrr-selection-bar strong').textContent = String(count)
    get<HTMLButtonElement>('[data-tool=send]').disabled = sending || count === 0
    get<HTMLButtonElement>('[data-tool=send]').textContent = sending ? '正在发送…' : '发送队列 →'
  }
  document.addEventListener('lrr:state', render)
  return { connect(root: ShadowRoot) { toolsRoot = root; render() } }
}
