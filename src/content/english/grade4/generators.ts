// 四年级英语的生成器（需求 §11）：每个知识点一个。一个知识点的材料（units-s1 / s2）经 shared/makers.ts 变成题目条目，
// shared/pack.ts 按 mix 里各档的权重挑模板、再随机挑条目出题；单词的中文意思、中文的问题走词条 ew4.*（用到时注册，拼音查 py.ts）。
import type { UnitSpec } from '@/content/english/shared/spec'
import { definePack } from '@/content/english/shared/pack'
import { UNITS_S1 } from './units-s1'
import { UNITS_S2 } from './units-s2'
import { PY } from './py'

export const UNIT_SPECS: UnitSpec[] = [...UNITS_S1, ...UNITS_S2]

const pack = definePack({ units: UNIT_SPECS, py: PY, prefix: 'ew4' })

/** 中文 → 拼音（查不到抛错：测试会查全，线上不该发生） */
export const pyOf = pack.pyOf
/** 要注音的中文 → 词条 ew4.<文字> */
export const wordOf = pack.wordOf
/** 每个知识点的全部条目（按模板分组）与各档的权重 */
export const UNIT_ITEMS = pack.items
/** 全年级的单词 */
export const WORD_POOL = pack.pool
/** 每个条目各出一道（语料收集用，需求 F15） */
export const everyItemQuestion = pack.everyItemQuestion
