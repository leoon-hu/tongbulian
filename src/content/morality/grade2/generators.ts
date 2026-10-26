// 二年级道德与法治的生成器（需求 §12）：每课一个，做法同一年级——一课的材料（lessons-s1 / s2）经 shared/makers.ts 变成题目条目，
// shared/pack.ts 按 mix 里各档的权重挑模板、再随机挑条目出题；要注音的中文走词条 dd2.*（用到时注册，拼音查 py.ts）。
import type { LessonSpec } from '@/content/morality/shared/spec'
import { definePack } from '@/content/morality/shared/pack'
import { LESSONS_S1 } from './lessons-s1'
import { LESSONS_S2 } from './lessons-s2'
import { PY } from './py'

export const LESSONS: LessonSpec[] = [...LESSONS_S1, ...LESSONS_S2]

export const { pyOf, items, everyItemQuestion } = definePack({ lessons: LESSONS, py: PY, prefix: 'dd2' })
