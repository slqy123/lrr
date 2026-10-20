import { useEffect, useState } from 'react'

export type Theme = 'auto' | 'light' | 'dark'

export function useTheme(host: HTMLElement) {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      const saved = GM_getValue<string>('theme', 'auto')
      return saved === 'light' || saved === 'dark' ? saved : 'auto'
    } catch { return 'auto' }
  })
  useEffect(() => {
    const media = matchMedia('(prefers-color-scheme: dark)')
    const apply = () => host.classList.toggle('dark', theme === 'dark' || (theme === 'auto' && media.matches))
    apply()
    media.addEventListener('change', apply)
    try { GM_setValue('theme', theme) } catch {}
    return () => media.removeEventListener('change', apply)
  }, [host, theme])
  return [theme, setTheme] as const
}
