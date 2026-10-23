import type { GallerySummary } from './details'

export function archiveTags(value = '') {
  const result = new Map<string, string[]>()
  for (const tag of value.split(/[;,]/)) {
    const separator = tag.indexOf(':')
    if (separator < 0) continue
    const name = tag.slice(0, separator).trim().toLowerCase()
    const text = tag.slice(separator + 1).trim()
    if (text) result.set(name, [...(result.get(name) || []), text])
  }
  return result
}

export function ehGallery(value: string) {
  try {
    const text = value.trim()
    const url = new URL(text.startsWith('//') ? `https:${text}` : /^(?:e-hentai\.org|exhentai\.org|g\.e-hentai\.org)\//i.test(text) ? `https://${text}` : text)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port || !['e-hentai.org', 'exhentai.org', 'g.e-hentai.org'].includes(url.hostname)) return
    const match = url.pathname.match(/^\/g\/(\d+)\/([a-zA-Z0-9]+)\/?$/)
    if (!match) return
    return { id: match[1], path: `/g/${match[1]}/${match[2]}/`, url: `https://${url.hostname}/g/${match[1]}/${match[2]}/` }
  } catch {}
}

export function archiveSource(values: string[] = [], currentURL: string) {
  const galleries = values.flatMap(value => {
    const gallery = ehGallery(value)
    return gallery ? [gallery] : []
  })
  const current = ehGallery(currentURL)
  const gallery = galleries.find(value => value.id === current?.id) || galleries[0]
  if (gallery) return { url: gallery.url, gallery }
  for (const value of values) {
    try {
      const url = new URL(value)
      if (['http:', 'https:'].includes(url.protocol) && !url.username && !url.password) return { url: url.href }
    } catch {}
  }
}

export function summaryLanguageValues(summary?: GallerySummary) {
  const values = summaryTags(summary, 'language')
  const fact = summary?.facts.find(fact => fact.label === '语言')?.value
  return values.length ? values : fact ? [fact] : []
}

export function summaryTags(summary: GallerySummary | undefined, name: string) {
  return summary?.tagGroups.find(group => group.name === name)?.tags.map(tag => tag.title) || []
}

const languageNames: Record<string, string> = {
  chinese: '中文', japanese: '日文', english: '英文', korean: '韩文', french: '法文', spanish: '西班牙文', german: '德文', russian: '俄文', portuguese: '葡萄牙文', italian: '意大利文', thai: '泰文', vietnamese: '越南文',
}

export function languages(values: string[]) {
  return [...new Set(values.flatMap(value => value.toLowerCase().replace(/\(\s*(translated|rewrite)\s*\)/g, ',$1').replace(/\s*\([^)]*\)/g, '').split(/[、,]/).map(part => part.trim()).filter(value => value && !['unknown', '未知', '未记录'].includes(value)).map(value => {
    const aliases: Record<string, string> = { '中文': 'chinese', '汉语': 'chinese', '汉化': 'chinese', '日语': 'japanese', '日文': 'japanese', '英语': 'english', '英文': 'english', '翻译': 'translated' }
    return aliases[value] || value
  })))].sort()
}

export function languageLabel(code: string) { return languageNames[code] || ({ translated: '已翻译', rewrite: '改写', textless: '无文字', speechless: '无对白' }[code] ?? code) }

export function fileBytes(value?: string) {
  const match = value?.replaceAll(',', '').trim().match(/^(\d+(?:\.\d+)?)\s*(B|Ki?B|Mi?B|Gi?B|Ti?B)$/i)
  if (!match) return
  const power = ['b', 'kb', 'mb', 'gb', 'tb'].indexOf(match[2].toLowerCase().replace('i', ''))
  const bytes = Number(match[1]) * 1024 ** power
  return Number.isFinite(bytes) && bytes > 0 ? bytes : undefined
}

export function formatBytes(value: number) {
  const units = ['B', 'KiB', 'MiB', 'GiB', 'TiB']
  const power = Math.min(units.length - 1, Math.max(0, Math.floor(Math.log(value) / Math.log(1024))))
  return `${(value / 1024 ** power).toFixed(power ? 1 : 0)} ${units[power]}`
}

export function sourceRelation(currentURL: string, sourceURL: string, current?: GallerySummary, source?: GallerySummary) {
  const currentId = ehGallery(currentURL)?.id
  const sourceId = ehGallery(sourceURL)?.id
  if (!currentId || !sourceId) return 'unknown'
  if (currentId === sourceId) return 'same'
  const parentId = (summary?: GallerySummary) => ehGallery(summary?.facts.find(fact => fact.label === '父画廊')?.url || '')?.id
  if (parentId(current) === sourceId) return 'parent'
  if (parentId(source) === currentId) return 'child'
  return 'different'
}
