const metadata = /^(?:(?:chinese|japanese|english|digital|uncensored)(?:\b|$)|中文|汉化|漢化|中国翻訳|DL版|翻訳|翻译|無修正)/i

export function parseTitle(value: string) {
  let remaining = value.trim()
  let author = ''
  while (remaining.startsWith('[') || remaining.startsWith('(')) {
    const opening = remaining[0]
    const closing = opening === '[' ? ']' : ')'
    let depth = 0
    let end = -1
    for (let index = 0; index < remaining.length; index++) {
      if (remaining[index] === opening) depth++
      if (remaining[index] === closing && --depth === 0) { end = index; break }
    }
    if (end < 0) break
    const prefix = remaining.slice(1, end).trim()
    if (opening === '[' && !author && !metadata.test(prefix)) author = prefix
    remaining = remaining.slice(end + 1).trim()
  }
  return { author, title: remaining.replace(/(?:\s*\[[^\]]*\])+\s*$/, '').trim() }
}
