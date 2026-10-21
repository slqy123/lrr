import { useEffect, useMemo, useState } from 'react'
import { createClient } from './client'
import type { GalleryPage } from './page'
import { readSettings, saveSettings, type Settings } from './settings'

export function useGalleries(page: GalleryPage) {
  const [settings, setSettings] = useState(readSettings)
  const [revision, setRevision] = useState(0)
  const [queueRevision, setQueueRevision] = useState(0)
  const [items, setItems] = useState(page.galleries)
  const client = useMemo(() => createClient(settings, revision > 0), [settings, revision, page])
  useEffect(() => {
    let active = true
    setItems(page.galleries.map(item => ({ ...item, status: 'checking', hits: [], error: undefined, queue: undefined })))
    for (const item of page.galleries) {
      void client.check(item).then(result => {
        if (active) setItems(previous => previous.map(value => value.url === item.url ? { ...value, ...result } : value))
      })
    }
    return () => { active = false; client.dispose() }
  }, [client, page])
  useEffect(() => {
    let active = true
    let pending = false
    const refresh = async () => {
      if (pending) return
      pending = true
      try {
        const queues = await client.lookup(page.galleries.map(item => item.url))
        if (active) setItems(previous => previous.map(item => ({ ...item, queue: queues.get(item.url) })))
      } finally { pending = false }
    }
    void refresh()
    const timer = setInterval(() => { if (!document.hidden) void refresh() }, 5000)
    return () => { active = false; clearInterval(timer) }
  }, [client, page, queueRevision])
  const recheck = () => setRevision(value => value + 1)
  const refreshQueue = () => setQueueRevision(value => value + 1)
  const configure = (value: Settings) => { saveSettings(value); setSettings(value); recheck() }
  return { items, settings, configure, client, recheck, refreshQueue }
}
