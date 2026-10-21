import { useEffect, useState } from 'react'
import { Palette } from 'lucide-react'
import { Button } from '../ui/yurui/button'
import { IconButton } from '../ui/yurui/icon-button'
import { appearancePickerStyles, paletteOptionsStyles, paletteOptionStyles, paletteSwatchesVariants } from './styles/appearance'
import { Popover, PopoverContent, PopoverTitle, PopoverTrigger } from '../ui/yurui/popover'

const palettes = [
  ['festival', '桃粉'],
  ['original', '奶油'],
] as const
type PaletteName = typeof palettes[number][0]

export function AppearancePicker({ host, portal }: { host: HTMLElement; portal: HTMLElement }) {
  const [palette, setPalette] = useState<PaletteName>(() => {
    try {
      const saved = GM_getValue<string>('palette', 'festival')
      return palettes.find(([name]) => name === saved)?.[0] ?? 'festival'
    } catch { return 'festival' }
  })
  const [error, setError] = useState('')
  useEffect(() => {
    host.dataset.palette = palette
    return () => { delete host.dataset.palette }
  }, [host, palette])
  return <Popover><PopoverTrigger asChild><IconButton label="切换配色"><Palette /></IconButton></PopoverTrigger><PopoverContent container={portal} className={appearancePickerStyles}><PopoverTitle>书架配色</PopoverTitle><div className={paletteOptionsStyles}>{palettes.map(([name, title]) => <Button key={name} variant="ghost" className={paletteOptionStyles} aria-pressed={palette === name} onClick={() => {
    setPalette(name)
    try { GM_setValue('palette', name); setError('') } catch { setError('当前配色已应用，但无法保存，请检查 Tampermonkey 权限。') }
  }}><span className={paletteSwatchesVariants({ palette: name })} aria-hidden="true"><i /><i /><i /></span><span><strong>{title}</strong></span></Button>)}</div>{error && <p role="status">{error}</p>}</PopoverContent></Popover>
}
