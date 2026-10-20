import * as React from 'react'
import { useState } from 'react'
import { Flower2, Search, SlidersHorizontal, Upload } from 'lucide-react'
import { Button } from '../ui/anibt/button'
import { Input } from '../ui/anibt/input'
import { Checkbox } from '../ui/anibt/checkbox'
import { Popover, PopoverAnchor, PopoverContent, PopoverTitle, PopoverTrigger } from '../ui/anibt/popover'
import { categories, type GalleryPage } from './page'
import { categoryAppearance } from './categories'

const advanced = [['f_sh', '包括已删除画廊'], ['f_sto', '必须有种子'], ['f_sfl', '忽略语言过滤'], ['f_sfu', '忽略上传者过滤'], ['f_sft', '忽略标签过滤']] as const
const managed = new Set(['f_search', 'f_cats', 'advsearch', 'f_spf', 'f_spt', 'f_srdd', ...advanced.map(([name]) => name)])

export function SearchPanel({ page, portal }: { page: GalleryPage; portal: HTMLElement }) {
  const initial = new URLSearchParams(page.fields)
  const [query, setQuery] = useState(initial.get('f_search') || '')
  const [mask, setMask] = useState(page.categoryMask)
  const [previousMask, setPreviousMask] = useState(mask)
  const [suggest, setSuggest] = useState(false)
  const [fileSearch, setFileSearch] = useState(false)
  const [jumpRating, setJumpRating] = useState(initial.get('f_srdd') || '0')
  const [minimum, setMinimum] = useState(initial.get('f_spf') || '')
  const [maximum, setMaximum] = useState(initial.get('f_spt') || '')
  const [flags, setFlags] = useState(new Set(advanced.filter(([name]) => initial.has(name)).map(([name]) => name)))
  const allAges = mask === (1023 ^ 256)
  const setLanguage = (token: string) => {
    const tokens = query.split(/\s+/).filter(Boolean)
    const enabled = tokens.includes(token)
    setQuery([...tokens.filter(value => !/^language:(?:chinese|japanese)$/i.test(value)), ...(enabled ? [] : [token])].join(' '))
  }
  const allAgesToggle = () => {
    if (allAges) setMask(previousMask)
    else { setPreviousMask(mask); setMask(1023 ^ 256) }
  }
  const fileAction = new URL('/image_lookup.php', new URL(page.action).hostname === 'exhentai.org' ? 'https://upld.exhentai.org' : 'https://upld.e-hentai.org').href
  return <section className="search-panel anibt-sheet">
    <div className="section-heading"><div><span className="eyebrow">YOUR NEXT FAVORITE</span><h1>今天，也有新的心动 <Flower2 size={22} /></h1><p>在一页页故事里，遇见喜欢的世界。</p></div><span className="anibt-sticker anibt-sticker-water header-sticker">小小书架 · 大大世界 ✦</span></div>
    <form id="lrr-search" action={page.action} method="get">
      {page.fields.filter(([name]) => !managed.has(name)).map(([name, value], index) => <input key={`${name}-${index}`} type="hidden" name={name} value={value} />)}
      <input type="hidden" name="f_cats" value={mask} /><input type="hidden" name="advsearch" value="1" />
      <input type="hidden" name="f_spf" value={minimum} disabled={!minimum || minimum === '0'} /><input type="hidden" name="f_spt" value={maximum} disabled={!maximum || maximum === '0'} />
      <input type="hidden" name="f_srdd" value={jumpRating} disabled={jumpRating === '0'} />
      {advanced.filter(([name]) => flags.has(name)).map(([name]) => <input key={name} type="hidden" name={name} value="on" />)}
      <div className="category-row" role="group" aria-label="作品分类">
        <Button type="button" size="sm" className="category-filter category-key" aria-pressed={mask === 0} variant={mask === 0 ? 'secondary' : 'ghost'} onClick={() => setMask(0)}>全部</Button>
        {categories.map(([bit, title]) => <Button key={bit} type="button" size="sm" className="category-filter category-key" style={categoryAppearance(title).style} aria-pressed={!(mask & bit)} variant={mask & bit ? 'ghost' : 'secondary'} onClick={() => setMask(value => value ^ bit)}><span aria-hidden="true">{mask & bit ? '○' : '✓'}</span>{categoryAppearance(title).label}</Button>)}
      </div>
      <div className="search-row">
        <Popover open={suggest} onOpenChange={setSuggest}><PopoverAnchor asChild><div className="search-field"><Search size={17} /><Input name={query ? 'f_search' : undefined} aria-label="搜索作品" aria-expanded={suggest} aria-controls="lrr-suggestions" aria-haspopup="dialog" placeholder="搜索标题、作者或标签…" value={query} onFocus={() => setSuggest(true)} onClick={() => setSuggest(true)} onChange={event => setQuery(event.target.value)} /></div></PopoverAnchor>
          <PopoverContent id="lrr-suggestions" container={portal} align="start" onOpenAutoFocus={event => event.preventDefault()} onCloseAutoFocus={event => event.preventDefault()}><PopoverTitle>快捷筛选</PopoverTitle><div className="flex gap-2">{[['language:chinese', '仅中文'], ['language:japanese', '仅日文']].map(([token, label]) => <Button key={token} type="button" size="sm" aria-pressed={query.split(/\s+/).includes(token)} variant={query.split(/\s+/).includes(token) ? 'default' : 'secondary'} onClick={() => setLanguage(token)}>{label}</Button>)}<Button type="button" size="sm" variant={allAges ? 'default' : 'secondary'} aria-pressed={allAges} onClick={allAgesToggle}>全年龄</Button></div></PopoverContent>
        </Popover>
        <Button type="submit">搜索</Button><Button asChild variant="secondary"><a href={page.action}>清空</a></Button>
        <Popover><PopoverTrigger asChild><Button type="button" variant="secondary"><SlidersHorizontal />筛选与工具</Button></PopoverTrigger><PopoverContent container={portal} align="end" className="w-96"><PopoverTitle>高级筛选</PopoverTitle>
          <label>最低评分<select className="anibt-input" aria-label="最低评分" value={jumpRating} onChange={event => setJumpRating(event.target.value)}>{[['0', '不限'], ['2', '2 星'], ['3', '3 星'], ['4', '4 星'], ['5', '5 星']].map(([value, title]) => <option key={value} value={value}>{title}</option>)}</select></label>
          <label>页数范围<div className="flex gap-2 mt-2"><Input type="number" min="0" max="9999" aria-label="最少页数" placeholder="最少页数" value={minimum} onChange={event => setMinimum(event.target.value)} /><Input type="number" min="0" max="9999" aria-label="最多页数" placeholder="最多页数" value={maximum} onChange={event => setMaximum(event.target.value)} /></div></label>
          {advanced.map(([name, title]) => <label key={name} className="check-label"><Checkbox checked={flags.has(name)} onCheckedChange={checked => setFlags(previous => { const next = new Set(previous); if (checked) next.add(name); else next.delete(name); return next })} />{title}</label>)}
          <Button type="button" variant="secondary" onClick={() => setFileSearch(value => !value)}><Upload />文件搜索</Button><Button type="submit" form="lrr-search">应用筛选并搜索</Button>
        </PopoverContent></Popover>
      </div>
    </form>
    {fileSearch && <form className="file-search anibt-stitch-over" action={fileAction} method="post" encType="multipart/form-data"><p className="muted">所选图片将直接上传到原站，以查找相同或相似文件。</p><Input name="sfile" type="file" accept="image/*" required aria-label="文件搜索图片" /><label className="check-label"><Checkbox name="fs_similar" defaultChecked />相似图片</label><label className="check-label"><Checkbox name="fs_covers" />仅搜索封面</label><Button type="submit" name="f_sfile" value="File Search">文件搜索</Button></form>}
  </section>
}
