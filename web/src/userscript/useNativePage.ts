import { useEffect, useState } from 'react'
import { readPage, type GalleryPage } from './page'

export function useNativePage(initial: GalleryPage, restore: (message?: string) => void) {
  const [page, setPage] = useState(initial)
  useEffect(() => {
    const list = document.querySelector('.itg')
    if (!list) return
    let timer: ReturnType<typeof setTimeout>
    const observer = new MutationObserver(() => {
      clearTimeout(timer)
      timer = setTimeout(() => {
        try {
          const next = readPage()
          if (!next) throw new Error('无法解析更新后的列表')
          setPage(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next)
        } catch { restore('LRR 无法解析更新后的列表，已恢复原站。') }
      }, 200)
    })
    observer.observe(list, { childList: true, subtree: true, characterData: true })
    return () => { clearTimeout(timer); observer.disconnect() }
  }, [restore])
  return page
}
