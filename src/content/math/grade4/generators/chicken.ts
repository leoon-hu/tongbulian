import type { Difficulty, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 数学广角——鸡兔同笼（四下第九单元，课本 p99–102，四年级数学下册 D）：一个知识点。
// 课本：《孙子算经》的鸡兔同笼（35 个头、94 只脚），先从简单的入手——例 1 有 8 个头、26 只脚：猜一猜、按顺序列表
//   （鸡 8、7、6……兔 0、1、2……脚 16、18……）、小辉的假设（都是鸡就有 8 × 2 = 16 只脚，多出 26 − 16 = 10 只，一只兔比一只鸡多 2 只脚，
//   10 ÷ 2 = 5 只兔）；做一做 自行车和三轮车共 10 辆、26 个轮子；阅读资料 抬脚法（不出）；练习二十四：钢珠、龟鹤、租船、植树、投篮、
//   抢答（答错扣分）、买球；思考题 百僧百馍（R4g：不出）；总复习 兴趣小组（求出组数再乘每组人数，放第 3 档）。
// 答案一律整数（数字键盘），两种都至少有 1 个（G14）；一次只问一种。
// 朗读避坑：「数字 + 只」读不对，所以题目里不写「26 只脚」「3 只鸡」——腿用「条」（课本龟鹤那题就是「腿……条」），问「兔有几只」；
// 「从上面数」的「数」（shǔ）不出，说「一共有 8 个头」；「投中」说成「投进」；钢珠「共重 266 g」说成「质量一共是 266 克」（不出单独的「重」）。
// ─────────────────────────────────────────────────────────────

const K = 'm4s2-10-chicken'
type P = Record<string, LStr | number>
const L = (k: string, p?: P): LStr => (p ? { k, p } : { k })
const T = (k: string, p?: P): StemPart => ({ kind: 'text', text: L(k, p) })

/**
 * 一道「两种东西」的题：一共 n 个，便宜（少）的每个 a、贵（多）的每个 b，合计 v；hi = b 的那种有几个，lo = a 的那种有几个。
 * 假设全是 a 的那种：a × n，比 v 少 v − a × n，每换一个多 b − a，hi = (v − a × n) ÷ (b − a)。
 */
export interface Pair {
  n: number
  a: number
  b: number
  hi: number
}
export const valueOf = (p: Pair): number => p.a * (p.n - p.hi) + p.b * p.hi
/** n 个里 hi 个是多的那种：两种都至少 1 个，也不让一种只占一两成（课本的题两种差不多：8 头里 5 兔、40 只里 16 龟、30 颗里 14 大） */
function pair(rng: RNG, nLo: number, nHi: number, a: number, b: number): Pair {
  const n = rng.int(nLo, nHi)
  const edge = Math.max(1, Math.round(n * 0.15))
  return { n, a, b, hi: rng.int(edge, n - edge) }
}
/** 干扰项：另一种的个数、假设以后的差（没除以 b − a）、一共的个数、±1 */
function smartOf(p: Pair, askHi: boolean): number[] {
  const lo = p.n - p.hi
  const extra = valueOf(p) - p.a * p.n
  return askHi ? [lo, extra, p.hi + 1, p.hi - 1, p.n] : [p.hi, extra, lo + 1, lo - 1, p.n]
}
function ask(d: Difficulty, rng: RNG, sig: string, stem: StemPart[], value: number, smart: number[], max = 99): Question {
  return numberQuestion({ kpId: K, type: 'logic', difficulty: d, sig, stem, value, rng, min: 1, max, smart: smart.filter((x) => x >= 1 && x !== value) })
}

// ── 例 1：鸡兔同笼（头、腿）──

/** 课本例 1：8 个头、26 只脚（腿），鸡 3、兔 5；《孙子算经》原题 35 个头、94 只脚，鸡 23、兔 12 */
export const EX1: Pair = { n: 8, a: 2, b: 4, hi: 5 }
export const SUNZI: Pair = { n: 35, a: 2, b: 4, hi: 12 }
function hens(rng: RNG): Pair {
  return rng.chance(0.35) ? EX1 : pair(rng, 5, 12, 2, 4)
}
const crSig = (p: Pair): string => `${p.n}-${valueOf(p)}`
/** 兔有几只 / 鸡有几只 */
function qCage(d: Difficulty, rng: RNG, p: Pair = hens(rng), tag = 'cage'): Question {
  const askHi = rng.chance(0.55)
  return ask(d, rng, `${tag}-${askHi ? 'rabbit' : 'hen'}-${crSig(p)}`, [T(askHi ? 'm4.chk.cage.rabbit' : 'm4.chk.cage.hen', { n: p.n, v: valueOf(p) })], askHi ? p.hi : p.n - p.hi, smartOf(p, askHi))
}
/** 小辉的假设，一步一步：都是鸡有几条腿、比实际少几条、兔有几只（问其中一步） */
function qAssume(d: Difficulty, rng: RNG): Question {
  const p = hens(rng)
  const step = rng.pick([1, 2, 3] as const)
  const v = valueOf(p)
  const all = 2 * p.n
  const values = { 1: all, 2: v - all, 3: p.hi }
  // 常错：都当成兔（4 × 头数）、把头数当腿数、没除以 2（多出的腿数当成兔的只数）
  const smart = { 1: [p.n, 4 * p.n, all + 2, v], 2: [all, v, p.hi, 4 * p.n - v], 3: [v - all, p.n - p.hi, p.hi + 1, p.hi - 1] }
  return ask(d, rng, `assume${step}-${crSig(p)}`, [T('m4.chk.cage.data', { n: p.n, v }), T(`m4.chk.assume.s${step}`)], values[step], smart[step])
}
/** 按顺序列表：鸡从 n 只往下减、兔从 0 只往上加，腿每次多 2 条；表里一格是「?」 */
function listTable(p: Pair, cols: number, blank?: [number, number]): StemPart {
  const ks = Array.from({ length: cols }, (_, k) => k)
  const cell = (r: number, k: number, v: number): number | null => (blank && blank[0] === r && blank[1] === k ? null : v)
  return {
    kind: 'stat-table',
    head: 'col',
    rows: [
      [L('m4.chk.list.hen'), ...ks.map((k) => cell(0, k, p.n - k))],
      [L('m4.chk.list.rabbit'), ...ks.map((k) => cell(1, k, k))],
      [L('m4.chk.list.leg'), ...ks.map((k) => cell(2, k, 2 * (p.n - k) + 4 * k))],
    ],
  }
}
function qListCell(d: Difficulty, rng: RNG): Question {
  const p = rng.chance(0.4) ? EX1 : pair(rng, 5, 8, 2, 4)
  const cols = Math.min(p.n + 1, 6)
  const k = rng.int(2, cols - 1)
  const r = rng.chance(0.7) ? 2 : rng.pick([0, 1])
  const v = r === 0 ? p.n - k : r === 1 ? k : 2 * (p.n - k) + 4 * k
  return ask(d, rng, `list-${p.n}-${r}-${k}`, [T('m4.chk.list.fill', { n: p.n }), listTable(p, cols, [r, k])], v, r === 2 ? [v + 2, v - 2, v + 4, v + 1] : [v + 1, v - 1, p.n - v], 99)
}
function qListFind(d: Difficulty, rng: RNG): Question {
  const p = rng.chance(0.4) ? EX1 : pair(rng, 5, 8, 2, 4)
  const v = valueOf(p)
  const askHi = rng.chance(0.6)
  return ask(d, rng, `find-${askHi ? 'rabbit' : 'hen'}-${crSig(p)}`, [T(askHi ? 'm4.chk.list.findRabbit' : 'm4.chk.list.findHen', { n: p.n, v }), listTable(p, p.n + 1)], askHi ? p.hi : p.n - p.hi, smartOf(p, askHi))
}

// ── 做一做：自行车和三轮车（10 辆、26 个轮子：自行车 4、三轮车 6）──

export const BIKES: Pair = { n: 10, a: 2, b: 3, hi: 6 }
function qBikes(d: Difficulty, rng: RNG): Question {
  const p = rng.chance(0.35) ? BIKES : pair(rng, 6, 15, 2, 3)
  const askHi = rng.chance(0.5)
  return ask(d, rng, `bike-${askHi ? 'tri' : 'bi'}-${crSig(p)}`, [T(askHi ? 'm4.chk.bike.tri' : 'm4.chk.bike.bi', { n: p.n, v: valueOf(p) })], askHi ? p.hi : p.n - p.hi, smartOf(p, askHi))
}

// ── 练习二十四 ──

interface Kind {
  id: string
  /** 课本的数 */
  book: Pair
  gen: (rng: RNG) => Pair
  /** 问多的那种 / 少的那种的词条 */
  hiKey: string
  loKey: string
}
export const KINDS: Kind[] = [
  // 钢珠：30 颗、266 克，大 11 克、小 7 克（大 14、小 16）
  { id: 'ball', book: { n: 30, a: 7, b: 11, hi: 14 }, gen: (r) => pair(r, 20, 40, 7, 11), hiKey: 'm4.chk.ball.big', loKey: 'm4.chk.ball.small' },
  // 龟鹤：40 个头、112 条腿（龟 16、鹤 24）
  { id: 'crane', book: { n: 40, a: 2, b: 4, hi: 16 }, gen: (r) => pair(r, 20, 50, 2, 4), hiKey: 'm4.chk.crane.turtle', loKey: 'm4.chk.crane.crane' },
  // 租船：38 人、8 条船，大船 6 人、小船 4 人（大 3、小 5）
  { id: 'boat', book: { n: 8, a: 4, b: 6, hi: 3 }, gen: (r) => pair(r, 5, 12, 4, 6), hiKey: 'm4.chk.boat.big', loKey: 'm4.chk.boat.small' },
  // 植树：12 人、32 棵，男生每人 3 棵、女生 2 棵（男 8、女 4）
  { id: 'tree', book: { n: 12, a: 2, b: 3, hi: 8 }, gen: (r) => pair(r, 8, 20, 2, 3), hiKey: 'm4.chk.tree.boys', loKey: 'm4.chk.tree.girls' },
  // 投篮：进了 9 个、21 分，3 分球 3 个
  { id: 'shot', book: { n: 9, a: 2, b: 3, hi: 3 }, gen: (r) => pair(r, 5, 15, 2, 3), hiKey: 'm4.chk.shot.three', loKey: 'm4.chk.shot.two' },
  // 买球：6 个、360 元，篮球 62 元、排球 58 元（各 3 个）
  { id: 'buy', book: { n: 6, a: 58, b: 62, hi: 3 }, gen: (r) => pair(r, 4, 10, 58, 62), hiKey: 'm4.chk.buy.basket', loKey: 'm4.chk.buy.volley' },
]
function qKind(d: Difficulty, rng: RNG, k: Kind = rng.pick(KINDS)): Question {
  const p = rng.chance(0.4) ? k.book : k.gen(rng)
  const askHi = k.id === 'shot' ? true : rng.chance(0.5)
  // 投篮多给一个用不上的数：一共投了几个球（课本 15 个）
  const shots = k.id === 'shot' ? (p === k.book ? 15 : p.n + 2 + ((p.n * 7 + p.hi) % 6)) : 0
  return ask(d, rng, `${k.id}-${askHi ? 'hi' : 'lo'}-${crSig(p)}`, [T(askHi ? k.hiKey : k.loKey, { n: p.n, v: valueOf(p), s: shots })], askHi ? p.hi : p.n - p.hi, [...smartOf(p, askHi), ...(shots ? [shots - p.n] : [])], 999)
}
/** 练习二十四 6：抢答，答对一题加 10 分，答错一题扣 6 分；课本 3 号 8 题 64 分（对 7）、1 号 10 题 36 分（错 4）、2 号 16 题 16 分（对 7） */
export const QUIZ: { n: number; wrong: number }[] = [
  { n: 8, wrong: 1 },
  { n: 10, wrong: 4 },
  { n: 16, wrong: 9 },
]
export const quizScore = (q: { n: number; wrong: number }): number => 10 * (q.n - q.wrong) - 6 * q.wrong
function qQuiz(d: Difficulty, rng: RNG): Question {
  let q = rng.pick(QUIZ)
  if (!rng.chance(0.45)) {
    for (;;) {
      const n = rng.int(6, 20)
      const wrong = rng.int(1, n - 1)
      if (quizScore({ n, wrong }) > 0) {
        q = { n, wrong }
        break
      }
    }
  }
  const s = quizScore(q)
  const askRight = rng.chance(0.5)
  const v = askRight ? q.n - q.wrong : q.wrong
  // 常错：每错一题当成少 6 分（不是 10 + 6 = 16 分）、问对的答成错的
  const lost = 10 * q.n - s
  const smart = [askRight ? q.wrong : q.n - q.wrong, Number.isInteger(lost / 6) ? lost / 6 : lost / 4, Math.round(lost / 10), v + 1, v - 1]
  return ask(d, rng, `quiz-${askRight ? 'right' : 'wrong'}-${q.n}-${s}`, [T('m4.chk.quiz.rule'), T(askRight ? 'm4.chk.quiz.right' : 'm4.chk.quiz.wrong', { n: q.n, s })], v, smart.filter((x) => Number.isInteger(x)))
}
/** 总复习 19：科技类每 5 人一组、艺术类每 3 人一组，37 人正好分成 9 组，参加科技类（艺术类）的有多少人（25、12）——先求组数再乘每组人数 */
function qClub(d: Difficulty, rng: RNG): Question {
  const p: Pair = rng.chance(0.4) ? { n: 9, a: 3, b: 5, hi: 5 } : pair(rng, 6, 12, 3, 5)
  const askHi = rng.chance(0.5)
  const groups = askHi ? p.hi : p.n - p.hi
  const v = groups * (askHi ? 5 : 3)
  return ask(d, rng, `club-${askHi ? 'sci' : 'art'}-${crSig(p)}`, [T(askHi ? 'm4.chk.club.sci' : 'm4.chk.club.art', { n: p.n, v: valueOf(p) })], v, [groups, v + (askHi ? 5 : 3), v - (askHi ? 5 : 3), valueOf(p) - v], 999)
}

function chicken(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 例 1：鸡兔各几只、假设的每一步、按顺序列表；做一做：自行车和三轮车
    if (roll < 0.3) return qCage(d, rng)
    if (roll < 0.5) return qAssume(d, rng)
    if (roll < 0.65) return qListCell(d, rng)
    if (roll < 0.77) return qListFind(d, rng)
    return qBikes(d, rng)
  }
  if (d === 2) {
    // 练习二十四：钢珠、龟鹤、租船、植树、投篮、买球、抢答；《孙子算经》的原题
    if (roll < 0.65) return qKind(d, rng)
    if (roll < 0.85) return qQuiz(d, rng)
    return qCage(d, rng, SUNZI, 'sunzi')
  }
  // 第 3 档：兴趣小组（求出组数再乘每组人数）、抢答、头数多的鸡兔
  if (roll < 0.4) return qClub(d, rng)
  if (roll < 0.7) return qQuiz(d, rng)
  return qCage(d, rng, pair(rng, 20, 50, 2, 4), 'big')
}
defineGenerator(K, chicken)
