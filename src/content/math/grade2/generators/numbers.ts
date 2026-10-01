import type { Difficulty, LStr, Question, SeqCell } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'
import { cnChars, cnWords } from '../numword'

// ─────────────────────────────────────────────────────────────
// 万以内数的认识：1000 以内、10000 以内（数的组成、读数写数、相邻数、接着数、数位）、大小比较和近似数、简单的加减法
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

/**
 * 读数、写数要练的数（例 2、例 7、例 8）：zeros = 0 没有 0；1 中间有一个 0（406、3069）；2 末尾有 0（590、2700）；
 * 3 中间两个 0、中间末尾都有 0 或整百整千（6009、2080、1050、7000）——课本强调的就是 0 怎么读、怎么写
 */
function readNumber(digits: 3 | 4, zeros: 0 | 1 | 2 | 3, rng: RNG): number {
  const nz = (): number => rng.int(1, 9)
  if (digits === 3) {
    if (zeros === 0) return nz() * 100 + nz() * 10 + nz()
    if (zeros === 1) return nz() * 100 + nz()
    if (zeros === 2) return nz() * 100 + nz() * 10
    return nz() * 100
  }
  if (zeros === 0) return nz() * 1000 + nz() * 100 + nz() * 10 + nz()
  if (zeros === 1) return rng.chance(0.5) ? nz() * 1000 + nz() * 10 + nz() : nz() * 1000 + nz() * 100 + nz()
  if (zeros === 2) return rng.chance(0.5) ? nz() * 1000 + nz() * 100 + nz() * 10 : nz() * 1000 + nz() * 100
  const r = rng.int(0, 4)
  return r <= 1 ? nz() * 1000 + nz() : r <= 3 ? nz() * 1000 + nz() * 10 : nz() * 1000
}

/** 按档位挑 0 的情况：第 1 档就有一半带 0（课本的重点），第 3 档都是两个 0 */
function zerosFor(d: Difficulty, rng: RNG): 0 | 1 | 2 | 3 {
  if (d === 3) return 3
  if (d === 2) return rng.pick([1, 2, 3] as const)
  return rng.pick([0, 0, 1, 2] as const)
}

/** 交换相邻两位得到的数（读错位的干扰项），首位不能是 0 */
function swaps(n: number): number[] {
  const s = String(n).split('')
  const out: number[] = []
  for (let i = 0; i + 1 < s.length; i++) {
    if (s[i] === s[i + 1]) continue
    const t = [...s]
    ;[t[i], t[i + 1]] = [t[i + 1]!, t[i]!]
    if (t[0] !== '0') out.push(Number(t.join('')))
  }
  return out
}

/** 读数：这个数读作什么（数写在大字卡上，不朗读——读出来就把答案说了）；干扰项是 0 读错了、数位读错了 */
function readQuestion(kpId: string, d: Difficulty, n: number, rng: RNG): Question {
  const correct = cnChars(n)
  const wrong: string[] = []
  const push = (w: string): void => {
    if (w !== correct && !wrong.includes(w) && wrong.length < 3) wrong.push(w)
  }
  push(cnChars(n, 'all'))
  push(cnChars(n, 'none'))
  for (const m of rng.shuffle(swaps(n))) push(cnChars(m))
  for (const m of [n + 10, n - 10, n + 100, n + 1]) push(cnChars(m))
  return labelQuestion({
    kpId,
    type: 'count',
    difficulty: d,
    sig: `read-${n}`,
    stem: [
      { kind: 'text', text: { k: 'q.num.readAs' } },
      { kind: 'hanzi', text: String(n) },
    ],
    correct: cnWords(correct),
    distractors: wrong.map(cnWords),
    rng,
  })
}

/** 写数：七千零一写作多少（常见错误：0 没写、写多了 0） */
function writeQuestion(kpId: string, d: Difficulty, n: number, rng: RNG): Question {
  const dropped = Number(String(n).replace(/0/g, '')) || n
  return numberQuestion({
    kpId,
    type: 'count',
    difficulty: d,
    sig: `write-${n}`,
    stem: [{ kind: 'text', text: { k: 'q.num.writeAs', p: { w: cnWords(cnChars(n)) } } }],
    value: n,
    rng,
    min: 1,
    max: 10000,
    smart: [dropped, ...swaps(n), n + 10, n * 10 <= 10000 ? n * 10 : n - 10],
  })
}

/** 写成几个整千、整百、整十和一相加（p45「475 = 400 + □ + 5」、p54「3247 = 3000 + 200 + 40 + 7」），问号挖掉一项 */
function expandQuestion(kpId: string, d: Difficulty, n: number, rng: RNG): Question {
  const terms = [1000, 100, 10, 1].map((pv) => (Math.floor(n / pv) % 10) * pv).filter((v) => v > 0)
  const at = rng.int(0, terms.length - 1)
  const value = terms[at]!
  const expr = `${n} = ${terms.map((v, i) => (i === at ? '?' : String(v))).join(' + ')}`
  const digit = String(value)[0]!
  return numberQuestion({
    kpId,
    type: 'count',
    difficulty: d,
    sig: `expand-${n}-${at}`,
    stem: [
      { kind: 'text', text: { k: 'q.num.expand' } },
      { kind: 'expr', expr },
    ],
    value,
    rng,
    min: 1,
    max: 9000,
    smart: [Number(digit), value * 10, value / 10 >= 1 ? value / 10 : value + 1],
  })
}

/** 固定的进率题：10 个十是几、10 个百是几、10 个千是几 */
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
  if (roll < 0.15) return readQuestion(kpId, d, readNumber(3, zerosFor(d, rng), rng), rng)
  if (roll < 0.28) return writeQuestion(kpId, d, readNumber(3, zerosFor(d, rng), rng), rng)
  if (roll < 0.34) return expandQuestion(kpId, d, readNumber(3, rng.pick([0, 0, 1, 2] as const), rng), rng)
  if (roll < 0.52) {
    const h = rng.int(1, 9)
    const t = d === 1 ? rng.int(1, 9) : rng.int(0, 9)
    const o = d === 1 ? rng.int(1, 9) : rng.int(0, 9)
    if (t === 0 && o === 0) return compositionQuestion(kpId, d, { h, t: rng.int(1, 9) }, rng)
    return compositionQuestion(kpId, d, { h, t, o }, rng)
  }
  if (roll < 0.65) {
    // 相邻数；常出跨百的（…99 / …00，做一做「从 198 一个一个地数到 203」）
    const crossing = rng.chance(d === 1 ? 0.3 : 0.5)
    const after = rng.chance(0.5)
    const n = crossing ? (after ? rng.int(1, 9) * 100 - 1 : rng.int(1, 9) * 100) : rng.int(101, 998)
    return neighborQuestion(kpId, d, n, after, rng)
  }
  if (roll < 0.8) {
    const step = d === 1 ? rng.pick([1, 10]) : d === 2 ? rng.pick([10, 100]) : rng.pick([1, 10, 100])
    const start = step === 100 ? rng.int(1, 6) * 100 + rng.int(0, 9) * 10 : rng.int(10, 96) * 10 + (step === 1 ? rng.int(0, 6) : 0)
    return sequenceQuestion(kpId, d, Math.min(start, 1000 - step * 3), step, rng)
  }
  if (roll < 0.94) {
    const n = d === 1 ? rng.int(1, 9) * 100 : rng.int(101, 999)
    return rng.chance(0.5) ? howManyQuestion(kpId, d, n, 'h', rng) : placeDigitQuestion(kpId, d, n, rng.pick(['h', 't', 'o'] as Place[]), rng)
  }
  return rateQuestion(kpId, d, rng.pick(RATES.slice(0, 2)), rng)
})

// ── 10000 以内数的认识 ──
defineGenerator('m2s2-04-num-10000', (d, rng) => {
  const kpId = 'm2s2-04-num-10000'
  const roll = rng.next()
  if (roll < 0.15) return readQuestion(kpId, d, readNumber(4, zerosFor(d, rng), rng), rng)
  if (roll < 0.28) return writeQuestion(kpId, d, readNumber(4, zerosFor(d, rng), rng), rng)
  if (roll < 0.34) return expandQuestion(kpId, d, readNumber(4, rng.pick([0, 0, 1, 2] as const), rng), rng)
  if (roll < 0.52) {
    const k = rng.int(1, 9)
    const h = d === 1 ? rng.int(1, 9) : rng.int(0, 9)
    const t = d === 1 ? rng.int(1, 9) : rng.int(0, 9)
    const o = d === 1 ? rng.int(1, 9) : rng.int(0, 9)
    if (h === 0 && t === 0 && o === 0) return compositionQuestion(kpId, d, { k, o: rng.int(1, 9) }, rng)
    return compositionQuestion(kpId, d, { k, h, t, o }, rng)
  }
  if (roll < 0.65) {
    const crossing = rng.chance(d === 1 ? 0.3 : 0.5)
    const after = rng.chance(0.5)
    const unit = d === 3 ? 1000 : 100
    const n = crossing ? (after ? rng.int(1, 9) * unit - 1 : rng.int(1, 9) * unit) : rng.int(1001, 9998)
    return neighborQuestion(kpId, d, n, after, rng)
  }
  if (roll < 0.8) {
    const step = d === 1 ? rng.pick([1, 100]) : d === 2 ? rng.pick([100, 1000]) : rng.pick([1, 10, 100, 1000])
    const start = step === 1000 ? rng.int(1, 6) * 1000 + rng.int(0, 9) * 100 : rng.int(10, 96) * 100 + rng.int(0, 6) * (step === 1 ? 1 : 10)
    return sequenceQuestion(kpId, d, Math.min(start, 10000 - step * 3), step, rng)
  }
  if (roll < 0.94) {
    const n = d === 1 ? rng.int(1, 9) * 1000 : rng.int(1001, 9999)
    return rng.chance(0.5) ? howManyQuestion(kpId, d, n, 'k', rng) : placeDigitQuestion(kpId, d, n, rng.pick(['k', 'h', 't', 'o'] as Place[]), rng)
  }
  return rateQuestion(kpId, d, rng.pick(RATES.slice(1)), rng)
})

// ── 大小比较和近似数（例 9 比较、排序；例 10「6988 ≈ 7000」、做一做「下面的数各接近几千」、练一练「1390 约（1400，1300）」）──

/** 近似数：接近几千（离整千不超过 250）或大约是几百几十的整百数（离整百不超过 30） */
function approxQuestion(kpId: string, d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.6)) {
    // 课本的数：6830、5021、3900、8104、4005、2897、7053、9008——离整千 5 到 200 左右
    const k = rng.int(1, 9)
    const off = (k === 1 || rng.chance(0.5) ? 1 : -1) * rng.int(5, 200)
    const n = k * 1000 + off
    const near = Math.round(n / 1000) * 1000
    const below = near - 1000 >= 1000 ? near - 1000 : near + 2000
    const above = near + 1000 <= 9000 ? near + 1000 : near - 2000
    return labelQuestion({
      kpId,
      type: 'compare',
      difficulty: d,
      sig: `nearK-${n}`,
      stem: [{ kind: 'text', text: { k: 'q.num.nearK', p: { n } } }],
      correct: String(near),
      distractors: [String(below), String(above)],
      rng,
    })
  }
  // 「1390 约（1400，1300）」「2489 大约（2400，2500）」：离整百不超过 30
  const h = rng.int(11, 99)
  const off = (rng.chance(0.5) ? 1 : -1) * rng.int(1, d === 1 ? 20 : 30)
  const n = h * 100 + off
  const near = h * 100
  const other = off > 0 ? near + 100 : near - 100
  return labelQuestion({
    kpId,
    type: 'compare',
    difficulty: d,
    sig: `about-${n}`,
    stem: [{ kind: 'text', text: { k: 'q.num.about', p: { n } } }],
    correct: String(near),
    distractors: [String(other)],
    rng,
  })
}

function genCompare(d: Difficulty, rng: RNG): Question {
  const kpId = 'm2s2-04-compare'
  const roll = rng.next()
  if (roll < 0.35) return approxQuestion(kpId, d, rng)
  if (roll < 0.5) {
    // 四个数里挑最大 / 最小
    const nums = new Set<number>()
    const cap = d === 1 ? 1000 : 10000
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
  const kind = d === 1 ? rng.int(0, 2) : d === 2 ? rng.int(1, 3) : 3
  if (kind === 0) {
    // 位数不同（843 ○ 1215）
    x = rng.int(100, 999)
    y = rng.int(1000, 9999)
  } else if (kind === 1) {
    // 位数相同，最高位不同（2757 ○ 1614）
    const lo = rng.chance(0.5) ? 100 : 1000
    x = rng.int(lo, lo * 10 - 1)
    y = rng.int(lo, lo * 10 - 1)
  } else if (kind === 2) {
    // 最高位相同，往下一位比（1614 ○ 1215）
    const k = rng.int(1, 9) * 1000
    x = k + rng.int(0, 999)
    y = k + rng.int(0, 999)
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
      { kind: 'expr', expr: `${x} ○ ${y}` },
    ],
    correct,
    distractors: ['>', '<', '='].filter((s) => s !== correct),
    rng,
  })
}
defineGenerator('m2s2-04-compare', genCompare)

// ── 简单的加、减法（例 11「1000 + 2000、2000 − 1000」；例 12「80 + 50 = 130：8 个十加 5 个十是 13 个十」「130 − 50」「900 + 600」「1500 − 600」）──
// 整十、整百、整千数相加减，可以满十；都按「几个十 / 几个百 / 几个千」来想，所以几个十、几个百相加最多 18 个，整千数相加不超过 9000。
function genRoundAddSub(d: Difficulty, rng: RNG): Question {
  const kpId = 'm2s2-04-round-addsub'
  const unit = rng.pick([10, 100, 1000])
  const add = rng.chance(0.5)
  // 第 1 档满十与不满十各半，第 2、3 档都满十（整千除外）
  const carry = unit !== 1000 && (d === 1 ? rng.chance(0.5) : true)
  let i: number
  let j: number
  if (carry) {
    i = rng.int(2, 9)
    j = rng.int(10 - i, 9)
  } else {
    i = rng.int(1, 8)
    j = rng.int(1, 9 - i)
  }
  let a = i * unit
  let b = j * unit
  if (!add) {
    // 减法：(i + j) 个 − j 个
    a = (i + j) * unit
  }
  if (add && rng.chance(0.5)) [a, b] = [b, a]
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
    smart: [value / 10, value * 10, value + unit, value - unit, add ? Math.abs(a - b) : a + b].filter((x) => Number.isInteger(x) && x > 0),
  })
}
defineGenerator('m2s2-04-round-addsub', genRoundAddSub)
