export type GalleryStatus = 'checking' | 'downloaded' | 'duplicate' | 'missing' | 'error'
export interface Gallery {
  url: string
  title: HTMLElement
  selected: boolean
  status: GalleryStatus
}
export const galleries = new Map<string, Gallery>()
export const labels: Record<GalleryStatus, string> = {
  checking: '检查中', downloaded: '已入库', duplicate: '疑似重复', missing: '未入库', error: '检查失败',
}
export function notify() { document.dispatchEvent(new Event('lrr:state')) }
export function setStatus(title: HTMLElement, status: GalleryStatus) {
  const gallery = [...galleries.values()].find(item => item.title === title)
  if (!gallery) return
  gallery.status = status
  title.dataset.lrrStatus = status
  let badge = title.querySelector<HTMLElement>('.lrr-check-state')
  if (!badge) {
    badge = document.createElement('span')
    badge.className = 'lrr-check-state'
    title.append(badge)
  }
  badge.textContent = labels[status]
  notify()
}
export function collect() {
  document.querySelectorAll<HTMLAnchorElement>('.itg .gl1t a[href*="/g/"]').forEach(link => {
    const title = link.querySelector<HTMLElement>('.glink')
    if (!title || galleries.has(link.href)) return
    const gallery: Gallery = { url: link.href, title, selected: false, status: 'checking' }
    galleries.set(link.href, gallery)
    const checkbox = document.createElement('input')
    checkbox.type = 'checkbox'
    checkbox.className = 'lrr-item-checkbox'
    checkbox.setAttribute('aria-label', '选择画廊')
    checkbox.addEventListener('click', event => event.stopPropagation())
    checkbox.addEventListener('change', () => {
      gallery.selected = checkbox.checked
      title.classList.toggle('lrr-title-selected', checkbox.checked)
      notify()
    })
    title.prepend(checkbox)
    setStatus(title, 'checking')
  })
}
export function select(predicate: (gallery: Gallery) => boolean) {
  for (const gallery of galleries.values()) {
    gallery.selected = predicate(gallery)
    const checkbox = gallery.title.querySelector<HTMLInputElement>('.lrr-item-checkbox')
    if (checkbox) checkbox.checked = gallery.selected
    gallery.title.classList.toggle('lrr-title-selected', gallery.selected)
  }
  notify()
}
