import medium from '@fontsource/fredoka/files/fredoka-latin-500-normal.woff2?url'
import semibold from '@fontsource/fredoka/files/fredoka-latin-600-normal.woff2?url'
import bold from '@fontsource/fredoka/files/fredoka-latin-700-normal.woff2?url'

export function loadDisplayFonts() {
  const faces = [medium, semibold, bold].map((url, index) => new FontFace('LRR Fredoka', `url("${url}")`, { weight: String(500 + index * 100) }))
  faces.forEach(face => {
    document.fonts.add(face)
    void face.load().catch(() => {})
  })
  return () => faces.forEach(face => document.fonts.delete(face))
}
