// 六下「3 圆柱与圆锥」的生成器（六年级数学 G）。
import type { Difficulty, GeoFig, GeoItem, InputMode, LParam, LStr, Question, RoundSolidSpec, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 六下第三单元「圆柱与圆锥」（课本 p16–37，平台当前的旧版六下）：
//   1. 圆柱：圆柱的认识（p16–19：例 1 组成与特征、长方形转成圆柱，做一做 1、2；练习三 1、4）→ cyl-know；
//      例 2 侧面展开（做一做 1、2；练习三 2、3、5；练习四 12*）→ cyl-net；
//      圆柱的表面积（p20–23）：例 3 侧面积公式与做一做、例 4 做一做 1、练习四 2、3、10 → cyl-side；
//      例 3 表面积公式、例 4 厨师帽（进一法）与做一做 2、练习四 1、5–8、11 → cyl-surface；
//      圆柱的体积（p24–29）：例 5 切拼成近似长方体与做一做、练习五 1、4、6、9、12、14*、15*，练习七 1、3、4 → cyl-volume；
//      例 6 杯子装牛奶与做一做、例 7 瓶子倒过来、练习五 2、3、5、7、8、10、11、13，练习七 5* → cyl-capacity。
//   2. 圆锥：圆锥的认识（p30–31：例 1 特征、高、量高、直角三角形转成圆锥，做一做；练习六 1、2）→ cone-know；
//      圆锥的体积（p32–35：例 2 倒沙子实验、例 3 沙堆与做一做；练习六 3–10，练习七 2）→ cone-volume。
//   整理和复习（p36）、练习七（p37）的题按内容分进上面几个知识点的第 2、3 档。
// 规矩：
// - π 一律取 3.14（课本约定）；小数、分数、比的答案一律选项卡，整数答案数字键盘或数的选项；干扰项照课本暴露的错法算：
//   半径当直径 / 直径当半径、少乘 2、少加或多加一个底面、圆锥忘了乘 1/3、单位没换算。
// - 题目文字的单位写汉字，图里只写数（「图中的单位是厘米。」写在题目里）；公式题的选项用中文说法（不出「πr²h」）。
// - 朗读避坑：「长」只在「长度」「长方形」「长方体」「周长」「棱长」里（例 2 的「长方形的长」照课本写，合成时换字）；
//   不写「重」（写「有……重」）、「量」（写「测量」）、「为」（以 AB 边为轴 → 绕 AB 边旋转）、「倒」（倒置 → 瓶口向下放平、
//   倒满 → 装满）、「着」「还」「浸没」「铺」「粮囤」「朝」（尖朝下 → 尖向下）。
// - 进一法的变式挑进一法和四舍五入结果不一样的数（课本的 2198、376.8 两种方法结果相同，只出变式）。
// 不出：开放题（你还见过哪些……）、动手操作本身（剪、量、倒沙子只出结论）、圆柱容球、蚁狮、练习四 9 路灯柱、
// 练习六 11* 降水量、整理和复习 4(2) 出米率；圆柱「有无数条高」、圆锥「只有一条高」这些课本没写的说法也不出。
// ─────────────────────────────────────────────────────────────

const T = 'solid' as const
export const KP_CK = 'm6s2-04-cyl-know'
export const KP_CN = 'm6s2-04-cyl-net'
export const KP_CS = 'm6s2-04-cyl-side'
export const KP_CA = 'm6s2-04-cyl-surface'
export const KP_CV = 'm6s2-04-cyl-volume'
export const KP_CC = 'm6s2-04-cyl-capacity'
export const KP_OK = 'm6s2-04-cone-know'
export const KP_OV = 'm6s2-04-cone-volume'

type P = Record<string, LParam>
/** 本单元的词条（m6.cyl.*） */
export const K = (k: string, p?: P): LStr => (p ? { k: `m6.cyl.${k}`, p } : { k: `m6.cyl.${k}` })
const text = (k: string, p?: P): StemPart => ({ kind: 'text', text: K(k, p) })
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
// 数、单位、出题的小骨架
// ─────────────────────────────────────────────────────────────

export type U = 'cm' | 'dm' | 'm' | 'cm2' | 'dm2' | 'm2' | 'cm3' | 'dm3' | 'm3' | 'l' | 'ml'
export const unitL = (u: U): LStr => K(`u.${u}`)
/** 「5.5 厘米」这种带单位的数 */
export const nU = (n: number | string, u: U): LStr => K('nU', { n, u: unitL(u) })
export const PI = 3.14
/** 去掉浮点尾巴（3.14 × 4 × 12 = 150.72000000000003 → 150.72） */
export const r6 = (v: number): number => Math.round(v * 1e6) / 1e6
export const fmt = (v: number): string => String(r6(v))

const YES = K('yes')
const NO = K('no')

/** 题干里有这些图就用选项卡作答 */
const FIG_KINDS = new Set<StemPart['kind']>(['round-solid', 'geo', 'box', 'box-net', 'net'])
interface NumOpts {
  input?: InputMode
  min?: number
  max?: number
}
/**
 * 整数答案：数字键盘或数的选项卡（smart = 照常见错法算出来的干扰数）；选编号的题给 input: 'choice' 和编号的范围。
 * 错法算出来的整数不够 3 个时，用答案的 2 倍、3 倍、一半、三分之一、10 倍补（不要「答案 ± 1」那种一眼看穿的）
 */
function num(kp: string, d: Difficulty, rng: RNG, sig: string, stem: StemPart[], value: number, smart: number[] = [], o: NumOpts = {}): Question {
  // 带图的题一律选项卡：数字键盘四行约 300 像素，题目、图和键盘在手机竖屏上一屏放不下
  const input = o.input ?? (stem.some((p) => FIG_KINDS.has(p.kind)) ? 'choice' : undefined)
  const min = o.min ?? 0
  const fits = (v: number): boolean => Number.isInteger(v) && v >= Math.max(min, 1) && v !== value && (o.max === undefined || v <= o.max)
  const ok = [...new Set(smart.map(r6).filter(fits))]
  if (o.max === undefined) for (const v of [value * 2, value / 2, value * 3, value / 3, value * 10, value * 4]) if (ok.length < 3 && fits(r6(v)) && !ok.includes(r6(v))) ok.push(r6(v))
  const max = o.max ?? Math.max(value * 10, ...ok, 20)
  return numberQuestion({ kpId: kp, type: T, difficulty: d, sig, stem, value, rng, max, min, smart: ok, input })
}
/** 文字 / 词条答案的选项题 */
function pick(kp: string, d: Difficulty, rng: RNG, sig: string, stem: StemPart[], correct: LStr, distractors: LStr[]): Question {
  return labelQuestion({ kpId: kp, type: T, difficulty: d, sig, stem, correct, distractors, rng })
}
/** 判断题：「……，对吗？」配 对 / 不对 */
function judge(kp: string, d: Difficulty, rng: RNG, sig: string, stem: StemPart[], truth: boolean): Question {
  return pick(kp, d, rng, sig, stem, truth ? YES : NO, [truth ? NO : YES])
}
/** 小数答案的选项题：正确答案 + 最多 3 个干扰项（去掉重复的、和答案相等的、不是正数的）；unit 给了就带单位写 */
function decPick(kp: string, d: Difficulty, rng: RNG, sig: string, stem: StemPart[], correct: number, wrongs: number[], unit?: U): Question {
  const c = fmt(correct)
  const seen = new Set([c])
  const ds: string[] = []
  for (const w of wrongs) {
    const x = fmt(w)
    if (seen.has(x) || !(Number(x) > 0) || ds.length >= 3) continue
    seen.add(x)
    ds.push(x)
  }
  if (!ds.length) ds.push(fmt(correct * 10))
  const lab = (x: string): LStr => (unit ? nU(x, unit) : x)
  return pick(kp, d, rng, sig, stem, lab(c), ds.map(lab))
}
/** 算出来的数：整数出数字键盘（或数的选项），小数出选项卡 */
function val(kp: string, d: Difficulty, rng: RNG, sig: string, stem: StemPart[], value: number, wrongs: number[], o: NumOpts = {}): Question {
  const v = r6(value)
  if (Number.isInteger(v) && v < 1e9) return num(kp, d, rng, sig, stem, v, wrongs, o)
  return decPick(kp, d, rng, sig, stem, v, wrongs)
}

/** 进一法 / 四舍五入法 / 去尾法取到整十数、取整数 */
export const ceil10 = (v: number): number => Math.ceil(r6(v) / 10 - 1e-9) * 10
export const round10 = (v: number): number => Math.floor(r6(v) / 10 + 0.5) * 10
export const floor10 = (v: number): number => Math.floor(r6(v) / 10 + 1e-9) * 10
export const roundInt = (v: number): number => Math.floor(r6(v) + 0.5)

// 圆柱、圆锥的几个量（π = 3.14）
export const lateral = (r: number, h: number): number => r6(2 * PI * r * h)
export const baseArea = (r: number): number => r6(PI * r * r)
export const surface = (r: number, h: number): number => r6(lateral(r, h) + 2 * baseArea(r))
export const cylVol = (r: number, h: number): number => r6(PI * r * r * h)
export const coneVol = (r: number, h: number): number => r6((PI * r * r * h) / 3)

// ─────────────────────────────────────────────────────────────
// 图：圆柱圆锥立体图（round-solid）、长方形 / 三角形绕轴旋转、展开图（geo）
// ─────────────────────────────────────────────────────────────

const solid = (items: RoundSolidSpec[], o: { numbered?: boolean; arrow?: boolean } = {}): StemPart => ({
  kind: 'round-solid',
  items,
  ...(o.numbered ? { numbered: true } : {}),
  ...(o.arrow ? { arrow: true } : {}),
})
const geo = (figs: GeoFig[], alt: string, numbered = false): StemPart => (numbered ? { kind: 'geo', figs, alt, numbered: true } : { kind: 'geo', figs, alt })
/** 标着数的立着的圆柱（图里的数就是题目要用的数） */
const cylLab = (r: number, h: number, lab: RoundSolidSpec['labels'], o: Partial<RoundSolidSpec> = {}): RoundSolidSpec => ({ shape: 'cylinder', r, h, labels: lab, ...o })

type GP = [number, number]
/**
 * 长方形 ABCD（做一做 2、练习五 14*）：A 左上、B 左下、C 右下、D 右上，AB 竖着 a、BC 横着 b；红线画在作轴的那条边上。
 * 边上写数（右边 CD 写 a、下边 BC 写 b，同课本）；nums = false 只写字母
 */
export function rectFig(a: number, b: number, axis: 'AB' | 'BC' | null, nums = true, letters = true): GeoFig {
  // 一格多少像素：最长的边画到 110 像素左右（手机竖屏上题目、图和作答一屏放下）
  const u = Math.min(44, 110 / Math.max(a, b))
  const m = 16
  const W = b * u
  const H = a * u
  const A: GP = [m, m]
  const B: GP = [m, m + H]
  const C: GP = [m + W, m + H]
  const D: GP = [m + W, m]
  const items: GeoItem[] = [{ t: 'poly', pts: [A, B, C, D], fill: 'b', stroke: 'b', labels: nums ? [null, String(b), String(a), null] : undefined }]
  if (axis === 'AB') items.push({ t: 'line', a: [m, m - 14], b: [m, m + H + 14], stroke: 'd' })
  if (axis === 'BC') items.push({ t: 'line', a: [m - 14, m + H], b: [m + W + 14, m + H], stroke: 'd' })
  if (letters)
    items.push(
      { t: 'dot', at: A, label: 'A', side: 'nw' },
      { t: 'dot', at: B, label: 'B', side: 'sw' },
      { t: 'dot', at: C, label: 'C', side: 'se' },
      { t: 'dot', at: D, label: 'D', side: 'ne' },
    )
  return { w: W + 2 * m, h: H + 2 * m, items }
}
/** 绕红线旋转的平面图形（练习六 2）：rect 长方形、tri 直角三角形、triRect 直角三角形在上长方形在下、tri2Rect 三角形（一条边贴轴、尖朝外）在上长方形在下 */
export type SpinFig = 'rect' | 'tri' | 'triRect' | 'tri2Rect'
export function spinFig(kind: SpinFig, labels?: { a: string; b: string }): GeoFig {
  const m = 16
  const u = 22
  const items: GeoItem[] = []
  let H: number
  const W = 2.4 * u
  if (kind === 'rect') {
    H = 2.8 * u
    items.push({ t: 'poly', pts: [[m, m], [m, m + H], [m + W, m + H], [m + W, m]], fill: 'b', stroke: 'b' })
  } else if (kind === 'tri') {
    H = 3.2 * u
    items.push({ t: 'poly', pts: [[m, m], [m, m + H], [m + W, m + H]], fill: 'b', stroke: 'b', right: [1], labels: labels ? [labels.a, labels.b, null] : undefined })
  } else if (kind === 'triRect') {
    const t1 = 2 * u
    H = t1 + 1.8 * u
    items.push({ t: 'poly', pts: [[m, m], [m, m + t1], [m + W, m + t1]], fill: 'c', stroke: 'b' })
    items.push({ t: 'poly', pts: [[m, m + t1], [m, m + H], [m + W, m + H], [m + W, m + t1]], fill: 'b', stroke: 'b' })
  } else {
    const t1 = 2 * u
    H = t1 + 1.8 * u
    items.push({ t: 'poly', pts: [[m, m], [m, m + t1], [m + W, m + t1 / 2]], fill: 'c', stroke: 'b' })
    items.push({ t: 'poly', pts: [[m, m + t1], [m, m + H], [m + W, m + H], [m + W, m + t1]], fill: 'b', stroke: 'b' })
  }
  items.push({ t: 'line', a: [m, m - 14], b: [m, m + H + 14], stroke: 'd' })
  return { w: W + 2 * m, h: H + 2 * m, items }
}
/**
 * 圆柱的展开图（例 2、练习三 2、3）：中间一个长方形（cut：rect 长方形 / para 平行四边形 / wave 两边是曲线）、上下各一个圆；
 * nums 给了就在圆里画一条直径、直径的数写在圆的右边，长方形里写和底面周长相等的那条边、右边写另一条边（同课本练习三 3）。
 * 尺寸按 d、L、W 画（课本的图是按比例画的），u = 每个单位几像素（几个并排时给小一点）；
 * place = center 两个圆都在中间（例 2）、offset 一个在右上一个在左下（练习三 2）
 */
export function cylNetFig(o: { d: number; L: number; W: number; cut?: 'rect' | 'para' | 'wave'; nums?: { d: string; L: string; W: string }; place?: 'center' | 'offset'; u?: number }): GeoFig {
  const u = o.u ?? Math.max(12, Math.min(26, 190 / Math.max(o.L, o.d * 2 + o.W), 34 / o.d))
  const m = 12
  const R = (o.d * u) / 2
  const Lp = o.L * u
  const Wp = o.W * u
  const slant = o.cut === 'para' ? Wp * 0.45 : 0
  const x0 = m
  const y0 = m + 2 * R
  const items: GeoItem[] = []
  if (o.cut === 'wave') {
    const left: GP[] = Array.from({ length: 9 }, (_, i) => [x0 + 5 * Math.sin((i * Math.PI) / 4), y0 + (Wp * i) / 8])
    const right: GP[] = Array.from({ length: 9 }, (_, i) => [x0 + Lp + 5 * Math.sin((i * Math.PI) / 4), y0 + Wp - (Wp * i) / 8])
    items.push({ t: 'poly', pts: [...left, ...right], fill: 'c', stroke: 'b' })
  } else {
    const pts: GP[] = [
      [x0 + slant, y0],
      [x0, y0 + Wp],
      [x0 + Lp, y0 + Wp],
      [x0 + Lp + slant, y0],
    ]
    items.push({ t: 'poly', pts, fill: 'c', stroke: 'b', labels: o.nums ? [null, null, o.nums.W, null] : undefined })
  }
  const offset = o.place === 'offset'
  const cTop: GP = [offset ? x0 + Lp + slant - R : x0 + slant / 2 + Lp / 2, y0 - R]
  const cBot: GP = [offset ? x0 + R : x0 + slant / 2 + Lp / 2, y0 + Wp + R]
  let right = x0 + Lp + slant + (o.nums ? 8 + o.nums.W.length * 9 : 0)
  for (const c of [cTop, cBot]) {
    items.push({ t: 'dot', at: c, r: R, fill: 'c', stroke: 'b' })
    if (o.nums) {
      items.push({ t: 'line', a: [c[0] - R, c[1]], b: [c[0] + R, c[1]], thin: true })
      const tx = c[0] + R + 6 + o.nums.d.length * 5
      items.push({ t: 'text', at: [tx, c[1]], text: o.nums.d })
      right = Math.max(right, tx + o.nums.d.length * 5 + 2)
    }
  }
  if (o.nums) items.push({ t: 'text', at: [x0 + slant / 2 + Lp / 2, y0 + Wp / 2], text: o.nums.L, halo: true })
  return { w: right + m, h: Wp + 4 * R + 2 * m, items }
}

/** 一组编号的立体图：颜色打乱，不跟形状走 */
function numbered(rng: RNG, items: RoundSolidSpec[]): StemPart {
  const tones = rng.shuffle([0, 1, 2, 3])
  return solid(
    items.map((s, i) => ({ ...s, tone: tones[i % 4]! })),
    { numbered: true },
  )
}

// 认识课的图形：圆柱的几种摆法和样子、干扰的立体图形
const CYL_LOOKS: [number, number][] = [
  [1, 1.6],
  [1.4, 0.9],
  [0.8, 2],
  [1.2, 1.3],
]
type CylPose = 'up' | 'side' | 'tilt'
function cylSpec(rng: RNG, pose?: CylPose): { spec: RoundSolidSpec; code: string } {
  const p = pose ?? rng.pick(['up', 'up', 'side', 'tilt'] as const)
  const i = rng.int(0, CYL_LOOKS.length - 1)
  const [r, h] = CYL_LOOKS[i]!
  return { spec: { shape: 'cylinder', r, h, pose: p }, code: `cy${p[0]}${i}` }
}
type Other = 'cut' | 'frustum' | 'cone' | 'sphere' | 'cylinder'
function otherSpec(rng: RNG, kind: Other): { spec: RoundSolidSpec; code: string } {
  switch (kind) {
    case 'cut':
      return { spec: { shape: 'cut', r: 0.9, h: 1.5 }, code: 'cut' }
    case 'frustum': {
      const side = rng.chance(0.5)
      return { spec: { shape: 'frustum', r: 1.1, h: side ? 1.6 : 1.3, pose: side ? 'side' : 'up' }, code: side ? 'frs' : 'fru' }
    }
    case 'cone': {
      const pose = rng.pick(['up', 'lie', 'down'] as const)
      const i = rng.int(0, 2)
      const [r, h] = ([[1, 1.6], [1.3, 1], [0.7, 1.8]] as [number, number][])[i]!
      return { spec: { shape: 'cone', r, h, pose }, code: `co${pose[0]}${i}` }
    }
    case 'sphere':
      return { spec: { shape: 'sphere', r: 0.95, h: 1.9 }, code: 'sph' }
    case 'cylinder':
      return cylSpec(rng)
  }
}
/** 生活里的物体：形状是圆柱的、是圆锥的、都不是的 */
export const OBJ_CYL = ['can', 'board', 'pillar', 'tank', 'teaTin', 'penPot'] as const
export const OBJ_CONE = ['hat', 'sandPile', 'funnel'] as const
export const OBJ_OTHER = ['ball', 'rubik', 'chalkBox', 'brick', 'carton'] as const
export const PARTS_CYL = ['base', 'side', 'h'] as const
export const PARTS_CONE = ['apex', 'base', 'side', 'h'] as const

// ═════════════════════════════════════════════════════════════
// 1. 圆柱的认识（例 1、做一做 1、2；练习三 1、4）
// ═════════════════════════════════════════════════════════════

/** 例 1 两个孩子的话、课本结论改成的判断题（tier 1） */
export const CK_FACTS: { id: string; truth: boolean }[] = [
  { id: 'sameBases', truth: true },
  { id: 'curved', truth: true },
  { id: 'flat', truth: false },
  { id: 'bigSmall', truth: false },
  { id: 'threeFaces', truth: true },
  { id: 'rectBase', truth: false },
]

function cylKnowGen(d: Difficulty, rng: RNG): Question {
  const kp = KP_CK
  // p16：生活里哪个物体的形状是圆柱
  const obj: Gen = () => {
    const c = rng.pick(OBJ_CYL)
    const ds = rng.shuffle([...OBJ_OTHER, 'hat', 'sandPile'] as string[]).slice(0, 3)
    return pick(kp, d, rng, `obj-${c}-${ds.join('.')}`, [text('k.obj')], K(`o.${c}`), ds.map((x) => K(`o.${x}`)))
  }
  // 练习三 1：哪个图形是圆柱 / 哪个不是圆柱（编号的立体图，只有一个对的）
  const isCyl: Gen = () => {
    const n = rng.int(3, 4)
    const others = rng.shuffle(['cut', 'frustum', 'cone', 'sphere'] as Other[]).slice(0, n - 1)
    const at = rng.int(0, n - 1)
    const figs = others.map((k) => otherSpec(rng, k))
    figs.splice(at, 0, cylSpec(rng))
    return num(kp, d, rng, `isCyl-${figs.map((f) => f.code).join('.')}`, [text('k.isCyl'), numbered(rng, figs.map((f) => f.spec))], at + 1, [], { input: 'choice', min: 1, max: n })
  }
  const notCyl: Gen = () => {
    const odd = otherSpec(rng, rng.pick(['cut', 'frustum'] as Other[]))
    const poses = rng.shuffle(['up', 'side', 'tilt'] as CylPose[])
    const figs = poses.map((p) => cylSpec(rng, p))
    const at = rng.int(0, 3)
    figs.splice(at, 0, odd)
    return num(kp, d, rng, `notCyl-${figs.map((f) => f.code).join('.')}`, [text('k.notCyl'), numbered(rng, figs.map((f) => f.spec))], at + 1, [], { input: 'choice', min: 1, max: 4 })
  }
  // 例 1：圆柱是由 3 个面围成的（2 个底面、1 个侧面）
  const faces: Gen = () => {
    const what = rng.pick(['faces', 'bases', 'sides'] as const)
    const v = { faces: 3, bases: 2, sides: 1 }[what]
    return num(kp, d, rng, `faces-${what}`, [text(`k.${what}`)], v, [1, 2, 3, 4].filter((x) => x !== v))
  }
  const name = (q: 'base' | 'side' | 'h'): Gen => () => {
    const opts = { base: ['base', 'side', 'apex', 'h'], side: ['side', 'base', 'apex', 'h'], h: ['h', 'r', 'd', 'c'] }[q]
    return pick(kp, d, rng, `name-${q}`, [text(`k.name.${q}`)], K(`p.${opts[0]}`), opts.slice(1).map((x) => K(`p.${x}`)))
  }
  const fact: Gen = () => {
    const f = rng.pick(CK_FACTS)
    return judge(kp, d, rng, `fact-${f.id}`, [text(`k.f.${f.id}`)], f.truth)
  }
  // 做一做 1：标明圆柱的底面、侧面和高——图上用 A、B、C 标出来，问其中一个
  const part: Gen = () => {
    const pose = rng.pick(['up', 'side', 'tilt'] as CylPose[])
    const letters = rng.shuffle(['A', 'B', 'C'])
    const which = rng.int(0, 2)
    const spec: RoundSolidSpec = { ...cylSpec(rng, pose).spec, r: 1.1, h: 1.6, marks: PARTS_CYL.map((at, i) => ({ at, text: letters[i]! })) }
    const ask = letters[which]!
    return pick(
      kp, d, rng, `part-${pose}-${letters.join('')}-${ask}`,
      [text('k.part', { x: ask }), solid([spec])],
      K(`p.${PARTS_CYL[which]}`),
      PARTS_CYL.filter((_, i) => i !== which).map((x) => K(`p.${x}`)),
    )
  }
  // 例 1：长方形硬纸贴在木棒上快速转动
  const spin: Gen = () => pick(kp, d, rng, 'spin', [text('k.spin')], K('s.cylinder'), [K('s.cone'), K('s.cuboid'), K('s.sphere')])
  // 做一做 2：长方形 ABCD 绕一条边旋转一周
  const rot = (what: 'r' | 'h' | 'd'): Gen => () => {
    let a = rng.int(1, 6)
    let b = rng.int(1, 6)
    while (a === b) b = rng.int(1, 6)
    if (rng.chance(0.2)) [a, b] = [1, 2] // 课本的数：BC = 2 厘米，CD = 1 厘米
    const axis = rng.pick(['AB', 'BC'] as const)
    // 绕 AB（竖的边，长 a）：半径 = BC = b，高 = a；绕 BC：半径 = a，高 = b
    const r = axis === 'AB' ? b : a
    const h = axis === 'AB' ? a : b
    const v = what === 'r' ? r : what === 'h' ? h : 2 * r
    return num(
      kp, d, rng, `rot${what}-${axis}-${a}-${b}`,
      [text('unitIs', { u: unitL('cm') }), text(`k.rot.${what}`, { e: axis }), geo([rectFig(a, b, axis)], `长方形 ABCD，AB 边长 ${a}，BC 边长 ${b}，红线是 ${axis} 边`)],
      v,
      [what === 'r' ? h : r, 2 * r, r + h, what === 'd' ? r : 2 * h],
      { input: 'choice' },
    )
  }
  const rotWhich: Gen = () => {
    let a = rng.int(1, 6)
    let b = rng.int(1, 6)
    while (a === b) b = rng.int(1, 6)
    const axis = rng.pick(['AB', 'BC'] as const)
    const r = axis === 'AB' ? b : a
    const h = axis === 'AB' ? a : b
    return pick(
      kp, d, rng, `rotWhich-${axis}-${a}-${b}`,
      [text('unitIs', { u: unitL('cm') }), text('k.rot.which', { r, h }), geo([rectFig(a, b, null)], `长方形 ABCD，AB 边长 ${a}，BC 边长 ${b}`)],
      K('edge', { e: axis }),
      [K('edge', { e: axis === 'AB' ? 'BC' : 'AB' })],
    )
  }
  // 练习三 4：切面（和底面平行地切 → 圆；沿底面直径竖直切开 → 长方形，直径和高相等时是正方形）
  const cut: Gen = () => {
    const way = rng.pick(['flat', 'flat', 'axial', 'axial', 'square'] as const)
    const dd = rng.pick([4, 6, 8, 10])
    let h = rng.pick([4, 6, 8, 10, 12])
    if (way === 'square') h = dd
    else if (way === 'axial') while (h === dd) h = rng.pick([4, 6, 8, 10, 12])
    const ans = way === 'flat' ? 'circle' : way === 'square' ? 'square' : 'rect'
    // 答案是正方形时不放「长方形」（正方形也是特殊的长方形，两个都算对）
    const all = way === 'square' ? ['circle', 'square', 'triangle', 'trap'] : ['circle', 'rect', 'square', 'triangle']
    return pick(
      kp, d, rng, `cut-${way}-${dd}-${h}`,
      [text('unitIs', { u: unitL('cm') }), text(way === 'flat' ? 'k.cut.flat' : 'k.cut.axial'), solid([cylLab(dd / 2, h, { d: String(dd), h: String(h) })])],
      K(`s.${ans}`),
      all.filter((x) => x !== ans).map((x) => K(`s.${x}`)),
    )
  }
  // 第 2 档：整理和复习 1 数一数有几个圆柱；转出的圆柱底面直径；切面长方形的两条边是什么；哪个转出来底面大
  const count: Gen = () => {
    const n = rng.int(5, 6)
    const k = rng.int(1, 4)
    const figs = [...Array.from({ length: k }, () => cylSpec(rng)), ...Array.from({ length: n - k }, () => otherSpec(rng, rng.pick(['cone', 'cone', 'frustum', 'cut', 'sphere'] as Other[])))]
    const order = rng.shuffle(figs)
    return num(kp, d, rng, `count-${order.map((f) => f.code).join('.')}`, [text('k.countCyl'), numbered(rng, order.map((f) => f.spec))], k, [k + 1, k - 1, n - k], { input: 'choice', min: 1, max: 6 })
  }
  const cutSides: Gen = () => pick(kp, d, rng, 'cutSides', [text('k.cutSides')], K('pair.dh'), [K('pair.rh'), K('pair.ch'), K('pair.dd')])
  const bigger: Gen = () => {
    const a = rng.int(2, 9)
    let b = rng.int(2, 9)
    while (a === b) b = rng.int(2, 9)
    // 绕短的那条边转，另一条（长的）是半径，底面大
    const ans = Math.min(a, b)
    return pick(kp, d, rng, `bigger-${a}-${b}`, [text('k.bigger', { a, b })], K('aroundSide', { n: ans }), [K('aroundSide', { n: Math.max(a, b) })])
  }
  // 第 3 档：沿直径切开，切面的面积；转出的圆柱的底面周长
  const cutArea: Gen = () => {
    const dd = rng.pick([4, 6, 8, 10, 12])
    const h = rng.pick([5, 8, 10, 12, 15])
    return num(kp, d, rng, `cutArea-${dd}-${h}`, [text('k.cutArea', { d: dd, h })], dd * h, [(dd / 2) * h, 2 * dd * h, dd + h])
  }
  const rotC: Gen = () => {
    const a = rng.int(1, 6)
    let b = rng.int(1, 6)
    while (a === b) b = rng.int(1, 6)
    return decPick(kp, d, rng, `rotC-${a}-${b}`, [text('k.rotC', { a, b })], 2 * PI * b, [PI * b, 2 * PI * a, PI * b * b])
  }
  if (d === 1)
    return pickBy(rng, [
      [1, obj],
      [1.2, isCyl],
      [1, notCyl],
      [1, faces],
      [0.6, name('base')],
      [0.6, name('side')],
      [0.6, name('h')],
      [1.2, fact],
      [1.6, part],
      [0.5, spin],
      [1, rot('r')],
      [1, rot('h')],
      [0.8, rotWhich],
      [1.2, cut],
    ])
  if (d === 2)
    return pickBy(rng, [
      [1.5, count],
      [1, rot('d')],
      [1, cutSides],
      [1, bigger],
      [0.6, part],
      [0.6, cut],
    ])
  return pickBy(rng, [
    [1.2, cutArea],
    [1, rotC],
    [0.6, count],
    [0.4, bigger],
  ])
}

// ═════════════════════════════════════════════════════════════
// 2. 圆柱的展开图（例 2、做一做 1、2；练习三 2、3、5；练习四 12*）
// ═════════════════════════════════════════════════════════════

/** 能卷成圆柱的长方形的一条边：底面直径 × 3.14（练习三 3 的对的那个） */
const CIRC = (dd: number): number => r6(PI * dd)
/** 练习三 3 里错的展开图：长方形和底面周长相等的边算错了（直径 × 3、直径、半径 × 3.14） */
export const WRONG_NET: ((dd: number) => number)[] = [(x) => 3 * x, (x) => x, (x) => r6((PI * x) / 2)]

function cylNetGen(d: Difficulty, rng: RNG): Question {
  const kp = KP_CN
  const unroll: Gen = () => pick(kp, d, rng, 'unroll', [text('n.unroll')], K('s.rect'), [K('s.circle'), K('s.triangle'), K('s.trap')])
  const sideIs = (q: 'len' | 'wid'): Gen => () => {
    const ans = q === 'len' ? 'c' : 'h'
    return pick(kp, d, rng, `is-${q}`, [text(`n.is.${q}`)], K(`p.${ans}`), ['c', 'h', 'd', 'r'].filter((x) => x !== ans).map((x) => K(`p.${x}`)))
  }
  // 做一做 2：茶叶筒的商标纸展开后，和底面周长相等的那条边、另一条边
  const label = (q: 'c' | 'w', by: 'r' | 'd'): Gen => () => {
    const r = by === 'r' ? rng.pick([5, 5, 2, 3, 4, 6, 10]) : rng.pick([1, 1.5, 2, 3, 4, 5])
    const dd = 2 * r
    const h = rng.pick([20, 20, 12, 15, 18, 25])
    const stem = [
      text(by === 'r' ? 'n.label.r' : 'n.label.d', { n: by === 'r' ? r : dd, h }),
      text(q === 'c' ? 'n.label.c' : 'n.label.w'),
    ]
    if (q === 'w') return num(kp, d, rng, `labelW-${by}-${r}-${h}`, stem, h, [r6(2 * PI * r), dd, r])
    return decPick(kp, d, rng, `labelC-${by}-${r}-${h}`, stem, 2 * PI * r, by === 'r' ? [PI * r, 2 * PI * dd, PI * r * r] : [2 * PI * dd, PI * r, PI * r * r])
  }
  // 做一做 1：同一个圆柱的三种展开图是怎样剪开的
  const howCut: Gen = () => {
    const cut = rng.pick(['rect', 'para', 'wave'] as const)
    const ans = { rect: 'byH', para: 'bySlant', wave: 'byCurve' }[cut]
    return pick(
      kp, d, rng, `howCut-${cut}`,
      [text('n.howCut'), geo([cylNetFig({ d: 2, L: CIRC(2), W: 3, cut })], '上下两个圆，中间是剪开的侧面')],
      K(`cutWay.${ans}`),
      ['byH', 'bySlant', 'byCurve'].filter((x) => x !== ans).map((x) => K(`cutWay.${x}`)),
    )
  }
  const slant: Gen = () => pick(kp, d, rng, 'slant', [text('n.slant')], K('s.para'), [K('s.rect'), K('s.trap'), K('s.circle')])
  // 练习三 2：折一折或卷一卷能得到什么立体图形
  const fold: Gen = () => {
    const kind = rng.pick(['cuboid', 'cube', 'cylinder'] as const)
    let fig: StemPart
    if (kind === 'cuboid')
      fig = {
        kind: 'box-net',
        cells: [{ r: 0, c: 2 }, { r: 1, c: 0 }, { r: 1, c: 1 }, { r: 1, c: 2 }, { r: 1, c: 3 }, { r: 2, c: 2 }],
        colW: [2, 0.7, 2, 0.7],
        rowH: [0.7, 3, 0.7],
      }
    else if (kind === 'cube') {
      const net = rng.pick([
        ['.#..', '####', '.#..'],
        ['#...', '####', '..#.'],
        ['..#.', '####', '.#..'],
      ])
      fig = { kind: 'net', cells: net.flatMap((row, r) => [...row].map((ch, c) => (ch === '#' ? { r, c } : null)).filter((x): x is { r: number; c: number } => x !== null)) }
    } else fig = geo([cylNetFig({ d: 2, L: CIRC(2), W: 2.4, place: rng.chance(0.5) ? 'offset' : 'center' })], '一个长方形和两个圆')
    return pick(kp, d, rng, `fold-${kind}`, [text('n.fold'), fig], K(`s.${kind}`), ['cuboid', 'cube', 'cylinder', 'cone'].filter((x) => x !== kind).map((x) => K(`s.${x}`)))
  }
  // 练习三 3：哪个图形是圆柱的展开图（圆里写直径，长方形写两条边，单位厘米）
  // 几个并排时每单位 12 像素（一行放得下三个），单个的画大一点；数据挑大小差不多的
  const netOf = (ok: boolean, used: Set<string>, u?: number): { fig: GeoFig; code: string } => {
    for (;;) {
      const dd = rng.pick([2, 3])
      const W = rng.pick([2, 3])
      const wi = rng.int(0, WRONG_NET.length - 1)
      const L = ok ? CIRC(dd) : WRONG_NET[wi]!(dd)
      const code = `${dd}x${fmt(L)}x${W}`
      if (used.has(code)) continue
      used.add(code)
      return { fig: cylNetFig({ d: dd, L, W, u, nums: { d: String(dd), L: fmt(L), W: String(W) } }), code }
    }
  }
  const whichNet: Gen = () => {
    const used = new Set<string>()
    const at = rng.int(0, 2)
    const nets = [0, 1, 2].map((i) => netOf(i === at, used, 11))
    return num(
      kp, d, rng, `whichNet-${nets.map((x) => x.code).join('.')}`,
      [text('unitIs', { u: unitL('cm') }), text('n.whichNet'), geo(nets.map((x) => x.fig), '三个展开图，圆里写着直径，长方形写着两条边', true)],
      at + 1, [], { input: 'choice', min: 1, max: 3 },
    )
  }
  const canWrap: Gen = () => {
    const ok = rng.chance(0.5)
    const one = netOf(ok, new Set())
    return pick(kp, d, rng, `canWrap-${one.code}`, [text('unitIs', { u: unitL('cm') }), text('n.canWrap'), geo([one.fig], '一个展开图，圆里写着直径，长方形写着两条边')], ok ? K('can') : K('cannot'), [ok ? K('cannot') : K('can')])
  }
  // 练习三 5：长方形纸围成圆柱的侧面，用一条边作底面周长，高是另一条边
  const roll: Gen = () => {
    const a = rng.int(8, 30)
    let b = rng.int(8, 30)
    while (b === a) b = rng.int(8, 30)
    return num(kp, d, rng, `roll-${a}-${b}`, [text('n.roll', { a, b })], b, [a, a + b, Math.abs(a - b)])
  }
  // 例 2 反过来：展开的长方形里和底面周长相等的边 → 底面直径
  const diam: Gen = () => {
    const dd = rng.pick([2, 3, 4, 5, 6, 8, 10])
    const c = CIRC(dd)
    return num(kp, d, rng, `diam-${dd}`, [text('n.diam', { c: fmt(c) })], dd, [dd / 2, 2 * dd, dd + 1])
  }
  // 第 2 档：反推半径；底面周长和高相等时展开是正方形；圆上标的是半径时能不能围成
  const radius: Gen = () => {
    const r = rng.pick([1, 2, 3, 4, 5, 10])
    return num(kp, d, rng, `radius-${r}`, [text('n.radius', { c: fmt(2 * PI * r) })], r, [2 * r, r + 1, 4 * r])
  }
  const square: Gen = () => pick(kp, d, rng, 'square', [text('n.square')], K('s.square'), [K('s.para'), K('s.triangle'), K('s.circle')])
  const wrapR: Gen = () => {
    const r = rng.pick([1, 2, 3, 4, 5])
    const ok = rng.chance(0.5)
    const L = ok ? r6(2 * PI * r) : r6(PI * r)
    const W = rng.pick([3, 4, 5, 6])
    return pick(kp, d, rng, `wrapR-${r}-${fmt(L)}-${W}`, [text('n.wrapR', { r, l: fmt(L), w: W })], ok ? K('can') : K('cannot'), [ok ? K('cannot') : K('can')])
  }
  // 第 3 档：练习四 12* 侧面展开是正方形，底面直径与高的比；同一张纸两种卷法，哪个底面大
  const ratio: Gen = () => pick(kp, d, rng, 'ratio', [text('n.ratio')], '1∶π', ['π∶1', '1∶2π', '2∶π'])
  const rollBig: Gen = () => {
    const a = rng.int(12, 30)
    const b = rng.int(5, a - 3)
    return pick(kp, d, rng, `rollBig-${a}-${b}`, [text('n.rollBig', { a, b })], K('asC', { n: a }), [K('asC', { n: b }), K('same')])
  }
  if (d === 1)
    return pickBy(rng, [
      [1, unroll],
      [0.9, sideIs('len')],
      [0.9, sideIs('wid')],
      [1, label('c', 'r')],
      [0.8, label('w', 'r')],
      [0.8, label('c', 'd')],
      [1, howCut],
      [0.7, slant],
      [1.2, fold],
      [1.2, whichNet],
      [0.9, canWrap],
      [0.9, roll],
      [0.8, diam],
    ])
  if (d === 2)
    return pickBy(rng, [
      [1.2, radius],
      [1, square],
      [1, wrapR],
      [0.6, whichNet],
      [0.5, diam],
    ])
  return pickBy(rng, [
    [1, ratio],
    [1, rollBig],
    [0.5, wrapR],
  ])
}

// ═════════════════════════════════════════════════════════════
// 3. 圆柱的侧面积（例 3、做一做；例 4 做一做 1；练习四 2、3、10）
// ═════════════════════════════════════════════════════════════

/** 例 3 做一做：罐头商标纸（半径 × 高是 25 的倍数，侧面积是整数） */
export const LABEL_RH: [number, number][] = [
  [5, 10],
  [5, 5],
  [5, 15],
  [5, 20],
  [10, 5],
  [10, 10],
  [10, 15],
  [10, 20],
]
/** 例 4 做一做 1(1)：底面周长、高（米） */
export const SIDE_CH: [number, number][] = [
  [1.6, 0.7],
  [2.4, 0.5],
  [1.2, 0.8],
  [3.5, 0.6],
  [2.5, 1.2],
  [1.8, 0.4],
]
/** 例 4 做一做 1(2)：底面半径、高（分米） */
export const SIDE_RH: [number, number][] = [
  [3.2, 5],
  [1.5, 4],
  [2.5, 2],
  [0.5, 10],
  [1.2, 3],
  [0.8, 6],
]
/** 例 4 (1)：厨师帽的帽顶直径、高（直径 × 高是 50 的倍数） */
export const HAT_DH: [number, number][] = [
  [20, 30],
  [20, 25],
  [10, 30],
  [20, 20],
  [10, 25],
  [20, 35],
]
/** 练习四 2：压路机前轮的直径、宽度（米） */
export const ROLLER_DW: [number, number][] = [
  [1.2, 2],
  [1, 2],
  [1.5, 2],
  [0.8, 2],
  [1.2, 1.5],
]
/** 练习四 3：广告柱的直径、高（米） */
export const POSTER_DH: [number, number][] = [
  [1.5, 2.5],
  [1, 2.5],
  [1.2, 3],
  [0.8, 2.5],
  [2, 2.5],
]
/** 例 2 + 例 3：侧面展开的长方形的两条边（积是整数） */
export const RECT_AB: [number, number][] = [
  [31.4, 20],
  [12.56, 25],
  [18.84, 25],
  [25.12, 25],
  [62.8, 5],
  [31.4, 10],
]

function cylSideGen(d: Difficulty, rng: RNG): Question {
  const kp = KP_CS
  const what: Gen = () => pick(kp, d, rng, 'what', [text('sd.what')], K('s.rect'), [K('s.circle'), K('s.triangle'), K('s.trap')])
  const formula: Gen = () => pick(kp, d, rng, 'formula', [text('sd.formula')], K('f.cTimesH'), [K('f.baseTimesH'), K('f.cPlusH'), K('f.rTimesH')])
  const byWords = (by: 'r' | 'd'): Gen => () =>
    by === 'r'
      ? pick(kp, d, rng, 'words-r', [text('sd.words.r')], K('f.side.r'), [K('f.side.r1'), K('f.side.r2')])
      : pick(kp, d, rng, 'words-d', [text('sd.words.d')], K('f.side.d'), [K('f.side.d2'), K('f.side.d1')])
  const label: Gen = () => {
    const [r, h] = rng.pick(LABEL_RH)
    const v = lateral(r, h)
    return num(kp, d, rng, `label-${r}-${h}`, [text('sd.label', { r, h })], v, [v / 2, surface(r, h), cylVol(r, h), 2 * v])
  }
  const byC: Gen = () => {
    const [c, h] = rng.pick(SIDE_CH)
    const v = c * h
    return val(kp, d, rng, `byC-${c}-${h}`, [text('sd.byC', { c, h })], v, [v * 10, v / 10, v * 2, c + h])
  }
  const byR: Gen = () => {
    const [r, h] = rng.pick(SIDE_RH)
    return val(kp, d, rng, `byR-${r}-${h}`, [text('sd.byR', { r, h }), solid([cylLab(r, h, { r: String(r), h: String(h) })])], lateral(r, h), [PI * r * h, PI * r * r * h, 4 * PI * r * h])
  }
  const hat: Gen = () => {
    const [dd, h] = rng.pick(HAT_DH)
    const v = PI * dd * h
    return val(kp, d, rng, `hat-${dd}-${h}`, [text('sd.hat', { d: dd, h })], v, [2 * v, v / 2, v + baseArea(dd / 2)])
  }
  const roller: Gen = () => {
    const [dd, w] = rng.pick(ROLLER_DW)
    const v = PI * dd * w
    return val(kp, d, rng, `roller-${dd}-${w}`, [text('sd.roller', { d: dd, w }), solid([cylLab(dd / 2, w, { d: String(dd), h: String(w) }, { pose: 'side', tone: 3 })])], v, [2 * v, v / 2, (PI * dd * dd * w) / 4])
  }
  const poster: Gen = () => {
    const [dd, h] = rng.pick(POSTER_DH)
    const v = PI * dd * h
    return val(kp, d, rng, `poster-${dd}-${h}`, [text('sd.poster', { d: dd, h })], v, [2 * v, v / 2, v * 10])
  }
  const height: Gen = () => {
    const r = rng.int(1, 5)
    const h = rng.int(5, 20)
    const s = lateral(r, h)
    return num(kp, d, rng, `height-${r}-${h}`, [text('sd.height', { s: fmt(s), r })], h, [2 * h, h + r, r * h])
  }
  const cInt: Gen = () => {
    const c = rng.pick([30, 25, 40, 18, 24, 36])
    const h = rng.pick([12, 10, 8, 15, 20])
    return num(kp, d, rng, `cInt-${c}-${h}`, [text('sd.byCcm', { c, h })], c * h, [(c * h) / 2, c + h, 2 * c * h])
  }
  const rect: Gen = () => {
    const [a, b] = rng.pick(RECT_AB)
    const v = r6(a * b)
    return num(kp, d, rng, `rect-${a}-${b}`, [text('sd.rect', { a, b })], v, [v / 2, 2 * v, r6(2 * (a + b))])
  }
  const truth: Gen = () => {
    const f = rng.pick([
      ['cTimesH', true],
      ['baseTimesH', false],
      ['rTimesH', false],
    ] as [string, boolean][])
    return judge(kp, d, rng, `judge-${f[0]}`, [text(`sd.j.${f[0]}`)], f[1])
  }
  // 第 2 档：压路机转几周；反推半径、底面周长；平方厘米换成平方米
  const rollerN: Gen = () => {
    const [dd, w] = rng.pick(ROLLER_DW)
    const n = rng.int(2, 6)
    const v = PI * dd * w * n
    return val(kp, d, rng, `rollerN-${dd}-${w}-${n}`, [text('sd.rollerN', { d: dd, w, n })], v, [PI * dd * w, v * 2, (v / 2)])
  }
  const radius: Gen = () => {
    const r = rng.int(1, 6)
    const h = rng.int(4, 15)
    const s = lateral(r, h)
    return num(kp, d, rng, `radius-${r}-${h}`, [text('sd.radius', { s: fmt(s), h })], r, [2 * r, r + 1, h])
  }
  const circ: Gen = () => {
    const c = rng.pick([30, 25, 40, 18, 24, 36, 45])
    const h = rng.pick([12, 10, 8, 15, 20])
    return num(kp, d, rng, `circ-${c}-${h}`, [text('sd.circ', { s: c * h, h })], c, [c * 2, c / 2, c + h])
  }
  const toM2: Gen = () => {
    const [dd, h] = rng.pick([
      [20, 50],
      [40, 100],
      [10, 200],
      [30, 100],
    ] as [number, number][])
    const cm2 = PI * dd * h
    return decPick(kp, d, rng, `toM2-${dd}-${h}`, [text('sd.toM2', { d: dd, h })], cm2 / 10000, [cm2 / 1000, cm2 / 100, cm2 / 100000])
  }
  // 第 3 档：同一张长方形纸两种围法，侧面积一样大
  const same: Gen = () => {
    const a = rng.int(12, 30)
    const b = rng.int(5, a - 3)
    return pick(kp, d, rng, `same-${a}-${b}`, [text('sd.same', { a, b })], K('sameBig'), [K('asCBig', { n: a }), K('asCBig', { n: b })])
  }
  if (d === 1)
    return pickBy(rng, [
      [0.7, what],
      [0.8, formula],
      [0.6, byWords('r')],
      [0.6, byWords('d')],
      [1.4, label],
      [1, byC],
      [1, byR],
      [1, hat],
      [1, roller],
      [0.9, poster],
      [1, height],
      [0.8, cInt],
      [0.8, rect],
      [0.6, truth],
    ])
  if (d === 2)
    return pickBy(rng, [
      [1, rollerN],
      [1, radius],
      [1, circ],
      [1, toM2],
      [0.5, height],
    ])
  return pickBy(rng, [
    [1, same],
    [1, toM2],
    [0.5, rollerN],
  ])
}

// ═════════════════════════════════════════════════════════════
// 4. 圆柱的表面积（例 3、例 4、做一做 2；练习四 1、5–8、11；整理和复习 2、3）
// ═════════════════════════════════════════════════════════════

/** 表面积是整数的半径、高（半径 × (半径 + 高) 是 25 的倍数） */
export const SURF_INT: [number, number][] = [
  [5, 5],
  [5, 10],
  [5, 15],
  [5, 20],
  [10, 5],
  [10, 10],
  [10, 15],
]
export const SURF_DEC: [number, number][] = [
  [5, 12],
  [2, 5],
  [3, 4],
  [4, 10],
  [3, 10],
  [2, 8],
]
/** 练习四 1：直径、高 */
export const SURF_D: [number, number][] = [
  [4, 8],
  [6, 12],
  [14, 5],
  [10, 4],
  [8, 10],
  [12, 6],
]
/** 例 4 厨师帽的变式（帽顶直径、高）：进一法和四舍五入取整十数结果不一样 */
export const HAT_ROUND: [number, number][] = [
  [20, 24],
  [20, 25],
  [20, 28],
  [20, 32],
  [18, 26],
  [22, 30],
  [24, 26],
]
/** 例 4 做一做 2 笔筒的变式（直径、高）：同上 */
export const PEN_ROUND: [number, number][] = [
  [8, 10],
  [8, 12],
  [8, 14],
  [6, 13],
  [10, 10],
  [10, 11],
  [12, 13],
]
/** 要算哪几个面：只有侧面、侧面和一个底面、侧面和两个底面 */
export const FACE_CTX: { id: string; ans: 'side' | 'one' | 'two' }[] = [
  { id: 'bucket', ans: 'one' },
  { id: 'pen', ans: 'one' },
  { id: 'chef', ans: 'one' },
  { id: 'tin', ans: 'two' },
  { id: 'drum', ans: 'two' },
  { id: 'label', ans: 'side' },
  { id: 'roller', ans: 'side' },
  { id: 'pipe', ans: 'side' },
]
/** 做一顶帽子（圆柱的侧面 + 一个底面，帽口不用料） */
export const hatCloth = (dd: number, h: number): number => r6(PI * dd * h + baseArea(dd / 2))

function cylSurfaceGen(d: Difficulty, rng: RNG): Question {
  const kp = KP_CA
  const formula: Gen = () => pick(kp, d, rng, 'formula', [text('sf.formula')], K('f.surf'), [K('f.surf1'), K('f.baseTimesH'), K('f.cTimesH')])
  const base: Gen = () => {
    const r = rng.pick([10, 20, 2, 3, 4, 5, 6])
    const v = baseArea(r)
    return val(kp, d, rng, `base-${r}`, [text('sf.base', { r })], v, [2 * PI * r, PI * 4 * r * r, PI * r])
  }
  const surfR: Gen = () => {
    const [r, h] = rng.chance(0.55) ? rng.pick(SURF_INT) : rng.pick(SURF_DEC)
    const v = surface(r, h)
    return val(kp, d, rng, `surfR-${r}-${h}`, [text('sf.fig'), solid([cylLab(r, h, { r: String(r), h: String(h) })])], v, [lateral(r, h) + baseArea(r), lateral(r, h), lateral(r, h) + 2 * baseArea(2 * r)])
  }
  const surfD: Gen = () => {
    const [dd, h] = rng.pick(SURF_D)
    const r = dd / 2
    return val(kp, d, rng, `surfD-${dd}-${h}`, [text('sf.fig'), solid([cylLab(r, h, { d: String(dd), h: String(h) })])], surface(r, h), [lateral(r, h) + baseArea(r), lateral(r, h), lateral(r, h) + 2 * baseArea(dd)])
  }
  const hat: Gen = () => {
    const [dd, h] = rng.pick(HAT_ROUND)
    const raw = hatCloth(dd, h)
    return num(kp, d, rng, `hat-${dd}-${h}`, [text('sf.hat', { d: dd, h })], ceil10(raw), [round10(raw), floor10(raw) === round10(raw) ? floor10(raw) - 10 : floor10(raw), ceil10(raw + baseArea(dd / 2))])
  }
  const method: Gen = () => pick(kp, d, rng, 'method', [text('sf.method')], K('m.up'), [K('m.down'), K('m.round')])
  const pen: Gen = () => {
    const [dd, h] = rng.pick(PEN_ROUND)
    const raw = hatCloth(dd, h)
    return num(kp, d, rng, `pen-${dd}-${h}`, [text('sf.pen', { d: dd, h })], ceil10(raw), [round10(raw), ceil10(raw + baseArea(dd / 2)), ceil10(PI * dd * h)])
  }
  const faces: Gen = () => {
    const c = rng.pick(FACE_CTX)
    return pick(kp, d, rng, `faces-${c.id}`, [text('sf.which', { ctx: K(`sf.ctx.${c.id}`) })], K(`fc.${c.ans}`), (['side', 'one', 'two'] as const).filter((x) => x !== c.ans).map((x) => K(`fc.${x}`)))
  }
  const lantern: Gen = () => {
    const h = rng.pick([25, 30, 35, 40])
    const v = r6(PI * 20 * h + 2 * baseArea(10) - 2 * 78.5)
    return num(kp, d, rng, `lantern-${h}`, [text('sf.lantern', { h })], v, [v + 157, r6(PI * 20 * h), r6(v + 628)])
  }
  const mixed: Gen = () => {
    if (rng.chance(0.5)) {
      const a = rng.int(3, 9)
      return num(kp, d, rng, `cube-${a}`, [text('sf.cube', { a })], 6 * a * a, [4 * a * a, a * a * a, 12 * a])
    }
    const l = rng.int(6, 15)
    const w = rng.int(4, l - 1)
    const h = rng.int(5, 20)
    const s = 2 * (l * w + l * h + w * h)
    return num(kp, d, rng, `cuboid-${l}-${w}-${h}`, [text('sf.cuboid'), { kind: 'box', items: [{ l, w, h, labels: { l: String(l), w: String(w), h: String(h) } }] }], s, [s / 2, l * w * h, l * w + l * h + w * h + l * w])
  }
  const cutN: Gen = () => {
    const n = rng.int(2, 8)
    return num(kp, d, rng, `cutN-${n}`, [text('sf.cutN', { n })], 2 * (n - 1), [n, 2 * n, n - 1])
  }
  const cutArea: Gen = () => {
    const r = rng.pick([0.5, 0.2, 0.3, 1])
    const n = rng.pick([3, 4, 5])
    const b = baseArea(r)
    return val(kp, d, rng, `cutArea-${r}-${n}`, [text('sf.cutArea', { r, n })], 2 * (n - 1) * b, [(n - 1) * b, n * b, 2 * n * b])
  }
  // 第 2 档：帽子黑布红布；练习四 1 大一点的数；整理和复习 2 表格、3 布套
  const hatColor: Gen = () => {
    const [h, w] = rng.pick([
      [10, 10],
      [10, 10],
      [8, 10],
      [12, 10],
      [10, 8],
      [10, 12],
    ] as [number, number][])
    const black = PI * 20 * h + baseArea(10)
    const red = PI * ((10 + w) ** 2 - 100)
    const ans = Math.abs(black - red) < 1e-6 ? 'same' : black > red ? 'black' : 'red'
    return pick(kp, d, rng, `hatColor-${h}-${w}`, [text('sf.hatColor', { h, w })], K(`cl.${ans}`), (['black', 'red', 'same'] as const).filter((x) => x !== ans).map((x) => K(`cl.${x}`)))
  }
  const big: Gen = () => {
    const [dd, h] = rng.pick([
      [40, 3],
      [18, 15],
      [30, 4],
      [24, 5],
    ] as [number, number][])
    const r = dd / 2
    return val(kp, d, rng, `big-${dd}-${h}`, [text('sf.fig'), solid([cylLab(r, h, { d: String(dd), h: String(h) })])], surface(r, h), [lateral(r, h) + baseArea(r), lateral(r, h), 2 * baseArea(r)])
  }
  const table: Gen = () => {
    const [r, h, u] = rng.pick([
      [5, 4, 'dm2'],
      [1, 0.7, 'm2'],
      [20, 5, 'cm2'],
    ] as [number, number, U][])
    const len = u === 'dm2' ? 'dm' : u === 'm2' ? 'm' : 'cm'
    const given = r === 1 ? text('sf.tableD', { d: 2, h, u: unitL(len), s: unitL(u) }) : text('sf.tableR', { r, h, u: unitL(len), s: unitL(u) })
    return val(kp, d, rng, `table-${r}-${h}`, [given], surface(r, h), [lateral(r, h) + baseArea(r), lateral(r, h), cylVol(r, h)])
  }
  const cover: Gen = () => {
    const h = rng.pick([20, 15, 25])
    const v = surface(5, h)
    return num(kp, d, rng, `cover-${h}`, [text('sf.cover', { h }), solid([cylLab(5, h, { d: '10', h: String(h) }, { tone: 0 })])], v, [lateral(5, h), r6(lateral(5, h) + 2 * baseArea(10)), r6(2 * baseArea(5))])
  }
  // 第 3 档：练习四 4 装箱；沿直径切成两半；练习四 8 无盖水桶
  const box: Gen = () => {
    const [cols, rows] = rng.pick([
      [6, 4],
      [4, 3],
      [5, 4],
      [6, 2],
    ] as [number, number][])
    const dd = rng.pick([6, 8])
    const h = 2 * dd
    const ask = rng.pick(['long', 'short', 'high'] as const)
    const v = ask === 'long' ? cols * dd : ask === 'short' ? rows * dd : h
    const items: GeoItem[] = [{ t: 'poly', pts: [[0, 0], [0, rows * 2], [cols * 2, rows * 2], [cols * 2, 0]], fill: 'paper', stroke: 'ink' }]
    for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) items.push({ t: 'dot', at: [1 + 2 * i, 1 + 2 * j], r: 1, fill: 'b', stroke: 'b' })
    return num(
      kp, d, rng, `box-${cols}-${rows}-${dd}-${ask}`,
      [text('sf.box', { n: cols * rows, d: dd, h }), text(`sf.box.${ask}`), geo([{ w: cols * 2, h: rows * 2, px: 22, items }], `从上面看：${rows} 排，每排 ${cols} 罐`)],
      v,
      [ask === 'high' ? h * rows : cols * rows * dd, ask === 'long' ? rows * dd : cols * dd, v / 2],
    )
  }
  const half: Gen = () => {
    const dd = rng.pick([4, 6, 8, 10])
    const h = rng.pick([5, 8, 10, 12])
    return num(kp, d, rng, `half-${dd}-${h}`, [text('sf.half', { d: dd, h })], 2 * dd * h, [dd * h, 4 * dd * h, dd * h + dd])
  }
  const bucket: Gen = () => val(kp, d, rng, 'bucket', [text('sf.bucket')], hatCloth(8, 12), [surface(4, 12), lateral(4, 12), hatCloth(8, 12) + 2 * baseArea(4)])
  if (d === 1)
    return pickBy(rng, [
      [0.8, formula],
      [0.8, base],
      [1.4, surfR],
      [1.2, surfD],
      [1.2, hat],
      [0.6, method],
      [1.1, pen],
      [1.2, faces],
      [0.8, lantern],
      [0.8, mixed],
      [0.8, cutN],
      [0.8, cutArea],
    ])
  if (d === 2)
    return pickBy(rng, [
      [1.2, hatColor],
      [1, big],
      [1, table],
      [1, cover],
      [0.5, cutArea],
    ])
  return pickBy(rng, [
    [1, box],
    [1, half],
    [1, bucket],
  ])
}

// ═════════════════════════════════════════════════════════════
// 5. 圆柱的体积（例 5、做一做；练习五 1、4、6、9、12、14*、15*；练习七 1、3、4）
// ═════════════════════════════════════════════════════════════

/** 练习五 1①：体积是整数的半径、高（半径² × 高是 50 的倍数） */
export const VOL_INT: [number, number][] = [
  [5, 2],
  [5, 4],
  [5, 6],
  [10, 2],
  [10, 3],
  [5, 8],
]
/** 练习五 1②：直径、高（小数） */
export const VOL_D: [number, number][] = [
  [4, 12],
  [6, 10],
  [8, 5],
  [4, 10],
  [6, 8],
  [2, 12],
]
/** 练习五 1③：横放的圆柱（左端的直径、长度） */
export const VOL_SIDE: [number, number][] = [
  [8, 8],
  [6, 10],
  [4, 15],
  [10, 6],
  [6, 12],
]
/** 做一做 2：水井的直径、深（米） */
export const WELL_DH: [number, number][] = [
  [1, 10],
  [1, 8],
  [2, 10],
  [1, 12],
  [1.2, 10],
]

function cylVolumeGen(d: Difficulty, rng: RNG): Question {
  const kp = KP_CV
  const toBox = (q: 'base' | 'h'): Gen => () =>
    q === 'base'
      ? pick(kp, d, rng, 'toBox-base', [text('v.toBox'), text('v.toBox.base')], K('w.base'), [K('w.side'), K('w.surface'), K('p.c')])
      : pick(kp, d, rng, 'toBox-h', [text('v.toBox'), text('v.toBox.h')], K('p.h'), [K('p.r'), K('p.c'), K('p.d')])
  const more: Gen = () => pick(kp, d, rng, 'more', [text('v.more')], K('s.cuboid'), [K('s.cylinder'), K('s.cone'), K('s.cube')])
  const formula: Gen = () => pick(kp, d, rng, 'formula', [text('v.formula')], K('f.baseTimesH'), [K('f.cTimesH'), K('f.surf'), K('f.third')])
  const words: Gen = () => pick(kp, d, rng, 'words', [text('v.words')], K('f.vol.r'), [K('f.side.r'), K('f.vol.d')])
  const bySh: Gen = () => {
    const s = rng.pick([75, 60, 48, 120, 25, 36])
    const h = rng.pick([90, 80, 50, 120, 100, 30])
    return num(kp, d, rng, `bySh-${s}-${h}`, [text('v.bySh', { s, h })], s * h, [(s * h) / 3, s + h, 2 * s * h])
  }
  const well: Gen = () => {
    const [dd, h] = rng.pick(WELL_DH)
    const r = dd / 2
    return val(kp, d, rng, `well-${dd}-${h}`, [text('v.well', { d: dd, h })], cylVol(r, h), [cylVol(dd, h), PI * r * h, cylVol(r, h) * 10])
  }
  const byR: Gen = () => {
    const [r, h] = rng.pick(VOL_INT)
    const v = cylVol(r, h)
    return num(kp, d, rng, `byR-${r}-${h}`, [text('v.fig'), solid([cylLab(r, h, { r: String(r), h: String(h) })])], v, [cylVol(2 * r, h), lateral(r, h), v / 3, v * 2])
  }
  const byD: Gen = () => {
    const [dd, h] = rng.pick(VOL_D)
    const r = dd / 2
    return val(kp, d, rng, `byD-${dd}-${h}`, [text('v.fig'), solid([cylLab(r, h, { d: String(dd), h: String(h) }, { dAt: rng.chance(0.5) ? 'bottom' : 'top' })])], cylVol(r, h), [cylVol(dd, h), PI * r * h, cylVol(r, h) / 3])
  }
  const side: Gen = () => {
    const [dd, l] = rng.pick(VOL_SIDE)
    const r = dd / 2
    return val(kp, d, rng, `side-${dd}-${l}`, [text('v.fig'), solid([cylLab(r, l, { d: String(dd), h: String(l) }, { pose: 'side' })])], cylVol(r, l), [cylVol(dd, l), lateral(r, l), PI * r * l])
  }
  const height: Gen = () => {
    const s = rng.pick([16, 12, 25, 30, 50, 20])
    const h = rng.int(3, 12)
    return num(kp, d, rng, `height-${s}-${h}`, [text('v.height', { v: s * h, s })], h, [s * h * s, s - h > 0 ? s - h : s + h, h * 3])
  }
  const truth: Gen = () => {
    const f = rng.pick([
      ['baseTimesH', true],
      ['cTimesH', false],
      ['sideTimesH', false],
    ] as [string, boolean][])
    return judge(kp, d, rng, `judge-${f[0]}`, [text(`v.j.${f[0]}`)], f[1])
  }
  const cuboid: Gen = () => {
    const l = rng.int(8, 20)
    const w = rng.int(4, l - 2)
    const h = rng.int(5, 25)
    return num(kp, d, rng, `cuboid-${l}-${w}-${h}`, [text('v.cuboid'), { kind: 'box', items: [{ l, w, h, labels: { l: String(l), w: String(w), h: String(h) } }] }], l * w * h, [2 * (l * w + l * h + w * h), (l * w * h) / 2, l * w + h])
  }
  // 第 2 档：等底的两个圆柱；长方形旋转；钢坯熔铸；正方体削成最大的圆柱；同一个圆柱的表面积和体积；钢管；整理和复习 2
  const sameBase: Gen = () => {
    const [s, h1, h2] = rng.pick([
      [18, 4.5, 3],
      [12, 2.5, 4],
      [20, 6, 3],
      [15, 4, 2],
      [16, 2.5, 5],
    ] as [number, number, number][])
    const v1 = r6(s * h1)
    return num(kp, d, rng, `sameBase-${s}-${h1}-${h2}`, [text('v.sameBase', { h1, v: v1, h2 })], s * h2, [v1, r6((v1 * h1) / h2), v1 - s])
  }
  const spin: Gen = () => {
    const [a, b] = rng.pick([
      [10, 20],
      [5, 10],
      [6, 10],
      [10, 4],
      [8, 5],
    ] as [number, number][])
    const axis = rng.pick(['AB', 'BC'] as const)
    const r = axis === 'AB' ? b : a
    const h = axis === 'AB' ? a : b
    return val(
      kp, d, rng, `spin-${a}-${b}-${axis}`,
      [text('unitIs', { u: unitL('cm') }), text('v.spin', { e: axis }), geo([rectFig(a, b, axis)], `长方形 ABCD，AB 边长 ${a}，BC 边长 ${b}，红线是 ${axis} 边`)],
      cylVol(r, h),
      [cylVol(h, r), lateral(r, h), cylVol(r / 2, h)],
    )
  }
  const melt: Gen = () => {
    const rr = rng.pick([2, 2, 1])
    const a = baseArea(rr)
    const b = rng.int(3, 6)
    const c = rng.int(3, 6)
    return num(
      kp, d, rng, `melt-${rr}-${b}-${c}`,
      [text('unitIs', { u: unitL('dm') }), text('v.melt', { d: 2 * rr }), { kind: 'box', items: [{ l: a, w: b, h: c, labels: { l: fmt(a), w: String(b), h: String(c) } }] }],
      b * c,
      [b * c * 4, (b * c) / 4, b + c],
      { input: 'choice' },
    )
  }
  const cubeMax = (q: 'd' | 'v'): Gen => () => {
    const a = rng.pick([4, 6, 10, 2, 8])
    if (q === 'd') return num(kp, d, rng, `cubeD-${a}`, [text('v.cubeMax', { a }), text('v.cubeMax.d')], a, [a / 2, 2 * a, a * a])
    return val(kp, d, rng, `cubeV-${a}`, [text('v.cubeMax', { a }), text('v.cubeMax.v')], cylVol(a / 2, a), [cylVol(a, a), a * a * a, lateral(a / 2, a)])
  }
  const both: Gen = () => {
    const [dd, h] = rng.pick([
      [6, 12],
      [14, 5],
      [8, 10],
    ] as [number, number][])
    const r = dd / 2
    const ask = rng.pick(['surf', 'vol'] as const)
    const v = ask === 'surf' ? surface(r, h) : cylVol(r, h)
    return val(kp, d, rng, `both-${dd}-${h}-${ask}`, [text(ask === 'surf' ? 'v.both.surf' : 'v.both.vol'), solid([cylLab(r, h, { d: String(dd), h: String(h) })])], v, ask === 'surf' ? [cylVol(r, h), lateral(r, h), lateral(r, h) + baseArea(r)] : [surface(r, h), cylVol(dd, h), lateral(r, h)])
  }
  const pipe: Gen = () => {
    const [D, dd, l] = rng.pick([
      [10, 8, 80],
      [10, 6, 50],
      [12, 10, 60],
      [8, 6, 100],
    ] as [number, number, number][])
    const v = r6(PI * ((D / 2) ** 2 - (dd / 2) ** 2) * l)
    return val(kp, d, rng, `pipe-${D}-${dd}-${l}`, [text('v.pipe', { D, d: dd, l })], v, [cylVol(D / 2, l), r6(PI * (D / 2 - dd / 2) ** 2 * l), r6(PI * (D * D - dd * dd) * l)])
  }
  const table: Gen = () => {
    const [r, h, u] = rng.pick([
      [5, 4, 'dm3'],
      [1, 0.7, 'm3'],
      [20, 5, 'cm3'],
    ] as [number, number, U][])
    const len = u === 'dm3' ? 'dm' : u === 'm3' ? 'm' : 'cm'
    const given = r === 1 ? text('v.tableD', { d: 2, h, u: unitL(len), s: unitL(u) }) : text('v.tableR', { r, h, u: unitL(len), s: unitL(u) })
    return val(kp, d, rng, `table-${r}-${h}`, [given], cylVol(r, h), [cylVol(2 * r, h), lateral(r, h), surface(r, h)])
  }
  // 第 3 档：练习五 15* 卷成圆柱哪个体积最大；练习七 3 零件上的孔
  const rollMax: Gen = () => {
    const sides: [number, number][] = [
      [18, 2],
      [12, 3],
      [9, 4],
      [6, 6],
    ]
    const big = rng.chance(0.5)
    // 用较长的边作底面周长：V = 周长² × 高 ÷ (4 × 3.14) = 36 × 周长 ÷ 12.56，周长越长体积越大
    const ans = big ? 0 : 3
    const figs: GeoFig[] = sides.map(([a, b]) => ({ w: a, h: b, px: 8, items: [{ t: 'poly', pts: [[0, 0], [0, b], [a, b], [a, 0]], fill: 'b', stroke: 'b', labels: [null, null, String(b), String(a)] }] }))
    return num(kp, d, rng, `rollMax-${big ? 'max' : 'min'}`, [text('unitIs', { u: unitL('dm') }), text(big ? 'v.rollMax' : 'v.rollMin'), geo(figs, '四个面积都是 36 平方分米的长方形', true)], ans + 1, [], { input: 'choice', min: 1, max: 4 })
  }
  const holes: Gen = () => {
    const v = r6(PI * 10 * (36 - 4 - 8)) / 1000
    return decPick(kp, d, rng, 'holes', [text('v.holes')], Math.round(v * 100) / 100, [1.13, 1, 7.54, 0.88])
  }
  if (d === 1)
    return pickBy(rng, [
      [0.7, toBox('base')],
      [0.7, toBox('h')],
      [0.5, more],
      [0.8, formula],
      [0.6, words],
      [1.1, bySh],
      [1, well],
      [1.3, byR],
      [1.2, byD],
      [1, side],
      [1, height],
      [0.6, truth],
      [0.6, cuboid],
    ])
  if (d === 2)
    return pickBy(rng, [
      [1, sameBase],
      [1, spin],
      [1, melt],
      [0.6, cubeMax('d')],
      [0.6, cubeMax('v')],
      [0.8, both],
      [0.8, pipe],
      [0.8, table],
    ])
  return pickBy(rng, [
    [1, rollMax],
    [1, holes],
    [0.5, spin],
  ])
}

// ═════════════════════════════════════════════════════════════
// 6. 圆柱的容积（例 6、做一做 1、2；例 7；练习五 2、3、5、7、8、10、11、13；练习七 5*）
// ═════════════════════════════════════════════════════════════

/** 例 7 瓶子：底面直径、正放时水高、倒过来以后没有水的部分高（容积是整数） */
export const BOTTLE: [number, number, number][] = [
  [8, 7, 18],
  [8, 10, 15],
  [8, 12, 13],
  [10, 8, 12],
  [10, 9, 15],
  [10, 6, 14],
]

function cylCapacityGen(d: Difficulty, rng: RNG): Question {
  const kp = KP_CC
  // 例 6：杯子能不能装下几袋牛奶（数据从里面测量）
  const cupData = (): [number, number, number, number] => {
    for (;;) {
      const dd = rng.pick([6, 8, 8, 10])
      const h = rng.pick([8, 10, 10, 12])
      const bag = rng.pick([240, 250, 200])
      const n = rng.pick([1, 2, 2, 3])
      const cap = cylVol(dd / 2, h)
      if (Math.abs(cap - n * bag) >= 30) return [dd, h, bag, n]
    }
  }
  const cupFit: Gen = () => {
    const [dd, h, bag, n] = cupData()
    const ok = cylVol(dd / 2, h) >= n * bag
    return pick(kp, d, rng, `cupFit-${dd}-${h}-${bag}-${n}`, [text('c.cup', { d: dd, h }), text('c.cupFit', { n, v: bag }), solid([cylLab(dd / 2, h, { d: String(dd), h: String(h) }, { tone: 3 })])], ok ? K('fit') : K('noFit'), [ok ? K('noFit') : K('fit')])
  }
  const cupCap: Gen = () => {
    const dd = rng.pick([6, 8, 10])
    const h = rng.pick([8, 10, 12])
    const r = dd / 2
    return val(kp, d, rng, `cupCap-${dd}-${h}`, [text('c.cup', { d: dd, h }), text('c.cupCap'), solid([cylLab(r, h, { d: String(dd), h: String(h) }, { tone: 3 })])], cylVol(r, h), [cylVol(dd, h), lateral(r, h), PI * r * h])
  }
  const thermos: Gen = () => {
    for (;;) {
      const dd = rng.pick([8, 10, 12])
      const h = rng.pick([15, 20, 25])
      const l = rng.pick([1, 1, 1.5, 2])
      const cap = cylVol(dd / 2, h)
      if (Math.abs(cap - l * 1000) < 50) continue
      return pick(kp, d, rng, `thermos-${dd}-${h}-${l}`, [text('c.thermos', { d: dd, h, l })], cap >= l * 1000 ? K('enough') : K('notEnough'), [cap >= l * 1000 ? K('notEnough') : K('enough')])
    }
  }
  const pool: Gen = () => {
    const [r, h] = rng.pick([
      [5, 3.2],
      [5, 2],
      [4, 2.5],
      [3, 2],
      [10, 2],
    ] as [number, number][])
    return val(kp, d, rng, `pool-${r}-${h}`, [text('c.pool', { r, h })], cylVol(r, h), [cylVol(r / 2, h), lateral(r, h), cylVol(r, h) * 10])
  }
  const bottle: Gen = () => {
    const [dd, a, b] = rng.pick(BOTTLE)
    const body = Math.max(a, b) + 2
    const v = cylVol(dd / 2, a + b)
    return num(
      kp, d, rng, `bottle-${dd}-${a}-${b}`,
      [text('c.bottle', { d: dd, a, b }), solid([{ shape: 'bottle', r: dd / 2, h: body, water: a, labels: { water: String(a) } }, { shape: 'bottle', r: dd / 2, h: body, pose: 'down', water: b, labels: { water: String(b) } }], { arrow: true })],
      v,
      [cylVol(dd, a + b), r6(PI * dd * (a + b)), (dd / 2) ** 2 * (a + b), cylVol(dd / 2, a), cylVol(dd / 2, b)],
      { input: 'choice' },
    )
  }
  const bottleWhat: Gen = () => pick(kp, d, rng, 'bottleWhat', [text('c.bottleWhat')], K('bw.sum'), [K('bw.diff'), K('bw.water'), K('bw.air')])
  const bottleSame: Gen = () => pick(kp, d, rng, 'bottleSame', [text('c.bottleSame')], K('same.no'), [K('same.more'), K('same.less')])
  const oil: Gen = () => {
    const [dd, h] = rng.pick([
      [60, 90],
      [40, 50],
      [50, 80],
      [60, 100],
      [40, 80],
    ] as [number, number][])
    const cm3 = cylVol(dd / 2, h)
    return val(kp, d, rng, `oil-${dd}-${h}`, [text('c.oil', { d: dd, h })], cm3 / 1000, [cm3, cylVol(dd, h) / 1000, cm3 / 10000])
  }
  const beds: Gen = () => {
    const [dd, H, f] = rng.pick([
      [4, 0.8, 0.5],
      [2, 0.6, 0.5],
      [4, 1, 0.6],
      [6, 0.8, 0.5],
    ] as [number, number, number][])
    const r = dd / 2
    return val(kp, d, rng, `beds-${dd}-${H}-${f}`, [text('c.beds', { d: dd, H, f })], 2 * cylVol(r, f), [cylVol(r, f), 2 * cylVol(r, H), 2 * cylVol(dd, f)])
  }
  const granary: Gen = () => {
    const [r, h] = rng.pick([
      [1, 2],
      [2, 2],
      [1, 3],
      [2, 1.5],
    ] as [number, number][])
    const kg = cylVol(r, h) * 750
    return val(kp, d, rng, `granary-${r}-${h}`, [text('c.granary', { r, h })], kg / 1000, [kg, (lateral(r, h) * 750) / 1000, (cylVol(r / 2, h) * 750) / 1000])
  }
  const juice: Gen = () => {
    for (;;) {
      const dd = rng.pick([6, 6, 8])
      const h = rng.pick([10, 11, 12])
      const k = rng.pick([2, 3, 4])
      const l = 1
      const need = (k + 1) * cylVol(dd / 2, h)
      if (Math.abs(need - l * 1000) < 50) continue
      return pick(kp, d, rng, `juice-${dd}-${h}-${k}`, [text('c.juice', { d: dd, h, k })], need <= 1000 ? K('enough') : K('notEnough'), [need <= 1000 ? K('notEnough') : K('enough')])
    }
  }
  const iron: Gen = () => {
    const [dd, x] = rng.pick([
      [10, 2],
      [10, 4],
      [20, 1],
      [20, 2],
      [20, 3],
      [10, 6],
    ] as [number, number][])
    const v = cylVol(dd / 2, x)
    return num(kp, d, rng, `iron-${dd}-${x}`, [text('c.iron', { d: dd, x })], v, [cylVol(dd, x), v * 2, lateral(dd / 2, x)])
  }
  const tea: Gen = () => {
    for (;;) {
      const s = rng.pick([30, 24, 36])
      const h = rng.pick([10, 8, 12])
      const m = rng.pick([3, 4, 5])
      if ((s * h * m) % 6) continue
      return num(kp, d, rng, `tea-${s}-${h}-${m}`, [text('c.tea', { s, h, m })], (s * h * m) / 6, [s * h, (s * h * m) / 4, s * h * m])
    }
  }
  // 第 2 档：月亮门；水龙头接水；水壶能不能装下 1.6 升
  const gate: Gen = () => {
    const [dd, t] = rng.pick([
      [2, 25],
      [2, 30],
      [2.4, 25],
    ] as [number, number][])
    const total = 35
    const v = r6(total - cylVol(dd / 2, t / 100))
    return decPick(kp, d, rng, `gate-${dd}-${t}`, [text('c.gate', { d: dd, t })], v, [total - cylVol(dd, t / 100), total + cylVol(dd / 2, t / 100), total - PI * (dd / 2) * (t / 100)])
  }
  const faucet: Gen = () => {
    const [dd, sp, sec] = rng.pick([
      [1.2, 20, 50],
      [1.2, 20, 40],
      [1, 20, 50],
      [2, 10, 40],
    ] as [number, number, number][])
    const ml = cylVol(dd / 2, sp * sec)
    return pick(kp, d, rng, `faucet-${dd}-${sp}-${sec}`, [text('c.faucet', { d: dd, sp, sec })], ml >= 1000 ? K('can') : K('cannot'), [ml >= 1000 ? K('cannot') : K('can')])
  }
  const flask: Gen = () => {
    const [h, l] = rng.pick([
      [20, 1.6],
      [22, 1.6],
      [20, 1.5],
    ] as [number, number][])
    const ml = cylVol(5, h)
    return pick(kp, d, rng, `flask-${h}-${l}`, [text('c.flask', { h, l })], ml >= l * 1000 ? K('fit') : K('noFit'), [ml >= l * 1000 ? K('noFit') : K('fit')])
  }
  // 第 3 档：桶口斜的木桶；石头放进去水面上升
  const slant: Gen = () => decPick(kp, d, rng, 'slant', [text('c.slant')], cylVol(2, 5), [cylVol(2, 7), cylVol(2, 6), cylVol(4, 5)])
  const rise: Gen = () => {
    const [dd, x] = rng.pick([
      [10, 2],
      [20, 1],
      [20, 3],
    ] as [number, number][])
    return num(kp, d, rng, `rise-${dd}-${x}`, [text('c.rise', { d: dd, x })], cylVol(dd / 2, x), [cylVol(dd, x), lateral(dd / 2, x), cylVol(dd / 2, x) * 2])
  }
  if (d === 1)
    return pickBy(rng, [
      [1.1, cupFit],
      [1, cupCap],
      [1, thermos],
      [0.9, pool],
      [1.4, bottle],
      [0.6, bottleWhat],
      [0.6, bottleSame],
      [0.9, oil],
      [0.8, beds],
      [0.8, granary],
      [0.8, juice],
      [1, iron],
      [0.8, tea],
    ])
  if (d === 2)
    return pickBy(rng, [
      [1, gate],
      [1, faucet],
      [1, flask],
      [0.6, bottle],
    ])
  return pickBy(rng, [
    [1, slant],
    [1, rise],
  ])
}

// ═════════════════════════════════════════════════════════════
// 7. 圆锥的认识（例 1、做一做；练习六 1、2）
// ═════════════════════════════════════════════════════════════

export const OK_FACTS: { id: string; truth: boolean }[] = [
  { id: 'circleBase', truth: true },
  { id: 'flatSide', truth: false },
  { id: 'twoBases', truth: false },
  { id: 'oneApex', truth: true },
]
type ConePose = 'up' | 'lie' | 'down'

function coneKnowGen(d: Difficulty, rng: RNG): Question {
  const kp = KP_OK
  const obj: Gen = () => {
    const c = rng.pick(OBJ_CONE)
    const ds = rng.shuffle([...OBJ_OTHER, 'can', 'pillar'] as string[]).slice(0, 3)
    return pick(kp, d, rng, `obj-${c}-${ds.join('.')}`, [text('ck.obj')], K(`o.${c}`), ds.map((x) => K(`o.${x}`)))
  }
  const coneSpec = (pose: ConePose, i: number): RoundSolidSpec => {
    const [r, h] = ([[1, 1.6], [1.3, 1], [0.7, 1.8]] as [number, number][])[i]!
    return { shape: 'cone', r, h, pose }
  }
  const isCone: Gen = () => {
    const n = rng.int(3, 4)
    const pose = rng.pick(['up', 'up', 'lie', 'down'] as ConePose[])
    const i = rng.int(0, 2)
    const others = rng.shuffle(['frustum', 'cylinder', 'sphere', 'cut'] as Other[]).slice(0, n - 1).map((k) => otherSpec(rng, k))
    const at = rng.int(0, n - 1)
    const figs = [...others]
    figs.splice(at, 0, { spec: coneSpec(pose, i), code: `co${pose[0]}${i}` })
    return num(kp, d, rng, `isCone-${figs.map((f) => f.code).join('.')}`, [text('ck.isCone'), numbered(rng, figs.map((f) => f.spec))], at + 1, [], { input: 'choice', min: 1, max: n })
  }
  const baseShape: Gen = () => pick(kp, d, rng, 'baseShape', [text('ck.baseShape')], K('s.circle'), [K('s.triangle'), K('s.square'), K('s.rect')])
  const sideIs: Gen = () => pick(kp, d, rng, 'sideIs', [text('ck.sideIs')], K('p.curved'), [K('p.flat')])
  const heightIs: Gen = () => pick(kp, d, rng, 'heightIs', [text('ck.heightIs')], K('p.h'), [K('p.r'), K('p.d'), K('p.side')])
  const part: Gen = () => {
    const pose = rng.pick(['up', 'up', 'lie', 'down'] as ConePose[])
    const letters = rng.shuffle(['A', 'B', 'C', 'D'])
    const which = rng.int(0, 3)
    const spec: RoundSolidSpec = { ...coneSpec(pose, 0), r: 1.1, h: 1.7, marks: PARTS_CONE.map((at, i) => ({ at, text: letters[i]! })) }
    const ask = letters[which]!
    return pick(
      kp, d, rng, `part-${pose}-${letters.join('')}-${ask}`,
      [text('ck.part', { x: ask }), solid([spec])],
      K(`p.${PARTS_CONE[which]}`),
      PARTS_CONE.filter((_, i) => i !== which).map((x) => K(`p.${x}`)),
    )
  }
  const counts: Gen = () => {
    const what = rng.pick(['bases', 'apexes', 'faces'] as const)
    const v = { bases: 1, apexes: 1, faces: 2 }[what]
    return num(kp, d, rng, `counts-${what}`, [text(`ck.${what}`)], v, [1, 2, 3, 0].filter((x) => x !== v))
  }
  const measure: Gen = () =>
    rng.chance(0.5)
      ? pick(kp, d, rng, 'measure', [text('ck.measure')], K('lay.flat'), [K('lay.upright'), K('lay.slant')])
      : judge(kp, d, rng, 'measureJ', [text('ck.measureJ')], true)
  const spin: Gen = () => pick(kp, d, rng, 'spin', [text('ck.spin')], K('s.cone'), [K('s.cylinder'), K('s.sphere'), K('s.triangle')])
  const SPIN_ANS: Record<SpinFig, string> = { rect: 's.cylinder', tri: 's.cone', triRect: 'rot.coneCyl', tri2Rect: 'rot.cones2' }
  // 三个短选项（打怪兽小屏两人时作答栏只有约 135 像素宽，四个长选项会伸出栏外）
  const rotate = (kinds: SpinFig[]): Gen => () => {
    const kind = rng.pick(kinds)
    const ans = SPIN_ANS[kind]
    const opts = kind === 'tri2Rect' ? ['rot.cones2', 'rot.coneCyl', 's.cone'] : kind === 'triRect' ? ['rot.coneCyl', 'rot.cones2', 's.cylinder'] : ['s.cylinder', 's.cone', 'rot.coneCyl']
    return pick(kp, d, rng, `rotate-${kind}`, [text('ck.rotate'), geo([spinFig(kind)], '一个平面图形，一条边贴着红线')], K(ans), opts.filter((x) => x !== ans).map((x) => K(x)))
  }
  const compose: Gen = () => {
    const look = rng.int(0, 2)
    const [r, h, h2] = ([[1, 1.4, 0.9], [1.2, 1, 0.8], [0.9, 1.6, 1.1]] as [number, number, number][])[look]!
    return pick(kp, d, rng, `compose-${look}`, [text('ck.compose'), solid([{ shape: 'silo', r, h, h2, tone: rng.int(0, 3) }])], K('pair.cylCone'), [K('pair.cyl2'), K('pair.cuboidCone'), K('pair.cylBall')])
  }
  const fact: Gen = () => {
    const f = rng.pick(OK_FACTS)
    return judge(kp, d, rng, `fact-${f.id}`, [text(`ck.f.${f.id}`)], f.truth)
  }
  const compare: Gen = () =>
    rng.chance(0.5)
      ? pick(kp, d, rng, 'cmp-apex', [text('ck.cmp.apex')], K('s.cone'), [K('s.cylinder')])
      : pick(kp, d, rng, 'cmp-bases', [text('ck.cmp.bases')], K('s.cylinder'), [K('s.cone')])
  // 第 2 档：数一数有几个圆锥；三角形加长方形转出两个圆锥一个圆柱；直角三角形转出的圆锥的高、半径、直径
  const count: Gen = () => {
    const n = rng.int(5, 6)
    const k = rng.int(1, 4)
    const cones = Array.from({ length: k }, () => {
      const pose = rng.pick(['up', 'lie', 'down'] as ConePose[])
      const i = rng.int(0, 2)
      return { spec: coneSpec(pose, i), code: `co${pose[0]}${i}` }
    })
    const rest = Array.from({ length: n - k }, () => otherSpec(rng, rng.pick(['cylinder', 'cylinder', 'frustum', 'sphere'] as Other[])))
    const order = rng.shuffle([...cones, ...rest])
    return num(kp, d, rng, `count-${order.map((f) => f.code).join('.')}`, [text('ck.count'), numbered(rng, order.map((f) => f.spec))], k, [k + 1, k - 1, n - k], { input: 'choice', min: 1, max: 6 })
  }
  const triNums: Gen = () => {
    const a = rng.int(3, 9)
    let b = rng.int(2, 8)
    while (b === a) b = rng.int(2, 8)
    const what = rng.pick(['h', 'r', 'd'] as const)
    const v = what === 'h' ? a : what === 'r' ? b : 2 * b
    return num(kp, d, rng, `tri-${a}-${b}-${what}`, [text('unitIs', { u: unitL('cm') }), text(`ck.tri.${what}`), geo([spinFig('tri', { a: String(a), b: String(b) })], `直角三角形，贴着红线的直角边是 ${a}，另一条直角边是 ${b}`)], v, [what === 'h' ? b : a, what === 'd' ? b : 2 * b, a + b])
  }
  // 第 3 档：同一个直角三角形绕两条直角边转，哪个圆锥的底面大；高的定义的判断
  const bigger: Gen = () => {
    const a = rng.int(3, 9)
    let b = rng.int(3, 9)
    while (a === b) b = rng.int(3, 9)
    const ans = Math.min(a, b)
    return pick(kp, d, rng, `bigger-${a}-${b}`, [text('ck.bigger', { a, b })], K('aroundLeg', { n: ans }), [K('aroundLeg', { n: Math.max(a, b) })])
  }
  const slantJ: Gen = () => judge(kp, d, rng, 'slantJ', [text('ck.slantJ')], false)
  if (d === 1)
    return pickBy(rng, [
      [1, obj],
      [1.2, isCone],
      [0.7, baseShape],
      [0.6, sideIs],
      [0.7, heightIs],
      [1.6, part],
      [0.8, counts],
      [0.8, measure],
      [0.6, spin],
      [1.2, rotate(['rect', 'tri', 'triRect'])],
      [0.8, compose],
      [0.9, fact],
      [0.6, compare],
    ])
  if (d === 2)
    return pickBy(rng, [
      [1.2, count],
      [1, rotate(['tri2Rect', 'triRect'])],
      [1.4, triNums],
      [0.5, part],
    ])
  return pickBy(rng, [
    [1, bigger],
    [1, slantJ],
    [0.5, triNums],
  ])
}

// ═════════════════════════════════════════════════════════════
// 8. 圆锥的体积（例 2、例 3、做一做 1、2；练习六 3–10；练习七 2）
// ═════════════════════════════════════════════════════════════

/** 例 3 沙堆：底面直径、高（米） */
export const SAND_DH: [number, number][] = [
  [4, 1.5],
  [6, 1.5],
  [4, 1.2],
  [2, 1.5],
  [6, 2],
]
/** 做一做 2 铅锤：底面直径、高（厘米），保留整数（四舍五入） */
export const PLUMB_DH: [number, number][] = [
  [4, 6],
  [6, 5],
  [4, 3],
  [2, 9],
  [6, 8],
]
/** 练习六 6 煤堆：高、底面周长（米） */
export const COAL_HC: [number, number][] = [
  [2, 18.84],
  [3, 12.56],
  [1.5, 18.84],
  [1.5, 25.12],
  [1.2, 18.84],
]
/** 圆锥体积是整数的半径、高（半径² × 高是 150 的倍数） */
export const CONE_INT: [number, number][] = [
  [5, 6],
  [5, 12],
  [10, 3],
  [10, 6],
  [5, 18],
  [10, 9],
]

function coneVolumeGen(d: Difficulty, rng: RNG): Question {
  const kp = KP_OV
  const pour: Gen = () => num(kp, d, rng, 'pour', [text('cv.pour'), solid([{ shape: 'cone', r: 1, h: 1.6, tone: 3 }, { shape: 'cylinder', r: 1, h: 1.6, tone: 0 }])], 3, [2, 4, 1], { input: 'choice', min: 1, max: 6 })
  const third: Gen = () => pick(kp, d, rng, 'third', [text('cv.third')], '1/3', ['1/2', '2/3', '1/4'])
  const formula: Gen = () => pick(kp, d, rng, 'formula', [text('cv.formula')], K('f.third'), [K('f.baseTimesH'), K('f.three'), K('f.half')])
  const bySh: Gen = () => {
    for (;;) {
      const s = rng.pick([19, 15, 24, 30, 12, 25])
      const h = rng.pick([12, 9, 6, 15, 10, 8])
      if ((s * h) % 3) continue
      return num(kp, d, rng, `bySh-${s}-${h}`, [text('cv.bySh', { s, h })], (s * h) / 3, [s * h, 3 * s * h, (s * h) / 2])
    }
  }
  const sandFig = (dd: number, h: number): StemPart => solid([{ shape: 'cone', r: dd / 2, h, tone: 3, labels: { d: String(dd), h: String(h) }, dAt: 'bottom' }])
  const sand: Gen = () => {
    const [dd, h] = rng.pick(SAND_DH)
    const v = coneVol(dd / 2, h)
    return val(kp, d, rng, `sand-${dd}-${h}`, [text('cv.sand', { d: dd, h }), text('cv.sand.v'), sandFig(dd, h)], v, [cylVol(dd / 2, h), coneVol(dd, h), 3 * cylVol(dd / 2, h)])
  }
  const sandWt: Gen = () => {
    const [dd, h] = rng.pick(SAND_DH)
    const v = coneVol(dd / 2, h)
    return val(kp, d, rng, `sandWt-${dd}-${h}`, [text('cv.sand', { d: dd, h }), text('cv.sand.t'), sandFig(dd, h)], v * 1.5, [cylVol(dd / 2, h) * 1.5, coneVol(dd, h) * 1.5, v])
  }
  const plumb: Gen = () => {
    const [dd, h] = rng.pick(PLUMB_DH)
    const g = coneVol(dd / 2, h) * 7.9
    return num(kp, d, rng, `plumb-${dd}-${h}`, [text('cv.plumb', { d: dd, h })], roundInt(g), [Math.ceil(r6(g)), roundInt(cylVol(dd / 2, h) * 7.9), roundInt(coneVol(dd, h) * 7.9)])
  }
  const toCone: Gen = () => {
    if (rng.chance(0.4)) {
      const v = rng.pick([300, 150, 90, 120, 360])
      return num(kp, d, rng, `toCone-${v}`, [text('cv.toCone', { v })], v / 3, [v * 3, v / 2, v])
    }
    const v = rng.pick([75.36, 18.84, 37.68, 56.52])
    return decPick(kp, d, rng, `toCone-${v}`, [text('cv.toCone', { v })], v / 3, [v * 3, v / 2, v])
  }
  const toCyl: Gen = () => {
    if (rng.chance(0.4)) {
      const v = rng.pick([50, 24, 40, 15, 100])
      return num(kp, d, rng, `toCyl-${v}`, [text('cv.toCyl', { v })], v * 3, [v / 3, v * 2, v])
    }
    const v = rng.pick([141.3, 12.56, 6.28, 9.42])
    return decPick(kp, d, rng, `toCyl-${v}`, [text('cv.toCyl', { v })], v * 3, [v / 3, v * 2, v])
  }
  const truth: Gen = () => {
    const f = rng.pick([
      ['third', false],
      ['bigger', true],
      ['threeH', false],
    ] as [string, boolean][])
    return judge(kp, d, rng, `judge-${f[0]}`, [text(`cv.j.${f[0]}`)], f[1])
  }
  const byC: Gen = () => {
    const [c, h] = rng.pick([
      [31.4, 9],
      [18.84, 6],
      [25.12, 6],
      [31.4, 6],
      [62.8, 3],
    ] as [number, number][])
    const r = r6(c / (2 * PI))
    return val(kp, d, rng, `byC-${c}-${h}`, [text('cv.byC', { c, h })], coneVol(r, h), [cylVol(r, h), coneVol(2 * r, h), r6((c * h) / 3)])
  }
  const coal = (q: 'v' | 't'): Gen => () => {
    const [h, c] = rng.pick(COAL_HC)
    const r = r6(c / (2 * PI))
    const v = coneVol(r, h)
    if (q === 'v') return val(kp, d, rng, `coalV-${h}-${c}`, [text('cv.coal', { h, c }), text('cv.coal.v')], v, [cylVol(r, h), coneVol(2 * r, h), v / 3])
    return num(kp, d, rng, `coalT-${h}-${c}`, [text('cv.coal', { h, c }), text('cv.coal.t')], roundInt(v * 1.4), [roundInt(cylVol(r, h) * 1.4), Math.ceil(r6(v * 1.4)) === roundInt(v * 1.4) ? roundInt(v * 1.4) - 1 : Math.ceil(r6(v * 1.4)), roundInt(v)])
  }
  const byR: Gen = () => {
    const [r, h] = rng.pick(CONE_INT)
    const v = coneVol(r, h)
    return num(kp, d, rng, `byR-${r}-${h}`, [text('cv.fig'), solid([{ shape: 'cone', r, h, labels: { r: String(r), h: String(h) } }])], v, [cylVol(r, h), coneVol(2 * r, h), 2 * v])
  }
  // 第 2 档：稻谷堆；底面积和体积相等求高；体积和高相等求底面积；整理和复习 2；等底等高圆柱是圆锥的 3 倍
  const rice: Gen = () => {
    const q = rng.pick(['kg', 'ha', 'yuan'] as const)
    const kg = r6(coneVol(2, 1.5) * 650)
    if (q === 'kg') return num(kp, d, rng, 'rice-kg', [text('cv.rice'), text('cv.rice.kg')], kg, [r6(cylVol(2, 1.5) * 650), r6(coneVol(4, 1.5) * 650), 6280], { input: 'choice' })
    if (q === 'ha') return num(kp, d, rng, 'rice-ha', [text('cv.rice.ha', { kg })], r6(kg / 0.4), [r6(kg * 0.4), kg * 4, kg])
    return decPick(kp, d, rng, 'rice-yuan', [text('cv.rice.yuan', { kg })], kg * 2.8, [kg / 2.8, kg * 28, kg * 2])
  }
  const sameBase: Gen = () => {
    const h = rng.int(2, 9)
    if (rng.chance(0.6)) return num(kp, d, rng, `sameBase-cyl-${h}`, [text('cv.sameBase.cyl', { h })], 3 * h, [h, h + 3, 2 * h])
    return num(kp, d, rng, `sameBase-cone-${3 * h}`, [text('cv.sameBase.cone', { h: 3 * h })], h, [3 * h, 9 * h, h + 3])
  }
  const sameVol: Gen = () => {
    if (rng.chance(0.5)) {
      const s = rng.pick([28.26, 18.84, 37.68])
      return decPick(kp, d, rng, `sameVol-cone-${s}`, [text('cv.sameVol.cone', { s })], s / 3, [s * 3, s, s / 2])
    }
    const s = rng.pick([12, 15, 20, 9])
    return num(kp, d, rng, `sameVol-cyl-${s}`, [text('cv.sameVol.cyl', { s })], 3 * s, [s, s / 3, 2 * s].filter(Number.isInteger))
  }
  const table: Gen = () => {
    const [dd, h, u] = rng.pick([
      [4, 6, 'dm'],
      [1, 12, 'm'],
    ] as [number, number, 'dm' | 'm'][])
    const s = text(dd === 4 ? 'cv.tableD' : 'cv.tableR', dd === 4 ? { d: dd, h, u: unitL(u), s: unitL(`${u}3` as U) } : { r: 0.5, h, u: unitL(u), s: unitL(`${u}3` as U) })
    return decPick(kp, d, rng, `table-${dd}-${h}`, [s], coneVol(dd / 2, h), [cylVol(dd / 2, h), coneVol(dd, h), coneVol(dd / 2, h) * 2])
  }
  const triple: Gen = () => judge(kp, d, rng, 'triple', [text('cv.j.triple')], true)
  // 第 3 档：练习六 10 细沙；整理和复习 4 进料漏斗；练习七 2 沙堆垫路
  const flip: Gen = () => {
    const x = rng.pick([2, 2, 3, 1, 5])
    return num(kp, d, rng, `flip-${x}`, [text('cv.flip', { x }), solid([{ shape: 'hopper', r: 6, h: 12, h2: 12, tone: 3, labels: { r: '6', h: '12', h2: '12' } }])], 4 + x, [12 + x, x, 6 + x])
  }
  const hopper: Gen = () => {
    const kg = (cylVol(2, 2) + coneVol(2, 4.2)) * 0.64
    return num(kp, d, rng, 'hopper', [text('cv.hopper'), solid([{ shape: 'hopper', r: 2, h: 2, h2: 4.2, tone: 2, labels: { d: '4', h: '2', h2: '4.2' } }])], roundInt(kg), [roundInt((cylVol(2, 2) + cylVol(2, 4.2)) * 0.64), roundInt(cylVol(2, 2) * 0.64), Math.ceil(r6(kg)) === roundInt(kg) ? roundInt(kg) + 1 : Math.ceil(r6(kg))])
  }
  const road: Gen = () => {
    const [s, h, w, t] = rng.pick([
      [28.6, 3, 10, 2],
      [30, 2.5, 5, 2],
      [12, 4, 8, 2],
    ] as [number, number, number, number][])
    const v = r6((s * h) / 3)
    const len = r6(v / (w * (t / 100)))
    return val(kp, d, rng, `road-${s}-${h}-${w}-${t}`, [text('cv.road', { s, h, w, t })], len, [r6(len * 3), r6(v / (w * t)), r6(len / 10)])
  }
  if (d === 1)
    return pickBy(rng, [
      [1, pour],
      [0.9, third],
      [0.8, formula],
      [1, bySh],
      [1.1, sand],
      [1, sandWt],
      [1.1, plumb],
      [0.9, toCone],
      [0.9, toCyl],
      [1, truth],
      [1, byC],
      [0.6, coal('v')],
      [0.6, coal('t')],
      [1, byR],
    ])
  if (d === 2)
    return pickBy(rng, [
      [1.2, rice],
      [1, sameBase],
      [1, sameVol],
      [0.8, table],
      [0.5, triple],
    ])
  return pickBy(rng, [
    [1, flip],
    [1, hopper],
    [1, road],
  ])
}

defineGenerator(KP_CK, cylKnowGen)
defineGenerator(KP_CN, cylNetGen)
defineGenerator(KP_CS, cylSideGen)
defineGenerator(KP_CA, cylSurfaceGen)
defineGenerator(KP_CV, cylVolumeGen)
defineGenerator(KP_CC, cylCapacityGen)
defineGenerator(KP_OK, coneKnowGen)
defineGenerator(KP_OV, coneVolumeGen)
