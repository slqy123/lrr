import type { CSSProperties } from 'react'

const appearances = [
  ['同人志', 'Doujinshi', '#b7455c', '#fa94a4'],
  ['漫画', 'Manga', '#9e591f', '#f3b071'],
  ['画师 CG', 'Artist CG', '#85640b', '#e6ca6a'],
  ['游戏 CG', 'Game CG', '#397451', '#8bcba5'],
  ['西方作品', 'Western', '#846039', '#d7b487'],
  ['全年龄', 'Non-H', '#346b98', '#8bbfee'],
  ['图像集', 'Image Set', '#99507e', '#e8a0cd'],
  ['角色扮演', 'Cosplay', '#7852a5', '#bea2ed'],
  ['成人照片', 'Asian Porn', '#98514c', '#e8aaa0'],
  ['其他', 'Misc', '#6f687b', '#b5afc5'],
] as const

export function categoryAppearance(category: string) {
  const value = category.trim().toLowerCase()
  const match = appearances.find(([label, native]) => label.toLowerCase() === value || native.toLowerCase() === value)
  return {
    label: match?.[0] ?? category,
    style: { '--category-light': match?.[2] ?? '#6f687b', '--category-dark': match?.[3] ?? '#b5afc5' } as CSSProperties,
  }
}
