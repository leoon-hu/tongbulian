import type { Difficulty, GeoFig, GeoItem, GeoPt, InputMode, LParam, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 多边形的面积（五上六，第 72–94 页，2022 版课标新教材）：
// 平行四边形的面积（底和高的定义、沿高剪开拼成长方形、S = ah、例 1、练习十四）；公顷和平方千米（课本夹在平行四边形面积里，
// 例 1 后面、做一做 2–3、练习十四 3、4、6，练习十八 3）；三角形的面积（底和高、两个一样的三角形拼平行四边形、S = ah ÷ 2、例 2、
// 做一做、练习十五）；梯形的面积（上底、下底、腰、高，两个一样的梯形拼平行四边形、S = (a + b)h ÷ 2、例 3、做一做、练习十六）；
// 组合图形的面积（例 4、练习十七、练习十八 4、5、7）；不规则图形的面积（例 5 数满格 / 非满格、近似成平行四边形，练习十七 4、5，
// 练习十八 6）。整理和复习、练习十八的题分在各知识点的第 2、3 档；*格点多边形的面积不单设。
// 课本里量一量再算、画一画、设计方案、说一说的都不出，改成图上标好数（或方格纸上数格子）再算。
// 作答：整数面积用数字键盘，小数面积、名称、公式、单位一律选项卡（干扰项照课本暴露的错法：忘了除以 2、括号漏了、用了邻边、
// 小数点点错位、进率记错）。题干的单位一律写汉字（平方米、公顷），图上写数和字母单位（18 cm）。图都用 GeoFigure：
// 蓝边、高是红色虚线、垂足画直角记号，图按比例画；图里只放数、字母、cm、emoji。
// 朗读：「长」只出现在「长度」「长方形」里；不用「转化」「转一转」「沿着」「只」「为」「还」「数一数」这些容易读错的说法。
// ─────────────────────────────────────────────────────────────

export const T = 'area' as const
export type P = GeoPt

// ── 数 ──

/** 取 4 位小数再去掉末尾的 0：161.2、0.36、2388 */
export const fmt = (n: number): string => String(Math.round(n * 10000) / 10000)
const r1 = (n: number): number => Math.round(n * 10) / 10
const isInt = (x: number): boolean => Math.abs(x - Math.round(x)) < 1e-9
/** 浮点误差：0.9 × 0.4 = 0.36000000000000004 → 0.36 */
export const clean = (n: number): number => Math.round(n * 1e6) / 1e6

// ── 题干与出题骨架 ──

export const text = (k: string, p?: Record<string, LParam>): StemPart => ({ kind: 'text', text: p ? { k, p } : { k } })
export const W = (k: string): LStr => ({ k })
export const YES: LStr = W('m5.area.yes')
export const NO: LStr = W('m5.area.no')

/** 判断题：「……，对吗？」配 对 / 不对 */
export function judge(kpId: string, d: Difficulty, rng: RNG, sig: string, stem: StemPart[], yes: boolean, type: 'area' | 'motion' = T): Question {
  return labelQuestion({ kpId, type, difficulty: d, sig, stem, correct: yes ? YES : NO, distractors: [yes ? NO : YES], rng })
}
/** 几个词条里选一个 */
export function pickWord(kpId: string, d: Difficulty, rng: RNG, sig: string, stem: StemPart[], correct: LStr, wrong: LStr[], type: 'area' | 'motion' = T): Question {
  return labelQuestion({ kpId, type, difficulty: d, sig, stem, correct, distractors: wrong, rng })
}
/**
 * 整数答案：数字键盘或选项卡（numberQuestion 随机），smart 是照课本暴露的错法算出来的干扰项（忘了除以 2、多除了 2……）；
 * 只留正整数、不等于答案的。
 */
export function numQ(o: { kpId: string; d: Difficulty; rng: RNG; sig: string; stem: StemPart[]; value: number; smart?: number[]; input?: InputMode; type?: 'area' | 'motion' }): Question {
  const smart = [...new Set((o.smart ?? []).map(clean))].filter((x) => isInt(x) && x > 0 && x !== o.value && x < 1e9)
  return numberQuestion({ kpId: o.kpId, type: o.type ?? T, difficulty: o.d, sig: o.sig, stem: o.stem, value: o.value, rng: o.rng, min: 1, max: Math.max(o.value * 10, 100), smart, input: o.input })
}
/**
 * 小数（或可能是小数）答案：一律选项卡。wrong 按课本暴露的错法给，去掉和答案相等的、重复的、不是正数的；
 * 不够 3 个用「小数点错一位」补。答案是整数时也可以用（选项照样是数）。
 */
export function decQ(o: { kpId: string; d: Difficulty; rng: RNG; sig: string; stem: StemPart[]; value: number; wrong: number[]; type?: 'area' | 'motion' }): Question {
  const right = fmt(o.value)
  const seen = new Set([right])
  const wrongs: string[] = []
  const push = (w: number): void => {
    if (wrongs.length >= 3 || !(w > 0) || !Number.isFinite(w)) return
    const s = fmt(w)
    if (seen.has(s)) return
    seen.add(s)
    wrongs.push(s)
  }
  for (const w of o.wrong) push(clean(w))
  for (const w of [o.value * 10, o.value / 10, o.value * 2, o.value / 2]) push(clean(w))
  return labelQuestion({ kpId: o.kpId, type: o.type ?? T, difficulty: o.d, sig: o.sig, stem: o.stem, correct: right, distractors: wrongs, rng: o.rng })
}
/** 答案是整数就用 numQ，不是整数就出选项 */
export function areaQ(o: { kpId: string; d: Difficulty; rng: RNG; sig: string; stem: StemPart[]; value: number; wrong: number[]; input?: InputMode }): Question {
  const v = clean(o.value)
  if (isInt(v)) return numQ({ ...o, value: Math.round(v), smart: o.wrong })
  return decQ({ ...o, value: v })
}

// ── 单位 ──

export type LenU = 'cm' | 'dm' | 'm'
/** 面积单位的词条 */
export const uA = (u: LenU | 'ha' | 'km'): LStr => W(`m5.area.u.${u === 'km' ? 'km2' : u === 'ha' ? 'ha' : `${u}2`}`)
/** 长度单位的词条 */
export const uL = (u: LenU | 'km'): LStr => W(`m5.area.u.${u}`)
/** 图上的长度标注：数 + 字母单位（18 cm、2.5 m） */
export const lab = (n: number, u: LenU): string => `${fmt(n)} ${u}`

// ── 几何小工具（各包自己一份，免得互相加载）──

export const add = (a: P, b: P): P => [a[0] + b[0], a[1] + b[1]]
export const sub = (a: P, b: P): P => [a[0] - b[0], a[1] - b[1]]
export const mul = (a: P, k: number): P => [a[0] * k, a[1] * k]
export const mid = (a: P, b: P): P => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
export const dist = (a: P, b: P): number => Math.hypot(a[0] - b[0], a[1] - b[1])
export const norm = (v: P): P => {
  const l = Math.hypot(v[0], v[1]) || 1
  return [v[0] / l, v[1] / l]
}
const rad = (deg: number): number => (deg * Math.PI) / 180
/** 绕 c 转 deg 度（屏幕上看是逆时针，y 向下） */
export function rotP(p: P, deg: number, c: P = [0, 0]): P {
  const cos = Math.cos(rad(deg))
  const sin = Math.sin(rad(deg))
  const x = p[0] - c[0]
  const y = p[1] - c[1]
  return [c[0] + x * cos + y * sin, c[1] - x * sin + y * cos]
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
/**
 * 把一组东西挪到左上角留白的地方，外框就是图的大小（坐标取一位小数）。默认左右留 24（竖边上标的字要地方）、上下留 16
 * （手机竖屏上题目、图和数字键盘要一屏放下，U5）；m 是一个数就四边都留 m，[左右, 上下] 分开给（有尺寸线的图）
 */
export function fitFig(items: GeoItem[], m?: number | [number, number], px?: number): GeoFig {
  const mx = m === undefined ? 24 : typeof m === 'number' ? m : m[0]
  const my = m === undefined ? 16 : typeof m === 'number' ? m : m[1]
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

/**
 * 一组点先绕原点转 deg 度，再等比缩放到 maxW × maxH 以内、挪到从 (0, 0) 起（图按比例画：几个图形的关键点一起变）
 */
export function place<K extends string>(pts: Record<K, P>, deg = 0, maxW = 200, maxH = 88): Record<K, P> {
  const keys = Object.keys(pts) as K[]
  const r = keys.map((k) => rotP(pts[k], deg))
  const xs = r.map((p) => p[0])
  const ys = r.map((p) => p[1])
  const x0 = Math.min(...xs)
  const y0 = Math.min(...ys)
  const w = Math.max(...xs) - x0 || 1
  const h = Math.max(...ys) - y0 || 1
  const s = Math.min(maxW / w, maxH / h)
  const out = {} as Record<K, P>
  keys.forEach((k, i) => {
    out[k] = [r1((r[i]![0] - x0) * s), r1((r[i]![1] - y0) * s)]
  })
  return out
}

/** 字写在线段 a—b 旁边（side = 1 / −1 两侧；横着的字按宽度让开） */
export function besideLabel(a: P, b: P, label: string, toward?: P): GeoItem {
  const m = mid(a, b)
  const u = norm(sub(b, a))
  let n: P = [-u[1], u[0]]
  if (toward && (toward[0] - m[0]) * n[0] + (toward[1] - m[1]) * n[1] < 0) n = mul(n, -1)
  const off = 8 + Math.abs(n[0]) * label.length * 4.9 + Math.abs(n[1]) * 9
  return { t: 'text', at: add(m, mul(n, off)), text: label }
}
/**
 * 高：top 到垂足 foot 的红色虚线 + 垂足处的直角记号（along 是底边上的另一个点，定直角记号朝哪边）。
 * 字写在虚线中间（描一圈底色压住线，不会和斜边撞在一起）；虚线太短放不下，写在靠 toward 的一侧
 */
export function heightItems(top: P, foot: P, along: P, label: string | null, toward?: P): GeoItem[] {
  const out: GeoItem[] = [
    { t: 'line', a: top, b: foot, dash: true, stroke: 'd' },
    { t: 'arc', at: foot, a: along, b: top, right: true },
  ]
  if (label) {
    const len = dist(top, foot)
    const u = norm(sub(foot, top))
    // 竖着（或比较竖）的高才把字写在线上：横着的字沿竖线只占一个字高；横着的高字写在线的旁边
    const upright = Math.abs(u[1]) >= Math.abs(u[0])
    out.push(upright && len >= 44 ? { t: 'text', at: mid(add(top, mul(u, -6)), foot), text: label, halo: true } : besideLabel(top, foot, label, toward))
  }
  return out
}
/** 一组编号的图里选一个：选项就是图下面的 1、2、3…… */
export function pickFig(kpId: string, d: Difficulty, rng: RNG, sig: string, stem: StemPart[], count: number, answer: number, type: 'area' | 'motion' = T): Question {
  const all = Array.from({ length: count }, (_, i) => String(i + 1))
  return labelQuestion({ kpId, type, difficulty: d, sig, stem, correct: String(answer + 1), distractors: all.filter((x) => x !== String(answer + 1)), rng })
}
/** 画图用的高：太扁、太高的图按比例画看不清，把画出来的高限制在底的 lo 倍到 hi 倍之间（标的数不变） */
const drawH = (h: number, base: number, lo = 0.32, hi = 1.25): number => Math.min(Math.max(h, base * lo), base * hi)
/** 转过的图（底竖着、斜着）给大一点的地方 */
const roomFor = (deg: number): [number, number] => (deg % 180 === 0 ? [200, 88] : [150, 100])
const centroid = (pts: P[]): P => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length]

// ─────────────────────────────────────────────────────────────
// 平行四边形、三角形、梯形的图（按比例画）
// ─────────────────────────────────────────────────────────────

/**
 * 平行四边形：底 a、高 h、上边相对下边错开 s（都是题目里的单位，s 可以是负数）；deg 把整幅图转一下（竖着放、斜着放：
 * 底不一定在下面，练习十四 1 的停车位、做一做 1 ②）。side：在右边那条斜边上标它的长度（第 2 档的干扰条件，S = ab 的错法）。
 */
export function paraFig(o: { a: number; h: number; s: number; u: LenU; deg?: number; side?: number; showH?: boolean; aLabel?: string | null; hLabel?: string | null }): GeoFig {
  const { a } = o
  const h = drawH(o.h, a)
  const s = o.s * (h / o.h)
  // 高从上边上的一点垂直落到下边：上边、下边都覆盖到的那一段里，靠左取
  const lo = Math.max(0, s)
  const hi = Math.min(a, a + s)
  const xf = s >= 0 && s <= a * 0.7 ? s : lo + (hi - lo) * 0.3
  const k = place(
    { A: [0, h], B: [a, h], C: [a + s, 0], D: [s, 0], F: [xf, h], E: [xf, 0], G: [xf + Math.max(1e-3, (hi - lo) * 0.2), h] },
    o.deg ?? 0,
    ...roomFor(o.deg ?? 0),
  )
  const pts = [k.A, k.B, k.C, k.D]
  const aLabel = o.aLabel === undefined ? lab(a, o.u) : o.aLabel
  const items: GeoItem[] = [{ t: 'poly', pts, fill: 'b', stroke: 'b', labels: [aLabel, o.side ? lab(o.side, o.u) : null, null, null] }]
  if (o.showH !== false) {
    const hLabel = o.hLabel === undefined ? lab(o.h, o.u) : o.hLabel
    items.push(...heightItems(k.E, k.F, k.G, hLabel, centroid(pts)))
  }
  return fitFig(items)
}

/**
 * 三角形：底 a、高 h，顶点在底的左端往右 x 的正上方（x < 0 或 x > a 是钝角三角形，高画在外面、底边用虚线延长；
 * x = 0 或 x = a 是直角三角形，高就是一条直角边，直接在边上标数）。deg 转一下（底不一定在下面）。
 */
export function triFig(o: { a: number; h: number; x: number; u: LenU; deg?: number; aLabel?: string | null; hLabel?: string | null; fill?: 'a' | 'b' | 'c' | 'd' }): GeoFig {
  const { a, x } = o
  const h = drawH(o.h, a)
  const inside = x > 0 && x < a
  // 直角记号朝着底（或底的延长线）那边画
  const gx = x <= 0 ? x + a * 0.2 : x >= a ? x - a * 0.2 : x + (x < a / 2 ? 1 : -1) * Math.min(x, a - x) * 0.5
  const k = place({ B: [0, h], C: [a, h], A: [x, 0], F: [x, h], G: [gx, h] }, o.deg ?? 0, ...roomFor(o.deg ?? 0))
  const pts = [k.B, k.C, k.A]
  const aLabel = o.aLabel === undefined ? lab(a, o.u) : o.aLabel
  const hLabel = o.hLabel === undefined ? lab(o.h, o.u) : o.hLabel
  const fill = o.fill ?? 'a'
  if (x === 0 || x === a) {
    // 直角三角形：竖着的那条直角边就是高
    const labels = x === 0 ? [aLabel, null, hLabel] : [aLabel, hLabel, null]
    return fitFig([{ t: 'poly', pts, fill, stroke: 'a', labels, right: [x === 0 ? 0 : 1] }])
  }
  const items: GeoItem[] = [{ t: 'poly', pts, fill, stroke: 'a', labels: [aLabel, null, null] }]
  if (!inside) items.push({ t: 'line', a: x < 0 ? k.B : k.C, b: k.F, dash: true, stroke: 'd' })
  items.push(...heightItems(k.A, k.F, k.G, hLabel, inside ? centroid(pts) : x < 0 ? k.B : k.C))
  return fitFig(items)
}

/**
 * 梯形：上底 t、下底 b、高 h，上底的左端在下底左端往右 x 的正上方（x = 0 是直角梯形，左边那条腰就是高）。
 * flip：上下翻过来（上边长、下边短，水渠、练习十六 2①）；deg 转一下（练习十六 2② 竖着放）。
 */
export function trapFig(o: { t: number; b: number; h: number; x: number; u: LenU; deg?: number; flip?: boolean; tLabel?: string | null; bLabel?: string | null; hLabel?: string | null; fill?: 'a' | 'b' | 'c' | 'd' }): GeoFig {
  const { t, b, x } = o
  const h = drawH(o.h, b, 0.3, 1.1)
  const y = (v: number): number => (o.flip ? h - v : v)
  // 高从上底上的一点落到下底：x 在下底范围里就从上底左端落下，不然从上底中间落
  const xf = x >= 0 && x <= b * 0.75 ? x : Math.max(0, x) + (Math.min(b, x + t) - Math.max(0, x)) * 0.4
  const k = place({ A: [0, y(h)], B: [b, y(h)], C: [x + t, y(0)], D: [x, y(0)], F: [xf, y(h)], E: [xf, y(0)], G: [xf + b * 0.15, y(h)] }, o.deg ?? 0, ...roomFor(o.deg ?? 0))
  const pts = [k.A, k.B, k.C, k.D]
  const tLabel = o.tLabel === undefined ? lab(t, o.u) : o.tLabel
  const bLabel = o.bLabel === undefined ? lab(b, o.u) : o.bLabel
  const hLabel = o.hLabel === undefined ? lab(o.h, o.u) : o.hLabel
  const fill = o.fill ?? 'c'
  if (x === 0) return fitFig([{ t: 'poly', pts, fill, stroke: 'c', labels: [bLabel, null, tLabel, hLabel], right: [0, 3] }])
  const items: GeoItem[] = [{ t: 'poly', pts, fill, stroke: 'c', labels: [bLabel, null, tLabel, null] }]
  items.push(...heightItems(k.E, k.F, k.G, hLabel, centroid(pts)))
  return fitFig(items)
}

/** 方格纸上的图形（每格 1 个单位，px 像素一格）：grid + 一个涂色的多边形 */
function gridFig(W: number, H: number, polys: GeoItem[], px = 24): GeoFig {
  return { w: W, h: H, px: Math.min(px, Math.floor(260 / W), Math.floor(110 / H)), items: [{ t: 'grid', x: 0, y: 0, w: W, h: H }, ...polys] }
}

// ─────────────────────────────────────────────────────────────
// 平行四边形的面积（第 73–79 页、练习十四）
// ─────────────────────────────────────────────────────────────

const KP_PARA = 'm5s1-06-parallelogram'

/** 第 73 页：方格纸上的平行四边形，把左边的三角形平移到右边拼成长方形（moved 时画出平移的那块） */
function genParaGrid(kpId: string, d: Difficulty, rng: RNG): Question {
  const a = rng.int(2, 6)
  const h = rng.int(1, 4)
  const s = rng.pick([1, 2, 3, -1, -2].filter((v) => Math.abs(v) < a + 2))
  const moved = rng.chance(0.5)
  const x0 = 1 + Math.max(0, -s)
  const y0 = 1
  const A: P = [x0, y0 + h]
  const B: P = [x0 + a, y0 + h]
  const C: P = [x0 + a + s, y0]
  const D: P = [x0 + s, y0]
  const Wd = a + Math.abs(s) + 2
  const items: GeoItem[] = [{ t: 'poly', pts: [A, B, C, D], fill: 'b', stroke: 'b' }]
  if (moved) {
    // s > 0：左边的直角三角形 A—D—(D 正下方) 平移到右边；s < 0：右边的三角形平移到左边
    const tri: P[] = s > 0 ? [A, [x0 + s, y0 + h], D] : [B, [x0 + a + s, y0 + h], C]
    const to: P[] = s > 0 ? tri.map((p) => add(p, [a, 0])) : tri.map((p) => add(p, [-a, 0]))
    items.push({ t: 'poly', pts: tri, fill: 'a', stroke: 'a' }, { t: 'poly', pts: to, stroke: 'd', dash: true })
  }
  return numQ({
    kpId,
    d,
    rng,
    sig: `grid-${a}x${h}-${s}${moved ? 'm' : ''}`,
    stem: [text('m5.area.p.gridQ'), geoPart([gridFig(Wd, h + 2, items)], `（方格纸上的平行四边形，底 ${a} 格，高 ${h} 格${moved ? '，左边一块平移到右边' : ''}）`)],
    value: a * h,
    smart: [a * h + h, a * (h + 1), (a + h) * 2, a * h * 2],
  })
}

/** 底和高的定义（第 73 页） */
function genParaDef(kpId: string, d: Difficulty, rng: RNG): Question {
  return rng.chance(0.55)
    ? pickWord(kpId, d, rng, 'def-h', [text('m5.area.p.defHQ')], W('m5.area.w.height'), [W('m5.area.w.base'), W('m5.area.w.leg')])
    : pickWord(kpId, d, rng, 'def-b', [text('m5.area.p.defBQ')], W('m5.area.w.base'), [W('m5.area.w.height'), W('m5.area.w.leg')])
}

/** 三幅一样的平行四边形，各画一条虚线：哪幅里的虚线是高（垂直到对边、有直角记号） */
function genParaPickH(kpId: string, d: Difficulty, rng: RNG): Question {
  const a = rng.pick([5, 6, 7])
  const h = rng.pick([3, 4])
  const s = rng.pick([2, 3, -2])
  const right = rng.int(0, 2)
  const figs: GeoFig[] = []
  for (let i = 0; i < 3; i++) {
    const k = place({ A: [0, h], B: [a, h], C: [a + s, 0], D: [s, 0] }, 0, 120, 70)
    const items: GeoItem[] = [{ t: 'poly', pts: [k.A, k.B, k.C, k.D], fill: 'b', stroke: 'b' }]
    const lo = Math.max(k.A[0], k.D[0])
    const hi = Math.min(k.B[0], k.C[0])
    const xt = lo + (hi - lo) * 0.4
    const yTop = k.D[1]
    const yBot = k.A[1]
    if (i === right) items.push(...heightItems([xt, yTop], [xt, yBot], [xt + 12, yBot], null))
    else {
      // 斜着的虚线：上边一点连到下边离垂足至少 0.45 个高的地方（明显不垂直），不画直角记号；两幅错的往不同的方向斜
      const H = yBot - yTop
      const want = i === (right + 1) % 3 ? 1 : -1
      const cands = [want, -want].map((sg) => xt + sg * H * 0.6).filter((x) => x >= k.A[0] + 4 && x <= k.B[0] - 4)
      const xb = cands[0] ?? (xt - k.A[0] > k.B[0] - xt ? k.A[0] + 4 : k.B[0] - 4)
      items.push({ t: 'line', a: [xt, yTop], b: [xb, yBot], dash: true, stroke: 'd' })
    }
    figs.push(fitFig(items, 10))
  }
  return pickFig(kpId, d, rng, `pickh-${a}-${h}-${s}-${right}`, [text('m5.area.p.pickHQ'), geoPart(figs, '（三幅一样的平行四边形，编号 1 到 3，各画了一条虚线）', true)], 3, right)
}

/** 第 74 页：沿高剪开、平移，拼成长方形 */
function genParaCut(kpId: string, d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (roll < 0.34) return pickWord(kpId, d, rng, 'cut-w', [text('m5.area.p.cutWQ')], W('m5.area.w.height'), [W('m5.area.w.base'), W('m5.area.w.neighbor')])
  if (roll < 0.67) return pickWord(kpId, d, rng, 'cut-same', [text('m5.area.p.cutSameQ')], W('m5.area.w.noChange'), [W('m5.area.w.bigger'), W('m5.area.w.smaller')])
  return pickWord(kpId, d, rng, 'cut-f', [text('m5.area.p.formulaQ')], W('m5.area.f.para'), [W('m5.area.f.paraNeighbor'), W('m5.area.f.tri')])
}

/** 字母公式 S = ah（第 74 页） */
const F_PARA = 'S = ah'
const F_RECT = 'S = ab'
const F_TRI = 'S = ah ÷ 2'
const F_TRAP = 'S = (a + b)h ÷ 2'
function genParaLetter(kpId: string, d: Difficulty, rng: RNG): Question {
  return labelQuestion({ kpId, type: T, difficulty: d, sig: 'letter', stem: [text('m5.area.p.letterQ')], correct: F_PARA, distractors: rng.shuffle([F_RECT, F_TRI, F_TRAP]).slice(0, rng.chance(0.5) ? 3 : 2), rng })
}

/** 整数的底和高（练习十四 2 的整数列、练习十八 1①，再加一些） */
const PARA_INT: [number, number][] = [
  [18, 15], [38, 21], [70, 15], [12, 8], [16, 9], [20, 12], [25, 8], [24, 15], [30, 20], [14, 6], [9, 7], [15, 12], [32, 25], [45, 20], [10, 6], [8, 5], [26, 14], [40, 18],
]
/** 图上标底和高，求面积（例 1 的图、练习十四 2） */
function genParaCalc(kpId: string, d: Difficulty, rng: RNG): Question {
  const [a, h] = rng.chance(0.4) ? rng.pick(PARA_INT) : [rng.int(6, 30), rng.int(4, 20)]
  const u = rng.pick<LenU>(['cm', 'dm', 'm'])
  // 斜着的边按比例画：上边错开 (0.2–0.6) 个底
  const s = r1(a * rng.pick([0.25, 0.35, 0.5, -0.3]))
  return numQ({
    kpId,
    d,
    rng,
    sig: `calc-${a}-${h}-${u}-${s}`,
    stem: [text('m5.area.p.areaQ', { u: uA(u) }), geoPart([paraFig({ a, h, s, u })], `（平行四边形：底 ${a} ${u}，高 ${h} ${u}）`)],
    value: a * h,
    smart: [(a * h) / 2, (a + h) * 2, a + h, a * h * 2],
  })
}

/** 例 1：平行四边形田地（文字题） */
const FIELDS: [number, number][] = [
  [300, 200], [250, 84], [180, 120], [400, 150], [150, 80], [240, 125], [320, 150], [200, 140],
]
function genParaField(kpId: string, d: Difficulty, rng: RNG): Question {
  const [a, h] = rng.pick(FIELDS)
  return numQ({ kpId, d, rng, sig: `field-${a}-${h}`, stem: [text('m5.area.p.fieldQ', { a, h })], value: a * h, smart: [(a * h) / 2, (a + h) * 2, a * h * 10] })
}

/** 小数的底或高（练习十四 1、2、5）：积是小数的出选项（小数点错一位、多除以 2、加起来了） */
const PARA_DEC: [number, number][] = [
  [6.2, 26], [21.5, 9.8], [5.2, 18], [0.9, 0.4], [2.8, 1.5], [6, 2.5], [3.5, 4], [4.5, 6], [2.4, 1.5], [12.5, 8], [7.5, 4.2], [1.2, 0.8],
]
function genParaDec(kpId: string, d: Difficulty, rng: RNG): Question {
  const [a, h] = rng.pick(PARA_DEC)
  const u = rng.pick<LenU>(['cm', 'm'])
  const v = clean(a * h)
  return areaQ({
    kpId,
    d,
    rng,
    sig: `dec-${a}-${h}-${u}`,
    stem: [text('m5.area.p.areaQ', { u: uA(u) }), geoPart([paraFig({ a, h, s: r1(a * 0.3), u })], `（平行四边形：底 ${a} ${u}，高 ${h} ${u}）`)],
    value: v,
    wrong: [v * 10, v / 10, v / 2, a + h],
  })
}

/** 底不在下面：竖着放（做一做 1②）、斜着放（练习十四 1 停车位），第 2 档还标出邻边的长度（S = ab 的错法） */
function genParaTurned(kpId: string, d: Difficulty, rng: RNG): Question {
  const a = rng.int(6, 16)
  const deg = rng.pick([90, -90, 60, -60, 120])
  // 转 90° 的竖着很高，高太小就成了一根细条：高取底的 0.6–0.9 倍
  const h = Math.abs(deg) === 90 ? rng.int(Math.ceil(a * 0.6), Math.floor(a * 0.9)) : rng.int(3, Math.min(12, a - 2))
  // 第 2 档在斜边上标出它的长度（比高长，画出来的斜度也按它算；太斜的不要，免得高落不到对边上）
  const sides = [1, 2, 3, 4].map((x) => h + x).filter((x) => Math.sqrt(x * x - h * h) <= a * 0.6)
  const side = d >= 2 && sides.length ? rng.pick(sides) : undefined
  const s = side ? r1(Math.sqrt(side * side - h * h)) : r1(a * 0.25)
  const u = rng.pick<LenU>(['cm', 'm'])
  return numQ({
    kpId,
    d,
    rng,
    sig: `turn-${a}-${h}-${side ?? 0}-${deg}-${u}`,
    stem: [text('m5.area.p.areaQ', { u: uA(u) }), geoPart([paraFig({ a, h, s, u, deg, side })], `（斜着放的平行四边形：一条底 ${a} ${u}，这条底上的高 ${h} ${u}${side ? `，另一条边 ${side} ${u}` : ''}）`)],
    value: a * h,
    smart: side ? [a * side, side * h, (a * h) / 2] : [(a * h) / 2, (a + h) * 2],
  })
}

/** 已知面积和底求高、已知面积和高求底（练习十四 7） */
const PARA_INV: [number, number, number][] = [
  [28, 7, 4], [36, 9, 4], [48, 8, 6], [45, 9, 5], [54, 6, 9], [60, 12, 5], [72, 8, 9], [42, 7, 6], [96, 12, 8], [63, 9, 7], [30, 6, 5], [56, 8, 7],
]
function genParaInverse(kpId: string, d: Difficulty, rng: RNG): Question {
  const [S, a, h] = rng.pick(PARA_INV)
  const u = rng.pick<LenU>(['cm', 'm'])
  const askH = rng.chance(0.6)
  return numQ({
    kpId,
    d,
    rng,
    sig: `inv-${askH ? 'h' : 'a'}-${S}-${a}-${u}`,
    stem: [askH ? text('m5.area.p.heightQ', { s: S, a, u: uL(u), u2: uA(u) }) : text('m5.area.p.baseQ', { s: S, h, u: uL(u), u2: uA(u) })],
    value: askH ? h : a,
    smart: askH ? [S * a, S - a, h * 2] : [S * h, S - h, a * 2],
  })
}

/** 第 73 页的结论、等底等高（练习十四 5）：判断 */
function genParaJudge(kpId: string, d: Difficulty, rng: RNG): Question {
  const all: [string, boolean][] = [
    ['m5.area.p.jSides', false],
    ['m5.area.p.jSameBH', true],
    ['m5.area.p.jPull', false],
    ['m5.area.p.jNeighbor', false],
    ['m5.area.p.jRect', true],
  ]
  const [k, yes] = rng.pick(all)
  return judge(kpId, d, rng, `j-${k.split('.').pop()}`, [text(k)], yes)
}

/** 练习十四 5：两个平行四边形共用下底、夹在同一组平行线之间，面积各是多少（都一样） */
const SAME_BH: [number, number][] = [
  [2.8, 1.5], [6, 4], [8, 5], [5, 3], [7, 4], [4.5, 2],
]
function genParaSame(kpId: string, d: Difficulty, rng: RNG): Question {
  const [a, h] = rng.pick(SAME_BH)
  // 课本的图：左边那个向左斜、右边那个向右斜，两个交叉重叠；高画在公共底的左端（从上面那条线垂直落到底的左端点）
  const k = place({ A: [0, h], B: [a, h], L1: [-a * 0.65, 0], L2: [a * 0.35, 0], R1: [a * 0.6, 0], R2: [a * 1.6, 0], F: [-a * 0.65, h] }, 0, 220, 80)
  const items: GeoItem[] = [
    { t: 'poly', pts: [k.A, k.B, k.L2, k.L1], stroke: 'b', labels: [lab(a, 'cm'), null, null, null] },
    { t: 'poly', pts: [k.A, k.B, k.R2, k.R1], stroke: 'a' },
    { t: 'line', a: k.A, b: k.F, dash: true, stroke: 'd' },
    ...heightItems(k.L1, k.F, [k.F[0] + 12, k.F[1]], null),
    besideLabel(k.L1, k.F, lab(h, 'cm'), [k.F[0] - 50, k.F[1]]),
  ]
  const v = clean(a * h)
  return areaQ({
    kpId,
    d,
    rng,
    sig: `same-${a}-${h}`,
    stem: [text('m5.area.p.sameQ'), geoPart([fitFig(items)], `（两个平行四边形共用一条底 ${a} cm，夹在同一组平行线之间，高都是 ${h} cm）`)],
    value: v,
    wrong: [v / 2, v * 2, a + h],
  })
}

/** 练习十四 8：正方形的周长 → 边长；平行四边形以正方形的上边为底、正方形的边长为高 */
function genParaSquare(kpId: string, d: Difficulty, rng: RNG): Question {
  const side = rng.int(4, 12)
  const P0 = side * 4
  // 课本的图：平行四边形的上边就是正方形的上边，下边在正方形下边的延长线上（红虚线连过去）
  const k = place({ A: [0, side], B: [side, side], C: [side, 0], D: [0, 0], E: [side * 1.7, side], F: [side * 2.7, side] }, 0, 210, 90)
  const items: GeoItem[] = [
    { t: 'poly', pts: [k.D, k.C, k.F, k.E], stroke: 'b', fill: 'b' },
    { t: 'poly', pts: [k.A, k.B, k.C, k.D], stroke: 'ink' },
    { t: 'line', a: k.B, b: k.E, dash: true, stroke: 'd' },
  ]
  return numQ({
    kpId,
    d,
    rng,
    sig: `square-${P0}`,
    stem: [text('m5.area.p.squareQ', { p: P0 }), geoPart([fitFig(items)], '（一个正方形，旁边的平行四边形以正方形的上边为上边，下边在正方形下边的延长线上）')],
    value: side * side,
    smart: [P0 * side, side * 4, (side * side) / 2],
  })
}

/** 练习十四 9：A、B 是上下两边的中点，涂色的小平行四边形是大的一半 */
function genParaMid(kpId: string, d: Difficulty, rng: RNG): Question {
  const S = rng.pick([48, 36, 60, 72, 40, 56, 64, 80, 100])
  const k = place({ P: [0, 4], Q: [6, 4], R: [8, 0], S: [2, 0] }, 0, 190, 100)
  const A = mid(k.S, k.R)
  const B = mid(k.P, k.Q)
  const items: GeoItem[] = [
    { t: 'poly', pts: [k.S, A, k.Q, B], fill: 'a', stroke: 'a' },
    { t: 'poly', pts: [k.P, k.Q, k.R, k.S], stroke: 'b' },
    { t: 'dot', at: A, label: 'A', side: 'n' },
    { t: 'dot', at: B, label: 'B', side: 's' },
  ]
  return numQ({
    kpId,
    d,
    rng,
    sig: `mid-${S}`,
    stem: [text('m5.area.p.midQ', { s: S }), geoPart([fitFig(items)], '（大平行四边形，A、B 是上、下两边的中点，左上顶点、A、右下顶点、B 围成的小平行四边形涂了色）')],
    value: S / 2,
    smart: [S / 4, S * 2, S - 4],
  })
}

defineGenerator(KP_PARA, (d, rng) => {
  const kpId = KP_PARA
  const roll = rng.next()
  if (d === 1) {
    // 第 73 页方格纸、底和高的定义、看图找高；第 74 页沿高剪开拼成长方形、S = ah；例 1；做一做 1（改成图上标好数）
    if (roll < 0.18) return genParaGrid(kpId, d, rng)
    if (roll < 0.28) return genParaDef(kpId, d, rng)
    if (roll < 0.38) return genParaPickH(kpId, d, rng)
    if (roll < 0.5) return genParaCut(kpId, d, rng)
    if (roll < 0.58) return genParaLetter(kpId, d, rng)
    if (roll < 0.8) return genParaCalc(kpId, d, rng)
    if (roll < 0.9) return genParaField(kpId, d, rng)
    return genParaTurned(kpId, d, rng)
  }
  if (d === 2) {
    // 练习十四 1、2、5、7 与第 73 页的结论
    if (roll < 0.28) return genParaDec(kpId, d, rng)
    if (roll < 0.48) return genParaTurned(kpId, d, rng)
    if (roll < 0.66) return genParaInverse(kpId, d, rng)
    if (roll < 0.82) return genParaJudge(kpId, d, rng)
    return genParaSame(kpId, d, rng)
  }
  // 练习十四 8、9（拓展提升）
  if (roll < 0.4) return genParaSquare(kpId, d, rng)
  if (roll < 0.8) return genParaMid(kpId, d, rng)
  return genParaSame(kpId, d, rng)
})

// ─────────────────────────────────────────────────────────────
// 公顷和平方千米（第 75–76 页、练习十四 3、4、6、练习十八 3）
// ─────────────────────────────────────────────────────────────

const KP_HA = 'm5s1-06-hectare'
type AU = 'm2' | 'ha' | 'km2'
/** 每个单位合多少平方米 */
const IN_M2: Record<AU, number> = { m2: 1, ha: 10000, km2: 1000000 }
const auL = (u: AU, n?: number): LStr => W(`m5.area.u${n === 1 ? '1' : ''}.${u}`)

/** 进率：1 公顷 = 几平方米？ 1 平方千米 = 几公顷 / 平方米？ */
function genHaRate(kpId: string, d: Difficulty, rng: RNG): Question {
  const [ua, ub] = rng.pick<[AU, AU]>([
    ['ha', 'm2'],
    ['km2', 'ha'],
    ['km2', 'm2'],
  ])
  const v = IN_M2[ua] / IN_M2[ub]
  return numQ({ kpId, d, rng, sig: `rate-${ua}-${ub}`, stem: [text('m5.area.h.rateQ', { ua: auL(ua, 1), ub: auL(ub) })], value: v, smart: [v / 10, v * 10, v / 100] })
}

/** 单位换算（做一做 3、练习十四 3）：整数的，大单位化小、小单位化大 */
const HA_N = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 20, 25, 30, 40, 50, 60, 72, 80, 90]
function convQ(kpId: string, d: Difficulty, rng: RNG, a: number, ua: AU, ub: AU): Question {
  const v = clean((a * IN_M2[ua]) / IN_M2[ub])
  const r = Math.max(IN_M2[ua], IN_M2[ub]) / Math.min(IN_M2[ua], IN_M2[ub])
  const stem = [text('m5.area.h.convQ', { a, ua: auL(ua, a), ub: auL(ub) })]
  const sig = `conv-${a}${ua}-${ub}`
  // 常见错：进率差了 10 倍 / 100 倍、该乘的除了
  const wrong = [v * 10, v / 10, v * 100, v / 100, IN_M2[ua] > IN_M2[ub] ? a / r : a * r]
  return isInt(v) ? numQ({ kpId, d, rng, sig, stem, value: v, smart: wrong }) : decQ({ kpId, d, rng, sig, stem, value: v, wrong })
}
function genHaConv(kpId: string, d: Difficulty, rng: RNG): Question {
  const n = rng.pick(HA_N)
  const roll = rng.next()
  if (roll < 0.25) return convQ(kpId, d, rng, n, 'ha', 'm2') // 7 公顷 = 70000 平方米
  if (roll < 0.45) return convQ(kpId, d, rng, n * 10000, 'm2', 'ha') // 80000 平方米 = 8 公顷
  if (roll < 0.65) return convQ(kpId, d, rng, Math.min(n, 50), 'km2', 'ha') // 5 平方千米 = 500 公顷
  if (roll < 0.8) return convQ(kpId, d, rng, Math.min(n, 50) * 100, 'ha', 'km2') // 1200 公顷 = 12 平方千米
  if (roll < 0.9) return convQ(kpId, d, rng, Math.min(n, 30), 'km2', 'm2')
  return convQ(kpId, d, rng, Math.min(n, 30) * 1000000, 'm2', 'km2') // 12000000 平方米 = 12 平方千米
}

/** 边长 100 米的正方形是 1 公顷、边长 1 千米的正方形是 1 平方千米；计量土地常用的单位 */
function genHaKnow(kpId: string, d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  const opts = (right: AU): [LStr, LStr[]] => [auL(right, 1), (['m2', 'ha', 'km2'] as AU[]).filter((u) => u !== right).map((u) => auL(u, 1))]
  if (roll < 0.3) {
    const [c, w] = opts('ha')
    return pickWord(kpId, d, rng, 'side-100m', [text('m5.area.h.side100Q')], c, w)
  }
  if (roll < 0.55) {
    const [c, w] = opts('km2')
    return pickWord(kpId, d, rng, 'side-1km', [text('m5.area.h.side1kmQ')], c, w)
  }
  if (roll < 0.78) return pickWord(kpId, d, rng, 'land', [text('m5.area.h.landQ')], auL('ha'), [W('m5.area.u.cm2'), W('m5.area.u.dm2')])
  return pickWord(kpId, d, rng, 'bigland', [text('m5.area.h.bigLandQ')], auL('km2'), [W('m5.area.u.cm2'), W('m5.area.u.dm2')])
}

/** 试一试 (1)：多少个边长 10 米（20、25、50 米）的正方形合起来是 1 公顷 */
function genHaSquares(kpId: string, d: Difficulty, rng: RNG): Question {
  const n = rng.pick([10, 10, 20, 25, 50])
  return numQ({ kpId, d, rng, sig: `squares-${n}`, stem: [text('m5.area.h.squaresQ', { n })], value: 10000 / (n * n), smart: [10000 / n, 100 / n, n * n] })
}

/** 试一试 (2)：例 1 的田地是多少公顷 */
const FIELD_HA: [number, number][] = [
  [300, 200], [250, 80], [500, 200], [400, 250], [200, 150], [400, 100], [500, 400], [250, 120], [125, 160], [800, 250],
]
function genHaField(kpId: string, d: Difficulty, rng: RNG): Question {
  const [a, h] = rng.pick(FIELD_HA)
  const v = (a * h) / 10000
  return numQ({ kpId, d, rng, sig: `fieldha-${a}-${h}`, stem: [text('m5.area.h.fieldHaQ', { a, h })], value: v, smart: [a * h, v * 10, (a * h) / 1000, (a * h) / 100] })
}

/** 做一做 2：多少个这样的游泳池的面积是 1 公顷 */
const POOLS: [number, number][] = [
  [50, 25], [50, 20], [40, 25], [25, 20], [100, 50], [50, 40], [25, 16], [80, 25], [125, 40], [100, 25],
]
function genHaPool(kpId: string, d: Difficulty, rng: RNG): Question {
  const [l, w] = rng.pick(POOLS)
  const v = 10000 / (l * w)
  return numQ({ kpId, d, rng, sig: `pool-${l}-${w}`, stem: [text('m5.area.h.poolQ', { l, w })], value: v, smart: [l * w, v * 10, v * 2] })
}

/** 练习十四 4：填合适的面积单位（实物的数都是真的） */
const UNIT_ITEMS: [string, number, AU][] = [
  ['cube', 6, 'ha'],
  ['nest', 20, 'ha'],
  ['palace', 72, 'ha'],
  ['summer', 300, 'ha'],
  ['track', 1, 'ha'],
  ['square', 44, 'ha'],
  ['hk', 1115, 'km2'],
  ['xihu', 6, 'km2'],
  ['beijing', 16410, 'km2'],
  ['taiwan', 36000, 'km2'],
  ['classroom', 63, 'm2'],
  ['court', 420, 'm2'],
  ['football', 7000, 'm2'],
  ['home', 90, 'm2'],
]
function genHaUnit(kpId: string, d: Difficulty, rng: RNG): Question {
  const [id, n, right] = rng.pick(UNIT_ITEMS)
  const all: AU[] = ['m2', 'ha', 'km2']
  return pickWord(kpId, d, rng, `unit-${id}`, [text('m5.area.h.unitQ', { thing: { k: `m5.area.h.it.${id}`, p: { n } } })], auL(right), all.filter((u) => u !== right).map((u) => auL(u)))
}

/** 比一比，填 >、< 或 =（第 2 档） */
function genHaCompare(kpId: string, d: Difficulty, rng: RNG): Question {
  const [ua, ub] = rng.pick<[AU, AU]>([
    ['ha', 'm2'],
    ['km2', 'ha'],
    ['km2', 'm2'],
  ])
  const a = rng.pick([2, 3, 4, 5, 6, 8, 10, 12, 20, 30, 50])
  const exact = (a * IN_M2[ua]) / IN_M2[ub]
  const rel = rng.pick(['>', '<', '='])
  // 不等的时候：差 10 倍（进率记错的那种）
  const b = rel === '=' ? exact : rel === '>' ? exact / 10 : exact * 10
  const want = a * IN_M2[ua] > b * IN_M2[ub] ? '>' : a * IN_M2[ua] < b * IN_M2[ub] ? '<' : '='
  return labelQuestion({
    kpId,
    type: T,
    difficulty: d,
    sig: `cmp-${a}${ua}-${b}${ub}`,
    stem: [text('m5.area.h.cmpQ'), text('m5.area.h.cmpExpr', { a, ua: auL(ua, a), b, ub: auL(ub, b) })],
    correct: want,
    distractors: ['>', '<', '='].filter((x) => x !== want),
    rng,
  })
}

/** 第 2 档：小数的公顷（练习十四 6：21000 平方米 = 2.1 公顷）、换两次 */
const DEC_HA = [2.1, 2.5, 1.5, 0.5, 3.2, 4.8, 0.8, 1.2, 6.5, 0.6]
function genHaDec(kpId: string, d: Difficulty, rng: RNG): Question {
  const x = rng.pick(DEC_HA)
  if (rng.chance(0.5)) return convQ(kpId, d, rng, x, 'ha', 'm2') // 2.5 公顷 = 25000 平方米
  return convQ(kpId, d, rng, Math.round(x * 10000), 'm2', 'ha') // 21000 平方米 = 2.1 公顷（选项）
}

/** 第 3 档：练习十四 6 麦田每公顷收多少吨（14.7 ÷ 2.1 = 7） */
const WHEAT: [number, number, number][] = [
  [250, 84, 14.7], [300, 150, 36], [400, 125, 40], [360, 125, 31.5], [250, 80, 16], [200, 150, 24],
]
function genHaWheat(kpId: string, d: Difficulty, rng: RNG): Question {
  const [a, h, t] = rng.pick(WHEAT)
  const ha = (a * h) / 10000
  const v = clean(t / ha)
  return numQ({ kpId, d, rng, sig: `wheat-${a}-${h}-${t}`, stem: [text('m5.area.h.wheatQ', { a, h, t })], value: v, smart: [Math.round(t * ha), Math.round(v * 10), v + 1] })
}

/** 第 3 档：练习十八 3 播种机（宽度 × 速度 × 时间，千米先换成米） */
const SEEDERS: [number, number, number][] = [
  [2, 5, 4], [2, 5, 6], [4, 5, 3], [3, 5, 2], [2, 6, 5], [4, 6, 5],
]
function genHaSeeder(kpId: string, d: Difficulty, rng: RNG): Question {
  const [w, v, t] = rng.pick(SEEDERS)
  const ans = (w * v * 1000 * t) / 10000
  return numQ({ kpId, d, rng, sig: `seed-${w}-${v}-${t}`, stem: [text('m5.area.h.seedQ', { w, v, t })], value: ans, smart: [w * v * t, ans * 10, w * v * t * 100] })
}

defineGenerator(KP_HA, (d, rng) => {
  const kpId = KP_HA
  const roll = rng.next()
  if (d === 1) {
    // 公顷、平方千米的意义与进率，试一试 (1)(2)，做一做 2、3，练习十四 3、4
    if (roll < 0.14) return genHaRate(kpId, d, rng)
    if (roll < 0.26) return genHaKnow(kpId, d, rng)
    if (roll < 0.36) return genHaSquares(kpId, d, rng)
    if (roll < 0.62) return genHaConv(kpId, d, rng)
    if (roll < 0.72) return genHaField(kpId, d, rng)
    if (roll < 0.84) return genHaPool(kpId, d, rng)
    return genHaUnit(kpId, d, rng)
  }
  if (d === 2) {
    if (roll < 0.3) return genHaCompare(kpId, d, rng)
    if (roll < 0.55) return genHaDec(kpId, d, rng)
    if (roll < 0.75) return genHaConv(kpId, d, rng)
    if (roll < 0.88) return genHaUnit(kpId, d, rng)
    return genHaField(kpId, d, rng)
  }
  if (roll < 0.5) return genHaWheat(kpId, d, rng)
  return genHaSeeder(kpId, d, rng)
})

// ─────────────────────────────────────────────────────────────
// 三角形的面积（第 79–82 页、练习十五、练习十八 1②④）
// ─────────────────────────────────────────────────────────────

const KP_TRI = 'm5s1-06-triangle'
const CMP_HALF = W('m5.area.w.cmpHalf')
const CMP_SAME = W('m5.area.w.cmpSame')
const CMP_DOUBLE = W('m5.area.w.cmpDouble')

/** 三角形的底和高（第 79 页）、想一想「一个三角形中有几组底和高」 */
function genTriDef(kpId: string, d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (roll < 0.4) return pickWord(kpId, d, rng, 'def-h', [text('m5.area.t.defHQ')], W('m5.area.w.height'), [W('m5.area.w.base'), W('m5.area.w.leg')])
  if (roll < 0.75) return pickWord(kpId, d, rng, 'def-b', [text('m5.area.t.defBQ')], W('m5.area.w.base'), [W('m5.area.w.height'), W('m5.area.w.leg')])
  return numQ({ kpId, d, rng, sig: 'pairs', stem: [text('m5.area.t.pairsQ')], value: 3, smart: [1, 2, 6], input: 'choice' })
}

/** 用两个完全一样的三角形拼平行四边形（第 79 页）、公式（第 80 页） */
function genTriTwo(kpId: string, d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (roll < 0.2) return pickWord(kpId, d, rng, 'two', [text('m5.area.t.twoQ')], W('m5.area.w.para'), [W('m5.area.w.trap'), W('m5.area.w.penta')])
  if (roll < 0.4) return pickWord(kpId, d, rng, 'two-b', [text('m5.area.t.twoBaseQ')], W('m5.area.w.base'), [W('m5.area.w.height'), W('m5.area.w.leg')])
  if (roll < 0.6) return pickWord(kpId, d, rng, 'two-half', [text('m5.area.t.twoHalfQ')], W('m5.area.w.half'), [W('m5.area.w.double'), W('m5.area.w.sameBig')])
  if (roll < 0.8) return pickWord(kpId, d, rng, 'formula', [text('m5.area.t.formulaQ')], W('m5.area.f.tri'), [W('m5.area.f.para'), W('m5.area.f.triWrong')])
  return labelQuestion({ kpId, type: T, difficulty: d, sig: 'letter', stem: [text('m5.area.t.letterQ')], correct: F_TRI, distractors: rng.shuffle([F_PARA, F_TRAP, 'S = a + h ÷ 2']).slice(0, rng.chance(0.5) ? 3 : 2), rng })
}

/**
 * 做一做 1：方格纸上的三角形，沿高的一半剪开，把上面的小三角形绕右边那条边的中点旋转 180°，拼成平行四边形
 * （平行四边形的底和三角形的底相等，高是三角形高的一半，面积相等）；也直接问三角形的面积
 */
function triMidFig(a: number, h: number, p: number): GeoFig {
  const x0 = 1
  const y0 = 1
  const B: P = [x0, y0 + h]
  const C: P = [x0 + a, y0 + h]
  const A: P = [x0 + p, y0]
  const L = mid(A, B)
  const R = mid(A, C)
  const L2: P = [2 * R[0] - L[0], 2 * R[1] - L[1]]
  const Wd = Math.max(C[0], L2[0], A[0]) + 1
  // 下面的梯形部分涂绿，上面的小三角形涂蓝；旋转过去的位置画红虚线
  const items: GeoItem[] = [
    { t: 'poly', pts: [B, C, R, L], fill: 'c', stroke: 'c' },
    { t: 'poly', pts: [L, R, A], fill: 'b', stroke: 'b' },
    { t: 'poly', pts: [R, L2, C], stroke: 'd', dash: true },
  ]
  return gridFig(Wd, h + 2, items, 26)
}
function genTriMid(kpId: string, d: Difficulty, rng: RNG): Question {
  const a = rng.pick([4, 6])
  const h = rng.pick([2, 4])
  const p = rng.pick([2, a / 2, a - 2].filter((x) => x % 2 === 0 && x > 0 && x < a))
  const fig = geoPart([triMidFig(a, h, p)], `（方格纸上的三角形，底 ${a} 格、高 ${h} 格，上面的小三角形旋转到右边，拼成平行四边形）`)
  const roll = rng.next()
  const lead = text('m5.area.t.midLead')
  if (roll < 0.25) return pickWord(kpId, d, rng, `midh-${a}-${h}-${p}`, [lead, fig, text('m5.area.t.midHQ')], CMP_HALF, [CMP_SAME, CMP_DOUBLE])
  if (roll < 0.45) return pickWord(kpId, d, rng, `midb-${a}-${h}-${p}`, [lead, fig, text('m5.area.t.midBQ')], CMP_SAME, [CMP_HALF, CMP_DOUBLE])
  if (roll < 0.65) return pickWord(kpId, d, rng, `mida-${a}-${h}-${p}`, [lead, fig, text('m5.area.t.midAQ')], CMP_SAME, [CMP_HALF, CMP_DOUBLE])
  return numQ({ kpId, d, rng, sig: `midg-${a}-${h}-${p}`, stem: [fig, text('m5.area.t.gridQ')], value: (a * h) / 2, smart: [a * h, a * (h / 2) + a, a + h] })
}

/** 整数的底和高（底 × 高是偶数） */
const TRI_INT: [number, number][] = [
  [3, 4], [8, 6], [10, 7], [12, 5], [9, 8], [14, 6], [16, 9], [20, 11], [25, 16], [36, 8], [24, 15], [18, 13], [30, 12], [22, 10],
]
/** 图上标底和高求面积：锐角三角形（高在里面）、直角三角形（两条直角边，练习十五 2①） */
function genTriCalc(kpId: string, d: Difficulty, rng: RNG): Question {
  const [a, h] = rng.chance(0.5) ? rng.pick(TRI_INT) : (() => {
    const aa = rng.int(4, 24)
    const hh = rng.int(3, 18)
    return (aa * hh) % 2 === 0 ? [aa, hh] : [aa + 1, hh]
  })()
  const u = rng.pick<LenU>(['cm', 'dm', 'm'])
  const kind = rng.pick(['in', 'in', 'right'])
  const x = kind === 'right' ? rng.pick([0, a]) : r1(a * rng.pick([0.3, 0.45, 0.6, 0.7]))
  return numQ({
    kpId,
    d,
    rng,
    sig: `calc-${a}-${h}-${u}-${x}`,
    stem: [text('m5.area.t.areaQ', { u: uA(u) }), geoPart([triFig({ a, h, x, u })], `（三角形：底 ${a} ${u}，高 ${h} ${u}）`)],
    value: (a * h) / 2,
    smart: [a * h, a + h, (a * h) / 4],
  })
}

/** 例 2：红领巾（120 × 39.8 ÷ 2）和一些三角形的东西（文字题，面积是整数） */
const TRI_WORDS: [string, number, number][] = [
  ['scarfQ', 120, 39.8],
  ['scarfQ', 100, 32],
  ['flagQ', 30, 20],
  ['flagQ', 24, 15],
  ['flagQ', 40, 25],
  ['plateQ', 60, 45],
  ['plateQ', 80, 36],
]
function genTriWord(kpId: string, d: Difficulty, rng: RNG): Question {
  const [k, a, h] = rng.pick(TRI_WORDS)
  const v = clean((a * h) / 2)
  return numQ({ kpId, d, rng, sig: `word-${k}-${a}-${h}`, stem: [text(`m5.area.t.${k}`, { a, h })], value: v, smart: [clean(a * h), a + h, v * 10] })
}

/** 做一做 2：平行四边形沿对角线分成两个三角形，涂色三角形是一半 */
function genTriHalf(kpId: string, d: Difficulty, rng: RNG): Question {
  const S = rng.pick([12, 18, 24, 30, 36, 40, 48, 50, 60, 64])
  const k = place({ A: [0, 2], B: [6, 2], C: [10, 0], D: [4, 0] }, 0, 210, 70)
  const items: GeoItem[] = [
    { t: 'poly', pts: [k.A, k.B, k.C], fill: 'b', stroke: 'b' },
    { t: 'poly', pts: [k.A, k.B, k.C, k.D], stroke: 'b' },
  ]
  return numQ({
    kpId,
    d,
    rng,
    sig: `half-${S}`,
    stem: [text('m5.area.t.halfQ', { s: S }), geoPart([fitFig(items)], '（平行四边形沿一条对角线分成两个三角形，下面那个涂了色）')],
    value: S / 2,
    smart: [S * 2, S / 4, S - 2],
  })
}

/** 小数（练习十五 1、2、3、练习十八 1）：钝角三角形的高画在外面、斜边当底、直角三角形 */
const TRI_DEC: [number, number, 'in' | 'out' | 'right' | 'turn', LenU][] = [
  [9, 7.8, 'in', 'dm'],
  [1.5, 2.4, 'out', 'dm'],
  [2.5, 2.8, 'turn', 'm'],
  [8, 3.5, 'in', 'cm'],
  [6.2, 4.8, 'in', 'cm'],
  [2.2, 3.1, 'right', 'm'],
  [36, 8, 'turn', 'cm'], // 练习十八 1②：最长的边当底，斜着放
  [4.5, 3, 'in', 'cm'],
  [5, 2.4, 'turn', 'm'],
  [7.2, 5, 'out', 'cm'],
]
function genTriDec(kpId: string, d: Difficulty, rng: RNG): Question {
  const [a, h, kind, u] = rng.pick(TRI_DEC)
  const x = kind === 'out' ? r1(-a * 0.6) : kind === 'right' ? 0 : r1(a * 0.4)
  const v = clean((a * h) / 2)
  return areaQ({
    kpId,
    d,
    rng,
    sig: `dec-${a}-${h}-${kind}`,
    stem: [text('m5.area.t.areaQ', { u: uA(u) }), geoPart([triFig({ a, h, x, u, deg: kind === 'turn' ? rng.pick([60, -55]) : 0 })], `（三角形：一条底 ${a} ${u}，这条底上的高 ${h} ${u}）`)],
    value: v,
    wrong: [v * 2, v * 10, v / 10, a + h],
  })
}

/** 钝角三角形的高在外面、底不在下面（整数） */
function genTriTurned(kpId: string, d: Difficulty, rng: RNG): Question {
  const a = rng.int(4, 16)
  const h = rng.int(3, 14)
  const aa = (a * h) % 2 ? a + 1 : a
  const out = rng.chance(0.55)
  const x = out ? r1(rng.chance(0.5) ? -aa * 0.5 : aa * 1.5) : r1(aa * 0.35)
  const deg = out ? 0 : rng.pick([90, -90, 60, 125])
  const u = rng.pick<LenU>(['cm', 'm'])
  return numQ({
    kpId,
    d,
    rng,
    sig: `turn-${aa}-${h}-${x}-${deg}-${u}`,
    stem: [text('m5.area.t.areaQ', { u: uA(u) }), geoPart([triFig({ a: aa, h, x, u, deg })], `（三角形：一条底 ${aa} ${u}，这条底上的高 ${h} ${u}${out ? '，高在三角形外面' : ''}）`)],
    value: (aa * h) / 2,
    smart: [aa * h, aa + h, (aa * h) / 4],
  })
}

/** 已知面积和底求高（练习十五 4：176 × 2 ÷ 22 = 16） */
const TRI_INV: [number, number, number][] = [
  [176, 22, 16], [24, 8, 6], [30, 10, 6], [36, 9, 8], [40, 10, 8], [45, 9, 10], [60, 12, 10], [42, 7, 12], [56, 14, 8], [27, 6, 9], [35, 7, 10], [48, 16, 6],
]
function genTriInverse(kpId: string, d: Difficulty, rng: RNG): Question {
  const [S, a, h] = rng.pick(TRI_INV)
  const u = rng.pick<LenU>(['cm', 'm'])
  const askH = rng.chance(0.65)
  return numQ({
    kpId,
    d,
    rng,
    sig: `inv-${askH ? 'h' : 'a'}-${S}-${a}-${u}`,
    stem: [askH ? text('m5.area.t.heightQ', { s: S, a, u: uL(u), u2: uA(u) }) : text('m5.area.t.baseQ', { s: S, h, u: uL(u), u2: uA(u) })],
    // 常见错：忘了乘 2
    value: askH ? h : a,
    smart: askH ? [h / 2, S / a, S * 2] : [a / 2, S / h, S * 2],
  })
}

/** 三幅一样的三角形，各画一条虚线：哪幅里的虚线是底上的高 */
function genTriPickH(kpId: string, d: Difficulty, rng: RNG): Question {
  const a = 6
  const h = rng.pick([3, 4])
  const x = rng.pick([2, 2.5, 3.5])
  const right = rng.int(0, 2)
  const figs: GeoFig[] = []
  for (let i = 0; i < 3; i++) {
    const k = place({ B: [0, h], C: [a, h], A: [x, 0] }, 0, 120, 70)
    const items: GeoItem[] = [{ t: 'poly', pts: [k.B, k.C, k.A], fill: 'a', stroke: 'a' }]
    if (i === right) items.push(...heightItems(k.A, [k.A[0], k.B[1]], [k.A[0] + 12, k.B[1]], null))
    else {
      // 从顶点斜着连到底边上离垂足 0.45 个高以外的一点，不画直角记号
      const H = k.B[1] - k.A[1]
      const want = i === (right + 1) % 3 ? 1 : -1
      const cands = [want, -want].map((sg) => k.A[0] + sg * H * 0.6).filter((v) => v >= k.B[0] + 4 && v <= k.C[0] - 4)
      const xb = cands[0] ?? (k.A[0] - k.B[0] > k.C[0] - k.A[0] ? k.B[0] + 4 : k.C[0] - 4)
      items.push({ t: 'line', a: k.A, b: [xb, k.B[1]], dash: true, stroke: 'd' })
    }
    figs.push(fitFig(items, 10))
  }
  return pickFig(kpId, d, rng, `pickh-${h}-${x}-${right}`, [text('m5.area.t.pickHQ'), geoPart(figs, '（三幅一样的三角形，编号 1 到 3，各从上面的顶点画了一条虚线到底边）', true)], 3, right)
}

function genTriJudge(kpId: string, d: Difficulty, rng: RNG): Question {
  const all: [string, boolean][] = [
    ['m5.area.t.jHalf', false],
    ['m5.area.t.jSameBH', true],
    ['m5.area.t.jThree', true],
    ['m5.area.t.jTwoEqual', false],
  ]
  const [k, yes] = rng.pick(all)
  return judge(kpId, d, rng, `j-${k.split('.').pop()}`, [text(k)], yes)
}

/**
 * 练习十五 5：平行四边形被对角线分成两个面积相等的三角形，已知三角形的面积和两条高，求平行四边形的周长。
 * x 下边、y 斜边、h1 下边上的高、h2 斜边上的高（x × h1 = y × h2 = 2 × 三角形的面积；两条高的垂足都落在边上）
 */
const PERI: [number, number, number, number][] = [
  [30, 24, 18, 22.5],
  [20, 15, 12, 16],
  [20, 16, 12, 15],
  [40, 30, 24, 32],
  [35, 28, 24, 30],
]
function genTriPerimeter(kpId: string, d: Difficulty, rng: RNG): Question {
  const [x, y, h1, h2] = rng.pick(PERI)
  const S = (x * h1) / 2
  const c = Math.sqrt(y * y - h1 * h1)
  const k = place({ TL: [0, 0], TR: [x, 0], BL: [c, h1], BR: [x + c, h1], F1: [x, h1] }, 0, 200, 110)
  // 斜边上的高：从右上顶点向左边那条斜边作垂线
  const u = norm(sub(k.BL, k.TL))
  const t = (k.TR[0] - k.TL[0]) * u[0] + (k.TR[1] - k.TL[1]) * u[1]
  const F2: P = add(k.TL, mul(u, t))
  const items: GeoItem[] = [
    { t: 'poly', pts: [k.TL, k.TR, k.BR, k.BL], stroke: 'b' },
    { t: 'line', a: k.TR, b: k.BL, stroke: 'b' },
    ...heightItems(k.TR, k.F1, [k.F1[0] + 12, k.F1[1]], lab(h1, 'm'), k.BR),
    ...heightItems(k.TR, F2, add(F2, mul(u, -12)), lab(h2, 'm'), k.TL),
  ]
  return numQ({
    kpId,
    d,
    rng,
    sig: `peri-${x}-${y}-${h1}`,
    stem: [text('m5.area.t.periQ', { s: S }), geoPart([fitFig(items)], `（平行四边形被一条对角线分成两个三角形，标着下边上的高 ${h1} m、左边斜边上的高 ${h2} m）`)],
    value: (x + y) * 2,
    smart: [x + y, x * 2, y * 2, (x + y) * 4],
  })
}

/** 练习十五 6：梯形 ABCD（AD // BC）的两条对角线交于 E，哪两个三角形面积相等 */
function trapEFig(): GeoFig {
  const k = place({ A: [3, 0], D: [7, 0], B: [0, 5], C: [9, 5] }, 0, 200, 110)
  // 对角线 AC、BD 的交点
  const t = 4 / (4 + 9) // AE : EC = AD : BC
  const E = add(k.A, mul(sub(k.C, k.A), t))
  const items: GeoItem[] = [
    { t: 'line', a: [k.A[0] - 40, k.A[1]], b: [k.D[0] + 40, k.D[1]], dash: true, stroke: 'soft', thin: true },
    { t: 'line', a: [k.B[0] - 20, k.B[1]], b: [k.C[0] + 20, k.C[1]], dash: true, stroke: 'soft', thin: true },
    { t: 'poly', pts: [k.A, k.D, k.C, k.B], stroke: 'b' },
    { t: 'line', a: k.A, b: k.C, stroke: 'b' },
    { t: 'line', a: k.B, b: k.D, stroke: 'b' },
    { t: 'text', at: add(k.A, [0, -14]), text: 'A', letter: true },
    { t: 'text', at: add(k.D, [0, -14]), text: 'D', letter: true },
    { t: 'text', at: add(k.B, [0, 15]), text: 'B', letter: true },
    { t: 'text', at: add(k.C, [0, 15]), text: 'C', letter: true },
    { t: 'text', at: add(E, [0, 16]), text: 'E', letter: true },
  ]
  return fitFig(items)
}
function genTriEqual(kpId: string, d: Difficulty, rng: RNG): Question {
  const fig = geoPart([trapEFig()], '（梯形 ABCD，上边 AD 和下边 BC 互相平行，对角线 AC、BD 交于点 E）')
  const tri = (n: string): LStr => ({ k: 'm5.area.t.triName', p: { n } })
  const roll = rng.next()
  if (roll < 0.4) return pickWord(kpId, d, rng, 'eq-abc', [text('m5.area.t.eqLead'), fig, text('m5.area.t.eqQ', { n: 'ABC' })], tri('DBC'), [tri('ABD'), tri('ABE')])
  if (roll < 0.7) return pickWord(kpId, d, rng, 'eq-abe', [text('m5.area.t.eqLead'), fig, text('m5.area.t.eqQ', { n: 'ABE' })], tri('DCE'), [tri('ADE'), tri('BCE')])
  return numQ({ kpId, d, rng, sig: 'eq-pairs', stem: [text('m5.area.t.eqLead'), fig, text('m5.area.t.pairsEqQ')], value: 3, smart: [2, 4, 1], input: 'choice' })
}

/** 练习十五 7：平行四边形的面积是 S，A 是下边的中点，涂色三角形（左上顶点、左下顶点、A）是 S ÷ 4 */
function genTriQuarter(kpId: string, d: Difficulty, rng: RNG): Question {
  const S = rng.pick([48, 40, 60, 80, 100, 36, 64, 72, 120])
  const k = place({ TL: [0, 0], TR: [6, 0], BR: [8.5, 4], BL: [2.5, 4] }, 0, 200, 100)
  const A = mid(k.BL, k.BR)
  const items: GeoItem[] = [
    { t: 'poly', pts: [k.TL, k.BL, A], fill: 'a', stroke: 'a' },
    { t: 'poly', pts: [k.TL, k.TR, k.BR, k.BL], stroke: 'b' },
    { t: 'line', a: k.TL, b: k.BR, dash: true, stroke: 'd' },
    { t: 'dot', at: A, label: 'A', side: 's' },
  ]
  return numQ({
    kpId,
    d,
    rng,
    sig: `quarter-${S}`,
    stem: [text('m5.area.t.quarterQ', { s: S }), geoPart([fitFig(items)], '（平行四边形，A 是下边的中点；左上顶点、左下顶点和 A 围成的三角形涂了色，还画了一条虚线对角线）')],
    value: S / 4,
    smart: [S / 2, S / 8, S * 2],
  })
}

defineGenerator(KP_TRI, (d, rng) => {
  const kpId = KP_TRI
  const roll = rng.next()
  if (d === 1) {
    // 第 79 页底和高、拼成平行四边形；第 80 页 S = ah ÷ 2、想一想、例 2、做一做 1、2（做一做 3 改成图上标好数）
    if (roll < 0.12) return genTriDef(kpId, d, rng)
    if (roll < 0.3) return genTriTwo(kpId, d, rng)
    if (roll < 0.45) return genTriMid(kpId, d, rng)
    if (roll < 0.68) return genTriCalc(kpId, d, rng)
    if (roll < 0.84) return genTriWord(kpId, d, rng)
    return genTriHalf(kpId, d, rng)
  }
  if (d === 2) {
    // 练习十五 1–4、练习十八 1
    if (roll < 0.25) return genTriDec(kpId, d, rng)
    if (roll < 0.45) return genTriTurned(kpId, d, rng)
    if (roll < 0.63) return genTriInverse(kpId, d, rng)
    if (roll < 0.78) return genTriPickH(kpId, d, rng)
    return genTriJudge(kpId, d, rng)
  }
  // 练习十五 5、6、7
  if (roll < 0.35) return genTriPerimeter(kpId, d, rng)
  if (roll < 0.65) return genTriEqual(kpId, d, rng)
  return genTriQuarter(kpId, d, rng)
})

// ─────────────────────────────────────────────────────────────
// 梯形的面积（第 83–86 页、练习十六、练习十八 1⑥）
// ─────────────────────────────────────────────────────────────

const KP_TRAP = 'm5s1-06-trapezoid'

/** 第 83 页：说一说梯形各部分的名称（图上把一部分标成 ?） */
function genTrapPart(kpId: string, d: Difficulty, rng: RNG): Question {
  const which = rng.pick(['top', 'bottom', 'leg', 'height'] as const)
  const t = 4
  const b = 8
  const h = 4
  const x = rng.pick([1.5, 2, 2.5])
  const right = which === 'leg' && rng.chance(0.3)
  const fig = trapFig({
    t,
    b,
    h,
    x: right ? 0 : x,
    u: 'cm',
    tLabel: which === 'top' ? '?' : null,
    bLabel: which === 'bottom' ? '?' : null,
    hLabel: which === 'height' ? '?' : null,
  })
  if (which === 'leg') {
    // 腰：右边那条斜边标 ?
    const poly = fig.items[0] as Extract<GeoItem, { t: 'poly' }>
    poly.labels = [null, '?', null, null]
    if (!right) fig.items = fig.items.filter((it) => !(it.t === 'line' && it.dash) && it.t !== 'arc')
  }
  if (which !== 'height' && which !== 'leg') fig.items = fig.items.filter((it) => !(it.t === 'line' && it.dash) && it.t !== 'arc')
  const others = (['top', 'bottom', 'leg', 'height'] as const).filter((k) => k !== which).map((k) => W(`m5.area.w.${k}`))
  return pickWord(kpId, d, rng, `part-${which}-${x}${right ? 'r' : ''}`, [text('m5.area.z.partQ'), geoPart([fig], '（一个梯形，有一部分标着问号）')], W(`m5.area.w.${which}`), others)
}

/** 两个完全一样的梯形拼成平行四边形（第 83 页）、公式 */
function genTrapTwo(kpId: string, d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (roll < 0.25) return pickWord(kpId, d, rng, 'two-b', [text('m5.area.z.twoBaseQ')], W('m5.area.w.topBottom'), [W('m5.area.w.top'), W('m5.area.w.bottom'), W('m5.area.w.leg')])
  if (roll < 0.42) return pickWord(kpId, d, rng, 'two-h', [text('m5.area.z.twoHQ')], W('m5.area.w.height'), [W('m5.area.w.leg'), W('m5.area.w.top')])
  if (roll < 0.6) return pickWord(kpId, d, rng, 'two-half', [text('m5.area.z.twoHalfQ')], W('m5.area.w.half'), [W('m5.area.w.double'), W('m5.area.w.sameBig')])
  if (roll < 0.8) return pickWord(kpId, d, rng, 'formula', [text('m5.area.z.formulaQ')], W('m5.area.f.trap'), [W('m5.area.f.trapNoHalf'), W('m5.area.f.trapNoBracket')])
  return labelQuestion({ kpId, type: T, difficulty: d, sig: 'letter', stem: [text('m5.area.z.letterQ')], correct: F_TRAP, distractors: rng.shuffle([F_TRI, 'S = (a + b)h', 'S = a + bh ÷ 2']).slice(0, rng.chance(0.5) ? 3 : 2), rng })
}

/** 做一做 1：方格纸上的梯形沿高的一半剪开，上面的部分绕右腰的中点旋转 180°，拼成平行四边形 */
function trapMidFig(t: number, b: number, h: number, x: number): GeoFig {
  const x0 = 1
  const y0 = 1
  const A: P = [x0, y0 + h]
  const B: P = [x0 + b, y0 + h]
  const C: P = [x0 + x + t, y0]
  const D: P = [x0 + x, y0]
  const L = mid(A, D)
  const R = mid(B, C)
  const map = (p: P): P => [2 * R[0] - p[0], 2 * R[1] - p[1]]
  const Wd = Math.max(B[0], map(L)[0], map(D)[0]) + 1
  const items: GeoItem[] = [
    { t: 'poly', pts: [A, B, R, L], fill: 'a', stroke: 'a' },
    { t: 'poly', pts: [L, R, C, D], fill: 'd', stroke: 'd' },
    { t: 'poly', pts: [R, map(L), map(D), map(C)], stroke: 'd', dash: true },
  ]
  return gridFig(Wd, h + 2, items, 22)
}
function genTrapMid(kpId: string, d: Difficulty, rng: RNG): Question {
  // 两条底差 4 格：剪开的地方、拼过去的顶点都落在格点上
  const [t, b] = rng.pick<[number, number]>([
    [2, 6],
    [1, 5],
    [3, 7],
    [2, 6],
  ])
  const h = rng.pick([2, 4])
  const x = (b - t) / 2
  const fig = geoPart([trapMidFig(t, b, h, x)], `（方格纸上的梯形，上底 ${t} 格、下底 ${b} 格、高 ${h} 格，上半部分旋转到右边，拼成平行四边形）`)
  const lead = text('m5.area.z.midLead')
  const roll = rng.next()
  if (roll < 0.3) return pickWord(kpId, d, rng, `midb-${t}-${b}-${h}`, [lead, fig, text('m5.area.z.midBQ')], W('m5.area.w.topBottom'), [W('m5.area.w.top'), W('m5.area.w.bottom'), W('m5.area.w.leg')])
  if (roll < 0.55) return pickWord(kpId, d, rng, `midh-${t}-${b}-${h}`, [lead, fig, text('m5.area.z.midHQ')], CMP_HALF, [CMP_SAME, CMP_DOUBLE])
  return numQ({ kpId, d, rng, sig: `midg-${t}-${b}-${h}`, stem: [fig, text('m5.area.z.gridQ')], value: ((t + b) * h) / 2, smart: [(t + b) * h, t + (b * h) / 2, t * h] })
}

/** 整数的上底、下底、高（(上底 + 下底) × 高 是偶数）：练习十六 2③、3、练习十八 1⑥ */
const TRAP_INT: [number, number, number][] = [
  [12, 15, 20], [14, 36, 21], [40, 71, 40], [45, 65, 40], [4, 8, 5], [6, 10, 4], [5, 9, 6], [8, 12, 7], [10, 16, 8], [3, 7, 4], [15, 25, 12], [20, 30, 15], [9, 13, 10], [7, 11, 6],
]
function genTrapCalc(kpId: string, d: Difficulty, rng: RNG): Question {
  const [t, b, h] = rng.chance(0.5) ? rng.pick(TRAP_INT) : (() => {
    const tt = rng.int(3, 14)
    const bb = tt + rng.int(2, 12)
    const hh = rng.int(3, 14)
    return ((tt + bb) * hh) % 2 === 0 ? [tt, bb, hh] : [tt, bb, hh + 1]
  })()
  const u = rng.pick<LenU>(['cm', 'dm', 'm'])
  const kind = rng.pick(['iso', 'gen', 'right'] as const)
  const x = kind === 'right' ? 0 : kind === 'iso' ? r1((b - t) / 2) : r1((b - t) * 0.25)
  return numQ({
    kpId,
    d,
    rng,
    sig: `calc-${t}-${b}-${h}-${u}-${kind}`,
    stem: [text('m5.area.z.areaQ', { u: uA(u) }), geoPart([trapFig({ t, b, h, x, u })], `（梯形：上底 ${t} ${u}，下底 ${b} ${u}，高 ${h} ${u}）`)],
    value: ((t + b) * h) / 2,
    smart: [(t + b) * h, t + (b * h) / 2, b * h, ((t + b) * h) / 4],
  })
}

/** 例 3：三峡大坝横截面的一部分是直角梯形（图上标数） */
const DAMS: [number, number, number][] = [
  [36, 120, 135], [8, 30, 25], [10, 40, 32], [15, 45, 40], [12, 36, 30],
]
function genTrapDam(kpId: string, d: Difficulty, rng: RNG): Question {
  const [t, b, h] = rng.pick(DAMS)
  // 课本的图：左边是竖直的腰（就是高），上底在上、下底在下
  const fig = trapFig({ t, b, h, x: 0, u: 'm' })
  return numQ({
    kpId,
    d,
    rng,
    sig: `dam-${t}-${b}-${h}`,
    stem: [text(t === 36 ? 'm5.area.z.damQ' : 'm5.area.z.damOtherQ'), geoPart([fig], `（直角梯形：上底 ${t} m，下底 ${b} m，高 ${h} m）`)],
    value: ((t + b) * h) / 2,
    smart: [(t + b) * h, t + (b * h) / 2, b * h],
  })
}

/** 文字题（练习十六 8 的果园、一些梯形的东西） */
const TRAP_WORDS: [string, number, number, number][] = [
  ['orchardQ', 160, 180, 50],
  ['orchardQ', 120, 200, 60],
  ['bedQ', 6, 10, 4],
  ['bedQ', 5, 9, 4],
  ['bedQ', 8, 12, 5],
  ['slopeQ', 30, 50, 20],
]
function genTrapWord(kpId: string, d: Difficulty, rng: RNG): Question {
  const [k, t, b, h] = rng.pick(TRAP_WORDS)
  const v = ((t + b) * h) / 2
  return numQ({ kpId, d, rng, sig: `word-${k}-${t}-${b}-${h}`, stem: [text(`m5.area.z.${k}`, { t, b, h })], value: v, smart: [(t + b) * h, t + (b * h) / 2] })
}

/** 小数（练习十六 1 水渠、2①②）：倒放、竖着放的梯形 */
const TRAP_DEC: [number, number, number, 'flip' | 'turn' | 'plain', LenU][] = [
  [4, 3, 5, 'flip', 'm'],
  [8.2, 5.9, 4.8, 'turn', 'cm'],
  [2.5, 4.5, 3, 'plain', 'cm'],
  [3.2, 4.8, 2.5, 'plain', 'dm'],
  [6, 9, 3.4, 'turn', 'cm'],
  [1.6, 3.4, 2.2, 'plain', 'm'],
]
function genTrapDec(kpId: string, d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.3)) {
    // 练习十六 1：水渠的横截面（渠口宽 2.8 米、渠底宽 1.4 米、渠深 1.2 米）
    const [a, b, h] = rng.pick<[number, number, number]>([
      [2.8, 1.4, 1.2],
      [3, 1.6, 1.5],
      [2.4, 1.2, 0.8],
    ])
    const v = clean(((a + b) * h) / 2)
    return decQ({ kpId, d, rng, sig: `ditch-${a}-${b}-${h}`, stem: [text('m5.area.z.ditchQ', { a, b, h })], value: v, wrong: [v * 2, a + b * h / 2, v * 10] })
  }
  const [t, b, h, kind, u] = rng.pick(TRAP_DEC)
  const v = clean(((t + b) * h) / 2)
  const lo = Math.min(t, b)
  const hi = Math.max(t, b)
  return areaQ({
    kpId,
    d,
    rng,
    sig: `dec-${t}-${b}-${h}-${kind}`,
    stem: [
      text('m5.area.z.areaQ', { u: uA(u) }),
      geoPart([trapFig({ t: lo, b: hi, h, x: r1((hi - lo) * 0.4), u, flip: kind === 'flip', deg: kind === 'turn' ? 90 : 0 })], `（梯形：两条底分别是 ${t} ${u} 和 ${b} ${u}，高 ${h} ${u}）`),
    ],
    value: v,
    wrong: [v * 2, clean(t + (b * h) / 2), v * 10, v / 10],
  })
}

/** 竖着放、倒过来的梯形（整数） */
function genTrapTurned(kpId: string, d: Difficulty, rng: RNG): Question {
  const t = rng.int(3, 10)
  const b = t + rng.int(2, 8)
  const h0 = rng.int(3, 10)
  const h = ((t + b) * h0) % 2 ? h0 + 1 : h0
  const kind = rng.pick(['flip', 'turn', 'turn2'] as const)
  const u = rng.pick<LenU>(['cm', 'm'])
  return numQ({
    kpId,
    d,
    rng,
    sig: `turn-${t}-${b}-${h}-${kind}-${u}`,
    stem: [text('m5.area.z.areaQ', { u: uA(u) }), geoPart([trapFig({ t, b, h, x: r1((b - t) * 0.4), u, flip: kind === 'flip', deg: kind === 'turn' ? 90 : kind === 'turn2' ? -90 : 0 })], `（梯形：两条底分别是 ${t} ${u} 和 ${b} ${u}，高 ${h} ${u}）`)],
    value: ((t + b) * h) / 2,
    smart: [(t + b) * h, t + (b * h) / 2, b * h],
  })
}

/** 练习十六 3：汽车侧面的两块梯形玻璃，共用一条高 */
const WINDOWS: [number, number, number, number, number][] = [
  [40, 71, 45, 65, 40],
  [30, 52, 36, 44, 30],
  [35, 60, 40, 56, 36],
]
function genTrapWindow(kpId: string, d: Difficulty, rng: RNG): Question {
  const [t1, b1, t2, b2, h] = rng.pick(WINDOWS)
  const left = rng.chance(0.5)
  const k = place({ BL: [0, h], BM: [b1, h], BR: [b1 + b2, h], TL: [b1 - t1, 0], TM: [b1, 0], TR: [b1 + t2, 0] }, 0, 220, 90)
  const items: GeoItem[] = [
    { t: 'poly', pts: [k.BL, k.BM, k.TM, k.TL], fill: left ? 'b' : undefined, stroke: 'b', labels: [lab(b1, 'cm'), null, lab(t1, 'cm'), null] },
    { t: 'poly', pts: [k.BM, k.BR, k.TR, k.TM], fill: left ? undefined : 'b', stroke: 'b', labels: [lab(b2, 'cm'), null, lab(t2, 'cm'), null] },
    { t: 'arc', at: k.BM, a: k.BR, b: k.TM, right: true },
    besideLabel(k.TM, k.BM, lab(h, 'cm'), k.BR),
  ]
  const v = left ? ((t1 + b1) * h) / 2 : ((t2 + b2) * h) / 2
  return numQ({
    kpId,
    d,
    rng,
    sig: `window-${t1}-${b1}-${t2}-${b2}-${h}-${left ? 'l' : 'r'}`,
    stem: [text(left ? 'm5.area.z.windowLQ' : 'm5.area.z.windowRQ'), geoPart([fitFig(items)], `（两块梯形玻璃，中间一条竖线是它们共同的高 ${h} cm）`)],
    value: v,
    smart: [left ? (t1 + b1) * h : (t2 + b2) * h, ((t1 + b1 + t2 + b2) * h) / 2],
  })
}

/** 练习十六 8：梯形果园面积 ÷ 每棵果树占地 */
const TREES: [number, number, number, number][] = [
  [160, 180, 50, 10],
  [120, 200, 50, 8],
  [100, 140, 60, 12],
  [80, 120, 40, 5],
]
function genTrapTrees(kpId: string, d: Difficulty, rng: RNG): Question {
  const [t, b, h, e] = rng.pick(TREES)
  const S = ((t + b) * h) / 2
  return numQ({ kpId, d, rng, sig: `trees-${t}-${b}-${h}-${e}`, stem: [text('m5.area.z.treesQ', { t, b, h, e })], value: S / e, smart: [S, ((t + b) * h) / e, S / e / 2] })
}

/** 已知面积、上底和高求下底（练习十六 6：15 × 2 ÷ 3 − 4.5 = 5.5）、已知面积和两底的和求高 */
const TRAP_INV: [number, number, number][] = [
  // [面积, 上底, 高]，下底 = 面积 × 2 ÷ 高 − 上底
  [15, 4.5, 3], [30, 4, 5], [36, 5, 6], [42, 5, 6], [40, 3, 8], [27, 4, 6], [50, 8, 5], [60, 7, 8], [45, 6, 6], [24, 2, 4],
]
function genTrapInverse(kpId: string, d: Difficulty, rng: RNG): Question {
  const [S, t, h] = rng.pick(TRAP_INV)
  const u = rng.pick<LenU>(['cm', 'm'])
  if (rng.chance(0.7)) {
    const b = clean((S * 2) / h - t)
    return areaQ({ kpId, d, rng, sig: `inv-b-${S}-${t}-${h}-${u}`, stem: [text('m5.area.z.bottomQ', { s: S, t, h, u: uL(u), u2: uA(u) })], value: b, wrong: [clean(S / h - t), clean((S * 2) / h), clean(S * 2 - t)] })
  }
  const sum = clean((S * 2) / h)
  return areaQ({ kpId, d, rng, sig: `inv-h-${S}-${sum}-${u}`, stem: [text('m5.area.z.heightQ', { s: S, ab: sum, u: uL(u), u2: uA(u) })], value: h, wrong: [clean(S / sum), clean(S * 2 * sum)] })
}

/** 练习十六 9：圆木堆（顶层 + 底层）× 层数 ÷ 2 */
function logsFig(top: number, bottom: number): GeoFig {
  const R = 11
  const items: GeoItem[] = []
  const rows = bottom - top + 1
  for (let i = 0; i < rows; i++) {
    const n = top + i
    const y = i * R * 1.75
    const x0 = (bottom - n) * R
    for (let j = 0; j < n; j++) {
      const c: P = [x0 + R + j * 2 * R, y + R]
      items.push({ t: 'dot', at: c, r: R, fill: 'a', stroke: 'a' }, { t: 'dot', at: c, r: R * 0.45, stroke: 'a', thin: true })
    }
  }
  return fitFig(items, 6)
}
function genTrapLogs(kpId: string, d: Difficulty, rng: RNG): Question {
  const top = rng.int(1, 4)
  const bottom = top + rng.int(2, Math.min(5, 8 - top))
  const layers = bottom - top + 1
  return numQ({
    kpId,
    d,
    rng,
    sig: `logs-${top}-${bottom}`,
    stem: [text('m5.area.z.logsQ', { t: top, b: bottom }), geoPart([logsFig(top, bottom)], `（圆木堆成梯形，从上往下每层多一根，顶层 ${top} 根，底层 ${bottom} 根）`)],
    value: ((top + bottom) * layers) / 2,
    smart: [(top + bottom) * layers, top + bottom, bottom * layers],
  })
}

function genTrapJudge(kpId: string, d: Difficulty, rng: RNG): Question {
  const all: [string, boolean][] = [
    ['m5.area.z.jPara', true],
    ['m5.area.z.jTri', true],
    ['m5.area.z.jTwo', false],
    ['m5.area.z.jForget', false],
  ]
  const [k, yes] = rng.pick(all)
  return judge(kpId, d, rng, `j-${k.split('.').pop()}`, [text(k)], yes)
}

/**
 * 练习十六 4「寻找合适的条件」：①直角梯形的高画在外面；③梯形套在虚线长方形里，上底 = 长方形的下边 − 两头空出的部分。
 * （② 要从平行四边形里推下底，图上看不准，不出。）尺寸线照课本画（GeoFigure 的 dim）。
 */
const FIND1: [number, number, number][] = [
  [18, 12, 8], [15, 9, 6], [20, 14, 10], [16, 10, 6],
]
const FIND3: [number, number, number, number][] = [
  // [下底, 高, 左边空出, 右边空出]
  [7.2, 4.8, 1.6, 2.2], [12, 6, 2, 3], [10, 4, 2, 2], [14, 8, 3, 4], [9, 6, 2, 1], [16, 10, 3, 5],
]
function genTrapFind(kpId: string, d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.4)) {
    const [t, b, h] = rng.pick(FIND1)
    // 上边长、下边短的直角梯形（左边竖直），高从右上角往下画在外面，下边用虚线延长过去
    const k = place({ TL: [0, 0], TR: [t, 0], BR: [b, h], BL: [0, h], F: [t, h] }, 0, 190, 90)
    const items: GeoItem[] = [
      { t: 'poly', pts: [k.TL, k.TR, k.BR, k.BL], fill: 'a', stroke: 'b', right: [0, 3] },
      { t: 'line', a: k.BR, b: k.F, dash: true, stroke: 'd' },
      { t: 'line', a: k.TR, b: k.F, dash: true, stroke: 'd' },
      { t: 'arc', at: k.F, a: k.BR, b: k.TR, right: true },
      { t: 'line', a: k.TL, b: k.TR, dim: String(t), off: 18 },
      { t: 'line', a: k.BL, b: k.BR, dim: String(b), off: -18 },
      { t: 'line', a: k.TR, b: k.F, dim: String(h), off: 20 },
    ]
    return numQ({
      kpId,
      d,
      rng,
      sig: `find1-${t}-${b}-${h}`,
      stem: [text('m5.area.z.findQ'), geoPart([fitFig(items, 34)], `（直角梯形：上边 ${t}，下边 ${b}，右边外面画着高 ${h}，单位厘米）`)],
      value: ((t + b) * h) / 2,
      smart: [(t + b) * h, t * h, b * h],
    })
  }
  const [b, h, p, q] = rng.pick(FIND3)
  const t = clean(b - p - q)
  const k = place({ BL: [0, h], BR: [b, h], TR0: [b, 0], TL0: [0, 0], C: [b - q, 0], D: [p, 0] }, 0, 190, 100)
  const items: GeoItem[] = [
    { t: 'poly', pts: [k.TL0, k.TR0, k.BR, k.BL], stroke: 'd', dash: true, right: [0, 1] },
    { t: 'poly', pts: [k.BL, k.BR, k.C, k.D], fill: 'a', stroke: 'b' },
    { t: 'line', a: k.TL0, b: k.D, dim: fmt(p), off: 18 },
    { t: 'line', a: k.C, b: k.TR0, dim: fmt(q), off: 18 },
    { t: 'line', a: k.BL, b: k.BR, dim: fmt(b), off: -18 },
    { t: 'line', a: k.TR0, b: k.BR, dim: fmt(h), off: 20 },
  ]
  const v = clean(((t + b) * h) / 2)
  return areaQ({
    kpId,
    d,
    rng,
    sig: `find3-${b}-${h}-${p}-${q}`,
    stem: [text('m5.area.z.findQ'), geoPart([fitFig(items, 34)], `（梯形套在虚线长方形里：长方形下边 ${b}、高 ${h}，梯形上边两头分别空出 ${p} 和 ${q}，单位厘米）`)],
    value: v,
    wrong: [clean((b + b) * h / 2), clean((t + b) * h), clean(((p + q + b) * h) / 2)],
  })
}

/** 练习十六 5：靠墙围成的直角梯形花坛，篱笆 = 两条底 + 高，高是靠地面那条边 */
const FENCES: [number, number][] = [
  [46, 20], [40, 16], [50, 20], [36, 12], [60, 24],
]
function genTrapFence(kpId: string, d: Difficulty, rng: RNG): Question {
  const [f, h] = rng.pick(FENCES)
  const sum = f - h
  const l1 = sum * 0.42
  const l2 = sum - l1
  // 左右两条边是两条底（竖着），下边是高；上边是斜的墙
  const k = place({ BL: [0, l2], BR: [h, l2], TR: [h, 0], TL: [0, l2 - l1] }, 0, 170, 110)
  // 墙：沿梯形上边那条斜线往两头伸出去的一条宽带
  const dir = norm(sub(k.TR, k.TL))
  const n: P = [dir[1], -dir[0]]
  const w1 = add(k.TL, mul(dir, -30))
  const w2 = add(k.TR, mul(dir, 30))
  const items: GeoItem[] = [
    { t: 'poly', pts: [w1, w2, add(w2, mul(n, 12)), add(w1, mul(n, 12))], fill: 'a', stroke: 'soft' },
    { t: 'poly', pts: [k.BL, k.BR, k.TR, k.TL], fill: 'b', stroke: 'b', labels: [lab(h, 'm'), null, null, null], right: [0, 1] },
  ]
  return numQ({
    kpId,
    d,
    rng,
    sig: `fence-${f}-${h}`,
    stem: [text('m5.area.z.fenceQ', { f }), geoPart([fitFig(items)], `（靠墙的直角梯形花坛，墙那边不围篱笆，靠地面的那条边 ${h} m）`)],
    value: (sum * h) / 2,
    smart: [sum * h, (f * h) / 2, f * h],
  })
}

/** 练习十六 7：梯形草坪中有一条和左腰平行的小路（平行四边形），草地 = 梯形 − 小路 */
const PATHS: [number, number, number, number][] = [
  [12, 15, 8, 1], [10, 14, 6, 1], [16, 20, 10, 2], [12, 18, 8, 2],
]
function genTrapPath(kpId: string, d: Difficulty, rng: RNG): Question {
  const [t, b, h, w] = rng.pick(PATHS)
  const x = (b - t) / 2
  const k = place({ BL: [0, h], BR: [b, h], TR: [x + t, 0], TL: [x, 0] }, 0, 200, 110)
  // 小路：从上底离左端 t/5 处起、和左腰平行，横着量宽 w
  const sc = (k.BR[0] - k.BL[0]) / b
  const p1: P = [k.TL[0] + (t / 5) * sc, k.TL[1]]
  const p2: P = [p1[0] + w * sc, p1[1]]
  const leg = sub(k.BL, k.TL)
  const p3 = add(p2, leg)
  const p4 = add(p1, leg)
  const items: GeoItem[] = [
    { t: 'poly', pts: [k.BL, k.BR, k.TR, k.TL], fill: 'c', stroke: 'c' },
    { t: 'poly', pts: [p1, p2, p3, p4], fill: 'paper', stroke: 'c' },
    { t: 'line', a: k.TL, b: k.TR, dim: `${t} m`, off: 18 },
    { t: 'line', a: k.BL, b: k.BR, dim: `${b} m`, off: -18 },
    { t: 'line', a: [k.BR[0], k.TR[1]], b: k.BR, dim: `${h} m`, off: 20 },
  ]
  return numQ({
    kpId,
    d,
    rng,
    sig: `path-${t}-${b}-${h}-${w}`,
    stem: [text('m5.area.z.pathQ', { w }), geoPart([fitFig(items, 40)], `（梯形草坪：上底 ${t} m，下底 ${b} m，高 ${h} m，中间一条宽 ${w} m、和左边平行的小路）`)],
    value: ((t + b) * h) / 2 - w * h,
    smart: [((t + b) * h) / 2, ((t + b) * h) / 2 - w, (t + b) * h - w * h],
  })
}

defineGenerator(KP_TRAP, (d, rng) => {
  const kpId = KP_TRAP
  const roll = rng.next()
  if (d === 1) {
    // 第 83 页各部分名称、拼成平行四边形、S = (a + b)h ÷ 2；例 3；做一做 1（做一做 2 量一量不出）
    if (roll < 0.12) return genTrapPart(kpId, d, rng)
    if (roll < 0.3) return genTrapTwo(kpId, d, rng)
    if (roll < 0.44) return genTrapMid(kpId, d, rng)
    if (roll < 0.66) return genTrapCalc(kpId, d, rng)
    if (roll < 0.8) return genTrapDam(kpId, d, rng)
    return genTrapWord(kpId, d, rng)
  }
  if (d === 2) {
    // 练习十六 1、2、3、6、8、9
    if (roll < 0.2) return genTrapDec(kpId, d, rng)
    if (roll < 0.35) return genTrapTurned(kpId, d, rng)
    if (roll < 0.48) return genTrapWindow(kpId, d, rng)
    if (roll < 0.6) return genTrapTrees(kpId, d, rng)
    if (roll < 0.74) return genTrapInverse(kpId, d, rng)
    if (roll < 0.87) return genTrapLogs(kpId, d, rng)
    return genTrapJudge(kpId, d, rng)
  }
  // 练习十六 4、5、7
  if (roll < 0.4) return genTrapFind(kpId, d, rng)
  if (roll < 0.7) return genTrapFence(kpId, d, rng)
  return genTrapPath(kpId, d, rng)
})

// ─────────────────────────────────────────────────────────────
// 组合图形的面积（第 87 页例 4、练习十七、练习十八 4、5、7）
// ─────────────────────────────────────────────────────────────

const KP_COMP = 'm5s1-06-composite'
type Pair = 'sqTri' | 'rectTri' | 'twoTrap' | 'paraTri' | 'trapRect' | 'twoTri'
const pairL = (p: Pair): LStr => W(`m5.area.c.p.${p}`)

/** 房子侧面墙：下面长方形（宽 w、高 H），上面三角形屋顶（高 r）；cut = 'h' 横着分、'v' 从屋顶竖着分成两个梯形 */
function houseFig(w: number, H: number, r: number, o: { u?: LenU; nums?: boolean; cut?: 'h' | 'v' }): GeoFig {
  const k = place({ BL: [0, r + H], BR: [w, r + H], R: [w, r], T: [w / 2, 0], L: [0, r], M: [w / 2, r], Mb: [w / 2, r + H] }, 0, 150, 96)
  const u = o.u ?? 'm'
  const items: GeoItem[] = [{ t: 'poly', pts: [k.BL, k.BR, k.R, k.T, k.L], fill: 'b', stroke: 'b', labels: o.nums ? [lab(w, u), lab(H, u), null, null, null] : undefined }]
  if (o.cut === 'v') items.push({ t: 'line', a: k.T, b: k.Mb, dash: true, stroke: 'd' })
  else {
    items.push({ t: 'line', a: k.L, b: k.R, dash: true, stroke: 'd' })
    if (o.nums) items.push(...roofHeight(k.T, k.M, lab(r, u)))
  }
  return fitFig(items)
}
/** 屋顶的高：屋顶尖到屋顶底边的红虚线 + 直角记号，字写在屋顶尖的右上方（不压斜边） */
function roofHeight(T: P, M: P, label: string): GeoItem[] {
  return [...heightItems(T, M, [M[0] + 12, M[1]], null), { t: 'text', at: [T[0] + 10 + label.length * 4.9, T[1] - 4], text: label }]
}

/** 房子、指示牌、菜地、台阶形：虚线把它分成了哪两个图形（第 87 页「这些组合图形里有哪些学过的图形」、例 4 的两种分法） */
function genCompCut(kpId: string, d: Difficulty, rng: RNG): Question {
  const kind = rng.pick(['houseSq', 'houseRect', 'houseV', 'sign', 'veg', 'stepH', 'stepV'] as const)
  let fig: GeoFig
  let right: Pair
  if (kind === 'houseSq' || kind === 'houseRect' || kind === 'houseV') {
    const w = 5
    const H = kind === 'houseRect' ? 3 : 5
    fig = houseFig(w, H, 2, { cut: kind === 'houseV' ? 'v' : 'h' })
    right = kind === 'houseV' ? 'twoTrap' : kind === 'houseSq' ? 'sqTri' : 'rectTri'
  } else if (kind === 'sign') {
    fig = signFig(20, 10, 20, 10, false)
    right = 'rectTri'
  } else if (kind === 'veg') {
    fig = vegFig(50, 33, 35, 12, false)
    right = 'paraTri'
  } else {
    fig = stepFig(12, 5, 6, 10, false, kind === 'stepH' ? 'h' : 'v')
    right = kind === 'stepH' ? 'rectTri' : 'trapRect'
  }
  // 正方形也是长方形：答案是「正方形和三角形」时不拿「长方形和三角形」当干扰项
  const pool: Pair[] = (['sqTri', 'rectTri', 'twoTrap', 'paraTri', 'trapRect', 'twoTri'] as Pair[]).filter((p) => p !== right && !(right === 'sqTri' && p === 'rectTri'))
  return pickWord(kpId, d, rng, `cut-${kind}`, [text('m5.area.c.cutQ'), geoPart([fig], '（一个组合图形，里面画了一条虚线）')], pairL(right), rng.shuffle(pool).slice(0, 3).map(pairL))
}

/** 例 4：房子侧面墙 = 正方形（长方形）+ 三角形 */
function genCompHouse(kpId: string, d: Difficulty, rng: RNG): Question {
  const w = rng.int(4, 12)
  const H = rng.chance(0.4) ? w : rng.int(3, 10)
  const r0 = rng.int(1, 5)
  // 三角形屋顶的面积要是整数：墙宽 × 屋顶高是偶数
  const r = (w * r0) % 2 ? r0 + 1 : r0
  return numQ({
    kpId,
    d,
    rng,
    sig: `house-${w}-${H}-${r}`,
    stem: [text('m5.area.c.houseQ'), geoPart([houseFig(w, H, r, { nums: true })], `（房子侧面墙：下面长方形宽 ${w} m、高 ${H} m，上面三角形屋顶高 ${r} m）`)],
    value: w * H + (w * r) / 2,
    smart: [w * H + w * r, w * H, w * (H + r), (w * (H + r)) / 2],
  })
}

/** 例 4 女孩的分法：沿虚线分成两个完全一样的梯形，一个梯形的面积（第 2 档） */
function genCompHouseTrap(kpId: string, d: Difficulty, rng: RNG): Question {
  const [w, H, r] = rng.pick<[number, number, number]>([
    [5, 5, 2],
    [6, 4, 2],
    [8, 5, 2],
    [4, 3, 2],
    [6, 5, 2],
    [8, 6, 4],
  ])
  const v = ((2 * H + r) * (w / 2)) / 2
  const fig = houseFig(w, H, r, { cut: 'v' })
  // 竖着分开以后，梯形的两条底是竖着的：左边 H、中间 H + r，高是 w 的一半；图上标墙宽、墙高、屋顶高
  const poly = fig.items[0] as Extract<GeoItem, { t: 'poly' }>
  poly.labels = [lab(w, 'm'), lab(H, 'm'), null, null, null]
  const T0 = poly.pts[3]!
  const L0 = poly.pts[4]!
  const R0 = poly.pts[2]!
  const M: P = [T0[0], L0[1]]
  fig.items.push({ t: 'line', a: L0, b: R0, dash: true, stroke: 'soft', thin: true }, ...roofHeight(T0, M, lab(r, 'm')))
  return areaQ({
    kpId,
    d,
    rng,
    sig: `htrap-${w}-${H}-${r}`,
    stem: [text('m5.area.c.houseTrapQ'), geoPart([fig], `（房子侧面墙：宽 ${w} m，墙高 ${H} m，屋顶高 ${r} m，从屋顶尖竖着画了一条虚线）`)],
    value: v,
    wrong: [v * 2, (H + H + r) * w, ((H + r) * w) / 2],
  })
}

/** 少先队中队旗：长方形去掉一个三角形口（练习十七 2） */
const FLAGS: [number, number, number][] = [
  [80, 30, 20], [60, 20, 15], [90, 30, 20], [100, 30, 30], [40, 15, 10], [72, 24, 18],
]
function genCompFlag(kpId: string, d: Difficulty, rng: RNG): Question {
  const [L, s, n] = rng.pick(FLAGS)
  const k = place({ TL: [0, 0], TR: [L, 0], N: [L - n, s], BR: [L, 2 * s], BL: [0, 2 * s], RM: [L, s] }, 0, 170, 78)
  const items: GeoItem[] = [
    { t: 'poly', pts: [k.TL, k.TR, k.N, k.BR, k.BL], fill: 'd', stroke: 'd' },
    { t: 'text', at: [k.TL[0] + (k.TR[0] - k.TL[0]) * 0.28, k.RM[1]], text: '⭐', big: true },
    { t: 'line', a: k.N, b: k.RM, dash: true, stroke: 'ink', thin: true },
    { t: 'arc', at: k.RM, a: k.N, b: k.TR, right: true },
    besideLabel(k.N, k.RM, String(n), k.BR),
    { t: 'line', a: k.BL, b: k.BR, dim: String(L), off: -18 },
    { t: 'line', a: k.TR, b: k.RM, dim: String(s), off: 20 },
    { t: 'line', a: k.RM, b: k.BR, dim: String(s), off: 20 },
  ]
  const v = L * 2 * s - (2 * s * n) / 2
  return numQ({
    kpId,
    d,
    rng,
    sig: `flag-${L}-${s}-${n}`,
    stem: [text('m5.area.c.flagQ'), geoPart([fitFig(items, [40, 26])], `（中队旗：长方形长 ${L}、宽 ${s} 加 ${s}，右边剪去一个三角形口，口深 ${n}，单位厘米）`)],
    value: v,
    smart: [L * 2 * s, L * 2 * s - 2 * s * n, L * 2 * s + s * n],
  })
}

/** 梯形的地中间有一个长方形水池，草地 = 梯形 − 长方形（练习十七 3） */
const POOL_LAND: [number, number, number, number, number][] = [
  [40, 70, 30, 30, 15], [20, 40, 20, 10, 8], [30, 50, 20, 20, 10], [24, 36, 20, 12, 10], [50, 80, 40, 30, 20],
]
function genCompPool(kpId: string, d: Difficulty, rng: RNG): Question {
  const [t, b, h, p, q] = rng.pick(POOL_LAND)
  const x = (b - t) / 2
  const k = place({ BL: [0, h], BR: [b, h], TR: [x + t, 0], TL: [x, 0], P1: [(b - p) / 2, h * 0.25], P2: [(b + p) / 2, h * 0.25], P3: [(b + p) / 2, h * 0.25 + q], P4: [(b - p) / 2, h * 0.25 + q] }, 0, 190, 74)
  const items: GeoItem[] = [
    { t: 'poly', pts: [k.BL, k.BR, k.TR, k.TL], fill: 'c', stroke: 'c' },
    { t: 'poly', pts: [k.P1, k.P2, k.P3, k.P4], fill: 'b', stroke: 'b', labels: [`${p} m`, `${q} m`, null, null] },
    { t: 'line', a: k.TL, b: k.TR, dim: `${t} m`, off: 18 },
    { t: 'line', a: k.BL, b: k.BR, dim: `${b} m`, off: -18 },
    { t: 'line', a: k.BL, b: [k.BL[0], k.TL[1]], dim: `${h} m`, off: 22 },
  ]
  const v = ((t + b) * h) / 2 - p * q
  return numQ({
    kpId,
    d,
    rng,
    sig: `pool-${t}-${b}-${h}-${p}-${q}`,
    stem: [text('m5.area.c.poolQ'), geoPart([fitFig(items, [46, 28])], `（梯形的地：上底 ${t} m，下底 ${b} m，高 ${h} m；中间长方形水池 ${p} m × ${q} m）`)],
    value: v,
    smart: [((t + b) * h) / 2, (t + b) * h - p * q, ((t + b) * h) / 2 + p * q],
  })
}

/** 箭头形指示牌 = 长方形 + 三角形（练习十七 7）；nums = false 只画形状（分法题用） */
function signFig(a: number, c: number, e: number, f: number, nums = true): GeoFig {
  const k = place({ RT: [0, (e - c) / 2], RB: [0, (e + c) / 2], A1: [a, (e - c) / 2], A2: [a, (e + c) / 2], T1: [a, 0], T2: [a, e], TIP: [a + f, e / 2] }, 0, 190, 64)
  const pole = [
    [k.RT[0] + (k.A1[0] - k.RT[0]) * 0.3, k.RB[1]],
    [k.RT[0] + (k.A1[0] - k.RT[0]) * 0.38, k.RB[1]],
    [k.RT[0] + (k.A1[0] - k.RT[0]) * 0.38, k.RB[1] + (k.T2[1] - k.T1[1]) * 0.45],
    [k.RT[0] + (k.A1[0] - k.RT[0]) * 0.3, k.RB[1] + (k.T2[1] - k.T1[1]) * 0.45],
  ] as P[]
  const items: GeoItem[] = [
    ...(nums ? [{ t: 'poly', pts: pole, fill: 'a', stroke: 'soft' } as GeoItem] : []),
    { t: 'poly', pts: [k.RT, k.A1, k.T1, k.TIP, k.T2, k.A2, k.RB], fill: 'b', stroke: 'b' },
    { t: 'line', a: k.A1, b: k.A2, dash: true, stroke: 'd' },
  ]
  if (nums)
    items.push(
      { t: 'line', a: k.RT, b: k.A1, dim: `${a} cm`, off: 16 },
      { t: 'line', a: k.RB, b: k.RT, dim: `${c} cm`, off: 18 },
      { t: 'line', a: [k.TIP[0], k.T1[1]], b: [k.TIP[0], k.T2[1]], dim: `${e} cm`, off: 18 },
      { t: 'line', a: [k.T2[0], k.T2[1] + 8], b: [k.TIP[0], k.T2[1] + 8], dim: `${f} cm`, off: -12 },
    )
  return fitFig(items, nums ? [44, 26] : 20)
}
const SIGNS: [number, number, number, number][] = [
  [20, 10, 20, 10], [30, 10, 20, 12], [24, 10, 18, 9], [40, 12, 24, 15], [16, 8, 16, 8],
]
function genCompSign(kpId: string, d: Difficulty, rng: RNG): Question {
  const [a, c, e, f] = rng.pick(SIGNS)
  return numQ({
    kpId,
    d,
    rng,
    sig: `sign-${a}-${c}-${e}-${f}`,
    stem: [text('m5.area.c.signQ'), geoPart([signFig(a, c, e, f)], `（箭头形指示牌：长方形长 ${a} cm、宽 ${c} cm，右边三角形的底 ${e} cm、高 ${f} cm，下面的木杆不算）`)],
    value: a * c + (e * f) / 2,
    smart: [a * c + e * f, a * c, (a + f) * e],
  })
}

/** 菜地 = 平行四边形 + 三角形（练习十七 1）：平行四边形的右边斜边就是三角形的底 */
function vegFig(x: number, h1: number, s: number, h2: number, nums = true): GeoFig {
  const c = Math.sqrt(s * s - h1 * h1)
  // 平行四边形向右斜：上边比下边往右错开 c；三角形的顶点在右边斜边外侧，离它 h2
  const BL: P = [0, h1]
  const BR: P = [x, h1]
  const TR: P = [x + c, 0]
  const TL: P = [c, 0]
  const u = norm(sub(TR, BR))
  const n: P = [u[1], -u[0]]
  const midS = add(BR, mul(sub(TR, BR), 0.45))
  const Apex = add(midS, mul(n, n[0] > 0 ? h2 : -h2))
  const k = place({ BL, BR, TR, TL, A: Apex, F: midS, H0: [c, h1], G: add(midS, mul(u, 3)) }, 0, 200, 100)
  const items: GeoItem[] = [
    { t: 'poly', pts: [k.BL, k.BR, k.A, k.TR, k.TL], fill: 'c', stroke: 'c', labels: nums ? [lab(x, 'm'), null, null, null, null] : undefined },
    { t: 'line', a: k.BR, b: k.TR, dash: true, stroke: 'd' },
  ]
  if (nums) {
    items.push(...heightItems(k.TL, k.H0, [k.H0[0] + 12, k.H0[1]], lab(h1, 'm'), k.BR))
    const out = norm(sub(k.A, k.F))
    const l2 = lab(h2, 'm')
    items.push(...heightItems(k.A, k.F, k.G, null), { t: 'text', at: add(k.A, [out[0] * (12 + l2.length * 4.9), out[1] * 14]), text: l2 })
    items.push(besideLabel(k.BR, k.TR, lab(s, 'm'), k.BL))
  }
  return fitFig(items, 28)
}
const VEGS: [number, number, number, number][] = [
  [50, 33, 35, 12], [40, 24, 26, 10], [60, 30, 34, 16], [36, 20, 25, 12],
]
function genCompVeg(kpId: string, d: Difficulty, rng: RNG): Question {
  const [x, h1, s, h2] = rng.pick(VEGS)
  return numQ({
    kpId,
    d,
    rng,
    sig: `veg-${x}-${h1}-${s}-${h2}`,
    stem: [text('m5.area.c.vegQ'), geoPart([vegFig(x, h1, s, h2)], `（菜地：左边平行四边形底 ${x} m、高 ${h1} m，右边三角形的底是平行四边形的斜边 ${s} m，高 ${h2} m）`)],
    value: x * h1 + (s * h2) / 2,
    smart: [x * h1 + s * h2, x * h1, x * h1 + (x * h2) / 2],
  })
}

/** 练习十八 4：左下直角的组合图形 = 下面的长方形 + 左上的三角形（或左边的梯形 + 右边的长方形） */
function stepFig(B: number, Q: number, c: number, P0: number, nums = true, cut?: 'h' | 'v'): GeoFig {
  const k = place({ BL: [0, P0], BR: [B, P0], RQ: [B, P0 - Q], CQ: [B - c, P0 - Q], TL: [0, 0], LQ: [0, P0 - Q], CB: [B - c, P0] }, 0, 190, 110)
  const items: GeoItem[] = [{ t: 'poly', pts: [k.BL, k.BR, k.RQ, k.CQ, k.TL], fill: 'a', stroke: 'b', right: [0] }]
  if (cut === 'h') items.push({ t: 'line', a: k.LQ, b: k.CQ, dash: true, stroke: 'd' })
  if (cut === 'v') items.push({ t: 'line', a: k.CQ, b: k.CB, dash: true, stroke: 'd' })
  if (nums)
    items.push(
      { t: 'line', a: k.BL, b: k.TL, dim: `${P0} cm`, off: 20 },
      { t: 'line', a: k.BL, b: k.BR, dim: `${B} cm`, off: -18 },
      { t: 'line', a: k.RQ, b: k.BR, dim: `${Q} cm`, off: 20 },
      { t: 'line', a: k.CQ, b: k.RQ, dim: `${c} cm`, off: 16 },
    )
  return fitFig(items, nums ? 40 : 20)
}
const STEPS: [number, number, number, number][] = [
  [12, 5, 6, 10], [10, 4, 4, 8], [14, 6, 8, 10], [16, 5, 6, 9],
]
function genCompStep(kpId: string, d: Difficulty, rng: RNG): Question {
  const [B, Q, c, P0] = rng.pick(STEPS)
  return numQ({
    kpId,
    d,
    rng,
    sig: `step-${B}-${Q}-${c}-${P0}`,
    stem: [text('m5.area.c.areaQ', { u: uA('cm') }), geoPart([stepFig(B, Q, c, P0)], `（组合图形：左边 ${P0} cm，下边 ${B} cm，右边 ${Q} cm，右上横边 ${c} cm，左上是一条斜线）`)],
    value: B * Q + ((B - c) * (P0 - Q)) / 2,
    smart: [B * P0, B * Q + (B - c) * (P0 - Q), B * Q + (c * (P0 - Q)) / 2],
  })
}

/** 练习十八 7：火箭模型 = 三角形 + 长方形 + 梯形（横着画） */
const ROCKETS: [number, number, number, number, number][] = [
  // [身宽 w, 头长 t, 身长 L, 尾宽 W, 尾长 f]
  [8, 10, 70, 16, 8], [6, 8, 50, 12, 6], [10, 12, 60, 18, 8],
]
function genCompRocket(kpId: string, d: Difficulty, rng: RNG): Question {
  const [w, t, L, Wt, f] = rng.pick(ROCKETS)
  // 火箭又细又长：横着画，宽度方向放大 2.2 倍（不按比例，标的数不变）
  const Y = 2.2
  const k = place({ A: [0, (-Wt / 2) * Y], B: [f, (-w / 2) * Y], C: [f + L, (-w / 2) * Y], N: [f + L + t, 0], D: [f + L, (w / 2) * Y], E: [f, (w / 2) * Y], F: [0, (Wt / 2) * Y] }, 0, 220, 80)
  const yb = k.F[1]
  const items: GeoItem[] = [
    { t: 'poly', pts: [k.A, k.B, k.C, k.N, k.D, k.E, k.F], fill: 'a', stroke: 'b' },
    { t: 'line', a: k.B, b: k.E, dash: true, stroke: 'd' },
    { t: 'line', a: k.C, b: k.D, dash: true, stroke: 'd' },
    besideLabel(k.C, k.D, `${w} cm`, k.B),
    { t: 'line', a: [k.F[0], yb], b: [k.E[0], yb], dim: `${f} cm`, off: -16 },
    { t: 'line', a: [k.E[0], yb], b: [k.D[0], yb], dim: `${L} cm`, off: -16 },
    { t: 'line', a: [k.D[0], yb], b: [k.N[0], yb], dim: `${t} cm`, off: -16 },
    { t: 'line', a: k.F, b: k.A, dim: `${Wt} cm`, off: 18 },
  ]
  return numQ({
    kpId,
    d,
    rng,
    sig: `rocket-${w}-${t}-${L}-${Wt}-${f}`,
    stem: [text('m5.area.c.rocketQ'), geoPart([fitFig(items, 40)], `（火箭模型：头是三角形，底 ${w} cm、高 ${t} cm；身子是长方形，${L} cm × ${w} cm；尾巴是梯形，两条底 ${w} cm 和 ${Wt} cm，高 ${f} cm）`)],
    value: (w * t) / 2 + w * L + ((w + Wt) * f) / 2,
    smart: [w * t + w * L + (w + Wt) * f, w * L, (w * t) / 2 + w * L],
  })
}

/** 练习十八 5：墙面面积 × 每平方米用砖的块数 */
const WALLS: [number, number, number, number][] = [
  [5, 4, 1.2, 69], [6, 3, 2, 50], [8, 3, 2, 40], [4, 3, 1.5, 80], [6, 4, 1, 25],
]
function genCompWall(kpId: string, d: Difficulty, rng: RNG): Question {
  const [w, H, r, n] = rng.pick(WALLS)
  const S = clean(w * H + (w * r) / 2)
  return numQ({
    kpId,
    d,
    rng,
    sig: `wall-${w}-${H}-${r}-${n}`,
    stem: [text('m5.area.c.tileQ', { n }), geoPart([houseFig(w, H, r, { nums: true })], `（墙面：下面长方形宽 ${w} m、高 ${H} m，上面三角形高 ${r} m）`)],
    value: clean(S * n),
    smart: [clean((w * H + w * r) * n), w * H * n, clean(S * n * 2)],
  })
}

/** 练习十七 6：梯形不干胶纸剪出大写字母 A（梯形 − 中间的三角形 − 下面的梯形缺口）；左图是纸，右图是 A */
const LETTER_A: number[][] = [
  [2, 10, 12, 3, 4, 4, 6, 4],
  [4, 20, 24, 6, 8, 8, 12, 8],
]
function genCompLetterA(kpId: string, d: Difficulty, rng: RNG): Question {
  const [t, b, h, tb, th, ct, cb, ch] = rng.pick(LETTER_A) as [number, number, number, number, number, number, number, number]
  const x = (b - t) / 2
  const paper = place({ BL: [0, h], BR: [b, h], TR: [x + t, 0], TL: [x, 0], R0: [b, 0] }, 0, 110, 130)
  const fig1 = fitFig(
    [
      { t: 'poly', pts: [paper.BL, paper.BR, paper.TR, paper.TL], fill: 'b', stroke: 'b' },
      { t: 'line', a: paper.TL, b: paper.TR, dim: String(t), off: 14 },
      { t: 'line', a: paper.BL, b: paper.BR, dim: String(b), off: -16 },
      { t: 'line', a: paper.R0, b: paper.BR, dim: String(h), off: 16 },
    ],
    30,
  )
  // A：中间三角形的洞（底在 h × 0.42 处），下面梯形缺口（下底在纸的下边上）
  const cx = b / 2
  const yHoleBase = h * 0.45
  const yCutTop = h - ch
  const A = place(
    {
      BL: [0, h], BR: [b, h], TR: [x + t, 0], TL: [x, 0],
      H1: [cx - tb / 2, yHoleBase], H2: [cx + tb / 2, yHoleBase], H3: [cx, yHoleBase - th],
      C1: [cx - cb / 2, h], C2: [cx + cb / 2, h], C3: [cx + ct / 2, yCutTop], C4: [cx - ct / 2, yCutTop],
      HF: [cx, yHoleBase], CF: [cx + ct / 2, h],
    },
    0,
    110,
    130,
  )
  const fig2 = fitFig(
    [
      { t: 'poly', pts: [A.BL, A.C1, A.C4, A.C3, A.C2, A.BR, A.TR, A.TL], fill: 'b', stroke: 'b' },
      { t: 'poly', pts: [A.H1, A.H2, A.H3], fill: 'paper', stroke: 'b', labels: [String(tb), null, null] },
      { t: 'line', a: A.C1, b: A.C2, dash: true, stroke: 'd' },
      ...heightItems(A.H3, A.HF, [A.HF[0] + 8, A.HF[1]], String(th), A.H2),
      ...heightItems(A.C3, A.CF, [A.CF[0] - 8, A.CF[1]], String(ch), A.BR),
      { t: 'text', at: [mid(A.C4, A.C3)[0], A.C4[1] + 13], text: String(ct) },
      { t: 'line', a: A.C1, b: A.C2, dim: String(cb), off: -14 },
    ],
    30,
  )
  const v = ((t + b) * h) / 2 - (tb * th) / 2 - ((ct + cb) * ch) / 2
  return numQ({
    kpId,
    d,
    rng,
    sig: `letterA-${t}-${b}-${h}`,
    stem: [text('m5.area.c.letterQ'), geoPart([fig1, fig2], `（左图：梯形纸，上底 ${t} cm、下底 ${b} cm、高 ${h} cm；右图：剪成的字母 A，中间去掉底 ${tb} cm、高 ${th} cm 的三角形，下面去掉上底 ${ct} cm、下底 ${cb} cm、高 ${ch} cm 的梯形）`)],
    value: v,
    smart: [((t + b) * h) / 2, v + (tb * th) / 2, v + ((ct + cb) * ch) / 2],
  })
}

/** 练习十七 8：长方形空地里四个小菱形（红花、黄花）和四个角（绿草） */
const GARDENS: [number, number][] = [
  [12, 18], [10, 16], [8, 12], [12, 16], [16, 20],
]
function genCompGarden(kpId: string, d: Difficulty, rng: RNG): Question {
  const [a, b] = rng.pick(GARDENS)
  const part = rng.pick(['red', 'yellow', 'green'] as const)
  // 横过来画：长的那条边（b）横着，小菱形大一点放得下 emoji
  const k = place(
    { O0: [0, 0], O1: [a, 0], O2: [a, b], O3: [0, b], T: [a / 2, 0], Bm: [a / 2, b], Lm: [0, b / 2], Rm: [a, b / 2], C: [a / 2, b / 2], Q1: [a / 4, b / 4], Q2: [(3 * a) / 4, b / 4], Q3: [(3 * a) / 4, (3 * b) / 4], Q4: [a / 4, (3 * b) / 4] },
    90,
    210,
    130,
  )
  const items: GeoItem[] = [
    { t: 'poly', pts: [k.O0, k.O1, k.O2, k.O3], fill: 'c', stroke: 'c' },
    { t: 'poly', pts: [k.T, k.Q1, k.C, k.Q2], fill: 'a', stroke: 'a' },
    { t: 'poly', pts: [k.Bm, k.Q4, k.C, k.Q3], fill: 'a', stroke: 'a' },
    { t: 'poly', pts: [k.Lm, k.Q1, k.C, k.Q4], fill: 'd', stroke: 'd' },
    { t: 'poly', pts: [k.Rm, k.Q2, k.C, k.Q3], fill: 'd', stroke: 'd' },
    { t: 'text', at: mid(k.T, k.C), text: '🌼' },
    { t: 'text', at: mid(k.Bm, k.C), text: '🌼' },
    { t: 'text', at: mid(k.Lm, k.C), text: '🌹' },
    { t: 'text', at: mid(k.Rm, k.C), text: '🌹' },
    { t: 'text', at: centroid([k.O0, k.T, k.Lm]), text: '🌱' },
    { t: 'text', at: centroid([k.O2, k.Bm, k.Rm]), text: '🌱' },
    ...dimsOf(k, a, b),
  ]
  const v = part === 'green' ? (a * b) / 2 : (a * b) / 4
  return numQ({
    kpId,
    d,
    rng,
    sig: `garden-${a}-${b}-${part}`,
    stem: [text('m5.area.c.gardenQ', { part: W(`m5.area.c.${part}`) }), geoPart([fitFig(items, 36)], `（长方形空地 ${a} m × ${b} m，四条边的中点连成的大菱形里有四个小菱形：上下两个黄花、左右两个红花，四个角是绿草）`)],
    value: v,
    smart: [(a * b) / 8, (a * b) / 2 === v ? (a * b) / 4 : (a * b) / 2, a * b],
  })
}

/** 花坛转过 90° 以后：哪条边横着、哪条竖着，各标上它的长度（尺寸线画在下边和右边） */
function dimsOf(k: Record<'O0' | 'O1' | 'O2' | 'O3', P>, a: number, b: number): GeoItem[] {
  const corners = [k.O0, k.O1, k.O2, k.O3]
  const maxY = Math.max(...corners.map((p) => p[1]))
  const maxX = Math.max(...corners.map((p) => p[0]))
  const minX = Math.min(...corners.map((p) => p[0]))
  const minY = Math.min(...corners.map((p) => p[1]))
  // 原来的 a 边（O0—O1）转过 90° 以后是竖着的
  const vertical = Math.abs(k.O0[0] - k.O1[0]) < 1
  const [hLen, vLen] = vertical ? [b, a] : [a, b]
  return [
    { t: 'line', a: [minX, maxY], b: [maxX, maxY], dim: `${hLen} m`, off: -18 },
    { t: 'line', a: [maxX, minY], b: [maxX, maxY], dim: `${vLen} m`, off: 20 },
  ]
}

/** 思考题：七巧板拼成的正方形，涂色这一块的面积（边长 4 的标准七巧板按比例放大） */
const TANGRAM: { pts: P[]; part: number }[] = [
  { pts: [[0, 0], [4, 0], [2, 2]], part: 4 }, // 大三角形
  { pts: [[0, 0], [2, 2], [0, 4]], part: 4 }, // 大三角形
  { pts: [[4, 2], [4, 4], [2, 4]], part: 8 }, // 中三角形
  { pts: [[4, 0], [4, 2], [3, 3], [3, 1]], part: 8 }, // 平行四边形
  { pts: [[2, 2], [3, 1], [3, 3]], part: 16 }, // 小三角形
  { pts: [[2, 2], [3, 3], [2, 4], [1, 3]], part: 8 }, // 正方形
  { pts: [[0, 4], [1, 3], [2, 4]], part: 16 }, // 小三角形
]
function genCompTangram(kpId: string, d: Difficulty, rng: RNG): Question {
  const s = rng.pick([12, 8, 16, 20])
  const i = rng.int(0, TANGRAM.length - 1)
  const sc = 32
  const items: GeoItem[] = TANGRAM.map((p, j): GeoItem => ({ t: 'poly', pts: p.pts.map((q) => mul(q, sc)), fill: j === i ? 'a' : 'soft', stroke: 'b' }))
  items.push({ t: 'line', a: [0, 4 * sc], b: [4 * sc, 4 * sc], dim: `${s} cm`, off: -18 })
  const v = (s * s) / TANGRAM[i]!.part
  return numQ({
    kpId,
    d,
    rng,
    sig: `tangram-${s}-${i}`,
    stem: [text('m5.area.c.tangramQ', { s }), geoPart([fitFig(items, 34)], `（一副七巧板拼成的正方形，边长 ${s} cm，其中一块涂了色）`)],
    value: v,
    smart: [v * 2, v / 2, s * s, s * 4],
  })
}

defineGenerator(KP_COMP, (d, rng) => {
  const kpId = KP_COMP
  const roll = rng.next()
  if (d === 1) {
    // 第 87 页认识组合图形、例 4 房子墙；练习十七 2、3、7（做一做「在生活中找组合图形」不出）
    if (roll < 0.25) return genCompCut(kpId, d, rng)
    if (roll < 0.55) return genCompHouse(kpId, d, rng)
    if (roll < 0.7) return genCompFlag(kpId, d, rng)
    if (roll < 0.85) return genCompSign(kpId, d, rng)
    return genCompPool(kpId, d, rng)
  }
  if (d === 2) {
    // 练习十七 1、练习十八 4、5、7，例 4 的另一种分法
    if (roll < 0.2) return genCompVeg(kpId, d, rng)
    if (roll < 0.38) return genCompStep(kpId, d, rng)
    if (roll < 0.54) return genCompRocket(kpId, d, rng)
    if (roll < 0.7) return genCompWall(kpId, d, rng)
    if (roll < 0.85) return genCompHouseTrap(kpId, d, rng)
    return genCompPool(kpId, d, rng)
  }
  // 练习十七 6、8、思考题
  if (roll < 0.35) return genCompLetterA(kpId, d, rng)
  if (roll < 0.7) return genCompGarden(kpId, d, rng)
  return genCompTangram(kpId, d, rng)
})

// ─────────────────────────────────────────────────────────────
// 不规则图形的面积（第 88 页例 5、练习十七 4、5、练习十八 6）
// ─────────────────────────────────────────────────────────────

const KP_IRR = 'm5s1-06-irregular'

/** 和 GeoFigure 画 curve 一样的平滑曲线（Catmull-Rom → 三次贝塞尔），每段取 n 个点，好算面积、判断格子 */
export function sampleCurve(ps: P[], closed: boolean, n = 16): P[] {
  const at = (i: number): P => (closed ? ps[(i + ps.length) % ps.length]! : ps[Math.max(0, Math.min(ps.length - 1, i))]!)
  const segs = closed ? ps.length : ps.length - 1
  const out: P[] = []
  for (let i = 0; i < segs; i++) {
    const p0 = at(i - 1)
    const p1 = at(i)
    const p2 = at(i + 1)
    const p3 = at(i + 2)
    const c1: P = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2: P = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    for (let j = 0; j < n; j++) {
      const t = j / n
      const m = 1 - t
      out.push([
        m * m * m * p1[0] + 3 * m * m * t * c1[0] + 3 * m * t * t * c2[0] + t * t * t * p2[0],
        m * m * m * p1[1] + 3 * m * m * t * c1[1] + 3 * m * t * t * c2[1] + t * t * t * p2[1],
      ])
    }
  }
  if (!closed) out.push(ps[ps.length - 1]!)
  return out
}
/** 多边形面积（鞋带公式） */
export const shoelace = (pts: P[]): number => Math.abs(pts.reduce((s, p, i) => s + p[0] * pts[(i + 1) % pts.length]![1] - pts[(i + 1) % pts.length]![0] * p[1], 0)) / 2
function inPoly(q: P, poly: P[]): boolean {
  let c = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]!
    const b = poly[j]!
    if (a[1] > q[1] !== b[1] > q[1] && q[0] < ((b[0] - a[0]) * (q[1] - a[1])) / (b[1] - a[1]) + a[0]) c = !c
  }
  return c
}
/** 方格纸上每一格：满格（整格都在图形里）、非满格（有一部分在里面）。按格子里 7 × 7 个点判断 */
export function classifyCells(poly: P[], W0: number, H0: number): { full: P[]; partial: P[] } {
  const full: P[] = []
  const partial: P[] = []
  const S = [0.03, 0.18, 0.34, 0.5, 0.66, 0.82, 0.97]
  for (let r = 0; r < H0; r++)
    for (let c = 0; c < W0; c++) {
      let n = 0
      for (const dx of S) for (const dy of S) if (inPoly([c + dx, r + dy], poly)) n++
      const touched = n > 0 || poly.some((p) => p[0] > c && p[0] < c + 1 && p[1] > r && p[1] < r + 1)
      if (n === S.length * S.length) full.push([c, r])
      else if (touched) partial.push([c, r])
    }
  return { full, partial }
}

/** 叶子：斜着的椭圆，叶尖那头尖一点；叶柄在左下 */
export interface Leaf {
  W: number
  H: number
  pts: P[]
  stem: [P, P]
  full: P[]
  partial: P[]
  /** 近似看作的平行四边形（底 a、高 h，四个顶点）——小亮的办法 */
  para: { a: number; h: number; pts: P[] }
}
function makeLeaf(W0: number, H0: number, cx: number, cy: number, ra: number, rb: number, deg: number): Leaf {
  const pts: P[] = []
  for (let i = 0; i < 12; i++) {
    const t = (i / 12) * Math.PI * 2
    // 叶尖（t = 0）尖一点、叶柄那头（t = π）圆一点
    const tip = i === 0 ? 1.12 : i === 1 || i === 11 ? 1.02 : 1
    const p: P = [Math.cos(t) * ra * tip, Math.sin(t) * rb * (i === 0 ? 0.6 : 1)]
    const q = rotP(p, deg)
    pts.push([Math.round((cx + q[0]) * 100) / 100, Math.round((cy + q[1]) * 100) / 100])
  }
  const dense = sampleCurve(pts, true)
  const { full, partial } = classifyCells(dense, W0, H0)
  const back = rotP([-ra, 0], deg)
  const base: P = [cx + back[0], cy + back[1]]
  const stem: [P, P] = [base, add(base, mul(norm(back), 0.8))]
  // 小亮的平行四边形：高取叶子上下的距离（整格），底取「面积 ÷ 高」往上凑，上边往叶尖那边错开，套在叶子外面
  const ys = dense.map((q) => q[1])
  const h = Math.round(Math.max(...ys) - Math.min(...ys))
  const a = Math.max(2, Math.round(shoelace(dense) / h + 0.3))
  const sh = Math.round(h * 0.35 * 2) / 2
  const y0 = Math.round((cy - h / 2) * 2) / 2
  const x0 = Math.round((cx - (a + sh) / 2) * 2) / 2
  return { W: W0, H: H0, pts, stem, full, partial, para: { a, h, pts: [[x0, y0 + h], [x0 + a, y0 + h], [x0 + a + sh, y0], [x0 + sh, y0]] } }
}
/** 课本那片叶子（9 × 8 格，满格 18、非满格 18）和几片别的叶子；满格、非满格是按画出来的曲线算的（参数是试出来的：满格 + 非满格的一半和叶子的真实面积差不多） */
export const LEAVES: Leaf[] = [
  makeLeaf(9, 8, 4.5, 4, 3.4, 2.5, 35),
  makeLeaf(10, 8, 5, 4, 3.4, 2.6, 40),
  makeLeaf(10, 7, 5, 3.5, 3.8, 2.3, 25),
  makeLeaf(10, 8, 5, 4.5, 4.2, 2.3, 40),
  makeLeaf(10, 7, 5.5, 3.5, 3.8, 2.6, 40),
  makeLeaf(10, 8, 5, 4, 4.2, 2.6, 40),
  makeLeaf(10, 7, 5, 3.5, 3.4, 2.6, 10),
]

function leafFig(leaf: Leaf, o: { full?: boolean; para?: boolean }): GeoFig {
  const items: GeoItem[] = [
    { t: 'curve', pts: leaf.pts, closed: true, fill: 'c', stroke: 'c' },
    { t: 'line', a: leaf.stem[0], b: leaf.stem[1], stroke: 'c' },
    // 格线画在叶子上面（同一层按先后画），满格再涂黄
    { t: 'grid', x: 0, y: 0, w: leaf.W, h: leaf.H, cells: o.full ? leaf.full : undefined, fill: 'a' },
  ]
  if (o.para) items.push({ t: 'poly', pts: leaf.para.pts, stroke: 'd', dash: true })
  return { w: leaf.W, h: leaf.H, px: Math.min(20, Math.floor(126 / leaf.H)), items }
}
const leafAlt = (leaf: Leaf): string => `（方格纸上的一片叶子，${leaf.W} × ${leaf.H} 格）`

/** 例 5 小红的办法：数出满格（涂黄的）有几格 */
function genIrrFull(kpId: string, d: Difficulty, rng: RNG): Question {
  const i = rng.int(0, LEAVES.length - 1)
  const leaf = LEAVES[i]!
  return numQ({ kpId, d, rng, sig: `full-${i}`, stem: [text('m5.area.i.fullQ'), geoPart([leafFig(leaf, { full: true })], leafAlt(leaf))], value: leaf.full.length, smart: [leaf.full.length + leaf.partial.length, leaf.partial.length] })
}
/** 例 5：面积在满格数到「满格 + 非满格」之间 */
function genIrrRange(kpId: string, d: Difficulty, rng: RNG): Question {
  const i = rng.int(0, LEAVES.length - 1)
  const leaf = LEAVES[i]!
  const f = leaf.full.length
  const p = leaf.partial.length
  const rg = (a: number, b: number): LStr => ({ k: 'm5.area.i.between', p: { a, b } })
  const wrong = [rg(f, f + Math.floor(p / 2)), rg(Math.floor(p / 2), f), rg(f + p, f + 2 * p)].filter((l, j, arr) => JSON.stringify(l) !== JSON.stringify(rg(f, f + p)) && arr.findIndex((x) => JSON.stringify(x) === JSON.stringify(l)) === j)
  return pickWord(kpId, d, rng, `range-${i}`, [text('m5.area.i.rangeQ', { f, p }), geoPart([leafFig(leaf, { full: true })], leafAlt(leaf))], rg(f, f + p), wrong)
}
/** 例 5：不满 1 格按半格算 */
function genIrrHalf(kpId: string, d: Difficulty, rng: RNG): Question {
  const i = rng.int(0, LEAVES.length - 1)
  const leaf = LEAVES[i]!
  const f = leaf.full.length
  const p = leaf.partial.length
  const v = f + p / 2
  return areaQ({ kpId, d, rng, sig: `half-${i}`, stem: [text('m5.area.i.halfQ', { f, p }), geoPart([leafFig(leaf, { full: true })], leafAlt(leaf))], value: v, wrong: [f + p, f, f + p / 4, p], input: 'choice' })
}
/** 例 5 小亮的办法：把叶子近似看作平行四边形 */
function genIrrPara(kpId: string, d: Difficulty, rng: RNG): Question {
  const i = rng.int(0, LEAVES.length - 1)
  const leaf = LEAVES[i]!
  const { a, h } = leaf.para
  return numQ({ kpId, d, rng, sig: `para-${i}`, stem: [text('m5.area.i.paraQ', { a, h }), geoPart([leafFig(leaf, { para: true })], `（方格纸上的一片叶子，外面画着一个底 ${a} 格、高 ${h} 格的平行四边形）`)], value: a * h, smart: [(a * h) / 2, (a + h) * 2, a * h + a], input: 'choice' })
}
function genIrrJudge(kpId: string, d: Difficulty, rng: RNG): Question {
  const all: [string, boolean][] = [
    ['m5.area.i.jHalf', true],
    ['m5.area.i.jExact', false],
    ['m5.area.i.jShape', true],
  ]
  const [k, yes] = rng.pick(all)
  return judge(kpId, d, rng, `j-${k.split('.').pop()}`, [text(k)], yes)
}

/** 练习十七 4①：方格纸上顶点都在格点上的四边形，能算准（分成两个三角形，或者用外面的长方形减） */
function genIrrPoly(kpId: string, d: Difficulty, rng: RNG): Question {
  for (;;) {
    // y 向上的坐标里取：左边竖着的一条边、下边横着的一条边，再加右上一个尖（像课本）
    const yb = rng.int(1, 2)
    const xr = rng.int(2, 4)
    const yt = yb + rng.int(2, 4)
    const X = rng.int(6, 9)
    const Y = rng.int(yt + 1, 9)
    const up: P[] = [[1, yb], [xr, yb], [X, Y], [1, yt]]
    // 凸四边形
    const cross = up.map((p, i) => {
      const a = up[(i + 1) % 4]!
      const b = up[(i + 2) % 4]!
      return (a[0] - p[0]) * (b[1] - a[1]) - (a[1] - p[1]) * (b[0] - a[0])
    })
    if (!(cross.every((c) => c > 0) || cross.every((c) => c < 0))) continue
    const S = shoelace(up)
    if (!isInt(S) || S < 10 || S > 40) continue
    const pts: P[] = up.map((p) => [p[0], 10 - p[1]])
    return numQ({
      kpId,
      d,
      rng,
      sig: `poly-${up.map((p) => p.join('.')).join('_')}`,
      stem: [text('m5.area.i.polyQ'), geoPart([{ w: 10, h: 10, px: 20, items: [{ t: 'poly', pts, fill: 'b', stroke: 'b' }, { t: 'grid', x: 0, y: 0, w: 10, h: 10 }] }], '（方格纸上的一个四边形，顶点都在格点上）')],
      value: S,
      smart: [S * 2, S + 4, (X - 1) * (Y - yb)],
    })
  }
}

/** 练习十七 5：一块地近似平行四边形，面积约是多少（得数保留整数） */
const LANDS: [number, number][] = [
  [43, 20.1], [36, 18.4], [52, 15.6], [28, 24.7], [45, 22.3],
]
function genIrrLand(kpId: string, d: Difficulty, rng: RNG): Question {
  const [a, h] = rng.pick(LANDS)
  const exact = clean(a * h)
  const v = Math.round(exact)
  const other = exact - Math.floor(exact) >= 0.5 ? Math.floor(exact) : Math.floor(exact) + 1
  const k = place({ A: [0, h], B: [a, h], C: [a + a * 0.3, 0], D: [a * 0.3, 0], F: [a * 0.3, h] }, 0, 210, 90)
  // 弯弯曲曲的边：沿平行四边形四条边取点，往里外各偏一点
  const ring: P[] = []
  const corners = [k.A, k.B, k.C, k.D]
  corners.forEach((p, i) => {
    const q = corners[(i + 1) % 4]!
    for (let j = 0; j < 4; j++) {
      const t = j / 4
      const n = norm([q[1] - p[1], p[0] - q[0]])
      const wob = j === 0 ? 0 : (j % 2 ? 5 : -4)
      ring.push(add(add(p, mul(sub(q, p), t)), mul(n, wob)))
    }
  })
  const items: GeoItem[] = [
    { t: 'curve', pts: ring, closed: true, fill: 'c', stroke: 'c' },
    { t: 'poly', pts: corners, stroke: 'b', dash: true, labels: [`${a} m`, null, null, null] },
    ...heightItems(k.D, k.F, [k.F[0] + 12, k.F[1]], `${h} m`, k.B),
  ]
  return labelQuestion({
    kpId,
    type: T,
    difficulty: d,
    sig: `land-${a}-${h}`,
    stem: [text('m5.area.i.landQ', { a, h }), geoPart([fitFig(items)], `（一块地，形状近似底 ${a} m、高 ${h} m 的平行四边形）`)],
    correct: String(v),
    distractors: [String(other), fmt(exact), String(Math.round(exact * 10))],
    rng,
  })
}

/** 练习十七 4②③、练习十八 6：估计面积（选项差得远，估得差不多就能选对） */
function waveShape(): P[] {
  const top = sampleCurve(
    [
      [1, 4.2],
      [2.2, 4.3],
      [3, 5],
      [4, 5.8],
      [5, 5],
      [6, 4.3],
      [7, 5],
      [8, 5.7],
      [9, 5.8],
    ],
    false,
    6,
  )
  return [[1, 9], ...top, [9, 9]]
}
const BLOB: P[] = [
  [0.05, 3.7], [0.4, 3.1], [1, 2.6], [1.8, 2], [2.8, 1.1], [4.4, 1.45], [4.9, 1.4], [5.2, 0.8], [5.6, 0.9], [6.1, 1.35], [6.6, 0.95], [7.5, 0.95], [7.9, 1.1], [8.2, 2], [8.5, 2.4], [9.2, 2.9], [9.3, 3.1], [9.3, 4.8], [9.85, 5.9], [10.2, 6.9], [10.2, 7.4], [9.85, 7.85], [9.2, 8.2], [8.2, 8.7], [7.4, 8.85], [6.3, 9.2], [5.3, 9.2], [5, 9], [4.2, 8.05], [3.9, 7.75], [3.3, 7.2], [2.85, 7.1], [2.25, 7.1], [1.5, 7.1], [0.9, 7], [0.5, 6.8], [0.5, 6.35], [0.55, 5.75], [0.35, 5.25], [0.3, 4.65],
]
const HOLE_OUT: P[] = [
  [1.6, 2.4], [5.4, 2.25], [6.7, 2.4], [11, 3.6], [11.7, 5], [10.8, 6.8], [7.5, 8.5], [2.6, 9.6], [1.8, 5.8],
]
const HOLE_IN: P[] = [
  [3.4, 5], [4, 4.45], [4.7, 4.35], [6.4, 4.45], [7.3, 5.1], [7.65, 5.65], [7.35, 6.1], [6.6, 6.9], [5, 6.9], [4, 6.6], [3.75, 6.25],
]
export interface Est {
  id: string
  fig: GeoFig
  area: number
  key: string
  alt: string
}
export const ESTS: Est[] = (() => {
  const wave = waveShape()
  const blobDense = sampleCurve(BLOB, true)
  const holeIn = sampleCurve(HOLE_IN, true)
  const grid = (w: number, h: number): GeoItem => ({ t: 'grid', x: 0, y: 0, w, h })
  return [
    { id: 'wave', fig: { w: 10, h: 10, px: 20, items: [{ t: 'poly', pts: wave, fill: 'c', stroke: 'b' }, grid(10, 10)] }, area: shoelace(wave), key: 'm5.area.i.estQ', alt: '（方格纸上下边平、上边弯弯曲曲的一块图形）' },
    { id: 'blob', fig: { w: 11, h: 10, px: 20, items: [{ t: 'curve', pts: BLOB, closed: true, fill: 'c', stroke: 'b' }, grid(11, 10)] }, area: shoelace(blobDense), key: 'm5.area.i.estQ', alt: '（方格纸上一块不规则的图形）' },
    {
      id: 'hole',
      fig: { w: 12, h: 12, px: 18, items: [{ t: 'poly', pts: HOLE_OUT, fill: 'c', stroke: 'b' }, { t: 'curve', pts: HOLE_IN, closed: true, fill: 'paper', stroke: 'b' }, grid(12, 12)] },
      area: shoelace(HOLE_OUT) - shoelace(holeIn),
      key: 'm5.area.i.estMQ',
      alt: '（方格纸上一块不规则的图形，中间空着一块）',
    },
  ]
})()
function genIrrEst(kpId: string, d: Difficulty, rng: RNG, ids?: string[]): Question {
  const pool = ESTS.filter((e) => !ids || ids.includes(e.id))
  const e = rng.pick(pool)
  const v = Math.round(e.area)
  // 干扰项离答案远（一半、一倍半以上），估得差不多就能选对
  const wrong = [Math.round(v / 2), Math.round(v * 1.7), Math.round(v * 2.5)]
  return labelQuestion({ kpId, type: T, difficulty: d, sig: `est-${e.id}`, stem: [text(e.key), geoPart([e.fig], e.alt)], correct: String(v), distractors: wrong.map(String), rng })
}

defineGenerator(KP_IRR, (d, rng) => {
  const kpId = KP_IRR
  const roll = rng.next()
  if (d === 1) {
    // 例 5：数满格、面积在多少之间、不满 1 格按半格算、近似看作平行四边形（做一做「估计手掌的面积」不出）
    if (roll < 0.22) return genIrrFull(kpId, d, rng)
    if (roll < 0.44) return genIrrRange(kpId, d, rng)
    if (roll < 0.68) return genIrrHalf(kpId, d, rng)
    if (roll < 0.88) return genIrrPara(kpId, d, rng)
    return genIrrJudge(kpId, d, rng)
  }
  if (d === 2) {
    // 练习十七 4①②、5
    if (roll < 0.4) return genIrrPoly(kpId, d, rng)
    if (roll < 0.7) return genIrrLand(kpId, d, rng)
    return genIrrEst(kpId, d, rng, ['wave', 'blob'])
  }
  // 练习十七 4③、练习十八 6
  if (roll < 0.6) return genIrrEst(kpId, d, rng, ['blob', 'hole'])
  return genIrrPoly(kpId, d, rng)
})
