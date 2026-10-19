export type QueueStatus = 'queued' | 'downloading' | 'retrying' | 'queue-failed' | 'queue-unknown'
export type GalleryStatus = 'checking' | 'downloaded' | 'duplicate' | 'missing' | 'error' | QueueStatus
export interface Gallery {
  url: string
  title: HTMLElement
  card: HTMLElement
  controls: HTMLElement
  selected: boolean
  status: GalleryStatus
  libraryStatus?: GalleryStatus
  queueStatus?: QueueStatus
  queueDetail?: string
}
export const queueStatuses = new Set<GalleryStatus>(['queued', 'downloading', 'retrying', 'queue-failed'])
export const galleries = new Map<string, Gallery>()
export const labels: Record<GalleryStatus, string> = {
  checking: '检查中', downloaded: '已入库', duplicate: '疑似重复', missing: '未收录', error: '检查失败',
  queued: '待下载', downloading: '下载中', retrying: '等待重试', 'queue-failed': '下载失败', 'queue-unknown': '队列查询失败',
}
const symbols: Record<GalleryStatus, string> = {
  checking: '…', downloaded: '', duplicate: '≃', missing: '', error: '!',
  queued: '◷', downloading: '◷', retrying: '◷', 'queue-failed': '◷', 'queue-unknown': '!',
}
export function setStatusContent(element: HTMLElement, status: GalleryStatus) {
  const text = status === 'error' || status === 'queue-unknown' ? '查询异常'
    : queueStatuses.has(status) ? '在队列中' : labels[status]
  element.replaceChildren()
  if (status === 'downloaded' || status === 'missing') {
    const path = status === 'downloaded' ? 'M3 3h5v17H3zm5 0h5v17H8zm6 2 4-1 4 15-4 1zM2 21h21'
      : 'M12 5C9 3 5 3 2 4v15c3-1 7-1 10 1 3-2 7-2 10-1V4c-3-1-7-1-10 1zm0 0v15'
    element.innerHTML = `<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="${path}"/></svg>`
  } else {
    const icon = document.createElement('span')
    icon.setAttribute('aria-hidden', 'true')
    icon.textContent = symbols[status]
    element.append(icon)
  }
  element.append(document.createTextNode(text))
}
export function galleryControls(title: HTMLElement) {
  return title.closest('.gl1t')?.querySelector<HTMLElement>('.lrr-gallery-tools')
}
export function notify() { document.dispatchEvent(new Event('lrr:state')) }
export function showStatusDetail(heading: string, detail: string) {
  let dialog = document.querySelector<HTMLDialogElement>('.lrr-state-dialog')
  if (!dialog) {
    dialog = document.createElement('dialog')
    dialog.className = 'lrr-state-dialog'
    dialog.innerHTML = '<header><strong></strong><button type="button" aria-label="关闭状态详情">✕</button></header><p></p>'
    dialog.querySelector('button')!.addEventListener('click', () => dialog!.close())
    document.body.append(dialog)
  }
  dialog.querySelector('strong')!.textContent = heading
  dialog.querySelector('p')!.textContent = detail
  dialog.showModal()
}
export function setStatus(title: HTMLElement, status: GalleryStatus) {
  const gallery = [...galleries.values()].find(item => item.title === title)
  if (!gallery) return
  gallery.libraryStatus = status
  if (status !== 'downloaded' && status !== 'checking') status = gallery.queueStatus ?? status
  gallery.status = status
  title.dataset.lrrStatus = status
  gallery.controls.dataset.lrrState = status
  let badge = gallery.controls.querySelector<HTMLElement>('.lrr-check-state')
  if (!badge) {
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'lrr-check-state'
    button.addEventListener('click', () => showStatusDetail(labels[gallery.status], button.title))
    badge = button
    gallery.controls.append(badge)
  }
  setStatusContent(badge, status)
  badge.title = labels[status] + (gallery.queueStatus === status && gallery.queueDetail ? '\n' + gallery.queueDetail : '')
  badge.setAttribute('aria-label', badge.title)
  notify()
}
export function setQueueStatus(url: string, status?: QueueStatus, detail?: string) {
  const gallery = galleries.get(url)
  if (!gallery) return
  gallery.queueStatus = status
  gallery.queueDetail = detail
  setStatus(gallery.title, gallery.libraryStatus ?? 'checking')
}
export function collect() {
  document.querySelectorAll<HTMLAnchorElement>('.itg .gl1t a[href*="/g/"]').forEach(link => {
    const title = link.querySelector<HTMLElement>('.glink')
    if (!title || galleries.has(link.href)) return
    const card = title.closest<HTMLElement>('.gl1t')!
    const controls = document.createElement('div')
    controls.className = 'lrr-gallery-tools'
    controls.setAttribute('role', 'group')
    controls.setAttribute('aria-label', '画廊选择与状态')
    card.prepend(controls)
    title.title = title.textContent?.trim() ?? ''
    const gallery: Gallery = { url: link.href, title, card, controls, selected: false, status: 'checking' }
    galleries.set(link.href, gallery)
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.className = 'lrr-item-checkbox'
    checkbox.setAttribute('aria-label', '选择 ' + title.title)
    checkbox.addEventListener('click', event => event.stopPropagation())
    checkbox.addEventListener('change', () => {
      gallery.selected = checkbox.checked
      card.classList.toggle('lrr-selected', checkbox.checked)
      notify()
    })
    const selectionTarget = document.createElement('label')
    selectionTarget.className = 'lrr-checkbox-target'
    selectionTarget.append(checkbox)
    controls.append(selectionTarget)
    setStatus(title, 'checking')
  })
}
export function select(predicate: (gallery: Gallery) => boolean) {
  for (const gallery of galleries.values()) {
    gallery.selected = predicate(gallery)
    const checkbox = gallery.controls.querySelector<HTMLInputElement>('.lrr-item-checkbox')
    if (checkbox) checkbox.checked = gallery.selected
    gallery.card.classList.toggle('lrr-selected', gallery.selected)
  }
  notify()
}
