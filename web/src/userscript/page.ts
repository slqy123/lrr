import type { Gallery } from './model'
import { readNavigation, type ResultNavigation } from './navigation'

export const categories = [
  [2, '同人志'], [4, '漫画'], [8, '画师 CG'], [16, '游戏 CG'], [512, '西方作品'],
  [256, '全年龄'], [32, '图像集'], [64, 'Cosplay'], [128, '成人照片'], [1, '其他'],
] as const

export interface GalleryPage {
  galleries: Gallery[]
  action: string
  fields: [string, string][]
  categoryMask: number
  navigation: ResultNavigation
  previous?: string
  next?: string
  summary: string
  resultStats?: { total: string; approximate: boolean; filtered?: string }
  summaryLinks: { title: string; url: string }[]
  links: { title: string; url: string }[]
}

const siteHosts = new Set(['exhentai.org', 'e-hentai.org', 'g.e-hentai.org'])
function sameSite(value: string, base: string) {
  const target = new URL(value)
  const source = new URL(base)
  return target.origin === source.origin || (siteHosts.has(target.hostname) && siteHosts.has(source.hostname))
}

function webURL(value: string | null, base: string): string | undefined {
  if (!value) return
  const url = new URL(value, base)
  if (url.protocol === 'https:' || url.protocol === 'http:') return url.href
}

export function readPage(doc: Document = document, base = location.href): GalleryPage | null {
  if (/^\/(?:g|s|mpv)\//.test(new URL(base).pathname)) return null
  const list = doc.querySelector('.itg')
  const form = doc.querySelector<HTMLFormElement>('#searchbox form')
  if (!list || !form || !form.querySelector('[name=f_search]')) return null
  const resourceBase = base
  const sourceAction = webURL(form.getAttribute('action'), base)
  if (['127.0.0.1', 'localhost', '[::1]'].includes(new URL(base).hostname) && sourceAction && siteHosts.has(new URL(sourceAction).hostname)) base = sourceAction
  const action = webURL(form.getAttribute('action') || new URL(base).pathname, base)
  if (!action || !sameSite(action, base)) throw new Error('无法识别原站搜索地址')
  const categoryMask = Number(form.querySelector<HTMLInputElement>('[name=f_cats]')?.value || 0)
  if (!Number.isInteger(categoryMask) || categoryMask < 0 || categoryMask > 1023) throw new Error('无法识别原站分类')
  const galleries = new Map<string, Gallery>()
  for (const link of list.querySelectorAll<HTMLAnchorElement>('a[href]')) {
    const titleNode = link.querySelector('.glink')
    if (!titleNode) continue
    const url = webURL(link.getAttribute('href'), base)
    if (!url || !sameSite(url, base)) throw new Error('无法识别图库链接')
    const match = new URL(url).pathname.match(/^\/g\/(\d+)\/([a-zA-Z0-9]+)\/?$/)
    if (!match) throw new Error('无法识别图库链接')
    const canonical = new URL(`/g/${match[1]}/${match[2]}/`, url).href
    if (galleries.has(canonical)) continue
    const card = link.closest('.gl1t, .gl1e, tr')
    const title = titleNode.textContent?.trim()
    if (!card || !title) throw new Error('无法解析图库标题')
    const image = card.querySelector<HTMLImageElement>('.gl3t img, .glthumb img, img[data-src], img')
    const source = image?.getAttribute('data-src') || image?.getAttribute('src') || ''
    const cover = source.startsWith('data:image/') ? source : webURL(source, resourceBase) || ''
    const pages = [...card.querySelectorAll('div, span, td')].map(node => node.textContent?.match(/^\s*(\d+)\s+pages\s*$/i)).find(Boolean)
    const posted = card.querySelector('[id^=posted_]')
    const favorite = posted?.getAttribute('onclick')?.match(/popUp\(\s*['"]([^'"]+)['"]/)?.[1]
    const links = [...card.querySelectorAll<HTMLAnchorElement>('a[href]')].flatMap(anchor => {
      const href = webURL(anchor.getAttribute('href'), base)
      if (!href || new URL(href).pathname.startsWith('/g/')) return []
      return [{ title: new URL(href).pathname.includes('gallerytorrents.php') ? '下载／种子' : anchor.textContent?.trim() || anchor.title || '原站入口', url: href }]
    })
    const favoriteURL = webURL(favorite || null, base)
    if (favoriteURL && sameSite(favoriteURL, base)) links.unshift({ title: '收藏', url: favoriteURL })
    const ratingNode = card.querySelector('.ir')
    const rating = ratingNode ? doc.defaultView?.getComputedStyle(ratingNode) : undefined
    galleries.set(canonical, {
      id: Number(match[1]), url: canonical, title,
      author: '',
      category: card.querySelector('.cs, .cn')?.textContent?.trim() || '未分类',
      pages: pages ? Number(pages[1]) : null, cover,
      language: /中国翻訳|中文|汉化|漢化|Chinese/i.test(title) ? '中文' : '',
      posted: posted?.textContent?.trim(), links,
      rating: rating?.backgroundImage && rating.backgroundImage !== 'none' ? { image: rating.backgroundImage, position: rating.backgroundPosition, opacity: rating.opacity } : undefined,
      status: 'checking', hits: [],
    })
  }
  if (!galleries.size && (list.querySelector('.glink, .gl1t, .gl1e') || list.querySelector('a[href*="/g/"]') || (list.textContent?.trim() && !/no (?:hits|results)|nothing found/i.test(list.textContent)))) throw new Error('无法解析原站列表')
  const summary = doc.querySelector('.searchtext')?.cloneNode(true) as HTMLElement | undefined
  summary?.querySelectorAll('a').forEach(link => link.remove())
  const summaryText = summary?.textContent?.replace(/\[\s*\]/g, '').replace(/\s+/g, ' ').trim() || `${galleries.size} 个画廊`
  const resultCounts = summaryText.match(/^Found\s+(about\s+)?([\d,]+\+?)\s+results?\.\s*(?:Filtered\s+([\d,]+)\s+galler(?:y|ies)\s+from this page\.)?$/i)
  return {
    galleries: [...galleries.values()], action, categoryMask,
    fields: [...new FormData(form)].filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
    navigation: readNavigation(doc, base),
    previous: webURL(doc.querySelector('#uprev, #dprev')?.getAttribute('href') || null, base),
    next: webURL(doc.querySelector('#unext, #dnext')?.getAttribute('href') || null, base),
    summary: resultCounts ? `${resultCounts[1] ? '约 ' : ''}${resultCounts[2]} 个结果${resultCounts[3] ? ` · 本页已过滤 ${resultCounts[3]} 项` : ''}` : summaryText,
    resultStats: resultCounts ? { total: resultCounts[2], approximate: !!resultCounts[1], filtered: resultCounts[3] } : undefined,
    summaryLinks: [...doc.querySelectorAll<HTMLAnchorElement>('.searchtext a[href]')].flatMap(link => {
      const url = webURL(link.getAttribute('href'), base)
      const title = link.textContent?.trim() || '原站筛选操作'
      return url ? [{ title: /^Disable Filters$/i.test(title) ? '关闭原站过滤' : title, url }] : []
    }),
    links: [...doc.querySelectorAll<HTMLAnchorElement>('#nb a[href]')].flatMap(link => {
      const url = webURL(link.getAttribute('href'), base)
      return url ? [{ title: link.textContent?.trim() || url, url }] : []
    }),
  }
}

