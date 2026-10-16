import type { Difficulty, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator } from '@/engine'
import { choose, div, eq, fr, intQ, judge, mul, num, ratioWrongs, relQ, rt, show, valueQ, type F } from './proportion'

// ─────────────────────────────────────────────────────────────
// 六下「☆ 自行车里的数学」（课本 p65–66，平台当前的旧版六下；六年级数学 H）。
// 活动 1：脚踏板蹬一圈，前齿轮转一圈；前齿轮转过的齿数和后齿轮转过的齿数同样多：前齿轮齿数 × 1 = 后齿轮齿数 × 后齿轮转动圈数；
//   后齿轮转动的圈数就是车轮转动的圈数；车轮转动的圈数 × 车轮的周长 = 蹬一圈的路程（周长 = π × 直径，新教材六上「圆」学过，π 取 3.14）。
// 蹬 2 圈及以上：前齿轮齿数 × 前齿轮转动圈数 = 后齿轮齿数 × 后齿轮转动圈数（齿数和圈数成反比例）。
// 活动 2：变速自行车前齿轮 48、40 齿，后齿轮 28、24、20、18、16、14 齿：前、后齿轮的齿数比（化成最简），2 × 6 = 12 种组合
//   （48∶24 和 40∶20 都是 2∶1，齿数比只有 11 种——题目只问组合有几种）；蹬同样的圈数，前 48 齿、后 14 齿走得最远；
//   走的距离和前齿轮齿数、后齿轮齿数、车轮的大小有关。
// 不出：测量自己的自行车（题干直接给数）。作答：整数数字键盘，小数和比做成选项。
// 朗读：「转」一律写「转动」（读 zhuàn）；不写「体重」（「重」），写「骑车人的身高」；「π 取 3.14」单独一句（不加括号）。
// ─────────────────────────────────────────────────────────────

export const K_BIKE = 'm6s2-06-bike'
type P = Record<string, LStr | number>
const L = (k: string, p?: P): LStr => (p ? { k, p } : { k })
const T = (k: string, p?: P): StemPart => ({ kind: 'text', text: L(k, p) })

/** 活动 2 的变速自行车 */
export const FRONT = [48, 40]
export const REAR = [28, 24, 20, 18, 16, 14]
/** π 取 3.14（写成分数 157/50 算，免得浮点误差） */
const PI: F = [157, 50]

function qPrinciple(d: Difficulty, rng: RNG): Question {
  return choose(K_BIKE, d, rng, 'principle', [T('m6.bike.principleQ')], L('m6.bike.opt.rear'), [L('m6.bike.opt.front'), L('m6.bike.opt.pedal'), L('m6.bike.opt.bell')])
}
function qOneTurn(d: Difficulty, rng: RNG): Question {
  return intQ(K_BIKE, d, rng, 'one', [T('m6.bike.oneQ')], 1, [2, 0])
}
function qJudge(d: Difficulty, rng: RNG): Question {
  const items: [string, boolean][] = [
    ['teeth', true],
    ['wheel', true],
    ['fewer', true],
    ['more', false],
  ]
  const [k, ok] = rng.pick(items)
  return judge(K_BIKE, d, rng, `judge-${k}`, [T(`m6.bike.j.${k}`)], ok)
}
/** 蹬一圈，后齿轮转动几圈：前齿数 ÷ 后齿数（整数用数字键盘，小数做选项） */
export const REAR_TURNS: [number, number][] = [
  [48, 24],
  [48, 16],
  [40, 20],
  [42, 14],
  [36, 12],
  [40, 16],
  [48, 20],
]
function qRear(d: Difficulty, rng: RNG): Question {
  const [f, r] = d === 1 && rng.chance(0.5) ? rng.pick(REAR_TURNS.slice(0, 3)) : rng.pick(REAR_TURNS)
  const v = fr(f, r)
  // 错法：后齿数除以前齿数、两数相减
  return valueQ(K_BIKE, d, rng, `rear-${f}-${r}`, [T('m6.bike.rearQ', { f, r })], v, [show(fr(r, f)), String(f - r), show(fr(f, r * 2))])
}
/** 蹬一圈前进多少米：后轮转动的圈数 × 后轮转动一圈前进的米数 */
export const DISTS: [string, string][] = [
  ['3', '2'],
  ['2', '2'],
  ['2.5', '2'],
  ['3', '1.5'],
  ['2', '2.2'],
]
function qDist(d: Difficulty, rng: RNG): Question {
  const [n, c] = d === 1 && rng.chance(0.4) ? DISTS[0]! : rng.pick(DISTS)
  const v = mul(num(n), num(c))
  return valueQ(K_BIKE, d, rng, `dist-${n}-${c}`, [T('m6.bike.distQ', { n, c })], v, [show(fr(num(n)[0] * num(c)[1] + num(c)[0] * num(n)[1], num(n)[1] * num(c)[1])), c, show(mul(v, fr(2)))])
}
/** 用后轮的直径算：圈数 × π × 直径 */
export const DIAS: [string, number][] = [
  ['0.7', 2],
  ['0.6', 3],
  ['0.5', 2],
  ['0.7', 3],
]
function qDia(d: Difficulty, rng: RNG): Question {
  const [dia, n] = d === 1 && rng.chance(0.4) ? DIAS[0]! : rng.pick(DIAS)
  const round = mul(PI, num(dia))
  const v = mul(round, fr(n))
  // 错法：忘了乘圈数、把直径当半径（多乘了 2）、忘了乘 π
  return valueQ(K_BIKE, d, rng, `dia-${dia}-${n}`, [T('m6.bike.diaQ', { d: dia, n })], v, [show(round), show(mul(v, fr(2))), show(mul(num(dia), fr(n)))])
}
/** 蹬 n 圈，后齿轮转动几圈 */
export const TURNS: [number, number, number][] = [
  [40, 20, 5],
  [48, 16, 4],
  [48, 24, 6],
  [42, 14, 3],
]
function qTurns(d: Difficulty, rng: RNG): Question {
  const [f, r, n] = d === 1 && rng.chance(0.4) ? TURNS[0]! : rng.pick(TURNS)
  return intQ(K_BIKE, d, rng, `turns-${f}-${r}-${n}`, [T('m6.bike.turnsQ', { f, r, n })], (f * n) / r, [(r * n) / f, f / r])
}
/** 前、后齿轮的齿数比（化成最简），第 2 档的几个更难约 */
export const RATIO_1: [number, number][] = [
  [48, 24],
  [48, 28],
  [48, 16],
  [40, 16],
  [40, 24],
  [48, 18],
  [48, 20],
  [40, 20],
  [40, 28],
]
export const RATIO_2: [number, number][] = [
  [40, 18],
  [48, 14],
  [40, 14],
]
const reduced = (a: number, b: number): string => {
  const [n, m] = fr(a, b)
  return rt(n, m)
}
function qRatio(d: Difficulty, rng: RNG): Question {
  const [f, r] = d === 1 ? rng.pick(RATIO_1) : rng.pick([...RATIO_1, ...RATIO_2])
  const correct = reduced(f, r)
  const others = [...RATIO_1, ...RATIO_2].map(([a, b]) => reduced(a, b))
  return choose(K_BIKE, d, rng, `ratio-${f}-${r}`, [T('m6.bike.ratioQ', { f, r })], correct, ratioWrongs(correct, [reduced(r, f), ...rng.shuffle(others)]))
}
const gearTable = (): StemPart => ({
  kind: 'stat-table',
  rows: [
    [L('m6.bike.h.front'), ...FRONT, '', '', '', ''],
    [L('m6.bike.h.rear'), ...REAR],
  ],
  head: 'col',
})
function qCombos(d: Difficulty, rng: RNG): Question {
  return intQ(K_BIKE, d, rng, 'combos', [T('m6.bike.table'), gearTable(), T('m6.bike.combosQ')], FRONT.length * REAR.length, [FRONT.length + REAR.length, 6])
}
const combo = (f: number, r: number): LStr => L('m6.bike.combo', { f, r })
/** 蹬同样的圈数，哪种组合走得最远（齿数比最大：前 48、后 14） */
function qFar(d: Difficulty, rng: RNG): Question {
  const wrong: [number, number][] = [
    [40, 28],
    [48, 28],
    [40, 14],
    [40, 24],
  ]
  return choose(K_BIKE, d, rng, 'far', [T('m6.bike.table'), gearTable(), T('m6.bike.farQ')], combo(48, 14), rng.shuffle(wrong).slice(0, 3).map(([a, b]) => combo(a, b)))
}
/** 两种组合，蹬同样的圈数走得一样远吗（齿数比相等） */
export const SAME: [number, number, number, number][] = [
  [48, 24, 40, 20],
  [48, 16, 40, 20],
  [48, 20, 40, 16],
  [40, 24, 48, 28],
]
function qSame(d: Difficulty, rng: RNG): Question {
  const [a, b, c, e] = rng.pick(SAME)
  return judge(K_BIKE, d, rng, `same-${a}-${b}-${c}-${e}`, [T('m6.bike.sameJudge', { a, b, c, d: e })], eq(fr(a, b), fr(c, e)))
}
function qUnrelated(d: Difficulty, rng: RNG): Question {
  return choose(K_BIKE, d, rng, 'unrelated', [T('m6.bike.unrelatedQ')], L('m6.bike.opt.height'), [L('m6.bike.opt.frontTeeth'), L('m6.bike.opt.rearTeeth'), L('m6.bike.opt.diameter')])
}
function qInverse(d: Difficulty, rng: RNG): Question {
  return relQ(K_BIKE, d, rng, 'inverse', [T('m6.bike.inverseQ')], 'inverse')
}
/** 第 2 档：蹬 n 圈前进多少米（齿数 + 后轮直径） */
export const N_DIST: [number, number, string, number][] = [
  [48, 16, '0.7', 2],
  [40, 20, '0.6', 3],
  [48, 24, '0.5', 4],
]
function qNDist(d: Difficulty, rng: RNG): Question {
  const [f, r, dia, n] = rng.pick(N_DIST)
  const turns = fr((f * n) / r)
  const v = mul(mul(turns, PI), num(dia))
  return valueQ(K_BIKE, d, rng, `ndist-${f}-${r}-${dia}-${n}`, [T('m6.bike.nDistQ', { f, r, d: dia, n })], v, [show(mul(mul(fr(n), PI), num(dia))), show(mul(v, fr(2))), show(div(v, fr(n)))])
}
/** 第 2 档：两辆车谁走得远（后轮一样大） */
export const COMPARE: [number, number, number, number][] = [
  [48, 16, 40, 16],
  [40, 14, 40, 20],
  [48, 24, 40, 20],
  [40, 18, 48, 24],
]
function qCompare(d: Difficulty, rng: RNG): Question {
  const [a, b, c, e] = rng.pick(COMPARE)
  const x = fr(a, b)
  const y = fr(c, e)
  const key = eq(x, y) ? 'm6.bike.opt.sameFar' : x[0] * y[1] > y[0] * x[1] ? 'm6.bike.opt.first' : 'm6.bike.opt.second'
  const all = ['m6.bike.opt.first', 'm6.bike.opt.second', 'm6.bike.opt.sameFar']
  return choose(K_BIKE, d, rng, `compare-${a}-${b}-${c}-${e}`, [T('m6.bike.compareQ', { a, b, c, d: e })], L(key), all.filter((k) => k !== key).map((k) => L(k)))
}
/** 第 3 档：由后齿轮转动的圈数反推后齿轮的齿数 */
export const BACK: [number, number][] = [
  [48, 3],
  [48, 2],
  [40, 2],
  [42, 3],
]
function qBack(d: Difficulty, rng: RNG): Question {
  const [f, n] = rng.pick(BACK)
  return intQ(K_BIKE, d, rng, `back-${f}-${n}`, [T('m6.bike.backQ', { f, n })], f / n, [f * n, f - n])
}

function genBike(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 活动 1（原理、前齿轮转几圈、齿数同样多、后齿轮转几圈、后轮转几圈、蹬一圈走多远）、蹬几圈、活动 2（齿数比、组合数、最远、一样远、和什么有关）
    if (roll < 0.07) return qPrinciple(d, rng)
    if (roll < 0.12) return qOneTurn(d, rng)
    if (roll < 0.22) return qJudge(d, rng)
    if (roll < 0.36) return qRear(d, rng)
    if (roll < 0.45) return qDist(d, rng)
    if (roll < 0.54) return qDia(d, rng)
    if (roll < 0.63) return qTurns(d, rng)
    if (roll < 0.75) return qRatio(d, rng)
    if (roll < 0.8) return qCombos(d, rng)
    if (roll < 0.86) return qFar(d, rng)
    if (roll < 0.91) return qSame(d, rng)
    if (roll < 0.96) return qUnrelated(d, rng)
    return qInverse(d, rng)
  }
  if (d === 2) {
    if (roll < 0.3) return qNDist(d, rng)
    if (roll < 0.55) return qCompare(d, rng)
    if (roll < 0.8) return qRatio(d, rng)
    return qSame(d, rng)
  }
  if (roll < 0.5) return qBack(d, rng)
  if (roll < 0.75) return qNDist(d, rng)
  return qCompare(d, rng)
}
defineGenerator(K_BIKE, genBike)
