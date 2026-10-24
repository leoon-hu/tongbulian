// 英语内容包的公共装配（需求 §11）：一个年级各知识点的材料 → 注册每个知识点一个生成器（按档挑模板再挑条目）；
// 拼音表查询、要注音的中文注册成词条、全年级的单词池与学过的字母、语料收集时每个条目逐条出一道。
import type { Difficulty, LStr, Question } from '@/types/models'
import type { RNG } from '@/engine'
import { createRng, defineGenerator } from '@/engine'
import { registerDict, registerPinyin } from '@/engine/i18n'
import type { UnitSpec } from './spec'
import { ALPHABET, type Ctx, type Item, type WordItem, parseLetters, parseMix, unitItems, unitWords } from './makers'

export interface EnglishPack {
  /** 中文 → 拼音（查不到抛错：测试会查全，线上不该发生） */
  pyOf: (text: string) => string
  /** 要注音的中文 → 词条 `<前缀>.<文字>`（第一次用到时注册进字典与拼音表；英文界面也显示中文） */
  wordOf: (text: string) => LStr
  /** 每个知识点的全部条目（按模板分组）与各档的权重 */
  items: Map<string, { items: Record<string, Item[]>; mix: Record<Difficulty, [string, number][]> }>
  /** 全年级的单词（按知识点顺序，去重） */
  pool: WordItem[]
  /** 每个条目各出一道（语料收集用，需求 F15）：同一条目的题干与正确答案不随随机数变，所以一道就够 */
  everyItemQuestion: () => Question[]
}

export function definePack(opts: {
  units: UnitSpec[]
  py: Readonly<Record<string, string>>
  /** 注音词条的键前缀：各年级分开（三年级 ew3） */
  prefix: string
}): EnglishPack {
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
      registerDict({ zh: { [k]: text }, en: { [k]: text } })
      registerPinyin({ [k]: pyOf(text) })
    }
    return { k }
  }

  const seen = new Set<string>()
  const pool: WordItem[] = []
  for (const spec of opts.units) for (const w of unitWords(spec)) if (!seen.has(w.en)) (seen.add(w.en), pool.push(w))
  const anyLetters = opts.units.some((u) => parseLetters(u.letters).length)

  const items: EnglishPack['items'] = new Map()
  const learned: string[] = []
  for (const spec of opts.units) {
    learned.push(...parseLetters(spec.letters).filter((L) => !learned.includes(L)))
    const ctx: Ctx = { kp: spec.kp, word: wordOf, pool, learnedLetters: anyLetters ? [...learned] : ALPHABET }
    const byName = unitItems(spec, ctx)
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

  return { pyOf, wordOf, items, pool, everyItemQuestion }
}
