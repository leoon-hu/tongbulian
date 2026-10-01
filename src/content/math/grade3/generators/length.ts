import type { Difficulty, LStr, Question, QuestionType, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 毫米、分米和千米（三上三）：毫米、分米的认识（量一量读「几厘米几毫米」、进率、选毫米 / 厘米 / 分米、锯木料）、
// 千米的认识（进率、几个 100 米是 1 千米、选米 / 千米、跑道 / 泳池）、估计距离（例 3：先找一个标准——一步、每分钟走多远、
// 每站多远；练习六的行 1 千米要多久、能不能按时到校）、长度单位的换算（整理和复习：换算、比大小、加减、对折、重叠）。
// 本单元没有小数，换算的答案都是整数；单元四才学多位数乘一位数，估计距离只用「几个十 / 几个百」能口算的数。
// 单位、换算、比大小的公共部分（BASE / convQuestion / compareQuestion）质量单元（mass.ts）也用。
// ─────────────────────────────────────────────────────────────

export type Unit = 'mm' | 'cm' | 'dm' | 'm' | 'km' | 'g' | 'kg' | 't'
/** 每个单位折合成最小单位（长度：毫米；质量：克）是多少 */
export const BASE: Record<Unit, number> = { mm: 1, cm: 10, dm: 100, m: 1000, km: 1_000_000, g: 1, kg: 1000, t: 1_000_000 }
/** 单位的词条；n = 1 时英文用单数（只有 ton 要分，符号 mm / kg 不分单复数） */
export const unitL = (x: Unit, n?: number): LStr => ({ k: x === 't' && n === 1 ? 'm3.u.t1' : `m3.u.${x}` })
const ORDER: Unit[] = ['mm', 'cm', 'dm', 'm', 'km']
/** 选单位的题里「要填的空」（中英文都显示成一条横线；括号会被读成「括号」，所以不用「（ ）」） */
export const BLANK = '___'

const KP_MMDM = 'm3s1-03-mm-dm'
const KP_KM = 'm3s1-03-km'
const KP_UNIT = 'm3s1-03-choose-unit'
const KP_CONV = 'm3s1-03-convert'

const text = (k: string, p?: Record<string, string | number | LStr>): StemPart => ({ kind: 'text', text: p ? { k, p } : { k } })
const isWhole = (x: number): boolean => Number.isInteger(x) && x > 0

/** a ua = 几 ub？（ub 可以比 ua 大也可以小，答案必须是整数） */
export function convQuestion(kpId: string, type: QuestionType, d: Difficulty, a: number, ua: Unit, ub: Unit, rng: RNG): Question {
  const value = (a * BASE[ua]) / BASE[ub]
  const r = Math.max(BASE[ua], BASE[ub]) / Math.min(BASE[ua], BASE[ub])
  // 常见错：进率差了 10 倍、该乘的除了（该除的乘了）、直接抄原数
  const smart = [value * 10, value / 10, BASE[ua] > BASE[ub] ? a / r : a * r, a].filter((x) => isWhole(x) && x !== value)
  return numberQuestion({
    kpId,
    type,
    difficulty: d,
    sig: `conv-${a}${ua}-${ub}`,
    stem: [text('m3.u.conv', { a, ua: unitL(ua, a), ub: unitL(ub) })],
    value,
    rng,
    min: 1,
    max: Math.max(100, value * 10),
    smart,
  })
}

/** 1 ua = 几 ub？（进率） */
export function rateQuestion(kpId: string, type: QuestionType, d: Difficulty, ua: Unit, ub: Unit, rng: RNG): Question {
  const value = BASE[ua] / BASE[ub]
  return numberQuestion({
    kpId,
    type,
    difficulty: d,
    sig: `rate-${ua}-${ub}`,
    stem: [text('m3.u.rate', { ua: unitL(ua, 1), ub: unitL(ub) })],
    value,
    rng,
    min: 1,
    max: 10000,
    smart: [10, 100, 1000].filter((x) => x !== value),
  })
}

/** 比一比：a ua ○ b ub（选项 >、<、=） */
export function compareQuestion(kpId: string, type: QuestionType, d: Difficulty, a: number, ua: Unit, b: number, ub: Unit, rng: RNG): Question {
  const x = a * BASE[ua]
  const y = b * BASE[ub]
  const correct = x > y ? '>' : x < y ? '<' : '='
  return labelQuestion({
    kpId,
    type,
    difficulty: d,
    sig: `cmp-${a}${ua}-${b}${ub}`,
    stem: [text('m3.u.cmpAsk'), text('m3.u.cmpLine', { a, ua: unitL(ua, a), b, ub: unitL(ub, b) })],
    correct,
    distractors: ['>', '<', '='].filter((s) => s !== correct),
    rng,
  })
}

/**
 * 比大小的一对数（big 是大单位）：同一个数配不同单位（5 分米 ○ 5 毫米）、换算后正好相等（6 厘米 ○ 60 毫米）、
 * 换算后差一点（6 分米 ○ 550 毫米、2 千米 ○ 3000 米）。左右随机。
 */
export function comparePair(rng: RNG, small: Unit, big: Unit): [number, Unit, number, Unit] {
  const r = BASE[big] / BASE[small]
  const roll = rng.next()
  const a = rng.int(roll < 0.3 ? 2 : 1, 9)
  let b: number
  if (roll < 0.3) b = a
  else if (roll < 0.6) b = a * r
  else {
    const step = r / 10
    const k = rng.pick([1, 2, 3, 5, 10])
    b = a * r + (rng.chance(0.5) || a * r - k * step <= 0 ? 1 : -1) * k * step
  }
  return rng.chance(0.5) ? [a, big, b, small] : [b, small, a, big]
}

// ── 毫米、分米的认识 ──

/** 「几厘米几毫米」的选项 */
const cmMmL = (cm: number, mm: number): LStr => ({ k: 'm3.len.cmMm', p: { cm, mm } })

/**
 * 量一量：毫米尺上压着一条线段。第 1 档都从 0 起、12–68 毫米（做一做 p21：回形针、钉子读「___厘米___毫米」，量一量「___毫米」）：
 * 不是整厘米的多半问「几厘米几毫米」（选项），其余问「几毫米」；第 2 档有从整厘米开始的（例 1 做一做：橡皮压在 1 到 6 上）。
 */
function rulerQ(d: Difficulty, rng: RNG): Question {
  let from: number
  let to: number
  const roll = rng.next()
  if (d === 1 || (d === 2 && roll < 0.5)) {
    from = 0
    // 第 1 档约四成是整厘米
    to = d === 1 && roll < 0.4 ? rng.int(2, 6) * 10 : rng.int(12, 68)
    if (to % 10 === 0 && !(d === 1 && roll < 0.4)) to += rng.int(1, 8) > 4 ? 3 : 7
  } else if (d === 2) {
    // 从整厘米开始（课本：橡皮压在 1 到 6 上）
    const s = rng.int(1, 3)
    from = s * 10
    to = from + rng.int(2, 7 - s) * 10
  } else {
    from = rng.int(3, 25)
    to = from + rng.int(14, 45)
    if (from % 10 === 0 && to % 10 === 0) to += 3
  }
  const len = to - from
  const length = Math.max(6, Math.min(8, Math.ceil(to / 10) + 1))
  const ruler: StemPart = { kind: 'ruler', length, from, to, mm: true }
  if (len % 10 !== 0 && len > 10 && rng.chance(0.75)) {
    // 「这条线段是几厘米几毫米？」：选项是常见的读错（少 / 多读 1 厘米、毫米数从另一头数、两个数对调）
    const cm = Math.floor(len / 10)
    const mm = len % 10
    const wrong: [number, number][] = [
      [cm, 10 - mm],
      [cm + 1, mm],
      [cm - 1, mm],
      [mm, cm],
      [cm + 1, 10 - mm],
    ]
    const seen = new Set([`${cm}-${mm}`])
    const distractors: LStr[] = []
    for (const [a, b] of wrong) {
      if (a < 1 || b < 1 || b > 9 || seen.has(`${a}-${b}`)) continue
      seen.add(`${a}-${b}`)
      distractors.push(cmMmL(a, b))
      if (distractors.length === 3) break
    }
    return labelQuestion({
      kpId: KP_MMDM,
      type: 'length',
      difficulty: d,
      sig: `rcm-${from}-${to}`,
      stem: [text('m3.len.rulerCmMm'), ruler],
      correct: cmMmL(cm, mm),
      distractors,
      rng,
    })
  }
  return numberQuestion({
    kpId: KP_MMDM,
    type: 'length',
    difficulty: d,
    sig: `rmm-${from}-${to}`,
    stem: [text('m3.len.rulerMm'), ruler],
    value: len,
    rng,
    min: 1,
    max: 80,
    smart: [to, len % 10 === 0 ? len / 10 : Math.floor(len / 10), len + 10, len - 10].filter((x) => x > 0 && x !== len),
  })
}

/** 相邻单位一步换算（进率 10 或千米 ↔ 米的 1000）：大 → 小给 1–9，小 → 大给整十（整千） */
function oneStep(kpId: string, d: Difficulty, rng: RNG, pairs: [Unit, Unit][]): Question {
  const [big, small] = rng.pick(pairs)
  const r = BASE[big] / BASE[small]
  const n = rng.int(1, 9)
  return rng.chance(0.5) ? convQuestion(kpId, 'length', d, n, big, small, rng) : convQuestion(kpId, 'length', d, n * r, small, big, rng)
}
const MMDM_STEPS: [Unit, Unit][] = [
  ['cm', 'mm'],
  ['dm', 'cm'],
  ['m', 'dm'],
]
const ALL_STEPS: [Unit, Unit][] = [...MMDM_STEPS, ['km', 'm']]

/** 复名数化成小单位：2 厘米 8 毫米 = 几毫米 */
function compoundQ(d: Difficulty, rng: RNG): Question {
  const [big, small] = rng.pick(MMDM_STEPS)
  const a = rng.int(1, 9)
  const b = rng.int(1, 9)
  const value = a * 10 + b
  return numberQuestion({
    kpId: KP_MMDM,
    type: 'length',
    difficulty: d,
    sig: `two-${a}${big}${b}${small}`,
    stem: [text('m3.u.convTwo', { a, ua: unitL(big), b, ub: unitL(small), uc: unitL(small) })],
    value,
    rng,
    min: 1,
    max: 200,
    smart: [a + b, a * 100 + b, b * 10 + a, a * 10],
  })
}

/** 化成复名数：11 厘米 = 1 分米几厘米 */
function splitQ(d: Difficulty, rng: RNG): Question {
  const [big, small] = rng.pick(MMDM_STEPS)
  const b = rng.int(1, 9)
  const c = rng.int(1, 9)
  const a = b * 10 + c
  return numberQuestion({
    kpId: KP_MMDM,
    type: 'length',
    difficulty: d,
    sig: `split-${a}${small}-${big}`,
    stem: [text('m3.u.split', { a, ua: unitL(small), b, ub: unitL(big), uc: unitL(small) })],
    value: c,
    rng,
    min: 1,
    max: 20,
    smart: [b, 10 - c, c + 1, a - 10],
  })
}

/** 两级换算：2 米 = 200 厘米、100 毫米 = 1 分米、3 米 = 3000 毫米 */
function twoLevel(kpId: string, d: Difficulty, rng: RNG, pairs: [Unit, Unit][]): Question {
  const [big, small] = rng.pick(pairs)
  const r = BASE[big] / BASE[small]
  const n = rng.int(1, 9)
  return rng.chance(0.5) ? convQuestion(kpId, 'length', d, n, big, small, rng) : convQuestion(kpId, 'length', d, n * r, small, big, rng)
}

/** 锯木料：m 米锯成长度相同的 k 根，每根几分米（课本：2 米锯成 4 根做凳子腿） */
const WOOD: [number, number][] = [
  [1, 2],
  [1, 5],
  [2, 4],
  [2, 5],
  [3, 5],
  [3, 6],
  [4, 5],
  [4, 8],
  [2, 10],
  [3, 10],
]
function woodQ(d: Difficulty, rng: RNG): Question {
  const [m, k] = rng.pick(WOOD)
  const value = (m * 10) / k
  return numberQuestion({
    kpId: KP_MMDM,
    type: 'length',
    difficulty: d,
    sig: `wood-${m}-${k}`,
    stem: [text('m3.len.wood', { m, k })],
    value,
    rng,
    min: 1,
    max: 100,
    smart: [(m * 100) / k, m * k, k, m * 10].filter((x) => isWhole(x) && x !== value),
  })
}

defineGenerator(KP_MMDM, (d, rng) => {
  const roll = rng.next()
  if (d === 1) {
    // 课本这一节：量一量、1 厘米 = 10 毫米 / 1 分米 = 10 厘米 / 1 米 = 10 分米、例 1 与做一做的换算（含 11 厘米 = 1 分米 1 厘米）、
    // 选毫米 / 厘米 / 分米（练习五 2、6）、锯木料（做一做 3）
    if (roll < 0.28) return rulerQ(d, rng)
    if (roll < 0.53) return oneStep(KP_MMDM, d, rng, MMDM_STEPS)
    if (roll < 0.6) {
      const [ua, ub] = rng.pick<[Unit, Unit]>([...MMDM_STEPS, ['m', 'cm']])
      return rateQuestion(KP_MMDM, 'length', d, ua, ub, rng)
    }
    if (roll < 0.8) return chooseUnitQ(KP_MMDM, d, rng, SMALL_UNITS)
    if (roll < 0.9) return woodQ(d, rng)
    return splitQ(d, rng)
  }
  if (d === 2) {
    if (roll < 0.25) return rulerQ(d, rng)
    if (roll < 0.4) return compoundQ(d, rng)
    if (roll < 0.55) return splitQ(d, rng)
    if (roll < 0.7)
      return twoLevel(KP_MMDM, d, rng, [
        ['m', 'cm'],
        ['dm', 'mm'],
      ])
    if (roll < 0.85) return chooseUnitQ(KP_MMDM, d, rng, SMALL_UNITS)
    return judgeQ(KP_MMDM, 'length', d, rng, thingsIn(SMALL_UNITS), ORDER, 'm3.len.it')
  }
  if (roll < 0.3) return rulerQ(d, rng)
  if (roll < 0.6)
    return twoLevel(KP_MMDM, d, rng, [
      ['m', 'cm'],
      ['dm', 'mm'],
    ])
  if (roll < 0.8) return woodQ(d, rng)
  return judgeQ(KP_MMDM, 'length', d, rng, thingsIn(SMALL_UNITS), ORDER, 'm3.len.it')
})

// ── 千米的认识 ──

/** 几个 n 米是 1 千米 */
function hundredsQ(d: Difficulty, rng: RNG, ns: number[]): Question {
  const n = rng.pick(ns)
  const value = 1000 / n
  return numberQuestion({
    kpId: KP_KM,
    type: 'length',
    difficulty: d,
    sig: `per-${n}`,
    stem: [text('m3.km.hundreds', { n })],
    value,
    rng,
    min: 1,
    max: 100,
    smart: [value * 10, 100 / n >= 1 ? 100 / n : value + 5, value + 1].filter((x) => isWhole(x) && x !== value),
  })
}

/** 跑道一圈 400 米，跑 n 圈是几千米（n 是 5 的倍数） */
function trackQ(d: Difficulty, rng: RNG): Question {
  const n = rng.pick([5, 10, 15, 20])
  const value = (n * 400) / 1000
  return numberQuestion({
    kpId: KP_KM,
    type: 'length',
    difficulty: d,
    sig: `track-${n}`,
    stem: [text('m3.km.track', { n })],
    value,
    rng,
    min: 1,
    max: 20,
    smart: [n, value * 2, value + 1, value - 1].filter((x) => x > 0 && x !== value),
  })
}

/** 游泳池 n 米，游 1 千米要几个来回（一个来回 = 2n 米） */
function poolQ(d: Difficulty, rng: RNG): Question {
  const n = rng.pick([25, 50, 100])
  const value = 1000 / (2 * n)
  return numberQuestion({
    kpId: KP_KM,
    type: 'length',
    difficulty: d,
    sig: `pool-${n}`,
    stem: [text('m3.km.pool', { n }), text('m3.km.roundTrip')],
    value,
    rng,
    min: 1,
    max: 60,
    smart: [1000 / n, value + 5, value - 5].filter((x) => isWhole(x) && x !== value),
  })
}

/** 千米和米的加减：1 千米 - 700 米、2 千米 + 50 米 */
function kmAddSubQ(d: Difficulty, rng: RNG): Question {
  const a = rng.int(1, d === 2 ? 3 : 5)
  const plus = rng.chance(0.35)
  const b = plus ? rng.int(1, 9) * (rng.chance(0.5) ? 100 : 10) : rng.int(1, 9) * 100
  const value = plus ? a * 1000 + b : a * 1000 - b
  return numberQuestion({
    kpId: KP_KM,
    type: 'length',
    difficulty: d,
    sig: `kmm-${a}${plus ? '+' : '-'}${b}`,
    stem: [text(plus ? 'm3.u.add' : 'm3.u.sub', { a, ua: unitL('km'), b, ub: unitL('m'), uc: unitL('m') })],
    value,
    rng,
    min: 1,
    max: 10000,
    smart: [plus ? a + b : Math.abs(a - b), value + 100, value - 100, plus ? a * 100 + b : a * 100 - b].filter((x) => x > 0 && x !== value),
  })
}

// ── 估计距离（例 3 及练习六）──

/**
 * 估计距离：先找一个长度作标准（课本 p26 例 3 的三种标准）——一步大约 50 厘米、两步大约 1 米；每分钟大约走 70 米；
 * 每站大约 500 米。第 1 档照课本：走几百步、走 10 分钟（「10 个 70 米」）、坐几站；第 2 档多出每分钟 100 米走几分钟、
 * 反过来问大约要走多少步。乘法只用「几个十 / 几个百」（多位数乘一位数在下一单元）。
 */
function estimateQ(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (roll < 0.34) {
    if (d >= 2 && rng.chance(0.4)) {
      // 反过来：大约 m 米，一步大约 50 厘米，大约要走多少步
      const m = rng.int(1, 6) * 100
      const value = m * 2
      return numberQuestion({ kpId: KP_UNIT, type: 'length', difficulty: d, sig: `stepsBack-${m}`, stem: [text('m3.km.stepsBack', { m })], value, rng, min: 1, max: 5000, smart: [m / 2, m, m * 50].filter((x) => isWhole(x) && x !== value) })
    }
    const n = rng.pick([200, 400, 600, 800, 1000, 1200])
    const value = n / 2
    return numberQuestion({ kpId: KP_UNIT, type: 'length', difficulty: d, sig: `steps-${n}`, stem: [text('m3.km.steps', { n })], value, rng, min: 1, max: 5000, smart: [n * 50, n, n * 2, value + 100] })
  }
  if (roll < 0.67) {
    // 第 1 档照课本走 10 分钟；第 2 档也有每分钟 100 米、走几分钟
    const fast = d >= 2 && rng.chance(0.5)
    const v = fast ? 100 : rng.pick([50, 60, 70, 70, 80, 90])
    const t = fast ? rng.int(3, 15) : 10
    const value = v * t
    return numberQuestion({ kpId: KP_UNIT, type: 'length', difficulty: d, sig: `mins-${v}-${t}`, stem: [text('m3.km.minutes', { v, t })], value, rng, min: 1, max: 5000, smart: [v + t, value + v, value - v, value * 10].filter((x) => isWhole(x) && x !== value) })
  }
  const n = rng.int(2, 6)
  const value = n * 500
  return numberQuestion({ kpId: KP_UNIT, type: 'length', difficulty: d, sig: `stops-${n}`, stem: [text('m3.km.stops', { n })], value, rng, min: 1, max: 10000, smart: [n + 500, value + 500, value - 500] })
}

/** 7 时出发，每分钟走 v 米，d 千米，7 时 m 分能走到吗（能 / 不能；练习六 7：3 千米、每分钟 100 米、7:45） */
function lateQ(d: Difficulty, rng: RNG): Question {
  for (;;) {
    const [km, v] = rng.pick<[number, number]>([
      [1, 50],
      [2, 50],
      [1, 100],
      [2, 100],
      [3, 100],
      [3, 60],
      [2, 80],
    ])
    const need = (km * 1000) / v
    const m = rng.int(3, 11) * 5
    if (!Number.isInteger(need) || need > 55 || Math.abs(need - m) < 5) continue
    const can = need <= m
    return labelQuestion({
      kpId: KP_UNIT,
      type: 'length',
      difficulty: d,
      sig: `late-${km}-${v}-${m}`,
      stem: [text('m3.km.late', { d: km, v, m })],
      correct: { k: can ? 'm3.opt.can' : 'm3.opt.cannot' },
      distractors: [{ k: can ? 'm3.opt.cannot' : 'm3.opt.can' }],
      rng,
    })
  }
}

defineGenerator(KP_KM, (d, rng) => {
  const roll = rng.next()
  if (d === 1) {
    // 课本这一节：跑道一圈 400 米、1 千米 = 1000 米、例 2 的换算、几个 100 米是 1 千米、选米 / 千米（练习七 1）
    if (roll < 0.24) return convQuestion(KP_KM, 'length', d, rng.int(1, 9), 'km', 'm', rng)
    if (roll < 0.48) return convQuestion(KP_KM, 'length', d, rng.int(1, 9) * 1000, 'm', 'km', rng)
    if (roll < 0.54) return rateQuestion(KP_KM, 'length', d, 'km', 'm', rng)
    if (roll < 0.68) return hundredsQ(d, rng, [100, 200, 500])
    if (roll < 0.88) return chooseUnitQ(KP_KM, d, rng, BIG_UNITS)
    return trackQ(d, rng)
  }
  if (d === 2) {
    if (roll < 0.2) return trackQ(d, rng)
    if (roll < 0.4) return poolQ(d, rng)
    if (roll < 0.65) return kmAddSubQ(d, rng)
    if (roll < 0.8) return chooseUnitQ(KP_KM, d, rng, BIG_UNITS)
    return hundredsQ(d, rng, [100, 200, 250, 500])
  }
  if (roll < 0.4) return kmAddSubQ(d, rng)
  if (roll < 0.7) return poolQ(d, rng)
  return judgeQ(KP_KM, 'length', d, rng, thingsIn(BIG_UNITS), ORDER, 'm3.len.it')
})

// ── 选单位（并进「毫米、分米的认识」与「千米的认识」）──

export interface Thing {
  id: string
  icon?: string
  n: number
  unit: Unit
  /** 另一个也勉强说得通的单位：不拿来当错的（游泳池 50 分米 = 5 米，小的儿童池也有） */
  alsoOk?: Unit[]
}
/** 每样东西只有一个单位说得通（两种单位都说得通的——比如数学书的长用厘米、毫米都行——不收） */
export const LENGTH_THINGS: Thing[] = [
  { id: 'ant', icon: '🐜', n: 6, unit: 'mm' },
  { id: 'pencilThick', icon: '✏️', n: 7, unit: 'mm' },
  { id: 'book', icon: '📖', n: 6, unit: 'mm' },
  { id: 'card', icon: '💳', n: 1, unit: 'mm' },
  { id: 'dict', icon: '📕', n: 40, unit: 'mm' },
  { id: 'brush', icon: '🪥', n: 16, unit: 'cm' },
  { id: 'pencil', icon: '✏️', n: 18, unit: 'cm' },
  { id: 'phone', icon: '📱', n: 15, unit: 'cm' },
  { id: 'banana', icon: '🍌', n: 20, unit: 'cm' },
  { id: 'egg', icon: '🥚', n: 6, unit: 'cm' },
  { id: 'towel', n: 70, unit: 'cm' },
  { id: 'desk', n: 70, unit: 'cm' },
  { id: 'cup', icon: '🥛', n: 1, unit: 'dm' },
  { id: 'step', icon: '👣', n: 5, unit: 'dm' },
  { id: 'bag', icon: '🎒', n: 4, unit: 'dm' },
  { id: 'bridge', icon: '🌉', n: 30, unit: 'm' },
  { id: 'door', icon: '🚪', n: 2, unit: 'm' },
  { id: 'tree', icon: '🌳', n: 10, unit: 'm' },
  { id: 'bus', icon: '🚌', n: 12, unit: 'm' },
  { id: 'pool', icon: '🏊', n: 50, unit: 'm', alsoOk: ['dm'] },
  { id: 'marathon', icon: '🏃', n: 42, unit: 'km' },
  { id: 'train', icon: '🚄', n: 300, unit: 'km' },
  { id: 'car', icon: '🚗', n: 80, unit: 'km' },
  { id: 'city', icon: '🛣️', n: 120, unit: 'km' },
]

/** 一样东西的那句话：u 是单位（问的时候是横线） */
export function thingStem(prefix: string, t: Thing, u: LStr | string): StemPart[] {
  const parts: StemPart[] = []
  if (t.icon) parts.push({ kind: 'picture', icon: t.icon })
  parts.push(text(`${prefix}.${t.id}`, { n: t.n, u }))
  return parts
}

/** 「毫米、分米的认识」选的单位（练习五 2、6：杯子高 1 分米、铅笔粗 7 毫米、牙刷长 16 厘米）与「千米的认识」选的单位 */
export const SMALL_UNITS: Unit[] = ['mm', 'cm', 'dm']
export const BIG_UNITS: Unit[] = ['m', 'km']
/** 正确单位在这几个里的东西 */
const thingsIn = (units: Unit[]): Thing[] => LENGTH_THINGS.filter((t) => units.includes(t.unit))

/**
 * 选单位：东西只从这一节的单位里挑。选项——毫米、厘米、分米三个都给（第 2 档再加米）；米、千米两个再加厘米
 * （第 2 档再加分米）。「也说得通」的单位不当错的。
 */
function chooseUnitQ(kpId: string, d: Difficulty, rng: RNG, units: Unit[]): Question {
  const t = rng.pick(thingsIn(units))
  const extra: Unit[] = units === SMALL_UNITS ? (d >= 2 ? ['m'] : []) : d >= 2 ? ['cm', 'dm'] : ['cm']
  const wrong = [...units, ...extra].filter((u) => u !== t.unit && !t.alsoOk?.includes(u))
  return labelQuestion({
    kpId,
    type: 'length',
    difficulty: d,
    sig: `unit-${t.id}`,
    stem: [...thingStem('m3.len.it', t, BLANK), text('m3.u.which')],
    correct: unitL(t.unit),
    distractors: wrong.map(unitL),
    rng,
  })
}

/** 这样说对吗：一样东西配上对的单位或挨着的错单位（课本：毛巾长 7 厘米 ×、字典厚 40 毫米 √） */
export function judgeQ(kpId: string, type: QuestionType, d: Difficulty, rng: RNG, things: Thing[], order: Unit[], prefix: string): Question {
  const t = rng.pick(things)
  const right = rng.chance(0.45)
  const i = order.indexOf(t.unit)
  const u = right ? t.unit : rng.pick(order.filter((x) => x !== t.unit && !t.alsoOk?.includes(x) && Math.abs(order.indexOf(x) - i) <= 2))
  return labelQuestion({
    kpId,
    type,
    difficulty: d,
    sig: `judge-${t.id}-${u}`,
    stem: [...thingStem(prefix, t, unitL(u)), text('m3.u.isRight')],
    correct: { k: right ? 'm3.opt.right' : 'm3.opt.wrong' },
    distractors: [{ k: right ? 'm3.opt.wrong' : 'm3.opt.right' }],
    rng,
  })
}

/** 行 1 千米要多少时间：步行 15 分、骑车 4 分、坐汽车 1 分（选项：几秒 / 几分 / 1 小时） */
const WAYS: { id: 'walk' | 'bike' | 'car'; icon: string; n: number }[] = [
  { id: 'walk', icon: '🚶', n: 15 },
  { id: 'bike', icon: '🚲', n: 4 },
  { id: 'car', icon: '🚗', n: 1 },
]
function timeQ(d: Difficulty, rng: RNG): Question {
  const w = rng.pick(WAYS)
  return labelQuestion({
    kpId: KP_UNIT,
    type: 'length',
    difficulty: d,
    sig: `time-${w.id}`,
    stem: [text('m3.km.time'), { kind: 'picture', icon: w.icon }, text(`m3.km.${w.id}`)],
    correct: { k: 'm3.km.min', p: { n: w.n } },
    distractors: [{ k: 'm3.km.sec', p: { n: w.n } }, { k: 'm3.km.hour' }],
    rng,
  })
}

/** 练习七 3 (3)：小红家和奶奶家相距 50 千米，她最好步行去（不对） */
function walkFarQ(d: Difficulty, rng: RNG): Question {
  return labelQuestion({
    kpId: KP_UNIT,
    type: 'length',
    difficulty: d,
    sig: 'walk-far',
    stem: [text('m3.km.walkFar'), text('m3.u.isRight')],
    correct: { k: 'm3.opt.wrong' },
    distractors: [{ k: 'm3.opt.right' }],
    rng,
  })
}

// 估计距离（m3s1-03-choose-unit，id 沿用原来「填合适的长度单位」的；选单位并进了前两个知识点）
defineGenerator(KP_UNIT, (d, rng) => {
  const roll = rng.next()
  if (d === 1) {
    if (roll < 0.55) return estimateQ(d, rng)
    if (roll < 0.75) return timeQ(d, rng)
    return lateQ(d, rng)
  }
  if (d === 2) {
    if (roll < 0.5) return estimateQ(d, rng)
    if (roll < 0.8) return lateQ(d, rng)
    if (roll < 0.9) return timeQ(d, rng)
    return walkFarQ(d, rng)
  }
  if (roll < 0.5) return estimateQ(d, rng)
  if (roll < 0.85) return lateQ(d, rng)
  return walkFarQ(d, rng)
})

// ── 长度单位的换算（整理和复习、练习七）──

/** 带单位的加减：20 毫米 + 30 毫米 = 几厘米、3 米 - 1 米 = 几分米、2 米 + 3 厘米 = 几厘米 */
function unitAddSubQ(d: Difficulty, rng: RNG): Question {
  const kind = rng.int(0, 2)
  let a: number, b: number, ua: Unit, ub: Unit, uc: Unit, plus: boolean
  if (kind === 0) {
    // 同单位相加，化成大一级的单位（和是整十）
    const [big, small] = rng.pick(MMDM_STEPS)
    const x = rng.int(1, 7)
    const y = rng.int(1, 9 - x)
    ;[a, b, ua, ub, uc, plus] = [x * 10, y * 10, small, small, big, true]
  } else if (kind === 1) {
    // 同单位相减，化成小一级的单位
    const [big, small] = rng.pick(MMDM_STEPS)
    const x = rng.int(2, 9)
    const y = rng.int(1, x - 1)
    ;[a, b, ua, ub, uc, plus] = [x, y, big, big, small, false]
  } else {
    // 复名数相加减：2 米 + 3 厘米 = 203 厘米、1 米 - 3 分米 = 7 分米
    const pair = rng.pick<[Unit, Unit]>([
      ['m', 'cm'],
      ['m', 'dm'],
      ['dm', 'cm'],
    ])
    const r = BASE[pair[0]] / BASE[pair[1]]
    plus = rng.chance(0.5)
    a = rng.int(1, plus ? 5 : 3)
    b = plus ? rng.int(1, r - 1) : rng.int(1, a * r - 1)
    ;[ua, ub, uc] = [pair[0], pair[1], pair[1]]
  }
  const value = ((plus ? a * BASE[ua] + b * BASE[ub] : a * BASE[ua] - b * BASE[ub]) as number) / BASE[uc]
  return numberQuestion({
    kpId: KP_CONV,
    type: 'length',
    difficulty: d,
    sig: `as-${a}${ua}${plus ? '+' : '-'}${b}${ub}-${uc}`,
    stem: [text(plus ? 'm3.u.add' : 'm3.u.sub', { a, ua: unitL(ua), b, ub: unitL(ub), uc: unitL(uc) })],
    value,
    rng,
    min: 1,
    max: 1000,
    smart: [plus ? a + b : a - b, value * 10, value / 10].filter((x) => isWhole(x) && x !== value),
  })
}

/** 绳子对折再对折：每段是四分之一，化成厘米 */
function foldQ(d: Difficulty, rng: RNG): Question {
  const dm = rng.pick([2, 4, 6, 8])
  const value = (dm * 10) / 4
  return numberQuestion({
    kpId: KP_CONV,
    type: 'length',
    difficulty: d,
    sig: `fold-${dm}`,
    stem: [text('m3.len.fold', { dm })],
    value,
    rng,
    min: 1,
    max: 100,
    smart: [(dm * 10) / 2, dm * 10, dm / 2, dm].filter((x) => isWhole(x) && x !== value),
  })
}

/** 两块木板拼接、重叠一段（课本：各 8 分米，重叠 15 厘米，长 145 厘米） */
function boardsQ(d: Difficulty, rng: RNG): Question {
  const dm = rng.int(5, 9)
  const cm = rng.pick([5, 10, 15, 20])
  const value = dm * 20 - cm
  return numberQuestion({
    kpId: KP_CONV,
    type: 'length',
    difficulty: d,
    sig: `boards-${dm}-${cm}`,
    stem: [text('m3.len.boards', { dm, cm })],
    value,
    rng,
    min: 1,
    max: 400,
    smart: [dm * 20 + cm, dm * 20, dm * 20 - 2 * cm, dm * 2 * 10 - cm * 2],
  })
}

defineGenerator(KP_CONV, (d, rng) => {
  const roll = rng.next()
  if (d === 1) {
    if (roll < 0.55) return oneStep(KP_CONV, d, rng, ALL_STEPS)
    const [small, big] = rng.pick<[Unit, Unit]>([
      ['mm', 'cm'],
      ['cm', 'dm'],
      ['dm', 'm'],
    ])
    const [a, ua, b, ub] = comparePair(rng, small, big)
    return compareQuestion(KP_CONV, 'compare', d, a, ua, b, ub, rng)
  }
  if (d === 2) {
    if (roll < 0.25)
      return twoLevel(KP_CONV, d, rng, [
        ['m', 'mm'],
        ['dm', 'mm'],
        ['m', 'cm'],
        ['km', 'm'],
      ])
    if (roll < 0.5) return unitAddSubQ(d, rng)
    // 练习五 8、9：绳子对折再对折、两块木板重叠
    if (roll < 0.6) return foldQ(d, rng)
    if (roll < 0.7) return boardsQ(d, rng)
    // 练习七 3：「一本小学生字典厚 40 毫米」「一条毛巾长 7 厘米」对不对
    if (roll < 0.8) return judgeQ(KP_CONV, 'length', d, rng, LENGTH_THINGS, ORDER, 'm3.len.it')
    const [small, big] = rng.pick<[Unit, Unit]>([
      ['mm', 'dm'],
      ['cm', 'm'],
      ['m', 'km'],
      ['mm', 'cm'],
      ['dm', 'm'],
    ])
    const [a, ua, b, ub] = comparePair(rng, small, big)
    return compareQuestion(KP_CONV, 'compare', d, a, ua, b, ub, rng)
  }
  if (roll < 0.3) return foldQ(d, rng)
  if (roll < 0.6) return boardsQ(d, rng)
  if (roll < 0.8) return unitAddSubQ(d, rng)
  const [a, ua, b, ub] = comparePair(rng, 'mm', 'm')
  return compareQuestion(KP_CONV, 'compare', d, a, ua, b, ub, rng)
})
