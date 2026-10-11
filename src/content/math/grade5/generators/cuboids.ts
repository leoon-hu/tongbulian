// 五下「3 长方体和正方体」的生成器（五年级数学 G）。
import type { BeakerItem, BoxSpec, Difficulty, InputMode, LParam, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 五下第三单元「长方体和正方体」（课本 p18–43，平台当前的旧版五下）：
//   1. 长方体和正方体的认识（p18–22：小标题「长方体」例 1 面 / 棱 / 顶点、例 2 框架与长宽高、做一做；「正方体」例 3、
//      长方体和正方体的关系、做一做搭小正方体；练习五）→ m5s2-03-know
//   2. 长方体和正方体的表面积（p23–26）：展开图 + 做一做（哪些能围成正方体）、练习六 1、2 → m5s2-03-net；
//      表面积的意义、例 1、做一做（衣柜布罩，没有底面）、练习六 3–13 → m5s2-03-surface
//   3. 长方体和正方体的体积（p27–41）：体积和体积单位（p27–28 + 做一做；练习七 2–5）→ m5s2-03-volume-unit；
//      体积公式（p29–31 例 1、底面积 V = Sh、做一做；练习七 6–11）→ m5s2-03-volume；
//      体积单位间的进率（p34–37 例 2–4、做一做；练习八）→ m5s2-03-rate；
//      容积和容积单位（p38 + 做一做、例 5；练习九 1–6）→ m5s2-03-capacity；
//      例 6 排水法（p39；练习九 7–9、13*）→ m5s2-03-irregular。
//   整理和复习、练习十的题按内容分进上面几个知识点的第 2、3 档。
// 规矩：
// - 题目文字的单位写汉字（立方厘米、升），图里只写数（「图中的单位是厘米。」写在题目里）。
// - 「长」只出现在「长度」「长方形」「长方体」「棱长」里：数据题一律写「长度是 5 米」；绕不开的概念（长方体的长、宽、高，
//   公式「长 × 宽 × 高」）照课本写，朗读靠合成时换字兜底（报告里列了这些片段）。
// - 小数答案一律选项卡，干扰项照课本暴露的错法造：漏乘 2、按 6 个面算、进率用错、小数点移错；小数只用课本的数和小池子。
// - 判断题「……，对吗？」配 对 / 不对；只有一个对的才出「哪个」。
// 不出：动手做 / 量 / 搭、说一说、估计书和家具的体积、钢管堆（练习七 1）、转动正方体找相对面（练习五 8*）、领奖台（练习六 12）、
// 宫灯（练习十 4）、「冰雪大世界」（练习九 12：蓄水量的「量」）。
// 程序里的小数都按字符串处理：移小数点按字符移（shift），乘出来的数用 fmt 去掉浮点尾巴。
// ─────────────────────────────────────────────────────────────

const T = 'solid' as const
export const KP_KNOW = 'm5s2-03-know'
export const KP_NET = 'm5s2-03-net'
export const KP_SURF = 'm5s2-03-surface'
export const KP_VUNIT = 'm5s2-03-volume-unit'
export const KP_VOL = 'm5s2-03-volume'
export const KP_RATE = 'm5s2-03-rate'
export const KP_CAP = 'm5s2-03-capacity'
export const KP_IRR = 'm5s2-03-irregular'

type P = Record<string, LParam>
/** 本单元的词条（m5.cube.*） */
export const K = (k: string, p?: P): LStr => (p ? { k: `m5.cube.${k}`, p } : { k: `m5.cube.${k}` })
const text = (k: string, p?: P): StemPart => ({ kind: 'text', text: K(k, p) })
const box = (items: BoxSpec[], arrow = false): StemPart => (arrow ? { kind: 'box', items, arrow } : { kind: 'box', items })
const solids = (rows: number[][]): StemPart => ({ kind: 'cube-solids', items: [{ rows }] })
type Gen = () => Question

/** 按权重挑一种题 */
function pickBy(rng: RNG, table: [number, Gen][]): Question {
  const total = table.reduce((s, [w]) => s + w, 0)
  let r = rng.next() * total
  for (const [w, make] of table) {
    if (r < w) return make()
    r -= w
  }
  return table[table.length - 1]![1]()
}

// ─────────────────────────────────────────────────────────────
// 单位、数、出题的小骨架
// ─────────────────────────────────────────────────────────────

export type U = 'mm' | 'cm' | 'dm' | 'm' | 'cm2' | 'dm2' | 'm2' | 'cm3' | 'dm3' | 'm3' | 'l' | 'ml'
export type Len = 'cm' | 'dm' | 'm'
export const unitL = (x: U): LStr => K(`u.${x}`)
export const SQ: Record<Len, U> = { cm: 'cm2', dm: 'dm2', m: 'm2' }
export const CU: Record<Len, U> = { cm: 'cm3', dm: 'dm3', m: 'm3' }
/** 「5.5 厘米」这种带单位的数（选项） */
export const nU = (n: number | string, x: U): LStr => K('nU', { n, u: unitL(x) })

/** 小数写法：去掉浮点尾巴，末尾不带 0（0.75 × 1.6 × 2 → 2.4） */
export const fmt = (v: number): string => String(Math.round(v * 1e6) / 1e6)

/** 规范写法：整数部分去掉打头多余的 0，小数部分去掉末尾的 0 */
function norm(s: string): string {
  const [ip, fp = ''] = s.split('.')
  const i = ip!.replace(/^0+(?=\d)/, '')
  const f = fp.replace(/0+$/, '')
  return f ? `${i}.${f}` : i
}
/** 移动小数点：k > 0 向右移 k 位（乘 10 的 k 次方），k < 0 向左；位数不够用 0 补（同四下 decimals.ts 的 shiftPoint） */
export function shift(s: string, k: number): string {
  const [ip, fp = ''] = s.split('.')
  const digits = ip! + fp
  const point = ip!.length + k
  let out: string
  if (point <= 0) out = `0.${'0'.repeat(-point)}${digits}`
  else if (point >= digits.length) out = digits + '0'.repeat(point - digits.length)
  else out = `${digits.slice(0, point)}.${digits.slice(point)}`
  return norm(out)
}
const isInt = (s: string): boolean => /^\d+$/.test(s)

const YES = K('yes')
const NO = K('no')

interface NumOpts {
  input?: InputMode
  min?: number
  max?: number
}
/** 数的答案：数字键盘或数的选项卡（smart = 照常见错法算出来的干扰数）；选编号的题给 input: 'choice' 和编号的范围 */
function num(kp: string, d: Difficulty, rng: RNG, sig: string, stem: StemPart[], value: number, smart: number[] = [], o: NumOpts = {}): Question {
  const min = o.min ?? 0
  const ok = smart.filter((v) => Number.isInteger(v) && v >= min && v !== value && (o.max === undefined || v <= o.max))
  const max = o.max ?? Math.max(value * 10, ...ok, 20)
  return numberQuestion({ kpId: kp, type: T, difficulty: d, sig, stem, value, rng, max, min, smart: ok, input: o.input })
}
/** 文字 / 词条答案的选项题 */
function pick(kp: string, d: Difficulty, rng: RNG, sig: string, stem: StemPart[], correct: LStr, distractors: LStr[]): Question {
  return labelQuestion({ kpId: kp, type: T, difficulty: d, sig, stem, correct, distractors, rng })
}
/** 判断题：「……，对吗？」配 对 / 不对 */
function judge(kp: string, d: Difficulty, rng: RNG, sig: string, stem: StemPart[], truth: boolean): Question {
  return pick(kp, d, rng, sig, stem, truth ? YES : NO, [truth ? NO : YES])
}
/**
 * 小数（或整数）答案的选项题：正确答案 + 干扰项（规范写法、去掉重复的、和答案相等的、不是正数的），最多 3 个；
 * unit 给了就带单位写（「5.5 厘米」）
 */
function decPick(kp: string, d: Difficulty, rng: RNG, sig: string, stem: StemPart[], correct: string, wrongs: string[], unit?: U): Question {
  const c = norm(correct)
  const seen = new Set([c])
  const ds: string[] = []
  for (const w of wrongs) {
    const x = norm(w)
    if (seen.has(x) || !(Number(x) > 0) || ds.length >= 3) continue
    seen.add(x)
    ds.push(x)
  }
  const lab = (x: string): LStr => (unit ? nU(x, unit) : x)
  return pick(kp, d, rng, sig, stem, lab(c), ds.map(lab))
}
/**
 * 换算的答案：整数（不超过 9 位）出数字键盘或数的选项，小数一律选项（干扰项是进率用错、小数点移反的那几个）
 */
function convAnswer(kp: string, d: Difficulty, rng: RNG, sig: string, stem: StemPart[], answer: string, wrongs: string[]): Question {
  if (isInt(answer) && answer.length <= 9) return num(kp, d, rng, sig, stem, Number(answer), wrongs.filter((w) => isInt(w) && w.length <= 9).map(Number))
  return decPick(kp, d, rng, sig, stem, answer, wrongs)
}

/** 三个互不相等的整数（第一个最大，当长度）：长方体的长、宽、高 */
export function dims3(rng: RNG, lo: number, hi: number): [number, number, number] {
  for (;;) {
    const a = rng.int(lo, hi)
    const b = rng.int(lo, hi)
    const c = rng.int(lo, hi)
    if (a === b || b === c || a === c) continue
    const [l, w] = a > b ? [a, b] : [b, a]
    return [l, w, c]
  }
}
const labels3 = (l: number | string, w: number | string, h: number | string): BoxSpec['labels'] => ({ l: String(l), w: String(w), h: String(h) })

// ═════════════════════════════════════════════════════════════
// 1. 长方体和正方体的认识
// ═════════════════════════════════════════════════════════════

/** 例 1、例 3 的图：线框的长方体、正方体 */
const SHAPE_FIG: Record<'cuboid' | 'cube', BoxSpec> = {
  cuboid: { l: 3, w: 2, h: 1.6, wire: true },
  cube: { l: 2, w: 2, h: 2, wire: true },
}
export const COUNTS = { faces: 6, edges: 12, vertices: 8 } as const
/** 标红一条棱的三种长方体：扁一点的、竖高的（练习五 3）、又长又扁的 */
export const MARK_SHAPES: BoxSpec[] = [
  { l: 3, w: 2, h: 1.6 },
  { l: 2, w: 1.6, h: 3 },
  { l: 3.4, w: 1.6, h: 1.2 },
]
/** 例 1–3 的结论、做一做（3）改成的判断题：tier 是第几档出 */
export const KNOW_FACTS: { id: string; truth: boolean; tier: 1 | 2 }[] = [
  { id: 'oppFace', truth: true, tier: 1 },
  { id: 'oppEdge', truth: true, tier: 1 },
  { id: 'allRect', truth: false, tier: 1 },
  { id: 'twoSquare', truth: true, tier: 1 },
  { id: 'cubeFaces', truth: true, tier: 1 },
  { id: 'cubeEdges', truth: true, tier: 1 },
  { id: 'cubeIsCuboid', truth: true, tier: 1 },
  { id: 'cuboidIsCube', truth: false, tier: 1 },
  { id: 'cubeSpecial', truth: true, tier: 1 },
  { id: 'alias', truth: true, tier: 1 },
  { id: 'vertexEqual', truth: false, tier: 2 },
  { id: 'fourSquares', truth: true, tier: 2 },
]
export const FACES = ['front', 'back', 'top', 'bottom', 'left', 'right'] as const
export type Face = (typeof FACES)[number]
export const OPP_FACE: Record<Face, Face> = { front: 'back', back: 'front', top: 'bottom', bottom: 'top', left: 'right', right: 'left' }

/** 用 n 个小正方体搭长方体有几种搭法（长、宽、高不计顺序：1 × 2 × 6 和 2 × 1 × 6 算一种；正方体也算） */
export function boxWays(n: number): number {
  let k = 0
  for (let a = 1; a * a * a <= n; a++) for (let b = a; a * b * b <= n; b++) if (n % (a * b) === 0) k++
  return k
}

function knowGen(d: Difficulty, rng: RNG): Question {
  const kp = KP_KNOW
  const count: Gen = () => {
    const shape = rng.pick(['cuboid', 'cube'] as const)
    const what = rng.pick(['faces', 'edges', 'vertices'] as const)
    const v = COUNTS[what]
    return num(kp, d, rng, `count-${shape}-${what}`, [text(`k.${what}`, { s: K(`shape.${shape}`) }), box([SHAPE_FIG[shape]])], v, [6, 8, 12, 4])
  }
  const fact = (tier: 1 | 2): Gen => () => {
    const f = rng.pick(KNOW_FACTS.filter((x) => x.tier === tier))
    return judge(kp, d, rng, `fact-${f.id}`, [text(`k.s.${f.id}`)], f.truth)
  }
  const groups: Gen = () =>
    rng.chance(0.5) ? num(kp, d, rng, 'groups', [text('k.groups')], 3, [2, 4, 6]) : num(kp, d, rng, 'perGroup', [text('k.perGroup')], 4, [3, 2, 6])
  const see: Gen = () => num(kp, d, rng, 'see', [text('k.see')], 3, [2, 4, 6])
  const cube8: Gen = () => num(kp, d, rng, 'cube8', [text('k.cube8')], 8, [4, 6, 9])
  // 例 2：相交于同一顶点的 3 条棱的长度叫作长、宽、高——标红一条，问它叫什么
  const mark: Gen = () => {
    const i = rng.int(0, MARK_SHAPES.length - 1)
    const m = rng.pick(['l', 'w', 'h'] as const)
    return pick(
      kp, d, rng, `mark-${i}-${m}`,
      [text('k.mark'), box([{ ...MARK_SHAPES[i]!, wire: true, mark: m }])],
      K(`dim.${m}`),
      (['l', 'w', 'h'] as const).filter((x) => x !== m).map((x) => K(`dim.${x}`)),
    )
  }
  // 三条棱都标了数：高 / 宽是多少（标在哪条棱上是长、宽、高）
  const dim: Gen = () => {
    const [l, w, h] = dims3(rng, 3, 30)
    const unit = rng.pick(['cm', 'dm', 'm'] as const)
    const which = rng.pick(['h', 'w'] as const)
    const v = which === 'h' ? h : w
    return num(
      kp, d, rng, `dim-${which}-${l}-${w}-${h}-${unit}`,
      [text('unitIs', { u: unitL(unit) }), text(which === 'h' ? 'k.heightIs' : 'k.widthIs', { u: unitL(unit) }), box([{ l, w, h, labels: labels3(l, w, h) }])],
      v,
      [l, w, h],
    )
  }
  // 例 1 / 练习五 1：相对的面完全相同
  const sameFace: Gen = () => {
    const f = rng.pick(FACES)
    const others = rng.shuffle(FACES.filter((x) => x !== f && x !== OPP_FACE[f])).slice(0, 2)
    return pick(kp, d, rng, `same-${f}`, [text('k.sameFace', { f: K(`f.${f}`) }), box([{ l: 3, w: 2, h: 1.6 }])], K(`f.${OPP_FACE[f]}`), others.map((x) => K(`f.${x}`)))
  }
  // 练习五 1：前面 / 上面 / 右面这个长方形的两条边
  const faceSides: Gen = () => {
    const [l, w, h] = dims3(rng, 3, 30)
    const unit = rng.pick(['cm', 'dm'] as const)
    const f = rng.pick(['front', 'top', 'right'] as const)
    const PAIRS: Record<'front' | 'top' | 'right', [number, number]> = { front: [l, h], top: [l, w], right: [w, h] }
    const lab = (p: [number, number]): LStr => K('pair', { a: p[0], b: p[1] })
    return pick(
      kp, d, rng, `sides-${f}-${l}-${w}-${h}-${unit}`,
      [text('unitIs', { u: unitL(unit) }), text('k.faceSides', { f: K(`f.${f}`), u: unitL(unit) }), box([{ l, w, h, labels: labels3(l, w, h), face: f }])],
      lab(PAIRS[f]),
      (['front', 'top', 'right'] as const).filter((x) => x !== f).map((x) => lab(PAIRS[x])),
    )
  }
  // 练习五 1（3）：哪两个面的两条边分别是 24 和 12
  const whichPair: Gen = () => {
    const [l, w, h] = dims3(rng, 3, 30)
    const unit = rng.pick(['cm', 'dm'] as const)
    const which = rng.pick(['tb', 'fb', 'lr'] as const)
    const SIDES: Record<'tb' | 'fb' | 'lr', [number, number]> = { tb: [l, w], fb: [l, h], lr: [w, h] }
    const [a, b] = SIDES[which]
    return pick(
      kp, d, rng, `pair-${which}-${l}-${w}-${h}-${unit}`,
      [text('k.whichPair', { a, b, u: unitL(unit) }), box([{ l, w, h, labels: labels3(l, w, h) }])],
      K(`fp.${which}`),
      (['tb', 'fb', 'lr'] as const).filter((x) => x !== which).map((x) => K(`fp.${x}`)),
    )
  }
  // 例 2 / 练习五 2：棱长总和（做框架、贴胶带）
  const frame: Gen = () => {
    if (rng.chance(0.3)) {
      const a = rng.int(3, 30)
      return num(kp, d, rng, `cubeFrame-${a}`, [text('k.cubeFrame', { a })], 12 * a, [6 * a, 4 * a, 8 * a])
    }
    const [l, w, h] = dims3(rng, 5, 60)
    const ctx = rng.pick(['frame', 'tape'] as const)
    const s = l + w + h
    return num(kp, d, rng, `${ctx}-${l}-${w}-${h}`, [text(`k.${ctx}`, { a: l, b: w, c: h })], s * 4, [s * 2, s, s * 3])
  }
  // 练习五 4：魔方
  const magic: Gen = () => {
    const fig = box([{ l: 5.5, w: 5.5, h: 5.5, labels: labels3('5.5', '5.5', '5.5') }])
    if (rng.chance(0.5)) return pick(kp, d, rng, 'magic-shape', [text('k.magicShape'), fig], K('shape.cube'), [K('shape.cuboid')])
    return num(kp, d, rng, 'magic-same', [text('k.magicSame'), fig], 6, [3, 2, 4])
  }
  // 练习五 3：和红色的棱平行 / 相交且垂直的棱有几条
  const parallel: Gen = () => {
    const i = rng.int(0, MARK_SHAPES.length - 1)
    const m = rng.pick(['l', 'w', 'h'] as const)
    const perp = rng.chance(0.5)
    return num(kp, d, rng, `${perp ? 'perp' : 'par'}-${i}-${m}`, [text(perp ? 'k.perp' : 'k.parallel'), box([{ ...MARK_SHAPES[i]!, wire: true, mark: m }])], perp ? 4 : 3, perp ? [2, 3, 8] : [4, 2, 1])
  }
  // 练习五 5：礼堂装彩灯，地面的四边不装（上面 4 条 + 竖着的 4 条）
  const lights: Gen = () => {
    const l = rng.int(30, 100)
    const w = rng.int(20, l - 5)
    const h = rng.int(6, 30)
    const v = (l + w) * 2 + h * 4
    return num(kp, d, rng, `lights-${l}-${w}-${h}`, [text('k.lights', { a: l, b: w, c: h })], v, [(l + w + h) * 4, (l + w) * 2, (l + w) * 2 + h * 2])
  }
  // 练习五 7：围成长方体，某种长方形要几个（有两条棱一样长时，那种面有 4 个）
  const faceCount: Gen = () => {
    let l: number
    let w: number
    let h: number
    let x: number
    let y: number
    let v: number
    if (rng.chance(0.4)) {
      const a = rng.int(5, 12)
      let c = rng.int(2, 12)
      while (c === a) c = rng.int(2, 12)
      ;[l, w, h] = [a, a, c]
      ;[x, y] = a > c ? [a, c] : [c, a]
      v = 4
    } else {
      ;[l, w, h] = dims3(rng, 2, 12)
      ;[x, y] = rng.pick([
        [l, w],
        [l, h],
        [w, h],
      ] as [number, number][])
      if (x < y) [x, y] = [y, x]
      v = 2
    }
    return num(kp, d, rng, `faces-${l}-${w}-${h}-${x}-${y}`, [text('k.faceCount', { a: l, b: w, c: h, x, y })], v, [2, 4, 6, 1])
  }
  // 做一做（2）：用 12 个小正方体搭长方体有几种搭法；第 3 档换别的个数
  const ways: Gen = () => {
    const n = d === 3 ? rng.pick([8, 16, 18, 24, 36]) : 12
    const v = boxWays(n)
    return num(kp, d, rng, `ways-${n}`, [text('k.ways', { n })], v, [v + 1, v - 1, v + 2])
  }
  // 练习五 6：用小正方体拼成的长方体，两条边是几和几的面有几个（不是它的面就是 0 个）
  const unitFaces: Gen = () => {
    const [l, w, h] = rng.pick([
      [4, 3, 2],
      [5, 3, 2],
      [5, 4, 2],
      [4, 3, 1],
      [3, 3, 2],
      [4, 4, 2],
      [2, 2, 3],
      [3, 3, 1],
    ] as [number, number, number][])
    const faces = [
      [l, w],
      [l, w],
      [l, h],
      [l, h],
      [w, h],
      [w, h],
    ].map(([a, b]) => [Math.max(a!, b!), Math.min(a!, b!)].join('×'))
    const square = rng.chance(0.35)
    let x: number
    let y: number
    if (square) x = y = rng.pick([l, w, h])
    else {
      ;[x, y] = rng.pick([
        [l, w],
        [l, h],
        [w, h],
      ] as [number, number][])
      if (x < y) [x, y] = [y, x]
      if (x === y) x += 1
    }
    const v = faces.filter((f) => f === `${x}×${y}`).length
    const rows = Array.from({ length: w }, () => Array.from({ length: l }, () => h))
    return num(
      kp, d, rng, `unit-${l}-${w}-${h}-${x}-${y}`,
      [text(square ? 'k.unitSquares' : 'k.unitFaces', square ? { x } : { x, y }), solids(rows)],
      v,
      [0, 2, 4, 6],
    )
  }
  const cubeFromSum: Gen = () => {
    const a = rng.int(2, 20)
    const s = a * 12
    return num(kp, d, rng, `cubeSum-${s}`, [text('k.cubeFromSum', { s })], a, [s / 4, s / 6, s / 8].filter(Number.isInteger))
  }
  const heightFromSum: Gen = () => {
    const [l, w, h] = dims3(rng, 2, 20)
    const s = (l + w + h) * 4
    return num(kp, d, rng, `hSum-${s}-${l}-${w}`, [text('k.heightFromSum', { s, a: l, b: w })], h, [s / 4 - l, s - l - w, s / 2 - l - w].filter((v) => v > 0))
  }
  if (d === 1)
    return pickBy(rng, [
      [2, count],
      [2, fact(1)],
      [1, groups],
      [0.5, see],
      [1.6, mark],
      [1, dim],
      [1, sameFace],
      [1, faceSides],
      [1.6, frame],
      [0.4, cube8],
      [0.6, magic],
    ])
  if (d === 2)
    return pickBy(rng, [
      [2, parallel],
      [1.5, lights],
      [1, unitFaces],
      [1, faceCount],
      [1, ways],
      [1, fact(2)],
      [1, whichPair],
      [1, cubeFromSum],
      [0.5, frame],
    ])
  return pickBy(rng, [
    [1.5, heightFromSum],
    [1.5, ways],
    [1, lights],
    [1, faceCount],
    [0.5, parallel],
    [0.5, cubeFromSum],
  ])
}

// ═════════════════════════════════════════════════════════════
// 2. 长方体和正方体的展开图
// ═════════════════════════════════════════════════════════════

export interface Cell {
  r: number
  c: number
}
/** 展开图：一行一个字符串，# 是一个面 */
export function netCells(net: string[]): Cell[] {
  const out: Cell[] = []
  net.forEach((row, r) => [...row].forEach((ch, c) => ch === '#' && out.push({ r, c })))
  return out
}

type Dir = 'D' | 'U' | 'N' | 'S' | 'E' | 'W'
type Cube = Record<Dir, Dir>
/** 往某个方向滚一格后，贴着地面的是原来哪个面（东 = 列 +1，南 = 行 +1）——同三年级 views.ts（别 import 三年级的生成器，会把它们注册进来） */
function roll(c: Cube, dir: 'E' | 'W' | 'S' | 'N'): Cube {
  switch (dir) {
    case 'E':
      return { ...c, D: c.E, W: c.D, U: c.W, E: c.U }
    case 'W':
      return { ...c, D: c.W, E: c.D, U: c.E, W: c.U }
    case 'S':
      return { ...c, D: c.S, N: c.D, U: c.N, S: c.U }
    case 'N':
      return { ...c, D: c.N, S: c.D, U: c.S, N: c.U }
  }
}
/**
 * 把展开图「滚」一遍：从第一格出发，滚到相邻的格子，记下每格贴地的是正方体的哪个面。
 * 六格落在六个不同的面上 = 能折成正方体；opposite[i] 是和第 i 格相对的那一格（长方体的展开图格子不一样大，相邻关系一样，照样能用）
 */
export function fold(cells: Cell[]): { ok: boolean; opposite: number[] } {
  const faceOf: (Dir | null)[] = cells.map(() => null)
  const index = (r: number, c: number): number => cells.findIndex((x) => x.r === r && x.c === c)
  const queue: [number, Cube][] = [[0, { D: 'D', U: 'U', N: 'N', S: 'S', E: 'E', W: 'W' }]]
  faceOf[0] = 'D'
  const steps: [number, number, 'E' | 'W' | 'S' | 'N'][] = [
    [0, 1, 'E'],
    [0, -1, 'W'],
    [1, 0, 'S'],
    [-1, 0, 'N'],
  ]
  while (queue.length) {
    const [i, cube] = queue.shift()!
    for (const [dr, dc, dir] of steps) {
      const j = index(cells[i]!.r + dr, cells[i]!.c + dc)
      if (j < 0 || faceOf[j] !== null) continue
      const next = roll(cube, dir)
      faceOf[j] = next.D
      queue.push([j, next])
    }
  }
  const OPP: Record<Dir, Dir> = { D: 'U', U: 'D', N: 'S', S: 'N', E: 'W', W: 'E' }
  const ok = cells.length === 6 && faceOf.every((f) => f !== null) && new Set(faceOf).size === 6
  const opposite = faceOf.map((f) => (f === null ? -1 : faceOf.indexOf(OPP[f])))
  return { ok, opposite }
}

/** 能折成正方体的 11 种（三年级的表少了 2-3-1 里「单格在三连左端下面」那种——课本 p23 做一做 ② 就是它，这里补上） */
export const CUBE_NETS: string[][] = [
  ['#...', '####', '#...'],
  ['#...', '####', '.#..'],
  ['#...', '####', '..#.'],
  ['#...', '####', '...#'],
  ['.#..', '####', '.#..'],
  ['.#..', '####', '..#.'],
  ['##..', '.###', '...#'],
  ['##..', '.###', '..#.'],
  ['##..', '.###', '.#..'],
  ['##..', '.##.', '..##'],
  ['###..', '..###'],
]
/** 折不成的：课本 p23 ③（两条腿折到同一面）、两端同侧各一格、有田字、一行五格、凹字形、两行三格 */
export const NOT_NETS: string[][] = [
  ['###.', '#.##'],
  ['#..#', '####'],
  ['##..', '####'],
  ['#####', '#....'],
  ['#.#', '###', '#..'],
  ['.##.', '####'],
  ['###', '###'],
]
/** 课本 p23 做一做的三个：① ② 能、③ 不能 */
export const BOOK_NETS: string[][] = [CUBE_NETS[6]!, CUBE_NETS[8]!, NOT_NETS[0]!]
/** 第 1 档用的：1-4-1 的六种、课本的两种；折不成的四种 */
const T1_NETS = [...CUBE_NETS.slice(0, 6), CUBE_NETS[6]!, CUBE_NETS[8]!]
const T1_NOT = [NOT_NETS[0]!, NOT_NETS[1]!, NOT_NETS[3]!, NOT_NETS[5]!]

/** 换个摆法：k = 0–7（转 k % 4 次 90°，k ≥ 4 先左右翻），挪到左上角、按行排好 */
export function orient(cells: Cell[], k: number): Cell[] {
  let cs = cells.map((x) => ({ ...x }))
  if (k >= 4) cs = cs.map((x) => ({ r: x.r, c: -x.c }))
  for (let i = 0; i < k % 4; i++) cs = cs.map((x) => ({ r: x.c, c: -x.r }))
  const r0 = Math.min(...cs.map((x) => x.r))
  const c0 = Math.min(...cs.map((x) => x.c))
  return cs.map((x) => ({ r: x.r - r0, c: x.c - c0 })).sort((a, b) => a.r - b.r || a.c - b.c)
}
export const cellsKey = (cells: Cell[]): string => cells.map((x) => `${x.r}${x.c}`).join('.')

/** 方向字（展开图上写的「上」「前」「左」） */
const DIRS = ['up', 'front', 'left'] as const
/** 练习六 2 的展开图：晨钟 冬 / 夏 / 秋 暮鼓 / 春 */
export const BELL_NET: { r: number; c: number; w: string }[] = [
  { r: 0, c: 1, w: 'bell' },
  { r: 0, c: 2, w: 'winter' },
  { r: 1, c: 1, w: 'summer' },
  { r: 2, c: 0, w: 'autumn' },
  { r: 2, c: 1, w: 'drum' },
  { r: 3, c: 0, w: 'spring' },
]

/**
 * 长方体的展开图（格子不一样大）：cells 的相邻关系 + 每列宽、每行高用长方体的长 l、宽 w、高 h 表示——
 * A：课本 p23（竖着 4 个、第 3 个左右接两翼）；B：练习六 1（横着 4 个，第 1 个上面、第 3 个下面各接一个）；
 * C、D：练习十 1 的扁盒子（横着 4 个，第 1 个大面 / 第 1 个上下各接一个）
 */
export const BOX_NETS: { id: string; cells: Cell[]; cols: ('l' | 'w' | 'h')[]; rows: ('l' | 'w' | 'h')[] }[] = [
  { id: 'A', cells: [{ r: 0, c: 1 }, { r: 1, c: 1 }, { r: 2, c: 0 }, { r: 2, c: 1 }, { r: 2, c: 2 }, { r: 3, c: 1 }], cols: ['h', 'l', 'h'], rows: ['w', 'h', 'w', 'h'] },
  { id: 'B', cells: [{ r: 0, c: 0 }, { r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 1, c: 3 }, { r: 2, c: 2 }], cols: ['l', 'w', 'l', 'w'], rows: ['w', 'h', 'w'] },
  { id: 'C', cells: [{ r: 0, c: 1 }, { r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 1, c: 3 }, { r: 2, c: 1 }], cols: ['h', 'l', 'h', 'l'], rows: ['h', 'w', 'h'] },
  { id: 'D', cells: [{ r: 0, c: 0 }, { r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 1, c: 3 }, { r: 2, c: 0 }], cols: ['l', 'h', 'l', 'h'], rows: ['h', 'w', 'h'] },
]

function netGen(d: Difficulty, rng: RNG): Question {
  const kp = KP_NET
  const anyNet = (yes: boolean, all: boolean): Cell[] => orient(netCells(rng.pick(yes ? (all ? CUBE_NETS : T1_NETS) : all ? NOT_NETS : T1_NOT)), rng.int(0, 7))
  // 一个展开图：折起来能不能围成正方体
  const canFold = (all: boolean): Gen => () => {
    const yes = rng.chance(0.5)
    const cells = anyNet(yes, all)
    return pick(kp, d, rng, `fold-${cellsKey(cells)}`, [text('n.canFold'), { kind: 'net', cells }], K(yes ? 'can' : 'cannot'), [K(yes ? 'cannot' : 'can')])
  }
  // 三个编号的展开图，只有一个能（或只有一个不能）——第 1 档有时就是课本的那三个
  const pickOne = (all: boolean): Gen => () => {
    const not = rng.chance(0.5)
    let items: Cell[][]
    if (!all && not && rng.chance(0.35)) items = rng.shuffle(BOOK_NETS).map((n) => orient(netCells(n), 0))
    else {
      items = rng.shuffle([anyNet(!not, all), anyNet(not, all), anyNet(not, all)])
      for (let k = 0; k < 20 && new Set(items.map(cellsKey)).size < 3; k++) items = rng.shuffle([anyNet(!not, all), anyNet(not, all), anyNet(not, all)])
    }
    const ans = items.findIndex((c) => fold(c).ok === !not) + 1
    return num(kp, d, rng, `pick-${not ? 'not' : 'yes'}-${items.map(cellsKey).join('|')}`, [text(not ? 'n.pickNot' : 'n.pick'), { kind: 'nets', items }], ans, [], { input: 'choice', min: 1, max: 3 })
  }
  // 课本「用上、下、前、后、左、右标明 6 个面」改成：一格写「上」，其余格编号，和它相对的是几号面
  const opposite = (all: boolean): Gen => () => {
    const cells = orient(netCells(rng.pick(all ? CUBE_NETS : T1_NETS)), rng.int(0, 7))
    const { opposite: opp } = fold(cells)
    const f = rng.int(0, 5)
    const dir = rng.pick(DIRS)
    const others = cells.map((_, i) => i).filter((i) => i !== f)
    const no = new Map(others.map((i, k) => [i, k + 1]))
    const stemCells = cells.map((c, i) => ({ ...c, label: i === f ? K(`d.${dir}`) : String(no.get(i)) }))
    return num(kp, d, rng, `opp-${cellsKey(cells)}-${f}-${dir}`, [text('n.opp', { f: K(`d.${dir}`) }), { kind: 'net', cells: stemCells }], no.get(opp[f]!)!, [], { input: 'choice', min: 1, max: 5 })
  }
  // 长方体的展开图：6 个面编号，和 a 号面相对的是几号面
  const boxOpp: Gen = () => {
    const net = rng.pick(BOX_NETS)
    const [L, W, H] = rng.pick([
      [4, 3, 2],
      [5, 3, 2],
      [4, 2, 3],
      [5, 2, 3],
      [6, 4, 3],
    ] as [number, number, number][])
    const size = { l: L, w: W, h: H }
    const cw = net.cols.map((x) => size[x])
    const rh = net.rows.map((x) => size[x])
    const k = Math.min(6 / cw.reduce((a, b) => a + b, 0), 4.4 / rh.reduce((a, b) => a + b, 0))
    const order = rng.shuffle(net.cells.map((_, i) => i))
    const no = new Map(order.map((i, n) => [i, n + 1]))
    const { opposite: opp } = fold(net.cells)
    const a = rng.int(0, 5)
    const cells = net.cells.map((c, i) => ({ ...c, label: String(no.get(i)) }))
    const asked = no.get(a)!
    const ans = no.get(opp[a]!)!
    // 选项里不放问的那个面（和自己相对说不通）
    const others = rng.shuffle([1, 2, 3, 4, 5, 6].filter((x) => x !== asked && x !== ans)).slice(0, 3)
    return pick(
      kp, d, rng, `box-${net.id}-${L}${W}${H}-${order.join('')}-${a}`,
      [text('n.boxOpp', { a: asked }), { kind: 'box-net', cells, colW: cw.map((x) => Math.round(x * k * 100) / 100), rowH: rh.map((x) => Math.round(x * k * 100) / 100) }],
      String(ans),
      others.map(String),
    )
  }
  // 练习六 2：晨钟暮鼓——和某个字相对的是哪个面
  const bell: Gen = () => {
    const cells = BELL_NET.map((x) => ({ r: x.r, c: x.c }))
    const { opposite: opp } = fold(cells)
    const i = rng.int(0, 5)
    const correct = BELL_NET[opp[i]!]!.w
    const others = rng.shuffle(BELL_NET.map((x) => x.w).filter((w) => w !== correct && w !== BELL_NET[i]!.w)).slice(0, 2)
    return pick(
      kp, d, rng, `bell-${BELL_NET[i]!.w}`,
      [text('n.word', { w: K(`w.${BELL_NET[i]!.w}`) }), { kind: 'net', cells: BELL_NET.map((x) => ({ r: x.r, c: x.c, label: K(`w.${x.w}`) })) }],
      K(`w.${correct}`),
      others.map((w) => K(`w.${w}`)),
    )
  }
  const netFact: Gen = () => {
    const f = rng.pick([
      ['netArea', true],
      ['netAny', false],
    ] as [string, boolean][])
    return judge(kp, d, rng, `fact-${f[0]}`, [text(`n.s.${f[0]}`)], f[1])
  }
  const count11: Gen = () => num(kp, d, rng, 'count11', [text('n.count')], 11, [6, 8, 12])
  if (d === 1)
    return pickBy(rng, [
      [3, canFold(false)],
      [2, pickOne(false)],
      [2, opposite(false)],
      [1.5, boxOpp],
      [0.6, netFact],
    ])
  if (d === 2)
    return pickBy(rng, [
      [2, canFold(true)],
      [2, bell],
      [1.5, boxOpp],
      [1, pickOne(true)],
      [1, opposite(true)],
    ])
  return pickBy(rng, [
    [0.3, count11],
    [2, canFold(true)],
    [1, bell],
    [1.5, pickOne(true)],
    [1, opposite(true)],
  ])
}

// ═════════════════════════════════════════════════════════════
// 3. 长方体和正方体的表面积
// ═════════════════════════════════════════════════════════════

export const surfaceOf = (l: number, w: number, h: number): number => 2 * (l * w + l * h + w * h)
/** 做一做：简易衣柜做布罩（没有底面）——课本的数 + 两组同样小的数 */
export const WARDROBES: [string, string, string][] = [
  ['0.75', '0.5', '1.6'],
  ['0.8', '0.5', '1.5'],
  ['0.9', '0.5', '1.6'],
]
/** 练习六 9：正方体礼品盒，包装纸是表面积的 1.5 倍 */
export const GIFTS = ['1.2', '2', '1.5', '3']
/** 练习六 11：粉刷教室（四面墙和屋顶，减去门窗）：长度、宽度、高度、门窗面积 */
export const ROOMS: [number, number, number, string][] = [
  [8, 6, 3, '11.4'],
  [9, 6, 3, '12.5'],
  [10, 7, 3, '15'],
]

function surfaceGen(d: Difficulty, rng: RNG): Question {
  const kp = KP_SURF
  // 例 1：长方体的表面积（图上标数）；第 1 档有时是课本的保温箱（分米）
  const cuboid = (hi: number): Gen => () => {
    const foam = rng.chance(0.3)
    const [l, w, h] = dims3(rng, 2, hi)
    const unit: Len = foam ? 'dm' : rng.pick(['cm', 'dm', 'm'] as const)
    const v = surfaceOf(l, w, h)
    return num(
      kp, d, rng, `cuboid-${foam ? 'foam' : 'plain'}-${l}-${w}-${h}-${unit}`,
      [text('unitIs', { u: unitL(unit) }), text(foam ? 's.foam' : 's.cuboid', { u: unitL(SQ[unit]) }), box([{ l, w, h, labels: labels3(l, w, h) }])],
      v,
      [v / 2, l * w * h, (l + w + h) * 4],
    )
  }
  // 想一想：正方体 6 个面都相同
  const cube: Gen = () => {
    const a = rng.int(2, 20)
    const foam = rng.chance(0.3)
    const unit: Len = foam ? 'dm' : rng.pick(['cm', 'dm', 'm'] as const)
    return num(
      kp, d, rng, `cube-${foam ? 'foam' : 'plain'}-${a}-${unit}`,
      [text('unitIs', { u: unitL(unit) }), text(foam ? 's.foamCube' : 's.cube', { u: unitL(SQ[unit]) }), box([{ l: a, w: a, h: a, labels: labels3(a, a, a) }])],
      6 * a * a,
      [4 * a * a, a * a * a, 12 * a],
    )
  }
  // 例 1 的填空 / 练习六 3：涂色的一个面的面积
  const oneFace: Gen = () => {
    const [l, w, h] = dims3(rng, 2, 25)
    const unit: Len = rng.pick(['cm', 'dm', 'm'] as const)
    const f = rng.pick(['front', 'top', 'right'] as const)
    const AREA = { front: l * h, top: l * w, right: w * h }
    const SIDES = { front: [l, h], top: [l, w], right: [w, h] }
    return num(
      kp, d, rng, `face-${f}-${l}-${w}-${h}-${unit}`,
      [text('unitIs', { u: unitL(unit) }), text('s.face', { u: unitL(SQ[unit]) }), box([{ l, w, h, labels: labels3(l, w, h), face: f }])],
      AREA[f],
      [...(['front', 'top', 'right'] as const).filter((x) => x !== f).map((x) => AREA[x]), (SIDES[f][0]! + SIDES[f][1]!) * 2],
    )
  }
  const define: Gen = () => pick(kp, d, rng, 'define', [text('s.define')], K('word.surface'), [K('word.volume'), K('word.base')])
  // 做一做：衣柜做布罩，没有底面（课本的小数，选项：按 6 个面算、只算四周、忘了乘 2）
  const wardrobe: Gen = () => {
    const [a, b, c] = rng.pick(WARDROBES)
    const [x, y, z] = [Number(a), Number(b), Number(c)]
    const v = x * y + 2 * x * z + 2 * y * z
    return decPick(kp, d, rng, `wardrobe-${a}-${b}-${c}`, [text('s.wardrobe', { a, b, c })], fmt(v), [fmt(v + x * y), fmt(v - x * y), fmt(x * y + x * z + y * z)])
  }
  // 少几个面的整数题：没有盖的纸盒、没有盖的正方体鱼缸（练习六 8）、四周贴商标纸（练习六 5）
  const fewer: Gen = () => {
    const kind = rng.pick(['openBox', 'fishTank', 'label'] as const)
    if (kind === 'fishTank') {
      const a = rng.int(2, 9)
      return num(kp, d, rng, `fishTank-${a}`, [text('s.fishTank', { a })], 5 * a * a, [6 * a * a, 4 * a * a, a * a * a])
    }
    const [l, w, h] = dims3(rng, 3, 30)
    const all = surfaceOf(l, w, h)
    if (kind === 'openBox') return num(kp, d, rng, `openBox-${l}-${w}-${h}`, [text('s.openBox', { a: l, b: w, c: h })], all - l * w, [all, l * w + l * h + w * h, all - 2 * l * w])
    return num(kp, d, rng, `label-${l}-${w}-${h}`, [text('s.label', { a: l, b: w, c: h })], all - 2 * l * w, [all, (l + w) * h, all - l * w])
  }
  // 练习六 4：收纳盒（分米）
  const box94: Gen = () => {
    const [l, w, h] = dims3(rng, 2, 9)
    const v = surfaceOf(l, w, h)
    return num(kp, d, rng, `box94-${l}-${w}-${h}`, [text('s.box94', { a: l, b: w, c: h })], v, [v / 2, l * w * h, (l + w + h) * 4])
  }
  // 练习六 9：包装纸是表面积的 1.5 倍
  const gift: Gen = () => {
    const a = rng.pick(GIFTS)
    const s = 6 * Number(a) * Number(a)
    return decPick(kp, d, rng, `gift-${a}`, [text('s.gift', { a })], fmt(s * 1.5), [fmt(s), fmt(Number(a) * Number(a) * 1.5), fmt(s * 1.5 * 10)])
  }
  // 练习六 6：捐款箱贴红纸（6 个面）；棱上贴胶带够不够（厘米和米）
  const donate: Gen = () => {
    const a = rng.int(20, 60)
    if (rng.chance(0.5)) return num(kp, d, rng, `donate-${a}`, [text('s.donate', { a })], 6 * a * a, [5 * a * a, 4 * a * a, 12 * a])
    const m = rng.pick(['3', '4.5', '5', '6', '8'])
    if (12 * a === Number(m) * 100) return num(kp, d, rng, `donate-${a}`, [text('s.donate', { a })], 6 * a * a, [5 * a * a, 4 * a * a, 12 * a])
    const enough = 12 * a <= Number(m) * 100
    return pick(kp, d, rng, `tape-${a}-${m}`, [text('s.tapeEnough', { a, m })], K(enough ? 'enough' : 'notEnough'), [K(enough ? 'notEnough' : 'enough')])
  }
  // 练习六 11：粉刷教室——四面墙和屋顶，减去门窗
  const room: Gen = () => {
    const [a, b, c, door] = rng.pick(ROOMS)
    const wall = a * b + 2 * (a + b) * c
    const v = wall - Number(door)
    return decPick(kp, d, rng, `room-${a}-${b}-${c}-${door}`, [text('s.room', { a, b, c, d: door })], fmt(v), [fmt(v + a * b), fmt(wall), fmt(v - a * b)])
  }
  // 练习六 13：长方体切成两个正方体，表面积增加了两个正方形
  const cut: Gen = () => {
    const a = rng.int(2, 15)
    return num(kp, d, rng, `cut-${a}`, [text('s.cut', { a, b: 2 * a })], 2 * a * a, [a * a, 4 * a * a, 6 * a * a])
  }
  // 练习六 10：游泳池（长度是宽度的 2 倍），四周和底面
  const pool: Gen = () => {
    const a = rng.pick([40, 50, 60])
    const c = rng.pick(['2', '2.5', '3'])
    const b = a / 2
    const v = a * b + 2 * (a + b) * Number(c)
    return num(kp, d, rng, `pool-${a}-${c}`, [text('s.pool', { a, c })], v, [v + a * b, v - a * b, a * b + (a + b) * Number(c)].filter(Number.isInteger))
  }
  // 练习九 10：几个正方体拼成长方体，表面积 = (4n + 2) 个正方形
  const glue: Gen = () => {
    const n = rng.pick([2, 3, 4])
    const a = rng.int(1, 10)
    const sq = a * a
    return num(kp, d, rng, `glue-${n}-${a}`, [text('s.glue', { n, a })], (4 * n + 2) * sq, [6 * n * sq, (4 * n) * sq, (4 * n + 4) * sq])
  }
  // 练习十 2：长、宽、高都乘 2，表面积是原来的 4 倍
  const double: Gen = () => pick(kp, d, rng, 'double', [text('s.double')], K('times', { n: 4 }), [K('times', { n: 2 }), K('times', { n: 6 }), K('times', { n: 8 })])
  if (d === 1)
    return pickBy(rng, [
      [2.5, cuboid(30)],
      [1.5, cube],
      [1.5, oneFace],
      [0.4, define],
      [0.8, wardrobe],
      [2, fewer],
    ])
  if (d === 2)
    return pickBy(rng, [
      [1, box94],
      [1, gift],
      [1.5, donate],
      [1, room],
      [1, cut],
      [1, cuboid(60)],
    ])
  return pickBy(rng, [
    [1.5, pool],
    [1.5, glue],
    [1, double],
    [1, room],
  ])
}

// ═════════════════════════════════════════════════════════════
// 4. 体积和体积单位
// ═════════════════════════════════════════════════════════════

/** 例：哪个体积最大 / 最小（三样东西从大到小） */
export const BIG_SETS: [string, string, string][] = [
  ['washer', 'cooker', 'phone'],
  ['fridge', 'schoolbag', 'eraser'],
  ['container', 'chalkBox', 'fingertip'],
]
/** 练习七 3、p28 的参照物：东西、大约多少、合适的单位 */
export const VOL_FIT: [string, number, U][] = [
  ['container', 40, 'm3'],
  ['cooker', 25, 'dm3'],
  ['eraser', 10, 'cm3'],
  ['fingertip', 1, 'cm3'],
  ['chalkBox', 1, 'dm3'],
  ['classroom', 200, 'm3'],
  ['schoolbag', 20, 'dm3'],
  ['apple', 200, 'cm3'],
]
/** 做一做 2：课本的四个（练习七 5 的台阶在第 2 档） */
export const BOOK_SOLIDS: number[][][] = [[[3, 3, 3]], [[2, 2, 2, 2]], [[2, 1], [1, 0]]]

/** 小正方体搭的物体（1 排或 2 排，每排 2–4 摞）：后排每一摞不比前排矮（顶面都看得见），前排可以空一格 */
export function randomSolid(rng: RNG, maxH = 3): number[][] {
  const cols = rng.int(2, 4)
  const front = Array.from({ length: cols }, () => rng.int(1, maxH))
  if (rng.chance(0.45)) return [front]
  if (cols > 2 && rng.chance(0.4)) front[rng.int(0, cols - 1)] = 0
  const back = front.map((h) => Math.min(maxH, Math.max(1, h) + rng.int(0, 1)))
  return [back, front]
}
export const cubeCount = (rows: number[][]): number => rows.flat().reduce((a, b) => a + b, 0)

function volumeUnitGen(d: Difficulty, rng: RNG): Question {
  const kp = KP_VUNIT
  const define: Gen = () => pick(kp, d, rng, 'define', [text('vu.define')], K('word.volume'), [K('word.area'), K('word.surface')])
  const biggest: Gen = () => {
    const set = rng.pick(BIG_SETS)
    const max = rng.chance(0.5)
    const order = rng.shuffle(set)
    const [a, b, c] = order.map((x) => K(`t.${x}`))
    return pick(kp, d, rng, `${max ? 'max' : 'min'}-${set[0]}`, [text(max ? 'vu.biggest' : 'vu.smallest', { a: a!, b: b!, c: c! })], K(`t.${max ? set[0] : set[2]}`), set.filter((_, i) => i !== (max ? 0 : 2)).map((x) => K(`t.${x}`)))
  }
  // p28：棱长 1 厘米的正方体，体积是 1 立方厘米（干扰：1 平方厘米、1 厘米）
  const edge1: Gen = () => {
    const unit = rng.pick(['cm', 'dm', 'm'] as const)
    return pick(kp, d, rng, `edge1-${unit}`, [text('vu.edge1', { u: unitL(unit) })], nU(1, CU[unit]), [nU(1, SQ[unit]), nU(1, unit)])
  }
  // 做一做 1：厘米、平方厘米、立方厘米分别是什么单位
  const kind: Gen = () => {
    const len = rng.pick(['cm', 'dm', 'm'] as const)
    const k = rng.pick(['len', 'area', 'vol'] as const)
    const x: U = k === 'len' ? len : k === 'area' ? SQ[len] : CU[len]
    return pick(kp, d, rng, `kind-${x}`, [text('vu.kind', { u: unitL(x) })], K(`kind.${k}`), (['len', 'area', 'vol'] as const).filter((y) => y !== k).map((y) => K(`kind.${y}`)))
  }
  // 做一做 2：数小正方体求体积（课本的四个 + 随机的）
  const count = (maxH: number): Gen => () => {
    const rows = d === 1 && rng.chance(0.25) ? rng.pick(BOOK_SOLIDS) : randomSolid(rng, maxH)
    const n = cubeCount(rows)
    return num(kp, d, rng, `count-${JSON.stringify(rows)}`, [text('vu.count'), solids(rows)], n, [n - 1, n + 1, rows.length === 2 ? cubeCount([rows[1]!]) : n + 2])
  }
  const fit: Gen = () => {
    const [thing, n, unit] = rng.pick(VOL_FIT)
    return pick(kp, d, rng, `fit-${thing}`, [text('vu.fit', { thing: K(`t.${thing}`), n })], unitL(unit), (['cm3', 'dm3', 'm3'] as const).filter((x) => x !== unit).map(unitL))
  }
  // 练习七 2：几个物体比体积（体积都不一样）
  const compare: Gen = () => {
    let items = [randomSolid(rng), randomSolid(rng), randomSolid(rng)]
    while (new Set(items.map(cubeCount)).size < 3) items = [randomSolid(rng), randomSolid(rng), randomSolid(rng)]
    const max = rng.chance(0.5)
    const counts = items.map(cubeCount)
    const target = max ? Math.max(...counts) : Math.min(...counts)
    return num(kp, d, rng, `cmp-${max ? 'max' : 'min'}-${JSON.stringify(items)}`, [text(max ? 'vu.pickMax' : 'vu.pickMin'), { kind: 'cube-solids', items: items.map((rows) => ({ rows })), numbered: true }], counts.indexOf(target) + 1, [], { input: 'choice', min: 1, max: 3 })
  }
  // 练习七 5：台阶变成长方体，体积不变
  const stairs: Gen = () => {
    const k = rng.pick([2, 3, 4])
    const rows = [[k + 1, k, k - 1]]
    return num(kp, d, rng, `stairs-${k}`, [text('vu.stairs'), solids(rows)], 3 * k, [k * k, 3 * k + 1, (k + 1) * 3])
  }
  const same: Gen = () => judge(kp, d, rng, 'same', [text('vu.same')], true)
  if (d === 1)
    return pickBy(rng, [
      [0.5, define],
      [1.2, biggest],
      [1, edge1],
      [1.5, kind],
      [3, count(3)],
      [2, fit],
    ])
  if (d === 2)
    return pickBy(rng, [
      [2, compare],
      [1.5, stairs],
      [0.6, same],
      [1.5, count(3)],
    ])
  return pickBy(rng, [
    [1.5, count(4)],
    [1.5, compare],
    [1, stairs],
  ])
}

// ═════════════════════════════════════════════════════════════
// 5. 长方体和正方体的体积计算
// ═════════════════════════════════════════════════════════════

/** 做一做 2：木料的长度、横截面的面积 */
export const TIMBERS: [number, string][] = [
  [5, '0.06'],
  [4, '0.05'],
  [6, '0.04'],
  [3, '0.08'],
]
/** 练习七 8：挖土坑（深度是厘米）：长度、宽度、深度 */
export const PITS: [number, number, number][] = [
  [50, 30, 50],
  [40, 25, 20],
  [30, 20, 50],
  [60, 40, 30],
]
/** 练习八 4：用棱长 3 厘米的积木搭墙：长度（米）、高度（米）、厚度（厘米） */
export const WALLS: [number, string, number][] = [
  [6, '2.7', 6],
  [3, '1.5', 6],
  [6, '1.8', 3],
  [9, '2.4', 6],
]

function volumeGen(d: Difficulty, rng: RNG): Question {
  const kp = KP_VOL
  // 例 1：长方体的体积（图上标数）；课本的情境：保温箱、豆腐、长城砖（后两种只写文字）
  const cuboid = (hi: number): Gen => () => {
    const ctx = rng.pick(['plain', 'plain', 'foam', 'tofu', 'brick'] as const)
    const [l, w, h] = dims3(rng, 2, hi)
    const v = l * w * h
    const smart = [surfaceOf(l, w, h), l * w, (l + w + h) * 4]
    if (ctx === 'tofu' || ctx === 'brick') return num(kp, d, rng, `${ctx}-${l}-${w}-${h}`, [text(`v.${ctx}`, { a: l, b: w, c: h })], v, smart)
    const unit: Len = ctx === 'foam' ? 'dm' : rng.pick(['cm', 'dm', 'm'] as const)
    return num(
      kp, d, rng, `cuboid-${ctx}-${l}-${w}-${h}-${unit}`,
      [text('unitIs', { u: unitL(unit) }), text(ctx === 'foam' ? 'v.foam' : 'v.cuboid', { u: unitL(CU[unit]) }), box([{ l, w, h, labels: labels3(l, w, h) }])],
      v,
      smart,
    )
  }
  const cube = (hi: number): Gen => () => {
    const a = d === 2 && rng.chance(0.3) ? rng.pick([10, 20, 30]) : rng.int(2, hi)
    const unit: Len = rng.pick(['cm', 'dm', 'm'] as const)
    return num(
      kp, d, rng, `cube-${a}-${unit}`,
      [text('unitIs', { u: unitL(unit) }), text('v.cube', { u: unitL(CU[unit]) }), box([{ l: a, w: a, h: a, labels: labels3(a, a, a) }])],
      a * a * a,
      [6 * a * a, 3 * a, a * a],
    )
  }
  // p29：用 1 立方厘米的小正方体摆成的长方体
  const grid: Gen = () => {
    const l = rng.int(2, 5)
    const w = rng.int(1, 3)
    const h = rng.int(1, 3)
    const rows = Array.from({ length: w }, () => Array.from({ length: l }, () => h))
    return num(kp, d, rng, `grid-${l}-${w}-${h}`, [text('v.grid'), solids(rows)], l * w * h, [l * h + l * w, l * h, l + w + h])
  }
  // 体积公式：长 × 宽 × 高、棱长 × 棱长 × 棱长、底面积 × 高、a³
  const formula: Gen = () => {
    const which = rng.pick(['cuboid', 'cube', 'base', 'a3'] as const)
    if (which === 'cuboid') return pick(kp, d, rng, 'how-cuboid', [text('v.howCuboid')], K('fm.lwh'), [K('fm.edgeSum'), K('fm.surface')])
    if (which === 'cube') return pick(kp, d, rng, 'how-cube', [text('v.howCube')], K('fm.aaa'), [K('fm.a12'), K('fm.aa6')])
    if (which === 'base') return pick(kp, d, rng, 'how-base', [text('v.howBase')], K('fm.sh'), [K('fm.s4'), K('fm.s6')])
    return pick(kp, d, rng, 'how-a3', [text('v.a3')], K('fm.a3mul'), [K('fm.a3x'), K('fm.a3add')])
  }
  // 底面积 × 高：整数的；做一做 2 的木料（小数，选项：多乘 10、少乘 10、长度加横截面）
  const base: Gen = () => {
    if (rng.chance(0.35)) {
      const [a, s] = rng.pick(TIMBERS)
      const v = a * Number(s)
      return decPick(kp, d, rng, `timber-${a}-${s}`, [text('v.timber', { a, s })], fmt(v), [fmt(v * 10), fmt(v / 10), fmt(a + Number(s))])
    }
    const s = rng.int(10, 60)
    const h = rng.int(3, 20)
    return num(kp, d, rng, `base-${s}-${h}`, [text('v.base', { s, h })], s * h, [s + h, s * h * 2, s * 4])
  }
  // 练习七 6：4³ 和 4 × 3、8² 和 8 × 2
  const pow: Gen = () => {
    if (rng.chance(0.6)) {
      const a = rng.int(2, 9)
      return num(kp, d, rng, `cube3-${a}`, [{ kind: 'expr', expr: `${a}³ = ?` }], a * a * a, [a * 3, a * a, a * a * 3])
    }
    const a = rng.int(2, 12)
    return num(kp, d, rng, `sq2-${a}`, [{ kind: 'expr', expr: `${a}² = ?` }], a * a, [a * 2, a + 2, a * a * 2])
  }
  // 练习七 10：已知体积、底面积求高；已知体积、高求底面积；5 分米和 40 平方厘米先统一单位
  const inverse: Gen = () => {
    const k = rng.pick(['h', 's', 'mix'] as const)
    if (k === 'mix') {
      const s = rng.int(10, 60)
      const h = rng.int(2, 9)
      return num(kp, d, rng, `mix-${s}-${h}`, [text('v.mix', { s, h })], s * h * 10, [s * h, s * h * 100])
    }
    const s = rng.int(6, 60)
    const h = rng.int(3, 20)
    if (k === 'h') return num(kp, d, rng, `findH-${s}-${h}`, [text('v.findH', { v: s * h, s })], h, [s, s * h - s, h + 1])
    return num(kp, d, rng, `findS-${s}-${h}`, [text('v.findS', { v: s * h, h })], s, [h, s * h - h, s + 1])
  }
  const pit: Gen = () => {
    const [a, b, c] = rng.pick(PITS)
    const v = (a * b * c) / 100
    return num(kp, d, rng, `pit-${a}-${b}-${c}`, [text('v.pit', { a, b, c })], v, [a * b * c, v * 10, a * b])
  }
  // 练习八 9：棱长总和相等，正方体的体积
  const sumEqual: Gen = () => {
    const e = rng.int(3, 9)
    const a = e + rng.int(1, 3)
    const b = e - rng.int(1, Math.min(2, e - 2))
    const c = 3 * e - a - b
    if (c === a || c === b || c < 2) return sumEqual()
    return num(kp, d, rng, `sumEq-${a}-${b}-${c}`, [text('v.sumEqual', { a, b, c })], e * e * e, [a * b * c, 6 * e * e, 12 * e])
  }
  const double: Gen = () => pick(kp, d, rng, 'double', [text('v.double')], K('times', { n: 8 }), [K('times', { n: 2 }), K('times', { n: 4 }), K('times', { n: 6 })])
  const wall: Gen = () => {
    const [a, b, c] = rng.pick(WALLS)
    const v = ((a * 100) / 3) * Math.round((Number(b) * 100) / 3) * (c / 3)
    return num(kp, d, rng, `wall-${a}-${b}-${c}`, [text('v.wall', { a, b, c })], v, [v * 3, v / 3, v * 9].filter(Number.isInteger))
  }
  // 练习八 10*：茶盒装纸箱，体积相除是 6.75，实际最多 6 盒
  const tea: Gen = () => num(kp, d, rng, 'tea', [text('v.tea')], 6, [7, 5, 8])
  if (d === 1)
    return pickBy(rng, [
      [2.5, cuboid(20)],
      [1.5, cube(12)],
      [1.5, grid],
      [1.2, formula],
      [1.5, base],
    ])
  if (d === 2)
    return pickBy(rng, [
      [1.5, pow],
      [2, inverse],
      [1, pit],
      [1, cuboid(40)],
      [0.8, cube(15)],
    ])
  return pickBy(rng, [
    [1.2, sumEqual],
    [0.8, double],
    [1, wall],
    [0.4, tea],
    [1, pit],
    [1, inverse],
  ])
}

// ═════════════════════════════════════════════════════════════
// 6. 体积单位间的进率
// ═════════════════════════════════════════════════════════════

/** 相邻单位之间小数点移几位：体积 3、面积 2、长度 1；升 = 立方分米、毫升 = 立方厘米 */
const LEVEL: Record<U, [string, number]> = {
  m3: ['v', 2], dm3: ['v', 1], cm3: ['v', 0], l: ['v', 1], ml: ['v', 0],
  m2: ['a', 2], dm2: ['a', 1], cm2: ['a', 0],
  m: ['s', 2], dm: ['s', 1], cm: ['s', 0], mm: ['s', -1],
}
const PER: Record<string, number> = { v: 3, a: 2, s: 1 }
/** a 个 from 换成 to：小数点移几位（高级单位换成低级单位向右移） */
export function convShift(from: U, to: U): number {
  const [kind, lf] = LEVEL[from]
  const [, lt] = LEVEL[to]
  return (lf - lt) * PER[kind]!
}
/** 换算：返回答案和照常见错法算出来的几个干扰数（进率用错、小数点移反） */
export function convert(a: string, from: U, to: U): { answer: string; wrongs: string[] } {
  const k = convShift(from, to)
  const step = PER[LEVEL[from][0]]!
  const wrongs = [shift(a, k > 0 ? k - 1 : k + 1), shift(a, k > 0 ? k + 1 : k - 1), shift(a, -k), shift(a, k + (k > 0 ? -step : step) * 2)]
  return { answer: shift(a, k), wrongs: wrongs.filter((w) => w !== shift(a, k)) }
}
/** 例 3、做一做 1（第 1 档）；练习八 1（面积、体积混着）、跨两级（第 2 档）；第 3 档 */
export const RATE_CONV: [string, U, U, 1 | 2 | 3][] = [
  ['3.8', 'm3', 'dm3', 1],
  ['2400', 'cm3', 'dm3', 1],
  ['3.5', 'dm3', 'cm3', 1],
  ['700', 'dm3', 'm3', 1],
  ['60000', 'cm3', 'dm3', 1],
  ['5', 'm3', 'dm3', 1],
  ['4.2', 'dm3', 'cm3', 1],
  ['8000', 'dm3', 'm3', 1],
  ['1500', 'cm3', 'dm3', 1],
  ['0.6', 'm3', 'dm3', 1],
  ['300', 'dm3', 'm3', 1],
  ['9', 'dm3', 'cm3', 1],
  ['0.25', 'm3', 'cm3', 1],
  ['1.02', 'm3', 'dm3', 2],
  ['960', 'dm3', 'm3', 2],
  ['23', 'dm3', 'cm3', 2],
  ['36000', 'cm3', 'm3', 2],
  ['6270', 'cm2', 'dm2', 2],
  ['8.63', 'm2', 'dm2', 2],
  ['80', 'dm3', 'm3', 2],
  ['0.5', 'dm3', 'cm3', 2],
  ['5.08', 'm3', 'cm3', 3],
  ['50800', 'cm3', 'dm3', 3],
  ['0.06', 'm3', 'dm3', 3],
  ['7', 'cm3', 'dm3', 3],
]
/** 练习八 7：一组数里哪个和其他三个不相等——体积、面积、长度各几个基准数（单位是最大的那个） */
export const ODD_BASES: ['v' | 'a' | 's', string][] = [
  ['v', '5.08'],
  ['v', '2.6'],
  ['v', '0.45'],
  ['a', '60.39'],
  ['a', '7.5'],
  ['s', '15'],
  ['s', '2.4'],
]
/** 练习八 2：包装盒从里面测量的长度、宽度、高度（厘米），体积写成立方分米 */
export const INSIDE: [number, number, number][] = [
  [28, 20, 21],
  [30, 20, 15],
  [25, 20, 12],
  [40, 25, 18],
  [24, 15, 20],
]
/** 练习八 6：沙子（立方米）放进沙坑（长度米、宽度分米），多少米厚 */
export const SANDS: [string, number, number][] = [
  ['7.6', 5, 38],
  ['6', 5, 30],
  ['9', 6, 50],
  ['4.8', 4, 30],
  ['7.2', 6, 40],
]
/** 做一做 2：砌砖墙（长度米、厚度厘米、高度米、每立方米用砖几块） */
export const BRICK_WALLS: [number, number, string, number][] = [
  [15, 24, '3', 525],
  [10, 24, '2', 500],
  [8, 24, '2.5', 520],
  [12, 24, '3', 500],
  [20, 12, '2', 525],
]
/** 练习八 5：无盖玻璃水族箱（长度米、宽度厘米、高度米） */
export const TANKS: [number, number, string][] = [
  [6, 60, '1.5'],
  [4, 50, '1'],
  [5, 80, '1.2'],
]

function rateGen(d: Difficulty, rng: RNG): Question {
  const kp = KP_RATE
  const base: Gen = () => {
    const [from, to] = rng.pick([
      ['dm3', 'cm3'],
      ['m3', 'dm3'],
    ] as [U, U][])
    return num(kp, d, rng, `base-${from}`, [text('r.conv', { a: 1, ua: unitL(from), ub: unitL(to) })], 1000, [100, 10, 10000])
  }
  const rateOf: Gen = () => {
    const k = rng.pick(['len', 'area', 'vol'] as const)
    const v = { len: '10', area: '100', vol: '1000' }[k]
    return pick(kp, d, rng, `rate-${k}`, [text('r.rate', { kind: K(`kind.${k}`) })], v, ['10', '100', '1000'].filter((x) => x !== v))
  }
  const conv = (tier: 1 | 2 | 3): Gen => () => {
    const [a, from, to] = rng.pick(RATE_CONV.filter((x) => x[3] === tier))
    const { answer, wrongs } = convert(a, from, to)
    return convAnswer(kp, d, rng, `conv-${a}-${from}-${to}`, [text('r.conv', { a, ua: unitL(from), ub: unitL(to) })], answer, wrongs)
  }
  // 例 4：牛奶箱（厘米）的体积是多少立方分米（第 2 档问立方米，小数）
  const milk = (toM3: boolean): Gen => () => {
    const [l, w, h] = dims3(rng, 1, 6).map((x) => x * 10) as [number, number, number]
    const cm3 = l * w * h
    const fig = box([{ l, w, h, labels: labels3(l, w, h) }])
    if (toM3) {
      const v = shift(String(cm3), -6)
      return decPick(kp, d, rng, `milk-m3-${l}-${w}-${h}`, [text('unitIs', { u: unitL('cm') }), text('r.box', { u: unitL('m3') }), fig], v, [shift(String(cm3), -5), shift(String(cm3), -4), shift(String(cm3), -3)])
    }
    return num(kp, d, rng, `milk-${l}-${w}-${h}`, [text('unitIs', { u: unitL('cm') }), text('r.box', { u: unitL('dm3') }), fig], cm3 / 1000, [cm3 / 100, cm3, cm3 / 10000].filter(Number.isInteger))
  }
  // 练习八 7：哪个数据和其他三个不相等
  const odd: Gen = () => {
    const [kind, x] = rng.pick(ODD_BASES)
    const units: U[] = kind === 'v' ? ['m3', 'dm3', 'cm3'] : kind === 'a' ? ['m2', 'dm2', 'cm2'] : ['m', 'dm', 'cm']
    const equal = units.map((u) => nU(convert(x, units[0]!, u).answer, u))
    // 不相等的那个：按别的进率换（体积按面积的 100、面积按 10……），写成中间那个单位
    const wrongK = convShift(units[0]!, units[1]!) + (rng.chance(0.5) ? -1 : 1)
    const oddLabel = nU(shift(x, wrongK), units[1]!)
    return pick(kp, d, rng, `odd-${kind}-${x}-${wrongK}`, [text('r.odd')], oddLabel, equal)
  }
  const inside: Gen = () => {
    const [a, b, h] = rng.pick(INSIDE)
    const v = shift(String(a * b * h), -3)
    return num(kp, d, rng, `inside-${a}-${b}-${h}`, [text('r.inside', { a, b, v })], h, [h * 10, a - b, h + 10].filter((x) => x > 0))
  }
  const sand: Gen = () => {
    const [v, a, b] = rng.pick(SANDS)
    const ans = fmt(Number(v) / (a * (b / 10)))
    return decPick(kp, d, rng, `sand-${v}-${a}-${b}`, [text('r.sand', { v, a, b })], ans, [shift(ans, -1), shift(ans, 1), shift(ans, 2)])
  }
  const bricks: Gen = () => {
    const [a, t, h, k] = rng.pick(BRICK_WALLS)
    const v = Math.round(a * (t / 100) * Number(h) * k)
    return num(kp, d, rng, `bricks-${a}-${t}-${h}-${k}`, [text('r.wall', { a, t, h, k })], v, [v * 100, Math.round(v / 10), a * t * Number(h) * k].filter(Number.isInteger))
  }
  const tank: Gen = () => {
    const [a, b, c] = rng.pick(TANKS)
    const w = b / 100
    const h = Number(c)
    const glass = a * w + 2 * a * h + 2 * w * h
    return decPick(kp, d, rng, `tank-${a}-${b}-${c}`, [text('r.tank', { a, b, c })], fmt(glass), [fmt(glass + a * w), fmt(a * w * h), fmt(a * b + 2 * a * h + 2 * b * h)], 'm2')
  }
  if (d === 1)
    return pickBy(rng, [
      [1.5, base],
      [1, rateOf],
      [3, conv(1)],
      [1.5, milk(false)],
      [0.6, milk(true)],
    ])
  if (d === 2)
    return pickBy(rng, [
      [2, conv(2)],
      [1.5, odd],
      [1, inside],
      [1, sand],
      [1, bricks],
      [0.8, milk(true)],
    ])
  return pickBy(rng, [
    [1, tank],
    [1, odd],
    [1, conv(3)],
    [1, sand],
  ])
}

// ═════════════════════════════════════════════════════════════
// 7. 容积和容积单位
// ═════════════════════════════════════════════════════════════

/** 练习九 1、p38 的东西：大约多少、合适的单位 */
export const CAP_FIT: [string, number, U][] = [
  ['ink', 50, 'ml'],
  ['handwash', 500, 'ml'],
  ['fridgeCap', 229, 'l'],
  ['oil', 5, 'l'],
  ['milk', 250, 'ml'],
  ['cupWater', 200, 'ml'],
  ['pond', 50, 'm3'],
  ['bathtub', 300, 'l'],
]
/** p38 的「1 升液体的体积就是 1 立方分米」改成的判断题 */
export const CAP_FACTS: [string, boolean][] = [
  ['ldm', true],
  ['mlcm', true],
  ['lcm', false],
  ['mldm', false],
]
export const CAP_CONV: [string, U, U, 1 | 2][] = [
  ['1', 'l', 'ml', 1],
  ['4', 'l', 'ml', 1],
  ['2.4', 'l', 'ml', 1],
  ['3000', 'ml', 'l', 1],
  ['82', 'cm3', 'ml', 1],
  ['35', 'dm3', 'l', 1],
  ['1.5', 'l', 'ml', 1],
  ['6000', 'ml', 'l', 1],
  ['4800', 'ml', 'l', 2],
  ['500', 'ml', 'l', 2],
  ['35', 'dm3', 'ml', 2],
  ['8.04', 'dm3', 'ml', 2],
  ['785', 'ml', 'cm3', 2],
  ['785', 'ml', 'dm3', 2],
  ['2500', 'ml', 'l', 2],
  ['8.04', 'dm3', 'l', 2],
]
/** 练习九 3：一桶多少升、一瓶多少毫升，相当于几瓶 */
export const BOTTLES: [number, number][] = [
  [18, 1500],
  [18, 600],
  [5, 500],
  [6, 1500],
  [12, 400],
  [15, 250],
]
/** 练习九 5：蓄水池（长度、宽度、深度，米） */
export const POOLS: [number, number, string][] = [
  [22, 10, '1.8'],
  [20, 15, '2'],
  [25, 12, '1.5'],
  [30, 20, '1.2'],
]
/** 练习九 6：车厢（从里面测量，米） */
export const TRUCKS: [string, string, string][] = [
  ['3', '2.5', '2'],
  ['4', '2', '2.5'],
  ['3.5', '2', '2'],
  ['5', '2.4', '2'],
]
/** 练习九 4：微波炉炉腔（毫米） */
export const OVENS: [number, number, number][] = [
  [400, 225, 300],
  [500, 300, 200],
  [400, 250, 300],
  [300, 200, 250],
]

function capacityGen(d: Difficulty, rng: RNG): Question {
  const kp = KP_CAP
  const define: Gen = () => {
    const thing = rng.pick(['oilDrum', 'granary', 'box', 'cabin'])
    return pick(kp, d, rng, `define-${thing}`, [text('c.define', { thing: K(`t.${thing}`) })], K('word.capacity'), [K('word.surface'), K('word.base')])
  }
  const fact: Gen = () => {
    const [id, truth] = rng.pick(CAP_FACTS)
    return judge(kp, d, rng, `fact-${id}`, [text(`c.s.${id}`)], truth)
  }
  const conv = (tier: 1 | 2): Gen => () => {
    const [a, from, to] = rng.pick(CAP_CONV.filter((x) => x[3] === tier))
    const { answer, wrongs } = convert(a, from, to)
    const ws = convShift(from, to) === 0 ? [shift(a, 3), shift(a, -3), shift(a, 1)] : wrongs
    return convAnswer(kp, d, rng, `conv-${a}-${from}-${to}`, [text('r.conv', { a, ua: unitL(from), ub: unitL(to) })], answer, ws)
  }
  const fit: Gen = () => {
    const [thing, n, unit] = rng.pick(CAP_FIT)
    return pick(kp, d, rng, `fit-${thing}`, [text('c.fit', { thing: K(`t.${thing}`), n })], unitL(unit), (['ml', 'l', 'm3'] as const).filter((x) => x !== unit).map(unitL))
  }
  // 例 5：油箱从里面测量（分米）能装多少升
  const tank: Gen = () => {
    const a = rng.int(3, 9)
    const b = rng.int(2, 6)
    const c = rng.int(2, 5)
    const v = a * b * c
    return num(kp, d, rng, `tank-${a}-${b}-${c}`, [text('c.tank', { a, b, c })], v, [v * 1000, surfaceOf(a, b, c), (a + b + c) * 4])
  }
  const cup: Gen = () => pick(kp, d, rng, 'cup', [text('c.cup')], nU(200, 'ml'), [nU(200, 'l'), nU(2, 'ml')])
  const bottles: Gen = () => {
    const [a, b] = rng.pick(BOTTLES)
    const v = (a * 1000) / b
    return num(kp, d, rng, `bottles-${a}-${b}`, [text('c.bottles', { a, b })], v, [v * 10, Math.round(b / a), v + 2].filter(Number.isInteger))
  }
  const pool: Gen = () => {
    const [a, b, c] = rng.pick(POOLS)
    const v = Math.round(a * b * Number(c))
    return num(kp, d, rng, `pool-${a}-${b}-${c}`, [text('c.pool', { a, b, c })], v, [a * b, v * 10, Math.round(surfaceOf(a, b, Number(c)))].filter(Number.isInteger))
  }
  const truck: Gen = () => {
    const [a, b, c] = rng.pick(TRUCKS)
    const v = fmt(Number(a) * Number(b) * Number(c))
    return convAnswer(kp, d, rng, `truck-${a}-${b}-${c}`, [text('c.truck', { a, b, c })], v, [fmt(Number(a) + Number(b) + Number(c)), fmt(Number(v) * 10), fmt(Number(a) * Number(b))])
  }
  const oven: Gen = () => {
    const [a, b, c] = rng.pick(OVENS)
    const v = (a * b * c) / 1e6
    return convAnswer(kp, d, rng, `oven-${a}-${b}-${c}`, [text('c.oven', { a, b, c })], fmt(v), [fmt(v * 1000), fmt(v * 10), fmt(v / 10)])
  }
  if (d === 1)
    return pickBy(rng, [
      [1, define],
      [1.5, fact],
      [1.5, conv(1)],
      [2, fit],
      [2, tank],
      [0.5, cup],
    ])
  if (d === 2)
    return pickBy(rng, [
      [1.5, conv(2)],
      [1.2, bottles],
      [1, pool],
      [1, truck],
    ])
  return pickBy(rng, [
    [1.5, oven],
    [1, pool],
    [1, bottles],
    [1, truck],
  ])
}

// ═════════════════════════════════════════════════════════════
// 8. 不规则物体的体积（例 6 排水法）
// ═════════════════════════════════════════════════════════════

export const THINGS: BeakerItem['thing'][] = ['potato', 'stone', 'egg']
/** 回顾与反思：哪些东西能用排水法测体积（乒乓球浮在水上、冰块会化） */
export const DRAIN_FACTS: [string, boolean][] = [
  ['potato', true],
  ['stone', true],
  ['ironBlock', true],
  ['pingpong', false],
  ['ice', false],
]
/** 练习九 8：假山石放进鱼缸（底面积平方分米、水面上升厘米） */
export const RISES: [number, number][] = [
  [51, 3],
  [40, 2],
  [36, 5],
  [45, 4],
]
/** 练习九 9：水池（长度、宽度、深度）注满水，两根石柱（长度、宽度、高度，比水池深）竖着放进去 */
export const PILLARS: [number, number, number, number, number, number][] = [
  [8, 5, 2, 3, 2, 4],
  [10, 6, 2, 2, 1, 3],
  [12, 8, 3, 2, 2, 5],
  [9, 6, 2, 1, 1, 3],
]

function irregularGen(d: Difficulty, rng: RNG): Question {
  const kp = KP_IRR
  // 例 6：烧杯里原来有水，放进土豆（完全沉在水里），水面升高的那部分就是土豆的体积
  const beaker = (max: 500 | 1000): Gen => () => {
    const step = max / 10
    const before = rng.int(3, 6) * step
    const rise = rng.int(1, Math.min(4, 9 - before / step)) * step
    const after = before + rise
    const thing = rng.pick(THINGS)!
    return num(
      kp, d, rng, `beaker-${max}-${before}-${after}-${thing}`,
      [text('i.beaker', { t: K(`t.${thing}`) }), { kind: 'beaker', max, items: [{ water: before }, { water: after, thing }], arrow: true }],
      rise,
      [after, before, rise + step, rise - step, rise * 2].filter((x) => x > 0),
    )
  }
  const clay: Gen = () => {
    const [l, w, h] = dims3(rng, 2, 9)
    const v = l * w * h
    return num(kp, d, rng, `clay-${l}-${w}-${h}`, [text('i.clay', { a: l, b: w, c: h })], v, [surfaceOf(l, w, h), (l + w + h) * 4, l * w])
  }
  const drain: Gen = () => {
    const [thing, truth] = rng.pick(DRAIN_FACTS)
    return judge(kp, d, rng, `drain-${thing}`, [text('i.judge', { t: K(`t.${thing}`) })], truth)
  }
  // 练习九 7：拿出珊瑚石，水面下降——底面积 × 下降的高度
  const coral: Gen = () => {
    const square = rng.chance(0.5)
    const l = square ? rng.pick([8, 10, 12, 20]) : rng.pick([12, 15, 20])
    const w = square ? l : rng.pick([8, 10])
    const d2 = rng.int(4, 8)
    const drop = rng.int(1, 3)
    const d1 = d2 + drop
    const h = d1 + rng.int(2, 4)
    const lab = { l: String(l), w: String(w) }
    return num(
      kp, d, rng, `coral-${l}-${w}-${d1}-${d2}`,
      [text('i.coral'), box([{ l, w, h, labels: lab, water: d1, depth: String(d1), stone: true }, { l, w, h, labels: lab, water: d2, depth: String(d2) }], true)],
      l * w * drop,
      [l * w * d1, l * w * d2, (l + w) * drop],
    )
  }
  // 练习九 8：底面积 × 水面上升的高度（厘米换成分米）；整数的用平方厘米
  const rise: Gen = () => {
    if (rng.chance(0.5)) {
      const [s, r] = rng.pick(RISES)
      const v = fmt((s * r) / 10)
      return convAnswer(kp, d, rng, `rise-${s}-${r}`, [text('i.rise', { s, r })], v, [String(s * r), fmt((s * r) / 100), fmt(s / r)])
    }
    const s = rng.pick([150, 200, 240, 300, 400])
    const r = rng.int(1, 4)
    return num(kp, d, rng, `riseCm-${s}-${r}`, [text('i.riseCm', { s, r })], s * r, [s + r, s * r * 10, s])
  }
  const pillar: Gen = () => {
    const [a, b, c, x, y, z] = rng.pick(PILLARS)
    const v = 2 * x * y * c
    return num(kp, d, rng, `pillar-${a}-${b}-${c}-${x}-${y}-${z}`, [text('i.pillar', { a, b, c, x, y, z })], v, [2 * x * y * z, x * y * c, a * b * c - v])
  }
  // 练习九 13*：1 大 1 小溢出 x 毫升，1 大 4 小溢出 y 毫升，大球多大
  const balls: Gen = () => {
    const small = rng.int(2, 5)
    const big = rng.int(6, 15)
    const x = big + small
    const y = big + 4 * small
    return num(kp, d, rng, `balls-${x}-${y}`, [text('i.balls', { x, y })], big, [small, x, y - x])
  }
  if (d === 1)
    return pickBy(rng, [
      [3, beaker(500)],
      [1.5, clay],
      [1.5, drain],
    ])
  if (d === 2)
    return pickBy(rng, [
      [2, coral],
      [2, rise],
      [1, beaker(1000)],
    ])
  return pickBy(rng, [
    [1.5, pillar],
    [1.5, balls],
    [1, rise],
  ])
}

defineGenerator(KP_KNOW, knowGen)
defineGenerator(KP_NET, netGen)
defineGenerator(KP_SURF, surfaceGen)
defineGenerator(KP_VUNIT, volumeUnitGen)
defineGenerator(KP_VOL, volumeGen)
defineGenerator(KP_RATE, rateGen)
defineGenerator(KP_CAP, capacityGen)
defineGenerator(KP_IRR, irregularGen)
