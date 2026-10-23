import * as React from 'react'
import { useRef, useState } from 'react'
import { Search, SlidersHorizontal, Upload } from 'lucide-react'
import { categoryRowVariants, searchRowVariants, searchPanelVariants, searchHeadingVariants } from './styles/search-layout'
import { Button } from '../ui/yurui/button'
import { FilterChip } from '../ui/yurui/filter-chip'
import { CategoryButton } from '../ui/yurui/category-button'
import { Input } from '../ui/yurui/input'
import { InputGroup } from '../ui/yurui/input-group'
import { NativeSelect } from '../ui/yurui/native-select'
import { FormField } from '../ui/yurui/form-field'
import { FieldGroup } from '../ui/yurui/field-group'
import { FieldLabel } from '../ui/yurui/field-label'
import { Checkbox } from '../ui/yurui/checkbox'
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/yurui/dialog'
import { Popover, PopoverAnchor, PopoverContent, PopoverTitle, PopoverTrigger } from '../ui/yurui/popover'
import { categories, type GalleryPage } from './page'
import { categoryAppearance } from './categories'

const advanced = [['f_sh', '包括已删除画廊'], ['f_sto', '必须有种子'], ['f_sfl', '忽略语言过滤'], ['f_sfu', '忽略上传者过滤'], ['f_sft', '忽略标签过滤']] as const
const managed = new Set(['f_search', 'f_cats', 'advsearch', 'f_spf', 'f_spt', 'f_srdd', ...advanced.map(([name]) => name)])

function languageTag(token: string) {
  const match = token.match(/^language:(?:"(chinese|japanese)\$?"|(chinese|japanese))\$?$/i)
  return (match?.[1] || match?.[2])?.toLowerCase()
}

export function SearchPanel({ page, portal }: { page: GalleryPage; portal: HTMLElement }) {
  const initial = new URLSearchParams(page.fields)
  const [query, setQuery] = useState(initial.get('f_search') || '')
  const [mask, setMask] = useState(page.categoryMask)
  const [previousMask, setPreviousMask] = useState(mask)
  const [suggest, setSuggest] = useState(false)
  const [fileSearch, setFileSearch] = useState(false)
  const [toolsOpen, setToolsOpen] = useState(false)
  const toolsTrigger = useRef<HTMLButtonElement>(null)
  const [jumpRating, setJumpRating] = useState(initial.get('f_srdd') || '0')
  const [minimum, setMinimum] = useState(initial.get('f_spf') || '')
  const [maximum, setMaximum] = useState(initial.get('f_spt') || '')
  const [flags, setFlags] = useState(new Set(advanced.filter(([name]) => initial.has(name)).map(([name]) => name)))
  const allAges = mask === (1023 ^ 256)
  const searchTokens = query.match(/(?:[^\s"]|"[^"]*(?:"|$))+/g) || []
  const setLanguage = (language: string) => {
    const enabled = searchTokens.some(value => languageTag(value) === language)
    setQuery([...searchTokens.filter(value => !languageTag(value)), ...(enabled ? [] : [`language:${language}`])].join(' '))
  }
  const allAgesToggle = () => {
    if (allAges) setMask(previousMask)
    else { setPreviousMask(mask); setMask(1023 ^ 256) }
  }
  const fileAction = new URL('/image_lookup.php', new URL(page.action).hostname === 'exhentai.org' ? 'https://upld.exhentai.org' : 'https://upld.e-hentai.org').href
  return <section className={searchPanelVariants({ variant: 'live' })}>
    <div className={searchHeadingVariants({ variant: 'live' })}><h1>搜索作品</h1></div>
    <form id="lrr-search" action={page.action} method="get">
      {page.fields.filter(([name]) => !managed.has(name)).map(([name, value], index) => <input key={`${name}-${index}`} type="hidden" name={name} value={value} />)}
      <input type="hidden" name="f_cats" value={mask} /><input type="hidden" name="advsearch" value="1" />
      <input type="hidden" name="f_spf" value={minimum} disabled={!minimum || minimum === '0'} /><input type="hidden" name="f_spt" value={maximum} disabled={!maximum || maximum === '0'} />
      <input type="hidden" name="f_srdd" value={jumpRating} disabled={jumpRating === '0'} />
      {advanced.filter(([name]) => flags.has(name)).map(([name]) => <input key={name} type="hidden" name={name} value="on" />)}
      <div className={categoryRowVariants({ variant: 'live' })} role="group" aria-label="作品分类">
        <CategoryButton checked={mask === 0} indicator={false} onClick={() => setMask(value => value === 0 ? 1023 : 0)}>全部</CategoryButton>
        {categories.map(([bit, title]) => <CategoryButton key={bit} checked={!(mask & bit)} style={categoryAppearance(title).style} onClick={() => setMask(value => value ^ bit)}>{categoryAppearance(title).label}</CategoryButton>)}
      </div>
      <div className={searchRowVariants({ variant: 'live' })}>
        <Popover open={suggest} onOpenChange={setSuggest}><PopoverAnchor asChild><InputGroup className="search-field"><Search size={17} aria-hidden="true" /><Input name={query ? 'f_search' : undefined} aria-label="搜索作品" aria-expanded={suggest} aria-controls="lrr-suggestions" aria-haspopup="dialog" placeholder="搜索标题、作者或标签…" value={query} onFocus={() => setSuggest(true)} onClick={() => setSuggest(true)} onChange={event => setQuery(event.target.value)} /></InputGroup></PopoverAnchor>
          <PopoverContent id="lrr-suggestions" container={portal} align="start" onOpenAutoFocus={event => event.preventDefault()} onCloseAutoFocus={event => event.preventDefault()}><PopoverTitle>快捷筛选</PopoverTitle><div className="flex gap-2">{[['chinese', '仅中文'], ['japanese', '仅日文']].map(([language, label]) => <FilterChip key={language} checked={searchTokens.some(value => languageTag(value) === language)} onClick={() => setLanguage(language)}>{label}</FilterChip>)}<FilterChip checked={allAges} onClick={allAgesToggle}>全年龄</FilterChip></div></PopoverContent>
        </Popover>
        <Button type="submit" variant="emphasis">搜索</Button><Button asChild variant="secondary"><a href={page.action}>清空</a></Button>
        <Popover open={toolsOpen} onOpenChange={setToolsOpen}><PopoverTrigger asChild><Button ref={toolsTrigger} type="button" variant="secondary"><SlidersHorizontal />筛选与工具</Button></PopoverTrigger><PopoverContent container={portal} align="end" className="w-96" onCloseAutoFocus={event => { if (fileSearch) event.preventDefault() }}><PopoverTitle>高级筛选</PopoverTitle>
          <div className="flex flex-col gap-[14px]"><FormField label="最低评分">{control => <NativeSelect {...control} value={jumpRating} onChange={event => setJumpRating(event.target.value)}>{[['0', '不限'], ['2', '2 星'], ['3', '3 星'], ['4', '4 星'], ['5', '5 星']].map(([value, title]) => <option key={value} value={value}>{title}</option>)}</NativeSelect>}</FormField>
          <FieldGroup label="页数范围"><div className="flex gap-2"><Input type="number" min="0" max="9999" aria-label="最少页数" placeholder="最少页数" value={minimum} onChange={event => setMinimum(event.target.value)} /><Input type="number" min="0" max="9999" aria-label="最多页数" placeholder="最多页数" value={maximum} onChange={event => setMaximum(event.target.value)} /></div></FieldGroup>
          </div>
          <div className="yurui-stitch-over flex flex-col gap-3 pt-[14px]">{advanced.map(([name, title]) => <FieldLabel key={name}><Checkbox checked={flags.has(name)} onCheckedChange={checked => setFlags(previous => { const next = new Set(previous); if (checked) next.add(name); else next.delete(name); return next })} />{title}</FieldLabel>)}</div>
          <div className="yurui-stitch-over flex flex-wrap gap-2 pt-[14px] [&>button:last-child]:flex-1"><Button type="button" variant="secondary" onClick={() => { setToolsOpen(false); setFileSearch(true) }}><Upload />文件搜索</Button><Button type="submit" form="lrr-search">应用筛选并搜索</Button></div>
        </PopoverContent></Popover>
      </div>
    </form>
    <Dialog open={fileSearch} onOpenChange={setFileSearch}><DialogContent container={portal} onCloseAutoFocus={event => { event.preventDefault(); toolsTrigger.current?.focus() }}>
      <DialogHeader><DialogTitle><Upload size={18} />文件搜索</DialogTitle><DialogDescription>所选图片将直接上传到原站，以查找相同或相似文件。</DialogDescription></DialogHeader>
      <DialogBody><form id="lrr-file-search" className="flex flex-col gap-4" action={fileAction} method="post" encType="multipart/form-data"><Input name="sfile" type="file" accept="image/*" required aria-label="文件搜索图片" /><FieldLabel><Checkbox name="fs_similar" defaultChecked />相似图片</FieldLabel><FieldLabel><Checkbox name="fs_covers" />仅搜索封面</FieldLabel></form></DialogBody>
      <DialogFooter><Button type="button" variant="ghost" onClick={() => setFileSearch(false)}>取消</Button><Button type="submit" form="lrr-file-search" name="f_sfile" value="File Search">文件搜索</Button></DialogFooter>
    </DialogContent></Dialog>
  </section>
}
