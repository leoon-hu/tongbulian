import type { Difficulty, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'
import { translate } from '@/engine/i18n'

// ─────────────────────────────────────────────────────────────
// 六下「1 负数」（平台当前的旧版六下，课本第 2–7 页；六年级数学 F）：两个知识点。
//   认识负数（m6s2-01-meaning）：例 1 六个城市的气温预报、0 ℃ 的规定、零上 / 零下温度的记法和读法（负六摄氏度、正六摄氏度，+ 可以省略）；
//     例 2 电子账单、正数和负数、读法（先读「负」再读数）、0 既不是正数也不是负数、冰箱冷冻室 −18 ℃；做一做 1（−3 ℃ 与 −18 ℃ 哪个低）、
//     做一做 2（读出 −7、2.5、+4/5、0、−5.2、−1/3、+41，分正负）；练习一 1 月球温度、2 时差、3 水位和净重、4 海拔、6 家庭月收支与余额、8* 负增长（第 2、3 档）。
//   在直线上表示数（m6s2-01-line）：例 3 四名同学以树为起点向东、向西走（直线上 −4 m … 4 m）、回顾与反思（0 是分界点，0 右边正数、左边负数）、
//     做一做（每 0.5 一小格、只写 0 和 1 的直线上标 −4、−2、2.5、−0.5、1.5、−5/2）、练习一 5（点 A–E：−7、−4、−1、3、6）、
//     练习一 7（1 格 1 米，A 在 −1，和 A 相距 3 米的 B：−4 或 2）、你知道吗（刘徽「正算赤，负算黑」）。
// 六上新教材的「☆ 生活中的负数」（lifeneg.ts）也讲负数：分正负、0、账单、海拔、相反意义的量、读法、算筹这些题共用这里导出的函数，数据各照各的课本。
// 课本没教用 >、< 比负数，也没有「数轴」「相反数」「绝对值」——都不出；比温度只问「哪个温度低 / 高」。
// 朗读避坑：负号写 U+2212「−」、紧挨着数（「记作 −6 ℃」读「负6摄氏度」）；「～」不读（气温范围只写在表里）；「以……为起点」（为）写「把树的位置记作 0」；
//   「还是」（还）写「是什么数」「标在 0 的哪一边」；「量」「应」「处」「差」「转」「误差」都不写；「重」只在「净重」里；「增长」只在负增长那几题（第 2、3 档）。
// 作答：负数、带正号的数、小数、读法、名字一律选项；余额、距离、海平面的海拔这种非负整数用数字键盘。
// ─────────────────────────────────────────────────────────────

const KM = 'm6s2-01-meaning'
const KL = 'm6s2-01-line'

type P = Record<string, LStr | number>
export const L = (k: string, p?: P): LStr => (p ? { k, p } : { k })
export const T = (k: string, p?: P): StemPart => ({ kind: 'text', text: L(k, p) })

/** 出题的知识点和题型 */
export interface Ask {
  K: string
  type: 'negative' | 'percent'
}
const MEAN: Ask = { K: KM, type: 'negative' }
const LINE: Ask = { K: KL, type: 'negative' }

/** 数的写法：最多两位小数，不带多余的 0 */
export const fmt = (n: number): string => String(Math.round(n * 100) / 100)
/** 正负数的写法：负号用 U+2212「−」；plus = 正数前面写「+」（六下：为了和负数对比） */
export function signed(n: number, plus = false): string {
  if (n < 0) return `−${fmt(-n)}`
  return n > 0 && plus ? `+${fmt(n)}` : fmt(n)
}
/** 温度：「−6 ℃」「+6 ℃」「6 ℃」 */
export const temp = (n: number, plus = false): string => `${signed(n, plus)} ℃`

/** 选项题：干扰项按中文文字去重、去掉和正确项一样的，最多 max 个 */
export function choose(a: Ask, d: Difficulty, rng: RNG, sig: string, stem: StemPart[], correct: LStr, wrongs: LStr[], max = 3): Question {
  const seen = new Set([translate(correct, 'zh')])
  const distractors: LStr[] = []
  for (const w of wrongs) {
    const z = translate(w, 'zh')
    if (seen.has(z) || distractors.length >= max) continue
    seen.add(z)
    distractors.push(w)
  }
  return labelQuestion({ kpId: a.K, type: a.type, difficulty: d, sig, stem, correct, distractors, rng })
}
/** 数字键盘题（非负整数） */
export function keyIn(a: Ask, d: Difficulty, rng: RNG, sig: string, stem: StemPart[], value: number, max = 99999): Question {
  return numberQuestion({ kpId: a.K, type: a.type, difficulty: d, sig, stem, value, rng, min: 0, max, input: 'numpad' })
}
const YES = L('m6.neg.yes')
const NO = L('m6.neg.no')
export const judge = (a: Ask, d: Difficulty, rng: RNG, sig: string, stem: StemPart[], right: boolean): Question =>
  choose(a, d, rng, sig, stem, right ? YES : NO, [right ? NO : YES])

// ── 带单位的正负数（选项）────────────────────────────────────
export type Unit = 'yuan' | 'm' | 'g' | 'h' | 'cm' | 'floor'
/** 「−200 元」「+3 时」：单位是汉字，走词条（选项要注音） */
export const withUnit = (u: Unit, n: number, plus = true): LStr => L(`m6.neg.u.${u}`, { n: signed(n, plus) })

// ── 正数、负数、0 ──────────────────────────────────────────
const POS = L('m6.neg.pos')
const NEG = L('m6.neg.neg')
const NEITHER = L('m6.neg.neither')
/** 数池里的一个数：写法（「−3/8」「+41」「0」）和它的正负 */
export interface Num {
  s: string
  sign: -1 | 0 | 1
}
export const num = (s: string): Num => ({ s, sign: s === '0' ? 0 : s.startsWith('−') ? -1 : 1 })
/** 下面哪个数是负数 / 正数 / 既不是正数也不是负数：选项里恰好一个对的 */
export function qWhich(a: Ask, d: Difficulty, rng: RNG, pool: Num[]): Question {
  const want = rng.pick([-1, -1, 1, 1, 0] as const)
  const right = rng.pick(pool.filter((x) => x.sign === want))
  const others = rng.shuffle(pool.filter((x) => x.sign !== want))
  // 0 一定放进干扰项（问负数、正数时），负数 / 正数各取一些
  const zero = others.filter((x) => x.sign === 0)
  const rest = others.filter((x) => x.sign !== 0)
  const wrongs = [...zero, ...rest].slice(0, 3)
  const key = want === -1 ? 'm6.neg.which.neg' : want === 1 ? 'm6.neg.which.pos' : 'm6.neg.which.none'
  return choose(a, d, rng, `which-${want}-${right.s}-${wrongs.map((w) => w.s).join('_')}`, [T(key)], right.s, wrongs.map((w) => w.s))
}
/** x 是什么数：正数 / 负数 / 既不是正数也不是负数（0） */
export function qKind(a: Ask, d: Difficulty, rng: RNG, pool: Num[]): Question {
  const x = rng.pick(pool)
  const correct = x.sign === -1 ? NEG : x.sign === 1 ? POS : NEITHER
  return choose(a, d, rng, `kind-${x.s}`, [T('m6.neg.kind.q', { x: x.s })], correct, [POS, NEG, NEITHER])
}
/** 0 是正数（负数），对吗？ */
export function qZeroJudge(a: Ask, d: Difficulty, rng: RNG): Question {
  const pos = rng.chance(0.5)
  return judge(a, d, rng, `zeroj-${pos ? 'pos' : 'neg'}`, [T('m6.neg.zero.j', { k: pos ? POS : NEG })], false)
}
/** 这几个数里有几个负数 / 正数（数字键盘；0 两样都不算） */
export function qCount(a: Ask, d: Difficulty, rng: RNG, pool: Num[], size: [number, number]): Question {
  const list = rng.shuffle(pool).slice(0, rng.int(size[0], Math.min(size[1], pool.length)))
  const neg = rng.chance(0.55)
  const v = list.filter((x) => x.sign === (neg ? -1 : 1)).length
  return keyIn(a, d, rng, `count-${neg ? 'neg' : 'pos'}-${list.map((x) => x.s).join('_')}`, [T(neg ? 'm6.neg.count.neg' : 'm6.neg.count.pos', { list: list.map((x) => x.s).join('、') })], v, 20)
}

// ── 相反意义的量 ────────────────────────────────────────────
/** 意义相反的两种情况：pos 记正数、neg 记负数；词条 m6.neg.opp.<id>.pos / .neg 都带 {n} */
export interface Opp {
  id: string
  unit: Unit | 'C'
  /** 数取多少：[最小, 最大, 步长] */
  range: [number, number, number]
}
export const OPP: Record<string, Opp> = {
  money: { id: 'money', unit: 'yuan', range: [10, 100, 10] },
  temp: { id: 'temp', unit: 'C', range: [1, 30, 1] },
  sea: { id: 'sea', unit: 'm', range: [10, 100, 10] },
  water: { id: 'water', unit: 'm', range: [1, 4, 1] },
  weight: { id: 'weight', unit: 'g', range: [1, 9, 1] },
  time: { id: 'time', unit: 'h', range: [1, 9, 1] },
  east: { id: 'east', unit: 'm', range: [1, 9, 1] },
  profit: { id: 'profit', unit: 'yuan', range: [100, 900, 100] },
  deposit: { id: 'deposit', unit: 'yuan', range: [100, 900, 100] },
  lift: { id: 'lift', unit: 'm', range: [1, 9, 1] },
}
const pickIn = (rng: RNG, [lo, hi, step]: [number, number, number]): number => lo + step * rng.int(0, Math.floor((hi - lo) / step))
const oppLabel = (o: Opp, n: number): LStr => (o.unit === 'C' ? temp(n, true) : withUnit(o.unit, n))
/** 如果「收入 500 元」记作 +500 元，那么「支出 200 元」记作多少？（也反过来：给出负的，问正的） */
export function qOpp(a: Ask, d: Difficulty, rng: RNG, ids: string[]): Question {
  const o = OPP[rng.pick(ids)]!
  const x = pickIn(rng, o.range)
  let y = pickIn(rng, o.range)
  if (y === x) y = pickIn(rng, o.range)
  const givenNeg = rng.chance(0.35)
  const [gk, ak] = givenNeg ? ['neg', 'pos'] : ['pos', 'neg']
  const given = givenNeg ? -x : x
  const asked = givenNeg ? y : -y
  const stem = [T('m6.neg.opp.q', { x: L(`m6.neg.opp.${o.id}.${gk}`, { n: x }), xs: oppLabel(o, given), y: L(`m6.neg.opp.${o.id}.${ak}`, { n: y }) })]
  return choose(a, d, rng, `opp-${o.id}-${gk}-${x}-${y}`, stem, oppLabel(o, asked), [oppLabel(o, -asked), oppLabel(o, givenNeg ? x : -x)])
}

// ── 温度 ─────────────────────────────────────────────────────
/** 零下 / 零上 n 摄氏度记作多少；反过来：−n ℃ 表示什么。plus = 零上写「+」（六下；六上课本只写 6 ℃ 这样的） */
export function qTempWrite(a: Ask, d: Difficulty, rng: RNG, n: number, plus: boolean): Question {
  const roll = rng.next()
  if (roll < 0.4) return choose(a, d, rng, `below-${n}`, [T('m6.neg.below.q', { n })], temp(-n), [temp(n, plus)])
  if (roll < 0.65) return choose(a, d, rng, `above-${n}`, [T('m6.neg.above.q', { n })], temp(n, plus), [temp(-n)])
  const v = rng.chance(0.7) ? -n : n
  return choose(a, d, rng, `mean-${v}`, [T('m6.neg.mean.q', { t: temp(v, plus) })], L(v < 0 ? 'm6.neg.belowC' : 'm6.neg.aboveC', { n }), [L(v < 0 ? 'm6.neg.aboveC' : 'm6.neg.belowC', { n })])
}
/** 温度计（新组件）：液柱停在 v，读出温度 */
export const thermo = (values: number[], names?: LStr[], min = -30, max = 30): StemPart => ({
  kind: 'thermo',
  items: values.map((value, i) => (names?.[i] ? { value, name: names[i]! } : { value })),
  min,
  max,
  major: 10,
  minor: 2,
})
export function qThermo(a: Ask, d: Difficulty, rng: RNG, v: number, plus: boolean): Question {
  // 常错：0 上下看反（−v）、一小格当 1 ℃ 数（离最近的整十的格数没乘 2）
  const ten = Math.round(v / 10) * 10
  const halfOff = ten + (v - ten) / 2
  return choose(a, d, rng, `thermo-${v}`, [thermo([v]), T('m6.neg.thermo.q')], temp(v, plus), [temp(-v, plus), temp(halfOff, plus), temp(v + (v < 0 ? -2 : 2), plus)])
}
/** 两个温度哪个低（高）：做一做 1 的 −3 ℃ 与 −18 ℃ */
export function qLower(a: Ask, d: Difficulty, rng: RNG, x: number, y0: number, withThermo = false): Question {
  // 两个温度一定不一样（一样的话「哪个低」没有答案）
  const y = y0 === x ? x + (x < 0 ? 4 : -4) : y0
  const low = rng.chance(0.65)
  const want = low ? Math.min(x, y) : Math.max(x, y)
  const other = want === x ? y : x
  const [p, q] = rng.chance(0.5) ? [x, y] : [y, x]
  if (withThermo) {
    const names = [L('m6.neg.jia'), L('m6.neg.yi')]
    const stem = [thermo([p, q], names), T(low ? 'm6.neg.thermo.lower' : 'm6.neg.thermo.higher')]
    return choose(a, d, rng, `thermo2-${low ? 'low' : 'high'}-${p}_${q}`, stem, want === p ? names[0]! : names[1]!, [want === p ? names[1]! : names[0]!])
  }
  return choose(a, d, rng, `${low ? 'lower' : 'higher'}-${p}_${q}`, [T(low ? 'm6.neg.lower.q' : 'm6.neg.higher.q', { a: temp(p, true), b: temp(q, true) })], temp(want, true), [temp(other, true)])
}

// ── 读法与写法 ──────────────────────────────────────────────
/** 读法题的一个数：写在卡片上（不朗读）；w = 不带符号的读法词条（lang/negative.ts 的 m6.neg.w.*）；temp = 是温度（读「……摄氏度」） */
export interface ReadItem {
  sign: '+' | '−'
  /** 小数、整数写法（不带符号）；分数写在 frac */
  v?: string
  frac?: [number, number]
  temp?: boolean
}
/** 读法词条的键：5.2 → m6.neg.w.5p2，3/8 → m6.neg.w.3o8 */
export const wordKey = (it: { v?: string; frac?: [number, number] }): string => `m6.neg.w.${it.frac ? `${it.frac[0]}o${it.frac[1]}` : it.v!.replace('.', 'p')}`
const shown = (it: ReadItem): string => (it.frac ? `${it.sign}${it.frac[0]}/${it.frac[1]}` : `${it.sign}${it.v}`) + (it.temp ? ' ℃' : '')
const card = (it: ReadItem): StemPart =>
  it.frac ? { kind: 'dec-card', frac: it.frac, sign: it.sign } : { kind: 'dec-card', n: `${it.sign}${it.v}${it.temp ? ' ℃' : ''}` }
const reading = (kind: 'neg' | 'pos' | 'minus' | 'plus' | 'bare', it: { v?: string; frac?: [number, number] }, isTemp?: boolean): LStr =>
  L(`m6.neg.rd.${kind}${isTemp ? 'C' : ''}`, { w: L(wordKey(it)) })
/** 卡片上的数（温度）读作什么；常错：负号读成「减」、漏读符号、分数的分子分母读反 */
export function qRead(a: Ask, d: Difficulty, rng: RNG, it: ReadItem): Question {
  const neg = it.sign === '−'
  const correct = reading(neg ? 'neg' : 'pos', it, it.temp)
  const wrongs = neg ? [reading('minus', it, it.temp), reading('bare', it, it.temp)] : [reading('plus', it, it.temp), reading('neg', it, it.temp)]
  if (it.frac && it.frac[0] !== 1) wrongs.push(reading(neg ? 'neg' : 'pos', { frac: [it.frac[1], it.frac[0]] }, it.temp))
  return choose(a, d, rng, `read-${shown(it)}`, [card(it), T(it.temp ? 'm6.neg.read.qC' : 'm6.neg.read.q')], correct, wrongs)
}
/** 读作「负五点二」的数是哪个（题干读出来不碍事）；常错：符号写反、小数 / 分数的两部分写反 */
export function qWrite(a: Ask, d: Difficulty, rng: RNG, it: ReadItem): Question {
  const neg = it.sign === '−'
  const flip: ReadItem = { ...it, sign: neg ? '+' : '−' }
  const wrongs = [shown(flip)]
  if (it.frac && it.frac[0] !== 1) wrongs.push(shown({ ...it, frac: [it.frac[1], it.frac[0]] }))
  if (it.v?.includes('.')) wrongs.push(shown({ ...it, v: it.v.split('.').reverse().join('.') }))
  return choose(a, d, rng, `write-${shown(it)}`, [T('m6.neg.write.q', { r: reading(neg ? 'neg' : 'pos', it, it.temp) })], shown(it), wrongs)
}

// ── 账单、收支表 ────────────────────────────────────────────
/** 电子账单的一笔：词条 m6.neg.bill.<id>（项目）、m6.neg.bill.ev.<id>（发生了什么，带金额） */
export interface BillRow {
  id: string
  v: number
}
const billTable = (rows: BillRow[], ask?: string): StemPart => ({
  kind: 'stat-table',
  head: 'row',
  rows: [[L('m6.neg.th.item'), L('m6.neg.th.amount')], ...rows.map((r) => [L(`m6.neg.bill.${r.id}`), r.id === ask ? null : signed(r.v, true)])],
})
/** 账单上某一笔（−85 元）表示什么 */
export function qBillMean(a: Ask, d: Difficulty, rng: RNG, rows: BillRow[]): Question {
  const r = rng.pick(rows)
  const n = Math.abs(r.v)
  const stem = [T('m6.neg.bill.lead'), billTable(rows), T('m6.neg.bill.mean', { it: L(`m6.neg.bill.${r.id}`), v: signed(r.v, true) })]
  return choose(a, d, rng, `billmean-${r.id}`, stem, L(r.v < 0 ? 'm6.neg.expense' : 'm6.neg.income', { n: fmt(n) }), [L(r.v < 0 ? 'm6.neg.income' : 'm6.neg.expense', { n: fmt(n) })])
}
/** 账单上空着的那一笔记作多少元 */
export function qBillWrite(a: Ask, d: Difficulty, rng: RNG, rows: BillRow[]): Question {
  const r = rng.pick(rows)
  const stem = [T('m6.neg.bill.lead'), billTable(rows, r.id), T('m6.neg.bill.write', { ev: L(`m6.neg.bill.ev.${r.id}`) })]
  return choose(a, d, rng, `billwrite-${r.id}`, stem, withUnit('yuan', r.v), [withUnit('yuan', -r.v)])
}
/** 哪一笔是收入 */
function qBillWhich(a: Ask, d: Difficulty, rng: RNG, rows: BillRow[]): Question {
  const inc = rng.pick(rows.filter((r) => r.v > 0))
  const outs = rng.shuffle(rows.filter((r) => r.v < 0)).slice(0, 2)
  const stem = [T('m6.neg.bill.lead'), billTable(rows), T('m6.neg.bill.which')]
  return choose(a, d, rng, `billwhich-${inc.id}-${outs.map((o) => o.id).join('_')}`, stem, L(`m6.neg.bill.${inc.id}`), outs.map((o) => L(`m6.neg.bill.${o.id}`)))
}

// ── 海拔 ─────────────────────────────────────────────────────
/** 珠穆朗玛峰 8848.86 米、吐鲁番盆地最低点 −154.31 米、海平面 0 米（课本的数，不随机：大的小数每个都是单独一条音频） */
export function qAlt(a: Ask, d: Difficulty, rng: RNG, plus: boolean, rule: boolean): Question {
  const which = rng.pick(['high', 'high', 'low', 'low', 'sea'] as const)
  const stem = rule ? [T('m6.neg.alt.rule')] : []
  if (which === 'sea') return keyIn(a, d, rng, 'alt-sea', [...stem, T('m6.neg.alt.sea')], 0, 9)
  const v = which === 'high' ? 8848.86 : -154.31
  return choose(a, d, rng, `alt-${which}`, [...stem, T(`m6.neg.alt.${which}`)], withUnit('m', v, plus), [withUnit('m', -v, plus)])
}

// ── 算筹 ─────────────────────────────────────────────────────
/** 刘徽「正算赤，负算黑」：红色算筹摆的 23 是 +23，黑色算筹摆的 34 是 −34（课本的两个数；别的两位数第 2 档） */
export function qRods(a: Ask, d: Difficulty, rng: RNG, book: boolean): Question {
  const [red, n] = book ? rng.pick([[true, 23], [false, 34]] as const) : [rng.chance(0.5), rng.int(1, 5) * 10 + rng.int(1, 5)]
  const v = red ? n : -n
  return choose(a, d, rng, `rods-${red ? 'red' : 'black'}-${n}`, [T('m6.neg.rods.q', { c: L(red ? 'm6.neg.red' : 'm6.neg.black'), n })], signed(v, true), [signed(-v, true)])
}

// ── 带正负数的直线（DecScale）────────────────────────────────
/** from…to 每个整数一个长刻度，per = 每格再平均分几小格；show = 要写数的整数（不传全写）；unit = 刻度字后面的单位（例 3 的 m，0 不带） */
export function signLine(from: number, to: number, o: { per?: number; show?: number[]; unit?: string; points?: { at: number; name: LStr }[]; arrow?: number } = {}): StemPart {
  const per = o.per ?? 1
  const labels: string[] = []
  for (let v = from; v <= to; v++) labels.push(!o.show || o.show.includes(v) ? (o.unit && v !== 0 ? `${signed(v)} ${o.unit}` : signed(v)) : '')
  const idx = (at: number): number => Math.round((at - from) * per * 1000) / 1000
  return {
    kind: 'dec-scale',
    labels,
    per,
    ...(o.points?.length ? { points: o.points.map((p) => ({ i: idx(p.at), name: p.name })) } : {}),
    ...(o.arrow !== undefined ? { arrow: idx(o.arrow) } : {}),
  }
}
/** x 标在 0 的哪一边 */
export function qSide(a: Ask, d: Difficulty, rng: RNG, pool: string[]): Question {
  const x = rng.pick(pool)
  const left = x.startsWith('−')
  return choose(a, d, rng, `side-${x}`, [T('m6.neg.side.q', { x })], L(left ? 'm6.neg.left' : 'm6.neg.right'), [L(left ? 'm6.neg.right' : 'm6.neg.left')])
}
/** 六上「想一想」：0–5 写数、左边 4 个刻度不写数的直线，箭头指的地方表示几（−1…−4） */
export function qLeftOfZero(a: Ask, d: Difficulty, rng: RNG): Question {
  const k = rng.int(1, 4)
  const line = signLine(-4, 5, { show: [0, 1, 2, 3, 4, 5], arrow: -k })
  return choose(a, d, rng, `left-${k}`, [line, T('m6.neg.arrow.q')], signed(-k), [String(k), signed(-k - 1), signed(-(k - 1) || -5)])
}

// ═════════════════════════════════════════════════════════════
// 认识负数（m6s2-01-meaning）
// ═════════════════════════════════════════════════════════════

/** 例 1：中央气象台发布的六个城市的气温预报（最低, 最高） */
export const FORECAST6: { id: string; low: number; high: number }[] = [
  { id: 'bj', low: -4, high: 0 },
  { id: 'hrb', low: -26, high: -12 },
  { id: 'xa', low: -4, high: 6 },
  { id: 'ls', low: -6, high: 6 },
  { id: 'wh', low: 4, high: 6 },
  { id: 'hk', low: 18, high: 24 },
]
const rangeText = (c: { low: number; high: number }): string => `${signed(c.low)}～${signed(c.high)} ℃`
/** 例 1 填表：照预报说出某个城市的最高 / 最低气温（表里写课本的「−26～−12 ℃」，表不朗读） */
function qCity(d: Difficulty, rng: RNG): Question {
  const c = rng.pick(FORECAST6)
  const low = rng.chance(0.5)
  const v = low ? c.low : c.high
  const table: StemPart = { kind: 'stat-table', head: 'row', rows: [[L('m6.neg.th.city'), L('m6.neg.th.temp')], ...FORECAST6.map((x) => [L(`m6.neg.city.${x.id}`), rangeText(x)])] }
  const stem = [T('m6.neg.city.lead'), table, T(low ? 'm6.neg.city.low' : 'm6.neg.city.high', { c: L(`m6.neg.city.${c.id}`) })]
  // 常错：最高最低弄反、看成零上
  return choose(MEAN, d, rng, `city-${c.id}-${low ? 'low' : 'high'}`, stem, temp(v), [temp(low ? c.high : c.low), temp(-v), temp(v + (low ? 2 : -2))])
}
/** 第 2 档：哪个城市的最低气温最低 / 最高气温最高 */
function qCityMost(d: Difficulty, rng: RNG): Question {
  const cold = rng.chance(0.5)
  const best = cold ? 'hrb' : 'hk'
  const others = rng.shuffle(FORECAST6.filter((c) => c.id !== best)).slice(0, 2)
  const table: StemPart = { kind: 'stat-table', head: 'row', rows: [[L('m6.neg.th.city'), L('m6.neg.th.temp')], ...FORECAST6.map((x) => [L(`m6.neg.city.${x.id}`), rangeText(x)])] }
  return choose(MEAN, d, rng, `citymost-${cold ? 'cold' : 'warm'}-${others.map((o) => o.id).join('_')}`, [T('m6.neg.city.lead'), table, T(cold ? 'm6.neg.city.coldest' : 'm6.neg.city.warmest')], L(`m6.neg.city.${best}`), others.map((o) => L(`m6.neg.city.${o.id}`)))
}
/** 0 ℃ 表示什么（冰水混合物的温度）；0 ℃ 就是没有温度吗；+6 ℃ 也可以写成 6 ℃ 吗 */
function qZeroC(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (roll < 0.4) return choose(MEAN, d, rng, 'zeroc', [T('m6.neg.mean.q', { t: '0 ℃' })], L('m6.neg.zeroC.ice'), [L('m6.neg.zeroC.none'), L('m6.neg.zeroC.below')])
  if (roll < 0.6) return judge(MEAN, d, rng, 'zerocj', [T('m6.neg.zeroC.j')], false)
  const n = rng.int(1, 30)
  const plus = rng.chance(0.6)
  return judge(MEAN, d, rng, `${plus ? 'plusj' : 'minusj'}-${n}`, [T(plus ? 'm6.neg.plus.j' : 'm6.neg.minus.j', { n })], plus)
}
/** 例 2、做一做 2 的数（正负数、0） */
export const POOL6: Num[] = ['−7', '2.5', '+4/5', '0', '−5.2', '−1/3', '+41', '6', '500', '4.7', '3/8', '−6', '−500', '−4.7', '−3/8'].map(num)
/** 做一做 2 那七个数 */
export const DO2: Num[] = ['−7', '2.5', '+4/5', '0', '−5.2', '−1/3', '+41'].map(num)
/** 读法题：例 1（−6 ℃、+6 ℃）、例 2（−3、+3、−3/8）、做一做 2（−7、+4/5、−5.2、−1/3、+41）、冰箱 −18 ℃ */
export const READ6: ReadItem[] = [
  { sign: '−', v: '6', temp: true },
  { sign: '+', v: '6', temp: true },
  { sign: '−', v: '3' },
  { sign: '+', v: '3' },
  { sign: '−', frac: [3, 8] },
  { sign: '−', v: '7' },
  { sign: '+', frac: [4, 5] },
  { sign: '−', v: '5.2' },
  { sign: '−', frac: [1, 3] },
  { sign: '+', v: '41' },
  { sign: '−', v: '500' },
  { sign: '−', v: '4.7' },
  { sign: '−', v: '18', temp: true },
]
/** 例 2 的账单 */
export const BILL6: BillRow[] = [
  { id: 'restaurant', v: -85 },
  { id: 'market', v: -500 },
  { id: 'li', v: 500 },
  { id: 'parking', v: -8 },
  { id: 'wang', v: 78.45 },
]
/** 冰箱冷冻室 −18 ℃ 表示什么 */
function qFridge(d: Difficulty, rng: RNG): Question {
  return choose(MEAN, d, rng, 'fridge', [T('m6.neg.fridge.q', { t: temp(-18) })], L('m6.neg.belowC', { n: 18 }), [L('m6.neg.aboveC', { n: 18 })])
}
/** 练习一 1：月球表面白天可达零上 127 ℃，夜间可达零下 183 ℃ */
function qMoon(d: Difficulty, rng: RNG): Question {
  const day = rng.chance(0.5)
  const v = day ? 127 : -183
  return choose(MEAN, d, rng, `moon-${day ? 'day' : 'night'}`, [T(day ? 'm6.neg.moon.day' : 'm6.neg.moon.night')], temp(v, true), [temp(-v, true)])
}
/** 练习一 2：同一时刻五个城市的钟（课本的数；换城市要管夏令时，不编） */
export const ZONES: { id: string; time: string; v: number }[] = [
  { id: 'london', time: '4:00', v: -8 },
  { id: 'paris', time: '5:00', v: -7 },
  { id: 'bj', time: '12:00', v: 0 },
  { id: 'tokyo', time: '13:00', v: 1 },
  { id: 'sydney', time: '15:00', v: 3 },
]
// 第一行城市、第二行时间，不加「城市 / 时间」那一列表头：打怪兽手机横屏两人时一栏只有 135px，六列放不下
const zoneTable: StemPart = {
  kind: 'stat-table',
  head: 'row',
  rows: [ZONES.map((z) => L(`m6.neg.city.${z.id}`)), ZONES.map((z) => z.time)],
}
function qZone(d: Difficulty, rng: RNG): Question {
  const z = rng.pick(ZONES.filter((x) => x.id === 'sydney' || x.id === 'london'))
  if (rng.chance(0.65)) {
    // 常错：早晚弄反、直接写当地的钟点、拿钟点直接减错（伦敦 4 点写成 −4 时）
    const local = Number(z.time.split(':')[0])
    return choose(MEAN, d, rng, `zone-${z.id}`, [T('m6.neg.zone.rule'), zoneTable, T('m6.neg.zone.q', { c: L(`m6.neg.city.${z.id}`) })], withUnit('h', z.v), [withUnit('h', -z.v), withUnit('h', z.v > 0 ? local : -local)])
  }
  const others = ZONES.filter((x) => x.id !== z.id && x.id !== 'bj')
  return choose(MEAN, d, rng, `zonewho-${z.id}`, [T('m6.neg.zone.rule'), zoneTable, T('m6.neg.zone.who', { v: withUnit('h', z.v) })], L(`m6.neg.city.${z.id}`), rng.shuffle(others).slice(0, 2).map((o) => L(`m6.neg.city.${o.id}`)))
}
/** 练习一 3 (1)：汛期高于警戒水位 1.5 米、旱季低于警戒水位 3 米 */
function qWater(d: Difficulty, rng: RNG, book: boolean): Question {
  const up = rng.chance(0.5)
  const n = book ? (up ? 1.5 : 3) : rng.int(1, 8) / 2
  const v = up ? n : -n
  return choose(MEAN, d, rng, `water-${up ? 'up' : 'down'}-${n}`, [T('m6.neg.water.rule'), T(up ? 'm6.neg.water.up' : 'm6.neg.water.down', { n: fmt(n) })], withUnit('m', v), [withUnit('m', -v)])
}
/** 练习一 3 (2)：标准净重 200 克，205 克记作 +5 克，197 克记作多少 */
function qWeight(d: Difficulty, rng: RNG, book: boolean): Question {
  const s = book ? 200 : rng.pick([200, 250, 500])
  const h = book ? 5 : rng.int(1, 9)
  let w = book ? 197 : s + (rng.chance(0.6) ? -1 : 1) * rng.int(1, 9)
  if (w === s + h) w = s - h
  const v = w - s
  return choose(MEAN, d, rng, `weight-${s}-${h}-${w}`, [T('m6.neg.weight.rule', { s, h: s + h, d: h }), T('m6.neg.weight.q', { w })], withUnit('g', v), [withUnit('g', -v), withUnit('g', v < 0 ? -w : w)])
}
/** 练习一 6：小明家的月收支记录表 */
export const FAMILY6: { id: string; v: number }[] = [
  { id: 'wage', v: 9500 },
  { id: 'elder', v: -2000 },
  { id: 'gift', v: -200 },
  { id: 'bill', v: -400 },
  { id: 'food', v: -800 },
  { id: 'cloth', v: -1000 },
]
const famTable = (rows: { id: string; v: number }[], ask?: string): StemPart => ({
  kind: 'stat-table',
  head: 'row',
  rows: [[L('m6.neg.th.item'), L('m6.neg.th.inout')], ...rows.map((r) => [L(`m6.neg.fam.r.${r.id}`), r.id === ask ? null : signed(r.v, true)])],
})
function qFamily(d: Difficulty, rng: RNG, book: boolean): Question {
  const lead = T('m6.neg.fam.lead')
  if (rng.chance(0.3)) {
    // 余额：收入减去五项支出（课本 5100 元；第 2 档换数）
    // 换数时支出一共比收入少（余额是正的）
    const rows = book ? FAMILY6 : FAMILY6.map((r) => (r.id === 'wage' ? { ...r, v: rng.int(80, 120) * 100 } : { ...r, v: -rng.int(r.id === 'gift' ? 1 : 2, r.id === 'gift' ? 4 : 15) * 100 }))
    const left = rows.reduce((s, r) => s + r.v, 0)
    // 表有七行，配数字键盘手机竖屏放不下：做成选项（常错：漏减一项、压岁钱只减了 100、把新衣服当成 4 × 1000）
    const forgot = Math.abs(rng.pick(rows.filter((r) => r.v < 0)).v)
    return numberQuestion({
      kpId: KM,
      type: 'negative',
      difficulty: d,
      sig: `famleft-${rows.map((r) => r.v).join('_')}`,
      stem: [famTable(rows), T('m6.neg.fam.left')],
      value: left,
      rng,
      min: 1,
      max: 99999,
      input: 'choice',
      smart: [left + forgot, left + 100, left - 3000],
    })
  }
  const r = rng.pick(FAMILY6.filter((x) => x.id !== 'wage'))
  // 常错：支出记成正数；压岁钱「各 100 元」只记 100；新衣服「4 口人」乘了 4
  const wrongs = [withUnit('yuan', -r.v)]
  if (r.id === 'gift') wrongs.push(withUnit('yuan', -100))
  if (r.id === 'cloth') wrongs.push(withUnit('yuan', -4000))
  return choose(MEAN, d, rng, `fam-${r.id}`, [lead, famTable(FAMILY6, r.id), T(`m6.neg.fam.${r.id}`)], withUnit('yuan', r.v), wrongs)
}
/** 第 2、3 档：练习一 8* 负增长、零增长、增长率 */
function qGrowth(d: Difficulty, rng: RNG): Question {
  const k = d === 3 && rng.chance(0.5) ? 'down' : rng.pick(['minus', 'zero', 'up'] as const)
  if (k === 'minus') return choose(MEAN, d, rng, 'growth-minus', [T('m6.neg.growth.minus')], '−10%', ['+10%', '90%'])
  if (k === 'zero') return choose(MEAN, d, rng, 'growth-zero', [T('m6.neg.growth.zero')], '0%', ['100%', '−100%'])
  if (k === 'up') return choose(MEAN, d, rng, 'growth-up', [T('m6.neg.growth.up')], '30%', ['130%', '3%'])
  return choose(MEAN, d, rng, 'growth-down', [T('m6.neg.growth.down')], '−5%', ['5%', '−95%'])
}

function meaning(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 例 1、例 2、做一做 1–2、练习一 1/2/3/4/6
    if (roll < 0.09) return qCity(d, rng)
    if (roll < 0.17) return qTempWrite(MEAN, d, rng, rng.chance(0.4) ? 6 : rng.int(1, 30), true)
    if (roll < 0.21) return qFridge(d, rng)
    if (roll < 0.26) return qZeroC(d, rng)
    if (roll < 0.34) return rng.chance(0.75) ? qRead(MEAN, d, rng, rng.pick(READ6)) : qWrite(MEAN, d, rng, rng.pick(READ6))
    if (roll < 0.4) return qBillMean(MEAN, d, rng, BILL6)
    if (roll < 0.44) return rng.chance(0.5) ? qBillWrite(MEAN, d, rng, BILL6) : qBillWhich(MEAN, d, rng, BILL6)
    if (roll < 0.52) return rng.chance(0.6) ? qWhich(MEAN, d, rng, POOL6) : qKind(MEAN, d, rng, POOL6)
    if (roll < 0.55) return rng.chance(0.5) ? qKind(MEAN, d, rng, [num('0')]) : qZeroJudge(MEAN, d, rng)
    if (roll < 0.63) return rng.chance(0.4) ? qLower(MEAN, d, rng, -3, -18) : qLower(MEAN, d, rng, -rng.int(1, 15), -rng.int(16, 30))
    if (roll < 0.67) return qMoon(d, rng)
    if (roll < 0.72) return qZone(d, rng)
    if (roll < 0.77) return qWater(d, rng, rng.chance(0.5))
    if (roll < 0.82) return qWeight(d, rng, rng.chance(0.5))
    if (roll < 0.86) return qAlt(MEAN, d, rng, true, true)
    if (roll < 0.94) return qFamily(d, rng, true)
    return qOpp(MEAN, d, rng, ['money', 'temp', 'sea', 'water', 'weight', 'time', 'profit'])
  }
  if (d === 2) {
    // 数一数、换数的余额、哪个城市最冷、两支温度计、0 ℃ 以上以下混着比、判断、负增长（练习一 8*）
    if (roll < 0.14) return qCount(MEAN, d, rng, rng.chance(0.5) ? DO2 : POOL6, [5, 8])
    if (roll < 0.28) return qFamily(d, rng, false)
    if (roll < 0.4) return qCityMost(d, rng)
    if (roll < 0.52) return qLower(MEAN, d, rng, -rng.int(1, 14) * 2, rng.int(-14, 14) * 2 || 2, true)
    if (roll < 0.62) return qLower(MEAN, d, rng, -rng.int(1, 20), rng.int(1, 20))
    if (roll < 0.72) return judge(MEAN, d, rng, 'unsignedj', [T('m6.neg.judge.unsigned')], false)
    if (roll < 0.86) return qGrowth(d, rng)
    return qOpp(MEAN, d, rng, ['money', 'sea', 'water', 'weight', 'time', 'profit', 'deposit'])
  }
  if (roll < 0.4) return qGrowth(d, rng)
  if (roll < 0.7) return qFamily(d, rng, false)
  return qCount(MEAN, d, rng, POOL6, [7, 10])
}
defineGenerator(KM, meaning)

// ═════════════════════════════════════════════════════════════
// 在直线上表示数（m6s2-01-line）
// ═════════════════════════════════════════════════════════════

/** 例 3：四名同学以树为起点（树 0，小雯西 4 m，小天西 2 m，小芳东 2 m，小东东 4 m） */
export const WALKERS: { id: string; at: number }[] = [
  { id: 'wen', at: -4 },
  { id: 'tian', at: -2 },
  { id: 'fang', at: 2 },
  { id: 'dong', at: 4 },
]
// 课本的刻度写「−4 m」……；手机竖屏上 9 个带单位的刻度挤在一起，只写数（题里说「米」）
const walkFigure = (): StemPart =>
  signLine(-4, 4, { points: [...WALKERS.map((w) => ({ at: w.at, name: L(`m6.neg.n.${w.id}`) })), { at: 0, name: L('m6.neg.n.tree') }] })
/** 向东 / 向西走了几米，记作多少米（例 3；第 2 档换起点和人） */
function qWalk(d: Difficulty, rng: RNG, book: boolean): Question {
  const who = book ? rng.pick(WALKERS) : { id: rng.pick(['li', 'wen', 'tian', 'fang', 'dong']), at: (rng.chance(0.5) ? -1 : 1) * rng.int(1, 9) * (rng.chance(0.4) ? 100 : 1) }
  const start = book ? 'tree' : rng.pick(['tree', 'school', 'home'])
  const n = Math.abs(who.at)
  const east = who.at > 0
  const stem = [T('m6.neg.walk.rule', { o: L(`m6.neg.start.${start}`) }), T('m6.neg.walk.q', { who: L(`m6.neg.n.${who.id}`), o: L(`m6.neg.start.${start}`), dir: L(east ? 'm6.neg.dir.e' : 'm6.neg.dir.w'), n })]
  return choose(LINE, d, rng, `walk-${start}-${who.id}-${who.at}`, stem, withUnit('m', who.at), [withUnit('m', -who.at)])
}
/** +150 米 / −150 米表示向哪边走了 150 米 */
function qWalkDir(d: Difficulty, rng: RNG): Question {
  const n = rng.pick([2, 3, 5, 50, 150, 300])
  const v = rng.chance(0.5) ? n : -n
  const toward = (e: boolean): LStr => L('m6.neg.toward', { d: L(e ? 'm6.neg.dir.e' : 'm6.neg.dir.w') })
  return choose(LINE, d, rng, `walkdir-${v}`, [T('m6.neg.walk.rule', { o: L('m6.neg.start.school') }), T('m6.neg.walk.dirq', { v: withUnit('m', v), n })], toward(v > 0), [toward(v < 0)])
}
/** 例 3 的图：−4 米的地方是谁、小芳的位置用哪个数表示、0 表示什么的位置、离树多远 */
function qWalkFigure(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  const fig = walkFigure()
  const w = rng.pick(WALKERS)
  if (roll < 0.3) {
    const others = rng.shuffle(WALKERS.filter((x) => x.id !== w.id)).slice(0, 2)
    // 常错：符号看反（−4 和 4 弄混）
    const mirror = WALKERS.find((x) => x.at === -w.at)!
    return choose(LINE, d, rng, `who-${w.at}`, [fig, T('m6.neg.who.q', { v: signed(w.at) })], L(`m6.neg.n.${w.id}`), [L(`m6.neg.n.${mirror.id}`), ...others.map((o) => L(`m6.neg.n.${o.id}`))])
  }
  if (roll < 0.6) return choose(LINE, d, rng, `where-${w.id}`, [fig, T('m6.neg.where.q', { who: L(`m6.neg.n.${w.id}`) })], withUnit('m', w.at, false), [withUnit('m', -w.at, false), withUnit('m', w.at / 2, false)])
  if (roll < 0.75) return choose(LINE, d, rng, 'zerowhat', [fig, T('m6.neg.zero.what')], L('m6.neg.n.tree'), [L('m6.neg.n.fang'), L('m6.neg.n.tian')])
  return keyIn(LINE, d, rng, `dist-${w.id}`, [fig, T('m6.neg.dist.q', { who: L(`m6.neg.n.${w.id}`) })], Math.abs(w.at), 99)
}
/** 第 2 档：图上两个人相距几米（跨过 0 的要加起来） */
function qWalkApart(d: Difficulty, rng: RNG): Question {
  const [a, b] = rng.shuffle(WALKERS).slice(0, 2) as [(typeof WALKERS)[number], (typeof WALKERS)[number]]
  return keyIn(LINE, d, rng, `apart-${a.id}-${b.id}`, [walkFigure(), T('m6.neg.dist2.q', { a: L(`m6.neg.n.${a.id}`), b: L(`m6.neg.n.${b.id}`) })], Math.abs(a.at - b.at), 99)
}
/** 回顾与反思：0 右边 / 左边的数是什么数、点在 0 的左边表示什么数、分界点是哪个数 */
function qZeroSplit(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (roll < 0.35) {
    const right = rng.chance(0.5)
    return choose(LINE, d, rng, `sidekind-${right ? 'r' : 'l'}`, [T(right ? 'm6.neg.side.kindR' : 'm6.neg.side.kindL')], right ? POS : NEG, [right ? NEG : POS])
  }
  if (roll < 0.7) {
    const p = rng.pick(['A', 'B', 'C', 'D', 'E'])
    const left = rng.chance(0.5)
    return choose(LINE, d, rng, `sidept-${p}-${left ? 'l' : 'r'}`, [T(left ? 'm6.neg.side.ptL' : 'm6.neg.side.ptR', { p })], left ? NEG : POS, [left ? POS : NEG])
  }
  return choose(LINE, d, rng, 'split', [T('m6.neg.split.q')], '0', ['1', '−1'])
}
/** 做一做的数：每 0.5 一小格、只写 0 和 1 */
export const DO_LINE = [-4, -2, 2.5, -0.5, 1.5, -2.5]
const halfLine = (o: { arrow?: number; points?: { at: number; name: LStr }[] }): StemPart => signLine(-4, 4, { per: 2, show: [0, 1], ...o })
/** 箭头指的点表示哪个数；常错：一小格当 1（2p）、符号看反、多数或少数一小格 */
function qArrow(d: Difficulty, rng: RNG, book: boolean): Question {
  const p = book ? rng.pick(DO_LINE) : (rng.chance(0.5) ? -1 : 1) * rng.int(1, 8) / 2
  const wrongs = [-p, 2 * p, p + 0.5, p - 0.5].filter((x) => Math.abs(x) <= 8).map((x) => signed(x))
  return choose(LINE, d, rng, `arrow-${p}`, [halfLine({ arrow: p }), T('m6.neg.arrow.q')], signed(p), wrongs)
}
const LETTERS = ['A', 'B', 'C', 'D', 'E']
/** 做一做：x 在直线上的哪个点（四个点，干扰点放在符号看反、差半格的位置） */
function qMark(d: Difficulty, rng: RNG, book: boolean): Question {
  const frac = book && rng.chance(0.3)
  const x = frac ? -2.5 : book ? rng.pick(DO_LINE) : (rng.chance(0.5) ? -1 : 1) * rng.int(1, 7) / 2
  const cands = [-x, x + 0.5, x - 0.5, x + 1, x - 1].filter((v) => v !== x && v >= -4 && v <= 4)
  const pos = rng.shuffle([x, ...rng.shuffle([...new Set(cands)]).slice(0, 3)]).sort((a, b) => a - b)
  const points = pos.map((at, i) => ({ at, name: LETTERS[i]! }))
  const right = points.find((p) => p.at === x)!.name
  const said = frac ? '−5/2' : signed(x)
  return choose(LINE, d, rng, `mark-${said}-${pos.join('_')}`, [halfLine({ points }), T('m6.neg.mark.q', { x: said })], L('m6.neg.pt', { p: right }), points.filter((p) => p.name !== right).map((p) => L('m6.neg.pt', { p: p.name })))
}
/** 做一做：−5/2 和哪个数是同一个点（第 2 档也问 −3/2、−7/2、5/2） */
function qSame(d: Difficulty, rng: RNG, book: boolean): Question {
  const n = book ? 5 : rng.pick([3, 5, 7])
  const neg = book || rng.chance(0.7)
  const v = (neg ? -n : n) / 2
  const f = `${neg ? '−' : ''}${n}/2`
  const swapped = signed(neg ? -Number(`${n}.2`) : Number(`${n}.2`))
  return choose(LINE, d, rng, `same-${f}`, [T('m6.neg.same.q', { x: f })], signed(v), [swapped, signed(-v), signed(neg ? -n : n)])
}
/** 练习一 5：点 A–E 在 −7、−4、−1、3、6（−8…8 每格 1，只写 −8、−6、−2、0、2、4、8） */
export const EX5_POINTS = [-7, -4, -1, 3, 6]
function qPoints(d: Difficulty, rng: RNG, book: boolean): Question {
  const at = book ? EX5_POINTS : rng.shuffle([-7, -6, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 6, 7]).slice(0, 5).sort((a, b) => a - b)
  const show = book ? [-8, -6, -2, 0, 2, 4, 8] : [-8, 0, 8, ...rng.shuffle([-6, -4, -2, 2, 4, 6]).slice(0, 2)]
  const points = at.map((v, i) => ({ at: v, name: LETTERS[i]! }))
  const k = rng.int(0, 4)
  const v = at[k]!
  // 常错：符号看反、数格子多数或少数一格
  return choose(LINE, d, rng, `pt-${at.join('_')}-${show.join('_')}-${k}`, [signLine(-8, 8, { show, points }), T('m6.neg.pt.q', { p: LETTERS[k]! })], signed(v), [signed(-v), signed(v - 1), signed(v + 1)])
}
/** 练习一 7：A 在 −1，B 与 A 相距 3 米，B 可能在 −4 或 2；常错：只想到一边、从 0 量 */
function qTwoWays(d: Difficulty, rng: RNG, book: boolean): Question {
  let a = -1
  let dd = 3
  if (!book) {
    do {
      a = rng.int(d === 3 ? -4 : -2, d === 3 ? 5 : 2)
      dd = rng.int(1, d === 3 ? 4 : 3)
    } while (a === 0 || (d !== 3 && (a - dd < -4 || a + dd > 5)) || -dd === a - dd)
  }
  const stem = [signLine(-4, 5, { points: [{ at: a, name: 'A' }] }), T('m6.neg.two.q', { a: signed(a), d: dd })]
  const either = (x: number, y: number): LStr => L('m6.neg.either', { x: signed(x), y: signed(y) })
  return choose(LINE, d, rng, `two-${a}-${dd}`, stem, either(a - dd, a + dd), [L('m6.neg.only', { x: signed(a + dd) }), L('m6.neg.only', { x: signed(a - dd) }), either(-dd, dd)])
}
/** 第 2 档：直线上两个点相距几米（每格 1 米） */
function qApartPts(d: Difficulty, rng: RNG): Question {
  const a = rng.int(-4, 4)
  let b = rng.int(-4, 5)
  if (b === a) b = a + 1 > 5 ? a - 1 : a + 1
  const stem = [signLine(-4, 5, { points: [{ at: a, name: 'A' }, { at: b, name: 'B' }] }), T('m6.neg.apart.q', { a: signed(a), b: signed(b) })]
  return keyIn(LINE, d, rng, `apartpts-${a}-${b}`, stem, Math.abs(a - b), 99)
}

function line(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 例 3（东西方向、图）、回顾与反思、做一做（标数、−5/2）、练习一 5、7
    if (roll < 0.14) return qWalk(d, rng, true)
    if (roll < 0.3) return qWalkFigure(d, rng)
    if (roll < 0.37) return qWalkDir(d, rng)
    if (roll < 0.47) return qZeroSplit(d, rng)
    if (roll < 0.52) return qSide(LINE, d, rng, ['−4', '−2', '2.5', '−0.5', '1.5', '−5/2', '−7', '−1', '3', '6'])
    if (roll < 0.62) return qArrow(d, rng, true)
    if (roll < 0.71) return qMark(d, rng, true)
    if (roll < 0.75) return qSame(d, rng, true)
    if (roll < 0.86) return qPoints(d, rng, true)
    if (roll < 0.96) return qTwoWays(d, rng, true)
    return qOpp(LINE, d, rng, ['east'])
  }
  if (d === 2) {
    if (roll < 0.14) return qPoints(d, rng, false)
    if (roll < 0.28) return qArrow(d, rng, false)
    if (roll < 0.4) return qWalkApart(d, rng)
    if (roll < 0.52) return qApartPts(d, rng)
    if (roll < 0.64) return qTwoWays(d, rng, false)
    if (roll < 0.74) return qWalk(d, rng, false)
    if (roll < 0.84) return qSame(d, rng, false)
    if (roll < 0.92) return qMark(d, rng, false)
    return qRods(LINE, d, rng, rng.chance(0.5))
  }
  if (roll < 0.4) return qTwoWays(d, rng, false)
  if (roll < 0.7) return qPoints(d, rng, false)
  return qSame(d, rng, false)
}
defineGenerator(KL, line)
