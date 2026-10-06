import type { Difficulty, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// ☆ 营养午餐（四下综合与实践，课本 p97–98，四年级数学下册 D）。
// 课本：某食堂 9 种菜的热量（千焦）、脂肪（g）、蛋白质（g）表；10 岁左右的儿童每顿午餐的热量应不低于 2926 千焦、脂肪应不超过 50 g；
// 每份午餐由 3 种不同的菜搭配，能搭配出多少种合格的午餐（课本没给答案：84 种搭配里 24 种合格）；全班选 6 种喜欢的方案画复式条形统计图、
// 哪一种方案的蛋白质最多。调查、画图、「搭配出多少种」不出；出算一份午餐的热量 / 脂肪 / 蛋白质、看表找最高 / 最低的菜、判断合不合格
// （「不超过 50 克」含 50 克）、第三种菜选哪个才合格、几份合格的午餐比蛋白质。
// 表里的字（菜名、表头）不朗读，题目文字里说出是哪几种菜；菜名照课本（「炸鸡排」的炸读 zhá，朗读要核）。
// ─────────────────────────────────────────────────────────────

const K = 'm4s2-09-lunch'
type P = Record<string, LStr | number>
const L = (k: string, p?: P): LStr => (p ? { k, p } : { k })
const T = (k: string, p?: P): StemPart => ({ kind: 'text', text: L(k, p) })

export interface Dish {
  id: string
  /** 热量 / 千焦 */
  kj: number
  /** 脂肪 / g */
  fat: number
  /** 蛋白质 / g */
  pro: number
}
/** 课本的表（编号 1–9 就是下标 + 1） */
export const DISHES: Dish[] = [
  { id: 'chop', kj: 1254, fat: 19, pro: 20 }, // 炸鸡排
  { id: 'egg', kj: 899, fat: 15, pro: 11 }, // 西红柿炒鸡蛋
  { id: 'greens', kj: 911, fat: 11, pro: 7 }, // 香菇油菜
  { id: 'fish', kj: 2112, fat: 18, pro: 14 }, // 糖醋鱼块
  { id: 'tofu', kj: 1020, fat: 16, pro: 13 }, // 家常豆腐
  { id: 'melon', kj: 564, fat: 7, pro: 1 }, // 香菜冬瓜
  { id: 'kungpao', kj: 1033, fat: 18, pro: 7 }, // 宫保鸡丁
  { id: 'beef', kj: 1095, fat: 23, pro: 16 }, // 土豆炖牛肉
  { id: 'sprout', kj: 497, fat: 12, pro: 3 }, // 韭菜炒豆芽
]
/** 合格：热量不低于 2926 千焦，脂肪不超过 50 克 */
export const MIN_KJ = 2926
export const MAX_FAT = 50
type Nut = 'kj' | 'fat' | 'pro'
export const total = (combo: number[], n: Nut): number => combo.reduce((s, i) => s + DISHES[i]![n], 0)
export type Verdict = 'ok' | 'lowKj' | 'highFat' | 'both'
export function verdict(combo: number[]): Verdict {
  const low = total(combo, 'kj') < MIN_KJ
  const high = total(combo, 'fat') > MAX_FAT
  return low && high ? 'both' : low ? 'lowKj' : high ? 'highFat' : 'ok'
}
/** 9 种菜选 3 种的全部搭配（编号从小到大） */
export const COMBOS: number[][] = (() => {
  const out: number[][] = []
  for (let a = 0; a < 9; a++) for (let b = a + 1; b < 9; b++) for (let c = b + 1; c < 9; c++) out.push([a, b, c])
  return out
})()
const dish = (i: number): LStr => L(`m4.lun.dish.${DISHES[i]!.id}`)
/**
 * 营养表：只放题目用到的那几种菜、用得着的几栏（手机竖屏一屏放得下），数照课本；编号只在「用编号写的方案」那题里放
 */
type Col = 'no' | Nut
function table(rows: number[], cols: Col[] = ['kj', 'fat', 'pro']): StemPart {
  const head = (c: Col): LStr => L(`m4.lun.h.${c}`)
  const cell = (i: number, c: Col): number => (c === 'no' ? i + 1 : DISHES[i]![c])
  const withNo = cols.includes('no')
  const rest = cols.filter((c) => c !== 'no')
  return {
    kind: 'stat-table',
    title: L('m4.lun.title'),
    head: 'row',
    rows: [
      [...(withNo ? [head('no')] : []), L('m4.lun.h.name'), ...rest.map(head)],
      ...[...rows].sort((a, b) => a - b).map((i) => [...(withNo ? [i + 1] : []), dish(i), ...rest.map((c) => cell(i, c))]),
    ],
  }
}
const comboLabel = (c: number[]): LStr => L('m4.lun.combo', { a: c[0]! + 1, b: c[1]! + 1, c: c[2]! + 1 })

/** 一份午餐（3 种菜）的热量 / 脂肪 / 蛋白质一共多少：常错成只加了两种、看错一行 */
function qTotal(d: Difficulty, rng: RNG, n: Nut = rng.pick(['kj', 'kj', 'fat', 'pro'] as const)): Question {
  const c = rng.pick(COMBOS)
  const v = total(c, n)
  const two = [total([c[0]!, c[1]!], n), total([c[1]!, c[2]!], n)]
  const step = n === 'kj' ? 100 : 10
  return numberQuestion({
    kpId: K,
    type: 'stat',
    difficulty: d,
    sig: `total-${n}-${c.join('.')}`,
    stem: [T(`m4.lun.total.${n}`), table(c, [n])],
    value: v,
    rng,
    min: 0,
    max: n === 'kj' ? 9999 : 199,
    smart: [...two, v + step, v - step, v + 1, v - 1],
  })
}
/** 看表：下面几种菜里哪一种的热量最高（最低）、脂肪最多（最少）、蛋白质最多（最少）；只问最多 / 最少只有一个的 */
function qExtreme(d: Difficulty, rng: RNG): Question {
  for (;;) {
    const rows = rng.shuffle(DISHES.map((_, i) => i)).slice(0, 4)
    const n = rng.pick(['kj', 'fat', 'pro'] as const)
    const most = rng.chance(0.6)
    const vals = rows.map((i) => DISHES[i]![n])
    const target = most ? Math.max(...vals) : Math.min(...vals)
    if (vals.filter((v) => v === target).length !== 1) continue
    const at = rows[vals.indexOf(target)]!
    return labelQuestion({
      kpId: K,
      type: 'stat',
      difficulty: d,
      sig: `ext-${n}-${most ? 'max' : 'min'}-${[...rows].sort((a, b) => a - b).join('.')}`,
      stem: [T(`m4.lun.ext.${n}.${most ? 'max' : 'min'}`), table(rows, [n])],
      correct: dish(at),
      distractors: rows.filter((i) => i !== at).map(dish),
      rng,
    })
  }
}
/** 判断一份午餐合不合格：合格 / 热量不够 / 脂肪超标（两样都不行的三种搭配不拿来问）；脂肪正好 50 克的放第 3 档 */
function qVerdict(d: Difficulty, rng: RNG, edge = false): Question {
  const pool = COMBOS.filter((c) => verdict(c) !== 'both' && (edge ? total(c, 'fat') === MAX_FAT || Math.abs(total(c, 'kj') - MIN_KJ) < 100 : true))
  // 合格的、热量不够的、脂肪超标的大致一样多
  const want = rng.pick(['ok', 'lowKj', 'highFat'] as const)
  const fit = pool.filter((c) => verdict(c) === want)
  const c = rng.pick(fit.length ? fit : pool)
  const v = verdict(c)
  const opts: Verdict[] = ['ok', 'lowKj', 'highFat']
  return labelQuestion({
    kpId: K,
    type: 'stat',
    difficulty: d,
    sig: `verdict-${c.join('.')}`,
    stem: [T('m4.lun.verdict'), table(c, ['kj', 'fat'])],
    correct: L(`m4.lun.v.${v}`),
    distractors: opts.filter((o) => o !== v).map((o) => L(`m4.lun.v.${o}`)),
    rng,
  })
}
/** 已经选了两种菜，第三种选哪一种这份午餐才合格（三个选项里只有一个合格） */
function qThird(d: Difficulty, rng: RNG): Question {
  for (;;) {
    const [a, b] = rng.shuffle(DISHES.map((_, i) => i)).slice(0, 2) as [number, number]
    const rest = DISHES.map((_, i) => i).filter((i) => i !== a && i !== b)
    const good = rest.filter((i) => verdict([a, b, i]) === 'ok')
    const bad = rest.filter((i) => verdict([a, b, i]) !== 'ok')
    if (!good.length || bad.length < 2) continue
    const right = rng.pick(good)
    const wrong = rng.shuffle(bad).slice(0, 2)
    return labelQuestion({
      kpId: K,
      type: 'stat',
      difficulty: d,
      sig: `third-${Math.min(a, b)}.${Math.max(a, b)}-${right}-${[...wrong].sort().join('.')}`,
      stem: [T('m4.lun.third', { a: dish(a), b: dish(b) }), table([a, b, right, ...wrong], ['kj', 'fat'])],
      correct: dish(right),
      distractors: wrong.map(dish),
      rng,
    })
  }
}
/** 三份合格的午餐（用编号写），哪一份的蛋白质最多（课本 (2)「哪一种方案所含的蛋白质最多」） */
function qProtein(d: Difficulty, rng: RNG): Question {
  const ok = COMBOS.filter((c) => verdict(c) === 'ok')
  for (;;) {
    const three = rng.shuffle(ok).slice(0, 3)
    const ps = three.map((c) => total(c, 'pro'))
    if (new Set(ps).size < 3) continue
    const at = ps.indexOf(Math.max(...ps))
    const rows = [...new Set(three.flat())]
    if (rows.length > 7) continue
    return labelQuestion({
      kpId: K,
      type: 'stat',
      difficulty: d,
      sig: `protein-${three.map((c) => c.join('.')).sort().join('|')}`,
      stem: [T('m4.lun.protein'), table(rows, ['no', 'pro'])],
      correct: comboLabel(three[at]!),
      distractors: three.filter((_, i) => i !== at).map(comboLabel),
      rng,
    })
  }
}

function lunch(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 看表算一份午餐的热量 / 脂肪 / 蛋白质、找热量最高、脂肪最少……的菜、判断一份午餐合不合格（这一课的核心）
    if (roll < 0.45) return qTotal(d, rng)
    if (roll < 0.65) return qExtreme(d, rng)
    return qVerdict(d, rng)
  }
  if (d === 2) {
    // 判断合不合格、第三种菜选哪个、几份午餐比蛋白质
    if (roll < 0.45) return qVerdict(d, rng)
    if (roll < 0.75) return qThird(d, rng)
    return qProtein(d, rng)
  }
  // 第 3 档：卡在边上的（脂肪正好 50 克、热量差一点）、比蛋白质、热量一共多少
  if (roll < 0.45) return qVerdict(d, rng, true)
  if (roll < 0.75) return qProtein(d, rng)
  return qTotal(d, rng, 'kj')
}
defineGenerator(K, lunch)
