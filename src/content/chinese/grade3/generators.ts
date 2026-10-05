// 三年级语文的生成器（需求 §9 Y10）：每课一个。一课的材料（lessons-s1 / s2）经 shared/makers.ts 变成题目条目，
// shared/pack.ts 按 mix 里各档的权重挑模板、再随机挑条目出题；要注音的中文走词条 yw3.*（用到时注册，拼音查 py.ts）。
// 三年级没有拼音课：拼音都算学过，音节的干扰项不限。
import type { LessonSpec } from '@/content/chinese/shared/spec'
import { definePack } from '@/content/chinese/shared/pack'
import { LESSONS_S1 } from './lessons-s1'
import { LESSONS_S2 } from './lessons-s2'
import { PY } from './py'

export const LESSONS: LessonSpec[] = [...LESSONS_S1, ...LESSONS_S2]

const pack = definePack({ lessons: LESSONS, py: PY, prefix: 'yw3' })

/** 中文 → 拼音（查不到抛错：测试会查全，线上不该发生） */
export const pyOf = pack.pyOf
/** 要注音的中文 → 词条 yw3.<文字> */
export const wordOf = pack.wordOf
/** 每个知识点的全部条目（按模板分组）与各档的权重 */
export const LESSON_ITEMS = pack.items
/** 每个条目各出一道（语料收集用，需求 F15） */
export const everyItemQuestion = pack.everyItemQuestion
