import * as React from 'react'
import { LiveApp } from './LiveApp'
import { readPage } from './page'
import { mount } from './mount'
import styles from './styles.css?inline'

if (document.querySelector('.itg')) {
  try {
    const page = readPage()
    if (page) mount(styles, context => <LiveApp page={page} {...context} />)
  } catch {
    const notice = document.createElement('p')
    notice.setAttribute('role', 'alert')
    notice.textContent = 'LRR 无法解析当前页面，已保留原站界面。'
    document.body.prepend(notice)
  }
}
