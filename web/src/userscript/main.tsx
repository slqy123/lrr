import * as React from 'react'
import { LiveApp } from './LiveApp'
import { NativeGallery, readNativeGallery } from './NativeGallery'
import { readPage } from './page'
import { mount } from './mount'
import styles from './styles.css?inline'

const pendingStyle = document.createElement('style')
pendingStyle.textContent = 'html { opacity: 0 !important; }'
const observer = new MutationObserver(() => {
  if (document.documentElement) {
    document.documentElement.append(pendingStyle)
    observer.disconnect()
  }
})
if (document.documentElement) document.documentElement.append(pendingStyle)
else observer.observe(document, { childList: true })

const timeout = window.setTimeout(reveal, 15000)
function reveal() {
  window.clearTimeout(timeout)
  observer.disconnect()
  pendingStyle.remove()
}

function Ready({ children }: { children: React.ReactNode }) {
  React.useLayoutEffect(reveal, [])
  return children
}

function start() {
  const nativeOnce = sessionStorage.getItem('lrr-native-once')
  sessionStorage.removeItem('lrr-native-once')
  if (nativeOnce === location.href) { reveal(); return }
  if (document.querySelector('#gdd') && document.querySelector('#gdt')) {
    try {
      const data = readNativeGallery()
      mount(styles, context => <Ready><NativeGallery data={data} {...context} /></Ready>, reveal)
      return
    } catch {
      reveal()
      return
    }
  }
  if (document.querySelector('.itg')) {
    try {
      const page = readPage()
      if (page) {
        mount(styles, context => <Ready><LiveApp page={page} {...context} /></Ready>, reveal)
        return
      }
    } catch {
      const notice = document.createElement('p')
      notice.setAttribute('role', 'alert')
      notice.textContent = 'LRR 无法解析当前页面，已保留原站界面。'
      document.body.prepend(notice)
    }
  }
  reveal()
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true })
else start()
