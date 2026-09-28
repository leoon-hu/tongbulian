// 语文内容包的公共装配（需求 §9）：一个年级各课的材料 → 注册每课一个生成器（按档挑模板再挑条目）；
// 拼音表查询、要注音的中文注册成词条、语料收集时每个条目逐条出一道。各年级的 generators.ts 只管传材料与拼音表。
import type { Difficulty, LStr, Question } from '@/types/models'
import type { RNG } from '@/engine'
import { createRng, defineGenerator } from '@/engine'
import { registerDict, registerPinyin } from '@/engine/i18n'
import type { LessonSpec } from './spec'
import { type Ctx, type Item, hanPart, lessonItems, parseMix, sayZi } from './makers'

export interface ChinesePack {
  /** 中文 → 拼音（查不到抛错：测试会查全，线上不该发生） */
  pyOf: (text: string) => string
  /** 要注音的中文 → 词条 `<前缀>.<文字>`（第一次用到时注册进字典与拼音表；英文界面查不到英文就显示中文） */
  wordOf: (text: string) => LStr
  /** 每个知识点的全部条目（按模板分组）与各档的权重 */
  items: Map<string, { items: Record<string, Item[]>; mix: Record<Difficulty, [string, number][]> }>
  /**
   * 每个条目各出一道（语料收集用，需求 F15）：随机抽样可能漏掉某一句课文，这里逐条出一遍，朗读用到的句子一条不落。
   * 同一条目的题干与正确答案不随随机数变（变的只是干扰项与顺序），所以一道就够。
   */
  everyItemQuestion: () => Question[]
}

export function definePack(opts: {
  lessons: LessonSpec[]
  py: Readonly<Record<string, string>>
  /** 注音词条的键前缀：各年级分开（一年级 yw、二年级 yw2），同一句话在两个年级的读法互不影响 */
  prefix: string
  /** 学过拼音没有（一年级上册第一单元还没学，Y5）；不给就是都学过 */
  pinyinReady?: (kp: string) => boolean
  /** 拼音课里干扰项能用的声母 / 韵母；不给就是不限 */
  learned?: (kp: string) => Ctx['learned']
}): ChinesePack {
  const pyOf = (text: string): string => {
    const p = opts.py[text]
    if (p === undefined) throw new Error(`拼音表里没有：${text}`)
    return p
  }
  const registered = new Set<string>()
  const wordOf = (text: string): LStr => {
    const k = `${opts.prefix}.${text}`
    if (!registered.has(k)) {
      registered.add(k)
      registerDict({ zh: { [k]: text }, en: {} })
      registerPinyin({ [k]: pyOf(hanPart(text)) })
    }
    return { k }
  }

  const items: ChinesePack['items'] = new Map()
  for (const spec of opts.lessons) {
    const ctx: Ctx = {
      kp: spec.kp,
      py: pyOf,
      word: wordOf,
      pinyinReady: opts.pinyinReady?.(spec.kp) ?? true,
      learned: opts.learned?.(spec.kp) ?? null,
      say: (c) => sayZi(c, opts.py[c]),
    }
    const byName = lessonItems(spec, ctx)
    const mix = { 1: parseMix(spec.mix[1]), 2: parseMix(spec.mix[2]), 3: parseMix(spec.mix[3]) }
    items.set(spec.kp, { items: byName, mix })
    defineGenerator(spec.kp, (d: Difficulty, rng: RNG): Question => {
      const pool = mix[d].filter(([name]) => byName[name]?.length)
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
      return rng.pick(byName[name]!).build(d, rng)
    })
  }

  const everyItemQuestion = (): Question[] => {
    const out: Question[] = []
    for (const { items: byName, mix } of items.values()) {
      for (const d of [1, 2, 3] as const) {
        for (const [name] of mix[d]) for (const it of byName[name] ?? []) out.push(it.build(d, createRng(1)))
      }
    }
    return out
  }

  return { pyOf, wordOf, items, everyItemQuestion }
}
