import * as React from 'react'
import { App } from './App'
import { IsolationApp } from './Isolation'
import { mount } from '../userscript/mount'

const local = location.protocol === 'file:' || ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)
if (local && document.querySelector('.itg') && !document.querySelector('#searchbox form')) {
  const View = new URLSearchParams(location.search).get('view') === 'isolation' ? IsolationApp : App
  mount(context => <View {...context} />)
}
