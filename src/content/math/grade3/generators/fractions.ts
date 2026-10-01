import type { Difficulty, FracPic, FracShapeKind, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'
import { fractionWords } from '@/engine/fraction'

// ─────────────────────────────────────────────────────────────
// 分数的初步认识（三上六）：几分之一、几分之几、分数的简单计算、进一步认识分数（把一些物体看作一个整体）。
// 分数写成「3/8」（界面画成上下两层，朗读读「八分之三」）。分数答案一律选项卡，干扰项是课本里常见的错法：
// 把没涂色的份数当分母、分子分母写反、分母也相加……每个干扰项都和正确答案不相等（不出 2/4 对 1/2 这种「另一种写法」），
// 彼此也不相等。结果不约分（课本没学约分）；和是 1 的写「1」，这时 n/n 不进选项。键盘题只填一个整数（几个 1/n、分子、一份有几个）。
// ─────────────────────────────────────────────────────────────

type Frac = readonly [number, number]
const fs = (n: number, d: number): string => `${n}/${d}`
const same = (a: Frac, b: Frac): boolean => a[0] * b[1] === b[0] * a[1]
const range = (n: number): number[] => Array.from({ length: n }, (_, i) => i)
const T = (k: string, p?: Record<string, LStr | number>): StemPart => ({ kind: 'text', text: p ? { k, p } : { k } })

/**
 * 分数的干扰项：分子 ≥ 1、分母 2–99，和正确答案不相等、彼此不相等，按给的顺序取前 count 个。
 * 正确答案是整数 1 时传 [1, 1]。
 */
export function fracWrongs(correct: Frac, cands: Frac[], count = 3): string[] {
  const out: Frac[] = []
  for (const c of cands) {
    const [n, d] = c
    if (!Number.isInteger(n) || !Number.isInteger(d) || n < 1 || d < 2 || n > 99 || d > 99) continue
    if (same(c, correct) || out.some((o) => same(o, c))) continue
    out.push(c)
    if (out.length >= count) break
  }
  return out.map(([n, d]) => fs(n, d))
}

/** 分数答案的选择题；label = 正确答案的写法（「3/8」或「1」） */
function fracQ(kpId: string, d: Difficulty, sig: string, stem: StemPart[], correct: Frac, cands: Frac[], rng: RNG, type: 'fraction' | 'compare' = 'fraction'): Question {
  const label = correct[1] === 1 ? String(correct[0]) : fs(correct[0], correct[1])
  return labelQuestion({ kpId, type, difficulty: d, sig, stem, correct: label, distractors: fracWrongs(correct, cands), rng })
}

/** 带单位的分数选项（「3/10 分米」「7/10 米」） */
function unitFracQ(kpId: string, d: Difficulty, sig: string, stem: StemPart[], unitKey: string, correct: Frac, cands: Frac[], rng: RNG): Question {
  const wrap = (f: string): LStr => ({ k: unitKey, p: { f } })
  return labelQuestion({ kpId, type: 'fraction', difficulty: d, sig, stem, correct: wrap(fs(correct[0], correct[1])), distractors: fracWrongs(correct, cands).map(wrap), rng })
}

// ── 平均分的图 ──

/** 能平均分成 n 份的图形（课本用过的：圆、长方形竖条 / 横条 / 格子、正方形的几种分法、三角形沿高、正多边形、平行四边形、十字形） */
function evenShapes(n: number, d: Difficulty): { shape: FracShapeKind; rows?: number }[] {
  const out: { shape: FracShapeKind; rows?: number }[] = []
  if (n >= 2 && n <= 12) out.push({ shape: 'circle' })
  if (n >= 2 && n <= 10) out.push({ shape: 'rect' }, { shape: 'square' })
  if (n >= 2 && n <= 6) out.push({ shape: 'rect-h' })
  const gridRows: Record<number, number> = { 4: 2, 6: 2, 8: 2, 9: 3, 10: 2, 12: 3 }
  if (gridRows[n]) out.push({ shape: n === 4 || n === 9 ? 'square' : 'rect', rows: gridRows[n] })
  if (n === 2 || n === 4 || n === 8) out.push({ shape: 'square-diag' })
  if (n === 2) out.push({ shape: 'triangle' })
  if (n === 5 || n === 6 || n === 8) out.push({ shape: 'polygon' })
  if (n === 5) out.push({ shape: 'cross' })
  if (n === 2 && d >= 2) out.push({ shape: 'parallelogram' })
  return out
}

/** 涂哪几块：格子、十字随便挑几格；圆、正多边形、米字挨着涂（从哪块开始随机）；竖条横条挨着涂 */
function shadeSet(shape: FracShapeKind, n: number, m: number, rows: number | undefined, rng: RNG): number[] {
  if (m >= n) return range(n)
  if ((rows && rows > 1) || shape === 'cross') return rng.shuffle(range(n)).slice(0, m).sort((a, b) => a - b)
  if (shape === 'circle' || shape === 'polygon' || shape === 'square-diag' || shape === 'circle-uneven') {
    const s = rng.int(0, n - 1)
    return range(m).map((i) => (s + i) % n).sort((a, b) => a - b)
  }
  const s = rng.int(0, n - m)
  return range(m).map((i) => s + i)
}

/** 一幅平均分成 n 份、涂 m 份的图（形状随机） */
function evenPic(n: number, m: number, d: Difficulty, rng: RNG): FracPic {
  const { shape, rows } = rng.pick(evenShapes(n, d))
  const pic: FracPic = { shape, parts: n, shaded: shadeSet(shape, n, m, rows, rng) }
  if (rows) pic.rows = rows
  if (shape === 'circle') pic.rot = rng.pick([0, 0, 180 / n])
  return pic
}
const picPart = (...items: FracPic[]): StemPart => ({ kind: 'frac-shape', items })
/** 签名里的图形：形状 + 格子行数 */
const shapeSig = (p: FracPic): string => `${p.shape}${p.rows ? `x${p.rows}` : ''}`

// ── 「五分之一」这样的读法（要注音：中文数字是词条） ──
const numWord = (n: number): LStr => ({ k: `m3.frac.w.${n}` })
const reading = (n: number, d: number): LStr => ({ k: 'm3.frac.read', p: { d: numWord(d), n: numWord(n), en: fractionWords(n, d, 'en') } })

// ═════════════════════════════════════════════════════════════
// 几分之一（p74–75、例 5(2)、练习十五 1–4）
// ═════════════════════════════════════════════════════════════

/** 看图：涂色部分是这个图形的几分之一（干扰项：把没涂的份数当分母、多一份、少一份） */
function pickUnit(kpId: string, d: Difficulty, n: number, rng: RNG): Question {
  const pic = evenPic(n, 1, d, rng)
  return fracQ(kpId, d, `unit-${shapeSig(pic)}-${n}`, [T('m3.frac.shadedUnit'), picPart(pic)], [1, n], [[1, n - 1], [1, n + 1], [1, n + 2], [1, n - 2], [1, 2 * n]], rng)
}

/** 把一个月饼 / 一张纸平均分成 n 份，每份是它的几分之一（配图） */
function textUnit(kpId: string, d: Difficulty, n: number, rng: RNG): Question {
  const cake = rng.chance(0.5)
  const pic: FracPic = cake ? { shape: 'circle', parts: n, shaded: [rng.int(0, n - 1)] } : { shape: rng.pick(['rect', 'square'] as const), parts: n, shaded: [rng.int(0, n - 1)] }
  return fracQ(kpId, d, `${cake ? 'cake' : 'paper'}-${n}`, [T(cake ? 'm3.frac.mooncake' : 'm3.frac.paper', { n }), picPart(pic)], [1, n], [[n, 1], [1, n - 1], [1, n + 1], [1, n + 2]], rng)
}

/** 线段平均分成 n 段，括出 1 段（试一试） */
function segmentUnit(kpId: string, d: Difficulty, n: number, rng: RNG): Question {
  const s = rng.int(0, n - 1)
  return fracQ(
    kpId,
    d,
    `seg-${n}`,
    [T('m3.frac.segmentUnit'), { kind: 'frac-line', units: 1, per: n, bracket: [s, s + 1], labels: false }],
    [1, n],
    [[1, n - 1], [1, n + 1], [1, n + 2]],
    rng,
  )
}

/** 「五分之一」写作什么（读法：先读分母再读分子；最常见的错是写反成 5/1） */
function writeAs(kpId: string, d: Difficulty, n: number, dd: number, rng: RNG): Question {
  return labelQuestion({
    kpId,
    type: 'fraction',
    difficulty: d,
    sig: `write-${n}-${dd}`,
    stem: [T('m3.frac.writeAs', { r: reading(n, dd) })],
    correct: fs(n, dd),
    distractors: [fs(dd, n), ...fracWrongs([n, dd], [[n, dd + 1], [n, dd - 1], [n, dd + 2]], 2)],
    rng,
  })
}

/** 分母 / 分子是几（键盘；p75「分子、分数线、分母」） */
function partName(kpId: string, d: Difficulty, n: number, dd: number, rng: RNG): Question {
  const den = rng.chance(n === 1 ? 0.7 : 0.6)
  return numberQuestion({
    kpId,
    type: 'fraction',
    difficulty: d,
    sig: `${den ? 'den' : 'num'}-${n}-${dd}`,
    stem: [T(den ? 'm3.frac.denOf' : 'm3.frac.numOf', { f: fs(n, dd) })],
    value: den ? dd : n,
    rng,
    min: 1,
    max: 20,
    smart: [den ? n : dd],
  })
}

/** 能不能用 1/n 表示涂色部分（平均分的能，反例不能；平行四边形沿对角线看着不像，其实能） */
function canUse(kpId: string, d: Difficulty, rng: RNG): Question {
  const even = rng.chance(0.5)
  let pic: FracPic
  if (even) {
    const shape = rng.pick(['parallelogram', 'square-diag', 'square-diag', 'polygon', 'circle', 'triangle'] as const)
    const n = shape === 'parallelogram' || shape === 'triangle' ? 2 : shape === 'square-diag' ? rng.pick([4, 8]) : shape === 'polygon' ? rng.pick([5, 6, 8]) : rng.int(3, 8)
    pic = { shape, parts: n, shaded: shadeSet(shape, n, 1, undefined, rng) }
  } else {
    const shape = rng.pick(['circle-uneven', 'rect-uneven', 'triangle-cut'] as const)
    const n = shape === 'triangle-cut' ? rng.pick([2, 3]) : shape === 'circle-uneven' ? rng.int(3, 5) : rng.int(2, 4)
    // 反例涂的是最显眼的那一块（三角形最上面的小三角形）
    pic = { shape, parts: n, shaded: [shape === 'triangle-cut' ? 0 : rng.int(0, n - 1)] }
  }
  return labelQuestion({
    kpId,
    type: 'fraction',
    difficulty: d,
    sig: `can-${pic.shape}-${pic.parts}-${pic.shaded[0]}`,
    stem: [T('m3.frac.canUse', { f: fs(1, pic.parts) }), picPart(pic)],
    correct: { k: even ? 'm3.frac.can' : 'm3.frac.cannot' },
    distractors: [{ k: even ? 'm3.frac.cannot' : 'm3.frac.can' }],
    rng,
  })
}

/** 比大小的符号选项（> < =） */
function cmpQ(kpId: string, d: Difficulty, sig: string, stem: StemPart[], a: Frac, b: Frac, rng: RNG, type: 'fraction' | 'compare'): Question {
  const x = a[0] * b[1]
  const y = b[0] * a[1]
  const correct = x > y ? '>' : x < y ? '<' : '='
  return labelQuestion({ kpId, type, difficulty: d, sig, stem, correct, distractors: ['>', '<', '='].filter((s) => s !== correct), rng })
}

/** 分子是 1 的分数比大小：「等分的份数越多，每份就越小」；配两幅一样大的长方形 */
function cmpUnit(kpId: string, d: Difficulty, rng: RNG, withPic: boolean): Question {
  // 例 5(2) 1/2 ○ 1/3、做一做 1/10 ○ 1/7：第 1 档分母就到 10
  const maxD = d <= 2 ? 10 : 12
  const a = rng.int(2, maxD)
  let b = rng.int(2, maxD)
  if (b === a) b = a === maxD ? a - 1 : a + 1
  const stem: StemPart[] = [T('m3.frac.compare')]
  if (withPic) {
    const shape = rng.pick(['rect', 'square'] as const)
    stem.push(picPart({ shape, parts: a, shaded: [0], label: fs(1, a) }, { shape, parts: b, shaded: [0], label: fs(1, b) }))
  }
  stem.push({ kind: 'expr', expr: `${fs(1, a)} ○ ${fs(1, b)}` })
  return cmpQ(kpId, d, `cmpu-${a}-${b}${withPic ? '-p' : ''}`, stem, [1, a], [1, b], rng, 'fraction')
}

/** 三个分子是 1 的分数，哪个最大 / 最小 */
function extremeUnit(kpId: string, d: Difficulty, rng: RNG): Question {
  const ds = rng.shuffle(range(11).map((i) => i + 2)).slice(0, 3)
  const max = rng.chance(0.5)
  const pick = max ? Math.min(...ds) : Math.max(...ds)
  return labelQuestion({
    kpId,
    type: 'fraction',
    difficulty: d,
    sig: `ext-${max ? 'max' : 'min'}-${[...ds].sort((x, y) => x - y).join(',')}`,
    stem: [T(max ? 'm3.frac.maxOf' : 'm3.frac.minOf')],
    correct: fs(1, pick),
    distractors: ds.filter((x) => x !== pick).map((x) => fs(1, x)),
    rng,
  })
}

/** 1 里面有几个 1/n（复习的分数墙） */
function unitsInOne(kpId: string, d: Difficulty, rng: RNG): Question {
  const n = rng.int(2, 10)
  return numberQuestion({ kpId, type: 'fraction', difficulty: d, sig: `inone-${n}`, stem: [T('m3.frac.unitsInOne', { u: fs(1, n) })], value: n, rng, min: 1, max: 20, smart: [1, n - 1, n + 1] })
}

/** 黑板报（练习十五 3）：左边一半、右上四分之一、右下两个八分之一，涂其中一块 */
function board(kpId: string, d: Difficulty, rng: RNG): Question {
  const piece = rng.int(0, 3)
  const n = piece === 0 ? 2 : piece === 1 ? 4 : 8
  return fracQ(kpId, d, `board-${n}`, [T('m3.frac.board'), picPart({ shape: 'board', parts: 4, shaded: [piece] })], [1, n], [[1, 4], [1, 2], [1, 8], [1, 3]], rng)
}

defineGenerator('m3s1-08-unit-frac', (d, rng) => {
  const kpId = 'm3s1-08-unit-frac'
  const roll = rng.next()
  if (d === 1) {
    // 课本 p74–75、例 5(2)：看图说出几分之一（做一做有 1/8、1/12，分母到 12）、月饼和纸、线段括出一份（试一试）、
    // 读法与分子 / 分母、分子是 1 的分数比大小（等分的份数越多，每份就越小）
    if (roll < 0.38) return pickUnit(kpId, d, rng.int(2, 12), rng)
    const n = rng.int(2, 6)
    if (roll < 0.5) return textUnit(kpId, d, n, rng)
    if (roll < 0.6) return writeAs(kpId, d, 1, rng.int(2, 10), rng)
    if (roll < 0.7) return partName(kpId, d, 1, rng.int(2, 10), rng)
    if (roll < 0.8) return segmentUnit(kpId, d, n, rng)
    return cmpUnit(kpId, d, rng, rng.chance(0.6))
  }
  if (d === 2) {
    const n = rng.int(2, 10)
    if (roll < 0.25) return pickUnit(kpId, d, n, rng)
    if (roll < 0.45) return canUse(kpId, d, rng)
    if (roll < 0.6) return cmpUnit(kpId, d, rng, true)
    if (roll < 0.7) return partName(kpId, d, 1, n, rng)
    if (roll < 0.8) return writeAs(kpId, d, 1, n, rng)
    if (roll < 0.9) return segmentUnit(kpId, d, n, rng)
    return textUnit(kpId, d, n, rng)
  }
  if (roll < 0.22) return extremeUnit(kpId, d, rng)
  if (roll < 0.4) return unitsInOne(kpId, d, rng)
  if (roll < 0.55) return board(kpId, d, rng)
  if (roll < 0.7) return cmpUnit(kpId, d, rng, false)
  if (roll < 0.85) return canUse(kpId, d, rng)
  return pickUnit(kpId, d, rng.int(7, 12), rng)
})

// ═════════════════════════════════════════════════════════════
// 几分之几（p76–78、练习十五 5–9）
// ═════════════════════════════════════════════════════════════

/** 看图：涂色 / 没涂色的部分是几分之几（干扰项：没涂的份数当分母、数了另一部分、分子分母写反、多数一份） */
function pickFrac(kpId: string, d: Difficulty, n: number, rng: RNG, unshaded = false): Question {
  const m = rng.int(1, n - 1)
  const pic = evenPic(n, m, d, rng)
  const k = unshaded ? n - m : m
  const other = n - k
  return fracQ(
    kpId,
    d,
    `${unshaded ? 'un' : 'sh'}-${shapeSig(pic)}-${n}-${m}`,
    [T(unshaded ? 'm3.frac.unshaded' : 'm3.frac.shaded'), picPart(pic)],
    [k, n],
    [[k, other], [other, n], [n, k], [k, n + 1], [k + 1, n], [k - 1, n]],
    rng,
  )
}

/** k 个 1/n 是几分之几（选项）：3 个 1/5 是 3/5 */
function unitsToFrac(kpId: string, d: Difficulty, n: number, rng: RNG): Question {
  const k = rng.int(2, n - 1)
  return fracQ(kpId, d, `k2f-${k}-${n}`, [T('m3.frac.kUnits', { k, u: fs(1, n) })], [k, n], [[1, k * n], [k, k * n], [n, k], [k + 1, n], [k - 1, n]], rng)
}

/** m/n 里面有几个 1/n（键盘）；有时配图：涂色部分里面有几个 1/n */
function fracToUnits(kpId: string, d: Difficulty, n: number, rng: RNG): Question {
  const m = rng.int(2, n)
  if (rng.chance(0.4)) {
    const pic = evenPic(n, m, d, rng)
    return numberQuestion({ kpId, type: 'fraction', difficulty: d, sig: `picu-${shapeSig(pic)}-${m}-${n}`, stem: [T('m3.frac.picUnits', { u: fs(1, n) }), picPart(pic)], value: m, rng, min: 1, max: 20, smart: [n, n - m, m + 1] })
  }
  return numberQuestion({ kpId, type: 'fraction', difficulty: d, sig: `f2k-${m}-${n}`, stem: [T('m3.frac.hasUnits', { f: fs(m, n), u: fs(1, n) })], value: m, rng, min: 1, max: 20, smart: [n, m + 1, m - 1] })
}

/** 同分母的分数比大小（含 n/n，和 1 比）：「平均分成相同的份数后，涂的份数越多，对应的分数越大」 */
function cmpSame(kpId: string, d: Difficulty, rng: RNG): Question {
  const n = d <= 2 ? rng.int(3, 10) : rng.pick([rng.int(5, 12), rng.pick([15, 16, 20])])
  const a = rng.int(1, n)
  // 第 2 档起偶尔和 1 比（6/6 ○ 1、5/6 ○ 1）
  if (d >= 2 && rng.chance(0.2)) {
    const left: Frac = rng.chance(0.5) ? [n, n] : [a === n ? n - 1 : a, n]
    return cmpQ(kpId, d, `cmp1-${left[0]}-${n}`, [T('m3.frac.compare'), { kind: 'expr', expr: `${fs(left[0], n)} ○ 1` }], left, [1, 1], rng, 'compare')
  }
  let b = rng.int(1, n)
  if (b === a) b = a === n ? a - 1 : a + 1
  const stem: StemPart[] = [T('m3.frac.compare')]
  const withPic = d <= 2 && n <= 10 && rng.chance(0.5)
  if (withPic) {
    const shape = rng.pick(evenShapes(n, d))
    const one = (m: number): FracPic => ({ shape: shape.shape, parts: n, shaded: range(m), ...(shape.rows ? { rows: shape.rows } : {}), label: fs(m, n) })
    stem.push(picPart(one(a), one(b)))
  }
  stem.push({ kind: 'expr', expr: `${fs(a, n)} ○ ${fs(b, n)}` })
  return cmpQ(kpId, d, `cmps-${a}-${b}-${n}${withPic ? '-p' : ''}`, stem, [a, n], [b, n], rng, 'compare')
}

/** 1 分米的尺子上括出一段，是几分之几分米（例 4） */
function rulerDm(kpId: string, d: Difficulty, rng: RNG): Question {
  const len = rng.int(1, 9)
  const s = rng.int(0, 10 - len)
  const e = s + len
  return unitFracQ(
    kpId,
    d,
    `ruler-${s}-${e}`,
    [T('m3.frac.rulerDm'), { kind: 'frac-line', units: 1, per: 10, bracket: [s, e], ruler: true, unit: 'cm' }],
    'm3.frac.dm',
    [len, 10],
    [[e, 10], [len + 1, 10], [len - 1, 10], [s, 10], [10 - len, 10], [len + 2, 10]],
    rng,
  )
}

/** 0—1 米平均分成 10 份，箭头指着第 k 格：k/10 米（练习十五 4） */
function arrowM(kpId: string, d: Difficulty, rng: RNG): Question {
  const k = rng.int(1, 9)
  return unitFracQ(
    kpId,
    d,
    `arrow-${k}`,
    [T('m3.frac.arrowM'), { kind: 'frac-line', units: 1, per: 10, arrow: k, unit: 'm' }],
    'm3.frac.m',
    [k, 10],
    [[k + 1, 10], [k - 1, 10], [10 - k, 10], [k, 9]],
    rng,
  )
}

/** 几个同分母的分数，哪个最大 / 最小 */
function orderSame(kpId: string, d: Difficulty, rng: RNG): Question {
  const n = rng.int(5, 12)
  const ms = rng.shuffle(range(n - 1).map((i) => i + 1)).slice(0, rng.chance(0.5) ? 3 : 4)
  const max = rng.chance(0.5)
  const pick = max ? Math.max(...ms) : Math.min(...ms)
  return labelQuestion({
    kpId,
    type: 'fraction',
    difficulty: d,
    sig: `ord-${max ? 'max' : 'min'}-${n}-${[...ms].sort((x, y) => x - y).join(',')}`,
    stem: [T(max ? 'm3.frac.maxOf' : 'm3.frac.minOf')],
    correct: fs(pick, n),
    distractors: ms.filter((x) => x !== pick).map((x) => fs(x, n)),
    rng,
  })
}

/** 蛋糕平均分成 10 块（练习十五 9）：还剩几块 / 谁吃了几分之几 / 剩下几分之几 / 谁吃得最多 */
function cake(kpId: string, d: Difficulty, rng: RNG): Question {
  let a: number, b: number, c: number
  do {
    a = rng.int(1, 4)
    b = rng.int(1, 4)
    c = rng.int(1, 4)
  } while (a + b + c >= 10 || new Set([a, b, c]).size < 3)
  const left = 10 - a - b - c
  const kind = rng.int(0, 3)
  const stem = (ask: LStr): StemPart[] => [T('m3.frac.cake', { a, b, c, ask })]
  const base = `cake-${a}-${b}-${c}`
  if (kind === 0) {
    return numberQuestion({ kpId, type: 'fraction', difficulty: d, sig: `${base}-left`, stem: stem({ k: 'm3.frac.cakeLeft' }), value: left, rng, min: 0, max: 10, smart: [a + b + c, left + 1, left - 1] })
  }
  const who = ['ming', 'mom', 'dad'] as const
  const ate = [a, b, c]
  if (kind === 1) {
    const i = rng.int(0, 2)
    const x = ate[i]!
    return fracQ(kpId, d, `${base}-ate${i}`, stem({ k: 'm3.frac.cakeAte', p: { who: { k: `m3.frac.who.${who[i]}` } } }), [x, 10], [[x, 10 - x], [10 - x, 10], [10, x], ...ate.filter((y) => y !== x).map((y): Frac => [y, 10])], rng)
  }
  if (kind === 2) {
    return fracQ(kpId, d, `${base}-leftf`, stem({ k: 'm3.frac.cakeLeftFrac' }), [left, 10], [[a + b + c, 10], [left, a + b + c], [10, left], [left + 1, 10]], rng)
  }
  const most = ate.indexOf(Math.max(...ate))
  return labelQuestion({
    kpId,
    type: 'fraction',
    difficulty: d,
    sig: `${base}-most`,
    stem: stem({ k: 'm3.frac.cakeMost' }),
    correct: { k: `m3.frac.who.${who[most]}` },
    distractors: who.filter((_, i) => i !== most).map((w) => ({ k: `m3.frac.who.${w}` })),
    rng,
  })
}

defineGenerator('m3s1-08-frac', (d, rng) => {
  const kpId = 'm3s1-08-frac'
  const roll = rng.next()
  if (d === 1) {
    // 课本 p76–78：看图写几分之几（分母 3–10，涂 1 到 n−1 份）、例 3 几个 1/n 是几分之几、做一做 m/n 里面有几个 1/n、
    // 例 4 1 分米的尺子上括出几分之几分米、例 5 同分母比大小（含 6/6 ○ 5/6）与分子是 1 的比大小
    const n = rng.int(3, 10)
    if (roll < 0.38) return pickFrac(kpId, d, n, rng)
    if (roll < 0.5) return unitsToFrac(kpId, d, n, rng)
    if (roll < 0.62) return fracToUnits(kpId, d, n, rng)
    if (roll < 0.77) return rulerDm(kpId, d, rng)
    if (roll < 0.94) return cmpSame(kpId, d, rng)
    return cmpUnit(kpId, d, rng, true)
  }
  if (d === 2) {
    const n = rng.int(3, 10)
    if (roll < 0.2) return pickFrac(kpId, d, n, rng)
    if (roll < 0.32) return pickFrac(kpId, d, n, rng, true)
    if (roll < 0.52) return cmpSame(kpId, d, rng)
    if (roll < 0.64) return rulerDm(kpId, d, rng)
    if (roll < 0.76) return arrowM(kpId, d, rng)
    if (roll < 0.88) return fracToUnits(kpId, d, n, rng)
    return unitsToFrac(kpId, d, n, rng)
  }
  if (roll < 0.3) return cake(kpId, d, rng)
  if (roll < 0.5) return orderSame(kpId, d, rng)
  if (roll < 0.7) return cmpSame(kpId, d, rng)
  if (roll < 0.8) return rulerDm(kpId, d, rng)
  return pickFrac(kpId, d, rng.int(6, 12), rng, rng.chance(0.5))
})

// ═════════════════════════════════════════════════════════════
// 分数的简单计算（p81–84、练习十六、练习十八 3–4）
// ═════════════════════════════════════════════════════════════

/** a/n + b/n（和小于 1 时一半配一幅图：a 份一种颜色、b 份另一种颜色）；toOne = 和是 1（做一做 1/2 + 1/2） */
function addFrac(kpId: string, d: Difficulty, rng: RNG, toOne = false): Question {
  const n = toOne ? rng.int(2, d === 1 ? 10 : 12) : d === 1 ? rng.int(3, 9) : rng.int(3, 12)
  let a: number, b: number
  if (toOne) {
    a = rng.int(1, n - 1)
    b = n - a
  } else {
    a = rng.int(1, n - 2)
    b = rng.int(1, n - 1 - a)
  }
  const s = a + b
  const stem: StemPart[] = []
  const withPic = !toOne && d === 1 && rng.chance(0.5)
  if (withPic) {
    const shape = rng.pick(['circle', 'rect', 'square'] as const)
    stem.push(picPart({ shape, parts: n, shaded: range(a), alt: range(b).map((i) => a + i) }))
  }
  stem.push({ kind: 'expr', expr: `${fs(a, n)} + ${fs(b, n)} = ?` })
  const correct: Frac = toOne ? [1, 1] : [s, n]
  // 常见错：分母也相加（3/16）、少算 / 多算一份、只写了一个加数
  const cands: Frac[] = toOne ? [[s, 2 * n], [n - 1, n], [a, n], [b, n], [1, n]] : [[s, 2 * n], [s + 1, n], [s - 1, n], [a * b, n], [s, n + 1]]
  const sig = `add-${a}-${b}-${n}${withPic ? '-p' : ''}`
  if (!toOne) return fracQ(kpId, d, sig, stem, correct, cands, rng)
  // 和是 1：选项里另放一个整数「2」（分子相加当成了得数），整数就不只正确答案一个（不然一眼就能认出）
  return labelQuestion({ kpId, type: 'fraction', difficulty: d, sig, stem, correct: '1', distractors: ['2', ...fracWrongs(correct, cands, 2)], rng })
}

/** a/n − b/n（差 > 0） */
function subFrac(kpId: string, d: Difficulty, rng: RNG): Question {
  // 第 1 档照例 1(2) 与做一做（2/8 − 1/8、4/5 − 2/5、8/9 − 7/9、5/6 − 1/6）：分母 3–10，被减数小于 1
  const n = d === 1 ? rng.int(3, 10) : rng.int(3, 12)
  const a = rng.int(2, d === 1 ? n - 1 : n)
  const b = rng.int(1, a - 1)
  const r = a - b
  // 常见错：分母也相减（2/0 不成立的就跳过）、加成了、少减 / 多减一份
  return fracQ(kpId, d, `sub-${a}-${b}-${n}`, [{ kind: 'expr', expr: `${fs(a, n)} - ${fs(b, n)} = ?` }], [r, n], [[a + b, n], [r + 1, n], [r - 1, n], [b, n], [r, 2 * n]], rng)
}

/** 1 − a/n：「1 可以看作 n 个 1/n，就是 n/n」 */
function oneMinus(kpId: string, d: Difficulty, rng: RNG): Question {
  const n = rng.int(2, 10)
  const a = rng.int(1, n - 1)
  const r = n - a
  return fracQ(kpId, d, `one-${a}-${n}`, [{ kind: 'expr', expr: `1 - ${fs(a, n)} = ?` }], [r, n], [[a, n], [r + 1, n], [r - 1, n], [1, n], [r, n + 1]], rng)
}

/** 几个 1/n 加 / 减几个 1/n 是几个 1/n（键盘，例 1「想：1 个 1/8 加 2 个 1/8 是 3 个 1/8」） */
function unitsCalc(kpId: string, d: Difficulty, rng: RNG): Question {
  const n = rng.int(3, 10)
  const add = d === 1 || rng.chance(0.5)
  const a = add ? rng.int(1, n - 2) : rng.int(2, n)
  const b = add ? rng.int(1, n - 1 - a) : rng.int(1, a - 1)
  const value = add ? a + b : a - b
  return numberQuestion({
    kpId,
    type: 'fraction',
    difficulty: d,
    sig: `units-${add ? 'add' : 'sub'}-${a}-${b}-${n}`,
    stem: [T(add ? 'm3.frac.addUnits' : 'm3.frac.subUnits', { a, b, u: fs(1, n) })],
    value,
    rng,
    min: 0,
    max: 20,
    smart: [add ? Math.abs(a - b) : a + b, value + 1, value - 1],
  })
}

/** 1 可以看作几个 1/n（键盘） */
function oneAs(kpId: string, d: Difficulty, rng: RNG): Question {
  const n = rng.int(2, 10)
  return numberQuestion({ kpId, type: 'fraction', difficulty: d, sig: `oneas-${n}`, stem: [T('m3.frac.oneAs', { u: fs(1, n) })], value: n, rng, min: 1, max: 20, smart: [1, n - 1, n + 1] })
}

/**
 * 应用题。book = 课本例题与做一做（第 1 档起）：例 1 西瓜（分母 8）、例 2 彩纸（剩下几分之几）、做一做 2 彩绳（分母 10：
 * 编手链用了几分之几、比编中国结少用了几分之几）、做一做 3 果汁（每人喝了一瓶的几分之几、孩子们比老人们多喝了几分之几）；
 * 否则是练习十六、十八的巧克力、脚踏船、菜地、自驾游、孩子们一共喝了几分之几（第 3 档）。
 */
function calcStory(kpId: string, d: Difficulty, rng: RNG, book: boolean): Question {
  const kind = book ? rng.pick([0, 1, 7, 7, 8, 9, 10]) : rng.pick([2, 3, 4, 5, 6, 11])
  // 两部分（a + b < n）
  const two = (n: number): [number, number] => {
    const a = rng.int(1, n - 2)
    return [a, rng.int(1, n - 1 - a)]
  }
  if (kind === 0) {
    const [a, b] = two(8)
    return fracQ(kpId, d, `melon-sum-${a}-${b}`, [T('m3.frac.melonSum', { a: fs(a, 8), b: fs(b, 8) })], [a + b, 8], [[a + b, 16], [8 - a - b, 8], [a + b + 1, 8], [a + b - 1, 8]], rng)
  }
  if (kind === 1) {
    // 哥哥比弟弟多吃了几分之几（哥哥吃得多，两人合起来不超过一个西瓜）
    const lo = rng.int(1, 3)
    const hi = rng.int(lo + 1, 8 - lo)
    return fracQ(kpId, d, `melon-diff-${lo}-${hi}`, [T('m3.frac.melonDiff', { a: fs(lo, 8), b: fs(hi, 8) })], [hi - lo, 8], [[hi + lo, 8], [hi - lo + 1, 8], [lo, 8], [hi, 8], [hi - lo, 16]], rng)
  }
  if (kind <= 3) {
    const [a, b] = two(8)
    if (kind === 2) return fracQ(kpId, d, `choco-sum-${a}-${b}`, [T('m3.frac.chocoSum', { a: fs(a, 8), b: fs(b, 8) })], [a + b, 8], [[a + b, 16], [8 - a - b, 8], [a + b + 1, 8], [a + b - 1, 8]], rng)
    const r = 8 - a - b
    return fracQ(kpId, d, `choco-left-${a}-${b}`, [T('m3.frac.chocoLeft', { a: fs(a, 8), b: fs(b, 8) })], [r, 8], [[a + b, 8], [r + 1, 8], [r - 1, 8], [r, 16]], rng)
  }
  if (kind === 4) {
    const n = rng.pick([3, 4, 5, 6, 8])
    const a = rng.int(1, n - 1)
    return fracQ(kpId, d, `boats-${a}-${n}`, [T('m3.frac.boats', { a: fs(a, n) })], [n - a, n], [[a, n], [n - a + 1, n], [n - a - 1, n], [1, n]], rng)
  }
  if (kind === 5 || kind === 6) {
    const [a, b] = two(10)
    const r = 10 - a - b
    const key = kind === 5 ? 'm3.frac.garden' : 'm3.frac.trip'
    return fracQ(kpId, d, `${kind === 5 ? 'garden' : 'trip'}-${a}-${b}`, [T(key, { a: fs(a, 10), b: fs(b, 10) })], [r, 10], [[a + b, 10], [r + 1, 10], [r - 1, 10], [r, 20]], rng)
  }
  if (kind === 7) {
    const a = rng.int(1, 9)
    const paper = rng.chance(0.5)
    const n = paper ? rng.pick([4, 4, 5, 6, 8]) : 10
    const x = paper ? rng.int(1, n - 1) : a
    return fracQ(kpId, d, `${paper ? 'paper' : 'rope'}-${x}-${n}`, [T(paper ? 'm3.frac.paperLeft' : 'm3.frac.ropeLeft', { a: fs(x, n) })], [n - x, n], [[x, n], [n - x + 1, n], [n - x - 1, n], [1, n]], rng)
  }
  if (kind === 10) {
    // 编手链比编中国结少用了几分之几：中国结用的要多于一半（7/10 → 7/10 − 3/10 = 4/10）
    const a = rng.int(6, 9)
    return fracQ(kpId, d, `rope-less-${a}`, [T('m3.frac.ropeLess', { a: fs(a, 10) })], [2 * a - 10, 10], [[10 - a, 10], [a, 10], [2 * a - 9, 10], [2 * a - 11, 10]], rng)
  }
  // 果汁：c 个孩子 + o 位老人正好 n 杯（课本 3 个孩子、2 位老人、5 杯）
  const n = rng.int(5, 9)
  const c = rng.int(Math.ceil(n / 2) + (n % 2 === 0 ? 1 : 0), n - 1)
  const o = n - c
  if (kind === 8) return fracQ(kpId, d, `juice-each-${c}-${o}`, [T('m3.frac.juiceEach', { n, c, o })], [1, n], [[1, c], [1, o], [c, n], [n, 1], [1, n + 1]], rng)
  if (kind === 11) return fracQ(kpId, d, `juice-kids-${c}-${o}`, [T('m3.frac.juiceKids', { n, c, o })], [c, n], [[o, n], [c, o], [c, n + 1], [c - 1, n], [1, n]], rng)
  return fracQ(kpId, d, `juice-diff-${c}-${o}`, [T('m3.frac.juiceDiff', { n, c, o })], [c - o, n], [[c, n], [o, n], [c + o, n], [c - o + 1, n]], rng)
}

defineGenerator('m3s1-08-frac-calc', (d, rng) => {
  const kpId = 'm3s1-08-frac-calc'
  const roll = rng.next()
  if (d === 1) {
    // 课本 p81–82：例 1(1) 同分母相加（做一做含 1/2 + 1/2 和是 1）、例 1(2) 与做一做的减法、例 2 1 − 3/4、
    // 例题和做一做的应用题（西瓜、彩纸、彩绳、果汁）
    if (roll < 0.25) return addFrac(kpId, d, rng)
    if (roll < 0.35) return addFrac(kpId, d, rng, true)
    if (roll < 0.6) return subFrac(kpId, d, rng)
    if (roll < 0.75) return oneMinus(kpId, d, rng)
    return calcStory(kpId, d, rng, true)
  }
  if (d === 2) {
    // 「想：1 个 1/8 加 2 个 1/8 是 3 个 1/8」、1 可以看作几个 1/n、分母到 12
    if (roll < 0.2) return unitsCalc(kpId, d, rng)
    if (roll < 0.32) return oneAs(kpId, d, rng)
    if (roll < 0.47) return subFrac(kpId, d, rng)
    if (roll < 0.6) return oneMinus(kpId, d, rng)
    if (roll < 0.7) return addFrac(kpId, d, rng, true)
    if (roll < 0.82) return addFrac(kpId, d, rng)
    return calcStory(kpId, d, rng, true)
  }
  if (roll < 0.7) return calcStory(kpId, d, rng, false)
  if (roll < 0.85) return oneMinus(kpId, d, rng)
  return subFrac(kpId, d, rng)
})

// ═════════════════════════════════════════════════════════════
// 进一步认识分数（p85–89、练习十七、练习十八 2 / 5）：把一些物体看作一个整体
// ═════════════════════════════════════════════════════════════

const OBJECTS: { key: string; icon: string }[] = [
  { key: 'apple', icon: '🍎' },
  { key: 'berry', icon: '🍓' },
  { key: 'peach', icon: '🍑' },
  { key: 'ball', icon: '⚽' },
  { key: 'dot', icon: 'dot' },
  { key: 'star', icon: '⭐' },
  { key: 'pineapple', icon: '🍍' },
  { key: 'mushroom', icon: '🍄' },
]
const objName = (o: { key: string }): LStr => ({ k: `m3.frac.obj.${o.key}` })

/** 分组的样子：每份 1 个时不画框；一份排一排 / 一列（课本「12 个圆排 3 排」「15 个圆排 5 列」）或一份一个虚线框 */
function setPart(icon: string, k: number, per: number, shaded: number, rng: RNG): StemPart {
  if (per === 1) return { kind: 'frac-set', icon, groups: k, per, shaded, boxed: false }
  const dir = per <= 5 && k <= 5 ? rng.pick([undefined, 'row', 'col'] as const) : undefined
  return dir ? { kind: 'frac-set', icon, groups: k, per, shaded, dir } : { kind: 'frac-set', icon, groups: k, per, shaded }
}

/** k 份、每份 per 个（n = k × per ≤ max；minPer / maxPer = 每份至少 / 至多几个；课本例 2 是 24 瓶分 3 份，每份 8 个） */
function setShape(rng: RNG, max: number, minPer = 1, maxPer = 8): { k: number; per: number; n: number } {
  for (;;) {
    const k = rng.pick([2, 3, 4, 5, 6, 8])
    const per = rng.int(minPer, maxPer)
    const n = k * per
    if (n >= 4 && n <= max) return { k, per, n }
  }
}

/** 看图：涂色的部分是这些物体的几分之几（常见错：用物体的个数当分母、没涂的份数当分母、写反） */
function setPick(kpId: string, d: Difficulty, rng: RNG): Question {
  const { k, per, n } = setShape(rng, 24)
  const m = rng.int(1, k - 1)
  const o = rng.pick(OBJECTS)
  const told = per > 1 && rng.chance(0.4)
  const stem: StemPart[] = told ? [T('m3.frac.setWhole', { n, k, m, obj: objName(o) }), setPart(o.icon, k, per, m, rng)] : [T('m3.frac.setShaded', { obj: objName(o) }), setPart(o.icon, k, per, m, rng)]
  return fracQ(kpId, d, `set-${told ? 't' : 'p'}-${o.key}-${k}-${per}-${m}`, stem, [m, k], [[m, n], [m * per, k], [m, k - m], [k - m, k], [k, m], [m, k + 1]], rng)
}

/** 平均分成 k 份，每份（或 m 份）有几个（键盘） */
function setShare(kpId: string, d: Difficulty, rng: RNG): Question {
  const { k, per, n } = setShape(rng, d === 1 ? 24 : 30, 2)
  const o = rng.pick(OBJECTS.filter((x) => x.key !== 'dot'))
  // 例 2 试一试：平均分成 6 份，其中的 1 份、2 份、3 份……各有几瓶
  const some = k > 2 && rng.chance(d === 1 ? 0.4 : 0.5)
  const m = some ? rng.int(2, k - 1) : 1
  const withPic = n <= 24
  const stem: StemPart[] = [T(some ? 'm3.frac.setSome' : 'm3.frac.setEach', { n, k, m, obj: objName(o) })]
  // 没分好的一堆（一个一个排开，让孩子自己分）
  if (withPic) stem.push({ kind: 'frac-set', icon: o.icon, groups: n, per: 1, shaded: 0, boxed: false })
  return numberQuestion({ kpId, type: 'fraction', difficulty: d, sig: `share-${some ? m : 1}-${n}-${k}-${o.key}`, stem, value: per * m, rng, min: 1, max: 30, smart: [k, n - per * m, per * m + 1] })
}

/** 一盒苹果平均分成 k 份，每份是这盒苹果的 1/k（开头「一盒苹果平均分成 2 份」） */
function setUnit(kpId: string, d: Difficulty, rng: RNG): Question {
  const { k, per, n } = setShape(rng, 24, 2)
  const o = rng.pick(OBJECTS.filter((x) => x.key !== 'dot' && x.key !== 'ball'))
  return fracQ(kpId, d, `box-${o.key}-${n}-${k}`, [T('m3.frac.boxUnit', { n, k, obj: objName(o) })], [1, k], [[1, n], [per, n], [1, per], [k, n], [per, k]], rng)
}

/** 求一个数的几分之几（先除后乘）：12 个苹果的 2/3 是几个（配分好组的图，不涂色） */
function ofNumber(kpId: string, d: Difficulty, rng: RNG): Question {
  const k = rng.int(2, 9)
  const per = rng.int(2, Math.min(9, Math.floor(30 / k)))
  const n = k * per
  const m = rng.int(1, k - 1)
  const o = rng.pick(OBJECTS.filter((x) => x.key !== 'dot'))
  const stem: StemPart[] = [T('m3.frac.ofNum', { n, f: fs(m, k), obj: objName(o) })]
  if (n <= 24) stem.push({ kind: 'frac-set', icon: o.icon, groups: k, per, shaded: 0 })
  return numberQuestion({ kpId, type: 'fraction', difficulty: d, sig: `of-${m}-${k}-${n}-${o.key}`, stem, value: per * m, rng, min: 1, max: 30, smart: [per, n - per * m, m * k, per * m + per] })
}

/** 应用题（例 3、练习十七、练习十八、练习十九）：先求一份是多少，再求几份 */
function setStory(kpId: string, d: Difficulty, rng: RNG, book = false): Question {
  // book = 课本例 3（航模小组的女生、男生）、做一做（图书角 45 本的 4/9）、p86 做一做 3、4（9 个三角形涂 1/3、10 根小棒取 2/5）
  const kind = book ? rng.pick([0, 1, 1, 5, 5, 9]) : rng.int(0, 10)
  const num = (key: string, p: Record<string, LStr | number>, value: number, sig: string, smart: number[]): Question =>
    numberQuestion({ kpId, type: 'fraction', difficulty: d, sig, stem: [T(key, p)], value, rng, min: 1, max: 99, smart })
  if (kind === 0) {
    // 航模小组：女生（1/k）
    const k = rng.pick([2, 3, 4])
    const n = k * rng.int(3, 6)
    return num('m3.frac.girls', { n, f: fs(1, k) }, n / k, `girls-${n}-${k}`, [n - n / k, k, n / k + 1])
  }
  if (kind === 1) {
    // 航模小组：1/3 是女生、2/3 是男生，男生几人（12 → 8）
    const k = rng.pick([3, 4, 5])
    const n = k * rng.int(2, 5)
    return num('m3.frac.boys', { n, f1: fs(1, k), f2: fs(k - 1, k) }, (n / k) * (k - 1), `boys-${n}-${k}`, [n / k, k - 1, n - 1])
  }
  if (kind === 2) {
    const k = rng.pick([2, 4, 5])
    const n = k * rng.int(3, 6)
    return num('m3.frac.rabbits', { n, f: fs(1, k) }, n / k, `rabbits-${n}-${k}`, [n - n / k, k, n / k + 1])
  }
  if (kind === 3) {
    // 面粉：吃了 m/k，还剩多少（25 千克吃了 2/5 → 15）
    const k = rng.pick([4, 5])
    const n = k * rng.int(4, 7)
    const m = rng.int(1, k - 1)
    return num('m3.frac.flour', { n, f: fs(m, k) }, (n / k) * (k - m), `flour-${n}-${m}-${k}`, [(n / k) * m, n / k, n - m])
  }
  if (kind === 4) {
    // 合唱队：1/4 是男生，女生多少人（24 → 18）
    const k = rng.pick([3, 4, 5, 6])
    const n = k * rng.int(3, 6)
    return num('m3.frac.choir', { n, f: fs(1, k) }, n - n / k, `choir-${n}-${k}`, [n / k, n - k, n - 1])
  }
  if (kind === 5) {
    // 图书角：45 本的 4/9 是 20 本
    const k = rng.pick([5, 6, 7, 8, 9])
    const per = rng.int(3, 9)
    const m = rng.int(2, k - 1)
    return num('m3.frac.books', { n: k * per, f: fs(m, k) }, per * m, `books-${k * per}-${m}-${k}`, [per, k * per - per * m, per * m + per])
  }
  if (kind === 6) {
    // 绳子：63 米，用去 2/7 和 3/7，共用去多少米
    const k = rng.pick([5, 7, 9])
    const per = rng.int(3, 9)
    const a = rng.int(1, k - 2)
    const b = rng.int(1, k - 1 - a)
    return num('m3.frac.ropeUsed', { n: k * per, a: fs(a, k), b: fs(b, k) }, per * (a + b), `ropeu-${k * per}-${a}-${b}-${k}`, [per * a, per * b, k * per - per * (a + b)])
  }
  if (kind === 7) {
    // 钟面：m/12 小时是 5m 分
    const m = rng.int(1, 11)
    return num('m3.frac.hour', { f: fs(m, 12) }, 5 * m, `hour-${m}`, [m, 12 * m, 60 - 5 * m])
  }
  if (kind === 8) {
    // 爷爷 64 岁，小红是爷爷的 1/8
    const k = rng.pick([7, 8, 9])
    const age = rng.int(6, 9)
    return num('m3.frac.grandpa', { n: age * k, f: fs(1, k) }, age, `grandpa-${age * k}-${k}`, [k, age + 1, age * k - age])
  }
  if (kind === 9) {
    // 小棒 / 三角形：10 根小棒取出 2/5；9 个三角形涂 1/3
    const sticks = rng.chance(0.5)
    const k = sticks ? rng.pick([2, 5]) : rng.pick([3, 4])
    const per = rng.int(2, 5)
    const m = rng.int(1, k - 1)
    return num(sticks ? 'm3.frac.sticks' : 'm3.frac.paint', { n: k * per, f: fs(m, k) }, per * m, `${sticks ? 'sticks' : 'paint'}-${k * per}-${m}-${k}`, [per, k * per - per * m, m])
  }
  // 两只猫吃鱼，谁吃得多（15 条，1/3 和 1/5）
  const [k1, k2] = rng.pick([[3, 5], [2, 5], [3, 4], [2, 3]] as const)
  const n = k1 * k2 * (k1 * k2 <= 12 ? rng.int(1, 2) : 1)
  const m1 = k1 === 2 ? 1 : rng.int(1, k1 - 1)
  const m2 = rng.int(1, k2 - 1)
  const e1 = (n / k1) * m1
  const e2 = (n / k2) * m2
  const swap = rng.chance(0.5)
  const [a, b] = swap ? [fs(m2, k2), fs(m1, k1)] : [fs(m1, k1), fs(m2, k2)]
  const [ea, eb] = swap ? [e2, e1] : [e1, e2]
  const correct: LStr = ea > eb ? { k: 'm3.frac.cat.spot' } : ea < eb ? { k: 'm3.frac.cat.black' } : { k: 'm3.frac.same' }
  return labelQuestion({
    kpId,
    type: 'fraction',
    difficulty: d,
    sig: `cats-${n}-${a}-${b}`,
    stem: [T('m3.frac.fishCats', { n, a, b })],
    correct,
    distractors: (['m3.frac.cat.spot', 'm3.frac.cat.black', 'm3.frac.same'] as const).filter((k) => typeof correct === 'object' && k !== correct.k).map((k) => ({ k })),
    rng,
  })
}

defineGenerator('m3s1-08-frac-of-set', (d, rng) => {
  const kpId = 'm3s1-08-frac-of-set'
  const roll = rng.next()
  if (d === 1) {
    // 课本 p85–87：一盒平均分，每份是几分之一；例 1、例 2 看图写分数、每份 / 几份有几个（12 个、24 瓶）；
    // 例 3 求一个数的几分之几（12 人的 2/3）与做一做（45 本的 4/9、9 个三角形、10 根小棒）
    if (roll < 0.25) return setPick(kpId, d, rng)
    if (roll < 0.4) return setShare(kpId, d, rng)
    if (roll < 0.5) return setUnit(kpId, d, rng)
    if (roll < 0.8) return ofNumber(kpId, d, rng)
    return setStory(kpId, d, rng, true)
  }
  if (d === 2) {
    // 变式：练习十七、十八的应用题（兔子、面粉、合唱队、绳子、钟面、爷爷的年龄、两只猫）
    if (roll < 0.3) return ofNumber(kpId, d, rng)
    if (roll < 0.55) return setStory(kpId, d, rng)
    if (roll < 0.75) return setPick(kpId, d, rng)
    if (roll < 0.9) return setShare(kpId, d, rng)
    return setUnit(kpId, d, rng)
  }
  if (roll < 0.75) return setStory(kpId, d, rng)
  return ofNumber(kpId, d, rng)
})
