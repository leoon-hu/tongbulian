import type { ChanceBalls, ChanceColor, Difficulty, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 可能性（五上第七单元，新教材 p98–106；五年级数学 C，照笔记 D 第七单元写）：三个知识点，课本没印小节标题。
// 认识可能性：导入（结果可以预测 / 无法预测：硬币一定会掉下来、正面还是反面朝上、太阳从西边升起、击鼓传花）、例 1（三张卡片抽签：
//   可能 / 不可能 / 一定）、做一做（两个盒子：8 个红棋子 / 红黄绿蓝各 2 个）；练习十九 1（4 个盒子连一连）、7（涂一涂改成选盒子）、
//   9（一次摸 3 个棋子）；练习二十 4（判断）。
// 可能性的大小：例 2（红 4、蓝 1 的盒子摸 20 次，红 17 蓝 3）、做一做 1（红 7 蓝 4 黄 1）；练习十九 2（转盘）、3（卡片）、4（袋子）、
//   5（写着 1–6 的正方体：单数、双数）、8（10 张数字卡片）；练习二十 1（涂转盘改成选转盘）、2（哪个盒子更容易摸到绿球）、3（涂正方体）；
//   *掷一掷（两个正方体点数之和）放第 3 档。
// 根据试验数据推测：例 3（八个小组各摸 20 次，红 15 黄 5……合计 123 / 37）、做一做（红 129、蓝 35、黄 36，小亮的判断）；练习十九 6。
// 作答：一定 / 可能 / 不可能、颜色、盒子 / 转盘的编号、对 / 不对都是选项；次数、合计、几种结果、几个面是数字键盘。
// 图：摸球盒（DrawBox，新做）、转盘（Spinner，新做）、记录单（TallySheet）、统计表（StatTable）、写着数的正方体（DiceGlyph）。
// 题干把颜色和个数写成字（图不读）；课本没有的数（换数的盒子、转盘、记录）都在旁边注明「自己定的」。
// 朗读：不写「转动」「转盘」（转），写「指针」；「倒扣」写成「背面朝上」；硬币「落下来」写「掉下来」；课本的「单数」「双数」照用。
// 「练习二十 4 (4)：周长相等时，正方形的面积一定比长方形大」按约定不出。
// ─────────────────────────────────────────────────────────────

const K1 = 'm5s1-08-certain'
const K2 = 'm5s1-08-likely'
const K3 = 'm5s1-08-infer'
type P = Record<string, LStr | number>
const L = (k: string, p?: P): LStr => (p ? { k: `m5.chance.${k}`, p } : { k: `m5.chance.${k}` })
const T = (k: string, p?: P): StemPart => ({ kind: 'text', text: L(k, p) })
const C = (c: ChanceColor): LStr => L(`c.${c}`)
const YES = L('yes')
const NO = L('no')
const B = (color: ChanceColor, n: number): ChanceBalls => ({ color, n })
const box = (boxes: ChanceBalls[][], o: { piece?: 'ball' | 'pawn'; bag?: boolean; numbered?: boolean } = {}): StemPart => ({ kind: 'draw-box', boxes, ...o })
/** 盒子里的球写成一句话：「红球 3 个、蓝球 3 个」（piece = 棋子） */
const contents = (balls: ChanceBalls[], piece: 'ball' | 'pawn' = 'ball'): LStr =>
  balls.map((b) => L(piece === 'pawn' ? 'has.pawn' : 'has.ball', { c: C(b.color), n: b.n })).reduce((acc, x, i) => (i === 0 ? x : L('and', { a: acc, b: x })))
const tf = (kpId: string, d: Difficulty, sig: string, stem: StemPart[], ok: boolean, rng: RNG): Question =>
  labelQuestion({ kpId, type: 'chance', difficulty: d, sig, stem, correct: ok ? YES : NO, distractors: [ok ? NO : YES], rng })
/** 一定会 / 可能会 / 不可能 */
const WILL = ['sure', 'maybe', 'never'] as const
type Will = (typeof WILL)[number]
const willQ = (kpId: string, d: Difficulty, sig: string, stem: StemPart[], will: Will, rng: RNG): Question =>
  labelQuestion({ kpId, type: 'chance', difficulty: d, sig, stem, correct: L(`will.${will}`), distractors: WILL.filter((w) => w !== will).map((w) => L(`will.${w}`)), rng })
const no = (n: number): LStr => L('no.box', { n })

// ══ 认识可能性（m5s1-08-certain）══

/** 导入的四个情景：一定会 / 可能会 / 不可能 */
export const INTRO: [string, Will][] = [
  ['sun', 'never'],
  ['drop', 'sure'],
  ['coin', 'maybe'],
  ['flower', 'maybe'],
]
function qIntro(d: Difficulty, rng: RNG): Question {
  const [k, will] = rng.pick(INTRO)
  return willQ(K1, d, `intro-${k}`, [T(`intro.${k}`)], will, rng)
}

/** 例 1：三张卡片（唱歌、跳舞、朗诵）背面朝上，小明、小丽、小红依次抽签。课本的顺序是小明抽到跳舞、小丽抽到朗诵；别的顺序是自己配的 */
export const SHOWS = ['sing', 'dance', 'recite'] as const
type Show = (typeof SHOWS)[number]
const show = (s: Show): LStr => L(`show.${s}`)
function qDraw(d: Difficulty, rng: RNG): Question {
  const order: Show[] = rng.chance(0.5) ? ['dance', 'recite', 'sing'] : rng.shuffle(SHOWS)
  const [x, y, z] = order as [Show, Show, Show]
  const stage = rng.int(0, 2)
  const p = rng.pick(SHOWS)
  if (stage === 0) return willQ(K1, d, `draw0-${p}`, [T('draw.0', { p: show(p) })], 'maybe', rng)
  if (stage === 1) return willQ(K1, d, `draw1-${x}-${p}`, [T('draw.1', { x: show(x), p: show(p) })], p === x ? 'never' : 'maybe', rng)
  // 最后一张：一定是剩下的那个；也问「小红会抽到什么节目」
  if (rng.chance(0.35)) {
    return labelQuestion({ kpId: K1, type: 'chance', difficulty: d, sig: `draw2what-${x}-${y}`, stem: [T('draw.last', { x: show(x), y: show(y) })], correct: show(z), distractors: [show(x), show(y)], rng })
  }
  return willQ(K1, d, `draw2-${x}-${y}-${p}`, [T('draw.2', { x: show(x), y: show(y), p: show(p) })], p === z ? 'sure' : 'never', rng)
}

/** 做一做：盒 A 8 个红棋子，盒 B 红、黄、绿、蓝各 2 个（两个盒子的先后随机） */
function qTwoBoxes(d: Difficulty, rng: RNG): Question {
  const a: ChanceBalls[] = [B('red', 8)]
  const b: ChanceBalls[] = [B('red', 2), B('yellow', 2), B('green', 2), B('blue', 2)]
  const aFirst = rng.chance(0.5)
  const boxes = aFirst ? [a, b] : [b, a]
  const noA = aFirst ? 1 : 2
  const noB = aFirst ? 2 : 1
  const ask = rng.pick(['sure', 'maybe', 'never'] as const)
  const c = ask === 'sure' ? 'red' : rng.pick(['yellow', 'green', 'blue'] as const)
  const right = ask === 'maybe' ? noB : noA
  return labelQuestion({
    kpId: K1,
    type: 'chance',
    difficulty: d,
    sig: `two-${ask}-${c}-${aFirst ? 'a' : 'b'}`,
    stem: [T(`two.${ask}`, { c: C(c) }), box(boxes, { piece: 'pawn', numbered: true })],
    correct: no(right),
    distractors: [no(right === 1 ? 2 : 1)],
    rng,
  })
}

/** 练习十九 1：每盒 6 个球（课本的 4 个盒子），摸出一个，结果是「一定 / 可能 / 不可能摸到某色球」 */
export const BOXES_19: ChanceBalls[][] = [
  [B('blue', 3), B('red', 3)],
  [B('yellow', 6)],
  [B('blue', 6)],
  [B('blue', 2), B('red', 2), B('yellow', 2)],
]
const SAY = ['sure', 'maybe', 'never'] as const
function qOneBox(d: Difficulty, rng: RNG): Question {
  const at = rng.int(0, BOXES_19.length - 1)
  const balls = BOXES_19[at]!
  const c = rng.pick(['red', 'yellow', 'blue'] as const)
  const n = balls.find((x) => x.color === c)?.n ?? 0
  const total = balls.reduce((s, x) => s + x.n, 0)
  const truth = n === total ? 'sure' : n > 0 ? 'maybe' : 'never'
  return labelQuestion({
    kpId: K1,
    type: 'chance',
    difficulty: d,
    sig: `one-${at}-${c}`,
    stem: [T('one.ask'), box([balls])],
    correct: L(`one.${truth}`, { c: C(c) }),
    distractors: SAY.filter((s) => s !== truth).map((s) => L(`one.${s}`, { c: C(c) })),
    rng,
  })
}

/** 练习十九 7（涂一涂改成选盒子）：三个盒子各 5 个球，哪个盒子摸出的一定是 / 不可能是 / 可能是某色球。三组盒子是自己配的 */
function qThreeBoxes(d: Difficulty, rng: RNG): Question {
  const ask = rng.pick(['sure', 'never', 'maybe'] as const)
  // 第一个是对的那个盒子
  const sets: Record<typeof ask, { c: ChanceColor; boxes: ChanceBalls[][] }> = {
    sure: { c: 'blue', boxes: [[B('blue', 5)], [B('blue', 3), B('red', 2)], [B('red', 5)]] },
    never: { c: 'yellow', boxes: [[B('red', 3), B('blue', 2)], [B('yellow', 4), B('red', 1)], [B('yellow', 2), B('blue', 3)]] },
    maybe: { c: 'red', boxes: [[B('red', 2), B('blue', 3)], [B('blue', 5)], [B('yellow', 5)]] },
  }
  const { c, boxes } = sets[ask]
  const order = rng.shuffle([0, 1, 2])
  const right = order.indexOf(0) + 1
  return labelQuestion({
    kpId: K1,
    type: 'chance',
    difficulty: d,
    sig: `three-${ask}-${order.join('')}`,
    stem: [T(`three.${ask}`, { c: C(c) }), box(order.map((i) => boxes[i]!), { numbered: true })],
    correct: no(right),
    distractors: [1, 2, 3].filter((k) => k !== right).map(no),
    rng,
  })
}

/** 练习十九 9：盒子里红 7、蓝 3、黄 2 个棋子，一次摸出 3 个——可能 3 个都是某色吗（黄的只有 2 个：不可能）；一共可能有几种结果（9 种） */
const BOX_9: ChanceBalls[] = [B('red', 7), B('blue', 3), B('yellow', 2)]
function qThreeOf(d: Difficulty, rng: RNG): Question {
  const c = rng.pick(['red', 'blue', 'yellow'] as const)
  const ok = (BOX_9.find((x) => x.color === c)?.n ?? 0) >= 3
  return labelQuestion({
    kpId: K1,
    type: 'chance',
    difficulty: d,
    sig: `threeof-${c}`,
    stem: [T('threeof.ask', { c: C(c) }), box([BOX_9], { piece: 'pawn' })],
    correct: L(ok ? 'can.maybe' : 'can.never'),
    distractors: [L(ok ? 'can.never' : 'can.maybe')],
    rng,
  })
}
const qKinds = (d: Difficulty, rng: RNG): Question =>
  numberQuestion({ kpId: K1, type: 'chance', difficulty: d, sig: 'kinds', stem: [T('threeof.kinds'), box([BOX_9], { piece: 'pawn' })], value: 9, rng, min: 0, max: 30, smart: [10, 3, 8, 27], input: 'numpad' })

/** 练习二十 4 的三个判断（都不对），外加两句对的（导入的硬币、只装红球的盒子，自己配的）；(4) 周长相等的那句不出 */
export const JUDGE_20: [string, boolean][] = [
  ['coin2', false],
  ['sum', false],
  ['tri', false],
  ['onlyRed', true],
  ['coinBack', true],
]
function qJudge(d: Difficulty, rng: RNG): Question {
  const [k, ok] = rng.pick(JUDGE_20)
  return tf(K1, d, `judge-${k}`, [T(`judge.${k}`)], ok, rng)
}
/** 导入与整理和复习：结果可以预测（一定发生 / 不可能发生）还是无法预测（可能发生） */
export const PREDICT: [string, boolean][] = [
  ['drop', true],
  ['face', false],
  ['sun', true],
  ['flower', false],
]
function qPredict(d: Difficulty, rng: RNG): Question {
  const [k, ok] = rng.pick(PREDICT)
  return labelQuestion({ kpId: K1, type: 'chance', difficulty: d, sig: `predict-${k}`, stem: [T('predict.ask'), T(`predict.${k}`)], correct: L(ok ? 'predict.can' : 'predict.cannot'), distractors: [L(ok ? 'predict.cannot' : 'predict.can')], rng })
}

function certain(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 导入、例 1、做一做、练习十九 1
    if (roll < 0.22) return qIntro(d, rng)
    if (roll < 0.52) return qDraw(d, rng)
    if (roll < 0.74) return qTwoBoxes(d, rng)
    return qOneBox(d, rng)
  }
  if (d === 2) {
    // 练习十九 7、9，练习二十 4，结果能不能预测
    if (roll < 0.3) return qThreeBoxes(d, rng)
    if (roll < 0.55) return qThreeOf(d, rng)
    if (roll < 0.8) return qJudge(d, rng)
    return qPredict(d, rng)
  }
  if (roll < 0.4) return qKinds(d, rng)
  if (roll < 0.7) return qThreeOf(d, rng)
  return qJudge(d, rng)
}
defineGenerator(K1, certain)

// ══ 可能性的大小（m5s1-08-likely）══

/** 一盒球里哪种颜色可能性最大 / 最小（颜色的个数各不相同） */
function mostLeast(kpId: string, d: Difficulty, rng: RNG, sig: string, stem: StemPart[], balls: ChanceBalls[], piece: 'ball' | 'pawn', most: boolean): Question {
  const sorted = [...balls].sort((a, b) => b.n - a.n)
  const right = most ? sorted[0]! : sorted[sorted.length - 1]!
  const label = (c: ChanceColor): LStr => L(piece === 'pawn' ? 'pawn.c' : 'ball.c', { c: C(c) })
  return labelQuestion({ kpId, type: 'chance', difficulty: d, sig, stem, correct: label(right.color), distractors: balls.filter((x) => x !== right).map((x) => label(x.color)), rng })
}
/** 例 2：盒子里红 4、蓝 1 个棋子，摸 20 次的记录（红 17、蓝 3），再摸一次摸出哪种颜色的可能性大 */
function qEx2(d: Difficulty, rng: RNG): Question {
  const balls = [B('red', 4), B('blue', 1)]
  const stem: StemPart[] = [
    T('ex2'),
    box([balls], { piece: 'pawn' }),
    { kind: 'tally', rows: [{ label: L('c.red'), icon: '🔴', count: 17, mark: 'zheng' }, { label: L('c.blue'), icon: '🔵', count: 3, mark: 'zheng' }] },
  ]
  return mostLeast(K2, d, rng, 'ex2', stem, balls, 'pawn', true)
}
/** 例 2 做一做 1：红 7、蓝 4、黄 1 个棋子，可能性最大 / 最小（课本）；另外两盒是自己配的 */
export const DO_2: ChanceBalls[][] = [
  [B('red', 7), B('blue', 4), B('yellow', 1)],
  [B('blue', 6), B('red', 3), B('yellow', 1)],
  [B('yellow', 5), B('green', 2), B('red', 1)],
]
function qMost(d: Difficulty, rng: RNG): Question {
  const at = rng.chance(0.5) ? 0 : rng.int(1, DO_2.length - 1)
  const balls = DO_2[at]!
  const most = rng.chance(0.5)
  return mostLeast(K2, d, rng, `most-${at}-${most ? 'max' : 'min'}`, [T(most ? 'most.max' : 'most.min', { x: contents(balls, 'pawn') }), box([balls], { piece: 'pawn' })], balls, 'pawn', most)
}
/** 练习十九 2：转盘平均分成 6 份（黄 5 红 1，问可能性大；蓝 4 黄 2，问可能性小）；8 份的两个是自己配的 */
export const SPINNERS: { s: ChanceColor[]; ask: 'big' | 'small' }[] = [
  { s: ['yellow', 'yellow', 'red', 'yellow', 'yellow', 'yellow'], ask: 'big' },
  { s: ['blue', 'yellow', 'blue', 'blue', 'yellow', 'blue'], ask: 'small' },
  { s: ['green', 'green', 'red', 'green', 'green', 'red', 'green', 'green'], ask: 'big' },
  { s: ['red', 'blue', 'red', 'red', 'red', 'blue', 'red', 'red'], ask: 'small' },
]
function qSpinner(d: Difficulty, rng: RNG): Question {
  const at = rng.chance(0.6) ? rng.int(0, 1) : rng.int(2, 3)
  const sp = SPINNERS[at]!
  const count = new Map<ChanceColor, number>()
  for (const c of sp.s) count.set(c, (count.get(c) ?? 0) + 1)
  const [a, b] = [...count.entries()].sort((x, y) => y[1] - x[1]) as [[ChanceColor, number], [ChanceColor, number]]
  const right = sp.ask === 'big' ? a[0] : b[0]
  const wrong = sp.ask === 'big' ? b[0] : a[0]
  return labelQuestion({ kpId: K2, type: 'chance', difficulty: d, sig: `spin-${at}`, stem: [T(`spin.${sp.ask}`), { kind: 'spinner', items: [sp.s] }], correct: L('region', { c: C(right) }), distractors: [L('region', { c: C(wrong) })], rng })
}
/** 练习十九 3：9 张卡片（讲故事 5、唱歌 3、跳舞 1），最有可能 / 最不可能抽到什么 */
function qCards(d: Difficulty, rng: RNG): Question {
  const most = rng.chance(0.6)
  const table: StemPart = {
    kind: 'stat-table',
    head: 'col',
    rows: [
      [L('card.story'), L('cards', { n: 5 })],
      [L('card.sing'), L('cards', { n: 3 })],
      [L('card.dance'), L('cards', { n: 1 })],
    ],
  }
  const right = most ? 'story' : 'dance'
  return labelQuestion({ kpId: K2, type: 'chance', difficulty: d, sig: `cards-${most ? 'max' : 'min'}`, stem: [T(most ? 'cards.max' : 'cards.min'), table], correct: L(`card.${right}`), distractors: ['story', 'sing', 'dance'].filter((x) => x !== right).map((x) => L(`card.${x}`)), rng })
}
/** 练习十九 4：袋子里红 8、蓝 2 个球，摸出哪种球的可能性大 */
function qBag(d: Difficulty, rng: RNG): Question {
  const balls = [B('red', 8), B('blue', 2)]
  return mostLeast(K2, d, rng, 'bag', [T('bag'), box([balls], { bag: true })], balls, 'ball', true)
}
/** 练习二十 2：两个盒子各 15 个球（红 4 黄 4 蓝 4 绿 3 / 绿 9 蓝 3 黄 2 红 1），在哪个盒子里更容易摸到某色球 */
function qEasier(d: Difficulty, rng: RNG): Question {
  const a: ChanceBalls[] = [B('red', 4), B('yellow', 4), B('blue', 4), B('green', 3)]
  const b: ChanceBalls[] = [B('green', 9), B('blue', 3), B('yellow', 2), B('red', 1)]
  const c = rng.chance(0.5) ? 'green' : rng.pick(['red', 'yellow', 'blue'] as const)
  const aFirst = rng.chance(0.5)
  const nA = a.find((x) => x.color === c)!.n
  const nB = b.find((x) => x.color === c)!.n
  const right = nA > nB === aFirst ? 1 : 2
  return labelQuestion({
    kpId: K2,
    type: 'chance',
    difficulty: d,
    sig: `easier-${c}-${aFirst ? 'a' : 'b'}`,
    stem: [T('easier', { c: C(c) }), box(aFirst ? [a, b] : [b, a], { numbered: true })],
    correct: no(right),
    distractors: [no(right === 1 ? 2 : 1)],
    rng,
  })
}
/** 练习十九 5：六个面写着 1–6 的正方体，掷出单数和双数的可能性一样大 */
function qOddEven(d: Difficulty, rng: RNG): Question {
  const dice: StemPart = { kind: 'dice', front: 1, top: 5, right: 3 }
  if (rng.chance(0.5)) return tf(K2, d, 'oddeven-tf', [T('oddeven.tf'), dice], true, rng)
  return labelQuestion({ kpId: K2, type: 'chance', difficulty: d, sig: 'oddeven', stem: [T('oddeven.ask'), dice], correct: L('same'), distractors: [L('odd'), L('even')], rng })
}
/** 练习二十 3：给正方体的面涂红、蓝两种颜色，要使红色面朝上的可能性比蓝色面大 */
function qPaint(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.4)) return numberQuestion({ kpId: K2, type: 'chance', difficulty: d, sig: 'paint-min', stem: [T('paint.min')], value: 4, rng, min: 0, max: 6, smart: [3, 5, 6], input: 'numpad' })
  const right = rng.pick([4, 5])
  const opt = (r: number): LStr => L('paint.opt', { r, b: 6 - r })
  return labelQuestion({ kpId: K2, type: 'chance', difficulty: d, sig: `paint-${right}`, stem: [T('paint.ask')], correct: opt(right), distractors: [3, 2, 1].map(opt), rng })
}
/** 练习二十 1（涂转盘改成选转盘）：8 份的转盘，哪个符合「红、黄、蓝都可能，蓝最大、红最小」/「红、黄、蓝都可能」。几个转盘是自己配的 */
const wheel = (blue: number, yellow: number, red: number): ChanceColor[] => {
  // 颜色交错着排（课本涂的不一定挨着）：每次放剩下最多、又和上一份不同的颜色
  const left: Record<'blue' | 'yellow' | 'red', number> = { blue, yellow, red }
  const out: ChanceColor[] = []
  let prev: ChanceColor | undefined
  for (let i = 0; i < blue + yellow + red; i++) {
    const cands = (['blue', 'yellow', 'red'] as const).filter((c) => left[c] > 0).sort((a, b) => left[b] - left[a])
    const c = cands.find((x) => x !== prev) ?? cands[0]!
    out.push(c)
    left[c] -= 1
    prev = c
  }
  return out
}
function qPickWheel(d: Difficulty, rng: RNG): Question {
  const full = rng.chance(0.6)
  const right = full ? wheel(4, 3, 1) : wheel(3, 3, 2)
  const wrongs = full ? [wheel(1, 3, 4), wheel(3, 3, 2), wheel(5, 3, 0)] : [wheel(5, 3, 0), wheel(4, 0, 4), wheel(8, 0, 0)]
  const pick = rng.shuffle(wrongs).slice(0, 2)
  const items = rng.shuffle([right, ...pick])
  const at = items.indexOf(right) + 1
  return labelQuestion({
    kpId: K2,
    type: 'chance',
    difficulty: d,
    sig: `wheel-${full ? 'full' : 'three'}-${items.map((w) => (['blue', 'yellow', 'red'] as const).map((c) => `${c[0]}${w.filter((x) => x === c).length}`).join('')).join('.')}`,
    stem: [T(full ? 'wheel.full' : 'wheel.three'), { kind: 'spinner', items, numbered: true }],
    correct: L('no.wheel', { n: at }),
    distractors: [1, 2, 3].filter((k) => k !== at).map((n) => L('no.wheel', { n })),
    rng,
  })
}
/** 练习二十 5（设计公平的游戏改成判断）、导入的掷硬币开球：这个游戏公平吗。红 5 蓝 3 的转盘是自己配的 */
function qFair(d: Difficulty, rng: RNG): Question {
  const which = rng.pick(['half', 'uneven', 'coin'] as const)
  const fair = which !== 'uneven'
  const stem: StemPart[] = [T(`fair.${which}`)]
  if (which === 'half') stem.push({ kind: 'spinner', items: [['red', 'blue', 'red', 'blue', 'red', 'blue', 'red', 'blue']] })
  if (which === 'uneven') stem.push({ kind: 'spinner', items: [['red', 'red', 'blue', 'red', 'red', 'blue', 'red', 'blue']] })
  return labelQuestion({ kpId: K2, type: 'chance', difficulty: d, sig: `fair-${which}`, stem, correct: L(fair ? 'fair' : 'unfair'), distractors: [L(fair ? 'unfair' : 'fair')], rng })
}
/** 练习十九 5 的变式（自己配的）：正方体六个面写着 1、1、1、2、2、3，掷出几的可能性最大 */
const qFaces = (d: Difficulty, rng: RNG): Question =>
  numberQuestion({ kpId: K2, type: 'chance', difficulty: d, sig: 'faces', stem: [T('faces')], value: 1, rng, min: 0, max: 6, smart: [2, 3, 6], input: 'numpad' })
/** *掷一掷：两个写着 1–6 的正方体，点数之和最小 / 最大是几、和是 7 有几种情况、和是几的可能性最大、老师的游戏公平吗 */
function qTwoDice(d: Difficulty, rng: RNG): Question {
  const which = rng.pick(['min', 'max', 'seven', 'best', 'game'] as const)
  const dice: StemPart[] = [{ kind: 'dice', front: 1, top: 5, right: 3 }]
  if (which === 'game') return labelQuestion({ kpId: K2, type: 'chance', difficulty: d, sig: 'dice-game', stem: [T('dice.game'), ...dice], correct: L('unfair'), distractors: [L('fair')], rng })
  const value = { min: 2, max: 12, seven: 6, best: 7 }[which]
  const smart = { min: [1, 3, 0], max: [6, 11, 36], seven: [7, 5, 3], best: [6, 12, 8] }[which]
  return numberQuestion({ kpId: K2, type: 'chance', difficulty: d, sig: `dice-${which}`, stem: [T(`dice.${which}`), ...dice], value, rng, min: 0, max: 36, smart, input: 'numpad' })
}
/** 练习十九 8（填卡片改成选一组）：10 张数字卡片，要使摸出 1 的可能性最大、5 最小、3 和 7 一样大 */
function qCards10(d: Difficulty, rng: RNG): Question {
  // 对的一组：1 有 5 张、3 和 7 各 2 张、5 有 1 张；错的：1 不是最多（3、3、2、2）、3 和 7 不一样多（4、3、2、1）、5 不是最少（4、2、2、2）
  const opt = (a: number, b: number, c: number, e: number): LStr => L('ten.opt', { a, b, c, e })
  return labelQuestion({
    kpId: K2,
    type: 'chance',
    difficulty: d,
    sig: 'ten',
    stem: [T('ten.ask')],
    correct: opt(5, 2, 2, 1),
    distractors: [opt(3, 3, 2, 2), opt(4, 3, 2, 1), opt(4, 2, 2, 2)],
    rng,
  })
}

function likely(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 例 2、做一做 1，练习十九 2、3、4、5，练习二十 2
    if (roll < 0.12) return qEx2(d, rng)
    if (roll < 0.3) return qMost(d, rng)
    if (roll < 0.48) return qSpinner(d, rng)
    if (roll < 0.62) return qCards(d, rng)
    if (roll < 0.7) return qBag(d, rng)
    if (roll < 0.88) return qEasier(d, rng)
    return qOddEven(d, rng)
  }
  if (d === 2) {
    // 练习二十 1、3，公平吗，练习十九 5 的变式
    if (roll < 0.3) return qPickWheel(d, rng)
    if (roll < 0.55) return qPaint(d, rng)
    if (roll < 0.8) return qFair(d, rng)
    if (roll < 0.9) return qFaces(d, rng)
    return qEasier(d, rng)
  }
  // 第 3 档：*掷一掷、练习十九 8
  if (roll < 0.7) return qTwoDice(d, rng)
  return qCards10(d, rng)
}
defineGenerator(K2, likely)

// ══ 根据试验数据推测（m5s1-08-infer）══

/** 例 3：八个小组各摸 20 次（课本的数），合计红 123、黄 37 */
export const GROUPS: [number, number][] = [
  [15, 5],
  [16, 4],
  [12, 8],
  [18, 2],
  [15, 5],
  [16, 4],
  [14, 6],
  [17, 3],
]
/** 一个小组的记录（课本例 3 的一组 15 / 5，其余组的数也是课本的；黄球多的三组是自己配的） */
function qGroup(d: Difficulty, rng: RNG): Question {
  const swap = rng.chance(0.25)
  const [r0, y0] = rng.pick(GROUPS)
  const [red, yellow] = swap ? [y0, r0] : [r0, y0]
  const stem: StemPart[] = [
    T('group'),
    { kind: 'tally', rows: [{ label: L('c.red'), count: red, mark: 'zheng' }, { label: L('c.yellow'), count: yellow, mark: 'zheng' }] },
  ]
  const more = red > yellow ? 'red' : 'yellow'
  return labelQuestion({ kpId: K3, type: 'chance', difficulty: d, sig: `group-${red}-${yellow}`, stem: [...stem, T('more.ask')], correct: L('more', { c: C(more) }), distractors: [L('more', { c: C(more === 'red' ? 'yellow' : 'red') })], rng })
}
/** 八个小组的统计表（10 列，StatTable 自动收窄） */
const groupsTable = (hide?: { row: 1 | 2; col: number }): StemPart => {
  const head: (LStr | number | null)[] = [L('t.group'), ...GROUPS.map((_, i) => i + 1), L('t.total')]
  const red: (LStr | number | null)[] = [L('t.red'), ...GROUPS.map((g) => g[0]), 123]
  const yellow: (LStr | number | null)[] = [L('t.yellow'), ...GROUPS.map((g) => g[1]), 37]
  const rows = [head, red, yellow]
  if (hide) rows[hide.row]![hide.col + 1] = null
  return { kind: 'stat-table', title: L('t.title'), head: 'both', rows }
}
function qGroups(d: Difficulty, rng: RNG): Question {
  return labelQuestion({ kpId: K3, type: 'chance', difficulty: d, sig: 'groups', stem: [T('groups'), groupsTable(), T('more.ask')], correct: L('more', { c: C('red') }), distractors: [L('more', { c: C('yellow') })], rng })
}
/** 例 3 做一做：红 129、蓝 35、黄 36 次——红球可能最多；小亮说黄球一定比蓝球多，对吗（不对） */
const doTable = (): StemPart => ({
  kind: 'stat-table',
  head: 'col',
  rows: [
    [L('t.color'), L('c.red'), L('c.blue'), L('c.yellow')],
    [L('t.times'), 129, 35, 36],
  ],
})
function qDo3(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.45)) return tf(K3, d, 'do3-liang', [T('do3.liang'), doTable()], false, rng)
  return labelQuestion({ kpId: K3, type: 'chance', difficulty: d, sig: 'do3-most', stem: [T('do3.most'), doTable()], correct: L('ball.c', { c: C('red') }), distractors: [L('ball.c', { c: C('blue') }), L('ball.c', { c: C('yellow') })], rng })
}
/** 练习十九 6：红 36、黄 20、白 4 次（60 次），可能哪种颜色的球最多 / 最少 */
function qP6(d: Difficulty, rng: RNG): Question {
  const most = rng.chance(0.5)
  const table: StemPart = {
    kind: 'stat-table',
    head: 'col',
    rows: [
      [L('t.color'), L('c.red'), L('c.yellow'), L('c.white')],
      [L('t.times'), 36, 20, 4],
    ],
  }
  const right = most ? 'red' : 'white'
  return labelQuestion({
    kpId: K3,
    type: 'chance',
    difficulty: d,
    sig: `p6-${most ? 'max' : 'min'}`,
    stem: [T(most ? 'p6.max' : 'p6.min'), table],
    correct: L('ball.c', { c: C(right) }),
    distractors: (['red', 'yellow', 'white'] as const).filter((c) => c !== right).map((c) => L('ball.c', { c: C(c) })),
    rng,
  })
}
/** 例 3 的表：八个小组一共摸出红球 / 黄球多少次、一共摸了多少次、某组摸出黄球几次（每组 20 次） */
function qTotals(d: Difficulty, rng: RNG, all = false): Question {
  if (all) return numberQuestion({ kpId: K3, type: 'chance', difficulty: d, sig: 'total-all', stem: [T('total.all'), groupsTable()], value: 160, rng, min: 0, max: 999, smart: [123, 37, 20, 8], input: 'numpad' })
  if (rng.chance(0.5)) {
    const red = rng.chance(0.5)
    return numberQuestion({ kpId: K3, type: 'chance', difficulty: d, sig: `total-${red ? 'r' : 'y'}`, stem: [T(red ? 'total.red' : 'total.yellow'), groupsTable({ row: red ? 1 : 2, col: 8 })], value: red ? 123 : 37, rng, min: 0, max: 999, smart: red ? [37, 160, 113] : [123, 160, 47], input: 'numpad' })
  }
  const g = rng.int(0, 7)
  const [red, yellow] = GROUPS[g]!
  return numberQuestion({ kpId: K3, type: 'chance', difficulty: d, sig: `rest-${g}`, stem: [T('rest', { g: L(`g${g + 1}`), r: red })], value: yellow, rng, min: 0, max: 20, smart: [red, 20, yellow + 1], input: 'numpad' })
}
/** 推测只能说「可能」：摸出过黄球，盒子里一定有黄球（对）；红球的次数多，盒子里的红球一定多（不对） */
function qMaybe(d: Difficulty, rng: RNG): Question {
  const ok = rng.chance(0.5)
  return tf(K3, d, `maybe-${ok ? 'has' : 'more'}`, [T(ok ? 'judge.has' : 'judge.more')], ok, rng)
}

function infer(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 例 3（一组、八组）与做一做；练习十九 6 偶尔也出
    if (roll < 0.5) return qGroup(d, rng)
    if (roll < 0.65) return qGroups(d, rng)
    if (roll < 0.9) return qDo3(d, rng)
    return qP6(d, rng)
  }
  if (d === 2) {
    // 练习十九 6、例 3 的表
    if (roll < 0.4) return qP6(d, rng)
    if (roll < 0.8) return qTotals(d, rng)
    return qGroup(d, rng)
  }
  if (roll < 0.5) return qMaybe(d, rng)
  if (roll < 0.75) return qTotals(d, rng, true)
  return qDo3(d, rng)
}
defineGenerator(K3, infer)
