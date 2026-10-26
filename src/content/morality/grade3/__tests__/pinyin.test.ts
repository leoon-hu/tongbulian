// 三年级道德与法治的拼音测试：题目要求、标题、拼音表（py.ts）的对齐与多余，一 / 不 变调；共用的部分在 shared/__tests__/suite.ts
import '@/content/morality/grade3'
import { pinyinSuite } from '@/content/morality/shared/__tests__/suite'
import { LESSONS } from '../generators'
import { PY } from '../py'
import { TITLE_PINYIN } from '../titles'
import { KNOWLEDGE_POINTS, UNITS } from '../curriculum'

pinyinSuite({ name: '三年级', units: UNITS, kps: KNOWLEDGE_POINTS, lessons: LESSONS, py: PY, titlePinyin: TITLE_PINYIN, minTexts: 500 })
