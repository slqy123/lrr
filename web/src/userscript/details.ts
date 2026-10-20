export interface PreviewPage {
  url: string
  page: number
  image?: string
  sprite?: { image: string; width: number; height: number; position: string; size: string }
}
export interface GallerySummary {
  filesize?: string
  pages?: number
  author: string
  parody: string
  tags: { title: string; url: string }[]
  description: string
  previews: PreviewPage[]
}

export function readDetails(html: string, base: string): GallerySummary {
  const template = document.createElement('template')
  template.innerHTML = html
  const doc = template.content
  if (!doc.querySelector('#gdd') || !doc.querySelector('#gdt')) throw new Error('无法解析作品详情，请打开原站确认是否需要登录')
  const webURL = (value: string | null) => {
    if (!value) return
    const url = new URL(value, base)
    return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined
  }
  const fields = new Map([...doc.querySelectorAll('#gdd tr')].map(row => [row.children[0]?.textContent?.trim(), row.children[1]?.textContent?.trim()]))
  const groups = new Map([...doc.querySelectorAll('#taglist tr')].map(row => [row.children[0]?.textContent?.trim().replace(/:$/, ''), [...row.querySelectorAll('a')].map(link => link.textContent?.trim()).filter(Boolean).join(' / ')]))
  const galleryId = new URL(base).pathname.match(/^\/g\/(\d+)\//)?.[1]
  const previews = [...doc.querySelectorAll<HTMLAnchorElement>('#gdt a[href]')].filter(link => {
    const url = webURL(link.getAttribute('href'))
    return url && new URL(url).origin === new URL(base).origin && new RegExp(`^/s/[^/]+/${galleryId}-\\d+$`).test(new URL(url).pathname)
  }).slice(0, 5).map(link => {
    const url = webURL(link.getAttribute('href'))!
    const page: PreviewPage = { url, page: Number(new URL(url).pathname.match(/-(\d+)$/)![1]) }
    const image = link.querySelector('img')
    if (image) page.image = webURL(image.getAttribute('data-src') || image.getAttribute('src'))
    const sprite = link.querySelector<HTMLElement>('[style]')
    const source = sprite?.style.backgroundImage.match(/^url\(["']?(.*?)["']?\)$/)?.[1]
    const spriteURL = webURL(source || null)
    if (sprite && spriteURL && /^\d+(?:\.\d+)?px$/.test(sprite.style.width) && /^\d+(?:\.\d+)?px$/.test(sprite.style.height)) {
      const width = parseFloat(sprite.style.width)
      const height = parseFloat(sprite.style.height)
      if (width > 0 && height > 0) page.sprite = { image: spriteURL, width, height, position: sprite.style.backgroundPosition, size: sprite.style.backgroundSize }
    }
    return page
  })
  const comment = doc.querySelector('[name=ulcomment]')?.closest('.c1')?.querySelector('.c6')
  comment?.querySelectorAll('br').forEach(br => br.replaceWith('\n'))
  const length = fields.get('Length:')?.match(/^(\d+)\s+pages?$/i)
  return {
    filesize: fields.get('File Size:') || undefined,
    pages: length ? Number(length[1]) : undefined,
    author: [groups.get('group'), groups.get('artist')].filter(Boolean).join(' / '),
    parody: groups.get('parody') || '',
    tags: [...doc.querySelectorAll<HTMLAnchorElement>('#taglist a[href]')].flatMap(link => {
      const url = webURL(link.getAttribute('href'))
      const title = link.textContent?.trim()
      return url && title ? [{ title, url }] : []
    }).slice(0, 6),
    description: comment?.textContent?.replace(/\s+/g, ' ').trim() || '',
    previews,
  }
}
