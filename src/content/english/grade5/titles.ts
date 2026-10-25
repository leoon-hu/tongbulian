// 五年级英语的知识点 / 单元名（英文名 + 中文标题里汉字的拼音）：随目录一起加载（做法见 shared/titles.ts）。
import { registerEnglishTitles } from '@/content/english/shared/titles'
import { KNOWLEDGE_POINTS, UNITS } from './curriculum'

export const TITLE_PINYIN = registerEnglishTitles(KNOWLEDGE_POINTS, UNITS)
