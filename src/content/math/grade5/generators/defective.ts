import type { Difficulty, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 五下「8 数学广角——找次品」（课本第 112–114 页；五年级数学 F）：一个知识点。
// 课本：例 1 有 3 瓶钙片、1 瓶少了 3 片（轻），用天平称——两瓶放上去，平衡则剩下的是次品，不平衡轻的是次品，称 1 次；
//   例 2 有 8 个零件、1 个次品重一些，「至少称几次能保证找出次品」= 保证能找出次品的最少次数：分成 4 份（2，2，2，2）3 次、
//   2 份（4，4）3 次、3 份（3，3，2）2 次——分成 3 份最少；9 个 2 次，10 个、11 个 3 次。你知道吗：2～3 个 1 次、4～9 个 2 次、
//   10～27 个 3 次、28～81 个 4 次、82～243 个 5 次（只含 1 个次品，已知次品比正品重或轻）。
//   练习二十七：5 瓶钙片（先称 1、2 号再称 3、4 号，至少 2 次）、28 瓶水里 1 瓶盐水（4 次）、15 盒饼干（3 次）、12 袋糖果分成（4，4，4）
//   （3 次）、3 袋白糖不知道轻重（2 次，放第 3 档）。
// 题目一律写明次品是轻还是重（上面的规律只在知道轻重时成立）。答案一律整数（数字键盘）；「次品在哪几个里」「哪种分法最少」是选项。
// 图：天平（BalanceScale，照课本的记录图：方块是钙片、圆圈是零件，写着号码）；分法的表（StatTable，照课本）。
// 朗读：「称」（chēng）、「重一些」（zhòng）请合成后核听；表里的「（2，2，2，2）」不朗读，题目文字里不写括号；单位写「克」。
// ─────────────────────────────────────────────────────────────

const K = 'm5s2-10-defective'
type P = Record<string, LStr | number>
const L = (k: string, p?: P): LStr => (p ? { k, p } : { k })
const T = (k: string, p?: P): StemPart => ({ kind: 'text', text: L(k, p) })

/** n 个里有 1 个次品（知道轻重）：至少称几次能保证找出来——3 的几次方不小于 n */
export function minWeighings(n: number): number {
  let k = 0
  let cap = 1
  while (cap < n) {
    cap *= 3
    k++
  }
  return k
}

function ask(d: Difficulty, rng: RNG, sig: string, stem: StemPart[], value: number, smart: number[], max = 99): Question {
  return numberQuestion({ kpId: K, type: 'logic', difficulty: d, sig, stem, value, rng, min: 1, max, smart: smart.filter((x) => x >= 1 && x !== value) })
}
function choose(d: Difficulty, rng: RNG, sig: string, stem: StemPart[], correct: LStr, distractors: LStr[]): Question {
  return labelQuestion({ kpId: K, type: 'logic', difficulty: d, sig, stem, correct, distractors, rng })
}
/** 至少称几次的干扰项：每次只排除两个（一个对一个称）、对半分着称、差一次 */
const weighSmart = (n: number, v: number): number[] => [Math.floor(n / 2), Math.ceil(Math.log2(n)), v + 1, v - 1]

// ── 几种要找的东西（课本的例题与练习）──
interface Thing {
  id: string
  /** 题目的前半句：有几个、哪一个不一样（{n} 一共几个，{m} = n − 1） */
  data: string
  /** 问句 */
  ask: string
  /** 课本的数 */
  book: number[]
}
export const THINGS: Thing[] = [
  // 例 1：3 瓶钙片，1 瓶少了 3 片；练习二十七 1：5 瓶钙片
  { id: 'calcium', data: 'm5.defect.calcium', ask: 'm5.defect.ask.calcium', book: [3, 5] },
  // 例 2：8 个零件，次品重一些；9 个、10 个、11 个
  { id: 'heavy', data: 'm5.defect.part.heavy', ask: 'm5.defect.ask.part', book: [8, 9, 10, 11] },
  { id: 'light', data: 'm5.defect.part.light', ask: 'm5.defect.ask.part', book: [8, 9] },
  // 练习二十七 2：28 瓶水里 1 瓶盐水，略重一些
  { id: 'salt', data: 'm5.defect.salt', ask: 'm5.defect.ask.salt', book: [28] },
  // 练习二十七 3：15 盒饼干里 1 盒少了几块
  { id: 'biscuit', data: 'm5.defect.biscuit', ask: 'm5.defect.ask.biscuit', book: [15] },
  // 练习二十七 4：1 箱糖果 12 袋里 1 袋轻一些
  { id: 'candy', data: 'm5.defect.candy', ask: 'm5.defect.ask.candy', book: [12] },
]
/** 至少称几次：tier 1 是例题的 3、8、9 个和 9 个以内的；第 2 档是练习二十七的数和 81 个以内；第 3 档到 243 个 */
function qHowMany(d: Difficulty, rng: RNG): Question {
  let th: Thing
  let n: number
  if (d === 1) {
    th = rng.pick(THINGS.slice(0, 3))
    n = rng.chance(0.5) ? rng.pick(th.id === 'calcium' ? [3] : [8, 9]) : rng.int(2, 9)
  } else {
    th = rng.pick(THINGS)
    n = rng.chance(0.4) ? rng.pick(th.book) : d === 2 ? rng.int(4, 81) : rng.int(28, 243)
  }
  const v = minWeighings(n)
  return ask(d, rng, `howMany-${th.id}-${n}`, [T(th.data, { n, m: n - 1 }), T(th.ask)], v, weighSmart(n, v), 9)
}

/** 例 1 的记录图：3 个里称两个（号码随机），平衡或不平衡，次品是几号 */
function qReadOne(d: Difficulty, rng: RNG): Question {
  const [a, b, c] = rng.shuffle(['1', '2', '3'])
  const heavy = rng.chance(0.4)
  const tilt = rng.pick(['level', 'level', 'left', 'right'] as const)
  // 平衡：剩下的那个；左边低 = 左边重——次品重就是左边那个、次品轻就是右边那个
  const answer = tilt === 'level' ? c! : tilt === 'left' ? (heavy ? a! : b!) : heavy ? b! : a!
  const scale: StemPart = { kind: 'balance', left: [a!], right: [b!], aside: [c!], tilt, shape: heavy ? 'ball' : 'box' }
  const stem = [T(heavy ? 'm5.defect.read.ball' : 'm5.defect.read.box', { a: a!, b: b! }), scale, T('m5.defect.read.which')]
  // 选项就是 1、2、3 号（一共就 3 个；天平图加数字键盘手机竖屏一屏放不下）
  return choose(d, rng, `readOne-${heavy ? 'h' : 'l'}-${a}${b}${c}-${tilt}`, stem, answer, ['1', '2', '3'].filter((x) => x !== answer))
}

/** 例 2 的记录图：8 个零件分几份称第一次，次品重一些——平衡就在没放上去的里面，不平衡就在低的那边 */
export const SPLITS: { each: number[]; times: number }[] = [
  { each: [2, 2, 2, 2], times: 3 },
  { each: [4, 4], times: 3 },
  { each: [3, 3, 2], times: 2 },
]
const nos = (xs: number[]): LStr => L('m5.defect.nos', { list: xs.join('、') })
function qReadGroup(d: Difficulty, rng: RNG): Question {
  const split = rng.pick(SPLITS)
  const [p, q] = split.each
  const left = Array.from({ length: p! }, (_, i) => i + 1)
  const right = Array.from({ length: q! }, (_, i) => p! + i + 1)
  const rest = Array.from({ length: 8 - p! - q! }, (_, i) => p! + q! + i + 1)
  // 分成两份（4，4）时一定不平衡
  const tilt = rest.length ? rng.pick(['level', 'left', 'right'] as const) : rng.pick(['left', 'right'] as const)
  const answer = tilt === 'level' ? rest : tilt === 'left' ? left : right
  const options = [left, right, ...(rest.length ? [rest] : []), [...left, ...right]]
  const scale: StemPart = { kind: 'balance', left: left.map(String), right: right.map(String), aside: rest.map(String), tilt, shape: 'ball' }
  return choose(
    d,
    rng,
    `readGroup-${split.each.join('')}-${tilt}`,
    [T('m5.defect.group.data'), scale, T('m5.defect.group.which')],
    nos(answer),
    options.filter((o) => o !== answer).slice(0, 3).map(nos),
  )
}

/** 例 2 的表：分成的份数、每份的数量、至少要称的次数（照课本：4 份、2 份、3 份），问号放在一格里 */
function splitTable(blank?: [number, 0 | 2]): StemPart {
  const rows = SPLITS.map((s, i) => {
    const cells: (number | LStr | null)[] = [s.each.length, `（${s.each.join('，')}）`, s.times]
    if (blank && blank[0] === i) cells[blank[1]] = null
    return cells
  })
  return { kind: 'stat-table', head: 'row', rows: [[L('m5.defect.th.parts'), L('m5.defect.th.each'), L('m5.defect.th.times')], ...rows] }
}
function qTable(d: Difficulty, rng: RNG): Question {
  const i = rng.int(0, SPLITS.length - 1)
  const col = rng.chance(0.75) ? 2 : 0
  const s = SPLITS[i]!
  const v = col === 2 ? s.times : s.each.length
  return ask(d, rng, `table-${i}-${col}`, [T('m5.defect.split.data'), splitTable([i, col]), T('m5.defect.table.q')], v, col === 2 ? [1, 2, 3, 4] : [2, 3, 4, 8], 9)
}
/** 例 2 (1)：表中哪种方法称的次数最少（分成 3 份） */
function qBest(d: Difficulty, rng: RNG): Question {
  const parts = (k: number): LStr => L('m5.defect.parts', { k })
  return choose(d, rng, 'best', [T('m5.defect.split.data'), splitTable(), T('m5.defect.best.q')], parts(3), [parts(2), parts(4)])
}

/** 练习二十七 1：5 瓶钙片，先称 1 号和 2 号（平衡），再称 3 号和 4 号（图）：平衡——次品是 5 号；不平衡——轻的那瓶 */
function qFive(d: Difficulty, rng: RNG): Question {
  const second = rng.pick(['level', 'level', 'left', 'right'] as const)
  // 第一次平衡（1、2 都不是），第二次：平衡是 5 号；左边低 = 左边重，次品轻是右边的 4 号
  const answer = second === 'level' ? '5' : second === 'left' ? '4' : '3'
  return choose(
    d,
    rng,
    `five-${second}`,
    [T('m5.defect.five.data'), { kind: 'balance', left: ['3'], right: ['4'], aside: ['5'], tilt: second, shape: 'box' }, T('m5.defect.read.which')],
    answer,
    ['3', '4', '5'].filter((x) => x !== answer),
  )
}
/** 练习二十七 4：12 袋平均分成 3 份（4，4，4），先称两份，平衡——次品在剩下的几袋里 */
function qThird(d: Difficulty, rng: RNG): Question {
  const n = rng.chance(0.4) ? 12 : 3 * rng.int(2, 9)
  return ask(d, rng, `third-${n}`, [T('m5.defect.third.q', { n })], n / 3, [n / 2, n - n / 3, 2 * (n / 3), 3], 99)
}
/** 第 3 档：练习二十七 5，3 袋白糖不知道次品比 500 克重还是轻——至少称 2 次 */
function qSugar(d: Difficulty, rng: RNG): Question {
  return ask(d, rng, 'sugar', [T('m5.defect.sugar.q')], 2, [1, 3, 4], 9)
}

function defective(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 例 1：3 瓶钙片称几次、看天平找次品；例 2：8 个零件称几次、看天平、分法的表、哪种分法最少
    if (roll < 0.3) return qHowMany(d, rng)
    if (roll < 0.52) return qReadOne(d, rng)
    if (roll < 0.7) return qReadGroup(d, rng)
    if (roll < 0.88) return qTable(d, rng)
    return qBest(d, rng)
  }
  if (d === 2) {
    // 练习二十七：5 瓶钙片的过程、28 瓶水、15 盒饼干、12 袋糖果；9、10、11 个零件
    if (roll < 0.55) return qHowMany(d, rng)
    if (roll < 0.75) return qFive(d, rng)
    return qThird(d, rng)
  }
  if (roll < 0.3) return qSugar(d, rng)
  return qHowMany(d, rng)
}
defineGenerator(K, defective)
