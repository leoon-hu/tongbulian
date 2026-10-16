import type { Difficulty, GeoFig, GeoItem, GeoPt, GeoTone, InputMode, LParam, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 六上「四 圆」（第 48–73 页，2022 版课标新教材；六年级数学 D）：
// 圆的认识（画圆、圆心 / 半径 / 直径、d = 2r、无数条半径直径、对称轴、圆心定位置半径定大小、找圆心、练习十）；
// 扇形的认识（弧、扇形、圆心角，扇形例 1：同一个圆里扇形大小看圆心角，半圆 180°、1/4 圆 90°；练习十 5、6）；
// 圆的周长（滚一圈、绳子绕一圈、圆周率 π ≈ 3.14、C = πd 或 C = 2πr、周长例 1 车轮、练习十一）；
// 圆的面积（数方格、剪拼成近似长方形、S = πr²、面积例 1 风电叶轮、割圆术、练习十二）；圆环的面积（面积例 2、扇环）；
// 组合图形的面积（面积例 3 旋转 / 平移、做一做、练习十二 9–17、练习十三 7、9）；外方内圆和外圆内方（面积例 4、练习十三 5）。
// 「*利用圆设计图案」（选学，画图）不设；整理和复习、练习十三的题分到各知识点。
// 课本里画图、量一量、找生活中的圆环去测量、说理的题不出，改成图上标好数或文字给好数据。
// π 一律取 3.14（课本第 56 页「π ≈ 3.14」，全单元的计算都用它，题目里不再写）；例 4 的 π/4、π/2 引擎不支持，改问数值。
// 作答：整数用数字键盘（或随机出成数字选项）；小数、分数、π 的式子、算式、名称一律选项卡，干扰项照课本暴露的错法造
// （半径直径弄混、周长面积公式弄混、r² 算成 2r、周长忘乘 2、圆环算成 (R − r)²、半圆周长忘加直径……）。
// 图都用 GeoFigure：圆用 dot + r，圆弧用 poly 每 5° 取一个点，圆环用外圈涂色 + 内圈 paper；图里只放数、字母和 cm / m。
// 朗读：「长」只在「长度」「长方形」「周长」「边长」里；车轮说「滚动」、叶轮说「转动」、圆规说「旋转」，不单用「转」；
// 不用「量（动词）」「为」「沿着」「还」「只」「得」「着」「数一数」「差（名词）」，题干里不写「?」和圆括号。
// ─────────────────────────────────────────────────────────────

export const T = 'circle' as const
export type P = GeoPt

// ── 数 ──

/** 浮点误差：3.14 × 75 = 235.50000000000003 → 235.5 */
export const clean = (n: number): number => Math.round(n * 1e6) / 1e6
/** 取 4 位小数再去掉末尾的 0：28.26、0.785、63.585 */
export const fmt = (n: number): string => String(Math.round(n * 10000) / 10000)
export const isInt = (x: number): boolean => Math.abs(x - Math.round(x)) < 1e-9
const r1 = (n: number): number => Math.round(n * 10) / 10
/** 圆周率取 3.14 */
export const PI = 3.14
/** 3.14 × x（去掉浮点尾巴） */
export const pi = (x: number): number => clean(PI * x)

// ── 题干与出题骨架 ──

export const W = (k: string): LStr => ({ k })
export const text = (k: string, p?: Record<string, LParam>): StemPart => ({ kind: 'text', text: p ? { k, p } : { k } })
export const YES: LStr = W('m6.circ.yes')
export const NO: LStr = W('m6.circ.no')

type Base = { kpId: string; d: Difficulty; rng: RNG; sig: string; stem: StemPart[] }

/** 判断题：「……，对吗？」配 对 / 不对 */
export function judge(kpId: string, d: Difficulty, rng: RNG, sig: string, stem: StemPart[], yes: boolean): Question {
  return labelQuestion({ kpId, type: T, difficulty: d, sig, stem, correct: yes ? YES : NO, distractors: [yes ? NO : YES], rng })
}
/** 几个词条（或字面量）里选一个 */
export function pickWord(kpId: string, d: Difficulty, rng: RNG, sig: string, stem: StemPart[], correct: LStr, wrong: LStr[]): Question {
  return labelQuestion({ kpId, type: T, difficulty: d, sig, stem, correct, distractors: wrong, rng })
}
/** 占地方的题干部件：图、平均分的圆、钟面、表 */
const FIG_KINDS = new Set<StemPart['kind']>(['geo', 'frac-shape', 'dial', 'clock', 'stat-table', 'shape'])
export const hasFig = (stem: StemPart[]): boolean => stem.some((p) => FIG_KINDS.has(p.kind))
/**
 * 整数答案：数字键盘或数字选项（numberQuestion 随机），smart 是照常见错法算出来的干扰项（只留正整数、不等于答案的）。
 * 带图的题一律出选项卡：数字键盘四行约 300px、选项卡两行约 150px，手机竖屏上题目、图和作答才放得进一屏（U5）
 */
export function numQ(o: Base & { value: number; smart?: number[]; input?: InputMode }): Question {
  const smart = [...new Set((o.smart ?? []).map(clean))].filter((x) => isInt(x) && x > 0 && x !== o.value && x < 1e9)
  const input = o.input ?? (hasFig(o.stem) ? 'choice' : undefined)
  return numberQuestion({ kpId: o.kpId, type: T, difficulty: o.d, sig: o.sig, stem: o.stem, value: o.value, rng: o.rng, min: 1, max: Math.max(o.value * 10, 100), smart, input })
}
/**
 * 小数答案：一律选项卡。wrong 按常见错法给，去掉和答案相等的、重复的、不是正数的；不够 3 个用「小数点错一位」「多乘 / 少乘 2」补
 */
export function decQ(o: Base & { value: number; wrong: number[] }): Question {
  const right = fmt(o.value)
  const seen = new Set([right])
  const wrongs: string[] = []
  const push = (w: number): void => {
    if (wrongs.length >= 3 || !(w > 0) || !Number.isFinite(w)) return
    const s = fmt(clean(w))
    if (seen.has(s)) return
    seen.add(s)
    wrongs.push(s)
  }
  for (const w of o.wrong) push(w)
  for (const w of [o.value * 10, o.value / 10, o.value * 2, o.value / 2]) push(w)
  return labelQuestion({ kpId: o.kpId, type: T, difficulty: o.d, sig: o.sig, stem: o.stem, correct: right, distractors: wrongs, rng: o.rng })
}
/** 答案是整数就用 numQ，不是整数就出选项 */
export function valQ(o: Base & { value: number; wrong: number[] }): Question {
  const v = clean(o.value)
  if (isInt(v)) return numQ({ ...o, value: Math.round(v), smart: o.wrong })
  return decQ({ ...o, value: v })
}
/** 一组编号的图里选一个：选项就是图下面的 1、2、3…… */
export function pickFig(o: Base & { count: number; answer: number }): Question {
  const all = Array.from({ length: o.count }, (_, i) => String(i + 1))
  const right = String(o.answer + 1)
  return labelQuestion({ kpId: o.kpId, type: T, difficulty: o.d, sig: o.sig, stem: o.stem, correct: right, distractors: all.filter((x) => x !== right), rng: o.rng })
}

// ── 单位 ──

export type LenU = 'mm' | 'cm' | 'dm' | 'm'
/** 长度单位的词条 */
export const uL = (u: LenU): LStr => W(`m6.circ.u.${u}`)
/** 面积单位的词条 */
export const uA = (u: LenU): LStr => W(`m6.circ.u.${u}2`)
/** 图上的长度标注：数 + 字母单位（3 cm、2.5 m） */
export const lab = (n: number, u: LenU): string => `${fmt(n)} ${u}`

// ── 几何小工具（各包自己一份，免得互相加载）──

export const add = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1]]
export const sub = (a: P, b: P): P => [a[0] - b[0], a[1] - b[1]]
export const mul = (a: P, k: number): P => [a[0] * k, a[1] * k]
export const mid = (a: P, b: P): P => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
const rad = (deg: number): number => (deg * Math.PI) / 180
/** 圆心 c、半径 r、角 deg（从水平向右起，屏幕上逆时针为正；y 向下）上的点 */
export const polar = (c: P, r: number, deg: number): P => [c[0] + r * Math.cos(rad(deg)), c[1] - r * Math.sin(rad(deg))]
/** 圆弧上的点：从 a0 度走到 a1 度（a1 < a0 就顺时针走），每 step 度一个点，两头都在 */
export function arcPts(c: P, r: number, a0: number, a1: number, step = 5): P[] {
  const n = Math.max(1, Math.ceil(Math.abs(a1 - a0) / step))
  return Array.from({ length: n + 1 }, (_, i) => polar(c, r, a0 + ((a1 - a0) * i) / n))
}
/** 首尾相接的几段折线拼成一条：后一段的第一个点和前一段的最后一个点重合时去掉 */
export function chain(...parts: P[][]): P[] {
  const out: P[] = []
  for (const part of parts)
    for (const p of part) {
      const last = out[out.length - 1]
      if (last && Math.abs(last[0] - p[0]) < 1e-6 && Math.abs(last[1] - p[1]) < 1e-6) continue
      out.push(p)
    }
  return out
}

/** 对一样东西的每个点做 f（grid 只挪起点；圆的半径、尺寸线的 off 不变） */
export function mapItem(it: GeoItem, f: (p: P) => P): GeoItem {
  switch (it.t) {
    case 'poly':
    case 'curve':
      return { ...it, pts: it.pts.map(f) }
    case 'line':
      return { ...it, a: f(it.a), b: f(it.b) }
    case 'dot':
    case 'text':
      return { ...it, at: f(it.at) }
    case 'arc':
      return { ...it, at: f(it.at), a: f(it.a), b: f(it.b) }
    case 'grid': {
      const [x, y] = f([it.x, it.y])
      return { ...it, x, y }
    }
  }
}
function bounds(items: GeoItem[]): { x0: number; y0: number; x1: number; y1: number } {
  const xs: number[] = []
  const ys: number[] = []
  for (const it of items) {
    if (it.t === 'grid') {
      xs.push(it.x, it.x + it.w)
      ys.push(it.y, it.y + it.h)
      continue
    }
    if (it.t === 'dot' && it.r) {
      xs.push(it.at[0] - it.r, it.at[0] + it.r)
      ys.push(it.at[1] - it.r, it.at[1] + it.r)
      continue
    }
    mapItem(it, (p) => {
      xs.push(p[0])
      ys.push(p[1])
      return p
    })
  }
  return { x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys) }
}
/** 把一组东西挪到左上角留白的地方，外框就是图的大小（坐标取一位小数）；m 是四边留白，[左右, 上下] 分开给 */
export function fitFig(items: GeoItem[], m: number | [number, number] = 16, px?: number): GeoFig {
  const mx = typeof m === 'number' ? m : m[0]
  const my = typeof m === 'number' ? m : m[1]
  const b = bounds(items)
  const f = (p: P): P => [r1(p[0] - b.x0 + mx), r1(p[1] - b.y0 + my)]
  const fig: GeoFig = { w: r1(b.x1 - b.x0 + 2 * mx), h: r1(b.y1 - b.y0 + 2 * my), items: items.map((it) => mapItem(it, f)) }
  if (px) fig.px = px
  return fig
}
/** 题干里的一段几何图（alt 是静态页 / 读屏的说明，不能把答案写出来） */
export function geoPart(figs: GeoFig[], alt: string, numbered = false): StemPart {
  return numbered ? { kind: 'geo', figs, alt, numbered: true } : { kind: 'geo', figs, alt }
}

type Look = { fill?: GeoTone; stroke?: GeoTone; dash?: boolean; thin?: boolean }
/** 圆：dot + r */
export const circ = (c: P, r: number, o: Look = {}): GeoItem => ({ t: 'dot', at: c, r, ...o })
/** 点 p 到线段 a—b 的距离 */
const segDist = (p: P, a: P, b: P): number => {
  const ab = sub(b, a)
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1]) / (ab[0] ** 2 + ab[1] ** 2 || 1)))
  return Math.hypot(p[0] - a[0] - ab[0] * t, p[1] - a[1] - ab[1] * t)
}
/** 圆心旁边写字母的地方：离圆心 r，在 12 个方向里挑离这些线段最远的一个（角的两条边别压住 O） */
export function clearOf(c: P, r: number, segs: [P, P][]): P {
  let best: P = polar(c, r, 0)
  let bestD = -1
  for (let a = 0; a < 360; a += 30) {
    const p = polar(c, r, a)
    const dd = Math.min(...segs.map(([x, y]) => segDist(p, x, y)))
    if (dd > bestD + 1e-9) {
      best = p
      bestD = dd
    }
  }
  return best
}
/** 一个点（圆心） */
export const pt = (c: P): GeoItem => ({ t: 'dot', at: c })
/** 斜体字母（O、A、r、d） */
export const letter = (at: P, s: string): GeoItem => ({ t: 'text', at, text: s, letter: true })
/** 图上的一段字（数和单位） */
export const note = (at: P, s: string, halo = false): GeoItem => (halo ? { t: 'text', at, text: s, halo: true } : { t: 'text', at, text: s })
export const seg = (a: P, b: P, o: { stroke?: GeoTone; dash?: boolean; thin?: boolean } = {}): GeoItem => ({ t: 'line', a, b, ...o })
/** 尺寸线：a、b 两头画箭头，中间写 s；off = 离开 a—b 多少（正数在从 a 走向 b 的左手边） */
export const dimLine = (a: P, b: P, s: string, off = 0): GeoItem => ({ t: 'line', a, b, dim: s, off })
export const poly = (pts: P[], o: { fill?: GeoTone; stroke?: GeoTone; dash?: boolean; open?: boolean } = {}): GeoItem => ({ t: 'poly', pts, ...o })
/** 扇形：圆心 c、半径 r，从 a0 度到 a1 度 */
export const sector = (c: P, r: number, a0: number, a1: number, fill: GeoTone, stroke: GeoTone): GeoItem => poly([c, ...arcPts(c, r, a0, a1)], { fill, stroke })
/** 一段弧（不封口） */
export const arcLine = (c: P, r: number, a0: number, a1: number, stroke: GeoTone): GeoItem => poly(arcPts(c, r, a0, a1), { open: true, stroke })
/** 扇环：外圆半径 R、内圆半径 r，从 a0 度到 a1 度 */
export const ringSector = (c: P, R: number, r: number, a0: number, a1: number, fill: GeoTone, stroke: GeoTone): GeoItem =>
  poly([...arcPts(c, R, a0, a1), ...arcPts(c, r, a1, a0)], { fill, stroke })
/** 圆环：外圈涂色、内圈 paper（白）挖空 */
export const ring = (c: P, R: number, r: number, tone: GeoTone = 'b'): GeoItem[] => [circ(c, R, { fill: tone, stroke: tone }), circ(c, r, { fill: 'paper', stroke: tone })]

// ── 常用的词 ──

const wCenter = W('m6.circ.w.center')
const wRadius = W('m6.circ.w.radius')
const wDiameter = W('m6.circ.w.diameter')
const wArc = W('m6.circ.w.arc')
const wSector = W('m6.circ.w.sector')
const wCentral = W('m6.circ.w.central')
const lines = (n: 1 | 2 | 3 | 4 | 'many'): LStr => W(n === 'many' ? 'm6.circ.w.countless' : `m6.circ.w.lines${n}`)

// ═════════════════════════════════════════════════════════════
// 1. 圆的认识（第 48–50、52–54 页：画圆、认一认、折一折、做一做、练习十、生活中的数学）
// ═════════════════════════════════════════════════════════════

export const KP_CIRCLE = 'm6s1-05-circle'

/** 第 49 页「认一认」的图：圆、圆心 O、一条半径 r、一条水平的直径 d（radiusDeg 是半径朝哪边，只取下半圈） */
export function partsFig(radiusDeg: number, R = 62): GeoFig {
  const C: P = [0, 0]
  const end = polar(C, R, radiusDeg)
  const right = radiusDeg > -90
  // r 写在半径的下侧（离直径远的那边）；d 写在直径上方、和半径错开；O 写在圆心上方、和 d 错开
  const side = polar([0, 0], 14, right ? radiusDeg - 90 : radiusDeg + 90)
  return fitFig(
    [
      circ(C, R, { fill: 'b', stroke: 'b' }),
      seg(polar(C, R, 180), polar(C, R, 0), { stroke: 'a' }),
      seg(C, end, { stroke: 'd' }),
      pt(C),
      letter(add(mid(C, end), side), 'r'),
      letter([right ? -R * 0.5 : R * 0.5, -13], 'd'),
      letter([right ? 12 : -12, -14], 'O'),
    ],
    14,
  )
}

/** 第 49 页「认一认」：图上标着 O、r、d，问字母表示圆的什么 */
function genName(d: Difficulty, rng: RNG): Question {
  const which = rng.pick(['O', 'r', 'd'] as const)
  const fig = partsFig(rng.pick([-35, -55, -125, -145]))
  const ans = which === 'O' ? wCenter : which === 'r' ? wRadius : wDiameter
  return pickWord(KP_CIRCLE, d, rng, `name-${which}`, [text('m6.circ.c.nameQ', { x: which }), geoPart([fig], '一个圆，图上标着字母 O、r、d')], ans, [wCenter, wRadius, wDiameter].filter((w) => w !== ans))
}

/** 第 49 页「认一认」的定义：说定义，选名称 */
function genDef(d: Difficulty, rng: RNG): Question {
  const k = rng.pick(['radius', 'diameter', 'center'] as const)
  const ans = k === 'radius' ? wRadius : k === 'diameter' ? wDiameter : wCenter
  return pickWord(KP_CIRCLE, d, rng, `def-${k}`, [text(`m6.circ.c.def.${k}`)], ans, [wCenter, wRadius, wDiameter].filter((w) => w !== ans))
}

type SegKind = 'dia' | 'rad' | 'chord' | 'short' | 'out' | 'inner'
/** 一个圆和一条线段（圆心画成点）：直径、半径、不过圆心的线段、过圆心但一头没到圆上、从圆心到圆外、从圆上到圆里不是圆心的点 */
export function segFig(k: SegKind, th: number): GeoFig {
  const C: P = [0, 0]
  const R = 36
  const items: GeoItem[] = [circ(C, R, { stroke: 'b' }), pt(C)]
  const L = (a: P, b: P): GeoItem => seg(a, b, { stroke: 'd' })
  if (k === 'dia') items.push(L(polar(C, R, th), polar(C, R, th + 180)))
  if (k === 'rad') items.push(L(C, polar(C, R, th)))
  if (k === 'chord') items.push(L(polar(C, R, th), polar(C, R, th + 125)))
  if (k === 'short') items.push(L(polar(C, R, th), polar(C, R * 0.5, th + 180)))
  if (k === 'out') items.push(L(C, polar(C, R * 1.45, th)))
  if (k === 'inner') items.push(L(polar(C, R, th), polar(C, R * 0.45, th + 140)))
  return fitFig(items, 8)
}

/** 认一认的定义辨析：几幅图里哪条线段是直径 / 半径 */
function genPickSeg(d: Difficulty, rng: RNG): Question {
  const ask = rng.pick(['dia', 'rad'] as const)
  const pool: SegKind[] = ask === 'dia' ? ['chord', 'short', 'rad'] : ['out', 'inner', 'dia', 'chord']
  const n = rng.pick([3, 4])
  const order = rng.shuffle([ask, ...rng.shuffle(pool).slice(0, n - 1)])
  const th = rng.pick([20, 35, 150, 200, 330])
  const figs = order.map((k, i) => segFig(k, th + i * 25))
  return pickFig({ kpId: KP_CIRCLE, d, rng, sig: `pick-${ask}-${order.join('.')}`, stem: [text(`m6.circ.c.pick.${ask}`), geoPart(figs, '几个圆，每个圆里画了一条红色的线段', true)], count: figs.length, answer: order.indexOf(ask) })
}

/** 折一折（第 50 页）、整理和复习 d = 2r：已知半径求直径 */
function genR2D(d: Difficulty, rng: RNG): Question {
  const u = rng.pick(['cm', 'dm', 'm'] as const)
  const r = rng.int(2, 30)
  return numQ({ kpId: KP_CIRCLE, d, rng, sig: `r2d-${r}-${u}`, stem: [text('m6.circ.c.r2dQ', { r, u: uL(u) })], value: 2 * r, smart: [r, r % 2 === 0 ? r / 2 : r + 1, 4 * r] })
}
/** 已知直径求半径（直径是单数时答案是 x.5，出选项） */
function genD2R(d: Difficulty, rng: RNG): Question {
  const u = rng.pick(['cm', 'dm', 'm'] as const)
  const dd = rng.int(3, 40)
  return valQ({ kpId: KP_CIRCLE, d, rng, sig: `d2r-${dd}-${u}`, stem: [text('m6.circ.c.d2rQ', { d: dd, u: uL(u) })], value: dd / 2, wrong: [dd * 2, dd, dd / 4] })
}
const DEC_R = [0.24, 1.42, 0.35, 0.18, 2.15, 0.6, 1.25, 3.05]
const DEC_D = [0.86, 1.04, 0.5, 3.6, 1.28, 2.06, 0.9, 4.2]
/** 练习十 2：半径、直径是小数（单位：米） */
function genDec(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    const r = rng.pick(DEC_R)
    return decQ({ kpId: KP_CIRCLE, d, rng, sig: `dec-r-${r}`, stem: [text('m6.circ.c.r2dQ', { r, u: uL('m') })], value: r * 2, wrong: [r / 2, r * 20, r + 2] })
  }
  const dd = rng.pick(DEC_D)
  return decQ({ kpId: KP_CIRCLE, d, rng, sig: `dec-d-${dd}`, stem: [text('m6.circ.c.d2rQ', { d: dd, u: uL('m') })], value: dd / 2, wrong: [dd * 2, dd / 20, dd + 0.5] })
}

/** 折一折：半径、直径各有多少条 */
function genCount(d: Difficulty, rng: RNG): Question {
  const k = rng.pick(['radius', 'diameter'] as const)
  return pickWord(KP_CIRCLE, d, rng, `count-${k}`, [text(`m6.circ.c.count.${k}`)], lines('many'), [lines(1), lines(2), lines(4)])
}

const C_JUDGE: [string, boolean][] = [
  ['sameR', true],
  ['sameD', true],
  ['d2r', true],
  ['rHalf', true],
  ['fold', true],
  ['axis', true],
  ['dHalf', false],
  ['two', false],
]
/** 折一折的发现、整理和复习：判断 */
function genCJudge(d: Difficulty, rng: RNG): Question {
  const [k, yes] = rng.pick(C_JUDGE)
  return judge(KP_CIRCLE, d, rng, `judge-${k}`, [text(`m6.circ.c.j.${k}`)], yes)
}

/** 圆有几条对称轴 */
function genAxes(d: Difficulty, rng: RNG): Question {
  return pickWord(KP_CIRCLE, d, rng, 'axes', [text('m6.circ.c.axesQ'), { kind: 'shape', shape: 'circle', tone: rng.int(0, 5) }], lines('many'), [lines(1), lines(2), lines(4)])
}

/** 第 50 页：左边同心的两个圆、右边不同位置的三个同样大的圆 */
function posFig(k: 'same' | 'concentric'): GeoFig {
  if (k === 'concentric') {
    const C: P = [0, 0]
    return fitFig([circ(C, 56, { stroke: 'b' }), circ(C, 34, { stroke: 'b' }), pt(C), letter([0, 14], 'O')], 12)
  }
  const R = 26
  const cs: P[] = [
    [0, 30],
    [64, 0],
    [128, 28],
  ]
  return fitFig(cs.flatMap((c) => [circ(c, R, { stroke: 'b' }), pt(c)]), 12)
}
/** 第 50 页想一想：圆心确定位置、半径决定大小 */
function genPos(d: Difficulty, rng: RNG): Question {
  const k = rng.pick(['center', 'radius', 'same', 'concentric'] as const)
  const wPos = W('m6.circ.w.position')
  const wSize = W('m6.circ.w.size')
  if (k === 'center') return pickWord(KP_CIRCLE, d, rng, 'pos-center', [text('m6.circ.c.pos.center')], wPos, [wSize])
  if (k === 'radius') return pickWord(KP_CIRCLE, d, rng, 'pos-radius', [text('m6.circ.c.pos.radius')], wSize, [wPos])
  if (k === 'same')
    return pickWord(KP_CIRCLE, d, rng, 'pos-same', [text('m6.circ.c.pos.same'), geoPart([posFig('same')], '不同位置的三个同样大的圆')], wRadius, [W('m6.circ.w.centerPos')])
  return pickWord(KP_CIRCLE, d, rng, 'pos-concentric', [text('m6.circ.c.pos.concentric'), geoPart([posFig('concentric')], '圆心都是 O 的两个圆，一大一小')], wRadius, [wCenter])
}

/** 做一做 1、练习十 1：用圆规画圆，两脚间的距离 */
function genCompass(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.55)) {
    const r = rng.pick([2, 3, 4, 5, 6, 7, 8, 9, 2.5, 3.5, 4.5])
    return valQ({ kpId: KP_CIRCLE, d, rng, sig: `compass-r-${r}`, stem: [text('m6.circ.c.compass.r', { r })], value: r, wrong: [r * 2, r / 2] })
  }
  const dd = rng.int(4, 16)
  return valQ({ kpId: KP_CIRCLE, d, rng, sig: `compass-d-${dd}`, stem: [text('m6.circ.c.compass.d', { d: dd })], value: dd / 2, wrong: [dd, dd * 2] })
}

/** 第 49 页：用圆规画圆要注意什么 */
function genCare(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) return pickWord(KP_CIRCLE, d, rng, 'care-pin', [text('m6.circ.c.care.pinQ')], W('m6.circ.w.fixed'), [W('m6.circ.w.turnToo'), W('m6.circ.w.liftUp')])
  return judge(KP_CIRCLE, d, rng, 'care-judge', [text('m6.circ.c.care.j')], false)
}

/** 做一做 2：对折两次找圆心 */
function genFold(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) return pickWord(KP_CIRCLE, d, rng, 'fold-point', [text('m6.circ.c.fold.pointQ')], wCenter, [W('m6.circ.w.onCircle'), W('m6.circ.w.diaEnd')])
  return numQ({ kpId: KP_CIRCLE, d, rng, sig: 'fold-times', stem: [text('m6.circ.c.fold.timesQ')], value: 2, smart: [1, 3, 4] })
}

/** 正方形里最大的圆（练习十 8(1)、练习十一 7(1)、练习十一 8）：正方形边长 side、标 label；showR = 画出半径 */
export function squareCircleFig(label: string | null, o: { rLabel?: string; S?: number } = {}): GeoFig {
  const S = o.S ?? 110
  const C: P = [S / 2, S / 2]
  const items: GeoItem[] = [poly([[0, 0], [S, 0], [S, S], [0, S]], { stroke: 'd' }), circ(C, S / 2, { stroke: 'd' }), pt(C)]
  if (o.rLabel) {
    items.push(seg(C, [S, S / 2], { stroke: 'd' }), note([S * 0.75, S / 2 - 13], o.rLabel))
  } else items.push(letter([S / 2, S / 2 - 15], 'O'))
  if (label) items.push(dimLine([0, S], [S, S], label, -16))
  return fitFig(items, 16)
}
/** 练习十 8(1)：正方形里画一个最大的圆，直径 / 半径是多少 */
function genSquare(d: Difficulty, rng: RNG): Question {
  const a = rng.int(2, 10) * 2
  const ask = rng.pick(['d', 'r'] as const)
  return numQ({
    kpId: KP_CIRCLE,
    d,
    rng,
    sig: `square-${a}-${ask}`,
    stem: [text(`m6.circ.c.square.${ask}`, { a }), geoPart([squareCircleFig(lab(a, 'cm'))], '正方形里画了一个最大的圆')],
    value: ask === 'd' ? a : a / 2,
    smart: ask === 'd' ? [a / 2, a * 2] : [a, a * 2],
  })
}

/** 长方形里并排的 n 个同样大的圆（练习十 9）：rows 排、每排 n 个，下边的尺寸线写 label */
export function rowFig(n: number, rows: number, label: string | null): GeoFig {
  const D = Math.min(56, 230 / n)
  const items: GeoItem[] = [poly([[0, 0], [n * D, 0], [n * D, rows * D], [0, rows * D]], { stroke: 'd' })]
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < n; i++) {
      const c: P = [D / 2 + i * D, D / 2 + j * D]
      items.push(circ(c, D / 2, { stroke: 'd' }), pt(c))
    }
  if (label) items.push(dimLine([0, rows * D], [n * D, rows * D], label, -16))
  return fitFig(items, 16)
}
/** 练习十 9：长方形里一排同样大的圆，求圆的直径、长方形的周长 */
function genRow(d: Difficulty, rng: RNG): Question {
  const n = rng.pick([2, 3, 4])
  const dd = rng.int(2, 9)
  const L = n * dd
  const ask = rng.pick(['dia', 'peri'] as const)
  const stem = [text(`m6.circ.c.row.${ask}`, { n, L }), geoPart([rowFig(n, 1, lab(L, 'cm'))], `长方形里并排的 ${n} 个同样大的圆`)]
  if (ask === 'dia') return numQ({ kpId: KP_CIRCLE, d, rng, sig: `row-${n}-${dd}-dia`, stem, value: dd, smart: [dd * 2, L / 2] })
  return numQ({ kpId: KP_CIRCLE, d, rng, sig: `row-${n}-${dd}-peri`, stem, value: 2 * (L + dd), smart: [L + dd, 2 * L, L * 4, 2 * (L + 2 * dd)] })
}

/** 练习十 7：在操场上画一个直径 d 米的圆形花坛，绳子要留多少米 */
function genBed(d: Difficulty, rng: RNG): Question {
  const dd = rng.pick([4, 6, 8, 10, 12, 14, 16, 20])
  return numQ({ kpId: KP_CIRCLE, d, rng, sig: `bed-${dd}`, stem: [text('m6.circ.c.bedQ', { d: dd })], value: dd / 2, smart: [dd, dd * 2] })
}

/** 练习十 8(2)：梯形里最大的半圆（直径是上底，弧碰到下底），高 h → 半径 */
function trapFig(h: number): GeoFig {
  const r = 52
  const s = r * 0.7
  const items: GeoItem[] = [
    poly([[-r, 0], [r, 0], [r + s, r], [-r - s, r]], { stroke: 'd' }),
    arcLine([0, 0], r, 180, 360, 'd'),
    pt([0, 0]),
    letter([0, -14], 'O'),
    seg([r, 0], [r, r], { stroke: 'b', dash: true }),
    { t: 'arc', at: [r, r], a: [r + s, r], b: [r, 0], right: true },
    note([r + s + 34, r / 2], lab(h, 'cm')),
  ]
  return fitFig(items, 12)
}
function genTrap(d: Difficulty, rng: RNG): Question {
  const h = rng.pick([3.5, 2.5, 4.5, 1.5, 3, 4, 5, 6])
  return valQ({ kpId: KP_CIRCLE, d, rng, sig: `trap-${h}`, stem: [text('m6.circ.c.trapQ', { h }), geoPart([trapFig(h)], '梯形里画了一个半圆')], value: h, wrong: [h * 2, h / 2] })
}

// ── 第 2 档 ──

type AxesKind = 'one' | 'concentric' | 'cross' | 'bigTwo' | 'three' | 'rect'
const AXES: Record<AxesKind, 1 | 2 | 3 | 'many'> = { one: 'many', concentric: 'many', cross: 2, bigTwo: 1, three: 3, rect: 2 }
/** 练习十 10 的六种图 */
export function axesFig(k: AxesKind): GeoFig {
  const R = 30
  const O: P = [0, 0]
  const c = (p: P, r: number): GeoItem[] => [circ(p, r, { stroke: 'd' }), pt(p)]
  let items: GeoItem[]
  if (k === 'one') items = c(O, R)
  else if (k === 'concentric') items = [circ(O, R, { stroke: 'd' }), ...c(O, R * 0.78)]
  else if (k === 'cross') items = [...c(O, R), ...c([R, 0], R)]
  else if (k === 'bigTwo') {
    const rs = R * 0.55
    const x = Math.sqrt((R + rs) ** 2 - rs ** 2)
    items = [...c(O, R), ...c([x, -rs], rs), ...c([x, rs], rs)]
  } else if (k === 'three') {
    const r = R * 0.75
    items = [...c([0, 0], r), ...c([2 * r, 0], r), ...c([r, -r * Math.sqrt(3)], r)]
  } else items = [poly([[-R * 1.7, -R], [R * 1.7, -R], [R * 1.7, R], [-R * 1.7, R]], { stroke: 'd' }), ...c(O, R)]
  return fitFig(items, 12)
}
/** 练习十 10：这个图形有几条对称轴 */
function genAxesFig(d: Difficulty, rng: RNG): Question {
  const k = rng.pick(Object.keys(AXES) as AxesKind[])
  const ans = AXES[k]
  return pickWord(KP_CIRCLE, d, rng, `axesfig-${k}`, [text('m6.circ.c.axesFigQ'), geoPart([axesFig(k)], '由圆组成的图形')], lines(ans), ([1, 2, 3, 'many'] as const).filter((x) => x !== ans).map((x) => lines(x)))
}

type ShapeAx = 'rect' | 'square' | 'equi' | 'isoTrap' | 'iso'
const SHAPE_AXES: Record<ShapeAx, 1 | 2 | 3 | 4> = { rect: 2, square: 4, equi: 3, isoTrap: 1, iso: 1 }
function shapeAxFig(s: ShapeAx): GeoFig {
  const pts: Record<ShapeAx, P[]> = {
    rect: [[0, 0], [110, 0], [110, 64], [0, 64]],
    square: [[0, 0], [76, 0], [76, 76], [0, 76]],
    equi: [[0, 78], [90, 78], [45, 0]],
    isoTrap: [[0, 66], [120, 66], [88, 0], [32, 0]],
    iso: [[0, 90], [70, 90], [35, 0]],
  }
  return fitFig([poly(pts[s], { fill: 'c', stroke: 'c' })], 12)
}
/** 练习十 11：学过的图形有几条对称轴 */
function genAxesShape(d: Difficulty, rng: RNG): Question {
  const s = rng.pick(Object.keys(SHAPE_AXES) as ShapeAx[])
  const ans = SHAPE_AXES[s]
  return pickWord(KP_CIRCLE, d, rng, `axesshape-${s}`, [text(`m6.circ.c.axesShape.${s}`), geoPart([shapeAxFig(s)], '一个学过的平面图形')], lines(ans), ([1, 2, 3, 4] as const).filter((x) => x !== ans).map((x) => lines(x)))
}

const C_TRAP: [string, boolean][] = [
  ['ends', false],
  ['through', false],
  ['twoCircles', false],
  ['longest', true],
]
/** 定义辨析的判断陷阱（练习十 3 右边的方法：圆里最长的线段是直径） */
function genCTrap(d: Difficulty, rng: RNG): Question {
  const [k, yes] = rng.pick(C_TRAP)
  return judge(KP_CIRCLE, d, rng, `ctrap-${k}`, [text(`m6.circ.c.t.${k}`)], yes)
}

/** 生活中的数学（第 54 页）：车轮、井盖 */
function genLife(d: Difficulty, rng: RNG): Question {
  const k = rng.pick(['wheel', 'cover'] as const)
  const ans = k === 'wheel' ? wRadius : wDiameter
  return pickWord(KP_CIRCLE, d, rng, `life-${k}`, [text(`m6.circ.c.life.${k}`)], ans, [wRadius, wDiameter, wCenter].filter((w) => w !== ans))
}

/** 练习十 3 左图：直尺上两块三角尺夹住圆，三角尺的直角边对着 a 和 b（厘米） */
export function rulerFig(a: number, b: number): GeoFig {
  const S = 24
  const X = (cm: number): number => cm * S
  const dd = b - a
  const H = (dd + 0.9) * S
  const items: GeoItem[] = [poly([[X(-0.4), 0], [X(8.4), 0], [X(8.4), 30], [X(-0.4), 30]], { fill: 'soft', stroke: 'soft' })]
  for (let i = 0; i <= 8; i++) items.push(seg([X(i), 0], [X(i), 9], { thin: true }), note([X(i), 20], String(i)))
  items.push(
    poly([[X(a) - H * 0.75, 0], [X(a), 0], [X(a), -H]], { fill: 'b', stroke: 'b' }),
    poly([[X(b), 0], [X(b) + H * 0.75, 0], [X(b), -H]], { fill: 'b', stroke: 'b' }),
    circ([X((a + b) / 2), -X(dd / 2)], X(dd / 2), { fill: 'd', stroke: 'd' }),
  )
  return fitFig(items, 10)
}
function genRuler(d: Difficulty, rng: RNG): Question {
  const a = rng.int(1, 3)
  const dd = rng.int(2, 4)
  return numQ({ kpId: KP_CIRCLE, d, rng, sig: `ruler-${a}-${dd}`, stem: [text('m6.circ.c.rulerQ'), geoPart([rulerFig(a, a + dd)], '直尺上两块三角尺夹住一个圆')], value: dd, smart: [a + dd, dd * 2, a] })
}

/** 《墨经》「圆，一中同长也」（第 49 页、整理和复习） */
function genMojing(d: Difficulty, rng: RNG): Question {
  return pickWord(KP_CIRCLE, d, rng, 'mojing', [text('m6.circ.c.mojingQ')], wRadius, [wDiameter, wArc])
}

// ── 第 3 档 ──

/** 练习十 12：以等边三角形的三个顶点为圆心、边长为半径画圆 → 三幅图里选 */
function triCirclesFig(k: 'touch' | 'mid' | 'full'): GeoFig {
  const s = 40
  const V: P[] = [
    [0, 0],
    [s, 0],
    [s / 2, -s * Math.sqrt(3) / 2],
  ]
  const r = k === 'touch' ? s / 2 : k === 'mid' ? s * 0.68 : s
  return fitFig([...V.map((v) => circ(v, r, { stroke: 'ink' })), poly(V, { stroke: 'd' })], 8)
}
function genTriCircles(d: Difficulty, rng: RNG): Question {
  const order = rng.shuffle(['touch', 'mid', 'full'] as const)
  return pickFig({ kpId: KP_CIRCLE, d, rng, sig: `tri3-${order.join('.')}`, stem: [text('m6.circ.c.tri3Q'), geoPart(order.map(triCirclesFig), '三幅图：等边三角形和以它的顶点为圆心的三个圆', true)], count: 3, answer: order.indexOf('full') })
}
/** 两排同样大的圆（练习十 9 的延伸）：长方形的周长 */
function genTwoRows(d: Difficulty, rng: RNG): Question {
  const n = rng.pick([2, 3, 4])
  const dd = rng.int(2, 8)
  const L = n * dd
  return numQ({ kpId: KP_CIRCLE, d, rng, sig: `rows2-${n}-${dd}`, stem: [text('m6.circ.c.rows2Q', { n, L }), geoPart([rowFig(n, 2, lab(L, 'cm'))], '长方形里两排同样大的圆')], value: 2 * (L + 2 * dd), smart: [2 * (L + dd), L + 2 * dd, 4 * L] })
}

defineGenerator(KP_CIRCLE, (d, rng) => {
  const roll = rng.next()
  if (d === 1) {
    // 第 49 页认一认、画圆注意，第 50 页折一折、圆的大小和位置，做一做 1、2，练习十 1、2、7、8、9
    if (roll < 0.08) return genName(d, rng)
    if (roll < 0.15) return genDef(d, rng)
    if (roll < 0.21) return genPickSeg(d, rng)
    if (roll < 0.29) return genR2D(d, rng)
    if (roll < 0.36) return genD2R(d, rng)
    if (roll < 0.42) return genDec(d, rng)
    if (roll < 0.47) return genCount(d, rng)
    if (roll < 0.55) return genCJudge(d, rng)
    if (roll < 0.59) return genAxes(d, rng)
    if (roll < 0.65) return genPos(d, rng)
    if (roll < 0.72) return genCompass(d, rng)
    if (roll < 0.76) return genCare(d, rng)
    if (roll < 0.8) return genFold(d, rng)
    if (roll < 0.86) return genSquare(d, rng)
    if (roll < 0.92) return genRow(d, rng)
    if (roll < 0.96) return genBed(d, rng)
    return genTrap(d, rng)
  }
  if (d === 2) {
    // 练习十 3、10、11，生活中的数学，《墨经》，定义辨析的判断
    if (roll < 0.24) return genAxesFig(d, rng)
    if (roll < 0.42) return genAxesShape(d, rng)
    if (roll < 0.6) return genCTrap(d, rng)
    if (roll < 0.74) return genLife(d, rng)
    if (roll < 0.9) return genRuler(d, rng)
    return genMojing(d, rng)
  }
  // 练习十 12（拓展提升）、两排圆、小数大一点的 d ↔ r
  if (roll < 0.4) return genTriCircles(d, rng)
  if (roll < 0.75) return genTwoRows(d, rng)
  return genDec(d, rng)
})

// ═════════════════════════════════════════════════════════════
// 2. 扇形的认识（第 51 页：弧、扇形、圆心角，扇形例 1，做一做 1、2；练习十 5、6）
// ═════════════════════════════════════════════════════════════

export const KP_SECTOR = 'm6s1-05-sector'

/**
 * 一个扇形（第 51 页右图的样子）：虚线画整个圆，实线涂色画扇形 AOB（从 rot 度起、圆心角 ang 度），
 * 弧描红（arcRed）、圆心处画角的记号（mark：90° 画直角方块，180° 画半圆）
 */
export function sectorFig(o: { ang: number; rot: number; R?: number; arcRed?: boolean; letters?: boolean; mark?: boolean; dashed?: boolean }): GeoFig {
  const C: P = [0, 0]
  const R = o.R ?? 58
  const a0 = o.rot
  const a1 = o.rot + o.ang
  const A = polar(C, R, a1)
  const B = polar(C, R, a0)
  const items: GeoItem[] = []
  if (o.dashed !== false) items.push(circ(C, R, { stroke: 'soft', dash: true, thin: true }))
  items.push(sector(C, R, a0, a1, 'a', 'a'))
  if (o.arcRed) items.push(arcLine(C, R, a0, a1, 'd'))
  items.push(pt(C), letter(polar(C, 16, a0 + o.ang / 2 + 180), 'O'))
  if (o.letters !== false) items.push(letter(polar(C, R + 14, a1), 'A'), letter(polar(C, R + 14, a0), 'B'))
  if (o.mark !== false) {
    if (o.ang === 90) items.push({ t: 'arc', at: C, a: B, b: A, right: true })
    else items.push({ t: 'arc', at: C, a: B, b: A, ccw: true, r: 14 })
  }
  return fitFig(items, 14)
}

/** 第 51 页的定义：说定义，选名称 */
function genSDef(d: Difficulty, rng: RNG): Question {
  const k = rng.pick(['arc', 'sector', 'central'] as const)
  const ans = k === 'arc' ? wArc : k === 'sector' ? wSector : wCentral
  return pickWord(KP_SECTOR, d, rng, `def-${k}`, [text(`m6.circ.s.def.${k}`)], ans, [wArc, wSector, wCentral, wRadius].filter((w) => w !== ans))
}

/** 第 51 页右图：看图认扇形、圆心角、弧 */
function genSFig(d: Difficulty, rng: RNG): Question {
  const ask = rng.pick(['shape', 'angle', 'arc'] as const)
  const rot = rng.pick([-40, 20, 60, 120, 200, 250])
  const ang = rng.pick([70, 100, 120, 130])
  const fig = sectorFig({ ang, rot, arcRed: ask === 'arc' })
  const stem = [text(`m6.circ.s.fig.${ask}`), geoPart([fig], '虚线画的圆里，有一个涂色的部分 AOB')]
  const sig = `fig-${ask}-${rot}-${ang}`
  if (ask === 'shape') return pickWord(KP_SECTOR, d, rng, sig, stem, wSector, [W('m6.circ.w.tri'), W('m6.circ.w.semicircle')])
  // 圆心角取 70°–130°（不是 90°、180°），「直角」「平角」都不对
  if (ask === 'angle') return pickWord(KP_SECTOR, d, rng, sig, stem, wCentral, [W('m6.circ.w.right'), W('m6.circ.w.straight')])
  return pickWord(KP_SECTOR, d, rng, sig, stem, wArc, [wRadius, wDiameter])
}

type AngKind = 'center' | 'near' | 'onCircle' | 'near2'
/** 练习十 5：圆里的一个角——顶点在圆心 / 在圆里但不是圆心 / 在圆上 */
export function angleFig(k: AngKind, rot: number): GeoFig {
  const C: P = [0, 0]
  const R = 40
  const A = polar(C, R, rot + 35)
  const B = polar(C, R, rot - 35)
  const V = k === 'center' ? C : k === 'near' ? polar(C, R * 0.38, rot + 90) : k === 'near2' ? polar(C, R * 0.42, rot + 250) : polar(C, R, rot + 180)
  return fitFig(
    [
      circ(C, R, { stroke: 'd' }),
      pt(C),
      letter(clearOf(C, 14, [[V, A], [V, B]]), 'O'),
      seg(V, A, { stroke: 'b' }),
      seg(V, B, { stroke: 'b' }),
      { t: 'arc', at: V, a: A, b: B, r: 11 },
      letter(polar(C, R + 12, rot + 35), 'A'),
      letter(polar(C, R + 12, rot - 35), 'B'),
    ],
    10,
  )
}
function genWhich(d: Difficulty, rng: RNG): Question {
  const n = rng.pick([3, 4])
  const order = rng.shuffle(['center' as AngKind, ...rng.shuffle(['near', 'onCircle', 'near2'] as AngKind[]).slice(0, n - 1)])
  const rot = rng.pick([0, 30, 160, 210])
  const figs = order.map((k) => angleFig(k, rot))
  return pickFig({ kpId: KP_SECTOR, d, rng, sig: `which-${order.join('.')}`, stem: [text('m6.circ.s.whichQ'), geoPart(figs, '几个圆，每个圆里画了一个角', true)], count: figs.length, answer: order.indexOf('center') })
}

/** 圆心角 → 是圆的几分之几（扇形例 1 的对话：半圆 180°、1/4 圆 90°） */
const DEG_FRAC: [number, string][] = [
  [180, '1/2'],
  [90, '1/4'],
  [120, '1/3'],
  [60, '1/6'],
  [45, '1/8'],
  [30, '1/12'],
  [270, '3/4'],
  [72, '1/5'],
  [36, '1/10'],
  [240, '2/3'],
]
function genToFrac(d: Difficulty, rng: RNG): Question {
  const [deg, f] = rng.pick(DEG_FRAC)
  const wrong = rng.shuffle(DEG_FRAC.filter(([x]) => x !== deg).map(([, g]) => g)).slice(0, 3)
  return pickWord(KP_SECTOR, d, rng, `tofrac-${deg}`, [text('m6.circ.s.toFracQ', { n: deg })], f, wrong)
}
/** 是圆的几分之几 → 圆心角 */
function genToDeg(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.2)) return numQ({ kpId: KP_SECTOR, d, rng, sig: 'todeg-half', stem: [text('m6.circ.s.halfQ')], value: 180, smart: [90, 360] })
  const [deg, f] = rng.pick(DEG_FRAC.filter(([x]) => x !== 180))
  return numQ({ kpId: KP_SECTOR, d, rng, sig: `todeg-${deg}`, stem: [text('m6.circ.s.toDegQ', { f })], value: deg, smart: [deg / 2, Math.min(360, deg * 2), 360 - deg] })
}
/** 平均分成 n 个扇形，每个的圆心角 */
function genSplit(d: Difficulty, rng: RNG): Question {
  const n = rng.pick([2, 3, 4, 5, 6, 8, 9, 10, 12])
  return numQ({ kpId: KP_SECTOR, d, rng, sig: `split-${n}`, stem: [text('m6.circ.s.splitQ', { n }), { kind: 'frac-shape', items: [{ shape: 'circle', parts: n, shaded: [0] }] }], value: 360 / n, smart: [180 / n, 100 / n, 360 - 360 / n] })
}
/** 平均分成 n 份、连着涂 k 份：涂色扇形的圆心角 */
function genShade(d: Difficulty, rng: RNG): Question {
  const n = rng.pick([4, 6, 8, 10, 12])
  const k = rng.int(2, n - 1)
  const start = rng.int(0, n - 1)
  const shaded = Array.from({ length: k }, (_, i) => (start + i) % n)
  return numQ({ kpId: KP_SECTOR, d, rng, sig: `shade-${n}-${k}`, stem: [text('m6.circ.s.shadeQ', { n }), { kind: 'frac-shape', items: [{ shape: 'circle', parts: n, shaded }] }], value: (360 * k) / n, smart: [360 / n, (360 * (n - k)) / n, 180 * k / n] })
}
/** 扇形例 1：同一个圆里，圆心角大的扇形大 */
function genSCmp(d: Difficulty, rng: RNG): Question {
  const a = rng.int(2, 32) * 10
  const b = rng.chance(0.12) ? a : rng.int(2, 32) * 10
  const ans = a > b ? '>' : a < b ? '<' : '='
  // 要求和比较的两项分成两段：「或 =：」后面接着读会连成一句，分开中间有停顿
  return pickWord(KP_SECTOR, d, rng, `cmp-${a}-${b}`, [text('m6.circ.s.cmpLead'), text('m6.circ.s.cmpExpr', { a, b })], ans, ['>', '<', '='].filter((x) => x !== ans))
}
/** 扇形例 1 的发现 */
function genRelate(d: Difficulty, rng: RNG): Question {
  return pickWord(KP_SECTOR, d, rng, 'relate', [text('m6.circ.s.relateQ')], W('m6.circ.w.byAngle'), [W('m6.circ.w.byCenterPos'), W('m6.circ.w.byTurn')])
}
/** 扇形的边：两条半径、一条弧 */
function genSides(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) return pickWord(KP_SECTOR, d, rng, 'sides', [text('m6.circ.s.sidesQ'), geoPart([sectorFig({ ang: 110, rot: rng.pick([30, 120, 220]), letters: false, mark: false })], '一个扇形')], wRadius, [wDiameter, wArc])
  return numQ({ kpId: KP_SECTOR, d, rng, sig: 'arcs', stem: [text('m6.circ.s.arcsQ')], value: 1, smart: [2, 3] })
}
/** 练习十 6：扇形是轴对称图形 */
function genSym(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) return judge(KP_SECTOR, d, rng, 'sym-judge', [text('m6.circ.s.symJ')], true)
  return pickWord(KP_SECTOR, d, rng, 'sym-count', [text('m6.circ.s.symQ'), geoPart([sectorFig({ ang: 100, rot: 40, letters: false, mark: false, dashed: false })], '一个扇形')], lines(1), [lines(2), lines('many')])
}
/** 做一做 1：生活中的扇形 */
function genSLife(d: Difficulty, rng: RNG): Question {
  const k = rng.pick(['fan', 'pizza', 'shelf'] as const)
  const wrong: Record<typeof k, LStr[]> = {
    fan: [W('m6.circ.w.rect'), W('m6.circ.w.circle')],
    pizza: [W('m6.circ.w.tri'), W('m6.circ.w.square')],
    shelf: [W('m6.circ.w.rect'), W('m6.circ.w.tri')],
  }
  return pickWord(KP_SECTOR, d, rng, `life-${k}`, [text(`m6.circ.s.life.${k}`)], wSector, wrong[k])
}
/** 做一做 2：先画半径 r 的圆，再画圆心角 a° 的扇形 */
function genDraw(d: Difficulty, rng: RNG): Question {
  const r = rng.int(2, 5)
  const a = rng.pick([100, 80, 110, 130, 70])
  if (rng.chance(0.55)) return numQ({ kpId: KP_SECTOR, d, rng, sig: `draw-r-${r}-${a}`, stem: [text('m6.circ.s.drawR', { r, a })], value: r, smart: [2 * r, r + 1] })
  return pickWord(KP_SECTOR, d, rng, `draw-tool-${a}`, [text('m6.circ.s.drawTool', { a })], W('m6.circ.w.protractor'), [W('m6.circ.w.compasses'), W('m6.circ.w.ruler')])
}
/** 扇形例 1 下面两幅图：半圆、1/4 圆的圆心角 */
function genHalfQuarter(d: Difficulty, rng: RNG): Question {
  const ang = rng.pick([180, 90])
  const rot = rng.pick([0, 90, 180, 270])
  return numQ({ kpId: KP_SECTOR, d, rng, sig: `hq-${ang}-${rot}`, stem: [text('m6.circ.s.hqQ'), geoPart([sectorFig({ ang, rot, letters: true })], '虚线画的圆里，有一个涂色的扇形')], value: ang, smart: [ang === 180 ? 90 : 180, 360, ang === 90 ? 45 : 360] })
}

// ── 第 2、3 档 ──

const S_TRAP: [string, boolean][] = [
  ['bigger', false],
  ['semi', true],
  ['only', false],
]
function genSTrap(d: Difficulty, rng: RNG): Question {
  const [k, yes] = rng.pick(S_TRAP)
  return judge(KP_SECTOR, d, rng, `trap-${k}`, [text(`m6.circ.s.t.${k}`)], yes)
}
/** 圆心角一样、半径不一样的两个扇形，哪个大 */
function genDiffR(d: Difficulty, rng: RNG): Question {
  const ang = rng.pick([60, 90, 120])
  const big = rng.int(0, 1)
  const rs = big === 0 ? [56, 36] : [36, 56]
  const figs = rs.map((R) => sectorFig({ ang, rot: 30, R, letters: false, dashed: false }))
  return pickWord(KP_SECTOR, d, rng, `diffr-${ang}-${big}`, [text('m6.circ.s.diffRQ'), geoPart(figs, '两个圆心角一样大的扇形', true)], String(big + 1), [String(2 - big), W('m6.circ.w.sameBig')])
}
/** 钟面上的圆心角 */
function genClock(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    const h = rng.pick([1, 2, 3, 4, 5, 7, 8, 9, 10, 11])
    const ang = 30 * Math.min(h, 12 - h)
    return numQ({ kpId: KP_SECTOR, d, rng, sig: `clock-${h}`, stem: [text('m6.circ.s.clockQ', { h }), { kind: 'clock', hour: h, minute: 0 }], value: ang, smart: [ang + 30, 360 - ang, h * 10] })
  }
  const to = rng.int(1, 11)
  return numQ({ kpId: KP_SECTOR, d, rng, sig: `dial-${to}`, stem: [text('m6.circ.s.dialQ', { to }), { kind: 'dial', from: 12, to }], value: 30 * to, smart: [6 * to, 360 - 30 * to, 5 * to] })
}
/** 弧 AB 的读法 */
function genArcName(d: Difficulty, rng: RNG): Question {
  return pickWord(KP_SECTOR, d, rng, 'arcname', [text('m6.circ.s.arcNameQ')], W('m6.circ.w.arcAB'), [W('m6.circ.w.angAB'), W('m6.circ.w.segAB')])
}
/** 一个圆分成三个扇形，求第三个的圆心角 */
function genThird(d: Difficulty, rng: RNG): Question {
  const a = rng.int(3, 15) * 10
  const b = rng.int(3, 15) * 10
  return numQ({ kpId: KP_SECTOR, d, rng, sig: `third-${a}-${b}`, stem: [text('m6.circ.s.thirdQ', { a, b })], value: 360 - a - b, smart: [180 - a - b > 0 ? 180 - a - b : a + b, a + b] })
}
/** 圆的面积已知，圆心角 90° / 180° 的扇形面积（第 3 档） */
function genSecArea(d: Difficulty, rng: RNG): Question {
  const S = rng.int(3, 30) * 4
  const ang = rng.pick([90, 180])
  return numQ({ kpId: KP_SECTOR, d, rng, sig: `secarea-${S}-${ang}`, stem: [text('m6.circ.s.areaQ', { s: S, a: ang })], value: (S * ang) / 360, smart: [S / (ang === 90 ? 2 : 4), S] })
}

defineGenerator(KP_SECTOR, (d, rng) => {
  const roll = rng.next()
  if (d === 1) {
    // 第 51 页弧、扇形、圆心角，扇形例 1（大小看圆心角、半圆 180°、1/4 圆 90°），做一做 1、2，练习十 5、6
    if (roll < 0.08) return genSDef(d, rng)
    if (roll < 0.17) return genSFig(d, rng)
    if (roll < 0.25) return genWhich(d, rng)
    if (roll < 0.34) return genToFrac(d, rng)
    if (roll < 0.43) return genToDeg(d, rng)
    if (roll < 0.51) return genSplit(d, rng)
    if (roll < 0.59) return genShade(d, rng)
    if (roll < 0.67) return genSCmp(d, rng)
    if (roll < 0.71) return genRelate(d, rng)
    if (roll < 0.76) return genSides(d, rng)
    if (roll < 0.81) return genSym(d, rng)
    if (roll < 0.87) return genSLife(d, rng)
    if (roll < 0.93) return genDraw(d, rng)
    return genHalfQuarter(d, rng)
  }
  if (d === 2) {
    if (roll < 0.3) return genSTrap(d, rng)
    if (roll < 0.5) return genDiffR(d, rng)
    if (roll < 0.82) return genClock(d, rng)
    return genArcName(d, rng)
  }
  if (roll < 0.5) return genThird(d, rng)
  return genSecArea(d, rng)
})

// ═════════════════════════════════════════════════════════════
// 3. 圆的周长（第 55–59 页：测量、圆周率、C = πd 或 C = 2πr、周长例 1、做一做、练习十一；练习十三 1、3、6）
// ═════════════════════════════════════════════════════════════

export const KP_PERI = 'm6s1-05-circumference'

/** 标着半径或直径的圆（做一做 1、练习十二 2 的样子）：kind = r 画一条半径、d 画一条直径，label 写在线的上方 */
export function labeledCircle(kind: 'r' | 'd', label: string, R = 66, fill?: GeoTone): GeoFig {
  const C: P = [0, 0]
  const items: GeoItem[] = [circ(C, R, { stroke: 'b', fill }), pt(C)]
  // r 的标注偏左一点：字比半径的一半宽，居中写会顶到圆周
  if (kind === 'r') items.push(seg(C, [R, 0], { stroke: 'b' }), note([R * 0.42, -13], label))
  else items.push(seg([-R, 0], [R, 0], { stroke: 'b' }), note([0, -13], label))
  return fitFig(items, 14)
}

function genPDef(d: Difficulty, rng: RNG): Question {
  return pickWord(KP_PERI, d, rng, 'def', [text('m6.circ.p.defQ')], W('m6.circ.w.circumference'), [W('m6.circ.w.area'), W('m6.circ.w.dia2')])
}
/** 第 55 页：滚一圈、绳子绕一圈 */
const P_MEASURE: [string, boolean][] = [
  ['roll', true],
  ['rope', true],
  ['ruler', false],
]
function genMeasure(d: Difficulty, rng: RNG): Question {
  const [k, yes] = rng.pick(P_MEASURE)
  return judge(KP_PERI, d, rng, `measure-${k}`, [text(`m6.circ.p.m.${k}`)], yes)
}
/** 第 56 页：周长总是直径的 3 倍多一些 */
function genThree(d: Difficulty, rng: RNG): Question {
  return numQ({ kpId: KP_PERI, d, rng, sig: 'three', stem: [text('m6.circ.p.threeQ')], value: 3, smart: [2, 4, 1] })
}
/** 圆周率的名字、字母 */
function genPiName(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) return pickWord(KP_PERI, d, rng, 'pi-name', [text('m6.circ.p.piNameQ')], W('m6.circ.w.pi'), [wRadius, W('m6.circ.w.peri')])
  return pickWord(KP_PERI, d, rng, 'pi-letter', [text('m6.circ.p.piLetterQ')], 'π', ['C', 'S', 'O'])
}
/** 圆周率的近似值 3.14 */
function genApprox(d: Difficulty, rng: RNG): Question {
  return pickWord(KP_PERI, d, rng, 'approx', [text('m6.circ.p.approxQ')], '3.14', ['3.41', '31.4', '0.314'])
}
/** C = πd 或 C = 2πr */
function genFormula(d: Difficulty, rng: RNG): Question {
  const right = rng.pick(['πd', '2πr'])
  return pickWord(KP_PERI, d, rng, `formula-${right}`, [text('m6.circ.p.formulaQ')], right, rng.shuffle(['πr', 'πr²', '2πd', '2d']).slice(0, 3))
}
const P_JUDGE: [string, boolean][] = [
  ['is314', false],
  ['times', true],
  ['endless', true],
]
function genPJudge(d: Difficulty, rng: RNG): Question {
  const [k, yes] = rng.pick(P_JUDGE)
  return judge(KP_PERI, d, rng, `pj-${k}`, [text(`m6.circ.p.j.${k}`)], yes)
}
/** 做一做 1：已知直径求周长 */
function genByD(d: Difficulty, rng: RNG): Question {
  const u = rng.pick(['cm', 'dm', 'm'] as const)
  const dd = rng.pick([...Array.from({ length: 19 }, (_, i) => i + 2), 25, 30, 40, 50])
  return valQ({
    kpId: KP_PERI,
    d,
    rng,
    sig: `byd-${dd}-${u}`,
    stem: [text('m6.circ.p.byDQ', { d: dd, u: uL(u) }), geoPart([labeledCircle('d', `d=${dd} ${u}`)], '一个圆，标出了它的直径')],
    value: pi(dd),
    wrong: [pi(dd / 2), pi(dd * 2), 3 * dd, clean(PI + dd)],
  })
}
/** 做一做 1、练习十一 1：已知半径求周长 */
function genByR(d: Difficulty, rng: RNG): Question {
  const r = rng.int(1, 15)
  if (rng.chance(0.25))
    return valQ({ kpId: KP_PERI, d, rng, sig: `fountain-${r}`, stem: [text('m6.circ.p.fountainQ', { r })], value: pi(2 * r), wrong: [pi(r), pi(r * r), pi(4 * r)] })
  const u = rng.pick(['cm', 'dm', 'm'] as const)
  return valQ({
    kpId: KP_PERI,
    d,
    rng,
    sig: `byr-${r}-${u}`,
    stem: [text('m6.circ.p.byRQ', { r, u: uL(u) }), geoPart([labeledCircle('r', `r=${r} ${u}`)], '一个圆，标出了它的半径')],
    value: pi(2 * r),
    wrong: [pi(r), pi(r * r), pi(4 * r)],
  })
}
/** 做一做 2、练习十一 3：已知周长求直径 */
function genToD(d: Difficulty, rng: RNG): Question {
  const k = rng.int(1, 12)
  const ctx = rng.pick(['table', 'pillar'] as const)
  return numQ({ kpId: KP_PERI, d, rng, sig: `tod-${ctx}-${k}`, stem: [text(`m6.circ.p.toD.${ctx}`, { c: fmt(pi(k)) })], value: k, smart: [k * 2, k % 2 === 0 ? k / 2 : k + 1, k + 3] })
}
/** 已知周长求半径 */
function genToR(d: Difficulty, rng: RNG): Question {
  const k = rng.int(1, 12)
  return numQ({ kpId: KP_PERI, d, rng, sig: `tor-${k}`, stem: [text('m6.circ.p.toRQ', { c: fmt(pi(2 * k)) })], value: k, smart: [k * 2, k + 1, k * 3] })
}
/** 周长例 1 第一问：车轮滚动 1 圈前进多少米 */
function genWheel(d: Difficulty, rng: RNG): Question {
  const dd = rng.pick([50, 60, 70, 75, 80, 100])
  return valQ({ kpId: KP_PERI, d, rng, sig: `wheel-${dd}`, stem: [text('m6.circ.p.wheelQ', { d: dd })], value: pi(dd) / 100, wrong: [pi(dd), pi(dd / 2) / 100, pi(dd * 2) / 100] })
}
/** 周长例 1 第二问：一共滚动了多少圈 */
const TURNS: [number, number][] = [
  [75, 4710],
  [50, 157],
  [50, 314],
  [50, 1570],
  [100, 314],
  [80, 2512],
  [75, 2355],
]
function genTurns(d: Difficulty, rng: RNG): Question {
  const [dd, L] = rng.pick(TURNS)
  const c = pi(dd) / 100
  const n = Math.round((L * 1000) / c)
  return numQ({ kpId: KP_PERI, d, rng, sig: `turns-${dd}-${L}`, stem: [text('m6.circ.p.turnsQ', { d: dd, c: fmt(c), L })], value: n, smart: [n / 10, n * 10, n / 100] })
}
/** 练习十一 4：独轮车 */
function genUnicycle(d: Difficulty, rng: RNG): Question {
  const n = rng.int(10, 50)
  return numQ({ kpId: KP_PERI, d, rng, sig: `unicycle-${n}`, stem: [text('m6.circ.p.unicycleQ', { L: fmt(1.256 * n) })], value: n, smart: [n * 2, n * 10] })
}
/** 练习十三 1：中国天眼的圈梁 */
function genFast(d: Difficulty, rng: RNG): Question {
  const dd = rng.pick([500, 100, 200, 300, 50])
  return numQ({ kpId: KP_PERI, d, rng, sig: `fast-${dd}`, stem: [text(dd === 500 ? 'm6.circ.p.fastQ' : 'm6.circ.p.ringRoadQ', { d: dd })], value: pi(dd), smart: [pi(dd / 2), pi(dd * 2), 3 * dd] })
}
/** 练习十一 5：挂钟分针尖端走过的路程 */
function genMinute(d: Difficulty, rng: RNG): Question {
  const l = rng.pick([10, 12, 15, 20, 25])
  const t = rng.pick([15, 30, 45])
  return valQ({
    kpId: KP_PERI,
    d,
    rng,
    sig: `minute-${l}-${t}`,
    stem: [text('m6.circ.p.minuteQ', { l, t }), { kind: 'dial', from: 12, to: t / 5 }],
    value: pi(2 * l) * (t / 60),
    wrong: [pi(l) * (t / 60), pi(2 * l), pi(l * l) * (t / 60)],
  })
}
/** 练习十一 11 的表（缺一格） */
function genPTable(d: Difficulty, rng: RNG): Question {
  const k = rng.pick(['c2d', 'd2c', 'r2c'] as const)
  const x = rng.int(1, 10)
  const head = (h: string): LStr => W(`m6.circ.t.${h}`)
  if (k === 'c2d')
    return numQ({ kpId: KP_PERI, d, rng, sig: `table-c2d-${x}`, stem: [text('m6.circ.p.tableQ'), { kind: 'stat-table', rows: [[head('c'), fmt(pi(x))], [head('d'), null]], head: 'col' }], value: x, smart: [x * 2, x + 1] })
  if (k === 'd2c')
    return valQ({ kpId: KP_PERI, d, rng, sig: `table-d2c-${x}`, stem: [text('m6.circ.p.tableQ'), { kind: 'stat-table', rows: [[head('d'), x], [head('c'), null]], head: 'col' }], value: pi(x), wrong: [pi(x / 2), pi(2 * x)] })
  return valQ({ kpId: KP_PERI, d, rng, sig: `table-r2c-${x}`, stem: [text('m6.circ.p.tableQ'), { kind: 'stat-table', rows: [[head('r'), x], [head('c'), null]], head: 'col' }], value: pi(2 * x), wrong: [pi(x), pi(x * x)] })
}

// ── 第 2 档 ──

/** 练习十一 2：小丽在圆形亭子里沿直径走 */
function genPavilion(d: Difficulty, rng: RNG): Question {
  const n = rng.pick([10, 12, 14, 16])
  const s = rng.pick([50, 55, 60])
  const dm = (n * s) / 100
  return decQ({ kpId: KP_PERI, d, rng, sig: `pavilion-${n}-${s}`, stem: [text('m6.circ.p.pavilionQ', { n, s })], value: pi(dm), wrong: [pi(dm / 2), pi(n * s), pi(dm * 2)] })
}
/** 练习十一 6：牛栏围几圈铁丝、每隔 2 米打木桩 */
function genWire(d: Difficulty, rng: RNG): Question {
  const r = rng.pick([10, 15, 30, 45])
  if (rng.chance(0.55)) {
    const k = rng.pick([2, 3])
    return valQ({ kpId: KP_PERI, d, rng, sig: `wire-${r}-${k}`, stem: [text('m6.circ.p.wireQ', { r, k })], value: pi(2 * r) * k, wrong: [pi(r) * k, pi(2 * r), pi(2 * r) * (k + 1)] })
  }
  const n = Math.floor(pi(2 * r) / 2)
  return numQ({ kpId: KP_PERI, d, rng, sig: `stakes-${r}`, stem: [text('m6.circ.p.stakesQ', { r })], value: n, smart: [n + 1, n * 2, Math.floor(pi(r) / 2)] })
}
/** 练习十一 8：正方形纸片里剪最大的圆 */
function genSquarePaper(d: Difficulty, rng: RNG): Question {
  const P = rng.pick([100, 40, 80, 60, 120, 20])
  return valQ({ kpId: KP_PERI, d, rng, sig: `paper-${P}`, stem: [text('m6.circ.p.paperQ', { p: P })], value: P / 8, wrong: [P / 4, P / 2] })
}
/** 练习十一 7：看图填空（正方形里最大的圆；长方形里两个整圆和半个圆） */
function halfRowFig(r: number): GeoFig {
  const R = 30
  const items: GeoItem[] = [poly([[0, 0], [5 * R, 0], [5 * R, 2 * R], [0, 2 * R]], { stroke: 'd' })]
  for (const cx of [R, 3 * R]) items.push(circ([cx, R], R, { stroke: 'd' }), pt([cx, R]))
  items.push(arcLine([5 * R, R], R, 90, 270, 'd'), pt([5 * R, R]), seg([R, R], [2 * R, R], { stroke: 'd' }), note([R, R - 13], `r=${fmt(r)}`))
  return fitFig(items, 14)
}
function genFillFig(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    const r = rng.int(2, 6)
    const ask = rng.pick(['sq', 'c'] as const)
    const stem = [text(`m6.circ.p.fill.sq.${ask}`, { r }), geoPart([squareCircleFig(null, { rLabel: `r=${r}` })], '正方形里画了一个最大的圆')]
    if (ask === 'sq') return numQ({ kpId: KP_PERI, d, rng, sig: `fill-sq-${r}`, stem, value: 8 * r, smart: [4 * r, 16 * r, 2 * r * 4 + 4] })
    return valQ({ kpId: KP_PERI, d, rng, sig: `fill-c-${r}`, stem, value: pi(2 * r), wrong: [pi(r), 8 * r, pi(4 * r)] })
  }
  const r = rng.pick([1, 1.5, 2, 2.5, 3])
  const ask = rng.pick(['rect', 'c'] as const)
  const stem = [text(`m6.circ.p.fill.half.${ask}`, { r }), geoPart([halfRowFig(r)], '长方形里有两个整圆和半个圆')]
  if (ask === 'rect') return valQ({ kpId: KP_PERI, d, rng, sig: `fill-rect-${r}`, stem, value: 14 * r, wrong: [16 * r, 12 * r, 7 * r] })
  return valQ({ kpId: KP_PERI, d, rng, sig: `fill-rc-${r}`, stem, value: pi(2 * r), wrong: [pi(r), pi(r * r)] })
}
/** 练习十一 9：窗户沿外边装一圈彩灯（中间那条线上不装） */
export function windowFig(a: number): GeoFig {
  const S = 110
  const out = chain([[0, S]], [[0, 0]], arcPts([S / 2, 0], S / 2, 180, 0), [[S, S]])
  return fitFig(
    [poly(out, { fill: 'b', stroke: 'b' }), seg([0, 0], [S, 0], { stroke: 'b', dash: true }), dimLine([0, S], [S, S], lab(a, 'cm'), -16), dimLine([S, S], [S, 0], lab(a, 'cm'), -34), note([S / 2, -18], `d=${a} cm`)],
    16,
  )
}
function genWindow(d: Difficulty, rng: RNG): Question {
  const a = rng.pick([50, 40, 60, 80, 100])
  return valQ({ kpId: KP_PERI, d, rng, sig: `window-${a}`, stem: [text('m6.circ.p.windowQ'), geoPart([windowFig(a)], `下面是边长 ${a} 厘米的正方形、上面是直径 ${a} 厘米的半圆的窗户`)], value: 3 * a + pi(a) / 2, wrong: [4 * a + pi(a) / 2, 3 * a + pi(a), 2 * a + pi(a) / 2] })
}
/** 半圆的周长 */
function genSemiPeri(d: Difficulty, rng: RNG): Question {
  const dd = rng.int(1, 10) * 2
  return valQ({
    kpId: KP_PERI,
    d,
    rng,
    sig: `semi-${dd}`,
    stem: [text('m6.circ.p.semiQ', { d: dd }), geoPart([fitFig([poly(chain(arcPts([0, 0], 50, 180, 0)), { fill: 'c', stroke: 'c' }), pt([0, 0]), note([0, 14], `d=${dd} cm`)], 16)], '一个半圆')],
    value: pi(dd) / 2 + dd,
    wrong: [pi(dd) / 2, pi(dd) / 2 + dd / 2, pi(dd)],
  })
}
/** 练习十三 3：铁条做铁环，最多做几个（去尾） */
const HOOPS: [number, number][] = [
  [10, 50],
  [5, 40],
  [6, 30],
  [8, 60],
  [12, 50],
  [20, 100],
]
function genHoops(d: Difficulty, rng: RNG): Question {
  const [L, dd] = rng.pick(HOOPS)
  const n = Math.floor((L * 100) / pi(dd))
  return numQ({ kpId: KP_PERI, d, rng, sig: `hoops-${L}-${dd}`, stem: [text('m6.circ.p.hoopsQ', { L, d: dd })], value: n, smart: [n + 1, Math.floor((L * 100) / dd), n * 2] })
}
/** 练习十三 6：压路机 */
function genRoller(d: Difficulty, rng: RNG): Question {
  const dd = rng.pick([1.7, 1.5, 1.2, 2])
  const n = rng.pick([5, 6, 8])
  const t = rng.pick([10, 5, 4])
  return valQ({ kpId: KP_PERI, d, rng, sig: `roller-${dd}-${n}-${t}`, stem: [text('m6.circ.p.rollerQ', { d: dd, n, t })], value: pi(dd) * n * t, wrong: [pi(dd) * n, pi(dd / 2) * n * t, pi(dd) * t] })
}
/** 练习十一 11 的填空：半径扩大到原来的 n 倍，周长 / 直径扩大到原来的几倍 */
function genScale(d: Difficulty, rng: RNG): Question {
  const n = rng.int(2, 6)
  const k = rng.pick(['c', 'd'] as const)
  return numQ({ kpId: KP_PERI, d, rng, sig: `scale-${k}-${n}`, stem: [text(`m6.circ.p.scale.${k}`, { n })], value: n, smart: [n * n, 2 * n, n + 1] })
}
/** 你知道吗（第 56 页）：祖冲之、九章算术 */
function genHistory(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) return pickWord(KP_PERI, d, rng, 'zu', [text('m6.circ.p.zuQ')], W('m6.circ.w.zu'), [W('m6.circ.w.liu'), W('m6.circ.w.hua')])
  return numQ({ kpId: KP_PERI, d, rng, sig: 'jiuzhang', stem: [text('m6.circ.p.jiuzhangQ')], value: 3, smart: [4, 2] })
}

// ── 第 3 档 ──

/** 练习十一 10：大半圆挖去一个小半圆、再接一个小半圆的图形（D = 大半圆的直径） */
export function yinFig(A: number, label: string | null, fill: GeoTone = 'b'): GeoFig {
  // A = 小半圆的直径 = 大半圆的半径（图里的单位）
  const out = chain(arcPts([A, 0], A, 180, 0), arcPts([1.5 * A, 0], A / 2, 0, -180), arcPts([0.5 * A, 0], A / 2, 0, 180))
  const items: GeoItem[] = [poly(out, { fill, stroke: fill }), seg([0, 0], [2 * A, 0], { stroke: 'ink', dash: true, thin: true }), pt([0.5 * A, 0]), pt([A, 0]), pt([1.5 * A, 0])]
  if (label) items.push(dimLine([0, A / 2 + 12], [A, A / 2 + 12], label, 0), dimLine([A, A / 2 + 12], [2 * A, A / 2 + 12], label, 0))
  return fitFig(items, 14)
}
function genYinPeri(d: Difficulty, rng: RNG): Question {
  const a = rng.pick([5, 4, 6, 3])
  return valQ({ kpId: KP_PERI, d, rng, sig: `yinperi-${a}`, stem: [text('m6.circ.p.yinQ', { a }), geoPart([yinFig(70, `${a} cm`)], '由三个半圆组成的图形')], value: pi(2 * a), wrong: [pi(a), pi(2 * a) / 2 + 2 * a, pi(4 * a)] })
}
/** 练习十一 12：捆圆柱的绳子（n × n，底面直径 d） */
function ropeFig(n: number): GeoFig {
  const D = Math.min(40, 150 / n)
  const r = D / 2
  const items: GeoItem[] = []
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) items.push(circ([r + i * D, r + j * D], r, { stroke: 'd' }))
  const L = (n - 1) * D
  const corners: [P, number][] = [
    [[L + r, L + r], -90],
    [[L + r, r], 0],
    [[r, r], 90],
    [[r, L + r], 180],
  ]
  const out = chain(...corners.map(([c, a]) => arcPts(c, r, a, a + 90)))
  items.push(poly(out, { stroke: 'b' }))
  return fitFig(items, 12)
}
function genRope(d: Difficulty, rng: RNG): Question {
  const n = rng.pick([2, 3, 4])
  const dd = rng.pick([7, 5, 10])
  return valQ({ kpId: KP_PERI, d, rng, sig: `rope-${n}-${dd}`, stem: [text('m6.circ.p.ropeQ', { n, d: dd }), geoPart([ropeFig(n)], `${n} 行 ${n} 列的圆柱用绳子捆在一起`)], value: 4 * (n - 1) * dd + pi(dd), wrong: [4 * (n - 1) * dd, 4 * n * dd + pi(dd), 4 * (n - 1) * dd + pi(dd) * 4] })
}

defineGenerator(KP_PERI, (d, rng) => {
  const roll = rng.next()
  if (d === 1) {
    // 第 55 页测量、周长的定义，第 56 页圆周率与公式，周长例 1，做一做 1、2，练习十一 1–5、11，练习十三 1
    if (roll < 0.05) return genPDef(d, rng)
    if (roll < 0.1) return genMeasure(d, rng)
    if (roll < 0.14) return genThree(d, rng)
    if (roll < 0.19) return genPiName(d, rng)
    if (roll < 0.23) return genApprox(d, rng)
    if (roll < 0.28) return genFormula(d, rng)
    if (roll < 0.32) return genPJudge(d, rng)
    if (roll < 0.42) return genByD(d, rng)
    if (roll < 0.52) return genByR(d, rng)
    if (roll < 0.59) return genToD(d, rng)
    if (roll < 0.64) return genToR(d, rng)
    if (roll < 0.71) return genWheel(d, rng)
    if (roll < 0.77) return genTurns(d, rng)
    if (roll < 0.82) return genUnicycle(d, rng)
    if (roll < 0.86) return genFast(d, rng)
    if (roll < 0.93) return genMinute(d, rng)
    return genPTable(d, rng)
  }
  if (d === 2) {
    // 练习十一 2、6、7、8、9，练习十三 3、6，半圆的周长，你知道吗
    if (roll < 0.1) return genPavilion(d, rng)
    if (roll < 0.22) return genWire(d, rng)
    if (roll < 0.32) return genSquarePaper(d, rng)
    if (roll < 0.46) return genFillFig(d, rng)
    if (roll < 0.56) return genWindow(d, rng)
    if (roll < 0.66) return genSemiPeri(d, rng)
    if (roll < 0.75) return genHoops(d, rng)
    if (roll < 0.84) return genRoller(d, rng)
    if (roll < 0.92) return genScale(d, rng)
    return genHistory(d, rng)
  }
  // 练习十一 10、12（拓展提升）
  if (roll < 0.5) return genYinPeri(d, rng)
  return genRope(d, rng)
})

// ═════════════════════════════════════════════════════════════
// 4. 圆的面积（第 60–62 页：数方格、剪拼、S = πr²、面积例 1、做一做、割圆术；练习十二 1–4、12、18；练习十三 2）
// ═════════════════════════════════════════════════════════════

export const KP_AREA = 'm6s1-05-area'

/** 数方格（第 60 页）：半径 R 格的 1/4 圆压在方格纸上；shade = 满格涂黄、不满格涂绿 */
export function quarterGrid(R: number, shade: boolean, size = 150): { fig: GeoFig; full: number; part: number } {
  const full: P[] = []
  const part: P[] = []
  for (let c = 0; c < R; c++)
    for (let r = 0; r < R; r++) {
      // 格子 (c, r) 的四个角到圆心 (0, R) 的距离：最远的角在圆里 = 满格；最近的角在圆里（不在圆上）= 碰到了
      const far = (c + 1) ** 2 + (R - r) ** 2 <= R * R
      const near = c ** 2 + (R - r - 1) ** 2 < R * R
      if (far) full.push([c, r])
      else if (near) part.push([c, r])
    }
  const items: GeoItem[] = [{ t: 'grid', x: 0, y: 0, w: R, h: R, cells: shade ? full : [], fill: 'a' }]
  if (shade) items.push({ t: 'grid', x: 0, y: 0, w: R, h: R, cells: part, fill: 'c', lines: false })
  items.push(arcLine([0, R], R, 0, 90, 'ink'))
  return { fig: fitFig(items, 0.6, Math.round(size / R)), full: full.length, part: part.length }
}
/** 第 60 页：1/4 圆里满格 69、不满格 17，三种算法 */
function genGrid(d: Difficulty, rng: RNG): Question {
  const k = rng.pick(['half', 'one', 'full'] as const)
  const value = k === 'half' ? 310 : k === 'one' ? 344 : 276
  // 数好了的格子不用孩子数，图画小一点（每格 12px），手机上题目、图和选项一屏放下
  const { fig } = quarterGrid(10, true, 120)
  return numQ({ kpId: KP_AREA, d, rng, sig: `grid-${k}`, stem: [text(`m6.circ.a.grid.${k}`), geoPart([fig], '方格纸上的 1/4 个圆，满格涂黄、不满格涂绿')], value, smart: [276, 344, 310, 77.5 * 2].filter((x) => x !== value) })
}
/** 约是半径平方的 3.1 倍 */
function genRatio(d: Difficulty, rng: RNG): Question {
  return pickWord(KP_AREA, d, rng, 'ratio', [text('m6.circ.a.ratioQ')], '3.1', ['31', '2', '4'])
}
/** 想一想：方格越小越精确 */
function genFiner(d: Difficulty, rng: RNG): Question {
  return judge(KP_AREA, d, rng, 'finer', [text('m6.circ.a.finerJ')], true)
}
/**
 * 剪拼（第 61 页）：圆平均分成 n 份，小扇形上下交错拼成一排（近似长方形）；mark = 'len' 在下面画一条红线（长）、
 * 'wid' 在右边画一条红线（宽）
 */
export function stripFig(n: number, mark: 'len' | 'wid' | null): GeoFig {
  const R = n >= 16 ? 64 : 52
  const h = 180 / n
  const w = 2 * R * Math.sin(rad(h))
  const m = n / 2
  const H = R
  const items: GeoItem[] = []
  for (let i = 0; i < m; i++) {
    const v: P = [w / 2 + i * w, H]
    items.push(poly([v, ...arcPts(v, R, 90 - h, 90 + h, 2)], { fill: 'a', stroke: 'a' }))
    const a: P = [(i + 1) * w, H - R * Math.cos(rad(h))]
    items.push(poly([a, ...arcPts(a, R, 270 - h, 270 + h, 2)], { fill: 'c', stroke: 'c' }))
  }
  const bottom = H - R * Math.cos(rad(h)) + R
  if (mark === 'len') items.push(seg([w / 4, bottom + 10], [m * w + w / 4, bottom + 10], { stroke: 'd' }))
  if (mark === 'wid') items.push(seg([m * w + w / 2 + 10, 0], [m * w + w / 2 + 10, R], { stroke: 'd' }))
  return fitFig(items, 12)
}
function genCutShape(d: Difficulty, rng: RNG): Question {
  const n = rng.pick([8, 16])
  return pickWord(KP_AREA, d, rng, `cut-${n}`, [text('m6.circ.a.cutQ', { n }), geoPart([stripFig(n, null)], `圆平均分成 ${n} 份后拼成的图形`)], W('m6.circ.w.rect'), [W('m6.circ.w.tri'), W('m6.circ.w.trap')])
}
function genCutSide(d: Difficulty, rng: RNG): Question {
  const n = rng.pick([8, 16])
  const ask = rng.pick(['len', 'wid'] as const)
  const wHalfC = W('m6.circ.w.halfC')
  const ans = ask === 'len' ? wHalfC : wRadius
  return pickWord(KP_AREA, d, rng, `side-${ask}-${n}`, [text('m6.circ.a.sideQ'), geoPart([stripFig(n, ask)], '圆剪拼成的近似长方形，一条边画了红线')], ans, [wHalfC, W('m6.circ.w.peri'), wDiameter, wRadius].filter((x) => x !== ans))
}
/** S = πr² */
function genAFormula(d: Difficulty, rng: RNG): Question {
  return pickWord(KP_AREA, d, rng, 'formula', [text('m6.circ.a.formulaQ')], 'πr²', ['2πr', 'πd', 'πr'])
}
/** r² 的意思 */
function genSquareMean(d: Difficulty, rng: RNG): Question {
  return pickWord(KP_AREA, d, rng, 'rsq', [text('m6.circ.a.rsqQ')], 'r × r', ['r × 2', 'r + 2'])
}
/** 练习十二 1、2：已知半径求面积 */
function genAByR(d: Difficulty, rng: RNG): Question {
  const u = rng.pick(['cm', 'dm', 'm'] as const)
  const r = rng.pick([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 20])
  return valQ({
    kpId: KP_AREA,
    d,
    rng,
    sig: `byr-${r}-${u}`,
    stem: [text('m6.circ.a.byRQ', { r, u: uL(u), s: uA(u) }), geoPart([labeledCircle('r', `r=${r} ${u}`, 56, 'c')], '一个圆，标出了它的半径')],
    value: pi(r * r),
    wrong: [pi(2 * r), pi(4 * r * r), pi(r), 3 * r * r],
  })
}
/** 做一做 1、练习十二 2、练习十三 2：已知直径求面积 */
function genAByD(d: Difficulty, rng: RNG): Question {
  const dd = rng.pick([1, 2, 4, 6, 8, 10, 12, 20, 40])
  const ctx = dd === 1 ? 'table' : dd === 20 ? 'embroidery' : 'plain'
  const r = dd / 2
  const stem = ctx === 'plain' ? [text('m6.circ.a.byDQ', { d: dd }), geoPart([labeledCircle('d', `d=${dd} cm`, 56, 'c')], '一个圆，标出了它的直径')] : [text(`m6.circ.a.byD.${ctx}`)]
  return valQ({ kpId: KP_AREA, d, rng, sig: `byd-${dd}`, stem, value: pi(r * r), wrong: [pi(dd * dd), pi(dd), pi(r), pi(dd * dd) / 2] })
}
/** 做一做 2、练习十二 4：已知周长求面积 */
function genAByC(d: Difficulty, rng: RNG): Question {
  const r = rng.pick([1, 2, 3, 4, 5, 6, 10, 20])
  const ctx = r === 5 ? 'pool' : r === 20 ? 'tree' : 'plain'
  return valQ({ kpId: KP_AREA, d, rng, sig: `byc-${r}`, stem: [text(`m6.circ.a.byC.${ctx}`, { c: fmt(pi(2 * r)) })], value: pi(r * r), wrong: [pi(4 * r * r), pi(r), pi(2 * r * r)] })
}
/** 面积例 1：风电机组叶轮的扫风面积 */
function genWind(d: Difficulty, rng: RNG): Question {
  const r = rng.pick([150, 100, 110, 120, 130, 140, 160])
  const s = pi(r * r)
  if (rng.chance(0.55)) return numQ({ kpId: KP_AREA, d, rng, sig: `wind-${r}`, stem: [text('m6.circ.a.windQ', { r })], value: s, smart: [pi(2 * r), pi(r) * 100, pi(4 * r * r)] })
  const n = Math.round(s / 7140)
  return numQ({ kpId: KP_AREA, d, rng, sig: `field-${r}`, stem: [text('m6.circ.a.fieldQ', { s: fmt(s) })], value: n, smart: [n + 1, n - 1, n * 10] })
}
/** 练习十二 3：自动旋转喷灌装置 */
function genSpray(d: Difficulty, rng: RNG): Question {
  const r = rng.pick([10, 5, 6, 8, 12, 15, 20])
  return valQ({ kpId: KP_AREA, d, rng, sig: `spray-${r}`, stem: [text('m6.circ.a.sprayQ', { r })], value: pi(r * r), wrong: [pi(2 * r), pi(4 * r * r), pi(r)] })
}
/** 练习十二 2：同一个圆的周长和面积 */
function genBoth(d: Difficulty, rng: RNG): Question {
  const dd = rng.pick([4, 6, 8, 10, 12])
  const ask = rng.pick(['c', 's'] as const)
  const C = pi(dd)
  const S = pi((dd / 2) ** 2)
  if (ask === 'c') return valQ({ kpId: KP_AREA, d, rng, sig: `both-c-${dd}`, stem: [text('m6.circ.a.both.c', { d: dd })], value: C, wrong: [S, pi(dd / 2), pi(dd * 2)] })
  return valQ({ kpId: KP_AREA, d, rng, sig: `both-s-${dd}`, stem: [text('m6.circ.a.both.s', { d: dd })], value: S, wrong: [C, pi(dd * dd), pi(dd / 2)] })
}
/** 练习十二 1 的表（缺一格） */
function genATable(d: Difficulty, rng: RNG): Question {
  const head = (h: string): LStr => W(`m6.circ.t.${h}`)
  if (rng.chance(0.5)) {
    const r = rng.int(1, 10)
    return valQ({ kpId: KP_AREA, d, rng, sig: `table-r-${r}`, stem: [text('m6.circ.a.tableQ'), { kind: 'stat-table', rows: [[head('r'), r], [head('s'), null]], head: 'col' }], value: pi(r * r), wrong: [pi(2 * r), pi(4 * r * r)] })
  }
  const dd = rng.pick([2, 4, 6, 8, 9, 10, 12])
  return valQ({ kpId: KP_AREA, d, rng, sig: `table-d-${dd}`, stem: [text('m6.circ.a.tableQ'), { kind: 'stat-table', rows: [[head('d'), dd], [head('s'), null]], head: 'col' }], value: pi((dd / 2) ** 2), wrong: [pi(dd * dd), pi(dd)] })
}

// ── 第 2 档 ──

const A_JUDGE: [string, boolean][] = [
  ['equal', false],
  ['double', false],
  ['circleBig', true],
]
function genAJudge(d: Difficulty, rng: RNG): Question {
  const [k, yes] = rng.pick(A_JUDGE)
  return judge(KP_AREA, d, rng, `aj-${k}`, [text(`m6.circ.a.j.${k}`)], yes)
}
/** 半径扩大到原来的 n 倍，面积扩大到原来的几倍 */
function genAScale(d: Difficulty, rng: RNG): Question {
  const n = rng.int(2, 5)
  return numQ({ kpId: KP_AREA, d, rng, sig: `ascale-${n}`, stem: [text('m6.circ.a.scaleQ', { n })], value: n * n, smart: [n, 2 * n, n * n * 2] })
}
/** 半圆、1/4 圆的面积 */
function genPart(d: Difficulty, rng: RNG): Question {
  const r = rng.int(2, 10)
  const k = rng.pick(['half', 'quarter'] as const)
  const fig = fitFig([sector([0, 0], 52, k === 'half' ? 0 : 0, k === 'half' ? 180 : 90, 'c', 'c'), pt([0, 0]), note([26, 13], `${r} cm`)], 14)
  const f = k === 'half' ? 2 : 4
  return valQ({ kpId: KP_AREA, d, rng, sig: `part-${k}-${r}`, stem: [text(`m6.circ.a.part.${k}`, { r }), geoPart([fig], k === 'half' ? '一个半圆' : '一个 1/4 圆')], value: pi(r * r) / f, wrong: [pi(r * r), pi(2 * r) / f, pi(r * r) / (6 - f)] })
}
/** 练习十二 12：周长 62.8 米的圆，半径增加 2 米 */
function genGrow(d: Difficulty, rng: RNG): Question {
  const r = rng.pick([10, 5, 4, 6])
  const k = rng.pick([1, 2, 3])
  return valQ({ kpId: KP_AREA, d, rng, sig: `grow-${r}-${k}`, stem: [text('m6.circ.a.growQ', { c: fmt(pi(2 * r)), k })], value: pi((r + k) ** 2 - r * r), wrong: [pi(k * k), pi((r + k) ** 2), pi(2 * k)] })
}
/** 练习十二 18(1)：31.4 米的绳子围地 */
function genEnclose(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) return pickWord(KP_AREA, d, rng, 'enclose-shape', [text('m6.circ.a.encloseShapeQ')], W('m6.circ.w.circle'), [W('m6.circ.w.square'), W('m6.circ.w.rect')])
  const r = rng.pick([5, 10, 2, 3])
  return valQ({ kpId: KP_AREA, d, rng, sig: `enclose-${r}`, stem: [text('m6.circ.a.encloseQ', { c: fmt(pi(2 * r)) })], value: pi(r * r), wrong: [(pi(2 * r) / 4) ** 2, pi(4 * r * r), pi(r)] })
}
/** 你知道吗（第 62 页）：刘徽割圆术 */
function genGeyuan(d: Difficulty, rng: RNG): Question {
  return pickWord(KP_AREA, d, rng, 'geyuan', [text('m6.circ.a.geyuanQ')], W('m6.circ.w.geyuan'), [W('m6.circ.w.gridCount'), W('m6.circ.w.pi')])
}
/** 已知面积求半径 */
function genAInverse(d: Difficulty, rng: RNG): Question {
  const r = rng.pick([2, 3, 4, 5, 10])
  return numQ({ kpId: KP_AREA, d, rng, sig: `ainv-${r}`, stem: [text('m6.circ.a.inverseQ', { s: fmt(pi(r * r)) })], value: r, smart: [r * 2, r * r, r + 1] })
}
/** 第 3 档：r = 4、5、6 的 1/4 圆，自己数满格和不满格 */
function genGridCount(d: Difficulty, rng: RNG): Question {
  const R = rng.pick([4, 5, 6])
  const { fig, full, part } = quarterGrid(R, false)
  const ask = rng.pick(['full', 'est'] as const)
  if (ask === 'full') return numQ({ kpId: KP_AREA, d, rng, sig: `gc-full-${R}`, stem: [text('m6.circ.a.gcFullQ'), geoPart([fig], '方格纸上的 1/4 个圆')], value: full, smart: [full + part, part, full + 1] })
  return numQ({ kpId: KP_AREA, d, rng, sig: `gc-est-${R}`, stem: [text('m6.circ.a.gcEstQ', { f: full, p: part }), geoPart([fig], '方格纸上的 1/4 个圆')], value: (2 * full + part) * 2, smart: [(full + part) * 4, full * 4, 2 * full + part] })
}

defineGenerator(KP_AREA, (d, rng) => {
  const roll = rng.next()
  if (d === 1) {
    // 第 60 页数方格，第 61 页剪拼与 S = πr²，面积例 1，做一做 1、2，练习十二 1–4，练习十三 2
    if (roll < 0.08) return genGrid(d, rng)
    if (roll < 0.12) return genRatio(d, rng)
    if (roll < 0.15) return genFiner(d, rng)
    if (roll < 0.21) return genCutShape(d, rng)
    if (roll < 0.28) return genCutSide(d, rng)
    if (roll < 0.33) return genAFormula(d, rng)
    if (roll < 0.37) return genSquareMean(d, rng)
    if (roll < 0.49) return genAByR(d, rng)
    if (roll < 0.59) return genAByD(d, rng)
    if (roll < 0.68) return genAByC(d, rng)
    if (roll < 0.78) return genWind(d, rng)
    if (roll < 0.84) return genSpray(d, rng)
    if (roll < 0.92) return genBoth(d, rng)
    return genATable(d, rng)
  }
  if (d === 2) {
    // 练习十二 12、18，判断，倍数，半圆和 1/4 圆，割圆术，已知面积求半径
    if (roll < 0.16) return genAJudge(d, rng)
    if (roll < 0.3) return genAScale(d, rng)
    if (roll < 0.48) return genPart(d, rng)
    if (roll < 0.62) return genGrow(d, rng)
    if (roll < 0.78) return genEnclose(d, rng)
    if (roll < 0.88) return genGeyuan(d, rng)
    return genAInverse(d, rng)
  }
  if (roll < 0.6) return genGridCount(d, rng)
  return genGrow(d, rng)
})

// ═════════════════════════════════════════════════════════════
// 5. 圆环的面积（第 63 页面积例 2、做一做 ①；练习十二 5–8、11、15；练习十三 4、8）
// ═════════════════════════════════════════════════════════════

export const KP_RING = 'm6s1-05-ring'

/** 圆环：外圆半径 R、内圆半径 r（标数时 out / inn 是写在尺寸线上的字） */
export function ringFig(R: number, r: number, out: string | null, inn: string | null): GeoFig {
  const S = 70 / R
  const C: P = [0, 0]
  const items: GeoItem[] = [...ring(C, R * S, r * S), pt(C)]
  if (out) items.push(dimLine([-R * S, 0], C, out, 0))
  if (inn) items.push(dimLine(C, [r * S, 0], inn, 0))
  return fitFig(items, 14)
}
/** 认圆环 */
function genRingName(d: Difficulty, rng: RNG): Question {
  return pickWord(KP_RING, d, rng, 'name', [text('m6.circ.r.nameQ'), geoPart([ringFig(5, rng.pick([2, 3]), null, null)], '两个圆心相同的圆，中间涂了颜色')], W('m6.circ.w.ring'), [wSector, W('m6.circ.w.semicircle')])
}
/** 圆环的面积怎样求 */
function genRingHow(d: Difficulty, rng: RNG): Question {
  return pickWord(KP_RING, d, rng, 'how', [text('m6.circ.r.howQ')], W('m6.circ.w.ringMinus'), [W('m6.circ.w.ringPlus'), W('m6.circ.w.ringPeri')])
}
/** 面积例 2 的两种算法（小丽、小明） */
function genTwoWays(d: Difficulty, rng: RNG): Question {
  const R = rng.int(4, 9)
  const r = rng.int(1, R - 2)
  // 课本的两种算法照课本分两行写（小丽、小明），一句里用「和」连两个算式会听成「平方和」
  if (rng.chance(0.4))
    return judge(KP_RING, d, rng, `ways-j-${R}-${r}`, [text('m6.circ.r.waysLi'), { kind: 'expr', expr: `3.14 × ${R}² − 3.14 × ${r}²` }, text('m6.circ.r.waysMing'), { kind: 'expr', expr: `3.14 × (${R}² − ${r}²)` }, text('m6.circ.r.waysSame')], true)
  return pickWord(KP_RING, d, rng, `ways-${R}-${r}`, [text('m6.circ.r.waysQ', { R, r })], `3.14 × (${R}² − ${r}²)`, [`3.14 × (${R} − ${r})²`, `3.14 × ${R}² − ${r}²`, `3.14 × (${2 * R}² − ${2 * r}²)`])
}
/** 面积例 2 原数据：选算式 */
function genJadeExpr(d: Difficulty, rng: RNG): Question {
  return pickWord(KP_RING, d, rng, 'jade-expr', [text('m6.circ.r.jadeQ')], '3.14 × (13.15² − 2.7²)', ['3.14 × (26.3² − 5.4²)', '3.14 × (13.15 − 2.7)²', '3.14 × 13.15² − 2.7²'])
}
/** 做一做 ①：已知外圆、内圆的半径 */
function genRingByR(d: Difficulty, rng: RNG): Question {
  const R = rng.int(3, 10)
  const r = rng.int(1, R - 1)
  return valQ({
    kpId: KP_RING,
    d,
    rng,
    sig: `byr-${R}-${r}`,
    stem: [text('m6.circ.r.byRQ'), geoPart([ringFig(R, r, String(R), String(r))], '一个圆环，标出了外圆和内圆的半径')],
    value: pi(R * R - r * r),
    wrong: [pi((R - r) ** 2), pi(R * R) - r * r, pi(R * R), pi(R * R + r * r)],
  })
}
/** 练习十二 5：环岛与花坛（直径） */
const RING_D: [number, number][] = [
  [50, 10],
  [12, 4],
  [10, 6],
  [20, 10],
  [30, 10],
  [40, 20],
  [8, 4],
]
function genRingByD(d: Difficulty, rng: RNG): Question {
  const [D, dd] = rng.pick(RING_D)
  return valQ({ kpId: KP_RING, d, rng, sig: `byd-${D}-${dd}`, stem: [text('m6.circ.r.islandQ', { D, d: dd })], value: pi((D / 2) ** 2 - (dd / 2) ** 2), wrong: [pi(D * D - dd * dd), pi(((D - dd) / 2) ** 2), pi((D / 2) ** 2)] })
}
/** 环宽 */
function genRingWidth(d: Difficulty, rng: RNG): Question {
  const R = rng.int(4, 15)
  const r = rng.int(1, R - 1)
  return numQ({ kpId: KP_RING, d, rng, sig: `width-${R}-${r}`, stem: [text('m6.circ.r.widthQ', { R, r })], value: R - r, smart: [R + r, 2 * (R - r)] })
}
/** 内圆半径 + 环宽 */
function genRingInner(d: Difficulty, rng: RNG): Question {
  const r = rng.int(1, 8)
  const w = rng.int(1, 4)
  return valQ({ kpId: KP_RING, d, rng, sig: `inner-${r}-${w}`, stem: [text('m6.circ.r.innerQ', { r, w })], value: pi((r + w) ** 2 - r * r), wrong: [pi(w * w), pi((r + w) ** 2), pi(r * r)] })
}
/** 练习十三 4：旋转木马周围留出小路 */
function genCarousel(d: Difficulty, rng: RNG): Question {
  const dd = rng.pick([8, 6, 10, 12])
  const w = rng.pick([1, 2])
  const R = dd / 2 + w
  if (rng.chance(0.5)) return valQ({ kpId: KP_RING, d, rng, sig: `carousel-in-${dd}-${w}`, stem: [text('m6.circ.r.carouselInQ', { d: dd, w })], value: pi(R * R), wrong: [pi((dd / 2) ** 2), pi((dd + w) ** 2), pi(R * R - (dd / 2) ** 2)] })
  return valQ({ kpId: KP_RING, d, rng, sig: `carousel-path-${dd}-${w}`, stem: [text('m6.circ.r.carouselPathQ', { d: dd, w })], value: pi(R * R - (dd / 2) ** 2), wrong: [pi(R * R), pi(w * w), pi((dd + w) ** 2 - dd * dd)] })
}
/** 练习十二 8：生活中的圆环（卫生纸横截面、金属垫片） */
const TISSUE: [string, number, number][] = [
  ['tissue', 12, 4],
  ['tissue', 10, 4],
  ['tissue', 14, 6],
  ['washer', 30, 14],
  ['washer', 20, 10],
]
function genTissue(d: Difficulty, rng: RNG): Question {
  const [k, D, dd] = rng.pick(TISSUE)
  return valQ({ kpId: KP_RING, d, rng, sig: `${k}-${D}-${dd}`, stem: [text(`m6.circ.r.${k}Q`, { D, d: dd })], value: pi((D / 2) ** 2 - (dd / 2) ** 2), wrong: [pi(D * D - dd * dd), pi(((D - dd) / 2) ** 2), pi((D / 2) ** 2)] })
}
/** 练习十二 6：小圆贴着大圆的边、两个圆同心——涂色部分一样大 */
function posRingFigs(s: number): GeoFig[] {
  const S = 30
  const make = (cx: number): GeoFig =>
    fitFig([circ([0, 0], 2 * S, { fill: 'c', stroke: 'd' }), circ([cx, 0], S, { fill: 'paper', stroke: 'b' }), pt([cx, 0]), seg([cx - S, 0], [cx + S, 0], { stroke: 'd' }), note([cx, -12], `${s} cm`)], 10)
  return [make(-S), make(0)]
}
function genPosition(d: Difficulty, rng: RNG): Question {
  const s = rng.pick([6, 4, 8, 10])
  const figs = posRingFigs(s)
  if (rng.chance(0.4)) return judge(KP_RING, d, rng, `pos-j-${s}`, [text('m6.circ.r.posJ', { s }), geoPart(figs, '两幅图：大圆里有一个小圆，小圆的位置不同', true)], false)
  return valQ({ kpId: KP_RING, d, rng, sig: `pos-${s}`, stem: [text('m6.circ.r.posQ', { s }), geoPart(figs, '两幅图：大圆里有一个小圆，小圆的位置不同', true)], value: pi(s * s - (s / 2) ** 2), wrong: [pi(s * s), pi((s / 2) ** 2), pi(4 * s * s - s * s)] })
}
/** 练习十二 7：铜钱（圆减去中间的正方形孔） */
const COINS: [number, number][] = [
  [28, 6],
  [20, 4],
  [24, 6],
  [30, 8],
]
function coinFig(): GeoFig {
  return fitFig([circ([0, 0], 56, { fill: 'a', stroke: 'a' }), poly([[-12, -12], [12, -12], [12, 12], [-12, 12]], { fill: 'paper', stroke: 'a' })], 12)
}
function genCoin(d: Difficulty, rng: RNG): Question {
  const [D, a] = rng.pick(COINS)
  return valQ({ kpId: KP_RING, d, rng, sig: `coin-${D}-${a}`, stem: [text('m6.circ.r.coinQ', { D, a }), geoPart([coinFig()], '圆形铜钱，中间有一个正方形的孔')], value: pi((D / 2) ** 2) - a * a, wrong: [pi((D / 2) ** 2), pi(D * D) - a * a, pi((D / 2) ** 2) - 4 * a] })
}
const R_JUDGE: [string, boolean][] = [
  ['minus', true],
  ['sameWidth', false],
]
function genRJudge(d: Difficulty, rng: RNG): Question {
  const [k, yes] = rng.pick(R_JUDGE)
  return judge(KP_RING, d, rng, `rj-${k}`, [text(`m6.circ.r.j.${k}`)], yes)
}

// ── 第 2、3 档 ──

/** 练习十二 15：扇环 */
function ringSectorFigs(kind: 'one' | 'two', R: number, w: number): GeoFig {
  const S = 66 / R
  const C: P = [0, 0]
  const items: GeoItem[] = [ringSector(C, R * S, (R - w) * S, 0, 90, 'b', 'd')]
  if (kind === 'two') items.push(ringSector(C, R * S, (R - w) * S, 180, 270, 'b', 'd'))
  items.push(pt(C), letter([-10, 12], 'O'), dimLine(C, [R * S, 0], `r=${R} dm`, -14), dimLine([0, -(R - w) * S], [0, -R * S], `${w} dm`, 14))
  return fitFig(items, 14)
}
function genRingSector(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.3)) return pickWord(KP_RING, d, rng, 'rs-name', [text('m6.circ.r.rsNameQ'), geoPart([ringSectorFigs('one', 5, 2)], '从圆环上截下来的一块')], W('m6.circ.w.ringSector'), [wSector, W('m6.circ.w.ring')])
  const kind = rng.pick(['one', 'two'] as const)
  const R = rng.pick([5, 4, 6])
  const w = rng.int(1, 2)
  const f = kind === 'one' ? 4 : 2
  return valQ({ kpId: KP_RING, d, rng, sig: `rs-${kind}-${R}-${w}`, stem: [text(`m6.circ.r.rs.${kind}`, { R, w }), geoPart([ringSectorFigs(kind, R, w)], kind === 'one' ? '一块圆心角 90° 的扇环' : '两块圆心角 90° 的扇环')], value: pi(R * R - (R - w) ** 2) / f, wrong: [pi(R * R - (R - w) ** 2), pi(w * w) / f, pi(R * R) / f] })
}
/** 练习十二 11：两座圆环形土楼 */
function genTulou(d: Difficulty, rng: RNG): Question {
  const k = rng.pick(['diff', 'big', 'small'] as const)
  // 两座土楼：外直径 34、内直径 14；外直径 26、内直径 14（单位：米）
  const a = pi(17 * 17 - 7 * 7)
  const b = pi(13 * 13 - 7 * 7)
  const wrong: Record<typeof k, number[]> = {
    diff: [pi(34 * 34 - 26 * 26), a, a + b],
    big: [pi(34 * 34 - 14 * 14), pi(17 * 17), a + b],
    small: [pi(26 * 26 - 14 * 14), pi(13 * 13), a],
  }
  return valQ({ kpId: KP_RING, d, rng, sig: `tulou-${k}`, stem: [text(`m6.circ.r.tulou.${k}`)], value: k === 'diff' ? a - b : k === 'big' ? a : b, wrong: wrong[k] })
}
/** 面积例 2 原数据算结果（保留一位小数） */
function genJadeValue(d: Difficulty, rng: RNG): Question {
  return pickWord(KP_RING, d, rng, 'jade-value', [text('m6.circ.r.jadeValueQ')], '520.1', ['2080.3', '543.0', '342.9'])
}
/** 练习十三 8：10 米气步枪标靶，十环面积是九环面积的几分之几 */
function targetFig(): GeoFig {
  const items: GeoItem[] = []
  for (const r of [64, 52, 40]) items.push(circ([0, 0], r, { stroke: 'b' }))
  items.push(circ([0, 0], 28, { fill: 'b', stroke: 'b' }), circ([0, 0], 6, { fill: 'd', stroke: 'd' }))
  return fitFig(items, 10)
}
function genTarget(d: Difficulty, rng: RNG): Question {
  return pickWord(KP_RING, d, rng, 'target', [text('m6.circ.r.targetQ'), geoPart([targetFig()], '标靶：一圈一圈的圆')], '1/120', ['1/121', '1/11', '1/10'])
}

defineGenerator(KP_RING, (d, rng) => {
  const roll = rng.next()
  if (d === 1) {
    // 面积例 2（两种算法）、做一做 ①，练习十二 5–8，练习十三 4
    if (roll < 0.06) return genRingName(d, rng)
    if (roll < 0.12) return genRingHow(d, rng)
    if (roll < 0.21) return genTwoWays(d, rng)
    if (roll < 0.26) return genJadeExpr(d, rng)
    if (roll < 0.38) return genRingByR(d, rng)
    if (roll < 0.48) return genRingByD(d, rng)
    if (roll < 0.54) return genRingWidth(d, rng)
    if (roll < 0.61) return genRingInner(d, rng)
    if (roll < 0.7) return genCarousel(d, rng)
    if (roll < 0.78) return genTissue(d, rng)
    if (roll < 0.86) return genPosition(d, rng)
    if (roll < 0.94) return genCoin(d, rng)
    return genRJudge(d, rng)
  }
  if (d === 2) {
    // 练习十二 11、15，面积例 2 的结果
    if (roll < 0.5) return genRingSector(d, rng)
    if (roll < 0.82) return genTulou(d, rng)
    return genJadeValue(d, rng)
  }
  if (roll < 0.5) return genTarget(d, rng)
  return genRingSector(d, rng)
})

// ═════════════════════════════════════════════════════════════
// 6. 组合图形的面积（第 63 页面积例 3、做一做 ②③；练习十二 9、10、13、14、16、17；练习十三 7、9）
// ═════════════════════════════════════════════════════════════

export const KP_COMP = 'm6s1-05-composite'

/** 面积例 3 右图：长方形 ABCD 里，EF 上面一个半圆，EBCF 挖去以 BC 为直径的半圆（r = 半径） */
export function shiftFig(label: string): GeoFig {
  const r = 46
  const E: P = [0, r]
  const F: P = [2 * r, r]
  const B: P = [0, 2 * r]
  const Cc: P = [2 * r, 2 * r]
  const out = chain([E], arcPts([r, r], r, 180, 0), [F, Cc], arcPts([r, 2 * r], r, 0, 180), [B])
  return fitFig(
    [
      poly([[0, 0], B, Cc, [2 * r, 0]], { stroke: 'soft', dash: true }),
      poly(out, { fill: 'c', stroke: 'c' }),
      seg(E, F, { stroke: 'soft', dash: true, thin: true }),
      pt([r, r]),
      pt([r, 2 * r]),
      dimLine([r, 2 * r], Cc, label, -14),
      letter([-12, -6], 'A'),
      letter([2 * r + 12, -6], 'D'),
      letter([r, -12], 'G'),
      letter([-13, r], 'E'),
      letter([2 * r + 13, r], 'F'),
      letter([-12, 2 * r + 8], 'B'),
      letter([2 * r + 12, 2 * r + 8], 'C'),
    ],
    16,
  )
}
/** 面积例 3 左图（旋转）：图形的面积 = 大半圆 */
function genRotate(d: Difficulty, rng: RNG): Question {
  const a = rng.pick([5, 2, 4, 6, 10])
  const fig = yinFig(70, `${a} cm`, 'b')
  if (rng.chance(0.3)) return pickWord(KP_COMP, d, rng, 'rot-which', [text('m6.circ.g.rotWhichQ'), geoPart([fig], '由三个半圆组成的图形')], W('m6.circ.w.bigSemi'), [W('m6.circ.w.smallSemi'), W('m6.circ.w.bigCircle')])
  return valQ({ kpId: KP_COMP, d, rng, sig: `rot-${a}`, stem: [text('m6.circ.g.rotQ', { a }), geoPart([fig], '由三个半圆组成的图形')], value: pi(a * a) / 2, wrong: [pi(a * a), pi((a / 2) ** 2) / 2, pi(a * a) / 2 + pi((a / 2) ** 2) / 2] })
}
/** 面积例 3 右图（平移）：面积 = 长方形 EBCF */
function genShift(d: Difficulty, rng: RNG): Question {
  const r = rng.int(2, 8)
  return numQ({ kpId: KP_COMP, d, rng, sig: `shift-${r}`, stem: [text('m6.circ.g.shiftQ', { r }), geoPart([shiftFig(`${r} cm`)], '长方形里由半圆组成的涂色图形')], value: 2 * r * r, smart: [4 * r * r, r * r, 2 * r * r + 2] })
}
/** 做一做 ②：长方形左边挖去 1/4 圆、右边涂 1/4 圆 */
export function cornerFig(a: number, b: number): GeoFig {
  const U = Math.min(40, 220 / (2 * a + b))
  const A = a * U
  const Bw = b * U
  const Wd = 2 * A + Bw
  const shaded = chain([[0, 0], [A + Bw, 0]], arcPts([A + Bw, A], A, 90, 0), [[A, A]], arcPts([0, A], A, 0, 90))
  return fitFig(
    [
      poly([[0, 0], [Wd, 0], [Wd, A], [0, A]], { stroke: 'ink' }),
      poly(shaded, { fill: 'b', stroke: 'ink' }),
      seg([A, 0], [A, A], { stroke: 'ink', dash: true, thin: true }),
      seg([A + Bw, 0], [A + Bw, A], { stroke: 'ink', dash: true, thin: true }),
      dimLine([0, A], [A, A], String(a), -14),
      dimLine([A, A], [A + Bw, A], String(b), -14),
      dimLine([A + Bw, A], [Wd, A], String(a), -14),
    ],
    14,
  )
}
function genCorner(d: Difficulty, rng: RNG): Question {
  const a = rng.int(2, 5)
  const b = rng.int(1, 3)
  return numQ({ kpId: KP_COMP, d, rng, sig: `corner-${a}-${b}`, stem: [text('m6.circ.g.cornerQ'), geoPart([cornerFig(a, b)], '长方形里有两个 1/4 圆')], value: a * (a + b), smart: [a * (2 * a + b), a * b, a * a] })
}
/** 做一做 ③：三个同心圆，三块错开的 1/4 涂色（合起来是大圆的 1/4） */
export function concentricFig(k: number): GeoFig {
  const S = 22
  const C: P = [0, 0]
  const items: GeoItem[] = [
    sector(C, S, 0, 90, 'b', 'b'),
    ringSector(C, 2 * S, S, 90, 180, 'b', 'b'),
    ringSector(C, 3 * S, 2 * S, 180, 270, 'b', 'b'),
    circ(C, S),
    circ(C, 2 * S),
    circ(C, 3 * S),
    seg([-3.6 * S, 0], [3.6 * S, 0], { thin: true }),
    seg([0, -3.6 * S], [0, 3.6 * S], { thin: true }),
  ]
  for (let i = 0; i < 3; i++) items.push(note([9, -(i + 0.5) * S], String(k), true))
  return fitFig(items, 10)
}
function genConcentric(d: Difficulty, rng: RNG): Question {
  const k = rng.pick([1, 2, 3])
  const R = 3 * k
  return valQ({ kpId: KP_COMP, d, rng, sig: `conc-${k}`, stem: [text('m6.circ.g.concQ'), geoPart([concentricFig(k)], '三个圆心相同的圆，三块涂了颜色')], value: pi(R * R) / 4, wrong: [pi(R * R), pi(R * R) / 2, pi(k * k) * 3 / 4] })
}
/** 正方形里以一个顶点为圆心画 1/4 圆，正方形里 1/4 圆外面的部分 */
export function sqQuarterFig(label: string): GeoFig {
  const S = 100
  const shaded = chain([[0, 0], [S, 0], [S, S]], arcPts([0, S], S, 0, 90))
  return fitFig([poly([[0, 0], [S, 0], [S, S], [0, S]], { stroke: 'ink' }), poly(shaded, { fill: 'b', stroke: 'ink' }), pt([0, S]), dimLine([0, S], [S, S], label, -14)], 16)
}
function genSqQuarter(d: Difficulty, rng: RNG): Question {
  const a = rng.pick([4, 10, 20, 2, 6, 8])
  return valQ({ kpId: KP_COMP, d, rng, sig: `sqq-${a}`, stem: [text('m6.circ.g.sqqQ', { a }), geoPart([sqQuarterFig(`${a} cm`)], '正方形里有一个 1/4 圆')], value: a * a - pi(a * a) / 4, wrong: [pi(a * a) / 4, a * a - pi(a * a), a * a - pi((a / 2) ** 2)] })
}
/** 练习十二 9：运动场（两端半圆、中间长方形） */
export function stadiumFig(Llab: string, rlab: string): GeoFig {
  const L = 140
  const r = 46
  const out = chain(arcPts([L, 0], r, -90, 90), arcPts([0, 0], r, 90, 270))
  return fitFig(
    [
      poly(out, { fill: 'c', stroke: 'd' }),
      seg([0, -r], [0, r], { stroke: 'd', dash: true, thin: true }),
      seg([L, -r], [L, r], { stroke: 'd', dash: true, thin: true }),
      pt([L, 0]),
      letter([L - 12, 12], 'O'),
      seg([L, 0], [L + r, 0], { stroke: 'd', dash: true, thin: true }),
      note([L + r / 2, 13], rlab),
      dimLine([0, -r], [L, -r], Llab, 14),
    ],
    16,
  )
}
function genStadium(d: Difficulty, rng: RNG): Question {
  const [L, r] = rng.pick([
    [100, 32],
    [50, 10],
    [80, 20],
    [60, 15],
  ] as [number, number][])
  const fig = stadiumFig(`${L} m`, `${r} m`)
  if (rng.chance(0.5)) return valQ({ kpId: KP_COMP, d, rng, sig: `stadium-c-${L}-${r}`, stem: [text('m6.circ.g.stadiumC', { L, r }), geoPart([fig], '两端是半圆、中间是长方形的运动场')], value: 2 * L + pi(2 * r), wrong: [2 * L + pi(r), L + pi(2 * r), 2 * L + 4 * r + pi(2 * r)] })
  return valQ({ kpId: KP_COMP, d, rng, sig: `stadium-s-${L}-${r}`, stem: [text('m6.circ.g.stadiumS', { L, r }), geoPart([fig], '两端是半圆、中间是长方形的运动场')], value: 2 * r * L + pi(r * r), wrong: [r * L + pi(r * r), 2 * r * L + pi(r * r) / 2, 2 * r * L + pi(2 * r)] })
}
/** 练习十二 10：花瓣状门洞（正方形四条边上各一个半圆） */
export function petalFig(label: string): GeoFig {
  const a = 70
  const h = a / 2
  const out = chain(arcPts([h, 0], h, 180, 0), arcPts([a, h], h, 90, -90), arcPts([h, a], h, 0, -180), arcPts([0, h], h, -90, -270))
  return fitFig([poly(out, { fill: 'c', stroke: 'c' }), poly([[0, 0], [a, 0], [a, a], [0, a]], { stroke: 'soft', dash: true }), dimLine([0, a], [a, a], label, 0)], 14)
}
function genPetal(d: Difficulty, rng: RNG): Question {
  const a = rng.pick([1, 2, 4])
  const fig = petalFig(`${a} m`)
  if (rng.chance(0.5)) return valQ({ kpId: KP_COMP, d, rng, sig: `petal-c-${a}`, stem: [text('m6.circ.g.petalC', { a }), geoPart([fig], '四个半圆围成的花瓣状门洞')], value: pi(2 * a), wrong: [pi(2 * a) + 4 * a, pi(a), pi(4 * a)] })
  return valQ({ kpId: KP_COMP, d, rng, sig: `petal-s-${a}`, stem: [text('m6.circ.g.petalS', { a }), geoPart([fig], '四个半圆围成的花瓣状门洞')], value: a * a + pi((a / 2) ** 2) * 2, wrong: [pi((a / 2) ** 2) * 2, a * a + pi((a / 2) ** 2) * 4, a * a + pi(a * a) * 2] })
}
/** 练习十二 17：房子墙角拴的狗能活动的地方（3/4 圆） */
export function dogFig(l: number, bw: number, bh: number): GeoFig {
  const S = 9
  const C: P = [0, 0]
  return fitFig(
    [
      poly([C, ...arcPts(C, l * S, 180, 450, 5)], { fill: 'c', stroke: 'c' }),
      poly([[-bw * S, -bh * S], [0, -bh * S], C, [-bw * S, 0]], { fill: 'soft', stroke: 'ink' }),
      pt(C),
      seg(C, polar(C, l * S, -45), { stroke: 'd' }),
      note(add(polar(C, (l * S) / 2, -45), [14, 4]), `${l} m`),
      dimLine([-bw * S, -bh * S], [0, -bh * S], `${bw} m`, 14),
      dimLine([-bw * S, 0], [-bw * S, -bh * S], `${bh} m`, 14),
    ],
    14,
  )
}
function genDog(d: Difficulty, rng: RNG): Question {
  const l = rng.pick([2, 3, 4, 5])
  const [bw, bh] = rng.pick([
    [12, 6],
    [10, 8],
  ] as [number, number][])
  return valQ({ kpId: KP_COMP, d, rng, sig: `dog-${l}-${bw}`, stem: [text('m6.circ.g.dogQ', { l }), geoPart([dogFig(l, bw, bh)], `长 ${bw} 米、宽 ${bh} 米的长方形房子的墙角拴了一条狗，涂色的是狗能去的地方`)], value: (pi(l * l) * 3) / 4, wrong: [pi(l * l) / 4, pi(l * l), pi(l * l) / 2] })
}
/** 练习十三 7：中间正方形、四周四个圆心角 90° 的扇形（风车形） */
export function pinwheelFig(): GeoFig {
  const a = 46
  return fitFig(
    [
      sector([0, 0], a, 0, 90, 'b', 'd'),
      sector([a, 0], a, -90, 0, 'b', 'd'),
      sector([a, a], a, 180, 270, 'b', 'd'),
      sector([0, a], a, 90, 180, 'b', 'd'),
      poly([[0, 0], [a, 0], [a, a], [0, a]], { fill: 'b', stroke: 'b', dash: true }),
    ],
    12,
  )
}
function genPinwheel(d: Difficulty, rng: RNG): Question {
  const a = rng.pick([1, 2, 3])
  if (rng.chance(0.5)) return valQ({ kpId: KP_COMP, d, rng, sig: `pin-c-${a}`, stem: [text('m6.circ.g.pinC', { a }), geoPart([pinwheelFig()], '中间是正方形、四周是四个扇形的图形')], value: 4 * a + pi(2 * a), wrong: [pi(2 * a), 8 * a + pi(2 * a), 4 * a + pi(a)] })
  return valQ({ kpId: KP_COMP, d, rng, sig: `pin-s-${a}`, stem: [text('m6.circ.g.pinS', { a }), geoPart([pinwheelFig()], '中间是正方形、四周是四个扇形的图形')], value: a * a + pi(a * a), wrong: [pi(a * a), a * a + pi(a * a) / 4, 4 * a * a + pi(a * a)] })
}
/** 两块一样大的半圆形草坪（直径已知） */
function lawnFig(label: string | null): GeoFig {
  const r = 50
  const g = 6
  const items: GeoItem[] = [poly(arcPts([-g, 0], r, 90, 270), { fill: 'c', stroke: 'd' }), poly(arcPts([g, 0], r, -90, 90), { fill: 'c', stroke: 'd' })]
  if (label) items.push(dimLine([g + r + 14, -r], [g + r + 14, r], label, 0))
  return fitFig(items, 14)
}
function genLawn(d: Difficulty, rng: RNG): Question {
  const dd = rng.pick([10, 20, 4, 6, 8, 50])
  return valQ({ kpId: KP_COMP, d, rng, sig: `lawn-${dd}`, stem: [text('m6.circ.g.lawnQ', { d: dd }), geoPart([lawnFig(null)], '两块一样大的半圆形草坪')], value: pi((dd / 2) ** 2), wrong: [pi((dd / 2) ** 2) / 2, pi(dd * dd), pi((dd / 2) ** 2) * 2] })
}
/** 窗户的面积（练习十一 9 的图）：正方形 + 半圆 */
function genWindowArea(d: Difficulty, rng: RNG): Question {
  const a = rng.pick([20, 40, 60, 100])
  return valQ({ kpId: KP_COMP, d, rng, sig: `win-s-${a}`, stem: [text('m6.circ.g.windowQ', { a }), geoPart([windowFig(a)], '下面是正方形、上面是半圆的窗户')], value: a * a + pi((a / 2) ** 2) / 2, wrong: [a * a + pi((a / 2) ** 2), a * a + pi(a * a) / 2, pi((a / 2) ** 2) / 2] })
}

// ── 第 2、3 档 ──

/** 练习十二 13：两块半圆形草坪，周长都是 5.14r */
function genLawnPeri(d: Difficulty, rng: RNG): Question {
  const r = rng.pick([25, 10, 5, 20])
  return valQ({ kpId: KP_COMP, d, rng, sig: `lawnp-${r}`, stem: [text('m6.circ.g.lawnPeriQ', { c: fmt(clean(5.14 * r)) }), geoPart([lawnFig(null)], '两块一样大的半圆形草坪')], value: pi(r * r), wrong: [pi(r * r) / 2, pi(4 * r * r), pi(r * r) * 2] })
}
/** 练习十二 14：直角三角形与半圆，涂色 = a² ÷ 4 */
export function triSemiFig(a: number): GeoFig {
  const S = 100
  const c: P = [S / 2, S]
  return fitFig(
    [
      poly(chain([[0, 0], [0, S]], arcPts(c, S / 2, 180, 90)), { fill: 'b', stroke: 'ink' }),
      poly(chain([[S / 2, S / 2], [S, S]], arcPts(c, S / 2, 0, 90)), { fill: 'b', stroke: 'ink' }),
      poly([[0, 0], [0, S], [S, S]], { stroke: 'ink' }),
      arcLine(c, S / 2, 0, 180, 'ink'),
      seg([S / 2, S / 2], [S / 2, S], { stroke: 'd', dash: true, thin: true }),
      { t: 'arc', at: [0, S], a: [S, S], b: [0, 0], right: true },
      dimLine([0, S], [S, S], String(a), -14),
      dimLine([0, S], [0, 0], String(a), 14),
    ],
    16,
  )
}
function genTriSemi(d: Difficulty, rng: RNG): Question {
  const a = rng.pick([4, 6, 8, 10])
  return numQ({ kpId: KP_COMP, d, rng, sig: `trisemi-${a}`, stem: [text('m6.circ.g.triSemiQ'), geoPart([triSemiFig(a)], '直角三角形和一个半圆')], value: (a * a) / 4, smart: [(a * a) / 2, a * a, (a * a) / 8] })
}
/** 练习十二 16：等腰直角三角形里两个相同的半圆叠拼 */
export function twoSemiFig(): GeoFig {
  const a = 110
  const h = a / 2
  const c1: P = [0, h]
  const c2: P = [h, a]
  return fitFig(
    [
      poly(arcPts(c1, h, 90, 0), { fill: 'd', stroke: 'd' }),
      poly(arcPts(c2, h, 90, 0), { fill: 'd', stroke: 'd' }),
      poly(chain(arcPts(c1, h, 0, -90), arcPts(c2, h, 180, 90)), { fill: 'd', stroke: 'd' }),
      poly([[0, 0], [0, a], [a, a]], { stroke: 'd' }),
      letter([-12, 0], 'A'),
      letter([-12, a + 6], 'B'),
      letter([a + 12, a + 6], 'C'),
      letter([h + 14, h - 8], 'D'),
    ],
    16,
  )
}
function genTwoSemi(d: Difficulty, rng: RNG): Question {
  const a = rng.pick([10, 4, 6, 8])
  return valQ({ kpId: KP_COMP, d, rng, sig: `twosemi-${a}`, stem: [text('m6.circ.g.twoSemiQ', { a }), geoPart([twoSemiFig()], '等腰直角三角形 ABC 和两个半圆')], value: pi((a / 2) ** 2) - (a * a) / 2, wrong: [pi((a / 2) ** 2), pi((a / 2) ** 2) / 2, (a * a) / 2] })
}
/** 练习十三 9：大小等边三角形与圆，大三角形面积 = 小三角形的 4 倍 */
function triCircleFig(): GeoFig {
  const rho = 40
  const V = (r: number, a: number): P => polar([0, 0], r, a)
  return fitFig(
    [
      poly([V(2 * rho, 90), V(2 * rho, 210), V(2 * rho, 330)], { stroke: 'ink' }),
      circ([0, 0], rho, { stroke: 'b' }),
      poly([V(rho, 90), V(rho, 210), V(rho, 330)], { fill: 'd', stroke: 'd' }),
      pt([0, 0]),
      letter(V(2 * rho + 12, 90), 'A'),
      letter(V(2 * rho + 12, 210), 'B'),
      letter(V(2 * rho + 12, 330), 'C'),
      letter(V(rho + 14, 150), 'D'),
      letter(V(rho + 14, 270), 'E'),
      letter(V(rho + 14, 30), 'F'),
    ],
    14,
  )
}
function genTriCircle(d: Difficulty, rng: RNG): Question {
  const s = rng.pick([60, 30, 15, 25])
  return numQ({ kpId: KP_COMP, d, rng, sig: `tricircle-${s}`, stem: [text('m6.circ.g.triCircleQ', { s }), geoPart([triCircleFig()], '大等边三角形、圆和小等边三角形')], value: 4 * s, smart: [2 * s, 3 * s, 8 * s] })
}

defineGenerator(KP_COMP, (d, rng) => {
  const roll = rng.next()
  if (d === 1) {
    // 面积例 3（旋转、平移）、做一做 ②③，练习十二 9、10、13、17，练习十三 7，正方形与 1/4 圆，窗户的面积
    if (roll < 0.14) return genRotate(d, rng)
    if (roll < 0.26) return genShift(d, rng)
    if (roll < 0.36) return genCorner(d, rng)
    if (roll < 0.45) return genConcentric(d, rng)
    if (roll < 0.53) return genSqQuarter(d, rng)
    if (roll < 0.62) return genStadium(d, rng)
    if (roll < 0.7) return genPetal(d, rng)
    if (roll < 0.79) return genDog(d, rng)
    if (roll < 0.87) return genPinwheel(d, rng)
    if (roll < 0.94) return genLawn(d, rng)
    return genWindowArea(d, rng)
  }
  if (d === 2) {
    // 练习十二 13、14、16（综合运用、拓展提升）
    if (roll < 0.34) return genLawnPeri(d, rng)
    if (roll < 0.67) return genTriSemi(d, rng)
    return genTwoSemi(d, rng)
  }
  if (roll < 0.5) return genTriCircle(d, rng)
  return genTwoSemi(d, rng)
})

// ═════════════════════════════════════════════════════════════
// 7. 外方内圆和外圆内方（第 64–65 页面积例 4、做一做；练习十三 5）
// ═════════════════════════════════════════════════════════════

export const KP_SQC = 'm6s1-05-square-circle'

/** 外方内圆：正方形和它里面最大的圆；shade = 'corner' 涂四个角、'circle' 涂圆、null 不涂 */
export function outSquareFig(shade: 'corner' | 'circle' | null, rLabel?: string): GeoFig {
  const R = 52
  const C: P = [0, 0]
  const sq: P[] = [
    [-R, -R],
    [R, -R],
    [R, R],
    [-R, R],
  ]
  const items: GeoItem[] =
    shade === 'corner' ? [poly(sq, { fill: 'b', stroke: 'b' }), circ(C, R, { fill: 'paper', stroke: 'b' })] : [poly(sq, { stroke: 'b' }), circ(C, R, { fill: shade === 'circle' ? 'c' : undefined, stroke: 'b' })]
  items.push(seg([-R, 0], [R, 0], { stroke: 'soft', dash: true, thin: true }), seg([0, -R], [0, R], { stroke: 'soft', dash: true, thin: true }))
  if (rLabel) items.push(seg(C, [R, 0], { stroke: 'b' }), pt(C), note([R / 2, -12], rLabel))
  return fitFig(items, 14)
}
/** 外圆内方：圆和它里面最大的正方形；shade = 'out' 涂圆里正方形外面的部分 */
export function inSquareFig(shade: 'out' | 'square' | null, diag = true): GeoFig {
  const R = 56
  const C: P = [0, 0]
  const sq: P[] = [45, 135, 225, 315].map((a) => polar(C, R, a))
  const items: GeoItem[] = shade === 'out' ? [circ(C, R, { fill: 'd', stroke: 'd' }), poly(sq, { fill: 'paper', stroke: 'b' })] : [circ(C, R, { stroke: 'd' }), poly(sq, { fill: shade === 'square' ? 'b' : undefined, stroke: 'b' })]
  if (diag) items.push(seg(sq[0]!, sq[2]!, { stroke: 'soft', dash: true, thin: true }))
  items.push(pt(C))
  return fitFig(items, 14)
}
/** 回顾反思：正方形里最大的圆，圆里又有最大的正方形（转 45° 放） */
function nestedFig(): GeoFig {
  const R = 52
  const C: P = [0, 0]
  return fitFig(
    [
      poly([[-R, -R], [R, -R], [R, R], [-R, R]], { stroke: 'ink' }),
      circ(C, R, { stroke: 'ink' }),
      poly([90, 180, 270, 0].map((a) => polar(C, R, a)), { fill: 'b', stroke: 'b' }),
      seg([-R, 0], [R, 0], { stroke: 'soft', dash: true, thin: true }),
      seg([0, -R], [0, R], { stroke: 'soft', dash: true, thin: true }),
    ],
    14,
  )
}

/** 阅读理解：外方内圆、外圆内方指的是什么 */
function genMeaning(d: Difficulty, rng: RNG): Question {
  const k = rng.pick(['out', 'in', 'fig'] as const)
  const wOut = W('m6.circ.w.outSq')
  const wIn = W('m6.circ.w.inSq')
  if (k === 'fig') {
    const order = rng.shuffle(['out', 'in'] as const)
    const ask = rng.pick(['out', 'in'] as const)
    const figs = order.map((x) => (x === 'out' ? outSquareFig('circle') : inSquareFig('square', false)))
    return pickFig({ kpId: KP_SQC, d, rng, sig: `mean-fig-${ask}-${order.join('.')}`, stem: [text(`m6.circ.q.meanFig.${ask}`), geoPart(figs, '两幅图：一幅是正方形里有圆，一幅是圆里有正方形', true)], count: 2, answer: order.indexOf(ask) })
  }
  return pickWord(KP_SQC, d, rng, `mean-${k}`, [text(`m6.circ.q.mean.${k}`)], k === 'out' ? wOut : wIn, [k === 'out' ? wIn : wOut, W('m6.circ.w.twoCircles')])
}
/** 外方内圆中正方形的边长 = 圆的直径 */
function genEdge(d: Difficulty, rng: RNG): Question {
  return pickWord(KP_SQC, d, rng, 'edge', [text('m6.circ.q.edgeQ'), geoPart([outSquareFig('circle')], '正方形里有一个最大的圆')], wDiameter, [wRadius, W('m6.circ.w.peri')])
}
/** 例 4 的表：外方内圆中正方形的面积 4r² */
function genOutSq(d: Difficulty, rng: RNG): Question {
  const r = rng.int(1, 10)
  return numQ({ kpId: KP_SQC, d, rng, sig: `outsq-${r}`, stem: [text('m6.circ.q.outSqQ', { r }), geoPart([outSquareFig('circle', `r=${r}`)], '正方形里有一个最大的圆')], value: 4 * r * r, smart: [2 * r * r, r * r, 4 * r] })
}
/** 例 4 的表：外圆内方中正方形的面积 2r²（看作两个三角形） */
function genInSq(d: Difficulty, rng: RNG): Question {
  const r = rng.int(1, 10)
  return numQ({ kpId: KP_SQC, d, rng, sig: `insq-${r}`, stem: [text('m6.circ.q.inSqQ', { r }), geoPart([inSquareFig('square')], '圆里有一个最大的正方形')], value: 2 * r * r, smart: [4 * r * r, r * r, 2 * r] })
}
/** 外圆内方中的正方形看作两个三角形：底是直径、高是半径 */
function genTriangles(d: Difficulty, rng: RNG): Question {
  const k = rng.pick(['base', 'height'] as const)
  return pickWord(KP_SQC, d, rng, `tri-${k}`, [text(`m6.circ.q.tri.${k}`), geoPart([inSquareFig('square')], '圆里有一个最大的正方形，画了一条对角线')], k === 'base' ? wDiameter : wRadius, [k === 'base' ? wRadius : wDiameter, W('m6.circ.w.peri')])
}
/** 例 4 的表：圆的面积用 π 表示（π、4π、9π……） */
function genPiForm(d: Difficulty, rng: RNG): Question {
  const r = rng.int(2, 9)
  return pickWord(KP_SQC, d, rng, `piform-${r}`, [text('m6.circ.q.piFormQ', { r })], `${r * r}π`, [`${2 * r}π`, `${r}π`, `${4 * r * r}π`].filter((x, i, a) => x !== `${r * r}π` && a.indexOf(x) === i))
}
const Q_JUDGE: [string, boolean][] = [
  ['always', true],
  ['bigger', false],
  ['outBig', true],
]
function genQJudge(d: Difficulty, rng: RNG): Question {
  const [k, yes] = rng.pick(Q_JUDGE)
  return judge(KP_SQC, d, rng, `qj-${k}`, [text(`m6.circ.q.j.${k}`)], yes)
}
/** 回顾反思：大正方形的面积是小正方形的 2 倍 */
function genTwice(d: Difficulty, rng: RNG): Question {
  return numQ({ kpId: KP_SQC, d, rng, sig: 'twice', stem: [text('m6.circ.q.twiceQ'), geoPart([nestedFig()], '正方形里有最大的圆，圆里又有最大的正方形')], value: 2, smart: [4, 3] })
}
/** 做一做：外方内圆，正方形的面积已知，求圆的面积 / 四个角的面积 */
function genOutByS(d: Difficulty, rng: RNG): Question {
  const S = rng.pick([20, 4, 100, 40, 8, 200, 12])
  if (rng.chance(0.5)) return valQ({ kpId: KP_SQC, d, rng, sig: `outs-c-${S}`, stem: [text('m6.circ.q.outS.circle', { s: S }), geoPart([outSquareFig('corner')], '正方形里有一个最大的圆，四个角涂了颜色')], value: pi(S / 4), wrong: [pi(S), pi(S / 2), S - pi(S / 4)] })
  return valQ({ kpId: KP_SQC, d, rng, sig: `outs-k-${S}`, stem: [text('m6.circ.q.outS.corner', { s: S }), geoPart([outSquareFig('corner')], '正方形里有一个最大的圆，四个角涂了颜色')], value: S - pi(S / 4), wrong: [pi(S / 4), S - pi(S), S - pi(S / 2)] })
}
/** 外圆内方：正方形的面积已知，求圆的面积 / 圆里正方形外面的部分 */
function genInByS(d: Difficulty, rng: RNG): Question {
  const S = rng.pick([18, 50, 200, 8, 32, 2])
  if (rng.chance(0.5)) return valQ({ kpId: KP_SQC, d, rng, sig: `ins-c-${S}`, stem: [text('m6.circ.q.inS.circle', { s: S }), geoPart([inSquareFig('out', false)], '圆里有一个最大的正方形，正方形外面涂了颜色')], value: pi(S / 2), wrong: [pi(S / 4), pi(S), pi(S / 2) - S] })
  return valQ({ kpId: KP_SQC, d, rng, sig: `ins-k-${S}`, stem: [text('m6.circ.q.inS.out', { s: S }), geoPart([inSquareFig('out', false)], '圆里有一个最大的正方形，正方形外面涂了颜色')], value: pi(S / 2) - S, wrong: [pi(S / 2), pi(S) - S, S - pi(S / 4)] })
}
/** 已知圆的半径，求涂色部分（外方内圆的四个角 / 外圆内方中正方形外面的部分） */
function genShadeByR(d: Difficulty, rng: RNG): Question {
  const r = rng.pick([10, 5, 2, 4, 20])
  if (rng.chance(0.5)) return valQ({ kpId: KP_SQC, d, rng, sig: `shr-out-${r}`, stem: [text('m6.circ.q.shR.out', { r }), geoPart([outSquareFig('corner')], '正方形里有一个最大的圆，四个角涂了颜色')], value: 4 * r * r - pi(r * r), wrong: [pi(r * r), 4 * r * r, 2 * r * r] })
  return valQ({ kpId: KP_SQC, d, rng, sig: `shr-in-${r}`, stem: [text('m6.circ.q.shR.in', { r }), geoPart([inSquareFig('out', false)], '圆里有一个最大的正方形，正方形外面涂了颜色')], value: pi(r * r) - 2 * r * r, wrong: [2 * r * r, pi(r * r), pi(r * r) - r * r] })
}

// ── 第 2、3 档 ──

/** 练习十三 5：正方形的一个顶点在圆心、边长等于半径 */
function cornerSqFig(): GeoFig {
  const R = 60
  return fitFig([circ([0, 0], R, { stroke: 'ink' }), poly([[-R, -R], [0, -R], [0, 0], [-R, 0]], { fill: 'b', stroke: 'ink' }), pt([0, 0])], 14)
}
function genCornerSq(d: Difficulty, rng: RNG): Question {
  const S = rng.pick([10, 4, 25, 100, 9])
  return valQ({ kpId: KP_SQC, d, rng, sig: `cornersq-${S}`, stem: [text('m6.circ.q.cornerSqQ', { s: S }), geoPart([cornerSqFig()], '圆和一个正方形，正方形的一个顶点在圆心')], value: pi(S), wrong: [pi(S / 4), pi(S * 2), pi(S / 2)] })
}
/** 套两层：大正方形里画最大的圆，圆里再画最大的正方形 */
function genNested(d: Difficulty, rng: RNG): Question {
  const S = rng.pick([20, 50, 100, 36, 64])
  return numQ({ kpId: KP_SQC, d, rng, sig: `nested-${S}`, stem: [text('m6.circ.q.nestedQ', { s: S }), geoPart([nestedFig()], '正方形里有最大的圆，圆里又有最大的正方形')], value: S / 2, smart: [S / 4, S * 2, S] })
}
/** 第 3 档：圆—正方形—圆，小圆的面积是大圆的几分之几 */
function genThreeLayers(d: Difficulty, rng: RNG): Question {
  return pickWord(KP_SQC, d, rng, 'layers', [text('m6.circ.q.layersQ')], '1/2', ['1/4', '1/3', '2/3'])
}

defineGenerator(KP_SQC, (d, rng) => {
  const roll = rng.next()
  if (d === 1) {
    // 面积例 4：阅读理解、分析解答的两张表（π、4π、9π，4r²、2r²）、发现、回顾反思，做一做
    if (roll < 0.1) return genMeaning(d, rng)
    if (roll < 0.17) return genEdge(d, rng)
    if (roll < 0.27) return genOutSq(d, rng)
    if (roll < 0.37) return genInSq(d, rng)
    if (roll < 0.44) return genTriangles(d, rng)
    if (roll < 0.52) return genPiForm(d, rng)
    if (roll < 0.59) return genQJudge(d, rng)
    if (roll < 0.65) return genTwice(d, rng)
    if (roll < 0.78) return genOutByS(d, rng)
    if (roll < 0.9) return genInByS(d, rng)
    return genShadeByR(d, rng)
  }
  if (d === 2) {
    if (roll < 0.6) return genCornerSq(d, rng)
    return genNested(d, rng)
  }
  if (roll < 0.5) return genThreeLayers(d, rng)
  return genCornerSq(d, rng)
})
