import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
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
  if (!savedPage || !existsSync(savedPage)) throw new Error('Supply a saved real HTML page')
  const result = spawnSync('pm2', ['startOrRestart', join(root, 'userscript/ecosystem.config.cjs'), '--only', 'lrr-test-before,lrr-test-after', '--update-env'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, LRR_SAVED_PAGE: resolve(savedPage) },
  })
  if (result.error) throw result.error
  if (result.status !== 0) process.exit(result.status || 1)
  console.log('before: http://127.0.0.1:29684/snapshot.html\nafter: http://127.0.0.1:29685/snapshot.html')
} else {
  console.error(`Usage: node ${join('userscript', 'preview.mjs')} before|after|serve [saved-gallery.html]`)
  process.exitCode = 1
}
