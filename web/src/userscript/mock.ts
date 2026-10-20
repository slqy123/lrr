import type { Gallery, GalleryState } from './model'
export { stateLabels, type GalleryState } from './model'

const books = [
  ['放学后的蓝色时刻', 'AFTER SCHOOL', '#79b8ce', '#e4f3ed', 'missing', '同人志', 32],
  ['与星星交换秘密', 'STARRY LETTER', '#8585b9', '#eee0ef', 'downloaded', '画集', 48],
  ['春日来信 · 短篇集', 'SPRING LETTERS', '#df929d', '#fff0dc', 'duplicate', '漫画', 96],
  ['风与海的练习曲', 'SEA BREEZE', '#68a9b0', '#e5efc9', 'queued', '同人志', 24],
  ['月光下的魔法使', 'MOONLIGHT', '#736d9e', '#e0d8eb', 'missing', '画集', 64],
  ['旅途中的小小花园', 'LITTLE GARDEN', '#87a588', '#f8edca', 'checking', '漫画', 40],
  ['柠檬汽水与夏日约定', 'SUMMER PROMISE', '#d0ac6b', '#fff5d8', 'error', '同人志', 28],
  ['雨停之后，再见', 'AFTER THE RAIN', '#7694b7', '#e7e1f3', 'missing', '漫画', 56],
  ['樱色电车 · 终点站', 'SAKURA EXPRESS', '#d299ab', '#fbeedc', 'downloaded', '画集', 80],
  ['猫与少女的星期天', 'SUNDAY NOTES', '#a698bf', '#efede1', 'queued', '同人志', 36],
  ['在云端收集故事', 'CLOUD ATLAS', '#82adb8', '#f6eee0', 'missing', '画集', 72],
  ['冬日书店的灯火', 'WINTER BOOKSHOP', '#a38786', '#f5e6d4', 'duplicate', '漫画', 112],
] as const

function cover(title: string, subtitle: string, ink: string, paper: string, index: number) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="600" viewBox="0 0 400 600">
    <rect width="400" height="600" fill="${paper}"/>
    <rect x="18" y="18" width="364" height="564" rx="2" fill="none" stroke="${ink}" opacity=".5"/>
    <circle cx="${index % 2 ? 270 : 130}" cy="230" r="122" fill="${ink}" opacity=".26"/>
    <circle cx="286" cy="158" r="43" fill="white" opacity=".7"/>
    <path d="M0 370Q100 260 205 380T400 335V600H0" fill="${ink}" opacity=".5"/>
    <path d="M0 440Q130 330 250 435T400 410V600H0" fill="${ink}" opacity=".7"/>
    <path d="M174 440l18-112h22l26 112z" fill="${paper}"/>
    <ellipse cx="204" cy="309" rx="24" ry="29" fill="${paper}"/>
    <path d="M179 320q-12-68 27-56 34 5 24 66l-14-29-12-14-15 17z" fill="${ink}"/>
    <path d="M194 438v55m25-55v55" stroke="${paper}" stroke-width="9"/>
    <g fill="${ink}" font-family="sans-serif" text-anchor="middle"><text x="200" y="79" font-size="13" letter-spacing="5">ILLUSTRATION COLLECTION</text><text x="200" y="121" font-size="23" font-weight="bold">${title}</text></g>
    <text x="200" y="546" fill="${paper}" font-family="sans-serif" text-anchor="middle" font-size="17" letter-spacing="3">${subtitle}</text>
    <path d="M64 197v20m-10-10h20m240 95v16m-8-8h16" stroke="${ink}" stroke-width="2"/>
  </svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export const mockGalleries: Gallery[] = books.map(([title, subtitle, ink, paper, status, category, pages], index) => ({
  id: index + 1, url: `#work-${index + 1}`, title, status: status as GalleryState, category, pages,
  language: '中文', hits: [],
  cover: cover(title, subtitle, ink, paper, index),
  author: ['青空工作室', '星屑通信', '四季绘本', '薄荷映画'][index % 4],
}))
