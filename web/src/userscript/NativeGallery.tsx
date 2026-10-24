import { ArrowLeft, ExternalLink, FileArchive, Magnet, Moon, Sun } from 'lucide-react'
import { Button } from '../ui/yurui/button'
import { TextLink } from '../ui/yurui/text-link'
import { GalleryInformation, PagePreview } from './GalleryDetails'
import { readDetails } from './details'
import type { Gallery } from './model'
import { useTheme } from './useTheme'

export function readNativeGallery(doc = document, base = location.href) {
  if (['127.0.0.1', 'localhost'].includes(new URL(base).hostname)) {
    const source = [...doc.querySelectorAll<HTMLAnchorElement>('#gd5 a[href]')].map(link => link.href).find(href => /^https:\/\/(?:e-hentai\.org|exhentai\.org|g\.e-hentai\.org)\/g\/\d+\/[^/]+\//.test(href))
    if (!source) throw new Error('快照缺少原站作品地址')
    const url = new URL(source)
    url.search = ''
    base = url.href
  }
  const summary = readDetails(doc.documentElement.outerHTML, base, Infinity)
  const title = summary.title || doc.querySelector('#gj')?.textContent?.trim()
  if (!title) throw new Error('无法读取作品标题')
  const coverStyle = doc.querySelector<HTMLElement>('#gd1 > div')?.style.backgroundImage || ''
  const cover = coverStyle.match(/url\(["']?(.*?)["']?\)/)?.[1]
  const item: Gallery = {
    id: Number(new URL(base).pathname.match(/\/g\/(\d+)/)?.[1]), url: base,
    title, author: '', category: summary.facts.find(fact => fact.label === '分类')?.value || 'Misc',
    pages: summary.pages ?? null, cover: cover ? new URL(cover, base).href : '',
    language: '', status: 'checking', hits: [],
  }
  const links = (selector: string) => [...doc.querySelectorAll<HTMLAnchorElement>(selector)].flatMap(link => {
    try {
      const handler = link.getAttribute('onclick')
      const popup = handler?.match(/^return popUp\('(https:\/\/[^']+)'\s*,\s*\d+\s*,\s*\d+\s*\);?$/)?.[1]
      if (handler && !popup) return []
      const url = new URL(popup || link.getAttribute('href') || '', base)
      const title = link.textContent?.trim()
      return title && /^https?:$/.test(url.protocol) && url.origin === new URL(base).origin ? [{ title, url: url.href }] : []
    } catch { return [] }
  })
  return {
    summary, item, subtitle: doc.querySelector('#gj')?.textContent?.trim(),
    actions: links('#gd5 a').filter(link => ['/archiver.php', '/gallerytorrents.php'].includes(new URL(link.url).pathname)), pagination: links('.ptt a'),
    comments: [...doc.querySelectorAll('#cdiv .c1')].filter(node => !node.querySelector('[name=ulcomment]')).map((node, index) => ({
      id: node.id || String(index), author: node.querySelector('.c3 a')?.textContent?.trim() || '匿名',
      heading: node.querySelector('.c3')?.textContent?.trim(), body: node.querySelector('.c6')?.textContent?.trim(),
    })).filter(comment => comment.body),
  }
}

export function NativeGallery({ data, host, restore }: { data: ReturnType<typeof readNativeGallery>; host: HTMLElement; restore: () => void }) {
  const [theme, setTheme] = useTheme(host)
  const { summary, item } = data
  const original = () => { restore(); window.scrollTo(0, 0) }
  return <div className="surface native-gallery">
    <header className="native-gallery-top"><TextLink href={new URL('/', item.url).href}><ArrowLeft size={16} /> 浏览作品</TextLink><span className="native-gallery-brand">YuruLib <small>作品档案</small></span><div className="flex gap-2"><Button variant="ghost" size="sm" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}主题</Button><Button variant="ghost" size="sm" onClick={original}>原站界面 <ExternalLink size={14} /></Button></div></header>
    <main className="native-gallery-main">
      <article id="gallery-information" className="native-gallery-paper">
        <GalleryInformation summary={summary} item={item} />
        {data.subtitle && data.subtitle !== item.title && <p className="native-gallery-subtitle" lang="ja">{data.subtitle}</p>}
        <aside aria-label="作品操作" className="native-gallery-actions">{data.actions.map(action => {
          const torrent = new URL(action.url).pathname === '/gallerytorrents.php'
          const count = torrent ? action.title.match(/\((\d+)\)/)?.[1] : undefined
          return <TextLink key={action.url} href={action.url}>{torrent ? <Magnet size={16} /> : <FileArchive size={16} />}<span>{torrent ? 'BT 种子' : '下载压缩包'}</span>{count && <small>{count}</small>}</TextLink>
        })}<Button variant="ghost" size="sm" onClick={original}>原站更多操作</Button></aside>
      </article>
      <section id="gallery-pages" className="native-gallery-section"><header><h2>翻阅作品 <span>{summary.pages ?? '—'} 页</span></h2><span className="text-muted-foreground">点击图片进入原站阅读器</span></header><div className="native-gallery-previews">{summary.previews.map(page => <PagePreview key={page.url} page={page} />)}</div>{!summary.previews.length && <p>当前页面没有可读取的预览图片。</p>}<nav className="native-gallery-pagination" aria-label="预览分页">{data.pagination.map((link, index) => <Button asChild variant="ghost" size="sm" key={`${link.url}-${index}`}><a href={link.url}>{link.title}</a></Button>)}</nav></section>
      <section id="gallery-comments" className="native-gallery-section"><header><h2>读者留言 <span>{data.comments.length}</span></h2><Button variant="ghost" size="sm" onClick={original}>在原站发表评论</Button></header>{data.comments.length ? data.comments.map(comment => <article className="native-gallery-comment" key={comment.id}><h3>{comment.author}</h3><small className="text-muted-foreground">{comment.heading}</small><p>{comment.body}</p></article>) : <p className="text-muted-foreground">暂无读者留言。</p>}</section>
      <footer className="native-gallery-bottom">YuruLib · 作品档案<Button variant="ghost" size="sm" onClick={original}>恢复原站界面</Button></footer>
    </main>
  </div>
}
