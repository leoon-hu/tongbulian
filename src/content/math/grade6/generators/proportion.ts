import type { Difficulty, GeoFig, GeoItem, GraphAxis, GraphSeries, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 六下「4 比例」（课本 p38–64，平台当前的旧版六下；六年级数学 H）。
// 1 比例的意义和基本性质：比例的意义 p38（三面国旗、做一做 1–2）、比例的基本性质 p39（项 / 内项 / 外项、例 1、做一做）、
//   解比例 p40（例 2 火箭模型、例 3、做一做 1–2）、练习八。
// 2 正比例和反比例：正比例 p43–44（例 1 彩带的表和图象、做一做 汽车）、反比例 p45–46（例 2 量筒、做一做 运货、你知道吗 反比例图象）、练习九。
// 3 比例的应用：比例尺 p51–53（意义、数值 / 线段比例尺、零件图；例 1、例 2、例 3 和三个做一做）、练习十；图形的放大与缩小 p57–58（现象、例 4、
//   做一做）；用比例解决问题 p59–60（例 5 水费、例 6 节能灯、做一做 1–2）、练习十一；整理和复习、练习十二分到各知识点的第 1、2 档。
// 「比」：新教材六上没有「比」这一单元，这里不单设知识点，入门题里一句白话交代比值（比号前面的数除以后面的数）；化简比只出课本的几种
//   （比例尺写成 1∶几 / 几∶1、单价之比、半径与周长 / 面积之比），都做成选项，选项里不放「没化简但相等」的比。
// 作答：整数一律数字键盘；小数、分数、比、比例式、带字母的式子一律选项（2–4 个），选项的值互不相同（比例式只有一个成立）。
// 写法：比号一律「∶」（U+2236，读「比」）；比例写成「a∶b = c∶d」，分数形式的比例另用 frac-chain 画（不朗读，题干文字照写比号形式）；
//   x 只出现在式子里，不单独做选项或答案；题目不出现「方程」，课本的「解比例」照用。
// 不出：描点连线、画图、量长度（量好的长度写进题干「在图上量得 3 厘米」）、开放题、说理题、练习十 6 / 11 / 12（动手、地理知识）。
// 朗读：「长」只在长度 / 长方形 / 边长 / 周长 / 长方体里（国旗写「长度」、火箭写「总长度」、长颈鹿换成梅花鹿、长征五号写「一种运载火箭」）；
//   「倒入」写「装进」，「应」写「要」，动词「种」写「栽」，「转」只写「转动」（自行车）；不写括号、「？」以外的问号。
// ─────────────────────────────────────────────────────────────

export const K_MEANING = 'm6s2-05-meaning'
export const K_PROPERTY = 'm6s2-05-property'
export const K_SOLVE = 'm6s2-05-solve'
export const K_DIRECT = 'm6s2-05-direct'
export const K_INVERSE = 'm6s2-05-inverse'
export const K_SCALE = 'm6s2-05-scale'
export const K_SCALE_USE = 'm6s2-05-scale-use'
export const K_ZOOM = 'm6s2-05-zoom'
export const K_APPLY = 'm6s2-05-apply'

type P = Record<string, LStr | number>
const L = (k: string, p?: P): LStr => (p ? { k, p } : { k })
const T = (k: string, p?: P): StemPart => ({ kind: 'text', text: L(k, p) })
const E = (expr: string): StemPart => ({ kind: 'expr', expr })

// ══ 数（一律化成分数算）══

/** 分数 [分子, 分母]，分母是正数、已经约分 */
export type F = [number, number]
export const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b))
export function fr(n: number, d = 1): F {
  const s = d < 0 ? -1 : 1
  const g = gcd(n, d) || 1
  return [(s * n) / g, (s * d) / g]
}
/** 课本里的数：整数、小数「2.4」、分数「10/3」 */
export function num(s: string): F {
  if (s.includes('/')) {
    const [a, b] = s.split('/').map(Number)
    return fr(a!, b!)
  }
  const [i = '0', f = ''] = s.split('.')
  return fr(Number(i + f), 10 ** f.length)
}
export const mul = (a: F, b: F): F => fr(a[0] * b[0], a[1] * b[1])
export const div = (a: F, b: F): F => fr(a[0] * b[1], a[1] * b[0])
export const eq = (a: F, b: F): boolean => a[0] * b[1] === b[0] * a[1]
const isInt = (f: F): boolean => f[1] === 1
/** 写成小数（最多 4 位，写不成的返回 null） */
export function decOf(f: F): string | null {
  for (let p = 0; p <= 4; p++) {
    const t = f[0] * 10 ** p
    if (t % f[1] !== 0) continue
    const v = t / f[1]
    if (p === 0) return String(v)
    const sgn = v < 0 ? '-' : ''
    const a = Math.abs(v)
    const s = `${Math.floor(a / 10 ** p)}.${String(a % 10 ** p).padStart(p, '0')}`.replace(/0+$/, '').replace(/\.$/, '')
    return sgn + s
  }
  return null
}
export const fracOf = (f: F): string => (f[1] === 1 ? String(f[0]) : `${f[0]}/${f[1]}`)
/** 整数写整数；prefer = 'dec' 能写成小数就写小数，否则写分数 */
export const show = (f: F, prefer: 'dec' | 'frac' = 'dec'): string => (isInt(f) ? String(f[0]) : prefer === 'dec' ? (decOf(f) ?? fracOf(f)) : fracOf(f))

// ══ 比和比例的写法 ══

/** 比号（U+2236，朗读读「比」；别用英文冒号——那个读成时刻） */
export const RATIO = '∶'
export const rt = (a: string | number, b: string | number): string => `${a}${RATIO}${b}`
export const pr = (a: string | number, b: string | number, c: string | number, d: string | number): string => `${rt(a, b)} = ${rt(c, d)}`
/** 比值 */
export const valueOfRatio = (r: string): F => {
  const [a, b] = r.split(RATIO)
  return div(num(a!), num(b!))
}
/** a∶b = c∶d 成立吗（外项的积等于内项的积） */
export const holds = (a: string, b: string, c: string, d: string): boolean => eq(mul(num(a), num(d)), mul(num(b), num(c)))

/** 四个数排成「p∶q = r∶s」的所有写法：成立的、不成立的（去掉重复的写法） */
export function arrangements(ns: string[]): { ok: string[]; bad: string[] } {
  const ok = new Set<string>()
  const bad = new Set<string>()
  const idx = [0, 1, 2, 3]
  for (const i of idx)
    for (const j of idx)
      for (const k of idx)
        for (const l of idx) {
          if (new Set([i, j, k, l]).size < 4) continue
          const [a, b, c, d] = [ns[i]!, ns[j]!, ns[k]!, ns[l]!]
          ;(holds(a, b, c, d) ? ok : bad).add(pr(a, b, c, d))
        }
  return { ok: [...ok], bad: [...bad] }
}
/** 比例式的选项：correct 成立，干扰项从不成立的写法里取（prefer 里的优先：课本暴露的错法） */
function propWrongs(ns: string[], prefer: string[], rng: RNG): string[] {
  const { bad } = arrangements(ns)
  const first = prefer.filter((s) => bad.includes(s))
  const rest = rng.shuffle(bad.filter((s) => !first.includes(s)))
  return [...new Set([...first, ...rest])].slice(0, 3)
}

/** 数的干扰项：值和答案不同、互不相同、是正数；不够两个时用 fallback 补 */
export function numWrongs(correct: string, cands: (string | null | undefined)[], count = 3): string[] {
  const out: string[] = []
  const cv = num(correct)
  for (const c of cands) {
    if (!c || !/^\d+(\.\d+)?(\/\d+)?$/.test(c)) continue
    const v = num(c)
    if (v[0] <= 0 || eq(v, cv) || out.some((o) => eq(num(o), v))) continue
    out.push(c)
    if (out.length >= count) break
  }
  return out
}
/** 比的干扰项：比值和答案不同、互不相同 */
export function ratioWrongs(correct: string, cands: string[], count = 3): string[] {
  const out: string[] = []
  const cv = valueOfRatio(correct)
  for (const c of cands) {
    const v = valueOfRatio(c)
    if (v[0] <= 0 || eq(v, cv) || out.some((o) => eq(valueOfRatio(o), v))) continue
    out.push(c)
    if (out.length >= count) break
  }
  return out
}

// ══ 出题的小骨架 ══

const YES = (): LStr => L('m6.prop.yes')
const NO = (): LStr => L('m6.prop.no')
export function judge(kp: string, d: Difficulty, rng: RNG, sig: string, stem: StemPart[], ok: boolean): Question {
  return labelQuestion({ kpId: kp, type: 'ratio', difficulty: d, sig, stem, correct: ok ? YES() : NO(), distractors: [ok ? NO() : YES()], rng })
}
export function choose(kp: string, d: Difficulty, rng: RNG, sig: string, stem: StemPart[], correct: LStr, distractors: LStr[]): Question {
  return labelQuestion({ kpId: kp, type: 'ratio', difficulty: d, sig, stem, correct, distractors, rng })
}
/** 带大图（图象、统计表、方格图、线段比例尺）的题，整数答案也做成选项：数字键盘四行约 300 像素，手机上和图一起一屏放不下（U5） */
const BIG_PARTS = new Set<StemPart['kind']>(['prop-graph', 'stat-table', 'geo', 'scale-bar'])
export const hasBigPart = (stem: StemPart[]): boolean => stem.some((p) => BIG_PARTS.has(p.kind))
/** 整数答案的干扰项（选项用）：smart（常见错法）在前，不够三个时补 2 倍、一半、差一个「档」（个位数差 1，两位数差 10……） */
function intWrongs(value: number, smart: number[]): string[] {
  const unit = value >= 10 ? 10 ** (String(Math.floor(value)).length - 1) : 1
  const cands = [...smart, value * 2, value % 2 === 0 ? value / 2 : null, value + unit, value - unit, value + 2 * unit]
  return numWrongs(String(value), cands.map((c) => (c === null || !(c > 0) ? null : show(num(String(c))))))
}
export function intQ(kp: string, d: Difficulty, rng: RNG, sig: string, stem: StemPart[], value: number, smart: number[] = []): Question {
  if (hasBigPart(stem)) return choose(kp, d, rng, sig, stem, String(value), intWrongs(value, smart))
  return numberQuestion({ kpId: kp, type: 'ratio', difficulty: d, sig, stem, value, rng, min: 0, max: Math.max(100, value * 10), smart, input: 'numpad' })
}
/** 答案可能是整数（数字键盘；带大图的也做成选项）也可能是小数 / 分数（选项） */
export function valueQ(kp: string, d: Difficulty, rng: RNG, sig: string, stem: StemPart[], value: F, wrongs: (string | null | undefined)[], prefer: 'dec' | 'frac' = 'dec'): Question {
  if (isInt(value) && !hasBigPart(stem)) return intQ(kp, d, rng, sig, stem, value[0])
  const correct = show(value, prefer)
  // 选项和答案写法一致（不然一眼就看出哪个不对）：答案是小数，写不成小数的干扰项不要；答案是分数，干扰项也写成分数
  const asFrac = correct.includes('/')
  const fit = (c: string | null | undefined): string | null => {
    if (!c || !/^\d+(\.\d+)?(\/\d+)?$/.test(c)) return null
    const v = num(c)
    return isInt(v) ? String(v[0]) : asFrac ? fracOf(v) : decOf(v)
  }
  const ws = numWrongs(correct, wrongs.map(fit))
  // 兜底：答案的 2 倍、一半、加 1
  for (const extra of [mul(value, fr(2)), div(value, fr(2)), fr(value[0] + value[1], value[1])]) if (ws.length < 3) ws.push(...numWrongs(correct, [fit(show(extra, prefer))], 1).filter((w) => !ws.some((o) => eq(num(o), num(w)))))
  return choose(kp, d, rng, sig, stem, correct, ws)
}
const REL = { direct: 'm6.prop.opt.direct', inverse: 'm6.prop.opt.inverse', none: 'm6.prop.opt.none' } as const
export type Rel = keyof typeof REL
export function relQ(kp: string, d: Difficulty, rng: RNG, sig: string, stem: StemPart[], rel: Rel): Question {
  const all: Rel[] = ['direct', 'inverse', 'none']
  return choose(kp, d, rng, sig, stem, L(REL[rel]), all.filter((r) => r !== rel).map((r) => L(REL[r])))
}
const table = (rows: (number | LStr | null)[][]): StemPart => ({ kind: 'stat-table', rows, head: 'col' })
const H = (k: string): LStr => L(`m6.prop.h.${k}`)

/** 两个比都由同一个最简比放大得来：p·m1∶q·m1 = p·m2∶q·m2 */
export const BASES: [number, number][] = [
  [2, 3],
  [3, 4],
  [2, 5],
  [3, 5],
  [4, 5],
  [5, 6],
  [3, 8],
  [5, 8],
  [4, 7],
  [2, 7],
  [3, 7],
  [5, 9],
  [4, 9],
  [7, 8],
]
/** 一个整数比例（四个数都不超过 99、互不相同） */
function intProp(rng: RNG): [number, number, number, number] {
  for (;;) {
    const [p, q] = rng.pick(BASES)
    const m1 = rng.int(1, 6)
    const m2 = rng.int(2, 11)
    const ns = [p * m1, q * m1, p * m2, q * m2]
    if (m1 !== m2 && Math.max(...ns) <= 99 && new Set(ns).size === 4) return ns as [number, number, number, number]
  }
}

// ═════════════════════════════════════════════════════════════
// 1. 比例的意义（p38；练习八 1、3、5）
// ═════════════════════════════════════════════════════════════

/** 课本求比值的比（p38 国旗、做一做 1、练习八 5、练习八 3 比值是 5） */
export const VALUE_BOOK = ['2.4∶1.6', '60∶40', '6∶10', '9∶15', '20∶5', '1∶4', '1/2∶1/3', '6∶4', '0.6∶0.2', '3/4∶1/4', '6∶9', '9∶12', '1.4∶2', '28∶40', '15∶3']
function qValue(d: Difficulty, rng: RNG): Question {
  let r: string
  if (d === 1 && rng.chance(0.35)) r = rng.pick(VALUE_BOOK.slice(0, 2))
  else if (rng.chance(0.5)) r = rng.pick(VALUE_BOOK)
  else {
    const [a, b] = intProp(rng)
    r = rt(a, b)
  }
  const [a, b] = r.split(RATIO) as [string, string]
  const v = valueOfRatio(r)
  // 错法：后一个数除以前一个数（倒过来）、用两数的差当比值
  const diff = fr(Math.abs(num(a)[0] * num(b)[1] - num(b)[0] * num(a)[1]), num(a)[1] * num(b)[1])
  const prefer = 'frac'
  const stem = d === 1 ? [T('m6.prop.m.valueHint'), T('m6.prop.m.valueQ', { r })] : [T('m6.prop.m.valueQ', { r })]
  return valueQ(K_MEANING, d, rng, `value-${r}`, stem, v, [show(div(num(b), num(a)), prefer), show(diff, prefer), show(fr(v[0] + 1, v[1]), prefer), show(fr(v[0], v[1] + 1), prefer)], prefer)
}

/** 长方形的东西：长度、宽度、单位（p38 三面国旗；另配几样用来出「不能组成比例」的） */
export const RECTS: Record<string, [string, string, 'm' | 'cm']> = {
  tiananmen: ['5', '10/3', 'm'],
  playground: ['2.4', '1.6', 'm'],
  classroom: ['60', '40', 'cm'],
  photo: ['15', '10', 'cm'],
  painting: ['60', '45', 'cm'],
  desk: ['1.2', '0.8', 'm'],
  card: ['8', '5', 'cm'],
}
/** 第 1 档：课本的三面国旗两两比，再加几对（一半能组成比例、一半不能） */
export const RECT_PAIRS: [string, string][] = [
  ['playground', 'classroom'],
  ['tiananmen', 'playground'],
  ['tiananmen', 'classroom'],
  ['playground', 'photo'],
  ['classroom', 'painting'],
  ['playground', 'card'],
  ['desk', 'classroom'],
  ['painting', 'photo'],
  ['card', 'desk'],
]
function rectParams(a: string, b: string): P {
  const [l1, w1, u1] = RECTS[a]!
  const [l2, w2, u2] = RECTS[b]!
  return { a: L(`m6.prop.m.o.${a}`), b: L(`m6.prop.m.o.${b}`), l1, w1, l2, w2, u1: L(`m6.prop.u.${u1}`), u2: L(`m6.prop.u.${u2}`) }
}
function qRect(d: Difficulty, rng: RNG): Question {
  const [a, b] = d === 1 && rng.chance(0.5) ? rng.pick(RECT_PAIRS.slice(0, 3)) : rng.pick(RECT_PAIRS)
  const [l1, w1] = RECTS[a]!
  const [l2, w2] = RECTS[b]!
  return judge(K_MEANING, d, rng, `rect-${a}-${b}`, [T('m6.prop.m.rectQ', rectParams(a, b))], holds(l1, w1, l2, w2))
}
function qRectWrite(d: Difficulty, rng: RNG): Question {
  const ok = RECT_PAIRS.filter(([a, b]) => holds(RECTS[a]![0], RECTS[a]![1], RECTS[b]![0], RECTS[b]![1]))
  const [a, b] = d === 1 && rng.chance(0.6) ? rng.pick(ok.slice(0, 3)) : rng.pick(ok)
  const [l1, w1] = RECTS[a]!
  const [l2, w2] = RECTS[b]!
  return choose(K_MEANING, d, rng, `rectwrite-${a}-${b}`, [T('m6.prop.m.rectWriteQ', rectParams(a, b))], pr(l1, w1, l2, w2), propWrongs([l1, w1, l2, w2], [pr(l1, w1, w2, l2), pr(w1, l1, l2, w2), pr(l1, w2, l2, w1)], rng))
}

function qDefinition(d: Difficulty, rng: RNG): Question {
  return choose(K_MEANING, d, rng, 'def', [T('m6.prop.m.defQ')], L('m6.prop.opt.proportion'), [L('m6.prop.opt.ratioValue'), L('m6.prop.opt.ratio'), L('m6.prop.opt.fraction')])
}
const CONCEPTS: [string, boolean][] = [
  ['equal', true],
  ['def', true],
  ['unequal', false],
]
function qConcept(d: Difficulty, rng: RNG): Question {
  const [k, ok] = rng.pick(CONCEPTS)
  return judge(K_MEANING, d, rng, `concept-${k}`, [T(`m6.prop.m.c.${k}`)], ok)
}

/** 课本判断两个比能不能组成比例的题：做一做 1（p38）、练习八 5（p41） */
export const PAIRS_MEANING: [string, string][] = [
  ['6∶10', '9∶15'],
  ['20∶5', '1∶4'],
  ['1/2∶1/3', '6∶4'],
  ['0.6∶0.2', '3/4∶1/4'],
  ['6∶9', '9∶12'],
  ['1.4∶2', '28∶40'],
  ['1/2∶1/5', '5/8∶1/4'],
  ['7.5∶1.3', '5.7∶3.1'],
]
const pairOk = ([x, y]: [string, string]): boolean => eq(valueOfRatio(x), valueOfRatio(y))
/** 生成一对整数比：一半成立，另一半是课本暴露的错法（后一个比前后颠倒、两项加同一个数、差一点） */
function genPair(rng: RNG, want?: boolean): [string, string] {
  const [p, q] = rng.pick(BASES)
  const m1 = rng.int(1, 5)
  const m2 = m1 + rng.int(1, 5)
  const A: [number, number] = [p * m1, q * m1]
  const B: [number, number] = [p * m2, q * m2]
  const ok = want ?? rng.chance(0.5)
  let pair: [string, string]
  if (ok) pair = [rt(...A), rt(...B)]
  else {
    const roll = rng.next()
    if (roll < 0.4) pair = [rt(...A), rt(B[1], B[0])]
    else if (roll < 0.7) pair = [rt(...A), rt(B[0], A[1] + B[0] - A[0])]
    else pair = [rt(...A), rt(B[0], B[1] + 1)]
  }
  return rng.chance(0.5) ? pair : [pair[1], pair[0]]
}
function qPairJudge(d: Difficulty, rng: RNG): Question {
  const pair = d === 1 && rng.chance(0.5) ? rng.pick(PAIRS_MEANING.slice(0, 4)) : d === 3 || rng.chance(0.5) ? rng.pick(PAIRS_MEANING) : genPair(rng)
  return judge(K_MEANING, d, rng, `pair-${pair[0]}-${pair[1]}`, [T('m6.prop.m.pairQ', { a: pair[0], b: pair[1] })], pairOk(pair))
}
function qPairPick(d: Difficulty, rng: RNG): Question {
  const good = rng.chance(0.4) ? rng.pick(PAIRS_MEANING.filter(pairOk)) : genPair(rng, true)
  const bads: [string, string][] = []
  const pool = rng.shuffle(PAIRS_MEANING.filter((p) => !pairOk(p)))
  while (bads.length < 3) {
    const cand = pool.length && rng.chance(0.4) ? pool.pop()! : genPair(rng, false)
    if (!bads.some((b) => b[0] === cand[0] && b[1] === cand[1]) && !(cand[0] === good[0] && cand[1] === good[1])) bads.push(cand)
  }
  const lab = ([a, b]: [string, string]): LStr => L('m6.prop.pair', { a, b })
  return choose(K_MEANING, d, rng, `pick-${good.join('-')}-${bads.map((b) => b.join('-')).join('|')}`, [T('m6.prop.m.pickQ')], lab(good), bads.map(lab))
}
function qPairWrite(d: Difficulty, rng: RNG): Question {
  const pair = d === 1 && rng.chance(0.5) ? rng.pick(PAIRS_MEANING.slice(0, 4).filter(pairOk)) : rng.chance(0.4) ? rng.pick(PAIRS_MEANING.filter(pairOk)) : genPair(rng, true)
  const [a, b] = pair[0].split(RATIO) as [string, string]
  const [c, e] = pair[1].split(RATIO) as [string, string]
  return choose(K_MEANING, d, rng, `pairwrite-${pair.join('-')}`, [T('m6.prop.m.pairWriteQ', { a: pair[0], b: pair[1] })], pr(a, b, c, e), propWrongs([a, b, c, e], [pr(a, b, e, c), pr(b, a, c, e), pr(a, e, c, b)], rng))
}

/** 做一做 2：直角三角形（竖直的直角边 H、底 W），离右端 w 处一条高 h 的竖线（H∶W = h∶w） */
export const TRIS: [number, number, number, number][] = [
  [3, 4, 1.5, 2],
  [6, 8, 3, 4],
  [4, 6, 2, 3],
  [5, 6, 2.5, 3],
]
export function triFig([Hh, W, h, w]: [number, number, number, number]): StemPart {
  const s = (v: number): string => String(v)
  const fig: GeoFig = {
    w: W,
    h: Hh,
    px: Math.floor(Math.min(220 / W, 150 / Hh)),
    items: [
      { t: 'poly', pts: [[0, 0], [0, Hh], [W, Hh]], right: [1] },
      { t: 'line', a: [W - w, Hh - h], b: [W - w, Hh] },
      { t: 'line', a: [0, 0], b: [0, Hh], dim: s(Hh), off: -16 },
      { t: 'line', a: [0, Hh], b: [W, Hh], dim: s(W), off: -36 },
      { t: 'line', a: [W - w, Hh], b: [W, Hh], dim: s(w), off: -14 },
      { t: 'line', a: [W - w, Hh - h], b: [W - w, Hh], dim: s(h), off: -14 },
    ],
  }
  return { kind: 'geo', figs: [fig], alt: `（直角三角形，标着 ${Hh}、${W}、${h}、${w} 四条线段的长度）` }
}
function qTriangle(d: Difficulty, rng: RNG): Question {
  const t = d === 1 && rng.chance(0.5) ? TRIS[0]! : rng.pick(TRIS)
  const [Hh, W, h, w] = t.map(String) as [string, string, string, string]
  const correct = rng.chance(0.5) ? pr(Hh, W, h, w) : pr(Hh, h, W, w)
  return choose(K_MEANING, d, rng, `tri-${t.join('-')}-${correct}`, [T('m6.prop.m.triQ'), triFig(t)], correct, propWrongs([Hh, W, h, w], [pr(Hh, W, w, h), pr(Hh, w, h, W), pr(W, Hh, h, w)], rng))
}

/** 练习八 1 的四张表（两种量各两个数），另配几张 */
export const TABLES: { a: string; b: string; av: [number, number]; bv: [number, number] }[] = [
  { a: 'age', b: 'heightM', av: [12, 14], bv: [1.4, 1.6] },
  { a: 'boxes', b: 'massKg', av: [2, 8], bv: [30, 120] },
  { a: 'hours', b: 'distKm', av: [2, 3], bv: [30, 40] },
  { a: 'clothes', b: 'total', av: [5, 10], bv: [400, 800] },
  { a: 'books', b: 'total', av: [3, 6], bv: [36, 72] },
  { a: 'sideCm', b: 'areaCm', av: [2, 3], bv: [4, 9] },
  { a: 'hours', b: 'distKm', av: [2, 5], bv: [120, 300] },
  { a: 'boxes', b: 'massKg', av: [3, 5], bv: [45, 70] },
]
const tableOk = (t: (typeof TABLES)[number]): boolean => holds(String(t.av[0]), String(t.bv[0]), String(t.av[1]), String(t.bv[1]))
const tablePart = (t: (typeof TABLES)[number]): StemPart => table([[H(t.a), ...t.av], [H(t.b), ...t.bv]])
function qTable(d: Difficulty, rng: RNG): Question {
  const i = d === 1 && rng.chance(0.6) ? rng.int(0, 3) : rng.int(0, TABLES.length - 1)
  const t = TABLES[i]!
  return judge(K_MEANING, d, rng, `table-${i}`, [T('m6.prop.m.tableQ'), tablePart(t)], tableOk(t))
}
function qTableWrite(d: Difficulty, rng: RNG): Question {
  const oks = TABLES.map((t, i) => [t, i] as const).filter(([t]) => tableOk(t))
  const [t, i] = d === 1 && rng.chance(0.6) ? rng.pick(oks.slice(0, 2)) : rng.pick(oks)
  const [a1, a2] = t.av.map(String) as [string, string]
  const [b1, b2] = t.bv.map(String) as [string, string]
  return choose(K_MEANING, d, rng, `tablewrite-${i}`, [T('m6.prop.m.tableWriteQ'), tablePart(t)], pr(a1, b1, a2, b2), propWrongs([a1, b1, a2, b2], [pr(a1, b1, b2, a2), pr(b1, a1, a2, b2), pr(a1, b2, a2, b1)], rng))
}

/** 练习八 3：比值是 5 的比 */
export const FIVES = ['15∶3', '10∶2', '25∶5', '40∶8', '35∶7', '0.5∶0.1']
const NOT_FIVE = ['3∶15', '5∶25', '10∶5', '20∶5', '30∶5', '12∶2', '2∶10']
function qFive(d: Difficulty, rng: RNG): Question {
  const correct = rng.pick(FIVES)
  const [a, b] = correct.split(RATIO) as [string, string]
  return choose(K_MEANING, d, rng, `five-${correct}`, [T('m6.prop.m.fiveQ')], correct, ratioWrongs(correct, [rt(b, a), ...rng.shuffle(NOT_FIVE)]))
}
/** 和这个比能组成比例的比（练习八 3「组成比例」） */
function qPartner(d: Difficulty, rng: RNG): Question {
  const [p, q] = rng.pick(BASES)
  const m1 = rng.int(1, 4)
  const k = rng.int(2, 4)
  const [a, b] = [p * m1, q * m1]
  const r = rt(a, b)
  const correct = rt(a * k, b * k)
  // 错法：前后颠倒、两项加同一个数（差相等）、只把一项放大
  return choose(K_MEANING, d, rng, `partner-${r}-${k}`, [T('m6.prop.m.partnerQ', { r })], correct, ratioWrongs(correct, [rt(b * k, a * k), rt(a + (k - 1) * a, b + (k - 1) * a), rt(a * k, b), rt(a * k, b * k + 1)]))
}
/** 第 2 档：三个比里挑两个 */
function qPickTwo(d: Difficulty, rng: RNG): Question {
  const [A, B] = genPair(rng, true)
  const [a, b] = A.split(RATIO).map(Number) as [number, number]
  const C = rng.chance(0.5) ? rt(b, a) : rt(a + 1, b)
  const order = rng.shuffle([A, B, C])
  const lab = (x: string, y: string): LStr => L('m6.prop.pair', { a: x, b: y })
  const [x, y, z] = order as [string, string, string]
  const pairs: [string, string][] = [
    [x, y],
    [x, z],
    [y, z],
  ]
  const good = pairs.find((p) => pairOk(p))!
  return choose(K_MEANING, d, rng, `picktwo-${order.join('-')}`, [T('m6.prop.m.pickTwoQ', { a: x, b: y, c: z })], lab(...good), pairs.filter((p) => p !== good).map((p) => lab(...p)))
}

function genMeaning(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 求比值（入门）、三面国旗、定义、做一做 1（判断 / 挑组 / 写比例）、做一做 2、练习八 1、3、5、概念
    if (roll < 0.1) return qValue(d, rng)
    if (roll < 0.2) return qRect(d, rng)
    if (roll < 0.28) return qRectWrite(d, rng)
    if (roll < 0.33) return qDefinition(d, rng)
    if (roll < 0.47) return qPairJudge(d, rng)
    if (roll < 0.55) return qPairPick(d, rng)
    if (roll < 0.63) return qPairWrite(d, rng)
    if (roll < 0.71) return qTriangle(d, rng)
    if (roll < 0.79) return qTable(d, rng)
    if (roll < 0.85) return qTableWrite(d, rng)
    if (roll < 0.9) return qFive(d, rng)
    if (roll < 0.95) return qPartner(d, rng)
    return qConcept(d, rng)
  }
  if (d === 2) {
    if (roll < 0.2) return qPairJudge(d, rng)
    if (roll < 0.35) return qPickTwo(d, rng)
    if (roll < 0.5) return qValue(d, rng)
    if (roll < 0.65) return qPairWrite(d, rng)
    if (roll < 0.8) return qTable(d, rng)
    return qPartner(d, rng)
  }
  if (roll < 0.4) return qPairJudge(d, rng)
  if (roll < 0.7) return qPickTwo(d, rng)
  return qRectWrite(d, rng)
}
defineGenerator(K_MEANING, genMeaning)

// ═════════════════════════════════════════════════════════════
// 2. 比例的基本性质（p39；练习八 2、4、7、14）
// ═════════════════════════════════════════════════════════════

/** 课本里的比例（a∶b = c∶d）：p39 的 2.4∶1.6 = 60∶40、练习八 4 的水稻田、做一做 1、练习八 2、14 */
export const PROPS_BOOK: [string, string, string, string][] = [
  ['2.4', '1.6', '60', '40'],
  ['3.75', '0.5', '6', '0.8'],
  ['6', '10', '9', '15'],
  ['4', '5', '12', '15'],
  ['3', '8', '15', '40'],
  ['24', '8', '9', '3'],
]
function someProp(d: Difficulty, rng: RNG): [string, string, string, string] {
  if (d === 1 && rng.chance(0.4)) return PROPS_BOOK[0]!
  if (rng.chance(0.4)) return rng.pick(PROPS_BOOK)
  return intProp(rng).map(String) as [string, string, string, string]
}
const two = (a: string, b: string): LStr => L('m6.prop.two', { a, b })
/** 外项 / 内项是哪两个数：错法——内外弄反、同一个比的两个数 */
function qTerms(d: Difficulty, rng: RNG): Question {
  const [a, b, c, e] = someProp(d, rng)
  const outer = rng.chance(0.5)
  const correct = outer ? two(a, e) : two(b, c)
  const wrong = [outer ? two(b, c) : two(a, e), two(a, b), two(c, e), two(a, c)]
  return choose(K_PROPERTY, d, rng, `${outer ? 'outer' : 'inner'}-${pr(a, b, c, e)}`, [T(outer ? 'm6.prop.p.outerQ' : 'm6.prop.p.innerQ', { p: pr(a, b, c, e) })], correct, wrong.slice(0, 3))
}
/** 分数形式的比例（frac-chain 画两层）：外项、内项不变 */
export function fracForm(a: string, b: string, c: string, e: string): StemPart {
  return { kind: 'frac-chain', terms: [{ n: a, d: b }, { t: '=' }, { n: c, d: e }] }
}
function qFracTerms(d: Difficulty, rng: RNG): Question {
  const [a, b, c, e] = d === 1 && rng.chance(0.5) ? PROPS_BOOK[0]! : rng.pick(PROPS_BOOK)
  const outer = rng.chance(0.5)
  const correct = outer ? two(a, e) : two(b, c)
  return choose(K_PROPERTY, d, rng, `frac${outer ? 'outer' : 'inner'}-${pr(a, b, c, e)}`, [T('m6.prop.p.fracFormQ', { p: pr(a, b, c, e) }), fracForm(a, b, c, e), T(outer ? 'm6.prop.p.fracOuterQ' : 'm6.prop.p.fracInnerQ')], correct, [outer ? two(b, c) : two(a, e), two(a, b), two(a, c)])
}
/** 例 1：外项的积、内项的积（积是整数的比例） */
function qProduct(d: Difficulty, rng: RNG): Question {
  const outer = rng.chance(0.5)
  if (d === 1 && rng.chance(0.25)) {
    // 例 1(2) 分数形式的 3/5 = 9/15
    const v = outer ? 3 * 15 : 5 * 9
    return intQ(K_PROPERTY, d, rng, `fracproduct-${outer ? 'outer' : 'inner'}`, [T('m6.prop.p.fracFormQ', { p: pr(3, 5, 9, 15) }), fracForm('3', '5', '9', '15'), T(outer ? 'm6.prop.p.fracOuterProductQ' : 'm6.prop.p.fracInnerProductQ')], v, [3 + 15, 3 * 5, 9 * 15])
  }
  const [a, b, c, e] = someProp(d, rng)
  const value = mul(outer ? num(a) : num(b), outer ? num(e) : num(c))
  if (!isInt(value)) return qTerms(d, rng)
  return intQ(K_PROPERTY, d, rng, `product-${outer ? 'outer' : 'inner'}-${pr(a, b, c, e)}`, [T(outer ? 'm6.prop.p.outerProductQ' : 'm6.prop.p.innerProductQ', { p: pr(a, b, c, e) })], value[0])
}
const STATEMENTS: [string, boolean][] = [
  ['product', true],
  ['sum', false],
  ['converse', true],
]
function qStatement(d: Difficulty, rng: RNG): Question {
  const [k, ok] = rng.pick(STATEMENTS)
  return judge(K_PROPERTY, d, rng, `stmt-${k}`, [T(`m6.prop.p.s.${k}`)], ok)
}
function qLetters(d: Difficulty, rng: RNG): Question {
  return choose(K_PROPERTY, d, rng, 'letters', [T('m6.prop.p.lettersQ')], 'ad = bc', ['ab = cd', 'ac = bd', 'a + d = b + c'])
}
export const OTHER_PRODUCTS = [24, 36, 45, 60, 72, 96, 120, 150]
function qOtherProduct(d: Difficulty, rng: RNG): Question {
  const n = rng.pick(OTHER_PRODUCTS)
  const inner = rng.chance(0.5)
  return intQ(K_PROPERTY, d, rng, `other-${inner ? 'inner' : 'outer'}-${n}`, [T('m6.prop.p.otherQ', { which: L(inner ? 'm6.prop.p.inner' : 'm6.prop.p.outer'), n, other: L(inner ? 'm6.prop.p.outer' : 'm6.prop.p.inner') })], n, [n * 2, Math.round(n / 2)])
}
/** p39 做一做：用外项积、内项积判断 */
export const PAIRS_PROPERTY: [string, string][] = [
  ['6∶3', '8∶5'],
  ['0.2∶2.5', '4∶50'],
  ['1/3∶1/6', '1/2∶1/4'],
  ['1.2∶3/4', '4/5∶5'],
]
function qProductJudge(d: Difficulty, rng: RNG): Question {
  const pair = (d === 1 && rng.chance(0.6)) || d === 3 ? rng.pick(PAIRS_PROPERTY) : genPair(rng)
  return judge(K_PROPERTY, d, rng, `pjudge-${pair[0]}-${pair[1]}`, [T('m6.prop.p.judgeQ', { a: pair[0], b: pair[1] })], pairOk(pair))
}
/** 练习八 2：四个数能不能组成比例 */
export const FOURS: string[][] = [
  ['4', '5', '12', '15'],
  ['2', '3', '4', '5'],
  ['1.6', '6.4', '2', '5'],
  ['1/2', '1/3', '1/6', '1/4'],
]
export const fourOk = (ns: string[]): boolean => arrangements(ns).ok.length > 0
const four = (ns: string[]): LStr => L('m6.prop.four', { a: ns[0]!, b: ns[1]!, c: ns[2]!, d: ns[3]! })
function genFour(rng: RNG, ok: boolean): string[] {
  const ns = intProp(rng)
  if (!ok) ns[rng.int(0, 3)] += 1
  return rng.shuffle(ns.map(String)).sort((x, y) => Number(x) - Number(y))
}
function qFour(d: Difficulty, rng: RNG): Question {
  const ns = (d === 1 && rng.chance(0.5)) || d === 3 ? rng.pick(FOURS) : genFour(rng, rng.chance(0.5))
  return judge(K_PROPERTY, d, rng, `four-${ns.join('-')}`, [T('m6.prop.p.fourQ', { n: four(ns) })], fourOk(ns))
}
function qFourWrite(d: Difficulty, rng: RNG): Question {
  const ns = d === 1 && rng.chance(0.5) ? FOURS[0]! : d === 3 ? FOURS[3]! : genFour(rng, true)
  const { ok } = arrangements(ns)
  const correct = rng.pick(ok)
  return choose(K_PROPERTY, d, rng, `fourwrite-${ns.join('-')}-${correct}`, [T('m6.prop.p.fourWriteQ', { n: four(ns) })], correct, propWrongs(ns, [pr(ns[0]!, ns[1]!, ns[2]!, ns[3]!)], rng))
}
/** 练习八 4：两块水稻田 */
function qRice(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (roll < 0.34) return judge(K_PROPERTY, d, rng, 'rice-judge', [T('m6.prop.p.rice'), T('m6.prop.p.riceJudge')], true)
  const outer = roll < 0.67
  const [a, b, c, e] = PROPS_BOOK[1]!
  return choose(K_PROPERTY, d, rng, `rice-${outer ? 'outer' : 'inner'}`, [T('m6.prop.p.riceProp', { p: pr(a, b, c, e) }), T(outer ? 'm6.prop.p.outerShortQ' : 'm6.prop.p.innerShortQ')], outer ? two(a, e) : two(b, c), [outer ? two(b, c) : two(a, e), two(a, b), two(c, e)])
}
/** 练习八 7、14：由等式改写成比例（a × b = c × d） */
export const EQS: [string, string, string, string][] = [
  ['24', '3', '8', '9'],
  ['3', '40', '8', '15'],
  ['2.5', '0.4', '0.5', '2'],
]
const FACTOR_PAIRS: [number, number, number, number][] = [
  [3, 8, 4, 6],
  [2, 18, 4, 9],
  [4, 15, 6, 10],
  [3, 16, 6, 8],
  [5, 12, 6, 10],
  [2, 21, 6, 7],
  [4, 18, 8, 9],
  [3, 20, 5, 12],
]
function someEq(d: Difficulty, rng: RNG): [string, string, string, string] {
  if (d === 1 && rng.chance(0.6)) return rng.pick(EQS)
  const f = rng.pick(FACTOR_PAIRS)
  const [a, b, c, e] = rng.chance(0.5) ? f : [f[2], f[3], f[0], f[1]]
  return (rng.chance(0.5) ? [a, b, c, e] : [b, a, e, c]).map(String) as [string, string, string, string]
}
function qFromEq(d: Difficulty, rng: RNG): Question {
  const [a, b, c, e] = someEq(d, rng)
  const ok = [pr(a, c, e, b), pr(c, a, b, e), pr(a, e, c, b), pr(e, a, b, c)]
  const correct = rng.pick(ok.filter((s) => holds(...(s.split(/∶| = /) as [string, string, string, string]))))
  return choose(K_PROPERTY, d, rng, `eq-${a}-${b}-${c}-${e}-${correct}`, [T(rng.chance(0.5) ? 'm6.prop.p.eqQ' : 'm6.prop.p.eqRewriteQ', { a, b, c, d: e })], correct, propWrongs([a, b, c, e], [pr(a, b, c, e), pr(a, c, b, e)], rng))
}
function qCount(d: Difficulty, rng: RNG): Question {
  const [a, b, c, e] = rng.chance(0.4) ? EQS[0]! : someEq(2, rng)
  return intQ(K_PROPERTY, d, rng, `count-${a}-${b}-${c}-${e}`, [T('m6.prop.p.countQ', { a, b, c, d: e })], arrangements([a, b, c, e]).ok.length, [4, 2, 1])
}
function qTermCount(d: Difficulty, rng: RNG): Question {
  return intQ(K_PROPERTY, d, rng, 'terms', [T('m6.prop.p.termsQ')], 4, [2, 3])
}

function genProperty(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 项 / 外项 / 内项、分数形式、例 1 的积、性质（字母式、已知一积）、做一做、练习八 2、4、7、14
    if (roll < 0.12) return qTerms(d, rng)
    if (roll < 0.19) return qFracTerms(d, rng)
    if (roll < 0.33) return qProduct(d, rng)
    if (roll < 0.39) return qStatement(d, rng)
    if (roll < 0.43) return qLetters(d, rng)
    if (roll < 0.49) return qOtherProduct(d, rng)
    if (roll < 0.6) return qProductJudge(d, rng)
    if (roll < 0.69) return qFour(d, rng)
    if (roll < 0.76) return qFourWrite(d, rng)
    if (roll < 0.82) return qRice(d, rng)
    if (roll < 0.96) return qFromEq(d, rng)
    return qTermCount(d, rng)
  }
  if (d === 2) {
    if (roll < 0.25) return qCount(d, rng)
    if (roll < 0.45) return qFour(d, rng)
    if (roll < 0.65) return qFromEq(d, rng)
    if (roll < 0.8) return qProductJudge(d, rng)
    return qFourWrite(d, rng)
  }
  if (roll < 0.4) return qProductJudge(d, rng)
  if (roll < 0.7) return qFour(d, rng)
  return qFourWrite(d, rng)
}
defineGenerator(K_PROPERTY, genProperty)

// ═════════════════════════════════════════════════════════════
// 3. 解比例（p40；练习八 6、8–13、15；整理和复习 2）
// ═════════════════════════════════════════════════════════════

/** 解比例：terms 里有一个是「x」；frac = 课本写成分数形式（另画 frac-chain） */
export interface SolveItem {
  terms: [string, string, string, string]
  frac?: boolean
}
/** 未知数 x 的值（按比例的基本性质：外项的积等于内项的积） */
export function solveX(t: [string, string, string, string]): F {
  const i = t.indexOf('x')
  const [a, b, c, e] = t
  if (i === 0) return div(mul(num(b), num(c)), num(e))
  if (i === 3) return div(mul(num(b), num(c)), num(a))
  if (i === 1) return div(mul(num(a), num(e)), num(c))
  return div(mul(num(a), num(e)), num(b))
}
const solveStem = (it: SolveItem): StemPart[] => {
  const [a, b, c, e] = it.terms
  if (it.frac) return [T('m6.prop.s.fracSolve', { p: pr(a, b, c, e) }), fracForm(a, b, c, e), E('x = ?')]
  return [T('m6.prop.s.solve'), E(pr(a, b, c, e)), E('x = ?')]
}
/** 例 3、做一做 1、练习八 8、整理和复习 2（小数、分数的答案做成选项，错法：对错了项、倒过来除） */
export const SOLVE_BOOK: SolveItem[] = [
  { terms: ['2.4', '1.5', '6', 'x'], frac: true },
  { terms: ['x', '10', '1/4', '1/3'] },
  { terms: ['0.4', 'x', '1.2', '2'] },
  { terms: ['12', '2.4', '3', 'x'], frac: true },
  { terms: ['2', '9', '8', 'x'], frac: true },
  { terms: ['6.5', 'x', '3.25', '4'] },
]
/** 第 2、3 档：练习八 8、整理和复习 2 里别的几个 */
export const SOLVE_MORE: SolveItem[] = [
  { terms: ['1/2', '1/3', '1/4', 'x'] },
  { terms: ['0.8', '4', 'x', '8'] },
  { terms: ['3/4', 'x', '3', '12'] },
  { terms: ['x', '3/4', '1/5', '2/5'] },
  { terms: ['4', 'x', '5', '6'], frac: true },
  { terms: ['x', '1/2', '2/3', '4'] },
  { terms: ['1.2', '2.5', '3', 'x'], frac: true },
]
/** 解比例的错法：对错了项（拿错的两个数相乘再除以第三个） */
function solveWrongs(t: [string, string, string, string]): string[] {
  const known = t.filter((s) => s !== 'x').map(num) as [F, F, F]
  const [p, q, r] = known
  const out = [div(mul(p, q), r), div(mul(p, r), q), div(mul(q, r), p)].map((f) => show(f, t.some((s) => s.includes('/')) ? 'frac' : 'dec'))
  const x = solveX(t)
  return [...out, show(mul(x, fr(10))), show(div(x, fr(10)))]
}
function qSolveBook(d: Difficulty, rng: RNG, items: SolveItem[]): Question {
  const it = rng.pick(items)
  const x = solveX(it.terms)
  const prefer = it.terms.some((s) => s.includes('/')) && !eq(x, fr(15, 2)) ? 'frac' : 'dec'
  return valueQ(K_SOLVE, d, rng, `book-${it.terms.join('|')}`, solveStem(it), x, solveWrongs(it.terms), prefer)
}
/** 整数比例，x 在四个位置都出（数字键盘） */
function qSolveInt(d: Difficulty, rng: RNG): Question {
  const ns = intProp(rng).map(String) as [string, string, string, string]
  const pos = rng.int(0, 3)
  const t = ns.map((s, i) => (i === pos ? 'x' : s)) as [string, string, string, string]
  return intQ(K_SOLVE, d, rng, `int-${t.join('|')}`, [T('m6.prop.s.solve'), E(pr(...t)), E('x = ?')], Number(ns[pos]))
}
/** 例 3 的第一步：根据基本性质写成乘法的式子（x 和谁相乘、另外两个数相乘） */
export const CROSS: [string, string, string, string][] = [
  ['2.4', '1.5', '6', 'x'],
  ['x', '57', '1', '10'],
  ['0.4', 'x', '1.2', '2'],
  ['0.8', '4', 'x', '8'],
  ['5', '8', '40', 'x'],
  ['6.5', 'x', '3.25', '4'],
]
const coef = (c: string): string => (c === '1' ? 'x' : `${c}x`)
function qCross(d: Difficulty, rng: RNG): Question {
  const t = d === 1 && rng.chance(0.4) ? CROSS[0]! : rng.pick(CROSS)
  const i = t.indexOf('x')
  const partner = t[3 - i]!
  const others = t.filter((_, j) => j !== i && j !== 3 - i) as [string, string]
  const correct = `${coef(partner)} = ${others[0]} × ${others[1]}`
  const wrong = [`${coef(others[0])} = ${partner} × ${others[1]}`, `${coef(others[1])} = ${partner} × ${others[0]}`, `${partner} + x = ${others[0]} + ${others[1]}`]
  return choose(K_SOLVE, d, rng, `cross-${t.join('|')}`, [T('m6.prop.s.crossQ', { p: pr(...t) })], correct, wrong)
}
/** 例 2：火箭模型（总长度 57 米，模型∶火箭 = 1∶10） */
function qRocket(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  const head = T('m6.prop.s.rocket', { l: 57, r: rt(1, 10) })
  if (roll < 0.5) return valueQ(K_SOLVE, d, rng, 'rocket', [head, T('m6.prop.s.rocketQ')], fr(57, 10), ['570', '0.57', '47', '67'])
  return choose(K_SOLVE, d, rng, 'rocket-setup', [head, T('m6.prop.s.rocketSetupQ')], pr('x', 57, 1, 10), [pr('x', 57, 10, 1), pr(57, 'x', 1, 10), pr('x', 10, 1, 57)])
}
/** 做一做 2：消毒液与水 1∶150（毫升换成升） */
export const DISINFECT: [number, number][] = [
  [100, 150],
  [200, 150],
  [50, 200],
  [40, 250],
  [60, 100],
]
function qDisinfect(d: Difficulty, rng: RNG): Question {
  const [a, k] = d === 1 && rng.chance(0.5) ? DISINFECT[0]! : rng.pick(DISINFECT)
  const litres = (a * k) / 1000
  return intQ(K_SOLVE, d, rng, `disinfect-${a}-${k}`, [T('m6.prop.s.disinfect', { a, r: rt(1, k) })], litres, [a * k, k])
}
/** 练习八 6：心跳（45 秒跳 54 次 → 1 分钟 72 次） */
export const HEARTS: [number, number][] = [
  [45, 54],
  [40, 60],
  [30, 40],
  [15, 20],
  [20, 25],
]
function qHeart(d: Difficulty, rng: RNG): Question {
  const [t, n] = d === 1 && rng.chance(0.5) ? HEARTS[0]! : rng.pick(HEARTS)
  const per = (60 * n) / t
  if (rng.chance(0.5)) return intQ(K_SOLVE, d, rng, `heart-${t}-${n}`, [T('m6.prop.s.heart', { t, n })], per, [n + 15, 60 + n - t])
  const claim = rng.chance(0.5) ? per : per + rng.pick([-10, -2, 2, 8])
  return judge(K_SOLVE, d, rng, `heartjudge-${t}-${n}-${claim}`, [T('m6.prop.s.heartJudge', { t, n, m: claim })], claim === per)
}
/** 练习八 9：水和冰的体积之比 9∶10 */
export const ICES = [50, 60, 80, 100, 120, 30]
function qIce(d: Difficulty, rng: RNG): Question {
  const v = d === 1 && rng.chance(0.5) ? 50 : rng.pick(ICES)
  if (rng.chance(0.7)) return intQ(K_SOLVE, d, rng, `ice-${v}`, [T('m6.prop.s.ice', { v })], (v * 9) / 10, [v + 9, (v * 10) / 9 > 0 ? Math.round((v * 10) / 9) : v])
  const w = (v * 9) / 10
  return intQ(K_SOLVE, d, rng, `iceback-${w}`, [T('m6.prop.s.iceBack', { v: w })], v, [Math.round((w * 9) / 10)])
}
/** 练习八 10：按条件列比例 */
function qCondition(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    const [a, b, c, e] = rng.chance(0.4) ? [5, 8, 40, 64] : intProp(rng)
    return intQ(K_SOLVE, d, rng, `cond1-${a}-${b}-${c}`, [T('m6.prop.s.cond1', { a, b, c })], e)
  }
  // 内项 2 和 5，外项 x 和 2.5（课本）；另配几组
  const sets: [number, number, number][] = [
    [2, 5, 2.5],
    [3, 8, 4],
    [4, 6, 3],
    [6, 9, 2],
    [5, 12, 4],
  ]
  const [a, b, c] = d === 1 && rng.chance(0.4) ? sets[0]! : rng.pick(sets)
  const x = div(fr(a * b), num(String(c)))
  return intQ(K_SOLVE, d, rng, `cond3-${a}-${b}-${c}`, [T('m6.prop.s.cond3', { a, b, c })], x[0])
}
/** 练习八 11：汽车模型 1∶20 */
export const CARS = [24.3, 22.5, 21, 23.6]
function qCar(d: Difficulty, rng: RNG): Question {
  if (d >= 2 && rng.chance(0.4)) return valueQ(K_SOLVE, d, rng, 'bus', [T('m6.prop.s.bus')], fr(588, 10), ['5.88', '588', '235.2', '0.588'])
  const l = d === 1 && rng.chance(0.5) ? 24.3 : rng.pick(CARS)
  const v = mul(num(String(l)), fr(20))
  return intQ(K_SOLVE, d, rng, `car-${l}`, [T('m6.prop.s.car', { l })], v[0], [Math.round(v[0] / 10), Math.round(v[0] * 10)])
}
/** 练习八 12：兵马俑模型 1∶10（课本：秦代高级军吏俑，19.6 厘米） */
export const TERRACOTTA = [19.6, 18.7, 17.8]
function qTerracotta(d: Difficulty, rng: RNG): Question {
  const h = d === 1 && rng.chance(0.5) ? 19.6 : rng.pick(TERRACOTTA)
  const v = mul(num(String(h)), fr(10))
  return intQ(K_SOLVE, d, rng, `terracotta-${h}`, [T('m6.prop.s.terracotta', { h })], v[0])
}
/** 练习八 13：楼房模型，实际∶模型 = 50∶1，求模型的高度（厘米） */
export const BUILDINGS = [35, 40, 30, 45, 25]
function qBuilding(d: Difficulty, rng: RNG): Question {
  const h = d === 1 && rng.chance(0.5) ? 35 : rng.pick(BUILDINGS)
  return intQ(K_SOLVE, d, rng, `building-${h}`, [T('m6.prop.s.building', { h })], (h * 100) / 50, [h * 50, h])
}
/** 练习八 15：6 个足球和 8 个篮球花钱一样多 */
export const BALLS: [number, number, number][] = [
  [6, 8, 40],
  [4, 5, 50],
  [3, 4, 60],
  [5, 6, 54],
]
function qBalls(d: Difficulty, rng: RNG): Question {
  const [a, b, p] = d === 1 && rng.chance(0.5) ? BALLS[0]! : rng.pick(BALLS)
  if (d >= 2 && rng.chance(0.4)) {
    const g = gcd(b, a)
    const correct = rt(b / g, a / g)
    return choose(K_SOLVE, d, rng, `ballsratio-${a}-${b}`, [T('m6.prop.s.ballsRatio', { a, b })], correct, ratioWrongs(correct, [rt(a / g, b / g), rt(1, 1), rt(b / g + 1, a / g)]))
  }
  return intQ(K_SOLVE, d, rng, `balls-${a}-${b}-${p}`, [T('m6.prop.s.balls', { a, b, p })], (a * p) / b, [(b * p) / a])
}

function genSolve(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 定义、例 2、例 3（列式、结果）、做一做 1–2、练习八 6、8(4)、9、10、11、12、13、15、整理和复习 2
    if (roll < 0.16) return qSolveInt(d, rng)
    if (roll < 0.24) return qRocket(d, rng)
    if (roll < 0.38) return qSolveBook(d, rng, SOLVE_BOOK)
    if (roll < 0.45) return qCross(d, rng)
    if (roll < 0.51) return qDisinfect(d, rng)
    if (roll < 0.57) return qHeart(d, rng)
    if (roll < 0.63) return qIce(d, rng)
    if (roll < 0.71) return qCondition(d, rng)
    if (roll < 0.78) return qCar(d, rng)
    if (roll < 0.84) return qTerracotta(d, rng)
    if (roll < 0.91) return qBuilding(d, rng)
    return qBalls(d, rng)
  }
  if (d === 2) {
    if (roll < 0.35) return qSolveBook(d, rng, SOLVE_MORE)
    if (roll < 0.5) return qCar(d, rng)
    if (roll < 0.65) return qBalls(d, rng)
    if (roll < 0.8) return qCross(d, rng)
    return qSolveBook(d, rng, SOLVE_BOOK)
  }
  if (roll < 0.6) return qSolveBook(d, rng, SOLVE_MORE)
  if (roll < 0.8) return qBalls(d, rng)
  return qCar(d, rng)
}
defineGenerator(K_SOLVE, genSolve)

// ═════════════════════════════════════════════════════════════
// 4. 正比例（p43–44；练习九 1–7、14；练习十二 2；整理和复习 3）
// ═════════════════════════════════════════════════════════════

const range = (a: number, b: number): number[] => Array.from({ length: b - a + 1 }, (_, i) => a + i)
/** 例 1：彩带 1–8 米，每米 3.5 元 */
export const RIBBON_Q = range(1, 8)
const RIBBON_P = RIBBON_Q.map((q) => q * 3.5)
const ribbonTable = (): StemPart => table([[H('qtyM'), ...RIBBON_Q], [H('total'), ...RIBBON_P]])
const axis = (name: string, step: number, cells: number, every?: number): GraphAxis => (every ? { name: H(name), step, cells, every } : { name: H(name), step, cells })
export function ribbonGraph(opts: { guide?: { x?: number; y?: number }; marks?: [number, number][] } = {}): StemPart {
  const series: GraphSeries[] = [{ pts: RIBBON_Q.map((q) => [q, q * 3.5] as [number, number]), line: 'origin', extend: true }]
  // 每格 2 米、7 元（课本每格 1 米、3.5 元；格子少一半，手机上图矮一些，读的数都落在格线或两条格线正中）
  return { kind: 'prop-graph', x: axis('qtyM', 2, 8), y: axis('total', 7, 7), series, ...(opts.guide ? { guide: opts.guide } : {}), ...(opts.marks ? { marks: opts.marks } : {}) }
}
function qRibbon(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  const head = [T('m6.prop.d.ribbon'), ribbonTable()]
  if (roll < 0.3) return valueQ(K_DIRECT, d, rng, 'ribbon-ratio', [...head, T('m6.prop.d.ratioQ')], fr(7, 2), ['7', '28', '2/7'])
  if (roll < 0.55) return choose(K_DIRECT, d, rng, 'ribbon-meaning', [...head, T('m6.prop.d.meaningQ', { v: 3.5 })], L('m6.prop.d.opt.unitPrice'), [L('m6.prop.d.opt.total'), L('m6.prop.d.opt.qty'), L('m6.prop.d.opt.length')])
  if (roll < 0.8) return choose(K_DIRECT, d, rng, 'ribbon-change', [...head, T('m6.prop.d.changeQ')], L('m6.prop.d.opt.up'), [L('m6.prop.d.opt.down'), L('m6.prop.d.opt.same')])
  return judge(K_DIRECT, d, rng, 'ribbon-judge', [...head, T('m6.prop.d.ribbonJudge')], true)
}
/** 例 1 的图象：不计算，看图读总价 / 米数 */
export const READ_PRICE = [9, 11, 13, 5]
export const READ_QTY = [49, 42, 35, 21]
function qRibbonGraph(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    const x = d === 1 && rng.chance(0.5) ? 9 : rng.pick(READ_PRICE)
    const v = mul(fr(x), fr(7, 2))
    return valueQ(K_DIRECT, d, rng, `readprice-${x}`, [ribbonGraph({ guide: { x } }), T('m6.prop.d.readPriceQ', { x })], v, [show(fr(v[0] + 7, v[1])), show(fr(v[0] - 7, v[1])), String(x * 3)])
  }
  const y = d === 1 && rng.chance(0.5) ? 49 : rng.pick(READ_QTY)
  return intQ(K_DIRECT, d, rng, `readqty-${y}`, [ribbonGraph({ guide: { y } }), T('m6.prop.d.readQtyQ', { y })], (y * 2) / 7, [y / 7, (y * 2) / 7 + 2, (y * 4) / 7])
}
/** 例 1(2)：描出的点在不在这条直线上 */
export const MARKS: [number, number][] = [
  [10, 35],
  [12, 42],
  [10, 30],
  [12, 40],
  [14, 49],
  [6, 24.5],
]
function qOnLine(d: Difficulty, rng: RNG): Question {
  const [x, y] = d === 1 && rng.chance(0.5) ? rng.pick(MARKS.slice(0, 2)) : rng.pick(MARKS)
  return judge(K_DIRECT, d, rng, `online-${x}-${y}`, [ribbonGraph({ marks: [[x, y]] }), T('m6.prop.d.onLineQ', { x, y })], y * 2 === x * 7)
}
function qTimes(d: Difficulty, rng: RNG): Question {
  const n = d === 1 && rng.chance(0.5) ? 2 : rng.int(2, 5)
  return intQ(K_DIRECT, d, rng, `times-${n}`, [T('m6.prop.d.timesQ', { n })], n, [1, n * 2])
}
/** 生活中的正比例（课本两个孩子说的）、练习九 2（五句）、练习十二 2、整理和复习 3 */
export const DIRECT_LIFE: [string, boolean][] = [
  ['square', true],
  ['car', true],
]
export const DIRECT_JUDGE: [string, boolean][] = [
  ['magazine', true],
  ['cube', false],
  ['age', false],
  ['wheat', true],
  ['pages', false],
]
export const DIRECT_MORE: [string, boolean][] = [
  ['circle', false],
  ['trapezoid', true],
  ['y5x', true],
  ['cone', true],
]
function qDirectJudge(d: Difficulty, rng: RNG): Question {
  const pool = d === 1 ? (rng.chance(0.3) ? DIRECT_LIFE : DIRECT_JUDGE) : [...DIRECT_JUDGE, ...DIRECT_MORE]
  const [k, ok] = rng.pick(pool)
  return judge(K_DIRECT, d, rng, `djudge-${k}`, [T('m6.prop.d.judgeQ', { s: L(`m6.prop.d.j.${k}`) })], ok)
}
/** 做一做：汽车每小时行驶 80 千米 */
export const CAR_T = range(1, 6)
const carTable = (): StemPart => table([[H('hours'), ...CAR_T], [H('distKm'), ...CAR_T.map((t) => t * 80)]])
function carGraph(guideY?: number): StemPart {
  return {
    kind: 'prop-graph',
    x: axis('hours', 1, 8),
    y: axis('distKm', 80, 7),
    series: [{ pts: CAR_T.map((t) => [t, t * 80] as [number, number]), line: 'origin', extend: true }],
    ...(guideY !== undefined ? { guide: { y: guideY } } : {}),
  }
}
export const CAR_EST = [120, 200, 360, 440]
function qCar80(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  const head = [T('m6.prop.d.car'), carTable()]
  if (roll < 0.3) return intQ(K_DIRECT, d, rng, 'car-ratio', [...head, T('m6.prop.d.carRatioQ')], 80, [40, 160])
  if (roll < 0.5) return choose(K_DIRECT, d, rng, 'car-meaning', [...head, T('m6.prop.d.carMeaningQ')], L('m6.prop.d.opt.speed'), [L('m6.prop.d.opt.time'), L('m6.prop.d.opt.dist')])
  if (roll < 0.6) return judge(K_DIRECT, d, rng, 'car-judge', [...head, T('m6.prop.d.carJudge')], true)
  const km = d === 1 && rng.chance(0.5) ? 120 : rng.pick(CAR_EST)
  const v = fr(km, 80)
  return valueQ(K_DIRECT, d, rng, `carest-${km}`, [carGraph(km), T('m6.prop.d.carEstQ', { k: km })], v, [show(fr(v[0] + v[1], v[1])), show(fr(Math.max(1, v[0] - v[1]), v[1])), show(fr(km, 40))])
}
function qFormula(d: Difficulty, rng: RNG): Question {
  return choose(K_DIRECT, d, rng, 'formula', [T('m6.prop.d.formulaQ')], 'y ÷ x = k', ['x × y = k', 'y + x = k', 'y − x = k'])
}
/** 练习九 1：电费 0.5 元 / 千瓦时 */
export const POWER = [120, 130, 110, 120, 130, 150]
const powerTable = (): StemPart => table([[H('month'), ...range(1, 6)], [H('power'), ...POWER], [H('fee'), ...POWER.map((p) => p / 2)]])
function qPower(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  const head = [T('m6.prop.d.power'), powerTable()]
  if (roll < 0.4) return valueQ(K_DIRECT, d, rng, 'power-ratio', [...head, T('m6.prop.d.powerRatioQ')], fr(1, 2), ['2', '5', '0.05'])
  if (roll < 0.7) return choose(K_DIRECT, d, rng, 'power-meaning', [...head, T('m6.prop.d.meaningQ', { v: 0.5 })], L('m6.prop.d.opt.price'), [L('m6.prop.d.opt.monthPower'), L('m6.prop.d.opt.monthFee')])
  return judge(K_DIRECT, d, rng, 'power-judge', [...head, T('m6.prop.d.powerJudge')], true)
}
/** 练习九 3：耗油量（15 千米 2 升） */
export const FUEL_KM = [15, 30, 45, 75]
export const FUEL_ASK = [60, 90, 105, 150]
const fuelTable = (): StemPart => table([[H('distKm'), ...FUEL_KM], [H('fuel'), ...FUEL_KM.map((k) => (k * 2) / 15)]])
function qFuel(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (roll < 0.25) return judge(K_DIRECT, d, rng, 'fuel-judge', [T('m6.prop.d.fuel'), fuelTable(), T('m6.prop.d.fuelJudge')], true)
  if (d >= 2 && roll < 0.5) {
    const graph: StemPart = { kind: 'prop-graph', x: axis('distKm', 10, 8), y: axis('fuel', 2, 6), series: [{ pts: FUEL_KM.map((k) => [k, (k * 2) / 15] as [number, number]), line: 'origin', extend: true }], guide: { x: 55 } }
    return choose(K_DIRECT, d, rng, 'fuel-est', [graph, T('m6.prop.d.fuelEstQ')], '7.3', ['5.5', '8.3', '6.3'])
  }
  const k = rng.pick(FUEL_ASK)
  return intQ(K_DIRECT, d, rng, `fuel-${k}`, [T('m6.prop.d.fuel'), fuelTable(), T('m6.prop.d.fuelQ', { k })], (k * 2) / 15, [k / 15, (k * 2) / 15 + 2])
}
/** 练习九 4：y 与 x 成正比例（比值 2.5），表里一格问号、课本空着的格子不写 */
export const FILL_X = [1, 2, 3, 5, 8, 10, 15, 20]
/** 课本给出的格子：x 行给了 1、2、5、10、20，y 行给了 2.5、7.5、20、37.5 */
const GIVEN_X = new Set([1, 2, 5, 10, 20])
const GIVEN_Y = new Set([1, 3, 8, 15])
export const FILL_ASK: { row: 'x' | 'y'; x: number }[] = [
  { row: 'y', x: 2 },
  { row: 'x', x: 3 },
  { row: 'x', x: 8 },
  { row: 'y', x: 10 },
  { row: 'x', x: 15 },
  { row: 'y', x: 20 },
  { row: 'y', x: 5 },
]
function qFill(d: Difficulty, rng: RNG): Question {
  const ask = d === 1 ? rng.pick(FILL_ASK.slice(0, 6)) : rng.pick(FILL_ASK)
  const xs: (number | LStr | null)[] = FILL_X.map((x) => (ask.row === 'x' && x === ask.x ? null : GIVEN_X.has(x) ? x : ''))
  const ys: (number | LStr | null)[] = FILL_X.map((x) => (ask.row === 'y' && x === ask.x ? null : GIVEN_Y.has(x) ? x * 2.5 : ''))
  const value = ask.row === 'x' ? fr(ask.x) : mul(fr(ask.x), fr(5, 2))
  return valueQ(K_DIRECT, d, rng, `fill-${ask.row}-${ask.x}`, [T('m6.prop.d.fillQ'), table([['x', ...xs], ['y', ...ys]])], value, [show(fr(value[0] + value[1], value[1])), show(mul(value, fr(2))), show(div(value, fr(2)))])
}
/** 练习九 5：树高 2 米影子 1.6 米 */
export const TREES = [3, 6, 4, 5, 7]
function qShadow(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.3)) return judge(K_DIRECT, d, rng, 'shadow-judge', [T('m6.prop.d.shadowJudge')], true)
  const h = d === 1 && rng.chance(0.5) ? 6 : rng.pick(TREES)
  return valueQ(K_DIRECT, d, rng, `shadow-${h}`, [T('m6.prop.d.shadowQ', { h })], mul(fr(h), fr(4, 5)), [String(h - 0.4), show(mul(fr(h), fr(5, 4))), show(fr(h * 4 + 5, 5))])
}
/** 练习九 6：2n */
function qEven(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.4)) return choose(K_DIRECT, d, rng, 'even-kind', [T('m6.prop.d.evenKindQ')], L('m6.prop.d.opt.even'), [L('m6.prop.d.opt.odd'), L('m6.prop.d.opt.prime'), L('m6.prop.d.opt.composite')])
  const n = rng.int(3, 9)
  return intQ(K_DIRECT, d, rng, `even-${n}`, [T('m6.prop.d.evenQ', { n })], 2 * n, [n + 2, n * n])
}
/** 练习九 7：铅笔每支 0.5 元 */
function qPencil(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.4)) {
    const n = rng.int(2, 5)
    return intQ(K_DIRECT, d, rng, `pencil-times-${n}`, [T('m6.prop.d.pencilTimesQ', { n })], n, [n * 2])
  }
  const n = d === 1 && rng.chance(0.5) ? 7 : rng.int(3, 9)
  return valueQ(K_DIRECT, d, rng, `pencil-${n}`, [T('m6.prop.d.pencilQ', { n })], fr(n, 2), [String(n * 5), show(fr(n + 1, 2)), show(fr(n, 5))])
}
/** 练习九 14：斑马每分钟 1.2 千米、梅花鹿每分钟 0.8 千米（课本是长颈鹿） */
export function runGraph(): StemPart {
  return {
    kind: 'prop-graph',
    x: axis('minutes', 5, 6),
    y: axis('distKm', 4, 6),
    series: [
      { name: L('m6.prop.d.zebra'), tone: 'blue', pts: [[10, 12], [20, 24]], line: 'origin' },
      { name: L('m6.prop.d.deer'), tone: 'orange', pts: [[15, 12], [30, 24]], line: 'origin' },
    ],
  }
}
export const RUN_T = [5, 10, 15, 18]
function qRun(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  const head = [runGraph()]
  const zebra = rng.chance(0.5)
  const who = L(zebra ? 'm6.prop.d.zebra' : 'm6.prop.d.deer')
  if (roll < 0.3) return judge(K_DIRECT, d, rng, `run-judge-${zebra ? 'zebra' : 'deer'}`, [...head, T('m6.prop.d.runJudge', { a: who })], true)
  if (roll < 0.5) return choose(K_DIRECT, d, rng, 'run-faster', [...head, T('m6.prop.d.fasterQ')], L('m6.prop.d.zebra'), [L('m6.prop.d.deer')])
  const t = d === 1 && rng.chance(0.5) ? 18 : rng.pick(RUN_T)
  const v = mul(fr(t), zebra ? fr(6, 5) : fr(4, 5))
  return valueQ(K_DIRECT, d, rng, `run-${zebra ? 'zebra' : 'deer'}-${t}`, [...head, T('m6.prop.d.runQ', { a: who, t })], v, [show(mul(fr(t), zebra ? fr(4, 5) : fr(6, 5))), show(fr(v[0] + 2 * v[1], v[1])), String(t)])
}
/** 第 2 档：正比例的图象是一条直线 */
function qLine(d: Difficulty, rng: RNG): Question {
  return judge(K_DIRECT, d, rng, 'line-judge', [T('m6.prop.d.lineJudge')], true)
}

function genDirect(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 例 1（表、比值、变化、图象读数、描点、几倍）、生活中的例子、关系式、做一做、练习九 1–7、14
    if (roll < 0.12) return qRibbon(d, rng)
    if (roll < 0.22) return qRibbonGraph(d, rng)
    if (roll < 0.28) return qOnLine(d, rng)
    if (roll < 0.32) return qTimes(d, rng)
    if (roll < 0.42) return qDirectJudge(d, rng)
    if (roll < 0.52) return qCar80(d, rng)
    if (roll < 0.55) return qFormula(d, rng)
    if (roll < 0.62) return qPower(d, rng)
    if (roll < 0.69) return qFuel(d, rng)
    if (roll < 0.76) return qFill(d, rng)
    if (roll < 0.82) return qShadow(d, rng)
    if (roll < 0.86) return qEven(d, rng)
    if (roll < 0.92) return qPencil(d, rng)
    return qRun(d, rng)
  }
  if (d === 2) {
    if (roll < 0.2) return qDirectJudge(d, rng)
    if (roll < 0.35) return qFuel(d, rng)
    if (roll < 0.5) return qFill(d, rng)
    if (roll < 0.65) return qRun(d, rng)
    if (roll < 0.8) return qRibbonGraph(d, rng)
    if (roll < 0.9) return qLine(d, rng)
    return qShadow(d, rng)
  }
  if (roll < 0.4) return qDirectJudge(d, rng)
  if (roll < 0.7) return qRun(d, rng)
  return qFuel(d, rng)
}
defineGenerator(K_DIRECT, genDirect)

// ═════════════════════════════════════════════════════════════
// 5. 反比例（p45–46；练习九 8–13、15*、16*；练习十二 2；整理和复习 3）
// ═════════════════════════════════════════════════════════════

/** 例 2：同样多的水（300 立方厘米）装进底面积不同的量筒 */
export const CYL_S = [10, 15, 20, 30, 60]
const cylTable = (): StemPart => table([[H('baseArea'), ...CYL_S], [H('waterH'), ...CYL_S.map((s) => 300 / s)]])
export const CYL_ASK = [50, 25, 12, 75, 100]
function qCyl(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  const head = [T('m6.prop.i.cyl'), cylTable()]
  if (roll < 0.25) return intQ(K_INVERSE, d, rng, 'cyl-product', [...head, T('m6.prop.i.productQ')], 300, [40, 70, 3000])
  if (roll < 0.4) return choose(K_INVERSE, d, rng, 'cyl-meaning', [...head, T('m6.prop.i.productMeaningQ', { v: 300 })], L('m6.prop.i.opt.volume'), [L('m6.prop.i.opt.base'), L('m6.prop.i.opt.height'), L('m6.prop.i.opt.count')])
  if (roll < 0.55) return choose(K_INVERSE, d, rng, 'cyl-change', [...head, T('m6.prop.i.changeQ')], L('m6.prop.i.opt.smaller'), [L('m6.prop.i.opt.bigger'), L('m6.prop.i.opt.same')])
  if (roll < 0.7) return judge(K_INVERSE, d, rng, 'cyl-judge', [...head, T('m6.prop.i.cylJudge')], true)
  const s = d === 1 && rng.chance(0.5) ? 50 : rng.pick(CYL_ASK)
  // 错法：当成正比例（底面积 10 时高 30，就按 3 倍算）、拿 300 减底面积
  return intQ(K_INVERSE, d, rng, `cyl-${s}`, [...head, T('m6.prop.i.cylQ', { s })], 300 / s, [3 * s, 300 - s])
}
function qInvFormula(d: Difficulty, rng: RNG): Question {
  return choose(K_INVERSE, d, rng, 'formula', [T('m6.prop.i.formulaQ')], 'x × y = k', ['y ÷ x = k', 'y + x = k', 'y − x = k'])
}
export const INVERSE_LIFE: [string, boolean][] = [
  ['price', true],
  ['rect', true],
]
/** 练习九 11 的五句 */
export const INVERSE_JUDGE: [string, boolean][] = [
  ['coal', true],
  ['groups', true],
  ['cylinder', true],
  ['garden', false],
  ['packs', true],
]
function qInvJudge(d: Difficulty, rng: RNG): Question {
  const pool = d === 1 && rng.chance(0.35) ? INVERSE_LIFE : INVERSE_JUDGE
  const [k, ok] = rng.pick(pool)
  return judge(K_INVERSE, d, rng, `ijudge-${k}`, [T('m6.prop.i.judgeQ', { s: L(`m6.prop.i.j.${k}`) })], ok)
}
/** 做一做：一批货物 300 吨 */
export const FREIGHT = [300, 150, 100, 75, 60, 50]
const freightTable = (): StemPart => table([[H('perDay'), ...FREIGHT], [H('days'), ...range(1, 6)]])
function qFreight(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  const head = [T('m6.prop.i.freight'), freightTable()]
  if (roll < 0.4) return intQ(K_INVERSE, d, rng, 'freight-product', [...head, T('m6.prop.i.productQ')], 300, [30, 150, 3000])
  if (roll < 0.7) return choose(K_INVERSE, d, rng, 'freight-meaning', [...head, T('m6.prop.i.productMeaningQ', { v: 300 })], L('m6.prop.i.opt.allGoods'), [L('m6.prop.i.opt.perDay'), L('m6.prop.i.opt.days')])
  return judge(K_INVERSE, d, rng, 'freight-judge', [...head, T('m6.prop.i.freightJudge')], true)
}
/** 练习九 8：铺满教室地面（9 米 × 6 米 = 540000 平方厘米） */
export const TILE_ASK = [2700, 1200, 4500, 2400, 600]
const tileTable = (): StemPart => table([[H('tileArea'), 900, 1800, 3600], [H('tiles'), 600, 300, 150]])
function qTiles(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.35)) return judge(K_INVERSE, d, rng, 'tiles-judge', [T('m6.prop.i.tiles'), tileTable(), T('m6.prop.i.tilesJudge')], true)
  const s = rng.pick(TILE_ASK)
  return intQ(K_INVERSE, d, rng, `tiles-${s}`, [T('m6.prop.i.tiles'), tileTable(), T('m6.prop.i.tilesQ', { s })], 540000 / s, [Math.round(54000 / s), Math.round(s / 6)])
}
/** 练习九 9：一批醋 300000 毫升 */
export const VINEGAR_ASK = [1000, 300, 600, 1200, 2000]
const vinegarTable = (): StemPart => table([[H('bottleMl'), 250, 500, 750, 1500], [H('bottles'), 1200, 600, 400, 200]])
function qVinegar(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.35)) return judge(K_INVERSE, d, rng, 'vinegar-judge', [T('m6.prop.i.vinegar'), vinegarTable(), T('m6.prop.i.vinegarJudge')], true)
  const v = rng.pick(VINEGAR_ASK)
  return intQ(K_INVERSE, d, rng, `vinegar-${v}`, [T('m6.prop.i.vinegar'), vinegarTable(), T('m6.prop.i.vinegarQ', { v })], 300000 / v, [Math.round(3000 / v) || 1, v / 5])
}
/** 练习九 10：x × y = 10 的表 */
export const INV_X = ['2', '1/5', '100', '40', '12']
export const INV_Y = ['5', '50', '0.1', '1/4', '5/6']
/** 课本给出的格子：x 行 2、1/5、40，y 行 5、0.1、5/6 */
const INV_GIVEN_X = new Set([0, 1, 3])
const INV_GIVEN_Y = new Set([0, 2, 4])
export const INV_ASK: { row: 'x' | 'y'; i: number }[] = [
  { row: 'y', i: 1 },
  { row: 'x', i: 2 },
  { row: 'x', i: 4 },
  { row: 'y', i: 3 },
]
function qInvFill(d: Difficulty, rng: RNG): Question {
  const ask = d === 1 ? rng.pick(INV_ASK.slice(0, 3)) : rng.pick(INV_ASK)
  const xs: (number | LStr | null)[] = INV_X.map((x, i) => (ask.row === 'x' && i === ask.i ? null : INV_GIVEN_X.has(i) ? x : ''))
  const ys: (number | LStr | null)[] = INV_Y.map((y, i) => (ask.row === 'y' && i === ask.i ? null : INV_GIVEN_Y.has(i) ? y : ''))
  const value = num(ask.row === 'x' ? INV_X[ask.i]! : INV_Y[ask.i]!)
  // 错法：拿 10 乘这一列给出的数、拿它除以 10
  const given = num(ask.row === 'x' ? INV_Y[ask.i]! : INV_X[ask.i]!)
  return valueQ(K_INVERSE, d, rng, `ifill-${ask.row}-${ask.i}`, [T('m6.prop.i.fillQ'), table([['x', ...xs], ['y', ...ys]])], value, [show(mul(fr(10), given), 'frac'), show(div(given, fr(10)), 'frac'), '10'], 'frac')
}
/** 练习九 12：手机 12000 部 */
export const PHONE_P = [500, 600, 800, 1000, 1200]
export const PHONE_ASK = [8, 6, 16, 4, 30]
const phoneTable = (): StemPart => table([[H('perDayPhones'), ...PHONE_P], [H('days'), ...PHONE_P.map((p) => 12000 / p)]])
function qPhones(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  const head = [T('m6.prop.i.phones'), phoneTable()]
  if (roll < 0.3) return intQ(K_INVERSE, d, rng, 'phones-product', [...head, T('m6.prop.i.productQ')], 12000, [1200, 120000])
  if (d === 3 && roll < 0.6) return choose(K_INVERSE, d, rng, 'phones-formula', [...head, T('m6.prop.i.phonesFormulaQ')], 'p × t = 12000', ['p ÷ t = 12000', 'p + t = 12000', 't ÷ p = 12000'])
  const t = d === 1 && rng.chance(0.5) ? 8 : rng.pick(PHONE_ASK)
  return intQ(K_INVERSE, d, rng, `phones-${t}`, [...head, T('m6.prop.i.phonesQ', { t })], 12000 / t, [12000 / t / 10, t * 100])
}
/** 练习九 13：火车（全程 1300 千米），时间里有分数 */
export const TRAIN_V = [270, 260, 250, 200, 180, 150]
const TRAIN_T: (number | string)[] = ['130/27', 5, 5.2, 6.5, '65/9', '26/3']
export const TRAIN_ASK = [325, 260, 130, 650]
function qTrain(d: Difficulty, rng: RNG): Question {
  const head = [T('m6.prop.i.train'), table([[H('speed'), ...TRAIN_V], [H('hours'), ...TRAIN_T]])]
  const roll = rng.next()
  if (roll < 0.3) return intQ(K_INVERSE, d, rng, 'train-total', [...head, T('m6.prop.i.trainTotalQ')], 1300, [270, 1350])
  if (d === 3 && roll < 0.6) return choose(K_INVERSE, d, rng, 'train-formula', [...head, T('m6.prop.i.trainFormulaQ')], 'v × t = 1300', ['v ÷ t = 1300', 'v + t = 1300', 't ÷ v = 1300'])
  const v = d === 1 && rng.chance(0.5) ? 325 : rng.pick(TRAIN_ASK)
  return intQ(K_INVERSE, d, rng, `train-${v}`, [...head, T('m6.prop.i.trainQ', { v })], 1300 / v, [v / 65, 1300 / v + 1])
}
/** 正 / 反 / 不成比例（练习十二 2(2)、整理和复习 3，第 2 档再混进别的句子） */
export const MIXED_1: [string, Rel][] = [
  ['factor', 'inverse'],
  ['speed240', 'inverse'],
]
export const MIXED_2: [string, Rel][] = [
  ['cone', 'direct'],
  ['circle', 'none'],
  ['rect36', 'inverse'],
  ['scaleMap', 'direct'],
  ['sumPages', 'none'],
  ['magazine', 'direct'],
]
function qMixed(d: Difficulty, rng: RNG): Question {
  const [k, rel] = rng.pick(d === 1 ? MIXED_1 : [...MIXED_1, ...MIXED_2])
  return relQ(K_INVERSE, d, rng, `mixed-${k}`, [T('m6.prop.i.mixedQ', { s: L(`m6.prop.i.m.${k}`) })], rel)
}
/** 第 2 档：你知道吗（反比例的图象是光滑的曲线） */
export function cylGraph(guideX?: number): StemPart {
  return {
    kind: 'prop-graph',
    x: axis('baseArea', 5, 13, 2),
    y: axis('waterH', 5, 7),
    series: [{ pts: CYL_S.map((s) => [s, 300 / s] as [number, number]), line: 'curve', extend: true }],
    ...(guideX !== undefined ? { guide: { x: guideX } } : {}),
  }
}
export const CURVE_ASK = [40, 50, 12, 60]
function qCurve(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.35)) return judge(K_INVERSE, d, rng, 'curve-judge', [cylGraph(), T('m6.prop.i.curveJudge')], false)
  const s = rng.pick(CURVE_ASK)
  return valueQ(K_INVERSE, d, rng, `curve-${s}`, [cylGraph(s), T('m6.prop.i.curveQ', { s })], fr(300, s), ['8.5', '6.5', '10', '7'])
}
/** 第 2 档：练习九 16*（面积 36 平方厘米的长方形） */
function qRect36(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) return relQ(K_INVERSE, d, rng, 'rect36', [T('m6.prop.i.rect36Q')], 'inverse')
  return judge(K_INVERSE, d, rng, 'rect36-line', [T('m6.prop.i.rect36LineQ')], false)
}
/** 第 3 档：练习九 15*（x × y = z） */
export const XYZ: [string, string, string, Rel][] = [
  ['z', 'x', 'y', 'inverse'],
  ['x', 'z', 'y', 'direct'],
  ['y', 'z', 'x', 'direct'],
]
function qXyz(d: Difficulty, rng: RNG): Question {
  const [f, a, b, rel] = rng.pick(XYZ)
  return relQ(K_INVERSE, d, rng, `xyz-${f}`, [T('m6.prop.i.xyzQ', { f, a, b })], rel)
}

function genInverse(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 例 2（表、乘积、意义、变化、判断、推算）、关系式、生活中的例子、做一做、练习九 8–13、练习十二 2(2)、整理和复习 3(1)
    if (roll < 0.2) return qCyl(d, rng)
    if (roll < 0.24) return qInvFormula(d, rng)
    if (roll < 0.36) return qInvJudge(d, rng)
    if (roll < 0.46) return qFreight(d, rng)
    if (roll < 0.54) return qTiles(d, rng)
    if (roll < 0.62) return qVinegar(d, rng)
    if (roll < 0.7) return qInvFill(d, rng)
    if (roll < 0.79) return qPhones(d, rng)
    if (roll < 0.88) return qTrain(d, rng)
    return qMixed(d, rng)
  }
  if (d === 2) {
    if (roll < 0.25) return qCurve(d, rng)
    if (roll < 0.45) return qMixed(d, rng)
    if (roll < 0.6) return qRect36(d, rng)
    if (roll < 0.75) return qInvFill(d, rng)
    if (roll < 0.9) return qInvJudge(d, rng)
    return qTrain(d, rng)
  }
  if (roll < 0.3) return qXyz(d, rng)
  if (roll < 0.5) return qPhones(d, rng)
  if (roll < 0.7) return qTrain(d, rng)
  return qMixed(d, rng)
}
defineGenerator(K_INVERSE, genInverse)

// ═════════════════════════════════════════════════════════════
// 6. 比例尺（p51–52 例 1、做一做；练习十 1–4；练习十二 1(1)）
// ═════════════════════════════════════════════════════════════

/** 1 千米 = 100000 厘米 */
const KM = 100000
export const scaleOf = (n: number): string => rt(1, n)
function qScaleDef(d: Difficulty, rng: RNG): Question {
  return choose(K_SCALE, d, rng, 'def', [T('m6.prop.sc.defQ')], L('m6.prop.opt.scale'), [L('m6.prop.opt.ratioValue'), L('m6.prop.opt.proportion'), L('m6.prop.opt.realDist')])
}
/** 例 1（120 千米、2.4 厘米）、练习十二 1(1)（15 千米、5 厘米）；另配几组：比例尺 1∶n 的 n、图上厘米数 */
export const FIND_BOOK: [number, number][] = [
  [120, 2.4],
  [15, 5],
]
export const FIND_MORE: [number, number][] = [
  [80, 4],
  [150, 3],
  [60, 3],
  [200, 4],
  [90, 4.5],
  [40, 2],
]
function qFindScale(d: Difficulty, rng: RNG): Question {
  const [r, m] = d === 1 && rng.chance(0.5) ? rng.pick(FIND_BOOK) : rng.pick([...FIND_BOOK, ...FIND_MORE])
  const n = div(fr(r * KM), num(String(m)))
  const correct = scaleOf(n[0])
  const raw = div(fr(r), num(String(m)))
  return choose(K_SCALE, d, rng, `find-${r}-${m}`, [T('m6.prop.sc.findQ', { r, m })], correct, ratioWrongs(correct, [rt(1, show(raw)), rt(1, n[0] / 10), rt(n[0], 1), rt(1, n[0] * 10)]))
}
export const KM_ASK = [120, 45, 30, 15, 6, 1.8]
function qKmCm(d: Difficulty, rng: RNG): Question {
  const k = d === 1 && rng.chance(0.4) ? 120 : rng.pick(KM_ASK)
  const v = mul(num(String(k)), fr(KM))
  return intQ(K_SCALE, d, rng, `kmcm-${k}`, [T('m6.prop.sc.kmCmQ', { k })], v[0], [v[0] / 10, v[0] * 10])
}
/** 线段比例尺：图上 1 厘米表示实际多少（千米 / 米） */
export const BARS: [number, 'km' | 'm'][] = [
  [50, 'km'],
  [100, 'km'],
  [20, 'km'],
  [10, 'km'],
  [600, 'm'],
  [300, 'm'],
  [200, 'm'],
]
const barN = ([per, u]: [number, 'km' | 'm']): number => per * (u === 'km' ? KM : 100)
export const bar = (per: number | undefined, u: 'km' | 'm'): StemPart => (per === undefined ? { kind: 'scale-bar', unit: L(`m6.prop.u.${u}`) } : { kind: 'scale-bar', per, unit: L(`m6.prop.u.${u}`) })
function qBarToNum(d: Difficulty, rng: RNG): Question {
  const b = d === 1 && rng.chance(0.5) ? BARS[0]! : rng.pick(BARS)
  const n = barN(b)
  const correct = scaleOf(n)
  return choose(K_SCALE, d, rng, `bar-${b[0]}${b[1]}`, [T('m6.prop.sc.barIntro'), bar(...b), T('m6.prop.sc.barToNumQ', { per: b[0], u: L(`m6.prop.u.${b[1]}`) })], correct, ratioWrongs(correct, [rt(1, b[0]), rt(1, n / 10), rt(1, n * 10), rt(n, 1)]))
}
/** 数值比例尺 → 图上 1 厘米表示实际多少（练习十 1：1∶30000000 → 300 千米） */
export const NUM_TO_LINE: [number, 'km' | 'm'][] = [
  [30000000, 'km'],
  [5000000, 'km'],
  [4000000, 'km'],
  [60000, 'm'],
  [30000, 'm'],
  [10000, 'm'],
]
function qNumToLine(d: Difficulty, rng: RNG): Question {
  const [n, u] = d === 1 && rng.chance(0.4) ? NUM_TO_LINE[0]! : rng.pick(NUM_TO_LINE)
  const v = n / (u === 'km' ? KM : 100)
  return intQ(K_SCALE, d, rng, `numline-${n}`, [T('m6.prop.sc.numToLineQ', { s: scaleOf(n), u: L(`m6.prop.u.${u}`) })], v, [v * 10, v / 10, n / 100])
}
/** 想一想：实际距离是图上距离的多少倍；图上距离是实际距离的几分之几（分母只到 4 位） */
export const TIMES_N = [5000000, 30000, 2000, 100000]
export const FRAC_N = [500, 200, 1000, 2000]
function qTimesFrac(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    const n = d === 1 && rng.chance(0.5) ? 5000000 : rng.pick(TIMES_N)
    return intQ(K_SCALE, d, rng, `times-${n}`, [T('m6.prop.sc.timesQ', { s: scaleOf(n) })], n, [n / 10, n * 10])
  }
  const n = rng.pick(FRAC_N)
  return choose(K_SCALE, d, rng, `frac-${n}`, [T('m6.prop.sc.fracQ', { s: scaleOf(n) })], `1/${n}`, numWrongs(`1/${n}`, [String(n), `1/${n / 10}`, `1/${n / 100}`]))
}
function qKind(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    const n = rng.pick([100000000, 5000000, 30000])
    return choose(K_SCALE, d, rng, `kind-num-${n}`, [T('m6.prop.sc.kindNumQ', { s: scaleOf(n) })], L('m6.prop.opt.numScale'), [L('m6.prop.opt.lineScale')])
  }
  const b = rng.pick(BARS.slice(0, 3))
  return choose(K_SCALE, d, rng, `kind-line-${b[0]}`, [T('m6.prop.sc.kindLineQ'), bar(...b)], L('m6.prop.opt.lineScale'), [L('m6.prop.opt.numScale')])
}
/** 零件图 2∶1：放大的比例尺；1∶n 是缩小 */
export const PART_TIMES = [2, 5, 10, 4]
function qPartTimes(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    const k = d === 1 && rng.chance(0.5) ? 2 : rng.pick(PART_TIMES)
    return intQ(K_SCALE, d, rng, `parttimes-${k}`, [T('m6.prop.sc.partTimesQ', { s: rt(k, 1) })], k, [k + 1, k * 10])
  }
  const s = rng.pick([rt(2, 1), rt(5, 1), rt(1, 500), rt(1, 2000000), rt(10, 1), rt(1, 100)])
  const bigger = s.endsWith(`${RATIO}1`)
  return choose(K_SCALE, d, rng, `zoom-${s}`, [T('m6.prop.sc.zoomQ', { s })], L(bigger ? 'm6.prop.opt.bigger' : 'm6.prop.opt.smaller'), [L(bigger ? 'm6.prop.opt.smaller' : 'm6.prop.opt.bigger')])
}
/** 做一做：零件高 5 毫米，图纸上 2 厘米 → 4∶1 */
export const PARTS: [number, number][] = [
  [5, 2],
  [3, 1.5],
  [2, 2],
  [4, 2],
  [5, 1],
  [6, 3],
]
function qPart(d: Difficulty, rng: RNG): Question {
  const [a, b] = d === 1 && rng.chance(0.5) ? PARTS[0]! : rng.pick(PARTS)
  const k = div(mul(num(String(b)), fr(10)), fr(a))
  const correct = rt(show(k), 1)
  // 错法：前后颠倒、没换单位（2∶5）、没换单位又颠倒
  const raw = div(num(String(b)), fr(a))
  return choose(K_SCALE, d, rng, `part-${a}-${b}`, [T('m6.prop.sc.partQ', { a, b })], correct, ratioWrongs(correct, [rt(1, show(k)), rt(b, a), rt(a, b), rt(show(mul(k, fr(10))), 1), rt(show(raw), 1)]))
}
/** 练习十 2：客厅 6 米，图纸上 4 厘米 → 1∶150 */
export const ROOMS: [number, number][] = [
  [6, 4],
  [5, 2],
  [4, 2],
  [3, 2],
  [9, 3],
]
function qRoom(d: Difficulty, rng: RNG): Question {
  const [r, m] = d === 1 && rng.chance(0.5) ? ROOMS[0]! : rng.pick(ROOMS)
  const n = (r * 100) / m
  const correct = scaleOf(n)
  return choose(K_SCALE, d, rng, `room-${r}-${m}`, [T('m6.prop.sc.roomQ', { r, m })], correct, ratioWrongs(correct, [rt(1, show(fr(r, m))), rt(n, 1), rt(1, n / 10), rt(m, r)]))
}
/** 练习十 3：团结路 1800 米，图上量得 6 厘米；练习十 4：七星瓢虫 5 毫米，图上量得 3 厘米（课本要自己量，这里按课本的图量好写进题干） */
function qRoadBug(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (roll < 0.35) return choose(K_SCALE, d, rng, 'road', [T('m6.prop.sc.roadQ')], scaleOf(30000), ratioWrongs(scaleOf(30000), [rt(1, 300), rt(1, 3000), rt(30000, 1), rt(1, 300000)]))
  if (roll < 0.6) return intQ(K_SCALE, d, rng, 'road-line', [T('m6.prop.sc.roadLineQ')], 300, [3000, 30000, 1800])
  return choose(K_SCALE, d, rng, 'bug', [T('m6.prop.sc.bugQ')], rt(6, 1), ratioWrongs(rt(6, 1), [rt(1, 6), rt(3, 5), rt(5, 3), rt(60, 1)]))
}
function qScaleJudge(d: Difficulty, rng: RNG): Question {
  const items: [string, boolean][] = d === 1 ? [['unit', true]] : [['unit', true], ['times500', true], ['wrong500', false]]
  const [k, ok] = rng.pick(items)
  return judge(K_SCALE, d, rng, `sjudge-${k}`, [T(`m6.prop.sc.j.${k}`)], ok)
}
/** 写成 1∶几 或 几∶1（比例尺一般这样写） */
export const TO_ONE: [string, string][] = [
  ['2', '12000000'],
  ['2.4', '12000000'],
  ['4', '600'],
  ['20', '5'],
  ['6', '180000'],
  ['30', '5'],
]
function qToOne(d: Difficulty, rng: RNG): Question {
  const [a, b] = rng.pick(TO_ONE)
  const v = div(num(a), num(b))
  const correct = v[0] === 1 ? rt(1, v[1]) : rt(show(v), 1)
  const inv = v[0] === 1 ? rt(v[1], 1) : rt(1, show(v))
  const cands = v[0] === 1 ? [inv, rt(1, v[1] / 10), rt(1, v[1] * 10)] : [inv, rt(show(mul(v, fr(10))), 1), rt(show(div(v, fr(2))), 1)]
  return choose(K_SCALE, d, rng, `toone-${a}-${b}`, [T('m6.prop.sc.toOneQ', { s: rt(a, b) })], correct, ratioWrongs(correct, cands))
}

function genScale(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 意义、例 1、单位换算、线段 / 数值比例尺互化、想一想、两种比例尺、零件图、做一做、练习十 1–4、练习十二 1(1)、写成 1∶几
    if (roll < 0.06) return qScaleDef(d, rng)
    if (roll < 0.2) return qFindScale(d, rng)
    if (roll < 0.26) return qKmCm(d, rng)
    if (roll < 0.36) return qBarToNum(d, rng)
    if (roll < 0.44) return qNumToLine(d, rng)
    if (roll < 0.52) return qTimesFrac(d, rng)
    if (roll < 0.57) return qKind(d, rng)
    if (roll < 0.65) return qPartTimes(d, rng)
    if (roll < 0.73) return qPart(d, rng)
    if (roll < 0.81) return qRoom(d, rng)
    if (roll < 0.9) return qRoadBug(d, rng)
    if (roll < 0.95) return qScaleJudge(d, rng)
    return qToOne(d, rng)
  }
  if (d === 2) {
    if (roll < 0.25) return qPart(d, rng)
    if (roll < 0.4) return qBarToNum(d, rng)
    if (roll < 0.55) return qScaleJudge(d, rng)
    if (roll < 0.7) return qToOne(d, rng)
    if (roll < 0.85) return qFindScale(d, rng)
    return qTimesFrac(d, rng)
  }
  if (roll < 0.4) return qToOne(d, rng)
  if (roll < 0.7) return qPart(d, rng)
  return qFindScale(d, rng)
}
defineGenerator(K_SCALE, genScale)

// ═════════════════════════════════════════════════════════════
// 7. 用比例尺求距离（p52 例 2、做一做；p53 例 3、做一做；练习十 5、7–10；练习十二 2(1)、3）
// ═════════════════════════════════════════════════════════════

/** 求实际距离（千米）：练习十 5（1∶5000000、3.4 厘米 → 170 千米）；另配几组 */
export const REAL: [number, number][] = [
  [5000000, 3.4],
  [5000000, 4],
  [2000000, 5.5],
  [4000000, 2.5],
  [1000000, 3.6],
  [10000000, 6.2],
  [3000000, 4.2],
]
function qReal(d: Difficulty, rng: RNG): Question {
  const [n, m] = d === 1 && rng.chance(0.4) ? REAL[0]! : rng.pick(REAL)
  const cm = mul(num(String(m)), fr(n))
  const km = div(cm, fr(KM))
  return valueQ(K_SCALE_USE, d, rng, `real-${n}-${m}`, [T('m6.prop.su.realQ', { s: scaleOf(n), m })], km, [show(div(km, fr(10))), show(mul(km, fr(10))), show(div(cm, fr(1000)))])
}
/** 例 2：地铁 2 号线（1∶30000、77 厘米 → 23.1 千米） */
function qSubway(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  const head = T('m6.prop.su.subway')
  if (roll < 0.45) return choose(K_SCALE_USE, d, rng, 'subway', [head, T('m6.prop.su.subwayQ')], '23.1', ['2310000', '231', '2.31'])
  if (roll < 0.75) return choose(K_SCALE_USE, d, rng, 'subway-setup', [head, T('m6.prop.su.subwaySetupQ')], pr(77, 'x', 1, 30000), [pr('x', 77, 1, 30000), pr(77, 1, 30000, 'x'), pr(1, 77, 'x', 30000)])
  return choose(K_SCALE_USE, d, rng, 'subway-km', [T('m6.prop.su.cmKmQ', { n: 2310000 })], '23.1', ['231', '2.31', '2310'])
}
/** 做一做（p52）：线段比例尺 0—600 米，河西村到汽车站在图上量得约 3 厘米（课本要自己量，这里按课本的图量好写进题干） */
export const VILLAGE_CM = [3, 2.5, 4, 3.5]
function qVillage(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.45)) {
    const correct = scaleOf(60000)
    return choose(K_SCALE_USE, d, rng, 'village-num', [T('m6.prop.su.village'), bar(600, 'm'), T('m6.prop.su.villageNumQ')], correct, ratioWrongs(correct, [rt(1, 600), rt(1, 6000), rt(1, 600000), rt(60000, 1)]))
  }
  const m = d === 1 && rng.chance(0.5) ? 3 : rng.pick(VILLAGE_CM)
  return intQ(K_SCALE_USE, d, rng, `village-${m}`, [T('m6.prop.su.village'), bar(600, 'm'), T('m6.prop.su.villageQ', { m })], m * 600, [m * 60, m * 6000])
}
/** 例 3：三家和学校（比例尺 1∶10000；另一组 1∶5000） */
export const HOMES_N = [10000, 5000]
function qHomes(d: Difficulty, rng: RNG): Question {
  const n = d === 1 && rng.chance(0.6) ? 10000 : rng.pick(HOMES_N)
  const s = scaleOf(n)
  const roll = rng.next()
  if (roll < 0.3) return intQ(K_SCALE_USE, d, rng, `home-west-${n}`, [T('m6.prop.su.homeWestQ', { s, a: 200 })], (200 * 100) / n, [200, 20])
  if (roll < 0.55) return valueQ(K_SCALE_USE, d, rng, `home-north-${n}`, [T('m6.prop.su.homeNorthQ', { s, a: 250 })], fr(25000, n), [show(fr(2500, n)), show(fr(250000, n)), '250'])
  if (roll < 0.8) return intQ(K_SCALE_USE, d, rng, `home-east-${n}`, [T('m6.prop.su.homeEastQ', { s, a: 200, b: 400 })], (200 * 100) / n, [(400 * 100) / n, (600 * 100) / n])
  return intQ(K_SCALE_USE, d, rng, `home-bar-${n}`, [T('m6.prop.su.barBlankQ', { s }), bar(undefined, 'm')], n / 100, [n / 1000, n / 10])
}
/** 例 3 做一做：长方形操场 80 米 × 60 米，比例尺 1∶2000 */
export const FIELDS: [number, number, number][] = [
  [80, 60, 2000],
  [100, 60, 2000],
  [80, 60, 1000],
]
function qField(d: Difficulty, rng: RNG): Question {
  const [l, w, n] = d === 1 && rng.chance(0.5) ? FIELDS[0]! : rng.pick(FIELDS)
  if (d >= 2 && rng.chance(0.4)) {
    const area = ((l * 100) / n) * ((w * 100) / n)
    return intQ(K_SCALE_USE, d, rng, `field-area-${l}-${w}-${n}`, [T('m6.prop.su.fieldAreaQ', { l, w, s: scaleOf(n) })], area, [area * 2, (l * w) / n])
  }
  const isL = rng.chance(0.5)
  return intQ(K_SCALE_USE, d, rng, `field-${isL ? 'l' : 'w'}-${l}-${w}-${n}`, [T('m6.prop.su.fieldQ', { l, w, s: scaleOf(n), side: L(isL ? 'm6.prop.su.length' : 'm6.prop.su.width') })], ((isL ? l : w) * 100) / n, [isL ? l / 10 : w / 10])
}
/** 求图上距离（厘米）：练习十 7（1900 千米、1∶40000000 → 4.75 厘米）；另配几组 */
export const MAP: [number, number][] = [
  [1900, 40000000],
  [450, 2000000],
  [1.8, 50000],
  [360, 6000000],
  [240, 8000000],
  [900, 30000000],
]
function qMap(d: Difficulty, rng: RNG): Question {
  const [r, n] = d === 1 && rng.chance(0.4) ? MAP[0]! : rng.pick(MAP)
  const cm = div(mul(num(String(r)), fr(KM)), fr(n))
  return valueQ(K_SCALE_USE, d, rng, `map-${r}-${n}`, [T('m6.prop.su.mapQ', { r, s: scaleOf(n) })], cm, [show(mul(cm, fr(10))), show(div(cm, fr(10))), show(mul(cm, fr(100)))])
}
/** 练习十 8：填表（一行一题） */
export const FILL_SCALE: { n: number; m: number | null; r: number | null }[] = [
  { n: 50000, m: null, r: 1.8 },
  { n: 2000000, m: null, r: 450 },
  { n: 60000000, m: 15, r: null },
]
function qScaleTable(d: Difficulty, rng: RNG): Question {
  const row = rng.pick(FILL_SCALE)
  const value = row.m === null ? div(mul(num(String(row.r)), fr(KM)), fr(row.n)) : div(mul(num(String(row.m)), fr(row.n)), fr(KM))
  const rows: (number | LStr | null)[][] = [
    [H('scale'), H('mapCm'), H('realKm')],
    [scaleOf(row.n), row.m, row.r],
  ]
  return valueQ(K_SCALE_USE, d, rng, `table-${row.n}`, [T('m6.prop.su.tableQ'), { kind: 'stat-table', rows, head: 'row' }], value, [show(mul(value, fr(10))), show(div(value, fr(10))), show(mul(value, fr(100)))])
}
/** 练习十 9：篮球场平面图 1∶250 */
function qCourt(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d >= 2 && roll < 0.4) {
    const isL = rng.chance(0.5)
    return valueQ(K_SCALE_USE, d, rng, `court-size-${isL ? 'l' : 'w'}`, [T('m6.prop.su.courtSizeQ', { side: L(isL ? 'm6.prop.su.length' : 'm6.prop.su.width') })], fr((isL ? 28 : 15) * 100, 250), [show(fr((isL ? 28 : 15) * 10, 250)), String(isL ? 28 : 15), show(fr((isL ? 28 : 15) * 1000, 250))])
  }
  if (rng.chance(0.5)) return intQ(K_SCALE_USE, d, rng, 'court-side', [T('m6.prop.su.courtSideQ')], 1, [10, 25])
  return valueQ(K_SCALE_USE, d, rng, 'court-end', [T('m6.prop.su.courtEndQ')], fr(400, 250), ['16', '0.16', '4'])
}
/** 练习十 10：比例尺 1∶10000 画平面图 */
export const PARK: [string, number][] = [
  ['park', 500],
  ['tech', 300],
  ['zoo', 1000],
  ['hospital', 400],
]
function qPark(d: Difficulty, rng: RNG): Question {
  const [k, m] = rng.pick(PARK)
  return intQ(K_SCALE_USE, d, rng, `park-${k}`, [T('m6.prop.su.parkQ', { p: L(`m6.prop.su.p.${k}`) })], (m * 100) / 10000, [m / 10, m])
}
function qScaleUseJudge(d: Difficulty, rng: RNG): Question {
  return judge(K_SCALE_USE, d, rng, 'direct-judge', [T('m6.prop.su.directJudge')], true)
}
/** 练习十二 3：换一幅比例尺不同的地图 */
function qTwoMaps(d: Difficulty, rng: RNG): Question {
  return valueQ(K_SCALE_USE, d, rng, 'twomaps', [T('m6.prop.su.twoMapsQ')], fr(22, 10), ['13.75', '110', '22'])
}
/** 第 3 档：零件图 4∶1，图上 2 厘米 → 实际 5 毫米 */
function qPartReal(d: Difficulty, rng: RNG): Question {
  return intQ(K_SCALE_USE, d, rng, 'part-real', [T('m6.prop.su.partRealQ')], 5, [80, 8, 50])
}

function genScaleUse(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 例 2（结果、列比例、换单位）、做一做（河西村）、例 3（三家、线段比例尺的空）、做一做（操场）、练习十 5、7、8、9、10、练习十二 2(1)
    if (roll < 0.14) return qSubway(d, rng)
    if (roll < 0.26) return qReal(d, rng)
    if (roll < 0.36) return qVillage(d, rng)
    if (roll < 0.5) return qHomes(d, rng)
    if (roll < 0.58) return qField(d, rng)
    if (roll < 0.68) return qMap(d, rng)
    if (roll < 0.76) return qScaleTable(d, rng)
    if (roll < 0.84) return qCourt(d, rng)
    if (roll < 0.94) return qPark(d, rng)
    return qScaleUseJudge(d, rng)
  }
  if (d === 2) {
    if (roll < 0.25) return qTwoMaps(d, rng)
    if (roll < 0.45) return qField(d, rng)
    if (roll < 0.65) return qCourt(d, rng)
    if (roll < 0.8) return qMap(d, rng)
    return qReal(d, rng)
  }
  if (roll < 0.4) return qPartReal(d, rng)
  if (roll < 0.7) return qTwoMaps(d, rng)
  return qMap(d, rng)
}
defineGenerator(K_SCALE_USE, genScaleUse)

// ═════════════════════════════════════════════════════════════
// 8. 图形的放大与缩小（p57–58 现象、例 4、做一做；练习十一 1、2；练习十二 1(2)(3)）
// ═════════════════════════════════════════════════════════════

/** 方格纸上的图形：每格 1 个单位 */
function gridFig(W: number, Hh: number, items: GeoItem[], px = 22): GeoFig {
  return { w: W, h: Hh, px: Math.max(8, Math.min(px, Math.floor(260 / W), Math.floor(150 / Hh))), items: [{ t: 'grid', x: 0, y: 0, w: W, h: Hh }, ...items] }
}
const PHENOMENA: [string, boolean][] = [
  ['camera', false],
  ['magnifier', true],
  ['projector', true],
  ['microscope', true],
  ['computer', true],
]
function qPhenomenon(d: Difficulty, rng: RNG): Question {
  const [k, bigger] = rng.pick(PHENOMENA)
  return choose(K_ZOOM, d, rng, `ph-${k}`, [T(`m6.prop.z.ph.${k}`)], L(bigger ? 'm6.prop.opt.bigger' : 'm6.prop.opt.smaller'), [L(bigger ? 'm6.prop.opt.smaller' : 'm6.prop.opt.bigger')])
}
const sq = (x: number, y: number, w: number, h: number): GeoItem => ({ t: 'poly', pts: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], fill: 'b', stroke: 'b' })
/** 直角在左下：水平的直角边 a、竖直的直角边 b */
const tri = (x: number, y: number, a: number, b: number): GeoItem => ({ t: 'poly', pts: [[x, y], [x, y + b], [x + a, y + b]], fill: 'b', stroke: 'b', right: [1] })
/** 例 4：正方形边长 3 格、长方形 4 × 2、直角三角形 4 和 3，按 2∶1 放大；另配几组 */
export const SQUARES: [number, number][] = [
  [3, 2],
  [2, 2],
  [2, 3],
  [4, 2],
]
function qSquare(d: Difficulty, rng: RNG): Question {
  const [a, k] = d === 1 && rng.chance(0.5) ? SQUARES[0]! : rng.pick(SQUARES)
  return intQ(K_ZOOM, d, rng, `square-${a}-${k}`, [T('m6.prop.z.squareQ', { a, r: rt(k, 1) }), { kind: 'geo', figs: [gridFig(a + 2, a + 2, [sq(1, 1, a, a)])], alt: `（方格纸上边长 ${a} 格的正方形）` }], a * k, [a + k, a * k * k])
}
export const RECTS_Z: [number, number][] = [
  [4, 2],
  [3, 2],
  [5, 3],
  [3, 1],
]
function qRectZ(d: Difficulty, rng: RNG): Question {
  const [a, b] = d === 1 && rng.chance(0.5) ? RECTS_Z[0]! : rng.pick(RECTS_Z)
  const isL = rng.chance(0.5)
  return intQ(K_ZOOM, d, rng, `rect-${a}-${b}-${isL ? 'l' : 'w'}`, [T('m6.prop.z.rectQ', { a, b, r: rt(2, 1), side: L(isL ? 'm6.prop.z.length' : 'm6.prop.z.width') }), { kind: 'geo', figs: [gridFig(a + 2, b + 2, [sq(1, 1, a, b)])], alt: `（方格纸上长 ${a} 格、宽 ${b} 格的长方形）` }], (isL ? a : b) * 2, [(isL ? a : b) + 2, (isL ? b : a) * 2])
}
const legs = (a: number, b: number): LStr => L('m6.prop.z.legs', { a, b })
export const TRIS_Z: [number, number][] = [
  [4, 3],
  [2, 1],
  [3, 2],
  [2, 2],
]
function qTriZ(d: Difficulty, rng: RNG): Question {
  const [a, b] = d === 1 && rng.chance(0.5) ? TRIS_Z[0]! : rng.pick(TRIS_Z)
  // 错法：各加 2 格、只放大一条边、缩小了
  return choose(K_ZOOM, d, rng, `tri-${a}-${b}`, [T('m6.prop.z.triQ', { a, b, r: rt(2, 1) }), { kind: 'geo', figs: [gridFig(a + 2, b + 2, [tri(1, 1, a, b)])], alt: `（方格纸上的直角三角形，两条直角边 ${a} 格和 ${b} 格）` }], legs(a * 2, b * 2), [legs(a + 2, b + 2), legs(a * 2, b), legs(a, b * 2)].filter((l, i, arr) => JSON.stringify(l) !== JSON.stringify(legs(a * 2, b * 2)) && arr.findIndex((o) => JSON.stringify(o) === JSON.stringify(l)) === i))
}
function qZoomJudge(d: Difficulty, rng: RNG): Question {
  const items: [string, boolean][] = d === 3 ? [['area', false], ['add', false]] : [['double', true], ['third', true], ['add', false], ['hyp', true]]
  const [k, ok] = rng.pick(items)
  return judge(K_ZOOM, d, rng, `zjudge-${k}`, [T(`m6.prop.z.j.${k}`)], ok)
}
function qAnglePerim(d: Difficulty, rng: RNG): Question {
  const k = rng.pick([2, 3])
  if (rng.chance(0.5)) return choose(K_ZOOM, d, rng, `angle-${k}`, [T('m6.prop.z.angleQ', { r: rt(k, 1) })], L('m6.prop.opt.same'), [L('m6.prop.opt.larger'), L('m6.prop.opt.smallerSize')])
  return intQ(K_ZOOM, d, rng, `perim-${k}`, [T('m6.prop.z.perimQ', { r: rt(k, 1) })], k, [k * k, k + 1])
}
/** 例 4 的缩小：放大后的正方形 6 按 1∶3、长方形 8 × 4 按 1∶4、直角三角形 8 和 6 按 1∶2 */
function qShrink(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (roll < 0.35) {
    const [a, k] = d === 1 && rng.chance(0.5) ? ([6, 3] as [number, number]) : rng.pick([
      [6, 3],
      [8, 4],
      [6, 2],
      [9, 3],
    ] as [number, number][])
    return intQ(K_ZOOM, d, rng, `shrink-square-${a}-${k}`, [T('m6.prop.z.shrinkSquareQ', { a, r: rt(1, k) })], a / k, [a * k, a - k])
  }
  if (roll < 0.7) {
    const isL = rng.chance(0.5)
    return intQ(K_ZOOM, d, rng, `shrink-rect-${isL ? 'l' : 'w'}`, [T('m6.prop.z.shrinkRectQ', { a: 8, b: 4, r: rt(1, 4), side: L(isL ? 'm6.prop.z.length' : 'm6.prop.z.width') })], isL ? 2 : 1, [isL ? 4 : 2, isL ? 32 : 16])
  }
  return choose(K_ZOOM, d, rng, 'shrink-tri', [T('m6.prop.z.shrinkTriQ', { a: 8, b: 6, r: rt(1, 2) })], legs(4, 3), [legs(16, 12), legs(6, 4), legs(4, 6)])
}
/** 做一做：直角边 2 格和 1 格，先 4∶1 放大，再 1∶2 缩小 */
function qTwice(d: Difficulty, rng: RNG): Question {
  const fig: StemPart = { kind: 'geo', figs: [gridFig(5, 4, [tri(1, 1, 2, 1)])], alt: '（方格纸上的直角三角形，两条直角边 2 格和 1 格）' }
  if (rng.chance(0.5)) return choose(K_ZOOM, d, rng, 'twice-1', [T('m6.prop.z.twice1Q', { a: 2, b: 1, r: rt(4, 1) }), fig], legs(8, 4), [legs(6, 5), legs(8, 1), legs(4, 2)])
  return choose(K_ZOOM, d, rng, 'twice-2', [T('m6.prop.z.twice2Q', { a: 2, b: 1, r1: rt(4, 1), r2: rt(1, 2) }), fig], legs(4, 2), [legs(8, 4), legs(1, 0.5), legs(16, 8)])
}
/** 练习十一 1：哪个图形是 A 按 2∶1 放大后的（课本是青蛙，这里画小房子） */
const house = (x: number, y: number, sx: number, sy: number): GeoItem => ({
  t: 'poly',
  pts: [[x, y + 2 * sy], [x, y + sy], [x + 1.5 * sx, y], [x + 3 * sx, y + sy], [x + 3 * sx, y + 2 * sy]],
  fill: 'a',
  stroke: 'a',
})
export const PICK_SCALES: [number, number][] = [
  [2, 2],
  [5 / 3, 1],
  [1, 2],
  [5 / 3, 2],
]
function qPick(d: Difficulty, rng: RNG): Question {
  const order = rng.shuffle([0, 1, 2, 3])
  const items: GeoItem[] = [house(1, 3, 1, 1), { t: 'text', at: [2.5, 5.5], text: 'A', letter: true }]
  let x = 5
  order.forEach((k, i) => {
    const [sx, sy] = PICK_SCALES[k]!
    items.push(house(x, 5 - 2 * sy, sx, sy))
    items.push({ t: 'text', at: [x + 1.5 * sx, 5.6], text: String(i + 1), badge: true })
    x += 3 * sx + 1
  })
  const fig = gridFig(x + 1, 6, items, 12)
  const correct = String(order.indexOf(0) + 1)
  return choose(K_ZOOM, d, rng, `pick-${order.join('')}`, [T('m6.prop.z.pickQ', { r: rt(2, 1) }), { kind: 'geo', figs: [fig], alt: '（方格纸上的图形 A 和编号 1 到 4 的四个图形）' }], correct, ['1', '2', '3', '4'].filter((s) => s !== correct))
}
/** 练习十一 2：三角形 A（直角边都是 2 格）按 n∶1 放大得到 B，B 再按 1∶2 缩小得到 C */
export const AB: [number, number][] = [
  [3, 2],
  [2, 2],
  [4, 2],
]
function qAB(d: Difficulty, rng: RNG): Question {
  const [k, back] = rng.pick(AB)
  if (rng.chance(0.5)) return intQ(K_ZOOM, d, rng, `ab-${k}`, [T('m6.prop.z.abQ', { a: 2, r: rt(k, 1) })], 2 * k, [2 + k, k])
  return intQ(K_ZOOM, d, rng, `bc-${k}-${back}`, [T('m6.prop.z.bcQ', { a: 2, r1: rt(k, 1), r2: rt(1, back) })], (2 * k) / back, [2 * k, 2 * k * back])
}
/** 按什么比画的 */
export const WHICH: [number, number][] = [
  [2, 6],
  [3, 6],
  [2, 8],
  [6, 2],
  [8, 2],
]
function qWhich(d: Difficulty, rng: RNG): Question {
  const [a, b] = rng.pick(WHICH)
  const correct = b > a ? rt(b / a, 1) : rt(1, a / b)
  const others = [rt(1, b / a > 1 ? b / a : 1), rt(a / b > 1 ? a / b : 1, 1), rt(2, 1), rt(4, 1), rt(1, 2), rt(3, 1)]
  return choose(K_ZOOM, d, rng, `which-${a}-${b}`, [T('m6.prop.z.whichQ', { a, b })], correct, ratioWrongs(correct, others))
}
function qKindZ(d: Difficulty, rng: RNG): Question {
  const s = rng.pick([rt(3, 1), rt(1, 4), rt(2, 1), rt(1, 2), rt(5, 1), rt(1, 3)])
  const bigger = s.endsWith(`${RATIO}1`)
  return choose(K_ZOOM, d, rng, `kind-${s}`, [T('m6.prop.z.kindQ', { r: s })], L(bigger ? 'm6.prop.opt.bigger' : 'm6.prop.opt.smaller'), [L(bigger ? 'm6.prop.opt.smaller' : 'm6.prop.opt.bigger')])
}
/** 练习十二 1(3)：长 5 厘米、宽 3 厘米的长方形按 3∶1 放大 */
function qRect53(d: Difficulty, rng: RNG): Question {
  if (d >= 2 && rng.chance(0.5)) return intQ(K_ZOOM, d, rng, 'rect53-area', [T('m6.prop.z.rect53AreaQ', { r: rt(3, 1) })], 135, [45, 15, 405])
  const isL = rng.chance(0.5)
  return intQ(K_ZOOM, d, rng, `rect53-${isL ? 'l' : 'w'}`, [T('m6.prop.z.rect53Q', { r: rt(3, 1), side: L(isL ? 'm6.prop.z.length' : 'm6.prop.z.width') })], isL ? 15 : 9, [isL ? 8 : 6])
}
/** 第 2 档：面积是原来的几倍（练习十一 2(3)*）、两个圆（练习十二 1(2)） */
function qAreaTimes(d: Difficulty, rng: RNG): Question {
  const k = rng.pick([2, 3, 4])
  return intQ(K_ZOOM, d, rng, `areatimes-${k}`, [T('m6.prop.z.areaTimesQ', { r: rt(k, 1) })], k * k, [k, k * 2])
}
function qCircles(d: Difficulty, rng: RNG): Question {
  const what = rng.pick(['diameter', 'circumference', 'area'])
  const correct = what === 'area' ? rt(25, 9) : rt(5, 3)
  return choose(K_ZOOM, d, rng, `circles-${what}`, [T('m6.prop.z.circlesQ', { w: L(`m6.prop.z.${what}`) })], correct, ratioWrongs(correct, [what === 'area' ? rt(5, 3) : rt(25, 9), rt(3, 5), rt(10, 3), rt(25, 3)]))
}

function genZoom(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 现象、例 4（放大正方形 / 长方形 / 直角三角形、斜边、角和周长、缩小）、做一做、练习十一 1、2、按什么比、放大还是缩小、练习十二 1(3)
    if (roll < 0.1) return qPhenomenon(d, rng)
    if (roll < 0.19) return qSquare(d, rng)
    if (roll < 0.27) return qRectZ(d, rng)
    if (roll < 0.35) return qTriZ(d, rng)
    if (roll < 0.42) return qZoomJudge(d, rng)
    if (roll < 0.49) return qAnglePerim(d, rng)
    if (roll < 0.57) return qShrink(d, rng)
    if (roll < 0.64) return qTwice(d, rng)
    if (roll < 0.72) return qPick(d, rng)
    if (roll < 0.8) return qAB(d, rng)
    if (roll < 0.87) return qWhich(d, rng)
    if (roll < 0.93) return qKindZ(d, rng)
    return qRect53(d, rng)
  }
  if (d === 2) {
    if (roll < 0.25) return qAreaTimes(d, rng)
    if (roll < 0.45) return qCircles(d, rng)
    if (roll < 0.6) return qRect53(d, rng)
    if (roll < 0.75) return qPick(d, rng)
    if (roll < 0.9) return qWhich(d, rng)
    return qTwice(d, rng)
  }
  if (roll < 0.4) return qZoomJudge(d, rng)
  if (roll < 0.7) return qCircles(d, rng)
  return qAreaTimes(d, rng)
}
defineGenerator(K_ZOOM, genZoom)

// ═════════════════════════════════════════════════════════════
// 9. 用比例解决问题（p59–60 例 5、例 6、做一做；练习十一 3–12；整理和复习 4；练习十二 4*）
// ═════════════════════════════════════════════════════════════

/** 例 5：张阿姨家 8 吨水 40 元（每吨 5 元）；另一组 6 吨 21 元（每吨 3.5 元） */
export const WATER: [number, number, number][] = [
  [8, 40, 10],
  [8, 40, 6],
  [8, 40, 12],
  [6, 21, 10],
]
function qWater(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (roll < 0.35) {
    const [a, p, b] = d === 1 && rng.chance(0.5) ? WATER[0]! : rng.pick(WATER)
    return intQ(K_APPLY, d, rng, `water-${a}-${p}-${b}`, [T('m6.prop.a.water', { a, p, b })], (p * b) / a, [(a * b) / p, p + b - a])
  }
  if (roll < 0.6) {
    const q = rng.pick([60, 45, 35])
    return intQ(K_APPLY, d, rng, `waterback-${q}`, [T('m6.prop.a.waterBack', { q })], q / 5, [q / 8, q - 40 + 8])
  }
  if (roll < 0.8) return relQ(K_APPLY, d, rng, 'water-rel', [T('m6.prop.a.waterRelQ')], 'direct')
  return choose(K_APPLY, d, rng, 'water-setup', [T('m6.prop.a.waterSetupQ')], pr(40, 8, 'x', 10), [pr(40, 8, 10, 'x'), pr(8, 40, 'x', 10), pr(40, 'x', 10, 8)])
}
/** 例 6：原来每天 100 千瓦时，改用节能灯后每天 25 千瓦时 */
export const LAMPS: [number, number, number][] = [
  [100, 25, 5],
  [100, 25, 3],
  [100, 20, 4],
  [90, 30, 5],
]
function qLamp(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (roll < 0.35) {
    const [a, b, n] = d === 1 && rng.chance(0.5) ? LAMPS[0]! : rng.pick(LAMPS)
    return intQ(K_APPLY, d, rng, `lamp-${a}-${b}-${n}`, [T('m6.prop.a.lamp', { a, b, n })], (a * n) / b, [(b * n) / a > 0 ? Math.max(1, Math.round((b * n) / a)) : 1, a - b + n])
  }
  if (roll < 0.55) {
    const n = d === 1 && rng.chance(0.5) ? 30 : rng.pick([30, 20, 12])
    return valueQ(K_APPLY, d, rng, `lampback-${n}`, [T('m6.prop.a.lampBack', { n })], fr(25 * n, 100), [String(n * 4), show(fr(100 * n, 25)), String(n - 5)])
  }
  if (roll < 0.75) return relQ(K_APPLY, d, rng, 'lamp-rel', [T('m6.prop.a.lampRelQ')], 'inverse')
  return choose(K_APPLY, d, rng, 'lamp-setup', [T('m6.prop.a.lampSetupQ')], '25x = 100 × 5', ['100x = 25 × 5', '5x = 100 × 25', '25 + x = 100 + 5'])
}
/** 做一做 1（4 支 6 元，买 3 支）、2（4 支 1.5 元的钱买 2 元的） */
export const PEN1: [number, number, number][] = [
  [4, 6, 3],
  [4, 6, 6],
  [4, 6, 10],
  [5, 8, 3],
]
export const PEN2: [number, string, string][] = [
  [4, '1.5', '2'],
  [4, '1.5', '3'],
  [6, '2', '3'],
  [5, '1.2', '2'],
]
function qPens(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    const [a, p, b] = d === 1 && rng.chance(0.5) ? PEN1[0]! : rng.pick(PEN1)
    const v = fr(p * b, a)
    return valueQ(K_APPLY, d, rng, `pen1-${a}-${p}-${b}`, [T('m6.prop.a.pen1', { a, p, b })], v, [show(fr(a * b, p)), show(fr(p + b - a)), show(fr(p * a, b))])
  }
  const [a, p, q] = d === 1 && rng.chance(0.5) ? PEN2[0]! : rng.pick(PEN2)
  const v = div(mul(fr(a), num(p)), num(q))
  return intQ(K_APPLY, d, rng, `pen2-${a}-${p}-${q}`, [T('m6.prop.a.pen2', { a, p, q })], v[0], [Math.round((a * Number(q)) / Number(p)), a])
}
/** 练习十一：影子、空间站、水渠、货车、读书、运货汽车、生活费、收割机 */
export const SHADOWS = ['4', '3.2', '4.8', '8']
function qShadowApply(d: Difficulty, rng: RNG): Question {
  const s = d === 1 && rng.chance(0.5) ? '4' : rng.pick(SHADOWS)
  const v = div(mul(num(s), fr(15, 10)), fr(24, 10))
  return valueQ(K_APPLY, d, rng, `shadow-${s}`, [T('m6.prop.a.shadow', { s })], v, [show(div(mul(num(s), fr(24, 10)), fr(15, 10))), show(fr(v[0] + v[1], v[1])), s])
}
export const STATION = [15, 10, 4, 12]
function qStation(d: Difficulty, rng: RNG): Question {
  const n = d === 1 && rng.chance(0.5) ? 15 : rng.pick(STATION)
  return valueQ(K_APPLY, d, rng, `station-${n}`, [T('m6.prop.a.station', { n })], fr(9 * n, 6), [show(fr(6 * n, 9)), String(n + 3), show(fr(9 * n, 3))])
}
export const CANAL = [8, 9, 4]
function qCanal(d: Difficulty, rng: RNG): Question {
  const h = d === 1 && rng.chance(0.5) ? 8 : rng.pick(CANAL)
  return intQ(K_APPLY, d, rng, `canal-${h}`, [T('m6.prop.a.canal', { h })], 72 / h, [(12 * h) / 6, 12 - (h - 6)])
}
export const TRUCK = [400, 560, 240]
function qTruck(d: Difficulty, rng: RNG): Question {
  const k = d === 1 && rng.chance(0.5) ? 400 : rng.pick(TRUCK)
  return intQ(K_APPLY, d, rng, `truck-${k}`, [T('m6.prop.a.truck', { k })], k / 80, [k / 160, k / 40])
}
export const BOOKS_DAYS = [6, 10, 12, 5]
function qBook(d: Difficulty, rng: RNG): Question {
  const n = d === 1 && rng.chance(0.5) ? 6 : rng.pick(BOOKS_DAYS)
  return intQ(K_APPLY, d, rng, `book-${n}`, [T('m6.prop.a.book', { n })], 240 / n, [30, 30 + (8 - n)])
}
export const RETURN = [90, 80, 120]
function qReturn(d: Difficulty, rng: RNG): Question {
  const v = d === 1 && rng.chance(0.5) ? 90 : rng.pick(RETURN)
  return intQ(K_APPLY, d, rng, `return-${v}`, [T('m6.prop.a.return', { v })], 720 / v, [10, Math.round((v * 10) / 72)])
}
export const ALLOW1 = [30, 24, 25, 20]
export const ALLOW2 = [32, 25, 40]
function qAllowance(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    const p = d === 1 && rng.chance(0.5) ? 30 : rng.pick(ALLOW1)
    return intQ(K_APPLY, d, rng, `allow1-${p}`, [T('m6.prop.a.allow1', { p })], 1200 / p, [30, 40 - p + 30])
  }
  const n = d === 1 && rng.chance(0.5) ? 32 : rng.pick(ALLOW2)
  return valueQ(K_APPLY, d, rng, `allow2-${n}`, [T('m6.prop.a.allow2', { n })], fr(1200, n), [show(fr(n * 40, 30)), String(40 - (n - 30)), show(fr(1200, n + 2))])
}
export const HARVEST = [30, 24, 60, 20]
function qHarvest(d: Difficulty, rng: RNG): Question {
  if (d >= 2 && rng.chance(0.35)) return intQ(K_APPLY, d, rng, 'harvest-total', [T('m6.prop.a.harvestTotal')], 96, [12, 320, 40])
  const h = d === 1 && rng.chance(0.5) ? 30 : rng.pick(HARVEST)
  return valueQ(K_APPLY, d, rng, `harvest-${h}`, [T('m6.prop.a.harvest', { h })], fr(12, h), [show(fr(3 * h, 400)), show(fr(12 + h, 10 * h)), '0.3'])
}
/** 整理和复习 4 */
function qDrive(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) return intQ(K_APPLY, d, rng, 'drive1', [T('m6.prop.a.drive1')], 150, [300, 100, 200])
  return valueQ(K_APPLY, d, rng, 'drive2', [T('m6.prop.a.drive2')], fr(5, 2), ['3.6', '3', '2'])
}
/** 每道应用题里，两种量成什么比例 */
export const RELS: [string, Rel][] = [
  ['canal', 'inverse'],
  ['truck', 'direct'],
  ['book', 'inverse'],
  ['station', 'direct'],
  ['pens', 'direct'],
  ['allow', 'inverse'],
]
function qRel(d: Difficulty, rng: RNG): Question {
  const [k, rel] = rng.pick(RELS)
  return relQ(K_APPLY, d, rng, `rel-${k}`, [T('m6.prop.a.relQ', { s: L(`m6.prop.a.r.${k}`) })], rel)
}
/** 第 2、3 档：练习十一 6（高铁）、12（方砖）、练习十二 4*（折扣） */
function qRail(d: Difficulty, rng: RNG): Question {
  return choose(K_APPLY, d, rng, 'rail', [T('m6.prop.a.rail')], L('m6.prop.opt.can'), [L('m6.prop.opt.cannot')])
}
function qBricks(d: Difficulty, rng: RNG): Question {
  return intQ(K_APPLY, d, rng, 'bricks', [T('m6.prop.a.bricks')], 144, [120, 83, 100])
}
function qDiscount(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (roll < 0.4 || d === 2) return intQ(K_APPLY, d, rng, 'discount1', [T('m6.prop.a.discount'), T('m6.prop.a.discount1Q')], 108, [80, 72, 300])
  if (roll < 0.7) return intQ(K_APPLY, d, rng, 'discount2', [T('m6.prop.a.discount'), T('m6.prop.a.discount2Q')], 3, [2, 4])
  return choose(K_APPLY, d, rng, 'discount3', [T('m6.prop.a.discount'), T('m6.prop.a.discount3Q')], 'y = 0.6x', ['y = 0.4x', 'x = 0.6y', 'y = x − 100'])
}

function genApply(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 例 5（结果、追问、关系、列比例）、例 6（结果、追问、关系、列式）、做一做 1–2、练习十一 3、4、5、7、8、9(1)、10、11、整理和复习 4、两种量的关系
    if (roll < 0.14) return qWater(d, rng)
    if (roll < 0.28) return qLamp(d, rng)
    if (roll < 0.38) return qPens(d, rng)
    if (roll < 0.44) return qShadowApply(d, rng)
    if (roll < 0.5) return qStation(d, rng)
    if (roll < 0.56) return qCanal(d, rng)
    if (roll < 0.62) return qTruck(d, rng)
    if (roll < 0.68) return qBook(d, rng)
    if (roll < 0.73) return qReturn(d, rng)
    if (roll < 0.8) return qAllowance(d, rng)
    if (roll < 0.86) return qHarvest(d, rng)
    if (roll < 0.92) return qDrive(d, rng)
    return qRel(d, rng)
  }
  if (d === 2) {
    if (roll < 0.2) return qRail(d, rng)
    if (roll < 0.4) return qBricks(d, rng)
    if (roll < 0.55) return qHarvest(d, rng)
    if (roll < 0.7) return qDiscount(d, rng)
    if (roll < 0.85) return qRel(d, rng)
    return qAllowance(d, rng)
  }
  if (roll < 0.5) return qDiscount(d, rng)
  if (roll < 0.75) return qBricks(d, rng)
  return qRail(d, rng)
}
defineGenerator(K_APPLY, genApply)
