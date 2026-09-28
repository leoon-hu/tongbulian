// 一年级语文的生成器（需求 §9）：每课一个。一课的材料（lessons-s1 / s2）经 shared/makers.ts 变成题目条目，
// 按 mix 里各档的权重挑模板、再随机挑条目出题；要注音的中文走词条 yw.*（用到时注册，拼音查 py.ts）。
import type { Difficulty, LStr, Question } from '@/types/models'
import type { RNG } from '@/engine'
import { createRng, defineGenerator } from '@/engine'
import { registerDict, registerPinyin } from '@/engine/i18n'
import type { LessonSpec } from '@/content/chinese/shared/spec'
import { type Ctx, type Item, hanPart, lessonItems, parseMix } from '@/content/chinese/shared/makers'
import { INITIALS } from '@/content/chinese/shared/syllables'
import './i18n' // 先注册题目要求：出题时要查考的字在不在要求里（makers.ts 的 inPrompt）
import { LESSONS_S1 } from './lessons-s1'
import { LESSONS_S2 } from './lessons-s2'
import { PY } from './py'

export const LESSONS: LessonSpec[] = [...LESSONS_S1, ...LESSONS_S2]

/** 中文 → 拼音（查不到抛错：测试会查全，线上不该发生） */
export function pyOf(text: string): string {
  const py = PY[text]
  if (py === undefined) throw new Error(`拼音表里没有：${text}`)
  return py
}

/** 要注音的中文 → 词条 yw.<文字>（第一次用到时注册进字典与拼音表；英文界面查不到英文就显示中文） */
const registered = new Set<string>()
export function wordOf(text: string): LStr {
  const k = `yw.${text}`
  if (!registered.has(k)) {
    registered.add(k)
    registerDict({ zh: { [k]: text }, en: {} })
    registerPinyin({ [k]: pyOf(hanPart(text)) })
  }
  return { k }
}

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

function ctxOf(kp: string): Ctx {
  return { kp, py: pyOf, word: wordOf, pinyinReady: pinyinReady(kp), learned: LEARNED.get(kp) ?? null }
}

/** 每个知识点的全部条目（按模板分组）与各档的权重 */
export const LESSON_ITEMS = new Map<string, { items: Record<string, Item[]>; mix: Record<Difficulty, [string, number][]> }>()

for (const spec of LESSONS) {
  const items = lessonItems(spec, ctxOf(spec.kp))
  const mix = { 1: parseMix(spec.mix[1]), 2: parseMix(spec.mix[2]), 3: parseMix(spec.mix[3]) }
  LESSON_ITEMS.set(spec.kp, { items, mix })
  defineGenerator(spec.kp, (d: Difficulty, rng: RNG): Question => {
    const pool = mix[d].filter(([name]) => items[name]?.length)
    const total = pool.reduce((s, [, w]) => s + w, 0)
    let roll = rng.next() * total
    let name = pool[pool.length - 1]![0]
    for (const [n, w] of pool) {
      roll -= w
      if (roll < 0) {
        name = n
        break
      }
    }
    return rng.pick(items[name]!).build(d, rng)
  })
}

/**
 * 每个条目各出一道（语料收集用，需求 F15）：随机抽样可能漏掉某一句课文，这里逐条出一遍，朗读用到的句子一条不落。
 * 同一条目的题干与正确答案不随随机数变（变的只是干扰项与顺序），所以一道就够。
 */
export function everyItemQuestion(): Question[] {
  const out: Question[] = []
  for (const { items, mix } of LESSON_ITEMS.values()) {
    for (const d of [1, 2, 3] as const) {
      for (const [name] of mix[d]) for (const it of items[name] ?? []) out.push(it.build(d, createRng(1)))
    }
  }
  return out
}
