import type { Difficulty, LStr, Question, QuestionType, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 毫米、分米和千米（三上三）：毫米、分米的认识（量一量、进率）、千米的认识（进率、跑道 / 泳池 / 估计距离）、
// 填合适的长度单位、长度单位的换算与比较。本单元没有小数，换算的答案都是整数。
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

/** 量一量：毫米尺上压着一条线段 */
function rulerQ(d: Difficulty, rng: RNG): Question {
  let from: number
  let to: number
  if (d === 1) {
    from = 0
    to = rng.int(2, 7) * 10
  } else if (d === 2 && rng.chance(0.5)) {
    // 从整厘米开始（课本：橡皮压在 1 到 6 上）
    const s = rng.int(1, 3)
    from = s * 10
    to = from + rng.int(2, 7 - s) * 10
  } else if (d === 2) {
    from = 0
    to = rng.int(12, 68)
    if (to % 10 === 0) to += 4
  } else {
    from = rng.int(3, 25)
    to = from + rng.int(14, 45)
    if (from % 10 === 0 && to % 10 === 0) to += 3
  }
  const len = to - from
  const length = Math.max(6, Math.min(8, Math.ceil(to / 10) + 1))
  const ruler: StemPart = { kind: 'ruler', length, from, to, mm: true }
  if (d >= 2 && len % 10 !== 0 && len > 10 && rng.chance(0.5)) {
    // 「这条线段是 2 厘米几毫米？」
    const cm = Math.floor(len / 10)
    const mm = len % 10
    return numberQuestion({
      kpId: KP_MMDM,
      type: 'length',
      difficulty: d,
      sig: `rcm-${from}-${to}`,
      stem: [text('m3.len.rulerCmMm', { cm }), ruler],
      value: mm,
      rng,
      min: 1,
      max: 9,
      smart: [10 - mm, cm, (to % 10) || 1],
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
    if (roll < 0.3) return rulerQ(d, rng)
    if (roll < 0.9) return oneStep(KP_MMDM, d, rng, MMDM_STEPS)
    const [ua, ub] = rng.pick<[Unit, Unit]>([...MMDM_STEPS, ['m', 'cm']])
    return rateQuestion(KP_MMDM, 'length', d, ua, ub, rng)
  }
  if (d === 2) {
    if (roll < 0.3) return rulerQ(d, rng)
    if (roll < 0.55) return compoundQ(d, rng)
    if (roll < 0.8) return splitQ(d, rng)
    return oneStep(KP_MMDM, d, rng, MMDM_STEPS)
  }
  if (roll < 0.3) return rulerQ(d, rng)
  if (roll < 0.7)
    return twoLevel(KP_MMDM, d, rng, [
      ['m', 'cm'],
      ['dm', 'mm'],
    ])
  return woodQ(d, rng)
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

/** 估计距离（例 3）：走几步 / 走几分钟 / 坐几站 */
function estimateQ(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (roll < 0.34) {
    const n = rng.pick([200, 400, 600, 800, 1000, 1200])
    const value = n / 2
    return numberQuestion({ kpId: KP_KM, type: 'length', difficulty: d, sig: `steps-${n}`, stem: [text('m3.km.steps', { n })], value, rng, min: 1, max: 5000, smart: [n * 50, n, n * 2, value + 100] })
  }
  if (roll < 0.67) {
    const v = rng.pick([50, 60, 70, 80])
    const t = rng.int(5, 15)
    const value = v * t
    return numberQuestion({ kpId: KP_KM, type: 'length', difficulty: d, sig: `mins-${v}-${t}`, stem: [text('m3.km.minutes', { v, t })], value, rng, min: 1, max: 5000, smart: [v + t, value + v, value - v] })
  }
  const n = rng.int(2, 6)
  const value = n * 500
  return numberQuestion({ kpId: KP_KM, type: 'length', difficulty: d, sig: `stops-${n}`, stem: [text('m3.km.stops', { n })], value, rng, min: 1, max: 10000, smart: [n + 500, value + 500, value - 500] })
}

/** 7 时出发，每分钟走 v 米，d 千米，7 时 m 分能走到吗（能 / 不能） */
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
      kpId: KP_KM,
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
    if (roll < 0.38) return convQuestion(KP_KM, 'length', d, rng.int(1, 9), 'km', 'm', rng)
    if (roll < 0.76) return convQuestion(KP_KM, 'length', d, rng.int(1, 9) * 1000, 'm', 'km', rng)
    if (roll < 0.86) return rateQuestion(KP_KM, 'length', d, 'km', 'm', rng)
    return hundredsQ(d, rng, [100, 200, 500])
  }
  if (d === 2) {
    if (roll < 0.25) return trackQ(d, rng)
    if (roll < 0.5) return poolQ(d, rng)
    if (roll < 0.8) return kmAddSubQ(d, rng)
    return hundredsQ(d, rng, [100, 200, 250, 500])
  }
  if (roll < 0.6) return estimateQ(d, rng)
  if (roll < 0.85) return lateQ(d, rng)
  return kmAddSubQ(d, rng)
})

// ── 填合适的长度单位 ──

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

/** 离正确单位远的（第 1 档，一眼就能排除）/ 挨着的（第 2 档，容易混） */
function unitOptions(order: Unit[], t: Thing, near: boolean, rng: RNG): Unit[] {
  const correct = t.unit
  const i = order.indexOf(correct)
  if (near) {
    const byDist = rng.shuffle(order.filter((u) => u !== correct && !t.alsoOk?.includes(u))).sort((a, b) => Math.abs(order.indexOf(a) - i) - Math.abs(order.indexOf(b) - i))
    return byDist.slice(0, 3)
  }
  return rng.shuffle(order.filter((u) => Math.abs(order.indexOf(u) - i) >= 2)).slice(0, 2)
}

function chooseUnitQ(d: Difficulty, rng: RNG): Question {
  const t = rng.pick(LENGTH_THINGS)
  return labelQuestion({
    kpId: KP_UNIT,
    type: 'length',
    difficulty: d,
    sig: `unit-${t.id}`,
    stem: [...thingStem('m3.len.it', t, BLANK), text('m3.u.which')],
    correct: unitL(t.unit),
    distractors: unitOptions(ORDER, t, d >= 2, rng).map(unitL),
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

defineGenerator(KP_UNIT, (d, rng) => {
  if (d <= 2) return chooseUnitQ(d, rng)
  const roll = rng.next()
  if (roll < 0.6) return judgeQ(KP_UNIT, 'length', d, rng, LENGTH_THINGS, ORDER, 'm3.len.it')
  if (roll < 0.9) return timeQ(d, rng)
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
})

// ── 长度单位的换算与比较 ──

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
    if (roll < 0.35)
      return twoLevel(KP_CONV, d, rng, [
        ['m', 'mm'],
        ['dm', 'mm'],
        ['m', 'cm'],
        ['km', 'm'],
      ])
    if (roll < 0.65) return unitAddSubQ(d, rng)
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
