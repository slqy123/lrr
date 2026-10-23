export type TorrentMetadataKind = 'posted' | 'size' | 'seeds' | 'peers' | 'downloads' | 'uploader'

export interface Torrent {
  title: string
  url: string
  magnet?: string
  outdated: boolean
  metadata: { kind: TorrentMetadataKind; value: string }[]
}

export function readTorrents(html: string, base: string): Torrent[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const container = doc.querySelector('#torrentinfo')
  if (!container) throw new Error('无法识别种子页面，可能需要登录或通过原站验证')
  const torrents: Torrent[] = []
  let outdated = false
  for (const node of container.querySelectorAll('p, form')) {
    if (node.matches('p')) {
      if (/^Outdated Torrents:$/i.test(node.textContent?.trim() || '')) outdated = true
      continue
    }
    const form = node
    const links = [...form.querySelectorAll<HTMLAnchorElement>('a[href]')]
    const download = links.find(link => {
      const url = new URL(link.getAttribute('href')!, base)
      return ['http:', 'https:'].includes(url.protocol) && url.pathname.endsWith('.torrent')
    })
    if (!download) {
      if (form.querySelector('[name=gtid]')) throw new Error('种子条目格式异常')
      continue
    }
    const magnet = links.map(link => link.getAttribute('href')!).find(href => href.startsWith('magnet:?'))
    const metadata = [...form.querySelectorAll('td')].flatMap(cell => {
      const label = cell.querySelector('span')?.textContent?.trim()
      if (!label || !/^(Posted|Size|Seeds|Peers|Downloads|Uploader):$/.test(label)) return []
      const value = cell.textContent?.trim().slice(label.length).trim()
      const kinds: Record<string, TorrentMetadataKind> = { 'Posted:': 'posted', 'Size:': 'size', 'Seeds:': 'seeds', 'Peers:': 'peers', 'Downloads:': 'downloads', 'Uploader:': 'uploader' }
      return value ? [{ kind: kinds[label], value }] : []
    })
    torrents.push({ outdated, title: download.textContent?.trim() || '种子文件', url: new URL(download.getAttribute('href')!, base).href, magnet, metadata })
  }
  if (!torrents.length && !/There are no torrents for this gallery\./i.test(container.textContent || '')) throw new Error('无法判断种子列表是否为空，请打开原站确认')
  return torrents
}
