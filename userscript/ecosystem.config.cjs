const { join } = require('node:path')

const root = join(__dirname, '..')
const page = process.env.LRR_SAVED_PAGE
if (!page) throw new Error('Set LRR_SAVED_PAGE to a saved real HTML page')

module.exports = {
  apps: ['current', 'before', 'after'].map((name, index) => ({
    name: `lrr-test-${name}`,
    cwd: root,
    script: 'userscript/test-live.mjs',
    args: [page],
    interpreter: process.execPath,
    watch: false,
    autorestart: false,
    time: true,
    env: {
      LRR_NATIVE_PAGES: process.env.LRR_NATIVE_PAGES || '',
      LRR_PREVIEW_LABEL: name,
      LRR_PREVIEW_PORT: String(29683 + index),
      LRR_PREVIEW_SCRIPT: join(root, name === 'current' ? 'lanraragi-checker.user.js' : `userscript/dist/comparison/${name}.user.js`),
    },
  })),
}
