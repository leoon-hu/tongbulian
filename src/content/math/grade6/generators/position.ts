import type { Bearing, BearingPlace, Difficulty, Dir4, LStr, PairItem, PairShape, Question, QuestionType, RouteLeg, ShapeKind, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 六上「一 确定位置」（2022 版新教材 p1–15；六年级数学 A，照笔记 A 写），三个知识点：
// 用有序数对确定位置：例 1（座位表：张亮在第 2 列、第 3 行 =（2，3）；王艳（3，4）、赵雪（4，3）顺序不同位置不同；（6，3）是谁）、
//   例 2（方格图上的点：周明（1，3）……；同一列第一个数相同、同一行第二个数相同）、做一做 1（四角星 A（5，9）B（1，5）C（5，1）D（9，5））、
//   做一做 2（A（5，9）B（1，6）C（2，1）D（8，1）E（9，6）连成五边形）、练习一 3（涂色格）、练习二 1（格子柜，药名换成水果）、2（校园平面图）
//   在第 1 档；练习一 2（电影院几排几号，只问几排几号）、4（平移）、5（分拣机器人的路线）、练习二 7（每格 100 米：以东、往北，王玲的路线）、
//   整理和复习（直线上一个数、平面内两个数）、练习一 1（生活中的例子）在第 2 档；两次平移、隔几格在第 3 档。
// 用方向和距离确定位置：例 3（渔船在搜救船东偏南 25°，也可以说南偏东 65°，习惯用不大于 45° 的角；只用距离不行；1 厘米表示 500 米）、
//   做一做（人民广场图：市政府正西 400、公园北偏西 45° 300、工人文化宫东偏北 30° 300、科技馆南偏东 30° 400、超市西偏南 40° 300）、
//   例 4（货船在北偏西 40°、1000 米：选点）、做一做（画方向改成选射线：A 岛西偏北 30°、西偏南 40°、东偏南 20°；标建筑要画几小段；
//   小刚家北偏东 45° 1000 米等四家，反过来学校在小刚家南偏西 45°）在第 1 档；练习二 3（小明家图，游泳馆在邮局正北）、4（反过来）、
//   5（油井 45 千米每段 15 千米）、角量在另一条线上、北偏东 45° 就是东北在第 2 档；练习二 8（斜着走对角线）、相反方向相距多少在第 3 档。
// 用方向和距离描述路线：例 5（学校 → 邮局南偏东 30° 200 米 → 书店东偏南 30° 600 米 → 小明家正东 540 米；每段以起点为参照点；
//   回来时方向反过来）、做一做（正南 50 米到路口、南偏西 30° 100 米到公园：选图）在第 1 档；练习二 9（小玲：时间换成除得尽的）、
//   10（公共汽车原路返回）在第 2 档；整条回来的路线、平均速度在第 3 档。练习一 6、练习二 6、11 是开放题，不出。
// 作答：有序数对、方向、地方、字母、编号、图形名都是选项；格数、米数、度数、厘米数、小段数是数字键盘。
// 方向用「从北顺时针的度数」比较：选项里不放和答案同一个方向的另一种说法（东偏南 25° 和南偏东 65°、北偏东 45° 和东偏北 45°）。
// 序数写汉字（第二列、第三行、八排十号），数对照课本写「（2，3）」（朗读只读两个数）。图：PairGrid、BearingMap、RouteMap（新做）。
// 课本没印的数（随机的座位、点、地图、路线）是自己定的；练习二 9 的时间改成除得尽的（课本 2800 ÷ 48 除不尽）。
// ─────────────────────────────────────────────────────────────

const K1 = 'm6s1-01-pairs'
const K2 = 'm6s1-01-bearing'
const K3 = 'm6s1-01-route'
type P = Record<string, LStr | number>
const L = (k: string, p?: P): LStr => (p ? { k: `m6.pos.${k}`, p } : { k: `m6.pos.${k}` })
const T = (k: string, p?: P): StemPart => ({ kind: 'text', text: L(k, p) })
const YES = L('yes')
const NO = L('no')
/** 有序数对照课本写：（2，3） */
export const pairStr = (x: number, y: number): string => `（${x}，${y}）`
/** 汉字序数：三、十二（第三列、八排十号） */
const ord = (n: number): LStr => L(`n.${n}`)
const place = (id: string): LStr => L(`pl.${id}`)
const nm = (id: string): LStr => L(`nm.${id}`)
const LETTERS = ['A', 'B', 'C', 'D', 'E', 'F']

function tf(kpId: string, type: QuestionType, d: Difficulty, sig: string, stem: StemPart[], ok: boolean, rng: RNG): Question {
  return labelQuestion({ kpId, type, difficulty: d, sig, stem, correct: ok ? YES : NO, distractors: [ok ? NO : YES], rng })
}
/** 方格图、方向图、路线图这种大图 */
const FIGS = new Set<StemPart['kind']>(['pair-grid', 'bearing-map', 'route-map'])
/**
 * 数的答案：带大图的题做成选项卡（数字键盘四行约 300 像素，手机竖屏上和图一起一屏放不下，同五年级 notify），card 也可以直接指定；
 * smart 是常见错的数（做成选项卡时就是干扰项，给够 3 个）
 */
function num(kpId: string, type: QuestionType, d: Difficulty, sig: string, stem: StemPart[], value: number, rng: RNG, smart: number[] = [], card = false): Question {
  const wrongs = [...new Set(smart.filter((v) => Number.isInteger(v) && v >= 0 && v !== value))]
  const choice = card || stem.some((p) => FIGS.has(p.kind))
  return numberQuestion({ kpId, type, difficulty: d, sig, stem, value, rng, min: 0, max: Math.max(20, value * 3, ...wrongs), smart: wrongs, input: choice ? 'choice' : 'numpad' })
}
/** 度数的干扰项：从另一条线量的（90 − 度数）、差 10° / 5° 的 */
const degWrongs = (deg: number): number[] => [90 - deg, deg + 10, deg - 10, deg + 5, deg - 5].filter((v) => v > 0 && v < 90 && v !== deg)
function pick(kpId: string, type: QuestionType, d: Difficulty, sig: string, stem: StemPart[], correct: LStr, wrongs: LStr[], rng: RNG): Question {
  return labelQuestion({ kpId, type, difficulty: d, sig, stem, correct, distractors: wrongs, rng })
}

// ══ 方向：换成从北顺时针转的度数比较 ══

export const AXIS_AZ: Record<Dir4, number> = { n: 0, e: 90, s: 180, w: 270 }
const OPP: Record<Dir4, Dir4> = { n: 's', s: 'n', e: 'w', w: 'e' }
/** 北偏东 30° = 30，东偏南 25° = 115，正西 = 270 */
export function azimuth(b: Bearing): number {
  if (!b.side || !b.deg) return AXIS_AZ[b.base]
  const cw = (AXIS_AZ[b.side] - AXIS_AZ[b.base] + 360) % 360 === 90
  return (AXIS_AZ[b.base] + (cw ? b.deg : -b.deg) + 360) % 360
}
/** 反过来：北偏东 30° → 南偏西 30°（两个字都换成相反的，度数不变） */
export const reverse = (b: Bearing): Bearing => (b.side ? { base: OPP[b.base], side: OPP[b.side], deg: b.deg } : { base: OPP[b.base] })
/** 换一条线量：东偏南 25° → 南偏东 65°（同一个方向） */
export const other = (b: Bearing): Bearing => ({ base: b.side!, side: b.base, deg: 90 - b.deg! })
/** 两个字的位置换了、度数没换（常见错：北偏东 30° 说成东偏北 30°） */
const swapWords = (b: Bearing): Bearing => ({ base: b.side!, side: b.base, deg: b.deg })
const flip = (b: Bearing, x: Dir4, y: Dir4): Bearing => {
  const f = (d: Dir4): Dir4 => (d === x ? y : d === y ? x : d)
  return b.side ? { base: f(b.base), side: f(b.side), deg: b.deg } : { base: f(b.base) }
}
const flipEW = (b: Bearing): Bearing => flip(b, 'e', 'w')
const flipNS = (b: Bearing): Bearing => flip(b, 'n', 's')
/** 习惯说法：用不大于 45° 的角 */
export const habit = (b: Bearing): Bearing => (b.side && b.deg! > 45 ? other(b) : b)
/** 方向的说法：北偏东30°、正西 */
export const dirL = (b: Bearing): LStr => (b.side ? L(`d.${b.base}${b.side}`, { deg: b.deg! }) : L(`d.${b.base}`))
/** 只有偏向、没有度数：北偏东（「北偏东多少度」） */
const dnL = (b: Bearing): LStr => L(`dn.${b.base}${b.side}`)
const bKey = (b: Bearing): string => (b.side ? `${b.base}${b.side}${b.deg}` : b.base)

/** 方向的干扰项：两个字换位置、东西反、南北反、反方向；去掉和答案同一个方向的、彼此同方向的 */
function dirWrongs(b: Bearing, first: Bearing[] = []): Bearing[] {
  const cands: Bearing[] = [...first]
  if (b.side) cands.push(swapWords(b), flipEW(b), flipNS(b), reverse(b), { base: b.base, side: b.side, deg: 90 - b.deg! })
  else cands.push(...(['n', 'e', 's', 'w'] as Dir4[]).filter((x) => x !== b.base).map((x): Bearing => ({ base: x })))
  const seen = new Set([azimuth(b)])
  const out: Bearing[] = []
  for (const c of cands) {
    if (c.side && (!c.deg || c.deg <= 0 || c.deg >= 90)) continue
    const az = azimuth(c)
    if (seen.has(az)) continue
    seen.add(az)
    out.push(c)
    if (out.length === 3) break
  }
  return out
}
const dirQ = (kpId: string, d: Difficulty, sig: string, stem: StemPart[], b: Bearing, rng: RNG, first: Bearing[] = []): Question =>
  pick(kpId, 'direction', d, sig, stem, dirL(b), dirWrongs(b, first).map(dirL), rng)

/** 随机方向：偏的度数 10°–40°（45° 两种说法都对，只在课本数据里出现） */
function randBearing(rng: RNG, quadrant?: number): Bearing {
  const q = quadrant ?? rng.int(0, 3)
  const [a, b] = ([['n', 'e'], ['e', 's'], ['s', 'w'], ['w', 'n']] as [Dir4, Dir4][])[q]!
  const [base, side] = rng.chance(0.5) ? [a, b] : [b, a]
  return { base, side, deg: rng.pick([10, 15, 20, 25, 30, 35, 40]) }
}

// ══ 有序数对的选项 ══

/** 有序数对的选项：对的 + 常见错（两个数写反、数错一格），不出界、不重复 */
function pairQ(kpId: string, d: Difficulty, sig: string, stem: StemPart[], x: number, y: number, rng: RNG, o: { min?: number; maxX?: number; maxY?: number; first?: [number, number][]; type?: QuestionType } = {}): Question {
  const min = o.min ?? 0
  const maxX = o.maxX ?? 99
  const maxY = o.maxY ?? 99
  const cands: [number, number][] = [...(o.first ?? [])]
  if (x !== y) cands.push([y, x])
  cands.push([x + 1, y], [x, y + 1], [x - 1, y], [x, y - 1], [x + 1, y + 1], [x - 1, y - 1], [x + 2, y], [x, y + 2])
  const seen = new Set([`${x},${y}`])
  const wrongs: string[] = []
  for (const [a, b] of cands) {
    if (a < min || b < min || a > maxX || b > maxY) continue
    const k = `${a},${b}`
    if (seen.has(k)) continue
    seen.add(k)
    wrongs.push(pairStr(a, b))
    if (wrongs.length === 3) break
  }
  return pick(kpId, o.type ?? 'position', d, sig, stem, pairStr(x, y), wrongs, rng)
}

// ══ 用有序数对确定位置（m6s1-01-pairs）══

/** 例 1、例 2 插图里的同学（课本）：王乐的「乐」是多音字，换成王明 */
export const CLASS: [string, number, number][] = [
  ['zhangliang', 2, 3],
  ['wangyan', 3, 4],
  ['zhaoxue', 4, 3],
  ['zhouming', 1, 3],
  ['sunfang', 2, 2],
  ['lixiaodong', 2, 1],
  ['wangming', 6, 3],
]

const seatGrid = (cols: number, rows: number, items: PairItem[], alt: string): StemPart => ({ kind: 'pair-grid', mode: 'cells', cols, rows, seats: true, items, alt })
const pointGrid = (cols: number, rows: number, items: PairItem[], alt: string, more: { axes?: boolean; shapes?: PairShape[] } = {}): StemPart => ({
  kind: 'pair-grid',
  mode: 'points',
  cols,
  rows,
  items,
  alt,
  ...more,
})

/** 例 1：座位表上涂红的座位，用有序数对表示（第 1 档多是课本的 6 列 5 行） */
function qSeatRead(d: Difficulty, rng: RNG): Question {
  const cols = rng.chance(0.5) ? 6 : rng.int(5, 7)
  const rows = cols === 6 && rng.chance(0.6) ? 5 : rng.int(4, 5)
  let c = 2
  let r = 3
  while (c === 2 && r === 3) {
    c = rng.int(1, cols)
    r = rng.int(1, rows)
  }
  const grid = seatGrid(cols, rows, [{ x: c, y: r, fill: 'red' }], `座位表：${cols} 列 ${rows} 行，有一个座位涂成了红色`)
  return pairQ(K1, d, `seat-${cols}x${rows}-${c}-${r}`, [T('seat.read'), grid], c, r, rng, { min: 1, maxX: cols, maxY: rows })
}

/** 例 1 (2)：（6，3）是王明的座位，他坐在哪个字母的座位上（另几个座位放在写反、差一格的地方） */
function qSeatFind(d: Difficulty, rng: RNG): Question {
  const textbook = rng.chance(0.4)
  const cols = textbook ? 6 : rng.int(5, 7)
  const rows = textbook ? 5 : rng.int(4, 5)
  const [who, c, r] = textbook ? CLASS[6]! : [rng.pick(CLASS)[0], rng.int(1, cols), rng.int(1, rows)]
  const spots: [number, number][] = [[c, r]]
  const add = (x: number, y: number): void => {
    if (x >= 1 && y >= 1 && x <= cols && y <= rows && !spots.some(([a, b]) => a === x && b === y)) spots.push([x, y])
  }
  add(r, c)
  for (const [dx, dy] of rng.shuffle([[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]] as [number, number][])) add(c + dx, r + dy)
  const four = spots.slice(0, 4)
  const order = rng.shuffle(four.map((_, i) => i))
  const items: PairItem[] = order.map((i, k) => ({ x: four[i]![0], y: four[i]![1], tag: LETTERS[k]! }))
  const tagOf = (i: number): string => LETTERS[order.indexOf(i)]!
  const grid = seatGrid(cols, rows, items, `座位表：${cols} 列 ${rows} 行，四个座位上写着 A、B、C、D`)
  return pick(K1, 'position', d, `find-${cols}x${rows}-${c}-${r}-${order.join('')}`, [T('seat.find', { name: nm(who), x: c, y: r }), grid], tagOf(0), four.slice(1).map((_, i) => tagOf(i + 1)), rng)
}

/** 例 1 的文字题：坐在第几列、第几行 → 有序数对 */
function qSeatText(d: Difficulty, rng: RNG): Question {
  const [who, c, r] = rng.chance(0.5) ? rng.pick(CLASS) : [rng.pick(CLASS)[0], rng.int(1, 8), rng.int(1, 6)]
  return pairQ(K1, d, `text-${who}-${c}-${r}`, [T('seat.text', { name: nm(who), c: ord(c), r: ord(r) })], c, r, rng, { min: 1 })
}

/** 例 1 (1)：（3，4）和（4，3）不是同一个位置；第一个数表示列、第二个数表示行 */
function qOrder(d: Difficulty, rng: RNG): Question {
  let a = 3
  let b = 4
  if (rng.chance(0.6)) {
    a = rng.int(1, 9)
    b = rng.int(1, 9)
    while (b === a) b = rng.int(1, 9)
  }
  const kind = rng.pick(['tf', 'first', 'second', 'what'] as const)
  if (kind === 'tf') return tf(K1, 'position', d, `ord-tf-${a}-${b}`, [T('ord.tf', { a, b })], false, rng)
  if (kind === 'what')
    return pick(K1, 'position', d, `ord-what-${a}-${b}`, [T('ord.what', { a, b })], L('col', { n: ord(a) }), [L('row', { n: ord(a) }), L('col', { n: ord(b) }), L('row', { n: ord(b) })], rng)
  const right = rng.chance(0.5)
  if (kind === 'first') return tf(K1, 'position', d, `ord-first-${a}-${b}-${right ? 1 : 0}`, [T(right ? 'ord.first' : 'ord.firstRow', { a, b, o: ord(a) })], right, rng)
  return tf(K1, 'position', d, `ord-second-${a}-${b}-${right ? 1 : 0}`, [T(right ? 'ord.second' : 'ord.secondCol', { a, b, o: ord(b) })], right, rng)
}

/** 做一做 1 的四角星：A（5，9）B（1，5）C（5，1）D（9，5），四个凹进去的点 */
export const STAR: [number, number][] = [
  [5, 9],
  [6, 6],
  [9, 5],
  [6, 4],
  [5, 1],
  [4, 4],
  [1, 5],
  [4, 6],
]
export const STAR_TIPS: Record<string, [number, number]> = { A: [5, 9], B: [1, 5], C: [5, 1], D: [9, 5] }

/** 几个不重复的格点 */
function randPoints(rng: RNG, n: number, cols: number, rows: number, min = 1): [number, number][] {
  const out: [number, number][] = []
  while (out.length < n) {
    const p: [number, number] = [rng.int(min, cols), rng.int(min, rows)]
    if (!out.some(([a, b]) => Math.abs(a - p[0]) + Math.abs(b - p[1]) < 2)) out.push(p)
  }
  return out
}

/** 例 2、做一做 1：方格图上点的位置用有序数对表示 */
function qPointRead(d: Difficulty, rng: RNG, axis = false): Question {
  const v = axis ? 'rand' : rng.pick(['star', 'class', 'rand', 'rand'] as const)
  if (v === 'star') {
    const p = rng.pick(['B', 'C', 'D'])
    const [x, y] = STAR_TIPS[p]!
    const items: PairItem[] = Object.entries(STAR_TIPS).map(([tag, [a, b]]) => ({ x: a, y: b, tag }))
    const grid = pointGrid(10, 10, items, '方格图上的四角星，四个尖上是点 A、B、C、D', { shapes: [{ pts: STAR, closed: true }] })
    return pairQ(K1, d, `star-${p}`, [T('pt.star', { p }), grid], x, y, rng, { maxX: 10, maxY: 10 })
  }
  if (v === 'class') {
    const [who, x, y] = rng.pick(CLASS.slice(0, 6).filter((c) => c[0] !== 'zhouming'))
    const items: PairItem[] = CLASS.slice(0, 6).map(([id, a, b]) => ({ x: a, y: b, name: nm(id) }))
    const grid = pointGrid(6, 5, items, '方格图：横着 0 到 6、竖着 0 到 5，几个点旁边写着同学的名字', { axes: true })
    return pairQ(K1, d, `class-${who}`, [T('pt.class', { name: nm(who) }), grid], x, y, rng, { maxX: 6, maxY: 5 })
  }
  const cols = rng.int(6, 10)
  const rows = rng.int(5, 8)
  const pts = randPoints(rng, 4, cols, rows, axis ? 1 : 1)
  if (axis) pts[0] = rng.chance(0.5) ? [0, rng.int(1, rows)] : [rng.int(1, cols), 0]
  const at = axis ? 0 : rng.int(0, 3)
  const [x, y] = pts[at]!
  const items: PairItem[] = pts.map(([a, b], i) => ({ x: a, y: b, tag: LETTERS[i]! }))
  const grid = pointGrid(cols, rows, items, `方格图：横着 0 到 ${cols}、竖着 0 到 ${rows}，标出了点 A、B、C、D`)
  return pairQ(K1, d, `pt-${cols}x${rows}-${pts.map((q) => q.join('.')).join('_')}-${at}`, [T('pt.read', { p: LETTERS[at]! }), grid], x, y, rng, { maxX: cols, maxY: rows })
}

/** 例 2 反过来：哪个点的位置是（x，y）（有一个点放在两个数写反的地方） */
function qPointFind(d: Difficulty, rng: RNG): Question {
  const cols = rng.int(6, 9)
  const rows = rng.int(5, 8)
  let pts = randPoints(rng, 4, cols, rows)
  const [x, y] = pts[0]!
  if (x !== y && y <= cols && x <= rows && !pts.slice(1).some(([a, b]) => a === y && b === x)) pts[1] = [y, x]
  pts = pts.filter((p, i) => pts.findIndex((q) => q[0] === p[0] && q[1] === p[1]) === i)
  const order = rng.shuffle(pts.map((_, i) => i))
  const items: PairItem[] = order.map((i, k) => ({ x: pts[i]![0], y: pts[i]![1], tag: LETTERS[k]! }))
  const tagOf = (i: number): string => LETTERS[order.indexOf(i)]!
  const grid = pointGrid(cols, rows, items, `方格图：横着 0 到 ${cols}、竖着 0 到 ${rows}，标出了 ${pts.length} 个点`)
  return pick(K1, 'position', d, `ptfind-${cols}x${rows}-${pts.map((q) => q.join('.')).join('_')}-${order.join('')}`, [T('pt.find', { x, y }), grid], tagOf(0), pts.slice(1).map((_, i) => tagOf(i + 1)), rng)
}

/** 例 2 (2)、说一说：同一列第一个数相同、同一行第二个数相同 */
function qSameLine(d: Difficulty, rng: RNG): Question {
  const kind = rng.pick(['col', 'row', 'allCol', 'allRow', 'numCol', 'numRow'] as const)
  const a = rng.int(1, 8)
  let b = rng.int(1, 8)
  while (b === a) b = rng.int(1, 8)
  const others = (avoid: number[]): number => {
    let v = rng.int(1, 9)
    while (avoid.includes(v)) v = rng.int(1, 9)
    return v
  }
  if (kind === 'col' || kind === 'row') {
    const col = kind === 'col'
    const k = others([a, b])
    const right = col ? pairStr(a, k) : pairStr(k, b)
    const m = others([a, b, k])
    // 错的：写反了的、另一个数相同的（同一行 / 同一列）、都不相同的
    const wrongs = col ? [pairStr(b, a), pairStr(k, b), pairStr(m, k)] : [pairStr(b, a), pairStr(a, k), pairStr(k, m)]
    return pick(K1, 'position', d, `line-${kind}-${a}-${b}-${k}-${m}`, [T(`line.${kind}`, { a, b })], right, wrongs, rng)
  }
  if (kind === 'allCol' || kind === 'allRow') {
    const vs = rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8].filter((v) => v !== a)).slice(0, 3).sort((p, q) => p - q)
    const col = kind === 'allCol'
    const params: P = col ? { a, b1: vs[0]!, b2: vs[1]!, b3: vs[2]! } : { b: a, a1: vs[0]!, a2: vs[1]!, a3: vs[2]! }
    const right = col ? L('col', { n: ord(a) }) : L('row', { n: ord(a) })
    const wrongs = col ? [L('row', { n: ord(a) }), L('col', { n: ord(vs[0]!) })] : [L('col', { n: ord(a) }), L('row', { n: ord(vs[0]!) })]
    return pick(K1, 'position', d, `line-${kind}-${a}-${vs.join('.')}`, [T(`line.${kind}`, params)], right, wrongs, rng)
  }
  return kind === 'numCol' ? num(K1, 'position', d, `line-numCol-${a}`, [T('line.numCol', { a })], a, rng) : num(K1, 'position', d, `line-numRow-${a}`, [T('line.numRow', { b: a })], a, rng)
}

/** 做一做 2 的五边形（课本）和几个自己定的图形：依次连成封闭图形 */
export const SHAPES: { kind: ShapeKind; pts: [number, number][] }[] = [
  { kind: 'pentagon', pts: [[5, 9], [1, 6], [2, 1], [8, 1], [9, 6]] },
  { kind: 'rectangle', pts: [[1, 2], [7, 2], [7, 6], [1, 6]] },
  { kind: 'square', pts: [[2, 1], [6, 1], [6, 5], [2, 5]] },
  { kind: 'parallelogram', pts: [[1, 1], [6, 1], [8, 4], [3, 4]] },
  { kind: 'trapezoid', pts: [[1, 1], [8, 1], [6, 5], [3, 5]] },
  { kind: 'triangle', pts: [[1, 1], [4, 1], [2, 3]] },
]
/** 特殊与一般：正方形也是长方形、平行四边形，长方形也是平行四边形——这些不和答案一起出 */
const SHAPE_CLASH: Partial<Record<ShapeKind, ShapeKind[]>> = { square: ['rectangle', 'parallelogram'], rectangle: ['parallelogram'] }
function qShape(d: Difficulty, rng: RNG, blank = false): Question {
  const at = d === 1 && rng.chance(0.4) ? 0 : rng.int(0, SHAPES.length - 1)
  const s = SHAPES[at]!
  const maxX = Math.max(...s.pts.map((p) => p[0]))
  const maxY = Math.max(...s.pts.map((p) => p[1]))
  const minX = Math.min(...s.pts.map((p) => p[0]))
  const minY = Math.min(...s.pts.map((p) => p[1]))
  const dx = at === 0 ? 0 : rng.int(-minX, 10 - maxX)
  const dy = at === 0 ? 0 : rng.int(-minY, 10 - maxY)
  const pts = s.pts.map(([x, y]): [number, number] => [x + dx, y + dy])
  // 点和点之间用逗号（朗读停一下；顿号不停，字母会粘到上一个数后面）；英文写半角括号
  const one = pts.map(([x, y], i): LStr => L('pt.one', { p: LETTERS[i]!, x, y }))
  const text = L(`pts.${pts.length}`, Object.fromEntries(one.map((v, i) => ['abcde'[i]!, v])))
  const items: PairItem[] = blank ? [] : pts.map(([x, y], i) => ({ x, y, tag: LETTERS[i]! }))
  const grid = pointGrid(10, 10, items, blank ? '0 到 10 的方格图' : `0 到 10 的方格图，标出了 ${pts.length} 个点`)
  const pool: ShapeKind[] = ['triangle', 'rectangle', 'square', 'parallelogram', 'trapezoid', 'pentagon', 'hexagon']
  const wrongs = rng
    .shuffle(pool.filter((k) => k !== s.kind && !(SHAPE_CLASH[s.kind] ?? []).includes(k)))
    .slice(0, 3)
    .map((k): LStr => ({ k: `shape.${k}` }))
  return pick(K1, 'position', d, `shape-${s.kind}-${dx}-${dy}${blank ? '-blank' : ''}`, [T('shape.ask', { pts: text }), grid], { k: `shape.${s.kind}` }, wrongs, rng)
}

/** 练习一 3（涂色格）、练习二 1（格子柜，药名换成水果） */
const FRUITS = ['🍎', '🍌', '🍇', '🍊', '🍓', '🍑', '🍐', '🍉']
function qCells(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.35)) {
    const cols = rng.int(7, 10)
    const rows = rng.int(5, 8)
    const c = rng.int(1, cols)
    const r = rng.int(1, rows)
    const grid: StemPart = { kind: 'pair-grid', mode: 'cells', cols, rows, items: [{ x: c, y: r, fill: 'red' }], alt: `${cols} 列 ${rows} 行的格子，有一格涂了颜色` }
    return pairQ(K1, d, `paint-${cols}x${rows}-${c}-${r}`, [T('cell.read'), grid], c, r, rng, { min: 1, maxX: cols, maxY: rows })
  }
  const cols = rng.int(6, 8)
  const rows = rng.int(4, 5)
  const c = rng.int(1, cols)
  const r = rng.int(1, rows)
  const spots: [number, number][] = [[c, r]]
  if (c !== r && r <= cols && c <= rows) spots.push([r, c])
  while (spots.length < 5) {
    const p: [number, number] = [rng.int(1, cols), rng.int(1, rows)]
    if (!spots.some(([a, b]) => a === p[0] && b === p[1])) spots.push(p)
  }
  const icons = rng.shuffle(FRUITS).slice(0, spots.length)
  const items: PairItem[] = spots.map(([x, y], i) => ({ x, y, icon: icons[i]! }))
  const grid: StemPart = { kind: 'pair-grid', mode: 'cells', cols, rows, items, alt: `${cols} 列 ${rows} 行的格子柜，有几格里放着水果` }
  const sig = `cab-${cols}x${rows}-${spots.map((q) => q.join('.')).join('_')}-${icons.join('')}`
  if (rng.chance(0.5)) return pairQ(K1, d, `${sig}-where`, [T('cell.where', { icon: icons[0]! }), grid], c, r, rng, { min: 1, maxX: cols, maxY: rows })
  return pick(K1, 'position', d, `${sig}-what`, [T('cell.what', { x: c, y: r }), grid], icons[0]!, icons.slice(1, 4), rng)
}

/** 练习二 2 的校园平面图（课本）：教学楼（2，5）、体育馆（1，2）、图书馆（4，3）、食堂（6，1），要标的花坛（6，5）、实验室（4，1）、小操场（8，6）、篮球场（7，4） */
export const CAMPUS: [string, number, number][] = [
  ['teach', 2, 5],
  ['gym', 1, 2],
  ['library', 4, 3],
  ['canteen', 6, 1],
  ['flowerbed', 6, 5],
  ['lab', 4, 1],
  ['field', 8, 6],
  ['court', 7, 4],
]
function qPlaces(d: Difficulty, rng: RNG): Question {
  const items: PairItem[] = CAMPUS.map(([id, x, y]) => ({ x, y, name: place(id) }))
  const grid = pointGrid(9, 7, items, '校园平面图：横着 0 到 9、竖着 0 到 7，标出了八个地方')
  const [id, x, y] = rng.pick(CAMPUS.slice(1))
  if (rng.chance(0.5)) return pairQ(K1, d, `campus-${id}`, [T('place.read', { a: place('teach'), x: 2, y: 5, b: place(id) }), grid], x, y, rng, { maxX: 9, maxY: 7 })
  const wrongs = rng
    .shuffle(CAMPUS.filter((c) => c[0] !== id))
    .sort((p, q) => Number(p[1] === y && p[2] === x) - Number(q[1] === y && q[2] === x))
    .slice(0, 3)
    .map((c) => place(c[0]))
  return pick(K1, 'position', d, `campus-what-${id}`, [T('place.what', { x, y }), grid], place(id), wrongs, rng)
}

/** 练习一 4：三角形 A（1，1）B（4，1）C（2，3）向右、向上平移 5 个单位（也用别的图形、别的格数） */
function qTranslate(d: Difficulty, rng: RNG): Question {
  const s = rng.chance(0.5) ? SHAPES[5]! : rng.pick(SHAPES.slice(1, 5))
  const right = rng.chance(0.5)
  const maxX = Math.max(...s.pts.map((p) => p[0]))
  const maxY = Math.max(...s.pts.map((p) => p[1]))
  const n = s === SHAPES[5] && rng.chance(0.5) ? 5 : rng.int(2, Math.max(2, 10 - (right ? maxX : maxY)))
  const items: PairItem[] = s.pts.map(([x, y], i) => ({ x, y, tag: LETTERS[i]! }))
  const grid = pointGrid(10, 10, items, `0 到 10 的方格图上画着一个${s.kind === 'triangle' ? '三角形' : '四边形'}，顶点是 ${s.pts.map((_, i) => LETTERS[i]).join('、')}`, { shapes: [{ pts: s.pts, closed: true }] })
  if (rng.chance(0.3))
    return pick(K1, 'position', d, `movewhich-${right ? 'r' : 'u'}`, [T(right ? 'move.which' : 'move.whichUp'), grid], L(right ? 'first' : 'second'), [L(right ? 'second' : 'first'), L('both')], rng)
  const at = rng.int(0, s.pts.length - 1)
  const [x, y] = s.pts[at]!
  const [nx, ny] = right ? [x + n, y] : [x, y + n]
  const wrongDir: [number, number] = right ? [x, y + n] : [x + n, y]
  return pairQ(K1, d, `move-${s.kind}-${right ? 'r' : 'u'}-${n}-${at}`, [T(right ? 'move.right' : 'move.up', { n, p: LETTERS[at]! }), grid], nx, ny, rng, { first: [wrongDir, [x + n, y + n]] })
}

/** 练习一 5：分拣机器人（课本：从③号（3，0）→（3，1）→（7，1）→（7，8）投到江西（8，8），一共 12 格） */
const ROBOT_MARKS = [
  ...[2, 4, 6, 8, 10].flatMap((x) => [2, 4, 6, 8, 10].map((y) => ({ x, y, t: 'tri' as const }))),
  ...Array.from({ length: 11 }, (_, i) => ({ x: i + 1, y: 0, t: 'dot' as const, n: i + 1 })),
]
function qRobot(d: Difficulty, rng: RNG): Question {
  const textbook = rng.chance(0.35)
  const k = textbook ? 3 : rng.int(1, 11)
  let x = textbook ? 7 : rng.pick([1, 3, 5, 7, 9, 11])
  while (x === k) x = rng.pick([1, 3, 5, 7, 9, 11])
  const y = textbook ? 8 : rng.pick([2, 4, 6, 8])
  const route: [number, number][] = [[k, 0], [k, 1], [x, 1], [x, y]]
  // 图只画到这一行再往上一行（课本的图有 11 行，手机上太高）
  const rows = y + 1
  const grid: StemPart = { kind: 'pair-grid', mode: 'points', cols: 11, rows, marks: ROBOT_MARKS.filter((m) => m.y <= rows), route, alt: '分拣机器人工作图：下面一排是 1 到 11 号传递口，三角是投递口，虚线是机器人走的路线' }
  if (d === 2 && rng.chance(0.3)) {
    const across = rng.chance(0.5)
    return pick(K1, 'position', d, `robot-same-${across ? 'h' : 'v'}`, [T(across ? 'robot.same' : 'robot.sameV'), grid], L(across ? 'second' : 'first'), [L(across ? 'first' : 'second')], rng)
  }
  const steps = 1 + Math.abs(x - k) + (y - 1)
  return num(K1, 'position', d, `robot-${k}-${x}-${y}`, [T('robot.steps', { a: k, x, y }), grid], steps, rng, [steps - 1, steps + 1, steps + 3])
}

/** 练习二 7 的平面图（课本）：每格 100 米，学校（0，0），邮局（1，7）、商场（7，9）、体育馆（3，6）、少年宫（6，5）、公园（9，5）、图书馆（4，3）、医院（8，2） */
export const TOWN: [string, number, number][] = [
  ['post', 1, 7],
  ['mall', 7, 9],
  ['gym', 3, 6],
  ['palace', 6, 5],
  ['park', 9, 5],
  ['library', 4, 3],
  ['hospital', 8, 2],
]
const townGrid = (): StemPart => ({
  kind: 'pair-grid',
  mode: 'points',
  cols: 10,
  rows: 10,
  north: true,
  per: '100 m',
  items: [{ x: 0, y: 0, name: place('school') }, ...TOWN.map(([id, x, y]): PairItem => ({ x, y, name: place(id) }))],
  alt: '平面图：每格表示 100 米，学校在（0，0），标出了邮局、商场、体育馆、少年宫、公园、图书馆、医院',
})
/** 练习二 7 (3)：王玲的路线（课本：（3，4）→ 图书馆（4，3）→ 少年宫（6，5）→ 体育馆（3，6）→ 回家） */
function qTownRoute(d: Difficulty, rng: RNG): Question {
  const stops = rng.chance(0.4) ? (['library', 'palace', 'gym'] as const).map((id) => TOWN.find((t) => t[0] === id)!) : rng.shuffle(TOWN).slice(0, 3)
  const k = rng.int(1, 3)
  const right = stops[k - 1]!
  const wrongs = [...stops.filter((s) => s !== right), rng.pick(TOWN.filter((t) => !stops.includes(t)))].map((s) => place(s[0]))
  const p: P = { k: L(`th.${k}`) }
  stops.forEach(([, x, y], i) => {
    p[`x${i + 1}`] = x
    p[`y${i + 1}`] = y
  })
  return pick(K1, 'position', d, `town-${stops.map((s) => s[0]).join('.')}-${k}`, [T('wl.route', p), townGrid()], place(right[0]), wrongs, rng)
}
/** 练习二 7 (1)(2)：以东多少米、往北多少米；以东 300 米、往北 400 米是哪个有序数对（王玲家（3，4）、赵华家（8，7）） */
function qEastNorth(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.35)) {
    const [who, e, n] = rng.pick([
      ['wlHome', 3, 4],
      ['zhHome', 8, 7],
      ['xhHome', rng.int(1, 9), rng.int(1, 9)],
    ] as [string, number, number][])
    return pairQ(K1, d, `en-pair-${who}-${e}-${n}`, [T('en.pair', { a: place(who), e: e * 100, n: n * 100 })], e, n, rng, { first: [[e * 100, n * 100]], maxX: 1000, maxY: 1000 })
  }
  const [id, x, y] = rng.pick(TOWN)
  const east = rng.chance(0.5)
  const v = (east ? x : y) * 100
  return num(K1, 'position', d, `en-${east ? 'e' : 'n'}-${id}`, [T(east ? 'en.east' : 'en.north', { a: place(id), x, y }), townGrid()], v, rng, [(east ? y : x) * 100, v + 100, v / 100, v - 100])
}
/** 练习一 2：电影院（课本：小刚 8 排 10 号；前一排也是 10 号 = 7 排 10 号；同一排 1 号 = 8 排 1 号），只问几排几号 */
function qCinema(d: Difficulty, rng: RNG): Question {
  const textbook = rng.chance(0.4)
  const r = textbook ? 8 : rng.int(3, 11)
  const s = textbook ? 10 : rng.int(2, 18)
  const seat = (a: number, b: number): LStr => L('seat', { r: ord(a), s: ord(b) })
  const opts = (right: [number, number], wrongs: [number, number][]): LStr[] =>
    wrongs.filter(([a, b], i) => a >= 1 && b >= 1 && a <= 20 && b <= 20 && !(a === right[0] && b === right[1]) && wrongs.findIndex((w) => w[0] === a && w[1] === b) === i).slice(0, 3).map(([a, b]) => seat(a, b))
  if (rng.chance(0.5))
    return pick(K1, 'position', d, `cinema-front-${r}-${s}`, [T('cinema.front', { r: ord(r), s: ord(s) })], seat(r - 1, s), opts([r - 1, s], [[r + 1, s], [r, s - 1], [s, r - 1], [r, s + 1]]), rng)
  return pick(K1, 'position', d, `cinema-same-${r}-${s}`, [T('cinema.same', { r: ord(r), s: ord(s) })], seat(r, 1), opts([r, 1], [[1, r], [r - 1, 1], [r, s], [1, s]]), rng)
}
/** 整理和复习：直线上用一个数、平面内用两个数 */
function qDims(d: Difficulty, rng: RNG): Question {
  const line = rng.chance(0.5)
  return num(K1, 'position', d, `dims-${line ? 'line' : 'plane'}`, [T(line ? 'dims.line' : 'dims.plane')], line ? 1 : 2, rng, [line ? 2 : 1, 3])
}
/** 练习一 1（举例子改成选）：电影票上的八排十号 */
function qLife(d: Difficulty, rng: RNG): Question {
  return pick(K1, 'position', d, 'life', [T('life.ask')], L('life.ticket'), [L('life.height'), L('life.price'), L('life.rope')], rng)
}
/** 第 3 档：先向右 / 左、再向上 / 下平移 */
function qTwoMoves(d: Difficulty, rng: RNG): Question {
  const x = rng.int(2, 7)
  const y = rng.int(2, 7)
  const [d1, dx] = rng.chance(0.5) ? ['mv.r', 1] : ['mv.l', -1]
  const [d2, dy] = rng.chance(0.5) ? ['mv.u', 1] : ['mv.d', -1]
  const a = rng.int(1, Math.min(4, dx > 0 ? 10 - x : x))
  const b = rng.int(1, Math.min(4, dy > 0 ? 10 - y : y))
  const nx = x + dx * a
  const ny = y + dy * b
  return pairQ(K1, d, `two-${x}-${y}-${d1}${a}-${d2}${b}`, [T('move.two', { x, y, d1: L(d1), a, d2: L(d2), b })], nx, ny, rng, { first: [[x + dx * b, y + dy * a], [x - dx * a, y - dy * b]] })
}
/** 第 3 档：同一行的两个格子中间隔着几格 */
function qGap(d: Difficulty, rng: RNG): Question {
  const y = rng.int(1, 9)
  const x1 = rng.int(1, 8)
  const x2 = rng.int(x1 + 2, Math.min(17, x1 + 10))
  return num(K1, 'position', d, `gap-${x1}-${x2}-${y}`, [T('gap', { x1, x2, y })], x2 - x1 - 1, rng, [x2 - x1, x2 - x1 + 1])
}

function pairs(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 例 1、例 2、做一做 1、2，练习一 3，练习二 1、2
    if (roll < 0.13) return qSeatRead(d, rng)
    if (roll < 0.23) return qSeatFind(d, rng)
    if (roll < 0.33) return qSeatText(d, rng)
    if (roll < 0.43) return qOrder(d, rng)
    if (roll < 0.57) return qPointRead(d, rng)
    if (roll < 0.65) return qPointFind(d, rng)
    if (roll < 0.75) return qSameLine(d, rng)
    if (roll < 0.84) return qShape(d, rng)
    if (roll < 0.92) return qCells(d, rng)
    return qPlaces(d, rng)
  }
  if (d === 2) {
    // 练习一 1、2、4、5，练习二 7，整理和复习，轴上的点，只给空方格的连线
    if (roll < 0.18) return qTranslate(d, rng)
    if (roll < 0.32) return qRobot(d, rng)
    if (roll < 0.44) return qTownRoute(d, rng)
    if (roll < 0.58) return qEastNorth(d, rng)
    if (roll < 0.7) return qCinema(d, rng)
    if (roll < 0.78) return qPointRead(d, rng, true)
    if (roll < 0.84) return qDims(d, rng)
    if (roll < 0.9) return qLife(d, rng)
    return qShape(d, rng, true)
  }
  if (roll < 0.4) return qTwoMoves(d, rng)
  if (roll < 0.7) return qGap(d, rng)
  return qRobot(d, rng)
}
defineGenerator(K1, pairs)

// ══ 用方向和距离确定位置（m6s1-01-bearing）══

interface MapPlace {
  id: string
  dir: Bearing
  segs: number
}
export interface MapSpec {
  key: string
  center: string
  per: number
  axes: 'n' | 'all'
  places: MapPlace[]
}
/** 例 3：渔船在搜救船东偏南 25°，1500 米（每段 500 米） */
export const MAP_SHIP: MapSpec = { key: 'ship', center: 'rescue', per: 500, axes: 'n', places: [{ id: 'fishing', dir: { base: 'e', side: 's', deg: 25 }, segs: 3 }] }
/** 做一做 2：人民广场（量得：市政府正西 400、公园北偏西 45° 300、工人文化宫东偏北 30° 300、科技大厦 → 科技馆南偏东 30° 400、银行 → 超市西偏南 40° 300） */
export const MAP_PLAZA: MapSpec = {
  key: 'plaza',
  center: 'plaza',
  per: 100,
  axes: 'all',
  places: [
    { id: 'cityhall', dir: { base: 'w' }, segs: 4 },
    { id: 'park', dir: { base: 'n', side: 'w', deg: 45 }, segs: 3 },
    { id: 'culture', dir: { base: 'e', side: 'n', deg: 30 }, segs: 3 },
    { id: 'science', dir: { base: 's', side: 'e', deg: 30 }, segs: 4 },
    { id: 'market', dir: { base: 'w', side: 's', deg: 40 }, segs: 3 },
  ],
}
/** 练习二 3：小明家（学校北偏东 25° 400、书店东偏南 30° 200、邮局西偏南 40° 600、游泳馆西偏北 40° 600，每段 200 米） */
export const MAP_HOME: MapSpec = {
  key: 'home',
  center: 'xmHome',
  per: 200,
  axes: 'all',
  places: [
    { id: 'school', dir: { base: 'n', side: 'e', deg: 25 }, segs: 2 },
    { id: 'bookstore', dir: { base: 'e', side: 's', deg: 30 }, segs: 1 },
    { id: 'post', dir: { base: 'w', side: 's', deg: 40 }, segs: 3 },
    { id: 'pool', dir: { base: 'w', side: 'n', deg: 40 }, segs: 3 },
  ],
}
/** 做一做 3：学校四周的四家（量得：小刚家北偏东 45° 1000、小芳家西偏北 35° 600、小红家西偏南 15° 800、小亮家南偏东 30° 800） */
export const MAP_SCHOOL: MapSpec = {
  key: 'school',
  center: 'school',
  per: 200,
  axes: 'n',
  places: [
    { id: 'xgHome', dir: { base: 'n', side: 'e', deg: 45 }, segs: 5 },
    { id: 'xfHome', dir: { base: 'w', side: 'n', deg: 35 }, segs: 3 },
    { id: 'xhHome', dir: { base: 'w', side: 's', deg: 15 }, segs: 4 },
    { id: 'xlHome', dir: { base: 's', side: 'e', deg: 30 }, segs: 4 },
  ],
}
const CENTERS = ['school', 'plaza', 'park', 'palace', 'tower', 'xmHome']
const SPOTS = ['post', 'bookstore', 'hospital', 'mall', 'gym', 'library', 'museum', 'zoo', 'pool', 'market', 'science', 'park', 'palace', 'tower', 'school']
/** 自己定的地图：每个象限最多一个地方（角弧不打架） */
function randMap(rng: RNG, count = rng.int(1, 3)): MapSpec {
  const center = rng.pick(CENTERS)
  const ids = rng.shuffle(SPOTS.filter((s) => s !== center)).slice(0, count)
  const qs = rng.shuffle([0, 1, 2, 3])
  const per = rng.pick([50, 100, 200, 500])
  const places = ids.map((id, i): MapPlace => ({ id, dir: randBearing(rng, qs[i]!), segs: rng.int(2, 5) }))
  return { key: `r-${center}-${per}-${places.map((p) => `${p.id}.${bKey(p.dir)}.${p.segs}`).join('_')}`, center, per, axes: rng.chance(0.5) ? 'all' : 'n', places }
}
function mapPart(m: MapSpec, arc: 'base' | 'other' = 'base', only?: string): StemPart {
  const places: BearingPlace[] = m.places.map((p) => ({ dir: p.dir, segs: p.segs, name: place(p.id), arc: p.dir.side && (!only || only === p.id) ? arc : undefined }))
  return { kind: 'bearing-map', center: place(m.center), axes: m.axes, places, per: `${m.per} m`, alt: `方向图：参照点在十字中间，四周有 ${m.places.length} 个地方，画了方向角和一小段一小段的刻度，每一小段表示 ${m.per} 米` }
}
/** 第 1 档用到的地图：课本的四幅多一些 */
function pickMap(rng: RNG): MapSpec {
  const r = rng.next()
  if (r < 0.18) return MAP_SHIP
  if (r < 0.38) return MAP_PLAZA
  if (r < 0.55) return MAP_HOME
  if (r < 0.7) return MAP_SCHOOL
  return randMap(rng)
}

/** 例 3 想一想：只用距离不能确定准确位置（离搜救船 1500 米的地方有很多个） */
function qOnly(d: Difficulty, rng: RNG): Question {
  const dist = rng.chance(0.5) ? 1500 : rng.pick([800, 1000, 1200, 2000])
  if (rng.chance(0.5)) return pick(K2, 'direction', d, `only-${dist}`, [T('b.only', { a: place('fishing'), b: place('rescue'), d: dist })], L('cannot'), [L('can')], rng)
  return pick(K2, 'direction', d, `many-${dist}`, [T('b.many', { b: place('rescue'), d: dist })], L('many'), [L('one')], rng)
}
/** 例 3 结论：确定位置要知道方向和距离 */
const qNeed = (d: Difficulty, rng: RNG): Question => pick(K2, 'direction', d, 'need', [T('b.need')], L('b.dd'), [L('b.dOnly'), L('b.lOnly')], rng)
/** 做一做 2「以人民广场为参照点」：说 A 在 B 的什么方向上时，参照点是 B */
function qRef(d: Difficulty, rng: RNG): Question {
  const m = rng.chance(0.5) ? MAP_PLAZA : rng.pick([MAP_HOME, MAP_SCHOOL])
  const p = rng.pick(m.places)
  const third = rng.pick(m.places.filter((q) => q !== p))
  return pick(K2, 'direction', d, `ref-${m.key}-${p.id}`, [T('b.ref', { a: place(p.id), b: place(m.center), dir: dirL(p.dir) })], place(m.center), [place(p.id), place(third.id)], rng)
}
/** 例 3、做一做 2、练习二 3：看图说方向 */
function qReadDir(d: Difficulty, rng: RNG, m: MapSpec = pickMap(rng)): Question {
  const p = rng.pick(m.places)
  return dirQ(K2, d, `dir-${m.key}-${p.id}`, [T('b.dir', { a: place(p.id), b: place(m.center) }), mapPart(m)], p.dir, rng)
}
/** 做一做 2 (2)(3)：在北偏西多少度方向上（弧量在 base 那条线上；第 2 档量在另一条线上，要算 90 − 度数） */
function qReadDeg(d: Difficulty, rng: RNG, otherArc = false): Question {
  let m = pickMap(rng)
  while (!m.places.some((p) => p.dir.side)) m = pickMap(rng)
  const p = rng.pick(m.places.filter((q) => q.dir.side))
  return num(K2, 'direction', d, `deg-${m.key}-${p.id}${otherArc ? '-other' : ''}`, [T('b.deg', { a: place(p.id), b: place(m.center), dn: dnL(p.dir) }), mapPart(m, otherArc ? 'other' : 'base', p.id)], p.dir.deg!, rng, degWrongs(p.dir.deg!))
}
/** 例 3：东偏南 25° 也可以说成南偏东多少度（65） */
function qComp(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.35)) {
    const b: Bearing = { base: 'e', side: 's', deg: 25 }
    return num(K2, 'direction', d, 'comp-ship', [T('b.comp', { a: place('fishing'), b: place('rescue'), dir: dirL(b), dn: dnL(other(b)) })], 65, rng, [25, 75])
  }
  const b = randBearing(rng)
  if (rng.chance(0.4)) b.deg = rng.pick([50, 55, 60, 65, 70, 75, 80])
  return num(K2, 'direction', d, `comp-${bKey(b)}`, [T('b.comp2', { dir: dirL(b), dn: dnL(other(b)) })], 90 - b.deg!, rng, [b.deg!, 180 - b.deg!])
}
/** 例 3：两种说法是同一个方向；两个字换了位置、度数没变的不是 */
function qSame(d: Difficulty, rng: RNG): Question {
  const b = rng.chance(0.3) ? ({ base: 'e', side: 's', deg: 25 } as Bearing) : randBearing(rng)
  const kind = rng.pick(['other', 'swap', 'flip'] as const)
  const c = kind === 'other' ? other(b) : kind === 'swap' ? swapWords(b) : flipEW(b)
  return tf(K2, 'direction', d, `same-${bKey(b)}-${kind}`, [T('b.same', { d1: dirL(b), d2: dirL(c) })], kind === 'other', rng)
}
/** 例 3 机器人：习惯用不大于 45° 的角（南偏东 65° → 东偏南 25°） */
function qHabit(d: Difficulty, rng: RNG): Question {
  const b = d === 1 && rng.chance(0.35) ? ({ base: 's', side: 'e', deg: 65 } as Bearing) : { ...randBearing(rng), deg: rng.pick([50, 55, 60, 65, 70, 75, 80]) }
  const h = other(b)
  const wrongs: Bearing[] = [swapWords(b), { base: b.base, side: b.side!, deg: 90 - b.deg! }, flipNS(h), flipEW(h)]
  return dirQ(K2, d, `habit-${bKey(b)}`, [T('b.habit', { dir: dirL(b) })], h, rng, wrongs)
}
/** 做一做 2、练习二 3：数小段算距离 */
function qReadDist(d: Difficulty, rng: RNG): Question {
  const m = pickMap(rng)
  const p = rng.pick(m.places)
  return num(K2, 'direction', d, `dist-${m.key}-${p.id}`, [T('b.dist', { per: m.per, a: place(p.id), b: place(m.center) }), mapPart(m)], p.segs * m.per, rng, [(p.segs - 1) * m.per, (p.segs + 1) * m.per, p.segs, (p.segs + 2) * m.per])
}
/** 例 3：图上 3 厘米表示实际 1500 米 */
function qReal(d: Difficulty, rng: RNG): Question {
  const [per, cm] = rng.chance(0.35) ? [500, 3] : [rng.pick([50, 100, 200, 500, 1000]), rng.int(2, 6)]
  const [a, b] = per === 500 && cm === 3 ? ['fishing', 'rescue'] : rng.pick([['fishing', 'rescue'], ['cargo', 'lighthouse'], ['post', 'school'], ['park', 'plaza']])
  return num(K2, 'direction', d, `real-${per}-${cm}-${a}`, [T('b.real', { per, a: place(a!), b: place(b!), cm })], per * cm, rng, [per + cm, per * (cm - 1)])
}
/** 例 4：1000 米要用 2 厘米表示 */
function qCm(d: Difficulty, rng: RNG): Question {
  const [per, cm] = rng.chance(0.35) ? [500, 2] : [rng.pick([50, 100, 200, 500, 1000]), rng.int(2, 6)]
  const [a, b] = per === 500 && cm === 2 ? ['cargo', 'rescue'] : rng.pick([['cargo', 'rescue'], ['fishing', 'lighthouse'], ['library', 'school'], ['zoo', 'tower']])
  return num(K2, 'direction', d, `cm-${per}-${cm}-${a}`, [T('b.cm', { a: place(a!), b: place(b!), d: per * cm, per })], cm, rng, [cm + 1, cm * 2])
}
/** 两条射线在图上分得开（角弧、字母不挤在一起） */
const apart = (a: Bearing, b: Bearing, gap = 25): boolean => Math.abs(((azimuth(a) - azimuth(b) + 540) % 360) - 180) >= gap
/** 例 4：货船在搜救船北偏西 40°、1000 米，图上四个点选一个（错的：东西反、从另一条线量 / 南北反、远了一段） */
function qLocate(d: Difficulty, rng: RNG): Question {
  const textbook = rng.chance(0.4)
  const b: Bearing = textbook ? { base: 'n', side: 'w', deg: 40 } : randBearing(rng)
  const per = textbook ? 500 : rng.pick([100, 200, 500])
  const segs = textbook ? 2 : rng.int(2, 3)
  const cands: { dir: Bearing; segs: number }[] = [{ dir: b, segs }, { dir: flipEW(b), segs }, { dir: b, segs: segs + 1 }]
  cands.push({ dir: apart(b, swapWords(b)) ? swapWords(b) : flipNS(b), segs })
  const order = rng.shuffle([0, 1, 2, 3])
  const places: BearingPlace[] = order.map((i, k) => ({ dir: cands[i]!.dir, segs: cands[i]!.segs, tag: LETTERS[k]!, arc: 'base' }))
  const tagOf = (i: number): string => LETTERS[order.indexOf(i)]!
  const [a, c] = textbook ? ['cargo', 'rescue'] : rng.pick([['cargo', 'rescue'], ['fishing', 'lighthouse'], ['museum', 'school'], ['zoo', 'tower']])
  const map: StemPart = { kind: 'bearing-map', center: place(c!), places, per: `${per} m`, alt: `方向图：${c === 'rescue' ? '搜救船' : '参照点'}在十字中间，四个点标着 A、B、C、D，每一小段表示 ${per} 米` }
  return pick(K2, 'direction', d, `locate-${bKey(b)}-${segs}-${per}-${a}-${order.join('')}`, [T('b.locate', { a: place(a!), b: place(c!), dir: dirL(b), d: per * segs, per }), map], tagOf(0), [1, 2, 3].map(tagOf), rng)
}
/** 做一做 p7 1（画方向改成选射线）：A 岛的西偏北 30°、西偏南 40°、东偏南 20°（课本），射线编号 1–4 */
function qRay(d: Difficulty, rng: RNG): Question {
  const b: Bearing = rng.chance(0.5) ? rng.pick([{ base: 'w', side: 'n', deg: 30 }, { base: 'w', side: 's', deg: 40 }, { base: 'e', side: 's', deg: 20 }] as Bearing[]) : randBearing(rng)
  const rays: Bearing[] = [b]
  for (const c of [swapWords(b), flipEW(b), flipNS(b), reverse(b), randBearing(rng), randBearing(rng)]) {
    if (rays.length === 4) break
    if (rays.every((r) => apart(r, c))) rays.push(c)
  }
  const order = rng.shuffle(rays.map((_, i) => i))
  const places: BearingPlace[] = order.map((i, k) => ({ dir: rays[i]!, segs: 3, tag: String(k + 1), arc: 'base', ticks: false, dot: false }))
  const noOf = (i: number): LStr => L('no.n', { n: order.indexOf(i) + 1 })
  const map: StemPart = { kind: 'bearing-map', center: place('island'), places, alt: `A 岛在十字中间，画了 ${rays.length} 条编号的射线，每条都标了角度` }
  return pick(K2, 'direction', d, `ray-${rays.map(bKey).join('.')}-${order.join('')}`, [T('b.ray', { b: place('island'), dir: dirL(b) }), map], noOf(0), rays.slice(1).map((_, i) => noOf(i + 1)), rng)
}
/** 做一做 p8 2：标建筑要画几小段（课本：教学楼正北 150 米、图书馆北偏东 35° 150 米、体育馆西偏北 40° 200 米，每段 50 米） */
export const GATE: [string, Bearing, number][] = [
  ['teach', { base: 'n' }, 150],
  ['library', { base: 'n', side: 'e', deg: 35 }, 150],
  ['gym', { base: 'w', side: 'n', deg: 40 }, 200],
]
function qSegs(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    const [id, b, dist] = rng.pick(GATE)
    return num(K2, 'direction', d, `segs-gate-${id}`, [T('b.segs', { a: place(id), b: place('gate'), dir: dirL(b), d: dist, per: 50 })], dist / 50, rng, [dist / 100, dist / 50 + 1])
  }
  const per = rng.pick([50, 100, 200, 500])
  const n = rng.int(2, 6)
  const b = randBearing(rng)
  const [a, c] = rng.pick([['museum', 'tower'], ['zoo', 'school'], ['hospital', 'park'], ['library', 'gate']])
  return num(K2, 'direction', d, `segs-${a}-${bKey(b)}-${per}-${n}`, [T('b.segs', { a: place(a!), b: place(c!), dir: dirL(b), d: per * n, per })], n, rng, [n + 1, n * 2])
}
/** 做一做 3：反过来说（小刚家在学校北偏东 45° → 学校在小刚家南偏西 45°）；也出判断 */
function qRev(d: Difficulty, rng: RNG): Question {
  const [a, b, dir, dist] = rng.chance(0.5)
    ? (() => {
        const p = rng.pick(MAP_SCHOOL.places)
        return [p.id, 'school', p.dir, p.segs * 200] as [string, string, Bearing, number]
      })()
    : ([rng.pick(['museum', 'zoo', 'park', 'post']), rng.pick(['tower', 'school']), randBearing(rng), rng.int(2, 9) * 100] as [string, string, Bearing, number])
  const rev = reverse(dir)
  if (d === 1 && rng.chance(0.3)) {
    const right = rng.chance(0.5)
    const shown = right ? rev : rng.pick([dir, flipEW(rev), flipNS(rev)])
    return tf(K2, 'direction', d, `revtf-${a}-${b}-${bKey(dir)}-${bKey(shown)}-${dist}`, [T('b.revTf', { a: place(a), b: place(b), dir: dirL(dir), d: dist, rdir: dirL(shown) })], right, rng)
  }
  const wrongs: Bearing[] = [dir, { base: rev.base, side: dir.side, deg: dir.deg } as Bearing, { base: dir.base, side: rev.side, deg: dir.deg } as Bearing]
  return dirQ(K2, d, `rev-${a}-${b}-${bKey(dir)}`, [T('b.rev', { a: place(a), b: place(b), dir: dirL(dir) })], rev, rng, wrongs.filter((w) => !w.side || w.side !== w.base))
}
/** 练习二 3 (4)：游泳馆在邮局的正北方向上（两处都在小明家西边 40°、一样远） */
function qSym(d: Difficulty, rng: RNG): Question {
  const up = rng.chance(0.5)
  const [a, b, ans] = up ? ['pool', 'post', 'n'] : ['post', 'pool', 's']
  return dirQ(K2, d, `sym-${a}`, [T('b.dir', { a: place(a), b: place(b) }), mapPart(MAP_HOME)], { base: ans as Dir4 }, rng)
}
/** 练习二 4 (3)(4)：电视塔在博物馆的东偏南 20°（→ 博物馆在电视塔西偏北 20°）、电视塔在动物园的西偏北 40°（→ 动物园在电视塔东偏南 40°） */
function qRev2(d: Difficulty, rng: RNG): Question {
  const [x, dir] = rng.chance(0.5) ? rng.pick([['museum', { base: 'e', side: 's', deg: 20 }], ['zoo', { base: 'w', side: 'n', deg: 40 }]] as [string, Bearing][]) : [rng.pick(['museum', 'zoo', 'park']), randBearing(rng)]
  if (rng.chance(0.25)) {
    const km = rng.pick([1.5, 2, 2.5, 3])
    return num(K2, 'direction', d, `rev2km-${x}-${bKey(dir)}-${km}`, [T('b.segsKm', { a: place('tower'), b: place(x), dir: dirL(dir), d: km, per: 0.5 })], km * 2, rng, [km, km * 2 + 1])
  }
  return dirQ(K2, d, `rev2-${x}-${bKey(dir)}`, [T('b.rev', { a: place('tower'), b: place(x), dir: dirL(dir) })], reverse(dir), rng, [dir, flipEW(reverse(dir))])
}
/** 练习二 4、5：千米换成小段（1 千米、2.5 千米每段 500 米；油井 45 千米每段 15 千米） */
function qKm(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.4)) {
    const textbook = rng.chance(0.5)
    const per = textbook ? 15 : rng.pick([5, 10, 15, 20])
    const n = textbook ? 3 : rng.int(2, 6)
    const b: Bearing = textbook ? { base: 'e', side: 'n', deg: 40 } : randBearing(rng)
    return num(K2, 'direction', d, `oil-${per}-${n}-${bKey(b)}`, [T('b.segsKm', { a: place('oil'), b: place('cityA'), dir: dirL(b), d: per * n, per })], n, rng, [n + 1, per])
  }
  const km = rng.pick([1, 1.5, 2, 2.5, 3])
  return num(K2, 'direction', d, `km-${km}`, [T('b.kmSegs', { per: 500, d: km })], km * 2, rng, [km, km * 2 + 1])
}
/** 北偏东 45° 就是东北（连四上「寻找宝藏」的八个方向） */
function qD8(d: Difficulty, rng: RNG): Question {
  const q = rng.pick(['ne', 'se', 'sw', 'nw'] as const)
  const [a, b] = q.split('') as [Dir4, Dir4]
  const dir: Bearing = rng.chance(0.5) ? { base: a, side: b, deg: 45 } : { base: b, side: a, deg: 45 }
  return pick(K2, 'direction', d, `d8-${bKey(dir)}`, [T('b.d8', { dir: dirL(dir) })], L(`d8.${q}`), (['ne', 'se', 'sw', 'nw'] as const).filter((x) => x !== q).map((x) => L(`d8.${x}`)), rng)
}
/** 练习二 8：每个小正方形对角的线段是 10 米，沿 45° 方向走（课本：（0，0）东偏北 45° 30 米 →（3，3）；（4，2）南偏西 45° 20 米 →（2，0）；
 * （6，7）北偏东 45° 10 米 →（7，8）；（4，4）西偏北 45° 40 米 →（0，8）） */
export const DIAG: [number, number, Bearing, number][] = [
  [0, 0, { base: 'e', side: 'n', deg: 45 }, 3],
  [4, 2, { base: 's', side: 'w', deg: 45 }, 2],
  [6, 7, { base: 'n', side: 'e', deg: 45 }, 1],
  [4, 4, { base: 'w', side: 'n', deg: 45 }, 4],
]
function qDiag(d: Difficulty, rng: RNG): Question {
  const [x, y, dir, k] = rng.chance(0.5)
    ? rng.pick(DIAG)
    : (() => {
        const q = rng.pick(['ne', 'se', 'sw', 'nw'] as const)
        const [a, b] = q.split('') as [Dir4, Dir4]
        const kk = rng.int(1, 4)
        const sx = q.includes('e') ? 1 : -1
        const sy = q.includes('n') ? 1 : -1
        const x0 = sx > 0 ? rng.int(0, 10 - kk) : rng.int(kk, 10)
        const y0 = sy > 0 ? rng.int(0, 10 - kk) : rng.int(kk, 10)
        return [x0, y0, rng.chance(0.5) ? { base: a, side: b, deg: 45 } : { base: b, side: a, deg: 45 }, kk] as [number, number, Bearing, number]
      })()
  const az = azimuth(dir)
  const sx = az < 180 ? 1 : -1
  const sy = az < 90 || az > 270 ? 1 : -1
  const grid: StemPart = { kind: 'pair-grid', mode: 'points', cols: 10, rows: 10, north: true, diag: true, items: [{ x, y, tag: '' }], alt: '0 到 10 的方格图，第一个小正方形里画了一条对角的线段' }
  return pairQ(K2, d, `diag-${x}-${y}-${bKey(dir)}-${k}`, [T('b.diag', { x, y, dir: dirL(dir), d: k * 10 }), grid], x + sx * k, y + sy * k, rng, { maxX: 10, maxY: 10, first: [[x - sx * k, y - sy * k], [x + sx * k, y], [x, y + sy * k]], type: 'direction' })
}
/** 第 3 档：两个地方在参照点相反的方向上，相距 = 两段距离相加 */
function qOpp(d: Difficulty, rng: RNG): Question {
  const b = randBearing(rng)
  const m = rng.int(2, 9) * 100
  const n = rng.int(2, 9) * 100
  return num(K2, 'direction', d, `opp-${bKey(b)}-${m}-${n}`, [T('b.opp', { a: 'A', o: 'O', c: 'B', d1: dirL(b), m, d2: dirL(reverse(b)), n })], m + n, rng, [Math.abs(m - n), m * 2])
}

function bearing(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 例 3、做一做 1–3（p6）、例 4、做一做 1–3（p7–8）
    if (roll < 0.06) return qOnly(d, rng)
    if (roll < 0.1) return qNeed(d, rng)
    if (roll < 0.15) return qRef(d, rng)
    if (roll < 0.3) return qReadDir(d, rng)
    if (roll < 0.38) return qReadDeg(d, rng)
    if (roll < 0.45) return qComp(d, rng)
    if (roll < 0.5) return qSame(d, rng)
    if (roll < 0.55) return qHabit(d, rng)
    if (roll < 0.64) return qReadDist(d, rng)
    if (roll < 0.69) return qReal(d, rng)
    if (roll < 0.73) return qCm(d, rng)
    if (roll < 0.8) return qLocate(d, rng)
    if (roll < 0.86) return qRay(d, rng)
    if (roll < 0.91) return qSegs(d, rng)
    return qRev(d, rng)
  }
  if (d === 2) {
    // 练习二 3、4、5，角量在另一条线上，45° 就是东北，习惯说法
    if (roll < 0.14) return qSym(d, rng)
    if (roll < 0.32) return qReadDeg(d, rng, true)
    if (roll < 0.52) return qRev2(d, rng)
    if (roll < 0.7) return qKm(d, rng)
    if (roll < 0.8) return qD8(d, rng)
    if (roll < 0.9) return qHabit(d, rng)
    return qReadDir(d, rng, randMap(rng, 3))
  }
  if (roll < 0.5) return qDiag(d, rng)
  if (roll < 0.8) return qOpp(d, rng)
  return qRev2(d, rng)
}
defineGenerator(K2, bearing)

// ══ 用方向和距离描述路线（m6s1-01-route）══

interface RouteSpec {
  key: string
  start: string
  per: number
  legs: { dir: Bearing; segs: number; to: string }[]
}
/** 例 5（课本）：学校 → 邮局（南偏东 30°，200 米）→ 书店（东偏南 30°，600 米）→ 小明家（正东，540 米） */
export const ROUTE_EX5: RouteSpec = {
  key: 'ex5',
  start: 'school',
  per: 100,
  legs: [
    { dir: { base: 's', side: 'e', deg: 30 }, segs: 2, to: 'post' },
    { dir: { base: 'e', side: 's', deg: 30 }, segs: 6, to: 'bookstore' },
    { dir: { base: 'e' }, segs: 5.4, to: 'xmHome' },
  ],
}
/** 练习二 9（课本）：小玲家 → 商场（西偏北 30°，1000 米）→ 书店（南偏西 45°，400 米），每段 200 米 */
export const ROUTE_LING: RouteSpec = {
  key: 'ling',
  start: 'xlingHome',
  per: 200,
  legs: [
    { dir: { base: 'w', side: 'n', deg: 30 }, segs: 5, to: 'mall' },
    { dir: { base: 's', side: 'w', deg: 45 }, segs: 2, to: 'bookstore' },
  ],
}
/** 自己定的路线：照课本的样子，几段一路往一个大方向走（不交叉） */
function randRoute(rng: RNG): RouteSpec {
  const t = rng.int(0, 2)
  const deg = (): number => rng.pick([20, 25, 30, 35, 40])
  let r: Omit<RouteSpec, 'key'>
  if (t === 0)
    r = {
      start: 'xhHome',
      per: rng.pick([100, 200]),
      legs: [
        { dir: { base: 'n', side: 'e', deg: deg() }, segs: rng.int(2, 4), to: 'park' },
        { dir: { base: 'e' }, segs: rng.int(2, 4), to: 'library' },
        { dir: { base: 'e', side: 's', deg: deg() }, segs: rng.int(2, 4), to: 'school' },
      ],
    }
  else if (t === 1)
    r = {
      start: 'school',
      per: rng.pick([50, 100]),
      legs: [
        { dir: { base: 'n' }, segs: rng.int(2, 4), to: 'crossing' },
        { dir: { base: 'n', side: 'w', deg: deg() }, segs: rng.int(2, 5), to: 'palace' },
      ],
    }
  else
    r = {
      start: 'xgHome',
      per: rng.pick([100, 200]),
      legs: [
        { dir: { base: 'w', side: 'n', deg: deg() }, segs: rng.int(3, 5), to: 'mall' },
        { dir: { base: 's', side: 'w', deg: deg() }, segs: rng.int(2, 3), to: 'bookstore' },
      ],
    }
  return { ...r, key: `r${t}-${r.per}-${r.legs.map((l) => `${bKey(l.dir)}.${l.segs}`).join('_')}` }
}
const metres = (r: RouteSpec, i: number): number => Math.round(r.legs[i]!.segs * r.per)
function routePart(r: RouteSpec, o: { dist: boolean; back?: boolean }): StemPart {
  const legs: RouteLeg[] = r.legs.map((l, i) => ({ dir: l.dir, segs: l.segs, to: place(l.to), dist: o.dist ? `${metres(r, i)} m` : undefined, arc: true, back: o.back }))
  return {
    kind: 'route-map',
    figs: [{ start: place(r.start), legs, per: o.dist ? undefined : `${r.per} m` }],
    alt: `路线图：一共 ${r.legs.length} 段，每个地方画了虚线小十字，${o.dist ? '每段旁边写着距离' : `每一小段表示 ${r.per} 米`}`,
  }
}
const from = (r: RouteSpec, i: number): string => (i === 0 ? r.start : r.legs[i - 1]!.to)
const pickRoute = (rng: RNG): RouteSpec => (rng.chance(0.55) ? ROUTE_EX5 : randRoute(rng))

/** 例 5：从邮局到书店向什么方向走 */
function qLegDir(d: Difficulty, rng: RNG): Question {
  const r = pickRoute(rng)
  const i = rng.int(0, r.legs.length - 1)
  return dirQ(K3, d, `legdir-${r.key}-${i}`, [T('r.dir', { a: place(from(r, i)), b: place(r.legs[i]!.to) }), routePart(r, { dist: true })], r.legs[i]!.dir, rng)
}
/** 例 5：某一段走了多少米（第 1 档段旁写着距离，第 2 档数小段） */
function qLegDist(d: Difficulty, rng: RNG, ticks = false): Question {
  const r = pickRoute(rng)
  const i = rng.int(0, r.legs.length - 1)
  const v = metres(r, i)
  const p = { a: place(from(r, i)), b: place(r.legs[i]!.to), per: r.per }
  return num(K3, 'direction', d, `legdist-${r.key}-${i}${ticks ? '-ticks' : ''}`, [T(ticks ? 'r.distTicks' : 'r.dist', p), routePart(r, { dist: !ticks })], v, rng, [...r.legs.map((_, j) => metres(r, j)), v + r.per, v - r.per, Math.round(r.legs[i]!.segs)])
}
/** 例 5 女孩：第 2 段路线以邮局为参照点 */
function qLegRef(d: Difficulty, rng: RNG): Question {
  const r = pickRoute(rng)
  const i = rng.int(0, r.legs.length - 1)
  const a = from(r, i)
  const ids = [r.start, ...r.legs.map((l) => l.to)].filter((x) => x !== a)
  return pick(K3, 'direction', d, `legref-${r.key}-${i}`, [T('r.ref', { a: place(a), b: place(r.legs[i]!.to) }), routePart(r, { dist: true })], place(a), ids.slice(0, 3).map(place), rng)
}
/** 例 5 机器人：每段路线都以起点为参照点 */
const qRule = (d: Difficulty, rng: RNG): Question => pick(K3, 'direction', d, 'rule', [T('r.rule')], L('r.start'), [L('r.end'), L('r.first')], rng)
/** 例 5：一共走了多少米（200 + 600 + 540 = 1340） */
function qTotal(d: Difficulty, rng: RNG): Question {
  const r = pickRoute(rng)
  const all = r.legs.reduce((s, _, i) => s + metres(r, i), 0)
  const end = r.legs[r.legs.length - 1]!.to
  return num(K3, 'direction', d, `total-${r.key}`, [T('r.total', { a: place(r.start), b: place(end) }), routePart(r, { dist: true })], all, rng, [all - metres(r, 0), all - metres(r, r.legs.length - 1), all + r.per])
}
/** 例 5「再说一说小明从家到学校的路线」：回来时每段的方向反过来 */
function qBack(d: Difficulty, rng: RNG): Question {
  const r = pickRoute(rng)
  const i = rng.int(0, r.legs.length - 1)
  const leg = r.legs[i]!
  const end = r.legs[r.legs.length - 1]!.to
  const wrongs: Bearing[] = [leg.dir]
  if (leg.dir.side) wrongs.push({ base: OPP[leg.dir.base], side: leg.dir.side, deg: leg.dir.deg }, swapWords(reverse(leg.dir)))
  return dirQ(K3, d, `back-${r.key}-${i}`, [T('r.back', { c: place(end), s: place(r.start), b: place(leg.to), a: place(from(r, i)) }), routePart(r, { dist: true, back: true })], reverse(leg.dir), rng, wrongs)
}
/** 做一做（根据描述画路线改成选图）：正南 50 米到路口，再南偏西 30° 100 米到公园 */
function qWhich(d: Difficulty, rng: RNG): Question {
  const textbook = rng.chance(0.4)
  const first: Bearing = textbook ? { base: 's' } : { base: rng.pick(['n', 'e', 's', 'w'] as Dir4[]) }
  const second: Bearing = textbook
    ? { base: 's', side: 'w', deg: 30 }
    : (() => {
        // 第二段别折回第一段的反方向
        let b = randBearing(rng)
        while (!apart(b, reverse(first), 60)) b = randBearing(rng)
        return b
      })()
  const [m1, m2] = textbook ? [50, 100] : [rng.pick([50, 100]), rng.pick([100, 150, 200])]
  const fig = (a: Bearing, b: Bearing) => ({
    start: place('startPt'),
    legs: [
      { dir: a, segs: m1 / 50, to: place('crossing'), dist: `${m1} m` },
      { dir: b, segs: m2 / 50, to: place('park'), dist: `${m2} m`, arc: true },
    ],
  })
  const wrongSecond = apart(second, swapWords(second)) ? swapWords(second) : flipNS(second)
  // 两幅并排（手机竖屏上三幅要折成两行，太高）：对的一幅 + 一种常见错（第二段东西反、从另一条线量、第一段方向反了），换着出
  const wrong = rng.int(0, 2)
  const figs = [fig(first, second), wrong === 0 ? fig(first, flipEW(second)) : wrong === 1 ? fig(first, wrongSecond) : fig(reverse(first), second)]
  const order = rng.shuffle([0, 1])
  const noOf = (i: number): LStr => L('no.n', { n: order.indexOf(i) + 1 })
  const stem: StemPart[] = [
    T('r.which', { d1: dirL(first), m1, d2: dirL(second), m2 }),
    { kind: 'route-map', figs: order.map((i) => figs[i]!), numbered: true, alt: '两幅路线示意图，编号 1、2，每幅从出发点到路口、再到公园' },
  ]
  return pick(K3, 'direction', d, `which-${bKey(first)}-${bKey(second)}-${m1}-${m2}-${order.join('')}-${wrong}`, stem, noOf(0), [noOf(1)], rng)
}
/** 例 5：路线可以分成几段 */
function qCount(d: Difficulty, rng: RNG): Question {
  const r = pickRoute(rng)
  return num(K3, 'direction', d, `count-${r.key}`, [T('r.count'), routePart(r, { dist: true })], r.legs.length, rng, [r.legs.length + 1, r.legs.length - 1, r.legs.length + 2])
}
/** 练习二 9：小玲去书店再回来（课本的时间 15、7、8、18 分钟除不尽，换成三组除得尽的） */
export const LING_TIMES: [number, number, number, number][] = [
  [12, 6, 7, 15],
  [10, 5, 6, 14],
  [14, 7, 8, 21],
]
function qTable(d: Difficulty, rng: RNG, speedOnly = false): Question {
  const ts = rng.pick(LING_TIMES)
  const [t1, t2, t3, t4] = ts
  const all = 2 * (1000 + 400)
  const time = t1 + t2 + t3 + t4
  const kind = speedOnly ? 'speed' : rng.pick(['dist', 'time', 'speed', 'back'] as const)
  const stem: StemPart[] = [T('r.times', { t1, t2, t3, t4 }), routePart(ROUTE_LING, { dist: true, back: true })]
  if (kind === 'back') return dirQ(K3, d, 'table-back', [...stem, T('r.tBack')], reverse(ROUTE_LING.legs[1]!.dir), rng, [ROUTE_LING.legs[1]!.dir])
  if (kind === 'dist') return num(K3, 'direction', d, `table-dist-${ts.join('.')}`, [...stem, T('r.tDist')], all, rng, [1400, 2400, 2000])
  if (kind === 'time') return num(K3, 'direction', d, `table-time-${ts.join('.')}`, [...stem, T('r.tTime')], time, rng, [t1 + t2, time + 2, time - 2])
  return num(K3, 'direction', d, `table-speed-${ts.join('.')}`, [...stem, T('r.tSpeed')], all / time, rng, [1400 / time, all / time + 10, all / time - 10])
}
/** 练习二 10：公共汽车沿原路返回（课本：西偏北 40° 3 千米、正西 4 千米、南偏西 30° 3 千米） */
function qBus(d: Difficulty, rng: RNG): Question {
  const textbook = rng.chance(0.4)
  const legs: [Bearing, number][] = textbook
    ? [
        [{ base: 'w', side: 'n', deg: 40 }, 3],
        [{ base: 'w' }, 4],
        [{ base: 's', side: 'w', deg: 30 }, 3],
      ]
    : [
        [{ base: 'w', side: 'n', deg: rng.pick([20, 30, 40]) }, rng.int(2, 5)],
        [{ base: 'w' }, rng.int(2, 6)],
        [{ base: 's', side: 'w', deg: rng.pick([20, 30, 40]) }, rng.int(2, 5)],
      ]
  const stem = T('r.bus', { d1: dirL(legs[0]![0]), a: legs[0]![1], d2: dirL(legs[1]![0]), b: legs[1]![1], d3: dirL(legs[2]![0]), c: legs[2]![1] })
  const sig = `bus-${legs.map(([b, n]) => `${bKey(b)}.${n}`).join('_')}`
  if (rng.chance(0.3)) {
    const all = legs.reduce((s, [, n]) => s + n, 0)
    return num(K3, 'direction', d, `${sig}-total`, [stem, T('r.busTotal')], all, rng, [all - legs[0]![1], all - legs[2]![1], all + 1], true)
  }
  const k = rng.int(1, 3)
  const leg = legs[3 - k]![0]
  return dirQ(K3, d, `${sig}-back${k}`, [stem, T('r.busBack', { k: L(`th.${k}`) })], reverse(leg), rng, [leg, legs[k - 1]![0]].filter((b) => azimuth(b) !== azimuth(reverse(leg))))
}
/** 第 3 档：整条回来的路线（顺序倒过来、每段方向反过来） */
function qFull(d: Difficulty, rng: RNG): Question {
  const r = pickRoute(rng)
  const n = r.legs.length
  const end = r.legs[n - 1]!.to
  const back = r.legs.map((l, i) => ({ dir: reverse(l.dir), m: metres(r, i) })).reverse()
  const keepDir = r.legs.map((l, i) => ({ dir: l.dir, m: metres(r, i) })).reverse()
  const keepOrder = r.legs.map((l, i) => ({ dir: reverse(l.dir), m: metres(r, i) }))
  const desc = (xs: { dir: Bearing; m: number }[]): LStr =>
    xs.length === 3
      ? L('r.desc3', { d1: dirL(xs[0]!.dir), a: xs[0]!.m, d2: dirL(xs[1]!.dir), b: xs[1]!.m, d3: dirL(xs[2]!.dir), c: xs[2]!.m })
      : L('r.desc2', { d1: dirL(xs[0]!.dir), a: xs[0]!.m, d2: dirL(xs[1]!.dir), b: xs[1]!.m })
  const firstWrong = back.map((x, i) => (i === 0 ? { ...x, dir: reverse(x.dir) } : x))
  const same = (a: { dir: Bearing; m: number }[], b: { dir: Bearing; m: number }[]): boolean => a.every((x, i) => azimuth(x.dir) === azimuth(b[i]!.dir) && x.m === b[i]!.m)
  const wrongs = [keepDir, keepOrder, firstWrong].filter((w, i, all) => !same(w, back) && all.findIndex((v) => same(v, w)) === i).map(desc)
  return pick(K3, 'direction', d, `full-${r.key}`, [T('r.full', { c: place(end), s: place(r.start) }), routePart(r, { dist: true })], desc(back), wrongs, rng)
}

function route(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 例 5、做一做
    if (roll < 0.2) return qLegDir(d, rng)
    if (roll < 0.34) return qLegDist(d, rng)
    if (roll < 0.46) return qLegRef(d, rng)
    if (roll < 0.53) return qRule(d, rng)
    if (roll < 0.65) return qTotal(d, rng)
    if (roll < 0.8) return qBack(d, rng)
    if (roll < 0.94) return qWhich(d, rng)
    return qCount(d, rng)
  }
  if (d === 2) {
    // 练习二 9、10，数小段算距离，自己定的路线回来的方向
    if (roll < 0.35) return qTable(d, rng)
    if (roll < 0.7) return qBus(d, rng)
    if (roll < 0.85) return qLegDist(d, rng, true)
    return qBack(d, rng)
  }
  if (roll < 0.6) return qFull(d, rng)
  return qTable(d, rng, true)
}
defineGenerator(K3, route)
