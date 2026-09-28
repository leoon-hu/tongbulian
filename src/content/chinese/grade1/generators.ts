// 一年级语文的生成器（需求 §9）：每课一个。一课的材料（lessons-s1 / s2）经 shared/makers.ts 变成题目条目，
// shared/pack.ts 按 mix 里各档的权重挑模板、再随机挑条目出题；要注音的中文走词条 yw.*（用到时注册，拼音查 py.ts）。
import type { LessonSpec } from '@/content/chinese/shared/spec'
import { definePack } from '@/content/chinese/shared/pack'
import { INITIALS } from '@/content/chinese/shared/syllables'
import { LESSONS_S1 } from './lessons-s1'
import { LESSONS_S2 } from './lessons-s2'
import { PY } from './py'

export const LESSONS: LessonSpec[] = [...LESSONS_S1, ...LESSONS_S2]

/** 汉语拼音三个单元的课，按课本顺序：本课学的声母 / 韵母 / 整体认读音节（干扰项只用学到本课为止的，Y5） */
const PINYIN_ORDER: [string, string][] = [
  ['c1s1-02-aoe', 'a o e'],
  ['c1s1-02-iuv', 'i u ü'],
  ['c1s1-02-bpmf', 'b p m f'],
  ['c1s1-02-dtnl', 'd t n l'],
  ['c1s1-02-garden', ''],
  ['c1s1-03-gkh', 'g k h'],
  ['c1s1-03-jqx', 'j q x'],
  ['c1s1-03-zcs', 'z c s zi ci si'],
  ['c1s1-03-zhchshr', 'zh ch sh r zhi chi shi ri'],
  ['c1s1-03-yw', 'y w yi wu yu'],
  ['c1s1-03-garden', ''],
  ['c1s1-04-aieiui', 'ai ei ui'],
  ['c1s1-04-aoouiu', 'ao ou iu'],
  ['c1s1-04-ieveer', 'ie üe er ye yue'],
  ['c1s1-04-anen', 'an en in un ün yuan yin yun'],
  ['c1s1-04-angeng', 'ang eng ing ong ying'],
  ['c1s1-04-garden', ''],
]
const LEARNED = new Map<string, { initials: Set<string>; finals: Set<string> }>()
{
  const initials = new Set<string>()
  const finals = new Set<string>()
  for (const [kp, letters] of PINYIN_ORDER) {
    for (const l of letters.split(' ').filter(Boolean)) ((INITIALS as readonly string[]).includes(l) ? initials : finals).add(l)
    LEARNED.set(kp, { initials: new Set(initials), finals: new Set(finals) })
  }
}

/** 学过拼音没有：上册第一单元在拼音之前（Y5） */
export const pinyinReady = (kp: string): boolean => !kp.startsWith('c1s1-01-')

const pack = definePack({ lessons: LESSONS, py: PY, prefix: 'yw', pinyinReady, learned: (kp) => LEARNED.get(kp) ?? null })

/** 中文 → 拼音（查不到抛错：测试会查全，线上不该发生） */
export const pyOf = pack.pyOf
/** 要注音的中文 → 词条 yw.<文字> */
export const wordOf = pack.wordOf
/** 每个知识点的全部条目（按模板分组）与各档的权重 */
export const LESSON_ITEMS = pack.items
/** 每个条目各出一道（语料收集用，需求 F15） */
export const everyItemQuestion = pack.everyItemQuestion
