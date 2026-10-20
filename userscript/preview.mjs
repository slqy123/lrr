import { spawn, spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const snapshots = join(root, 'userscript/dist/comparison')
const [command, savedPage] = process.argv.slice(2)
const snapshot = name => join(snapshots, `${name}.user.js`)

if (['before', 'after'].includes(command)) {
  const result = spawnSync('pnpm', ['--dir', 'web', 'build:userscript'], { cwd: root, stdio: 'inherit' })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status || 1)
  mkdirSync(snapshots, { recursive: true })
  copyFileSync(join(root, 'lanraragi-checker.user.js'), snapshot(command))
  console.log(`Frozen ${command}: ${snapshot(command)}`)
} else if (command === 'serve') {
  for (const name of ['before', 'after']) {
    if (!existsSync(snapshot(name))) throw new Error(`Missing ${name} snapshot; run node userscript/preview.mjs ${name} first`)
  }
  if (savedPage && !existsSync(savedPage)) throw new Error(`Saved page not found: ${savedPage}`)
  const children = ['before', 'after'].map(name => spawn(process.execPath, [join(root, 'userscript/test-live.mjs'), ...(savedPage ? [savedPage] : [])], {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: { ...process.env, LRR_LIVE_PREVIEW: 'manual', LRR_PREVIEW_SCRIPT: snapshot(name), LRR_PREVIEW_LABEL: name },
  }))
  const stop = () => children.forEach(child => child.kill('SIGTERM'))
  process.on('SIGINT', stop)
  process.on('SIGTERM', stop)
  children.forEach(child => {
    child.on('error', error => { console.error(error); process.exitCode = 1; stop() })
    child.on('exit', code => { if (code) { process.exitCode = code; stop() } })
  })
} else {
  console.error(`Usage: node ${join('userscript', 'preview.mjs')} before|after|serve [saved-gallery.html]`)
  process.exitCode = 1
}
