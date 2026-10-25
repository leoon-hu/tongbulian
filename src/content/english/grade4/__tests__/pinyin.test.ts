// 四年级英语的拼音测试（知识点标题、题目要求、单词意思与中文问答的拼音表），共用的部分在 shared/__tests__/suite.ts
import '@/content/english/grade4'
import { pinyinSuite } from '@/content/english/shared/__tests__/suite'
import { UNIT_SPECS, wordOf } from '../generators'
import { TITLE_PINYIN } from '../titles'
import { PY } from '../py'

pinyinSuite({ grade: 4, specs: UNIT_SPECS, py: PY, titlePinyin: TITLE_PINYIN, wordOf, minTexts: 100 })
