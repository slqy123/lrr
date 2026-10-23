import { ArrowLeftRight, BookOpen, HardDrive, Languages } from 'lucide-react'
import { languageLabel, formatBytes } from './comparison'

function LanguageValue({ values, other }: { values: string[]; other: string[] }) {
  return <div className="comparison-language-values">{values.length ? values.map(value => <span key={value} data-different={other.length && !other.includes(value) ? 'true' : undefined}>{languageLabel(value)}{other.length > 0 && !other.includes(value) && <ArrowLeftRight size={12} aria-hidden="true" />}</span>) : <span className="text-muted-foreground">未记录</span>}</div>
}

function Measurement({ value, maximum, format }: { value?: number; maximum: number; format: (value: number) => string }) {
  return <><strong className="comparison-number">{value == null ? '未知' : format(value)}</strong><div className="comparison-bar" aria-hidden="true">{value != null && maximum > 0 && <span style={{ width: `${value / maximum * 100}%` }} />}</div></>
}

export function ComparisonMetrics({ originalLanguages, libraryLanguages, languageFromSource, originalPages, libraryPages, originalSize, librarySize }: {
  originalLanguages: string[]; libraryLanguages: string[]; languageFromSource: boolean
  originalPages?: number; libraryPages?: number; originalSize?: number; librarySize?: number
}) {
  const languageKnown = originalLanguages.length > 0 && libraryLanguages.length > 0
  const languageDifferent = languageKnown && originalLanguages.join(',') !== libraryLanguages.join(',')
  const pageDifference = originalPages != null && libraryPages != null ? libraryPages - originalPages : undefined
  const sizeDifference = originalSize != null && librarySize != null ? librarySize - originalSize : undefined
  const percent = originalSize && sizeDifference != null ? Math.abs(sizeDifference) / originalSize * 100 : undefined
  return <section className="comparison-metrics" aria-label="版本差异">
    <section className="comparison-metric" data-different={languageDifferent || undefined}>
      <header><h4><Languages size={16} aria-hidden="true" />语言 / 翻译</h4><span>{languageKnown ? languageDifferent ? '版本标记不同' : '标记相同' : '信息不足'}</span></header>
      <div className="comparison-pair"><div><small>当前原站</small><LanguageValue values={originalLanguages} other={libraryLanguages} /></div><div><small>库内{languageFromSource ? ' · 来源页信息' : ''}</small><LanguageValue values={libraryLanguages} other={originalLanguages} /></div></div>
    </section>
    <section className="comparison-metric" data-different={pageDifference !== undefined && pageDifference !== 0 || undefined}>
      <header><h4><BookOpen size={16} aria-hidden="true" />页数</h4><span>{pageDifference === undefined ? '信息不足' : pageDifference === 0 ? '页数相同' : `库内${pageDifference > 0 ? '多' : '少'} ${Math.abs(pageDifference)} 页`}</span></header>
      <div className="comparison-pair"><div><small>当前原站</small><Measurement value={originalPages} maximum={Math.max(originalPages || 0, libraryPages || 0)} format={value => `${value} 页`} /></div><div><small>库内实际页数</small><Measurement value={libraryPages} maximum={Math.max(originalPages || 0, libraryPages || 0)} format={value => `${value} 页`} /></div></div>
    </section>
    <section className="comparison-metric" data-different={percent != null && percent >= 0.05 || undefined}>
      <header><h4><HardDrive size={16} aria-hidden="true" />文件体积</h4><span>{percent == null ? '信息不足' : percent < 0.05 ? '体积接近' : `库内${sizeDifference! > 0 ? '大' : '小'}约 ${percent < 1 ? percent.toFixed(1) : Math.round(percent)}%`}</span></header>
      <div className="comparison-pair"><div><small>原站图片合计</small><Measurement value={originalSize} maximum={Math.max(originalSize || 0, librarySize || 0)} format={formatBytes} /></div><div><small>库内压缩包</small><Measurement value={librarySize} maximum={Math.max(originalSize || 0, librarySize || 0)} format={formatBytes} /></div></div>
      <p className="comparison-metric-note">原站为标称体积，压缩方式也会影响大小。</p>
    </section>
  </section>
}
