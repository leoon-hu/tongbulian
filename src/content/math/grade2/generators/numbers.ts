import type { Difficulty, LStr, Question, SeqCell } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 万以内数的认识：1000 以内、10000 以内（数的组成、相邻数、接着数、数位）、大小比较、整百整千数加减法
// ─────────────────────────────────────────────────────────────

type Place = 'k' | 'h' | 't' | 'o'
const PLACE_VALUE: Record<Place, number> = { k: 1000, h: 100, t: 10, o: 1 }

/** 「n 个千」这样的部件（词条 num.unit.<位>） */
function part(place: Place, n: number): LStr {
  return { k: `num.unit.${place}`, p: { n } }
}

/**
 * 数的组成：把各位的部件用 2 / 3 / 4 段模板拼成一句（位数为 0 的不说）。
 * 模板只有三种形态，拼音才能逐字对齐。
 */
function compositionQuestion(kpId: string, d: Difficulty, digits: Partial<Record<Place, number>>, rng: RNG): Question {
  const places = (['k', 'h', 't', 'o'] as Place[]).filter((p) => (digits[p] ?? 0) > 0)
  const value = places.reduce((s, p) => s + digits[p]! * PLACE_VALUE[p], 0)
  const parts = places.map((p) => part(p, digits[p]!))
  const key = parts.length === 4 ? 'q.num.compose4' : parts.length === 3 ? 'q.num.compose3' : 'q.num.compose2'
  const p: Record<string, LStr> = { p1: parts[0]!, p2: parts[1]! }
  if (parts[2]) p.p3 = parts[2]
  if (parts[3]) p.p4 = parts[3]
  // 常见错误：把各位数字直接拼在一起（漏掉 0 占位）、少一个 0
  const glued = Number(places.map((pl) => digits[pl]).join(''))
  return numberQuestion({
    kpId,
    type: 'count',
    difficulty: d,
    sig: `comp-${value}`,
    stem: [{ kind: 'text', text: { k: key, p } }],
    value,
    rng,
    min: 1,
    max: 10000,
    smart: [glued, value + 100, value - 100, value + 1000],
  })
}

/** 相邻数：n 的后面 / 前面一个数 */
function neighborQuestion(kpId: string, d: Difficulty, n: number, after: boolean, rng: RNG): Question {
  const value = after ? n + 1 : n - 1
  return numberQuestion({
    kpId,
    type: 'count',
    difficulty: d,
    sig: `${after ? 'after' : 'before'}-${n}`,
    stem: [{ kind: 'text', text: { k: after ? 'q.num.after' : 'q.num.before', p: { n } } }],
    value,
    rng,
    min: 0,
    max: 10000,
    smart: [n, after ? n - 1 : n + 1, value + 10, value - 10],
  })
}

/** 接着数：等差序列（步长 1 / 10 / 100 / 1000）挖掉一格 */
function sequenceQuestion(kpId: string, d: Difficulty, start: number, step: number, rng: RNG): Question {
  const len = 4
  const values = Array.from({ length: len }, (_, i) => start + step * i)
  const blankPos = rng.chance(0.7) ? len - 1 : rng.int(1, len - 2)
  const correct = values[blankPos]!
  const cells: SeqCell[] = values.map((v, i) => (i === blankPos ? { kind: 'blank' } : { kind: 'item', label: String(v) }))
  return numberQuestion({
    kpId,
    type: 'pattern',
    difficulty: d,
    sig: `seq-${values.join(',')}-${blankPos}`,
    stem: [
      { kind: 'text', text: { k: 'q.num.seq' } },
      { kind: 'sequence', cells },
    ],
    value: correct,
    rng,
    min: 0,
    max: 10000,
    smart: [correct + step, correct - step, correct + 1, correct - 1],
  })
}

/** 数位：n 的百位上是几 */
function placeDigitQuestion(kpId: string, d: Difficulty, n: number, place: Place, rng: RNG): Question {
  const value = Math.floor(n / PLACE_VALUE[place]) % 10
  const others = (['k', 'h', 't', 'o'] as Place[]).filter((p) => p !== place && PLACE_VALUE[p] <= n).map((p) => Math.floor(n / PLACE_VALUE[p]) % 10)
  return numberQuestion({
    kpId,
    type: 'count',
    difficulty: d,
    sig: `place-${place}-${n}`,
    stem: [{ kind: 'text', text: { k: `q.num.place.${place}`, p: { n } } }],
    value,
    rng,
    min: 0,
    max: 9,
    smart: others,
  })
}

/** n 里面有几个百 / 千 */
function howManyQuestion(kpId: string, d: Difficulty, n: number, place: 'h' | 'k', rng: RNG): Question {
  const value = Math.floor(n / PLACE_VALUE[place])
  return numberQuestion({
    kpId,
    type: 'count',
    difficulty: d,
    sig: `howmany-${place}-${n}`,
    stem: [{ kind: 'text', text: { k: place === 'h' ? 'q.num.howManyHundreds' : 'q.num.howManyThousands', p: { n } } }],
    value,
    rng,
    min: 0,
    max: 10000,
    smart: [value * 10, value + 1, value - 1, n % PLACE_VALUE[place]],
  })
}

/** 固定的进率题：10 个十是几、10 个一百是几、10 个一千是几 */
const RATES: { key: string; value: number }[] = [
  { key: 'q.num.tenTens', value: 100 },
  { key: 'q.num.tenHundreds', value: 1000 },
  { key: 'q.num.tenThousands', value: 10000 },
]
function rateQuestion(kpId: string, d: Difficulty, rate: (typeof RATES)[number], rng: RNG): Question {
  return numberQuestion({
    kpId,
    type: 'count',
    difficulty: d,
    sig: rate.key,
    stem: [{ kind: 'text', text: { k: rate.key } }],
    value: rate.value,
    rng,
    min: 1,
    max: 10000,
    smart: [rate.value / 10, rate.value * 10, 10],
  })
}

// ── 1000 以内数的认识 ──
defineGenerator('m2s2-04-num-1000', (d, rng) => {
  const kpId = 'm2s2-04-num-1000'
  const roll = rng.next()
  if (roll < 0.35) {
    const h = rng.int(1, 9)
    const t = d === 1 ? rng.int(1, 9) : rng.int(0, 9)
    const o = d === 1 ? rng.int(1, 9) : rng.int(0, 9)
    if (t === 0 && o === 0) return compositionQuestion(kpId, d, { h, t: rng.int(1, 9) }, rng)
    return compositionQuestion(kpId, d, { h, t, o }, rng)
  }
  if (roll < 0.55) {
    // 相邻数；d2 起常出跨百的（…99 / …00）
    const crossing = d >= 2 && rng.chance(0.5)
    const after = rng.chance(0.5)
    const n = crossing ? (after ? rng.int(1, 9) * 100 - 1 : rng.int(1, 9) * 100) : rng.int(101, 998)
    return neighborQuestion(kpId, d, n, after, rng)
  }
  if (roll < 0.75) {
    const step = d === 1 ? rng.pick([1, 10]) : d === 2 ? rng.pick([10, 100]) : rng.pick([1, 10, 100])
    const start = step === 100 ? rng.int(1, 6) * 100 + rng.int(0, 9) * 10 : rng.int(10, 96) * 10 + (step === 1 ? rng.int(0, 6) : 0)
    return sequenceQuestion(kpId, d, Math.min(start, 1000 - step * 3), step, rng)
  }
  if (roll < 0.9) {
    const n = d === 1 ? rng.int(1, 9) * 100 : rng.int(101, 999)
    return rng.chance(0.5) ? howManyQuestion(kpId, d, n, 'h', rng) : placeDigitQuestion(kpId, d, n, rng.pick(['h', 't', 'o'] as Place[]), rng)
  }
  return rateQuestion(kpId, d, rng.pick(RATES.slice(0, 2)), rng)
})

// ── 10000 以内数的认识 ──
defineGenerator('m2s2-04-num-10000', (d, rng) => {
  const kpId = 'm2s2-04-num-10000'
  const roll = rng.next()
  if (roll < 0.35) {
    const k = rng.int(1, 9)
    const h = d === 1 ? rng.int(1, 9) : rng.int(0, 9)
    const t = d === 1 ? rng.int(1, 9) : rng.int(0, 9)
    const o = d === 1 ? rng.int(1, 9) : rng.int(0, 9)
    if (h === 0 && t === 0 && o === 0) return compositionQuestion(kpId, d, { k, o: rng.int(1, 9) }, rng)
    return compositionQuestion(kpId, d, { k, h, t, o }, rng)
  }
  if (roll < 0.55) {
    const crossing = d >= 2 && rng.chance(0.5)
    const after = rng.chance(0.5)
    const unit = d === 3 ? 1000 : 100
    const n = crossing ? (after ? rng.int(1, 9) * unit - 1 : rng.int(1, 9) * unit) : rng.int(1001, 9998)
    return neighborQuestion(kpId, d, n, after, rng)
  }
  if (roll < 0.75) {
    const step = d === 1 ? rng.pick([1, 100]) : d === 2 ? rng.pick([100, 1000]) : rng.pick([1, 10, 100, 1000])
    const start = step === 1000 ? rng.int(1, 6) * 1000 + rng.int(0, 9) * 100 : rng.int(10, 96) * 100 + rng.int(0, 6) * (step === 1 ? 1 : 10)
    return sequenceQuestion(kpId, d, Math.min(start, 10000 - step * 3), step, rng)
  }
  if (roll < 0.9) {
    const n = d === 1 ? rng.int(1, 9) * 1000 : rng.int(1001, 9999)
    return rng.chance(0.5) ? howManyQuestion(kpId, d, n, 'k', rng) : placeDigitQuestion(kpId, d, n, rng.pick(['k', 'h', 't', 'o'] as Place[]), rng)
  }
  return rateQuestion(kpId, d, rng.pick(RATES.slice(1)), rng)
})

// ── 万以内数的大小比较 ──
function genCompare(d: Difficulty, rng: RNG): Question {
  const kpId = 'm2s2-04-compare'
  if (d >= 2 && rng.chance(0.3)) {
    // 四个数里挑最大 / 最小
    const nums = new Set<number>()
    const cap = d === 2 ? 1000 : 10000
    while (nums.size < 4) nums.add(rng.int(100, cap - 1))
    const list = [...nums]
    const largest = rng.chance(0.5)
    const target = largest ? Math.max(...list) : Math.min(...list)
    return labelQuestion({
      kpId,
      type: 'compare',
      difficulty: d,
      sig: `${largest ? 'max' : 'min'}-${list.sort((a, b) => a - b).join(',')}`,
      stem: [{ kind: 'text', text: { k: largest ? 'q.num.largest' : 'q.num.smallest' } }],
      correct: String(target),
      distractors: list.filter((n) => n !== target).map(String),
      rng,
    })
  }
  let x: number
  let y: number
  if (d === 1) {
    // 位数不同，或 1000 以内
    x = rng.int(100, 999)
    y = rng.chance(0.5) ? rng.int(1000, 9999) : rng.int(100, 999)
  } else if (d === 2) {
    // 位数相同，最高位不同
    const digits = rng.chance(0.5) ? 3 : 4
    const lo = digits === 3 ? 100 : 1000
    const hi = digits === 3 ? 999 : 9999
    x = rng.int(lo, hi)
    y = rng.int(lo, hi)
  } else {
    // 很接近：只差几十或几
    x = rng.int(1000, 9900)
    y = x + (rng.chance(0.5) ? 1 : -1) * rng.pick([1, 2, 5, 10, 20, 50])
    if (rng.chance(0.08)) y = x
  }
  if (rng.chance(0.5)) [x, y] = [y, x]
  const correct = x > y ? '>' : x < y ? '<' : '='
  return labelQuestion({
    kpId,
    type: 'compare',
    difficulty: d,
    sig: `cmp-${x}-${y}`,
    stem: [
      { kind: 'text', text: { k: 'q.num.cmpFill' } },
      { kind: 'expr', expr: `${x} ⬜ ${y}` },
    ],
    correct,
    distractors: ['>', '<', '='].filter((s) => s !== correct),
    rng,
  })
}
defineGenerator('m2s2-04-compare', genCompare)

// ── 整百、整千数加减法 ──
function genRoundAddSub(d: Difficulty, rng: RNG): Question {
  const kpId = 'm2s2-04-round-addsub'
  const unit = d === 1 ? 100 : d === 2 ? 1000 : rng.pick([100, 1000])
  const add = rng.chance(0.5)
  let a: number
  let b: number
  if (d === 3 && rng.chance(0.4)) {
    // 几千 ± 几百：3000 + 400、5600 − 600
    const k = rng.int(1, 9) * 1000
    const h = rng.int(1, 9) * 100
    if (add) {
      a = k
      b = h
    } else {
      a = k + h
      b = h
    }
  } else if (add) {
    // 不进位（d1 / d2）或可以进位（d3：800 + 700；几千相加不超过 10000）
    const max = d === 3 ? (unit === 100 ? 18 : 10) : 9
    const i = rng.int(1, max - 1)
    const j = rng.int(1, Math.min(9, max - i))
    a = i * unit
    b = j * unit
  } else {
    const i = d === 3 ? rng.int(2, unit === 100 ? 18 : 10) : rng.int(2, 9)
    const j = rng.int(1, Math.min(9, i - 1))
    a = i * unit
    b = j * unit
  }
  if (rng.chance(0.5) && add) [a, b] = [b, a]
  const value = add ? a + b : a - b
  return numberQuestion({
    kpId,
    type: 'arith',
    difficulty: d,
    sig: `${a}${add ? '+' : '-'}${b}`,
    stem: [{ kind: 'expr', expr: `${a} ${add ? '+' : '-'} ${b} = ?` }],
    value,
    rng,
    min: 0,
    max: 10000,
    smart: [value / 10, value * 10, value + unit, value - unit, add ? a - b : a + b],
  })
}
defineGenerator('m2s2-04-round-addsub', genRoundAddSub)
