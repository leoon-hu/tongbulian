import type { ChanceBalls, ChanceColor, Difficulty, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 六下「5 数学广角——鸽巢问题」（平台当前的旧版六下 p67–70；六年级数学 A，照笔记 A 写），一个知识点（同五下「找次品」）。
// 第 1 档：例 1（4 支铅笔放进 3 个笔筒，总有 1 个至少 2 支；小红把四种放法都摆出来；小明假设每个最多放 1 支）、
//   做一做（13 位老师至少 2 人生肖相同；5 只鸽子飞进 3 个鸽笼至少 2 只）、你知道吗（10 个苹果 9 个抽屉、6 只鸽子 5 个鸽巢）、
//   例 2（7 本书放进 3 个抽屉至少 3 本；8 本、10 本呢：商 + 1；男孩假设每个最多放 2 本）、做一做（11 只鸽子 4 个鸽笼至少 3 只；
//   9 人抽扑克牌至少 3 张同花色）、例 3（红、蓝球各 4 个，至少摸 3 个才能保证 2 个同色：比颜色种数多 1）、
//   做一做（367 名学生至少 2 人同一天过生日、二班 37 人至少 4 人同一个月；4 种颜色的球各 10 个至少取 5 个）。
// 第 2 档：练习十三 1（5 次飞镖 41 环，至少一次不低于 9 环）、2（正方体 6 个面涂两种颜色，至少 3 个面同色：除得尽就是商）、
//   3 前一问（3 种颜色的筷子，至少拿 4 根）、4（3 个自然数里一定有 2 个的和是偶数）、5（3 行 9 列红蓝涂色：一列 8 种涂法，
//   至少 2 列相同；只涂两行：4 种，至少 3 列相同）、整除的情形、反过来至少要找几位老师、别的放法个数。
// 第 3 档：练习十三 3 后一问（2 双不同颜色的筷子：一种颜色全拿出来 + 别的颜色各 1 根，再拿 1 根，3 + 2 + 1 = 6）、
//   反过来求至少要放几本书、至少摸几个才能保证 2 个红球、至少多少人有 3 人同一个月过生日。
// 作答：「至少几个」都是数字键盘；对 / 不对是选项；例 2 的算式题第 2 档做成选项（干扰项是商 + 余数、只看商）。
// 图：放法图（Pigeonholes，新做：笔筒 / 抽屉 / 鸽笼里各放了几个，旁边多出的几个）、摸球盒（DrawBox）、3 × 9 涂色格（GeoFigure）。
// 朗读：「属相」写「生肖」，「六（2）班」写「二班」，「镖」「环」不跟在数后面当量词；数是 2 的「种」写汉字。
// ─────────────────────────────────────────────────────────────

const K = 'm6s2-07-pigeonhole'
type P = Record<string, LStr | number>
const L = (k: string, p?: P): LStr => (p ? { k: `m6.pigeon.${k}`, p } : { k: `m6.pigeon.${k}` })
const T = (k: string, p?: P): StemPart => ({ kind: 'text', text: L(k, p) })
const ceil = (n: number, k: number): number => Math.ceil(n / k)

function num(d: Difficulty, sig: string, stem: StemPart[], value: number, rng: RNG, smart: number[] = []): Question {
  return numberQuestion({ kpId: K, type: 'logic', difficulty: d, sig, stem, value, rng, min: 0, max: Math.max(20, value * 3), smart: smart.filter((s) => s >= 0 && s !== value), input: 'numpad' })
}
function tf(d: Difficulty, sig: string, stem: StemPart[], ok: boolean, rng: RNG): Question {
  return labelQuestion({ kpId: K, type: 'logic', difficulty: d, sig, stem, correct: L(ok ? 'yes' : 'no'), distractors: [L(ok ? 'no' : 'yes')], rng })
}
/** 放法图：k 个容器各放 q 个、旁边多出 r 个（例 1 小明的想法、例 2 尽量平均分）；放不下就不画 */
function holes(holder: 'cup' | 'drawer' | 'cage', icon: string, n: number, k: number): StemPart[] {
  const q = Math.floor(n / k)
  const r = n - q * k
  if (k > 5 || n > 16) return []
  return [{ kind: 'pigeonholes', holder, icon, counts: Array.from({ length: k }, () => q), extra: r }]
}

/** 把 n 分成不超过 k 份（不计顺序）有几种：小红摆出来的放法个数 */
export function partitions(n: number, k: number, max = n): number {
  if (n === 0) return 1
  if (k === 0) return 0
  let s = 0
  for (let first = Math.min(n, max); first >= 1; first--) s += partitions(n - first, k - 1, first)
  return s
}

/** 例 1：4 支铅笔放进 3 个笔筒（物体比容器多 1，总有 1 个至少 2 个）；你知道吗的 10 个苹果 9 个抽屉、6 只鸽子 5 个鸽巢 */
function qEx1(d: Difficulty, rng: RNG): Question {
  const v = rng.pick(['pencil', 'pencil', 'apple', 'nest'] as const)
  if (v === 'pencil') {
    const k = d === 1 && rng.chance(0.5) ? 3 : rng.int(2, 6)
    const n = k + 1
    return num(d, `ex1-pencil-${n}-${k}`, [T('ex1.pencil', { n, k }), ...holes('cup', '✏️', n, k)], 2, rng, [1, n - k + 1, k])
  }
  const [n, k] = v === 'apple' ? (rng.chance(0.5) ? [10, 9] : [rng.int(4, 8), 0]) : rng.chance(0.5) ? [6, 5] : [rng.int(4, 8), 0]
  const kk = k || n - 1
  return num(d, `ex1-${v}-${n}-${kk}`, [T(v === 'apple' ? 'ex1.apple' : 'ex1.nest', { n, k: kk })], 2, rng, [1, 3])
}
/** 例 1 小红：把 4 支铅笔放进 3 个笔筒，只看每个笔筒放几支，有 4 种放法（4、0、0 / 3、1、0 / 2、2、0 / 2、1、1） */
export const ENUMS: [number, number][] = [
  [4, 3],
  [3, 2],
  [4, 2],
  [5, 3],
  [5, 2],
]
function qEnum(d: Difficulty, rng: RNG): Question {
  const [n, k] = d === 1 ? ENUMS[0]! : rng.pick(ENUMS.slice(1))
  const v = partitions(n, k)
  return num(d, `enum-${n}-${k}`, [T('enum', { n, k })], v, rng, [v + 1, v - 1, n])
}
/** 例 1 小明、例 2 男孩的假设：每个最多放 1 支 / 2 本，一共最多放几；放满后多出几支 */
function qHyp(d: Difficulty, rng: RNG): Question {
  const kind = rng.pick(['max', 'left', 'book'] as const)
  if (kind === 'max') {
    const k = rng.chance(0.5) ? 3 : rng.int(2, 9)
    return num(d, `hyp-max-${k}`, [T('hyp.max', { k }), ...holes('cup', '✏️', k, k)], k, rng, [k + 1, 1])
  }
  if (kind === 'left') {
    const k = rng.chance(0.5) ? 3 : rng.int(2, 6)
    const n = k + (rng.chance(0.6) ? 1 : rng.int(2, 3))
    return num(d, `hyp-left-${n}-${k}`, [T('hyp.left', { n, k }), ...holes('cup', '✏️', k, k)], n - k, rng, [k, n])
  }
  const [q, k] = rng.chance(0.5) ? [2, 3] : [rng.int(2, 4), rng.int(2, 5)]
  return num(d, `hyp-book-${q}-${k}`, [T('hyp.book', { q, k })], q * k, rng, [q + k, q * k + 1])
}
/** 做一做 1：随意找 13 位老师，至少有 2 个人的生肖相同（12 个生肖） */
function qZodiac(d: Difficulty, rng: RNG): Question {
  const n = rng.chance(0.5) ? 13 : rng.int(13, 24)
  return num(d, `zodiac-${n}`, [T('zodiac', { n })], ceil(n, 12), rng, [1, 3, n - 12])
}
/** 做一做 2：5 只鸽子飞进 3 个鸽笼，至少 2 只；p68 做一做 1：11 只鸽子飞进 4 个鸽笼，至少 3 只 */
function qPigeon(d: Difficulty, rng: RNG): Question {
  const [n, k] = rng.chance(0.4)
    ? rng.pick([
        [5, 3],
        [11, 4],
      ] as [number, number][])
    : (() => {
        const kk = rng.int(2, 6)
        let nn = rng.int(kk + 1, 4 * kk)
        while (nn % kk === 0) nn = rng.int(kk + 1, 4 * kk)
        return [nn, kk] as [number, number]
      })()
  const q = Math.floor(n / k)
  return num(d, `pigeon-${n}-${k}`, [T('ex1.pigeon', { n, k }), ...holes('cage', '🕊️', n, k)], q + 1, rng, [q, q + (n % k)])
}
/** 例 2：7 本书放进 3 个抽屉至少 3 本（8 本至少 3 本、10 本至少 4 本）；第 2 档出整除的（9 本 → 3 本） */
function qEx2(d: Difficulty, rng: RNG, even = false): Question {
  let n: number
  let k: number
  if (!even && rng.chance(0.45)) [n, k] = [rng.pick([7, 8, 10]), 3]
  else {
    k = rng.int(2, 6)
    n = even ? k * rng.int(2, 5) : rng.int(k + 1, 5 * k)
    while (!even && n % k === 0) n = rng.int(k + 1, 5 * k)
  }
  const q = Math.floor(n / k)
  const ans = ceil(n, k)
  return num(d, `ex2-${n}-${k}`, [T('ex2.book', { n, k }), ...holes('drawer', '📘', n, k)], ans, rng, [q, q + (n % k), ans + 1])
}
/** 例 2 女孩：7 ÷ 3 = 2……1，多出的 1 本总要放进其中 1 个抽屉 → 商 + 1；第 2 档做成选项（干扰：商 + 余数、只看商） */
function qDiv(d: Difficulty, rng: RNG): Question {
  let k = 3
  let n = rng.pick([7, 8, 10])
  if (rng.chance(0.5)) {
    k = rng.int(2, 6)
    n = rng.int(k + 1, 5 * k)
    while (n % k === 0) n = rng.int(k + 1, 5 * k)
  }
  const q = Math.floor(n / k)
  const r = n % k
  const stem = [T('div', { n, k, q, r })]
  if (d === 1) return num(d, `div-${n}-${k}`, stem, q + 1, rng, [q, q + r])
  const wrongs = [q + r, q, q + 2].filter((w, i, all) => w !== q + 1 && all.indexOf(w) === i).slice(0, 2)
  return labelQuestion({ kpId: K, type: 'logic', difficulty: d, sig: `divc-${n}-${k}`, stem, correct: String(q + 1), distractors: wrongs.map(String), rng })
}
/** 例 1 的判断：至少有 2 支对、至少有 3 支不对 */
function qEx1Tf(d: Difficulty, rng: RNG): Question {
  const k = rng.chance(0.5) ? 3 : rng.int(2, 5)
  const n = k + rng.int(1, k)
  const truth = ceil(n, k)
  const c = rng.chance(0.5) ? truth : truth + 1
  return tf(d, `ex1tf-${n}-${k}-${c}`, [T('ex1.tf', { n, k, c })], c === truth, rng)
}
/** p68 做一做 2：9 人每人抽 1 张，至少 3 张同花色（4 种花色） */
function qPoker(d: Difficulty, rng: RNG): Question {
  const n = rng.chance(0.5) ? 9 : rng.int(5, 12)
  return num(d, `poker-${n}`, [T('poker', { n })], ceil(n, 4), rng, [Math.floor(n / 4), n - 4])
}
const BALL_COLORS: ChanceColor[] = ['red', 'yellow', 'blue', 'green', 'white']
/** 例 3：红球、蓝球各 4 个，至少摸 3 个（比颜色种数多 1）；也出 3–5 种颜色的 */
function qBall(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.55)) {
    const m = rng.chance(0.5) ? 4 : rng.int(2, 7)
    const box: StemPart = { kind: 'draw-box', boxes: [[{ color: 'red', n: m }, { color: 'blue', n: m }]] }
    return num(d, `ball2-${m}`, [T('ball2', { m }), box], 3, rng, [2, m + 1, 2 * m])
  }
  const k = rng.int(3, 5)
  const m = rng.int(2, Math.floor(15 / k))
  const balls: ChanceBalls[] = BALL_COLORS.slice(0, k).map((color) => ({ color, n: m }))
  return num(d, `ballk-${k}-${m}`, [T('ballK', { k, m }), { kind: 'draw-box', boxes: [balls] }], k + 1, rng, [k, m + 1, k * m])
}
/** p69 做一做 2：红、黄、蓝、白 4 种颜色的球各 10 个，至少取 5 个 */
function qBag(d: Difficulty, rng: RNG): Question {
  const k = rng.chance(0.5) ? 4 : rng.pick([3, 5])
  const m = k === 4 && rng.chance(0.5) ? 10 : rng.pick([5, 6, 8, 10])
  return num(d, `bag-${k}-${m}`, [T('bag', { colors: L(`cl.${k}`), m })], k + 1, rng, [k, m + 1])
}
/** p69 做一做 1：367 名学生至少 2 人同一天过生日（一年最多 366 天）；二班 37 人至少 4 人同一个月过生日 */
function qBday(d: Difficulty, rng: RNG): Question {
  const kind = rng.pick(['day', 'month', 'tf'] as const)
  if (kind === 'day') {
    const n = rng.chance(0.5) ? 367 : rng.int(367, 380)
    return num(d, `bday-day-${n}`, [T('bday.day', { n })], 2, rng, [1, 3])
  }
  const n = rng.chance(0.4) ? 37 : rng.int(25, 48)
  if (kind === 'month') return num(d, `bday-month-${n}`, [T('bday.month', { n })], ceil(n, 12), rng, [Math.floor(n / 12), ceil(n, 12) + 1])
  const truth = ceil(n, 12)
  const c = rng.chance(0.5) ? truth : truth + 1
  return tf(d, `bday-tf-${n}-${c}`, [T('bday.tf', { n, c })], c === truth, rng)
}
/** 练习十三 1：5 次飞镖 41 环，至少一次不低于 9 环（商 + 1） */
function qDarts(d: Difficulty, rng: RNG): Question {
  let n = 5
  let s = 41
  if (rng.chance(0.6)) {
    n = rng.int(3, 6)
    s = rng.int(6, 9) * n + rng.int(1, n - 1)
  }
  return num(d, `darts-${n}-${s}`, [T('darts', { n, s })], Math.floor(s / n) + 1, rng, [Math.floor(s / n), 10])
}
/** 练习十三 2：正方体 6 个面涂蓝、黄两种颜色，至少 3 个面同色（整除就是商）；3 种颜色至少 2 个面 */
function qCube(d: Difficulty, rng: RNG): Question {
  const two = rng.chance(0.6)
  return num(d, `cube-${two ? 2 : 3}`, [T('cube', { colors: L(two ? 'cc.2' : 'cl.3') })], two ? 3 : 2, rng, two ? [4, 2] : [3, 1])
}
/** 练习十三 3 前一问：红、蓝、黄筷子各 3 根，至少拿 4 根才能保证 2 根同色 */
function qChop(d: Difficulty, rng: RNG): Question {
  const k = rng.chance(0.6) ? 3 : 4
  const m = k === 3 && rng.chance(0.5) ? 3 : rng.int(3, 6)
  return num(d, `chop-${k}-${m}`, [T('chop', { colors: L(`cl.${k}`), m })], k + 1, rng, [k, m + 1])
}
/** 练习十三 4：3 个自然数里一定有 2 个的和是偶数（奇数、偶数两类）；2 个数的和不一定是偶数 */
function qParity(d: Difficulty, rng: RNG): Question {
  const three = rng.chance(0.6)
  return tf(d, `parity-${three ? 3 : 2}`, [T(three ? 'parity' : 'parity2')], three, rng)
}
/** 练习十三 5：每列 3 格涂红或蓝有 8 种涂法，9 列至少 2 列相同；只涂两行 4 种，至少 3 列相同 */
function qCols(d: Difficulty, rng: RNG): Question {
  const r = rng.chance(0.6) ? 3 : 2
  const ways = 2 ** r
  const c = rng.chance(0.5) ? 9 : rng.int(ways + 1, Math.min(16, 3 * ways))
  const red: [number, number][] = []
  const blue: [number, number][] = []
  for (let x = 0; x < Math.min(c, 4); x++) for (let y = 0; y < r; y++) ((x * 3 + y * 5 + x * y) % 3 === 0 ? red : blue).push([x, y])
  const grid: StemPart = {
    kind: 'geo',
    figs: [
      {
        w: c,
        h: r,
        px: 24,
        items: [
          { t: 'grid', x: 0, y: 0, w: c, h: r, cells: red, fill: 'd' },
          { t: 'grid', x: 0, y: 0, w: c, h: r, cells: blue, fill: 'b', lines: false },
        ],
      },
    ],
    alt: `${r} 行 ${c} 列的格子，前几列涂了红色和蓝色`,
  }
  if (rng.chance(0.4)) return num(d, `cols-ways-${r}`, [T('cols.ways', { r }), grid], ways, rng, [r * 2, r + 2])
  return num(d, `cols-same-${r}-${c}`, [T('cols.same', { rows: L(`rows.${r}`), c }), grid], ceil(c, ways), rng, [Math.floor(c / ways), r])
}
/** 反过来：至少要找 13 位老师，才能保证 2 人生肖相同 */
const qZodiacRev = (d: Difficulty, rng: RNG): Question => num(d, 'zodiac-rev', [T('zodiacRev')], 13, rng, [12, 24])
/** 练习十三 3 后一问：3 种颜色的筷子各 m 根，要 2 双不同颜色：一种颜色全拿出来（只算一种颜色的筷子）、别的各 1 根，再拿 1 根 → m + 3 */
function qChop2(d: Difficulty, rng: RNG): Question {
  const m = rng.chance(0.5) ? 3 : rng.int(4, 6)
  return num(d, `chop2-${m}`, [T('chop2', { colors: L('cl.3'), m })], m + 3, rng, [5, 4, 2 * m])
}
/** 反过来求物体数：4 个抽屉、要保证至少 3 本 → 4 × 2 + 1 = 9 本 */
function qRevObj(d: Difficulty, rng: RNG): Question {
  const k = rng.int(3, 6)
  const m = rng.int(2, 4)
  return num(d, `revobj-${k}-${m}`, [T('rev.obj', { k, m })], k * (m - 1) + 1, rng, [k * m, k * (m - 1), k * m + 1])
}
/** 红、蓝球各 m 个，保证摸到 2 个红球：最坏先摸完蓝球 → m + 2 */
function qTwoRed(d: Difficulty, rng: RNG): Question {
  const m = rng.int(3, 7)
  return num(d, `twored-${m}`, [T('twoRed', { m })], m + 2, rng, [3, 4, m + 1])
}
/** 至少多少人才能保证 c 个人同一个月过生日：12 × (c − 1) + 1 */
function qMonthRev(d: Difficulty, rng: RNG): Question {
  const c = rng.int(2, 4)
  return num(d, `monthrev-${c}`, [T('monthRev', { c })], 12 * (c - 1) + 1, rng, [12 * c, 12 * (c - 1), 12 * c + 1])
}

function pigeonhole(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 例 1、例 2、例 3 和六个做一做、你知道吗
    if (roll < 0.1) return qEx1(d, rng)
    if (roll < 0.16) return qEnum(d, rng)
    if (roll < 0.26) return qHyp(d, rng)
    if (roll < 0.33) return qZodiac(d, rng)
    if (roll < 0.43) return qPigeon(d, rng)
    if (roll < 0.55) return qEx2(d, rng)
    if (roll < 0.63) return qDiv(d, rng)
    if (roll < 0.68) return qEx1Tf(d, rng)
    if (roll < 0.75) return qPoker(d, rng)
    if (roll < 0.85) return qBall(d, rng)
    if (roll < 0.91) return qBag(d, rng)
    return qBday(d, rng)
  }
  if (d === 2) {
    // 练习十三 1–5，整除的、反过来、算式做成选项、别的放法个数
    if (roll < 0.16) return qDarts(d, rng)
    if (roll < 0.28) return qCube(d, rng)
    if (roll < 0.42) return qChop(d, rng)
    if (roll < 0.5) return qParity(d, rng)
    if (roll < 0.64) return qCols(d, rng)
    if (roll < 0.74) return qEx2(d, rng, true)
    if (roll < 0.8) return qZodiacRev(d, rng)
    if (roll < 0.9) return qDiv(d, rng)
    return qEnum(d, rng)
  }
  if (roll < 0.3) return qChop2(d, rng)
  if (roll < 0.6) return qRevObj(d, rng)
  if (roll < 0.8) return qTwoRed(d, rng)
  return qMonthRev(d, rng)
}
defineGenerator(K, pigeonhole)
