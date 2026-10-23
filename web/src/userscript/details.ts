export interface PreviewPage {
  url: string
  page: number
  image?: string
  sprite?: { image: string; width: number; height: number; position: string; size: string }
}
export type CommentContent = string | { tag: 'p' | 'br' | 'strong' | 'em' | 'u' | 's' | 'blockquote' | 'ul' | 'ol' | 'li' | 'pre' | 'code' | 'a'; href?: string; children: CommentContent[] }

export interface GallerySummary {
  title?: string
  facts: { label: string; value: string; url?: string }[]
  pages?: number
  tagGroups: { name: string; tags: { title: string; url: string }[] }[]
  description: string
  descriptionContent?: CommentContent[]
  previews: PreviewPage[]
}

export function readDetails(html: string, base: string): GallerySummary {
  const template = document.createElement('template')
  template.innerHTML = html
  const doc = template.content
  if (!doc.querySelector('#gdd') || !doc.querySelector('#gdt')) throw new Error('无法解析作品详情，请打开原站确认是否需要登录')
  const webURL = (value: string | null) => {
    if (!value) return
    try {
      const url = new URL(value, base)
      return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined
    } catch { return }
  }
  const fields = new Map([...doc.querySelectorAll('#gdd tr')].map(row => [row.children[0]?.textContent?.trim().replace(/:$/, ''), row.children[1]]))
  const labels: Record<string, string> = { Posted: '发布时间', Parent: '父画廊', Visible: '可见性', Language: '语言', 'File Size': '文件大小', Length: '页数', Favorited: '收藏' }
  const facts: GallerySummary['facts'] = []
  for (const [selector, label] of [['#gdc', '分类'], ['#gdn', '上传者']]) {
    const node = doc.querySelector(selector)
    const value = node?.textContent?.trim()
    if (value) facts.push({ label, value, url: webURL(node?.querySelector('a[href]')?.getAttribute('href') || null) })
  }
  for (const [name, node] of fields) {
    const value = node?.textContent?.replace(/\s+/g, ' ').trim()
    if (!name || !value) continue
    facts.push({ label: labels[name] || name, value, url: name === 'Parent' ? webURL(node?.querySelector('a[href]')?.getAttribute('href') || null) : undefined })
  }
  const rating = doc.querySelector('#rating_label')?.textContent?.trim()
  const ratingCount = doc.querySelector('#rating_count')?.textContent?.trim()
  if (rating || ratingCount) facts.push({ label: '评分', value: [rating?.replace(/^Average:\s*/i, '').replace(/^Not Yet Rated$/i, '尚无评分'), ratingCount ? `${ratingCount} 人评分` : ''].filter(Boolean).join(' · ') })
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
  const readComment = (node: Node): CommentContent[] => {
    if (node.nodeType === Node.TEXT_NODE) return [node.textContent || '']
    if (!(node instanceof Element) || ['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'TEMPLATE'].includes(node.tagName)) return []
    const children = [...node.childNodes].flatMap(readComment)
    const tag = node.tagName.toLowerCase()
    if (tag === 'a') {
      const href = webURL(node.getAttribute('href'))
      return href ? [{ tag: 'a', href, children }] : children
    }
    const aliases: Record<string, string> = { div: 'p', b: 'strong', i: 'em', strike: 's' }
    const normalized = aliases[tag] || tag
    if (['p', 'br', 'strong', 'em', 'u', 's', 'blockquote', 'ul', 'ol', 'li', 'pre', 'code'].includes(normalized)) {
      return [{ tag: normalized as Exclude<CommentContent, string>['tag'], children }]
    }
    return children
  }
  const descriptionContent = comment ? [...comment.childNodes].flatMap(readComment) : []
  const length = fields.get('Length')?.textContent?.trim().match(/^([\d,]+)\s+pages?$/i)
  return {
    title: doc.querySelector('#gn')?.textContent?.trim() || undefined,
    facts,
    pages: length ? Number(length[1].replaceAll(',', '')) : undefined,
    tagGroups: [...doc.querySelectorAll('#taglist tr')].flatMap(row => {
      const name = row.children[0]?.textContent?.trim().replace(/:$/, '') || 'other'
      const tags = [...row.querySelectorAll<HTMLAnchorElement>('a[href]')].flatMap(link => {
        const url = webURL(link.getAttribute('href'))
        const title = link.textContent?.trim()
        return url && title ? [{ title, url }] : []
      })
      return tags.length ? [{ name, tags }] : []
    }),
    description: comment?.textContent?.trim() || '',
    descriptionContent,
    previews,
  }
}
