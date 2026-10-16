// 六上「五 百分数」的生成器（六年级数学 E）；折扣 m6s1-07-discount、利率 m6s1-07-interest 两个知识点在 percent2.ts（F 写，两册共用）。
import type { BarBrace, BarRow, Difficulty, LParam, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelKey, labelQuestion, numberQuestion } from '@/engine'
import { percentWords, zhDecimalWord, zhNumberWord } from '@/engine/fraction'

// ─────────────────────────────────────────────────────────────
// 课本：2022 版课标新教材六上第 79–100 页（084–105.jpg），按平台同步课的章节分知识点：
//   百分数的意义（例 1 投篮命中率 9/20、4/10、11/25 化成分母是 100 的分数；p80 说意思；做一做 112%、98.2%、75%；练习十四 1）、
//   求百分率（例 2 5 投 3 中 60%、6 投 4 中 66.7%；常见百分率的公式；做一做 发芽率表；p83 做一做 1 前四个、2 体育达标率 152/160；
//     练习十四 2、3、6，练习十八 2、3）、
//   求一个数的百分之几是多少（例 3 20 × 25%；做一做 1 后两个、3 40 × 95%；练习十四 2、4、5，练习十八 1(1)、6）、
//   求增长率（应用例 3 燃油车 12 → 14 万辆 16.7%、新能源车 8 → 10 万辆 25%；做一做 造林 16 公顷多 4 公顷、沙化面积 1.8 → 1.2 万平方千米；
//     练习十六 1、6，练习十八 5）、
//   已知增加后的数求原来的数（应用例 4 3000 ÷ (1 + 20%)；做一做 1.4 万册增加 12%、1200 ÷ (1 + 25%)；练习十六 2–4，练习十八 1(2)、4，练习十四 7）、
//   价格的连续变化（应用例 5 打八折再涨价 20% 便宜了 4%；做一做 加价 20% 再降价 20%；练习十七 1–7）、
//   确定达标线（p95–97 100 名学生跳绳：第 60 名 120 次、第 75 名 109 次（同分，达标率 76%）；实践应用 五（1）班 40 人）。
// 作答：整数答案用数字键盘；百分数、小数、分数、文字一律选项卡。整数的百分数有时用「? %」的填空（课本练习十八 5 的写法），
// 按的数字填进空里，读「百分之几」。除不尽的照课本「先保留三位小数」，百分号前保留一位小数（16.7%、19.0% 末尾的 0 保留）。
// 朗读避坑：「5 投 3 中」写「投篮 5 次，投进 3 个」；乐乐改叫小芳；「六（1）班」写「六年级一班」（括号会读出来）；「（ ）%」改成问句；
// 「应到人数」写「学生总人数」；「种植树木总棵数」写「植树总棵数」；「磨粉机」写「把小麦加工成面粉」；都匀不写地名；
// 「长、宽、高」写「长度、宽度、高度」，「全长」写「整根」；「返还」写「返给」；一中、二中写甲校、乙校；「不得销售」写「不能销售」。
// 命中率 / 命中数 / 中奖率（中 zhòng）、增长 / 增长率（长 zhǎng）是课本的词，照写，合成后要听。
// 不出：折扣、利率（percent2.ts）、开放题（提问题、设计抽奖方案、设计午餐、调查国家达标线）、练习十五 6 那种要计算器的多年存款。
// ─────────────────────────────────────────────────────────────

export const KP_MEANING = 'm6s1-07-meaning'
export const KP_RATE = 'm6s1-07-rate'
export const KP_PART = 'm6s1-07-part'
export const KP_GROWTH = 'm6s1-07-growth'
export const KP_BASE = 'm6s1-07-base'
export const KP_CHAIN = 'm6s1-07-chain'
export const KP_STANDARD = 'm6s1-07-standard'

type P = Record<string, LParam>
export const L = (k: string, p?: P): LStr => (p ? { k: `m6.pct.${k}`, p } : { k: `m6.pct.${k}` })
const T = (k: string, p?: P): StemPart => ({ kind: 'text', text: L(k, p) })
const E = (expr: string): StemPart => ({ kind: 'expr', expr })
const KEEP1 = T('keep1')
const YES = L('yes')
const NO = L('no')

// ══ 数的小工具（一律用整数算，免得浮点误差）══

export const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b))

/** 整数 v 看作有 places 位小数写出来：fix(190, 1, true) = '19.0'，fix(975, 2) = '9.75'，fix(-500, 2) = '−5'；keep = 末尾的 0 保留 */
export function fix(v: number, places: number, keep = false): string {
  const s = String(Math.abs(v)).padStart(places + 1, '0')
  const int = s.slice(0, s.length - places) || '0'
  let frac = places ? s.slice(s.length - places) : ''
  if (!keep) frac = frac.replace(/0+$/, '')
  return `${v < 0 ? '−' : ''}${int}${frac ? `.${frac}` : ''}`
}

/** 小数字符串 → 百万分之几的整数（最多 6 位小数）：'0.125' → 125000 */
export function micro(s: string): number {
  const neg = s.startsWith('−') || s.startsWith('-')
  const [i = '0', f = ''] = s.replace(/^[−-]/, '').split('.')
  const v = Number(i) * 1e6 + Number(`${f}000000`.slice(0, 6))
  return neg ? -v : v
}
/** 百万分之几 → 小数字符串（去掉末尾的 0） */
export const fromMicro = (m: number): string => fix(m, 6)

export interface Pct {
  /** 「16.7%」「60%」「19.0%」「−5%」 */
  text: string
  /** 除得尽（百分号前最多两位小数）；否则是保留一位小数的近似值，问句要加「百分号前保留一位小数」 */
  exact: boolean
}
/** num / den 的百分数（都是整数，den ≠ 0）：除得尽到百分号前两位小数的写准确值，否则照课本先保留三位小数，百分号前一位小数（四舍五入） */
export function pctOf(num: number, den: number): Pct {
  const sign = num * den < 0 ? -1 : 1
  const n = Math.abs(num)
  const d = Math.abs(den)
  if ((n * 10000) % d === 0) return { text: `${fix((sign * n * 10000) / d, 2)}%`, exact: true }
  const tenths = Math.floor((n * 2000 + d) / (2 * d))
  return { text: `${fix(sign * tenths, 1, true)}%`, exact: false }
}
/** 去尾（不四舍五入）的一位小数百分数：错法「16.6%」 */
export function pctTrunc(num: number, den: number): string {
  return `${fix(Math.floor((num * 1000) / den), 1, true)}%`
}
/** 百分数文字的值（百分之几乘 100 的整数）：'16.7%' → 1670，'−5%' → −500 */
export function pctValue(text: string): number {
  return Math.round(micro(text.replace(/[%％]$/, '')) / 1e4)
}
/** 小数 → 百分数文字：'0.125' → '12.5%' */
export const decToPct = (x: string): string => `${fromMicro(micro(x) * 100)}%`
/** 百分数（不带 %）→ 小数文字：'37.5' → '0.375'；不是整的返回 null */
export function pctToDec(x: string): string | null {
  const m = micro(x)
  return m % 100 === 0 ? fromMicro(m / 100) : null
}
/** 百分数（不带 %）→ 最简分数 [分子, 分母]：'37.5' → [3, 8]，'150' → [3, 2] */
export function pctToFrac(x: string): [number, number] {
  const n = micro(x)
  const d = 1e8
  const g = gcd(n, d)
  return [n / g, d / g]
}
const fracText = ([n, d]: [number, number]): string => (d === 1 ? String(n) : `${n}/${d}`)

/** 选项题：干扰项按给的顺序取前 count 个——跳过和答案一样的、彼此重复的（文字或数值一样都算重复） */
export function pickDistinct(correct: LStr, cands: LStr[], count = 3): LStr[] {
  const norm = (l: LStr): string => {
    if (typeof l !== 'string') return labelKey(l)
    const m = /^([−-]?\d+(?:\.\d+)?)%$/.exec(l)
    if (m) return `pct:${pctValue(l)}`
    return l
  }
  const seen = new Set([norm(correct)])
  const out: LStr[] = []
  for (const c of cands) {
    if (c === '' || out.length >= count) continue
    const k = norm(c)
    if (seen.has(k)) continue
    seen.add(k)
    out.push(c)
  }
  return out
}
function choice(kpId: string, d: Difficulty, sig: string, stem: StemPart[], correct: LStr, cands: LStr[], rng: RNG, count = 3): Question {
  return labelQuestion({ kpId, type: 'percent', difficulty: d, sig, stem, correct, distractors: pickDistinct(correct, cands, count), rng })
}
function keypad(kpId: string, d: Difficulty, sig: string, stem: StemPart[], value: number, rng: RNG): Question {
  return numberQuestion({ kpId, type: 'percent', difficulty: d, sig, stem, value, rng, max: Math.max(10, value * 2), input: 'numpad' })
}
/** 带大图的整数答案：选项卡（数字键盘四行太高，手机竖屏一屏放不下），smart 是常见的错答（不是正整数的自动跳过） */
function cards(kpId: string, d: Difficulty, sig: string, stem: StemPart[], value: number, smart: number[], rng: RNG): Question {
  const ok = smart.filter((v) => Number.isInteger(v) && v > 0)
  return numberQuestion({ kpId, type: 'percent', difficulty: d, sig, stem, value, rng, min: 1, max: Math.max(100, value * 3, ...ok), input: 'choice', smart: ok })
}
function judge(kpId: string, d: Difficulty, sig: string, stem: StemPart[], truth: boolean, rng: RNG): Question {
  return labelQuestion({ kpId, type: 'percent', difficulty: d, sig, stem, correct: truth ? YES : NO, distractors: [truth ? NO : YES], rng })
}
/** 百分数答案的题：除不尽的问句后面加一句「百分号前保留一位小数」 */
const withKeep = (stem: StemPart[], p: Pct): StemPart[] => (p.exact ? stem : [...stem, KEEP1])

// ══ 百分数的读法：一个字一条词条（读法题的选项要注音，又是按数算出来的）══

const CHAR_KEY: Record<string, string> = {
  零: 'w.0',
  一: 'w.1',
  二: 'w.2',
  三: 'w.3',
  四: 'w.4',
  五: 'w.5',
  六: 'w.6',
  七: 'w.7',
  八: 'w.8',
  九: 'w.9',
  十: 'w.10',
  百: 'w.100',
  千: 'w.1000',
  点: 'w.dot',
}
/** 读法最多几个片段（「百分之」算一个） */
export const SEQ_MAX = 14
/**
 * 读法文字 → 一串词条（m6.pct.w.seq.<n> 把 n 个片段接起来）：「百分之」开头的、「百分」结尾的各算一个片段；
 * 「一」在百、千前面读 yì（一百二十），别处读 yī（十一、一点五）
 */
export function readSeq(words: string): LStr {
  const keys: string[] = []
  let rest = words
  let tail = ''
  if (rest.endsWith('百分') && !rest.endsWith('之百分')) {
    tail = 'w.post'
    rest = rest.slice(0, -2)
  }
  const chars = Array.from(rest)
  for (let i = 0; i < chars.length; i++) {
    if (chars.slice(i, i + 3).join('') === '百分之') {
      keys.push('w.pre')
      i += 2
      continue
    }
    const ch = chars[i]!
    let key = CHAR_KEY[ch]
    if (!key) throw new Error(`读法里有不认识的字：${words}`)
    if (ch === '一' && (chars[i + 1] === '百' || chars[i + 1] === '千')) key = 'w.1a'
    keys.push(key)
  }
  if (tail) keys.push(tail)
  if (keys.length > SEQ_MAX) throw new Error(`读法太长：${words}`)
  const p: P = {}
  keys.forEach((k, i) => (p[`c${i}`] = L(k)))
  return L(`w.seq.${keys.length}`, p)
}
/** 「65.67」的正确读法「百分之六十五点六七」 */
export const readOf = (x: string): string => percentWords(x, 'zh')
/** 读法的错法：小数点挪了一位、读成「六十五点六七百分」、不管小数点、「一百分之……」、小数部分当整数读 */
export function readWrongs(x: string): string[] {
  const m = micro(x)
  const out: string[] = []
  if (m % 10 === 0) out.push(readOf(fromMicro(m / 10)))
  out.push(`${zhDecimalWord(x)}百分`)
  if (x.includes('.')) {
    const whole = Number(x.replace('.', ''))
    if (whole <= 9999) out.push(`百分之${zhNumberWord(whole)}`)
    const [i, f] = x.split('.') as [string, string]
    if (f.length > 1) out.push(`百分之${zhNumberWord(Number(i))}点${zhNumberWord(Number(f))}`)
  } else {
    if (Number(x) * 10 <= 9999) out.push(`百分之${zhNumberWord(Number(x) * 10)}`)
    out.push(`一百分之${zhNumberWord(Number(x))}`)
  }
  return out.filter((w) => w !== readOf(x))
}
/** 写法的错法：小数点挪一位（两个方向）、忘了写 %、当成百分之一 */
export function writeWrongs(x: string): string[] {
  const m = micro(x)
  return [`${fromMicro(m * 10)}%`, ...(m % 10 === 0 ? [`${fromMicro(m / 10)}%`] : []), x, ...(m % 100 === 0 ? [`${fromMicro(m / 100)}%`] : [])]
}
/** 给正确的读法选项配朗读：答错时读「正确答案是 65.67%」（读「百分之六十五点六七」），不用一个字一个字地读 */
function sayCorrect(q: Question, say: string): Question {
  if (q.answer.kind !== 'choice') return q
  const id = q.answer.choiceId
  q.choices = q.choices!.map((c) => (c.id === id ? { ...c, say } : c))
  return q
}

// ══ 线段图（B 的 frac-bars）══

/** 增加 / 减少的线段图（应用例 3）：原来 a、现在 b（整数，同一个单位），按最大公因数分段；多出来（或少掉）的一段上面单独一个括号，红色竖虚线标出原来的长度 */
export function growBars(a: number, b: number, names: [LStr, LStr], labels: { a: string; b: string; diff: string }): StemPart {
  const g = gcd(a, b)
  const unit = a / g
  const len = b / g
  const second: BarBrace[] = [{ from: 0, to: len, side: 'bottom', label: labels.b }]
  if (len !== unit) second.push({ from: Math.min(unit, len), to: Math.max(unit, len), side: 'top', label: labels.diff })
  const rows: BarRow[] = [
    { name: names[0], len: unit, parts: 1, braces: [{ from: 0, to: unit, side: 'bottom', label: labels.a }] },
    { name: names[1], len, parts: 1, braces: second, ...(len < unit ? { dash: [len, unit] as [number, number] } : {}) },
  ]
  return { kind: 'frac-bars', unit, rows, guides: [unit] }
}
/** 已知增加后的数求原来的数（应用例 4）：原来那一行平均分成 100 ÷ (r 和 100 的最大公因数) 段画刻度（段太多就只画两端），现在那一行多出 r% 那么长 */
export function baseBars(r: number, now: string, names: [LStr, LStr]): StemPart {
  const g = gcd(r, 100)
  const unit = 100 / g
  const len = (100 + r) / g
  const rows: BarRow[] = [
    { name: names[0], len: unit, parts: unit <= 10 ? unit : 1, braces: [{ from: 0, to: unit, side: 'bottom', label: '?' }] },
    {
      name: names[1],
      len,
      parts: 1,
      braces: [
        { from: unit, to: len, side: 'top', label: `${r}%` },
        { from: 0, to: len, side: 'bottom', label: now },
      ],
    },
  ]
  return { kind: 'frac-bars', unit, rows, guides: [unit] }
}

// ═════════════════════════════════════════════════════════════
// 1. 百分数的意义（例 1、p80、做一做、练习十四 1、整理和复习）
// ═════════════════════════════════════════════════════════════

/** 课本里出现的百分数（读法、写法题）：例 1、p80、做一做、练习十四 1 */
export const BOOK_PCTS = ['45', '40', '44', '95', '99', '83', '65.5', '34.5', '100', '112', '98.2', '75', '18', '120', '65.67']
/** 第 3 档多几个：197.45%（p80 的新能源汽车）、0.5%、0.85%、200% */
export const MORE_PCTS = ['197.45', '0.5', '0.85', '200']

function qRead(d: Difficulty, rng: RNG): Question {
  const x = d === 3 && rng.chance(0.5) ? rng.pick(MORE_PCTS) : rng.pick(BOOK_PCTS)
  const correct = readSeq(readOf(x))
  const wrongs = rng.shuffle(readWrongs(x)).map(readSeq)
  const q = choice(KP_MEANING, d, `read-${x}`, [T('mean.readQ'), { kind: 'dec-card', n: `${x}%` }], correct, wrongs, rng)
  return sayCorrect(q, `${x}%`)
}
function qWrite(d: Difficulty, rng: RNG): Question {
  const x = d === 3 && rng.chance(0.5) ? rng.pick(MORE_PCTS) : rng.pick(BOOK_PCTS)
  return choice(KP_MEANING, d, `write-${x}`, [T('mean.writeQ', { w: readSeq(readOf(x)) })], `${x}%`, rng.shuffle(writeWrongs(x)), rng)
}

/** 例 1 的表（三名选手的投篮命中数、出手数）：第一组是课本的，别的组换数（出手数只用 10、20、25、50，能化成分母是 100 的分数） */
export const HIT_TABLES: [number, number][][] = [
  [
    [9, 20],
    [4, 10],
    [11, 25],
  ],
  [
    [13, 20],
    [7, 10],
    [17, 25],
  ],
  [
    [6, 10],
    [12, 25],
    [11, 20],
  ],
  [
    [16, 25],
    [13, 20],
    [33, 50],
  ],
  [
    [7, 20],
    [4, 10],
    [9, 25],
  ],
  [
    [21, 50],
    [9, 20],
    [11, 25],
  ],
]
const hitTable = (rows: [number, number][]): StemPart => ({
  kind: 'stat-table',
  head: 'row',
  rows: [[L('mean.t.no'), L('mean.t.hit'), L('mean.t.shots')], ...rows.map(([h, s], i) => [L('mean.t.player', { n: i + 1 }), h, s])],
})
function hitTableFor(d: Difficulty, rng: RNG): number {
  return d === 1 && rng.chance(0.4) ? 0 : rng.int(0, HIT_TABLES.length - 1)
}
function qHundred(d: Difficulty, rng: RNG): Question {
  const t = hitTableFor(d, rng)
  const rows = HIT_TABLES[t]!
  const i = rng.int(0, 2)
  const [h, s] = rows[i]!
  const k = 100 / s
  // 这一问只用到一名选手的两个数：不画例 1 的表（和下面的分数链重复，手机竖屏放不下），两个数写进题目
  const stem: StemPart[] = [
    T('mean.hundQ', { s, h }),
    { kind: 'frac-chain', terms: [{ n: String(h), d: String(s) }, { t: '=' }, { n: '?', d: '100' }], arcs: [{ from: 0, to: 2, top: `×${k}`, bottom: `×${k}` }] },
  ]
  return keypad(KP_MEANING, d, `hund-${t}-${i}`, stem, h * k, rng)
}
function qBest(d: Difficulty, rng: RNG): Question {
  const t = hitTableFor(d, rng)
  const rows = HIT_TABLES[t]!
  const rates = rows.map(([h, s]) => (h * 100) / s)
  const best = rates.indexOf(Math.max(...rates))
  const players = rows.map((_, i) => L('mean.t.player', { n: i + 1 }))
  return labelQuestion({
    kpId: KP_MEANING,
    type: 'percent',
    difficulty: d,
    sig: `best-${t}`,
    stem: [T('mean.tableIntro'), hitTable(rows), T('mean.bestQ')],
    correct: players[best]!,
    distractors: players.filter((_, i) => i !== best),
    rng,
  })
}
/** 分母是 100 的分数写成百分数（例 1：45/100 写成 45%） */
export const OVER_100 = [45, 40, 44, 95, 99, 83, 18, 112, 120, 7, 65, 30]
function qToPct(d: Difficulty, rng: RNG): Question {
  const n = rng.pick(OVER_100)
  if (rng.chance(0.5)) return keypad(KP_MEANING, d, `topct-key-${n}`, [T('mean.toPctQ'), E(`${n}/100 = ?%`)], n, rng)
  return choice(KP_MEANING, d, `topct-${n}`, [T('mean.toPctQ'), E(`${n}/100`)], `${n}%`, [`${fix(n, 1)}%`, `${fix(n, 2)}%`, `${n * 10}%`, `${n}`], rng)
}

/**
 * 说意思（p80 正文和说一说、做一做、练习十四 1）：a 是比的量、b 是标准量（都是 mean.n.* 词条），c 是剩下的部分；
 * 没有 c 的给一个说得通但不对的 x。问「这里的 p% 表示 a 是什么的 p/100」、选标准量：选项是三个短的数量名——
 * 写成整句「A 是 B 的 p/100」的四个选项在对战 / 打怪兽两人的窄栏里要折两行，伸出作答栏
 */
interface MeanCtx {
  id: string
  p: number
  a: string
  b: string
  c?: string
  x?: string
}
export const MEAN_CTX: MeanCtx[] = [
  { id: 'attend', p: 95, a: 'present', b: 'class', c: 'absent' },
  { id: 'pass', p: 99, a: 'ok', b: 'allProd', c: 'bad' },
  { id: 'hit', p: 45, a: 'in', b: 'shots', c: 'miss' },
  { id: 'phone', p: 83, a: 'charged', b: 'battery', c: 'uncharged' },
  { id: 'plan', p: 112, a: 'actual', b: 'planned', x: 'extra' },
  { id: 'flour', p: 75, a: 'flour', b: 'wheat', x: 'rest' },
  { id: 'pop', p: 18, a: 'kids', b: 'allPop', c: 'others' },
  { id: 'food', p: 120, a: 'sep', b: 'aug', x: 'oct' },
]
function qMeaning(d: Difficulty, rng: RNG): Question {
  const c = d === 1 && rng.chance(0.5) ? rng.pick(MEAN_CTX.slice(0, 5)) : rng.pick(MEAN_CTX)
  const n = (k: string): LStr => L(`mean.n.${k}`)
  // 错法：把另一部分（或不相干的量）当成标准量、把比的量自己当成标准量
  return choice(KP_MEANING, d, `mean-${c.id}`, [T(`mean.c.${c.id}`, { p: c.p }), T('mean.baseQ', { p: c.p, a: n(c.a) })], n(c.b), [n(c.c ?? c.x!), n(c.a)], rng)
}
function qNames(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    return choice(KP_MEANING, d, 'name-alias', [T('mean.nameQ')], L('mean.n.alias'), rng.shuffle([L('mean.n.fd'), L('mean.n.sign'), L('mean.n.den')]), rng)
  }
  return choice(KP_MEANING, d, 'name-sign', [T('mean.signQ'), { kind: 'dec-card', n: '%' }], L('mean.n.sign'), rng.shuffle([L('mean.n.pctNum'), L('mean.n.pctBi'), L('mean.n.div')]), rng)
}
/** 做一做 (1)：实际产量是计划产量的 112%，比计划多；95% 比计划少，100% 一样多 */
export const OVER_PCTS = [112, 120, 105, 95, 98, 100]
function qOver(d: Difficulty, rng: RNG): Question {
  const p = rng.pick(OVER_PCTS)
  return judge(KP_MEANING, d, `over-${p}`, [T('mean.overQ', { p })], p > 100, rng)
}
/** 整理和复习：百分数表示两个数量之间的关系，不能表示一个具体的量（不能带单位） */
function qConcept(d: Difficulty, rng: RNG): Question {
  const r = rng.next()
  if (r < 0.4) {
    const p = rng.pick([45, 60, 80, 25])
    return judge(KP_MEANING, d, `unit-${p}`, [T('mean.unitQ', { p })], false, rng)
  }
  if (r < 0.7) return judge(KP_MEANING, d, 'rel', [T('mean.relQ')], true, rng)
  return judge(KP_MEANING, d, 'def', [T('mean.defQ')], true, rng)
}
// ── 第 2 档 ──
/** 比一比（课本里的百分数） */
export const MEAN_CMP: [string, string][] = [
  ['45', '44'],
  ['98.2', '100'],
  ['120', '100'],
  ['65.5', '65.67'],
  ['18', '1.8'],
  ['0.5', '5'],
  ['34.5', '45.3'],
  ['112', '99'],
]
function qMeanCmp(d: Difficulty, rng: RNG): Question {
  const [a, b] = rng.pick(MEAN_CMP)
  const [x, y] = rng.chance(0.5) ? [a, b] : [b, a]
  const vx = micro(x)
  const vy = micro(y)
  const correct = vx === vy ? '=' : vx < vy ? '<' : '>'
  return choice(KP_MEANING, d, `cmp-${x}|${y}`, [T('cmp'), E(`${x}% ○ ${y}%`)], correct, ['>', '<', '='], rng, 2)
}
/** 其余的占百分之几（做一做 (2) 泪液 98.2%、p80 衣服面料 65.5% 羊毛） */
export const REST_CTX: [string, string][] = [
  ['tears', '98.2'],
  ['wool', '65.5'],
  ['attend', '95'],
  ['pass', '99'],
]
function qRest(d: Difficulty, rng: RNG): Question {
  const [id, p] = rng.pick(REST_CTX)
  const rest = 100e6 - micro(p)
  const pct = (m: number): string => `${fromMicro(m)}%`
  return choice(KP_MEANING, d, `rest-${id}`, [T(`mean.r.${id}`, { p: `${p}%` })], pct(rest), [pct(rest + 1e6), pct(rest * 10), pct(rest / 10), `${p}%`], rng)
}
const CANNOT = ['germ', 'attend', 'pass', 'survive']
const CAN = ['growth', 'thisYear', 'actual']
function qOver100(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.6)) {
    const c = rng.pick(CANNOT)
    return choice(KP_MEANING, d, `cannot-${c}`, [T('mean.over100Q')], L(`mean.k.${c}`), rng.shuffle(CAN.map((k) => L(`mean.k.${k}`))), rng)
  }
  const all = [...CANNOT, ...CAN]
  const k = rng.pick(all)
  return judge(KP_MEANING, d, `can-${k}`, [T('mean.canQ', { x: L(`mean.k.${k}`) })], CAN.includes(k), rng)
}
function qNext(d: Difficulty, rng: RNG): Question {
  const p = rng.pick([45, 40, 44, 60])
  if (rng.chance(0.5)) return judge(KP_MEANING, d, `next-${p}`, [T('mean.nextQ', { p })], false, rng)
  return keypad(KP_MEANING, d, `hundred-${p}`, [T('mean.hundredQ', { p })], p, rng)
}
function qFracRel(d: Difficulty, rng: RNG): Question {
  const f = rng.pick(['47/100', '13/100', '3/100', '71/100'])
  return choice(KP_MEANING, d, `fracrel-${f}`, [T('mean.fracQ')], L('mean.f.rel', { f }), rng.shuffle([L('mean.f.rope', { f }), L('mean.f.rice', { f }), L('mean.f.water', { f })]), rng)
}
// ── 第 3 档 ──
function qTimes(d: Difficulty, rng: RNG): Question {
  return keypad(KP_MEANING, d, 'times-197', [T('mean.timesQ')], 2, rng)
}

function genMeaning(d: Difficulty, rng: RNG): Question {
  const r = rng.next()
  if (d === 1) {
    if (r < 0.14) return qRead(d, rng)
    if (r < 0.26) return qWrite(d, rng)
    if (r < 0.38) return qHundred(d, rng)
    if (r < 0.48) return qBest(d, rng)
    if (r < 0.58) return qToPct(d, rng)
    if (r < 0.74) return qMeaning(d, rng)
    if (r < 0.82) return qNames(d, rng)
    if (r < 0.9) return qOver(d, rng)
    return qConcept(d, rng)
  }
  if (d === 2) {
    if (r < 0.18) return qMeanCmp(d, rng)
    if (r < 0.36) return qRest(d, rng)
    if (r < 0.54) return qOver100(d, rng)
    if (r < 0.72) return qNext(d, rng)
    if (r < 0.86) return qFracRel(d, rng)
    return qMeaning(d, rng)
  }
  if (r < 0.3) return qTimes(d, rng)
  if (r < 0.65) return qRead(d, rng)
  return qWrite(d, rng)
}
defineGenerator(KP_MEANING, genMeaning)

// ═════════════════════════════════════════════════════════════
// 2. 求百分率（分数、小数化成百分数）：例 2、做一做、p83 做一做 1（前四个）和 2、练习十四 2、3、6、7、8，练习十八 2、3
// ═════════════════════════════════════════════════════════════

/** 例 2 投篮（出手, 投进）：课本 5 投 3 中 60%、6 投 4 中 66.7%，别的换数 */
export const SHOTS: [number, number][] = [
  [5, 3],
  [6, 4],
  [4, 3],
  [10, 7],
  [20, 9],
  [25, 11],
  [10, 4],
  [8, 6],
  [6, 5],
  [8, 5],
  [3, 1],
  [6, 1],
  [8, 7],
  [20, 13],
  [25, 19],
]
/** 求百分率的错法：没投进的占几成、分子分母倒过来、没乘 100%（「0.6%」）、除不尽时直接去尾（「66.6%」） */
function rateWrongs(h: number, n: number): string[] {
  const out = [pctOf(n - h, n).text, pctOf(n, h).text, `${fix(Math.floor((h * 2000 + n) / (2 * n)), 3)}%`]
  if (!pctOf(h, n).exact) out.push(pctTrunc(h, n), `${Math.round((h * 100) / n)}%`)
  // 兜底（全对的 45/45 这种）：差 10 个百分点
  const v = pctValue(pctOf(h, n).text)
  out.push(`${fix(v - 1000, 2)}%`)
  return out
}
function qHit(d: Difficulty, rng: RNG): Question {
  const [n, h] = d === 1 && rng.chance(0.35) ? rng.pick(SHOTS.slice(0, 2)) : rng.pick(SHOTS)
  const p = pctOf(h, n)
  return choice(KP_RATE, d, `hit-${n}-${h}`, withKeep([T('rate.hitQ', { n, h })], p), p.text, rng.shuffle(rateWrongs(h, n)), rng)
}
/** 例 2 哪一节的命中率高（第一节 n1 投 h1 进，第二节 n2 投 h2 进）：课本 5 投 3、6 投 4，第二节高 */
export const TWO_HALVES: [number, number, number, number][] = [
  [5, 3, 6, 4],
  [4, 3, 5, 3],
  [5, 3, 10, 6],
  [8, 6, 10, 7],
  [20, 9, 25, 11],
  [6, 4, 9, 6],
  [10, 4, 8, 3],
  [4, 1, 5, 2],
  [10, 7, 20, 15],
]
function qTwo(d: Difficulty, rng: RNG): Question {
  const [n1, h1, n2, h2] = d === 1 && rng.chance(0.3) ? TWO_HALVES[0]! : rng.pick(TWO_HALVES)
  const a = h1 * n2
  const b = h2 * n1
  const correct = a === b ? L('rate.same') : a > b ? L('rate.first') : L('rate.second')
  const all = [L('rate.first'), L('rate.second'), L('rate.same')]
  return labelQuestion({ kpId: KP_RATE, type: 'percent', difficulty: d, sig: `two-${n1}-${h1}-${n2}-${h2}`, stem: [T('rate.twoQ', { n1, h1, n2, h2 })], correct, distractors: all.filter((l) => labelKey(l) !== labelKey(correct)), rng })
}
/** 常见百分率的公式（p81）：rate 词条、部分、总数 */
export const FORMULAS: [string, string, string][] = [
  ['hit', 'in', 'shots'],
  ['attend', 'present', 'students'],
  ['pass', 'ok', 'prod'],
  ['flour', 'flour', 'wheat'],
  ['survive', 'alive', 'trees'],
  ['germ', 'sprout', 'seeds'],
]
function qFormula(d: Difficulty, rng: RNG): Question {
  const [r, a, b] = rng.pick(FORMULAS)
  const pa = L(`rate.p.${a}`)
  const wb = L(`rate.w.${b}`)
  // 三个选项（除反了、忘了乘 100%）：算式在两人对战的窄栏里要折两行，四个放不下
  return choice(KP_RATE, d, `formula-${r}`, [T('rate.formulaQ', { r: L(`rate.r.${r}`) })], L('rate.f.ok', { a: pa, b: wb }), [L('rate.f.rev', { a: pa, b: wb }), L('rate.f.no100', { a: pa, b: wb })], rng, 2)
}
/** 小数化成百分数：p83 做一做 1（0.08、0.125）、练习十四 2（1.5、0.025）和别的数 */
export const DEC_BOOK = ['0.08', '0.125', '1.5', '0.025']
export const DEC_MORE = ['0.6', '0.32', '0.75', '0.045', '1.2', '0.005', '0.85', '0.7', '0.06', '2', '0.9', '0.36']
function qDecPct(d: Difficulty, rng: RNG): Question {
  const x = d === 1 && rng.chance(0.5) ? rng.pick(DEC_BOOK) : rng.pick(DEC_MORE)
  const m = micro(x)
  // 小数点只移了一位、多移了一位、没移、往左移
  const cands = [`${fromMicro(m * 10)}%`, `${fromMicro(m * 1000)}%`, `${x}%`, ...(m % 100 === 0 ? [`${fromMicro(m / 100)}%`] : [])]
  return choice(KP_RATE, d, `decpct-${x}`, [T('rate.toPctQ', { x })], decToPct(x), rng.shuffle(cands), rng)
}
/** 分数化成百分数：p83 做一做 1（2/3、1/6）、练习十四 2（1/3、3/4）和别的数 */
export const FRAC_BOOK = ['2/3', '1/6', '1/3', '3/4']
export const FRAC_MORE = ['3/5', '1/4', '9/20', '11/25', '3/8', '1/40', '7/8', '3/2', '4/5', '7/20', '5/6', '2/5']
function qFracPct(d: Difficulty, rng: RNG): Question {
  const f = d === 1 && rng.chance(0.5) ? rng.pick(FRAC_BOOK) : rng.pick(FRAC_MORE)
  const [n, den] = f.split('/').map(Number) as [number, number]
  const p = pctOf(n, den)
  // 把分子、分母拼起来（3/5 → 35%）、没乘 100、去尾、保留到整数、分子分母倒过来
  const cands: string[] = []
  if (n < 10 && den < 10) cands.push(`${n}${den}%`)
  cands.push(`${fix(Math.floor((n * 2000 + den) / (2 * den)), 3)}%`)
  if (!p.exact) cands.push(pctTrunc(n, den), `${Math.round((n * 100) / den)}%`)
  cands.push(pctOf(den, n).text, pctOf(den - n, den).text, `${n}%`)
  return choice(KP_RATE, d, `fracpct-${f}`, withKeep([T('rate.toPctQ', { x: f })], p), p.text, rng.shuffle(cands), rng)
}
/** 生活中的百分率（p81 的四个公式、做一做的发芽率、p83 做一做 2 的体育达标率）：情境、(总数, 部分) */
export const LIFE: [string, [number, number][]][] = [
  ['attend', [[50, 48], [40, 38], [45, 45], [40, 39], [48, 47]]],
  ['pass', [[200, 196], [500, 490], [80, 76], [250, 240], [400, 398]]],
  ['flour', [[80, 60], [100, 85], [50, 40], [200, 170], [120, 90]]],
  ['survive', [[40, 38], [50, 48], [200, 190], [80, 76], [25, 24]]],
  ['germ', [[20, 15], [10, 5], [25, 23], [50, 48], [300, 285]]],
  ['fit', [[160, 152], [200, 190], [50, 46], [120, 108], [80, 72]]],
]
function qLife(d: Difficulty, rng: RNG): Question {
  const [id, pool] = rng.pick(LIFE)
  const [n, h] = id === 'fit' && d === 1 && rng.chance(0.5) ? pool[0]! : rng.pick(pool)
  const p = pctOf(h, n)
  return choice(KP_RATE, d, `life-${id}-${n}-${h}`, withKeep([T(`rate.c.${id}`, { n, h })], p), p.text, rng.shuffle(rateWrongs(h, n)), rng)
}
/** 算一算（整数的百分数，按的数填进「? %」）：例 2 的 3 ÷ 5、p83 做一做 2 的 152 ÷ 160 …… */
export const CALC: [number, number][] = [
  [3, 5],
  [152, 160],
  [15, 20],
  [23, 25],
  [48, 50],
  [9, 20],
  [11, 25],
  [38, 40],
  [196, 200],
  [60, 80],
  [7, 10],
  [4, 5],
]
function qCalc(d: Difficulty, rng: RNG): Question {
  const [h, n] = d === 1 && rng.chance(0.3) ? CALC[rng.int(0, 1)]! : rng.pick(CALC)
  return keypad(KP_RATE, d, `calc-${h}-${n}`, [T('calc'), E(`${h} ÷ ${n} = ?%`)], (h * 100) / n, rng)
}
/** 做一做 p82 的发芽率表：种子数、发芽数（第一次的发芽率课本已经填好），第一组是课本的 */
export const GERM_SETS: { seeds: number[]; sprouts: number[] }[] = [
  { seeds: [10, 20, 22, 25], sprouts: [5, 15, 18, 23] },
  { seeds: [10, 20, 25, 40], sprouts: [7, 17, 21, 30] },
  { seeds: [20, 25, 30, 50], sprouts: [16, 19, 27, 46] },
]
function germTable(set: { seeds: number[]; sprouts: number[] }, ask: number | null): StemPart {
  const rates: (LStr | null)[] = set.seeds.map((s, i) => (i === 0 ? pctOf(set.sprouts[0]!, s).text : i === ask ? null : ''))
  return {
    kind: 'stat-table',
    head: 'col',
    rows: [
      [L('rate.t.trial'), ...set.seeds.map((_, i) => L('rate.t.nth', { n: i + 1 }))],
      [L('rate.t.seeds'), ...set.seeds],
      [L('rate.t.sprout'), ...set.sprouts],
      [L('rate.t.rate'), ...rates],
    ],
  }
}
function qGerm(d: Difficulty, rng: RNG): Question {
  const si = d === 1 && rng.chance(0.5) ? 0 : rng.int(0, GERM_SETS.length - 1)
  const set = GERM_SETS[si]!
  const rates = set.seeds.map((s, i) => set.sprouts[i]! / s)
  if (rng.chance(0.4)) {
    const best = rates.indexOf(Math.max(...rates))
    const all = [1, 2, 3, 4].map((k) => L(`rate.nth.${k}`))
    return labelQuestion({ kpId: KP_RATE, type: 'percent', difficulty: d, sig: `germmax-${si}`, stem: [T('rate.germIntro'), germTable(set, null), T('rate.germMaxQ')], correct: all[best]!, distractors: all.filter((_, i) => i !== best), rng })
  }
  const k = rng.int(1, 3)
  const s = set.seeds[k]!
  const h = set.sprouts[k]!
  const p = pctOf(h, s)
  const others = set.seeds.map((x, i) => pctOf(set.sprouts[i]!, x).text).filter((_, i) => i !== k)
  return choice(KP_RATE, d, `germ-${si}-${k}`, withKeep([T('rate.germIntro'), germTable(set, k), T('rate.germQ', { nth: L(`rate.nth.${k + 1}`) })], p), p.text, [...rng.shuffle(rateWrongs(h, s)), ...others], rng)
}
/** 练习十四 3：每天需要 2500 毫升水，从食物中获得约 1200 毫升（48%），其余饮水获得（52%） */
function qWaterBody(d: Difficulty, rng: RNG): Question {
  if (d === 1) return choice(KP_RATE, d, 'body-food', [T('rate.foodQ')], '48%', ['52%', '208.3%', '12%', '0.48%'], rng)
  return choice(KP_RATE, d, 'body-drink', [T('rate.drinkQ')], '52%', ['48%', '13%', '192.3%', '0.52%'], rng)
}
// ── 第 2 档 ──
/** 练习十四 6：社团人数的条形统计图（书法 7、合唱 8、舞蹈 12、篮球 6、绘画 9，共 42 人） */
export const CLUBS: [string, number][] = [
  ['cal', 7],
  ['choir', 8],
  ['dance', 12],
  ['ball', 6],
  ['paint', 9],
]
export const CLUB_TOTAL = 42
/** 「六年级一班参加社团的人数」写成图题（不朗读）：手机竖屏一屏放得下 */
const clubChart = (): StemPart => ({
  kind: 'bar-chart',
  dir: 'v',
  title: L('rate.club.title'),
  cats: CLUBS.map(([k]) => L(`rate.club.${k}`)),
  series: [{ values: CLUBS.map(([, v]) => v) }],
  step: 2,
  cells: 7,
  grid: true,
  valueAxis: L('rate.club.people'),
  catAxis: L('rate.club.axis'),
})
function qClub(d: Difficulty, rng: RNG): Question {
  const i = d === 2 && rng.chance(0.4) ? 1 : rng.int(0, CLUBS.length - 1)
  const [k, v] = CLUBS[i]!
  const p = pctOf(v, CLUB_TOTAL)
  const max = Math.max(...CLUBS.map(([, x]) => x))
  // 总数数错（少数一个社团）、除以最多的那个、没乘 100%
  const cands = [pctOf(v, CLUB_TOTAL - CLUBS[(i + 1) % CLUBS.length]![1]).text, pctOf(v, max).text, pctOf(CLUB_TOTAL - v, CLUB_TOTAL).text, pctTrunc(v, CLUB_TOTAL)]
  return choice(KP_RATE, d, `club-${k}`, withKeep([clubChart(), T('rate.clubQ', { c: L(`rate.club.${k}`) })], p), p.text, cands, rng)
}
/** 练习十八 2：三批大麦种子各检测 300 粒，发芽 285、291、270（都不低于 85%）；变式把一批换成 250 / 240 粒 */
export const BARLEY: number[][] = [
  [285, 291, 270],
  [285, 250, 270],
  [240, 291, 270],
  [285, 291, 252],
]
function qBarley(d: Difficulty, rng: RNG): Question {
  const bi = rng.int(0, BARLEY.length - 1)
  const sprouts = BARLEY[bi]!
  const bad = sprouts.findIndex((h) => h * 100 < 85 * 300)
  const table: StemPart = {
    kind: 'stat-table',
    head: 'row',
    rows: [[L('rate.t.batch'), L('rate.t.tested'), L('rate.t.sprouted')], ...sprouts.map((h, i) => [L(`rate.b.${i + 1}`), 300, h])],
  }
  const all = [L('rate.b.1'), L('rate.b.2'), L('rate.b.3'), L('rate.b.all')]
  const correct = bad < 0 ? all[3]! : all[bad]!
  return labelQuestion({ kpId: KP_RATE, type: 'percent', difficulty: d, sig: `barley-${bi}`, stem: [T('rate.barleyIntro'), table, T('rate.barleyQ')], correct, distractors: all.filter((l) => labelKey(l) !== labelKey(correct)), rng })
}
/** 练习十四 8：10000 张奖券里一等奖 10 张，中奖率 0.1% */
export const PRIZES = [10, 60, 50, 100, 200]
function qLottery(d: Difficulty, rng: RNG): Question {
  const n = rng.pick(PRIZES)
  const p = pctOf(n, 10000)
  return choice(KP_RATE, d, `lottery-${n}`, [T('rate.lotteryQ', { n })], p.text, [pctOf(n, 1000).text, pctOf(n, 100000).text, pctOf(n * 10, 1000).text, `${n}%`], rng)
}
/** 比一比（化成同一种写法再比） */
export const RATE_CMP: [string, string][] = [
  ['3/5', '60%'],
  ['1/3', '33%'],
  ['0.6', '6%'],
  ['0.125', '12.5%'],
  ['2/3', '66%'],
  ['0.08', '8%'],
  ['1.5', '15%'],
  ['3/4', '70%'],
  ['1/6', '17%'],
]
/** 一个数（小数、分数或百分数）的值：化成 [分子, 分母] */
export function valueOf(s: string): [number, number] {
  if (s.endsWith('%')) return pctToFrac(s.slice(0, -1))
  if (s.includes('/')) {
    const [n, d] = s.split('/').map(Number) as [number, number]
    return [n, d]
  }
  return [micro(s), 1e6]
}
function qRateCmp(d: Difficulty, rng: RNG): Question {
  const [a, b] = rng.pick(RATE_CMP)
  const [x, y] = rng.chance(0.5) ? [a, b] : [b, a]
  const [xn, xd] = valueOf(x)
  const [yn, yd] = valueOf(y)
  const correct = xn * yd === yn * xd ? '=' : xn * yd < yn * xd ? '<' : '>'
  return choice(KP_RATE, d, `cmp-${x}|${y}`, [T('cmp'), E(`${x} ○ ${y}`)], correct, ['>', '<', '='], rng, 2)
}
function qKeep(d: Difficulty, rng: RNG): Question {
  return choice(KP_RATE, d, 'keep3', [T('rate.keepQ')], L('rate.dp.3'), rng.shuffle([L('rate.dp.1'), L('rate.dp.2'), L('rate.dp.4')]), rng)
}
/** 练习十四 7：每天吃早餐的 437 人、占 95%，不能做到每天吃早餐的占 5% */
function qBreakfast(d: Difficulty, rng: RNG): Question {
  const table: StemPart = {
    kind: 'stat-table',
    head: 'row',
    rows: [
      [L('rate.t.bf'), L('rate.t.count'), L('rate.t.share')],
      [L('rate.t.daily'), 437, '95%'],
      [L('rate.t.notDaily'), '', null],
    ],
  }
  return choice(KP_RATE, d, 'breakfast', [T('rate.bfIntro'), table, T('rate.bfQ')], '5%', ['95%', '15%', '0.5%'], rng)
}
// ── 第 3 档 ──
/** 练习十八 3：某冰激凌厂家 2023 年 1—6 月的销量（万箱） */
export const ICE = [58, 42, 94, 162, 212, 224]
export const iceChart = (): StemPart => ({
  kind: 'bar-chart',
  dir: 'v',
  cats: ICE.map((_, i) => L('rate.ice.m', { n: i + 1 })),
  series: [{ values: ICE }],
  step: 50,
  cells: 5,
  numbers: true,
  valueAxis: L('rate.ice.axis'),
  catAxis: L('rate.ice.month'),
})
function qIce(d: Difficulty, rng: RNG): Question {
  const p = pctOf(224, 58)
  return choice(KP_RATE, d, 'ice-6-1', withKeep([T('rate.iceIntro'), iceChart(), T('rate.iceQ')], p), p.text, [pctOf(58, 224).text, pctOf(224 - 58, 58).text, `${fix(Math.floor((224 * 2000 + 58) / 116), 3)}%`], rng)
}

function genRate(d: Difficulty, rng: RNG): Question {
  const r = rng.next()
  if (d === 1) {
    if (r < 0.14) return qHit(d, rng)
    if (r < 0.24) return qTwo(d, rng)
    if (r < 0.33) return qFormula(d, rng)
    if (r < 0.45) return qDecPct(d, rng)
    if (r < 0.57) return qFracPct(d, rng)
    if (r < 0.72) return qLife(d, rng)
    if (r < 0.82) return qCalc(d, rng)
    if (r < 0.93) return qGerm(d, rng)
    return qWaterBody(d, rng)
  }
  if (d === 2) {
    if (r < 0.14) return qWaterBody(d, rng)
    if (r < 0.3) return qClub(d, rng)
    if (r < 0.44) return qBarley(d, rng)
    if (r < 0.56) return qLottery(d, rng)
    if (r < 0.7) return qRateCmp(d, rng)
    if (r < 0.8) return qKeep(d, rng)
    if (r < 0.9) return qBreakfast(d, rng)
    return qFracPct(d, rng)
  }
  if (r < 0.4) return qIce(d, rng)
  if (r < 0.7) return qClub(d, rng)
  return qFracPct(d, rng)
}
defineGenerator(KP_RATE, genRate)

// ═════════════════════════════════════════════════════════════
// 3. 求一个数的百分之几是多少（百分数化成分数、小数）：例 3、做一做 1（后两个）和 3、练习十四 2、4、5，练习十八 1(1)、6
// ═════════════════════════════════════════════════════════════

/** 例 3：每人投篮 n 次，命中率 p%，投进几个（课本 20 次、25%，乐乐改叫小芳） */
export const PART_SHOTS: [number, number][] = [
  [20, 25],
  [20, 45],
  [20, 60],
  [40, 30],
  [50, 40],
  [25, 44],
  [10, 70],
  [20, 35],
  [40, 25],
  [25, 80],
  [50, 36],
  [20, 85],
]
function qPartShot(d: Difficulty, rng: RNG): Question {
  const [n, p] = d === 1 && rng.chance(0.3) ? PART_SHOTS[0]! : rng.pick(PART_SHOTS)
  return keypad(KP_PART, d, `shot-${n}-${p}`, [T('part.shotQ', { n, p })], (n * p) / 100, rng)
}
/** 例 3 的两种算法：把百分数化成小数或分数再乘 */
export const METHODS: [number, number][] = [
  [20, 25],
  [40, 30],
  [50, 40],
  [20, 45],
  [80, 75],
  [60, 20],
]
function qMethod(d: Difficulty, rng: RNG): Question {
  const [n, p] = rng.pick(METHODS)
  const dec = pctToDec(String(p))!
  const asFrac = rng.chance(0.4)
  const correct = asFrac ? `${n} × ${fracText(pctToFrac(String(p)))}` : `${n} × ${dec}`
  const cands = [`${n} × ${p}`, `${n} ÷ ${dec}`, `${n} × ${fromMicro(micro(dec) * 10)}`, `${n} ÷ ${p}`]
  return choice(KP_PART, d, `method-${n}-${p}-${asFrac ? 'f' : 'd'}`, [T('part.methodQ', { e: `${n} × ${p}%` })], correct, rng.shuffle(cands), rng)
}
/** 百分数化成小数：做一做 1（37.5%、0.85%）、练习十四 2（32%、0.5%）和别的数 */
export const PCT_DEC_1 = ['37.5', '32', '25', '8', '45', '120', '150', '2.5', '7.5', '66', '60', '4', '12.5']
export const PCT_DEC_2 = ['0.85', '0.5', '0.25', '37.5', '32']
function qPctDec(d: Difficulty, rng: RNG): Question {
  const x = d === 1 ? rng.pick(PCT_DEC_1) : rng.pick(PCT_DEC_2)
  const m = micro(x)
  // 小数点只移了一位、没移、多移了一位、往右移
  const cands = [m % 10 === 0 ? fromMicro(m / 10) : '', x, m % 1000 === 0 ? fromMicro(m / 1000) : '', fromMicro(m * 100)]
  return choice(KP_PART, d, `pctdec-${x}`, [T('part.toDecQ', { x: `${x}%` })], pctToDec(x)!, rng.shuffle(cands), rng)
}
/** 百分数化成最简分数：做一做 1（37.5% = 3/8、0.85% = 17/2000）、练习十四 2（32% = 8/25、0.5% = 1/200） */
export const PCT_FRAC_1 = ['37.5', '32', '25', '75', '40', '45', '60', '4', '12.5', '150', '2.5', '20', '80']
export const PCT_FRAC_2 = ['0.5', '0.85', '37.5', '32']
function qPctFrac(d: Difficulty, rng: RNG): Question {
  const x = d === 1 ? rng.pick(PCT_FRAC_1) : rng.pick(PCT_FRAC_2)
  const [n, den] = pctToFrac(x)
  const cands: string[] = []
  // 没约分（化成最简分数的题考写法，可以放一个）、当成千分之几、分子分母倒过来、分子多 1
  if (/^\d+$/.test(x) && Number(x) % 100 !== 0) cands.push(`${x}/100`)
  const [pn, pd] = pctToFrac(fromMicro(micro(x) / 10))
  if (pd <= 9999) cands.push(fracText([pn, pd]))
  if (n !== 1) cands.push(fracText([den, n]))
  const g1 = gcd(n + 1, den)
  cands.push(fracText([(n + 1) / g1, den / g1]))
  return choice(KP_PART, d, `pctfrac-${x}`, [T('part.toFracQ', { x: `${x}%` })], fracText([n, den]), cands, rng)
}
/** 做一做 3：六年级一班 40 名学生，95% 达标（课本六（1）班，括号会读出来） */
export const JUMP: [number, number][] = [
  [40, 95],
  [50, 90],
  [45, 80],
  [48, 75],
  [40, 85],
  [50, 96],
]
/** 练习十四 4：某小学 480 人，10% 参加合唱团 */
export const CHOIR: [number, number][] = [
  [480, 10],
  [600, 15],
  [800, 5],
  [1200, 20],
  [360, 25],
  [500, 12],
]
/** 练习十八 1(1)：出油率约 42%，2100 千克油菜籽榨油多少千克 */
export const OIL: [number, number][] = [
  [42, 2100],
  [42, 500],
  [40, 1000],
  [35, 300],
  [45, 800],
  [42, 1500],
]
function qPartWord(d: Difficulty, rng: RNG): Question {
  const r = rng.next()
  if (r < 0.34) {
    const [n, p] = d === 1 && rng.chance(0.3) ? JUMP[0]! : rng.pick(JUMP)
    return keypad(KP_PART, d, `jump-${n}-${p}`, [T('part.jumpQ', { n, p })], (n * p) / 100, rng)
  }
  if (r < 0.67) {
    const [n, p] = d === 1 && rng.chance(0.3) ? CHOIR[0]! : rng.pick(CHOIR)
    return keypad(KP_PART, d, `choir-${n}-${p}`, [T('part.choirQ', { n, p })], (n * p) / 100, rng)
  }
  const [p, n] = d === 1 && rng.chance(0.3) ? OIL[0]! : rng.pick(OIL)
  return keypad(KP_PART, d, `oil-${p}-${n}`, [T('part.oilQ', { p, n })], (n * p) / 100, rng)
}
function qPartHow(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) return choice(KP_PART, d, 'how-op', [T('part.howQ')], L('part.op.mul'), rng.shuffle([L('part.op.div'), L('part.op.add'), L('part.op.sub')]), rng)
  return choice(KP_PART, d, 'how-same', [T('part.sameQ')], L('part.same'), [L('part.diff')], rng)
}
// ── 第 2 档 ──
/** 练习十四 5：一中 800 人、男生 48%，二中 750 人、男生 54%（一中、二中改成甲校、乙校）；换两组数 */
export const SCHOOLS: [number, number, number, number][] = [
  [800, 48, 750, 54],
  [600, 50, 500, 62],
  [900, 52, 1000, 48],
]
function qSchools(d: Difficulty, rng: RNG): Question {
  const si = d === 2 && rng.chance(0.5) ? 0 : rng.int(0, SCHOOLS.length - 1)
  const [a1, p1, a2, p2] = SCHOOLS[si]!
  const b1 = (a1 * p1) / 100
  const b2 = (a2 * p2) / 100
  if (rng.chance(0.5)) {
    const all = [L('part.jia'), L('part.yi'), L('part.equal')]
    const correct = b1 === b2 ? all[2]! : b1 > b2 ? all[0]! : all[1]!
    return labelQuestion({ kpId: KP_PART, type: 'percent', difficulty: d, sig: `school-${si}`, stem: [T('part.schoolCtx', { a1, p1, a2, p2 }), T('part.schoolQ')], correct, distractors: all.filter((l) => labelKey(l) !== labelKey(correct)), rng })
  }
  const more = b1 > b2 ? 'jia' : 'yi'
  return keypad(KP_PART, d, `schooldiff-${si}`, [T('part.schoolCtx', { a1, p1, a2, p2 }), T('part.schoolDiffQ', { m: L(`part.${more}`), l: L(`part.${more === 'jia' ? 'yi' : 'jia'}`) })], Math.abs(b1 - b2), rng)
}
function qNotChoir(d: Difficulty, rng: RNG): Question {
  const [n, p] = rng.pick(CHOIR)
  return keypad(KP_PART, d, `notchoir-${n}-${p}`, [T('part.notChoirQ', { n, p })], n - (n * p) / 100, rng)
}
/** 练习十八 6：部分食物的碳水化合物含量（百分数照课本，千分之几的整数存） */
export const FOODS: [string, string][] = [
  ['beef', '0.5'],
  ['egg', '2.4'],
  ['soy', '34.2'],
  ['cabbage', '3.4'],
  ['tomato', '3.3'],
  ['rice', '25.9'],
  ['bun', '47'],
]
/** 问哪种食物多少克：(食物, 克数) */
export const CARB_ASK: [string, number][] = [
  ['bun', 200],
  ['bun', 100],
  ['rice', 100],
  ['soy', 50],
  ['egg', 50],
  ['cabbage', 500],
  ['tomato', 200],
  ['rice', 200],
]
function qCarb(d: Difficulty, rng: RNG): Question {
  const [food, g] = rng.pick(CARB_ASK)
  const pc = FOODS.find(([k]) => k === food)![1]
  const table: StemPart = { kind: 'stat-table', head: 'col', rows: [[L('part.t.food'), ...FOODS.map(([k]) => L(`part.food.${k}`))], [L('part.t.carb'), ...FOODS.map(([, v]) => `${v}%`)]] }
  const stem: StemPart[] = [T('part.carbIntro'), table, T('part.carbQ', { g, f: L(`part.food.${food}`) })]
  const m = (micro(pc) * g) / 100 // 百万分之几克
  // 带 8 列的表：得数是整数的也用选项卡（错法：小数点移错一位、忘了乘百分数）
  const ans = fromMicro(m)
  return choice(KP_PART, d, `carb-${food}-${g}`, stem, ans, [fromMicro(m * 10), fromMicro(m / 10), fromMicro(micro(pc) * g)], rng)
}
// ── 第 3 档 ──
function qPhoto(d: Difficulty, rng: RNG): Question {
  return keypad(KP_PART, d, 'photo-third', [T('part.photoQ')], 28, rng)
}
function qCash(d: Difficulty, rng: RNG): Question {
  return keypad(KP_PART, d, 'cash-second', [T('part.cashQ')], 3000, rng)
}

function genPart(d: Difficulty, rng: RNG): Question {
  const r = rng.next()
  if (d === 1) {
    if (r < 0.2) return qPartShot(d, rng)
    if (r < 0.32) return qMethod(d, rng)
    if (r < 0.48) return qPctDec(d, rng)
    if (r < 0.64) return qPctFrac(d, rng)
    if (r < 0.9) return qPartWord(d, rng)
    return qPartHow(d, rng)
  }
  if (d === 2) {
    if (r < 0.25) return qSchools(d, rng)
    if (r < 0.4) return qNotChoir(d, rng)
    if (r < 0.65) return qCarb(d, rng)
    if (r < 0.8) return qPctDec(d, rng)
    return qPctFrac(d, rng)
  }
  if (r < 0.4) return qPhoto(d, rng)
  if (r < 0.7) return qCash(d, rng)
  return qCarb(d, rng)
}
defineGenerator(KP_PART, genPart)

// ═════════════════════════════════════════════════════════════
// 4. 求增长率：应用例 3、做一做 1、2，练习十六 1、6，练习十八 3、5
// ═════════════════════════════════════════════════════════════

/** 应用例 3（原计划, 实际，万辆）：燃油汽车 12 → 14、新能源汽车 8 → 10，别的换数 */
export const CARS: [number, number][] = [
  [12, 14],
  [8, 10],
  [16, 20],
  [20, 25],
  [40, 50],
  [25, 30],
  [50, 60],
  [10, 13],
  [100, 130],
  [80, 100],
  [60, 75],
  [5, 6],
  [15, 18],
  [40, 46],
  [6, 7],
  [30, 36],
]
/** 增长率的错法：除以现在的量、答成「增长到」、倒过来除 */
function growWrongs(a: number, b: number): string[] {
  return [pctOf(b - a, b).text, pctOf(b, a).text, pctOf(a, b).text, `${b - a}%`]
}
function qCar(d: Difficulty, rng: RNG): Question {
  const [a, b] = d === 1 && rng.chance(0.35) ? rng.pick(CARS.slice(0, 2)) : rng.pick(CARS)
  const car = a === 12 && b === 14 ? 'fuel' : a === 8 && b === 10 ? 'ev' : rng.pick(['fuel', 'ev'])
  const p = pctOf(b - a, a)
  const bars = growBars(a, b, [L('grow.plan'), L('grow.actual')], { a: String(a), b: String(b), diff: String(b - a) })
  return choice(KP_GROWTH, d, `car-${a}-${b}`, withKeep([T('grow.carQ', { car: L(`grow.${car}`), a, b }), bars], p), p.text, rng.shuffle(growWrongs(a, b)), rng)
}
/** 应用例 3 哪种汽车的增长率大（燃油汽车 a1 → b1，新能源汽车 a2 → b2） */
export const CAR_PAIRS: [number, number, number, number][] = [
  [12, 14, 8, 10],
  [10, 12, 15, 17],
  [20, 25, 8, 10],
  [6, 8, 9, 11],
  [30, 33, 10, 13],
  [16, 20, 12, 15],
]
function qWhich(d: Difficulty, rng: RNG): Question {
  const pi = d === 1 && rng.chance(0.35) ? 0 : rng.int(0, CAR_PAIRS.length - 1)
  const [a1, b1, a2, b2] = CAR_PAIRS[pi]!
  const g1 = (b1 - a1) * a2
  const g2 = (b2 - a2) * a1
  const all = [L('grow.fuel'), L('grow.ev'), L('grow.sameBig')]
  const correct = g1 === g2 ? all[2]! : g1 > g2 ? all[0]! : all[1]!
  const table: StemPart = {
    kind: 'stat-table',
    head: 'row',
    rows: [
      [L('grow.t.type'), L('grow.t.plan'), L('grow.t.actual')],
      [L('grow.fuel'), a1, b1],
      [L('grow.ev'), a2, b2],
    ],
  }
  return labelQuestion({ kpId: KP_GROWTH, type: 'percent', difficulty: d, sig: `which-${pi}`, stem: [T('grow.whichIntro'), table, T('grow.whichQ')], correct, distractors: all.filter((l) => labelKey(l) !== labelKey(correct)), rng })
}
function qGrowMean(d: Difficulty, rng: RNG): Question {
  return choice(KP_GROWTH, d, 'meaning', [T('grow.meanQ')], L('grow.m.ok'), rng.shuffle([L('grow.m.now'), L('grow.m.ratio'), L('grow.m.rev')]), rng)
}
function qMethod2(d: Difficulty, rng: RNG): Question {
  const [a, b] = d === 1 && rng.chance(0.35) ? rng.pick(CARS.slice(0, 2)) : rng.pick(CARS)
  const to = pctOf(b, a)
  const by = pctOf(b - a, a)
  return choice(
    KP_GROWTH,
    d,
    `m2-${a}-${b}`,
    withKeep([T('grow.m2Intro', { a, b }), E(`${b} ÷ ${a} ${to.exact ? '=' : '≈'} ${to.text}`), T('grow.m2Q')], by),
    by.text,
    [to.text, pctOf(a, b).text, pctOf(b - a, b).text],
    rng,
  )
}
/** 做一做 1：原计划造林 a 公顷，实际多 x 公顷（课本 16、4） */
export const FOREST: [number, number][] = [
  [16, 4],
  [20, 5],
  [40, 6],
  [25, 5],
  [50, 10],
  [30, 3],
  [12, 2],
  [40, 10],
]
function qForest(d: Difficulty, rng: RNG): Question {
  const [a, x] = d === 1 && rng.chance(0.35) ? FOREST[0]! : rng.pick(FOREST)
  const p = pctOf(x, a)
  return choice(KP_GROWTH, d, `forest-${a}-${x}`, withKeep([T('grow.forestQ', { a, x })], p), p.text, [pctOf(x, a + x).text, `${x}%`, pctOf(a + x, a).text, pctOf(a, a + x).text], rng)
}
/** 做一做 2：沙化面积由约 1.8 万平方千米缩小为约 1.2 万平方千米（存成十分之几的整数）；节约用水（吨） */
export const DESERT: [number, number][] = [
  [18, 12],
  [20, 15],
  [25, 20],
  [16, 12],
  [30, 24],
  [24, 18],
]
export const SAVE_WATER: [number, number][] = [
  [20, 16],
  [25, 20],
  [12, 9],
  [16, 12],
  [10, 8],
  [15, 12],
  [30, 27],
]
function qDecrease(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.55)) {
    const [a, b] = d === 1 && rng.chance(0.4) ? DESERT[0]! : rng.pick(DESERT)
    const p = pctOf(a - b, a)
    const bars = growBars(a, b, [L('grow.before'), L('grow.now')], { a: fix(a, 1), b: fix(b, 1), diff: fix(a - b, 1) })
    return choice(KP_GROWTH, d, `desert-${a}-${b}`, withKeep([T('grow.desertQ', { a: fix(a, 1), b: fix(b, 1) }), bars], p), p.text, [pctOf(a - b, b).text, pctOf(b, a).text, `${fix(a - b, 1)}%`], rng)
  }
  const [a, b] = rng.pick(SAVE_WATER)
  const p = pctOf(a - b, a)
  return choice(KP_GROWTH, d, `save-${a}-${b}`, withKeep([T('grow.saveQ', { a, b })], p), p.text, [pctOf(a - b, b).text, pctOf(b, a).text, `${a - b}%`], rng)
}
function qGrowFormula(d: Difficulty, rng: RNG): Question {
  const [a, b] = rng.pick(CARS.slice(0, 8))
  return choice(KP_GROWTH, d, `formula-${a}-${b}`, [T('grow.formulaQ', { a, b })], `(${b} − ${a}) ÷ ${a}`, rng.shuffle([`(${b} − ${a}) ÷ ${b}`, `${b} ÷ ${a}`, `${a} ÷ ${b}`]), rng)
}
function qGrowJudge(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) return judge(KP_GROWTH, d, 'same2', [T('grow.sameQ')], false, rng)
  return judge(KP_GROWTH, d, 'over100', [T('grow.overQ')], true, rng)
}
/** 整数的增长率直接算（按的数填进「? %」） */
function qGrowCalc(d: Difficulty, rng: RNG): Question {
  const exact = CARS.filter(([a, b]) => ((b - a) * 100) % a === 0)
  const [a, b] = rng.pick(exact)
  return keypad(KP_GROWTH, d, `calc-${a}-${b}`, [T('calc'), E(`(${b} − ${a}) ÷ ${a} = ?%`)], ((b - a) * 100) / a, rng)
}
// ── 第 2 档 ──
/** 练习十六 1：路宽 12 米 → 25 米（拓宽了约 108.3%） */
export const ROADS: [number, number][] = [
  [12, 25],
  [10, 25],
  [8, 20],
  [15, 24],
]
function qRoad(d: Difficulty, rng: RNG): Question {
  const [a, b] = d === 2 && rng.chance(0.5) ? ROADS[0]! : rng.pick(ROADS)
  const p = pctOf(b - a, a)
  return choice(KP_GROWTH, d, `road-${a}-${b}`, withKeep([T('grow.roadQ', { a, b })], p), p.text, [pctOf(b, a).text, pctOf(b - a, b).text, `${b - a}%`], rng)
}
/** 练习十六 6：长方体木块 5 × 4 × 3 锯成最大的正方体（棱长取最小的那条），体积减少 55% */
export const BLOCKS: [number, number, number][] = [
  [5, 4, 3],
  [6, 5, 4],
  [5, 5, 4],
  [8, 5, 5],
  [6, 4, 4],
]
function qBlock(d: Difficulty, rng: RNG): Question {
  const [l, w, h] = d === 2 && rng.chance(0.5) ? BLOCKS[0]! : rng.pick(BLOCKS)
  const v = l * w * h
  const e = Math.min(l, w, h)
  const c = e ** 3
  const p = pctOf(v - c, v)
  return choice(KP_GROWTH, d, `block-${l}-${w}-${h}`, withKeep([T('grow.blockQ', { l, w, h })], p), p.text, [pctOf(c, v).text, pctOf(v - c, c).text, pctOf(l - e, l).text], rng)
}
/** 增长到和增长了 */
export const TO_BY = [125, 116, 130, 150, 108]
function qToBy(d: Difficulty, rng: RNG): Question {
  const q = rng.pick(TO_BY)
  if (rng.chance(0.5)) return choice(KP_GROWTH, d, `toby-${q}`, [T('grow.toByQ', { q })], `${q - 100}%`, [`${q}%`, `${200 - q}%`, `${q + 100}%`], rng)
  const g = q - 100
  return choice(KP_GROWTH, d, `byto-${g}`, [T('grow.byToQ', { g })], `${100 + g}%`, [`${g}%`, `${100 - g}%`, `${200 + g}%`], rng)
}
/** 降价了百分之几 */
export const PRICE_DROP: [number, number][] = [
  [80, 60],
  [50, 40],
  [120, 90],
  [200, 150],
  [40, 34],
]
function qPriceDrop(d: Difficulty, rng: RNG): Question {
  const [a, b] = rng.pick(PRICE_DROP)
  const p = pctOf(a - b, a)
  return choice(KP_GROWTH, d, `drop-${a}-${b}`, [T('grow.dropQ', { a, b })], p.text, [pctOf(a - b, b).text, pctOf(b, a).text, `${a - b}%`], rng)
}
// ── 第 3 档 ──
/** 练习十八 5：营业额 1 月 100 万元，2 月 130 万元（增长 30%），3 月 117（−10%），4 月 111.15（−5%），5 月 111.15（0%）；存成百分之几万元 */
export const MALL: [number, number, number, number][] = [
  [1, 10000, 2, 13000],
  [2, 13000, 3, 11700],
  [3, 11700, 4, 11115],
  [4, 11115, 5, 11115],
]
function qMall(d: Difficulty, rng: RNG): Question {
  const mi = rng.int(0, MALL.length - 1)
  const [m1, a, m2, b] = MALL[mi]!
  const p = pctOf(b - a, a)
  const neg = p.text.startsWith('−') ? p.text.slice(1) : p.text === '0%' ? '' : `−${p.text}`
  // 正负号弄反、除以后一个月、答成「是前一个月的百分之几」
  const cands = [neg, b === a ? '100%' : pctOf(b - a, b).text, pctOf(b, a).text, '0%', '10%', '−10%']
  return choice(KP_GROWTH, d, `mall-${m1}`, [T('grow.mallQ', { m1, m2, a: fix(a, 2), b: fix(b, 2) })], p.text, cands, rng)
}
function qIceGrow(d: Difficulty, rng: RNG): Question {
  const p = pctOf(212 - 162, 162)
  return choice(KP_GROWTH, d, 'ice-5-4', withKeep([T('rate.iceIntro'), iceChart(), T('grow.iceQ')], p), p.text, [pctOf(212, 162).text, pctOf(50, 212).text, '50%'], rng)
}

function genGrowth(d: Difficulty, rng: RNG): Question {
  const r = rng.next()
  if (d === 1) {
    if (r < 0.2) return qCar(d, rng)
    if (r < 0.32) return qWhich(d, rng)
    if (r < 0.4) return qGrowMean(d, rng)
    if (r < 0.5) return qMethod2(d, rng)
    if (r < 0.62) return qForest(d, rng)
    if (r < 0.76) return qDecrease(d, rng)
    if (r < 0.84) return qGrowFormula(d, rng)
    if (r < 0.92) return qGrowJudge(d, rng)
    return qGrowCalc(d, rng)
  }
  if (d === 2) {
    if (r < 0.25) return qRoad(d, rng)
    if (r < 0.5) return qBlock(d, rng)
    if (r < 0.75) return qToBy(d, rng)
    return qPriceDrop(d, rng)
  }
  if (r < 0.6) return qMall(d, rng)
  return qIceGrow(d, rng)
}
defineGenerator(KP_GROWTH, genGrowth)

// ═════════════════════════════════════════════════════════════
// 5. 已知增加后的数求原来的数（平台章节「已知比一个数多百分之几的数是多少求这个数」）：应用例 4、做一做 1、2，
//    练习十六 2、3、4，练习十八 1(2)、4，练习十四 7
// ═════════════════════════════════════════════════════════════

/** 应用例 4（现在的量, 增长率%）→ 原来的量：课本 3000 万元、20% → 2500；做一做 2 1200 亿元、25% → 960 */
export const BASE_POOL: [number, number][] = [
  [3000, 20],
  [1200, 25],
  [5500, 10],
  [360, 20],
  [130, 30],
  [660, 10],
  [450, 50],
  [1050, 5],
  [2520, 5],
  [240, 20],
  [1500, 25],
  [880, 10],
  [690, 15],
  [2400, 20],
  [1800, 20],
]
const before = (now: number, r: number): number => (now * 100) / (100 + r)
function qProfit(d: Difficulty, rng: RNG): Question {
  const [now, r] = d === 1 && rng.chance(0.35) ? BASE_POOL[0]! : rng.pick(BASE_POOL)
  const y1 = rng.pick([2020, 2021, 2022, 2023])
  const y2 = y1 + 1
  const tong = rng.chance(0.5)
  const bars = baseBars(r, String(now), [L('base.yearProfit', { y: y1 }), L('base.yearProfit', { y: y2 })])
  // 带线段图：选项卡。错法：乘 (1 − r%)、乘 (1 + r%)、只算了增加的那一部分
  const smart = [(now * (100 - r)) / 100, (now * (100 + r)) / 100, (now * r) / 100, now - r]
  return cards(KP_BASE, d, `profit-${now}-${r}-${y1}-${tong ? 't' : 'b'}`, [T(tong ? 'base.tongQ' : 'base.profitQ', { y1, y2, now, r }), bars], before(now, r), smart, rng)
}
function qGdp(d: Difficulty, rng: RNG): Question {
  const [now, r] = d === 1 && rng.chance(0.35) ? BASE_POOL[1]! : rng.pick(BASE_POOL)
  return keypad(KP_BASE, d, `gdp-${now}-${r}`, [T('base.gdpQ', { now, r })], before(now, r), rng)
}
/** 做一做 1、练习十六 2（顺着求：原来的量 × (1 + r%)）：课本 1.4 万册（写成 14000 册）、12%；新能源汽车 5000 辆、10% */
export const FORWARD: [number, number][] = [
  [14000, 12],
  [5000, 10],
  [800, 25],
  [600, 15],
  [2500, 20],
  [1200, 5],
  [3000, 8],
  [12000, 15],
]
function qForward(d: Difficulty, rng: RNG): Question {
  const [a, r] = d === 1 && rng.chance(0.4) ? FORWARD[rng.int(0, 1)]! : rng.pick(FORWARD)
  const value = (a * (100 + r)) / 100
  if (rng.chance(0.5)) return keypad(KP_BASE, d, `books-${a}-${r}`, [T('base.booksQ', { a, r })], value, rng)
  return keypad(KP_BASE, d, `cars-${a}-${r}`, [T('base.carsQ', { a, r })], value, rng)
}
/** 练习十六 3：2400 个鸡蛋有 5% 没孵出来（顺着求，减少） */
export const EGGS: [number, number][] = [
  [2400, 5],
  [1000, 4],
  [500, 6],
  [2000, 3],
  [1200, 10],
]
function qEggs(d: Difficulty, rng: RNG): Question {
  const [n, p] = d === 1 && rng.chance(0.4) ? EGGS[0]! : rng.pick(EGGS)
  return keypad(KP_BASE, d, `eggs-${n}-${p}`, [T('base.eggsQ', { n, p })], (n * (100 - p)) / 100, rng)
}
function qBaseFormula(d: Difficulty, rng: RNG): Question {
  const [now, r] = rng.pick(BASE_POOL.slice(0, 6))
  return choice(KP_BASE, d, `formula-${now}-${r}`, [T('base.formulaQ', { now, r })], `${now} ÷ (1 + ${r}%)`, rng.shuffle([`${now} × (1 + ${r}%)`, `${now} × (1 − ${r}%)`, `${now} ÷ ${r}%`]), rng)
}
function qUnit1(d: Difficulty, rng: RNG): Question {
  const y1 = rng.pick([2020, 2021, 2022])
  const r = rng.pick([20, 25, 10])
  const y = (v: number): LStr => L('base.year', { y: v })
  return choice(KP_BASE, d, `unit1-${y1}-${r}`, [T('base.unitQ', { y1, y2: y1 + 1, r })], y(y1), rng.shuffle([y(y1 + 1), L('base.bothYears')]), rng)
}
function qCheck(d: Difficulty, rng: RNG): Question {
  const [now, r] = d === 1 && rng.chance(0.35) ? BASE_POOL[0]! : rng.pick(BASE_POOL)
  const a = before(now, r)
  return keypad(KP_BASE, d, `check-${a}-${r}`, [T('base.checkQ', { a, r })], now, rng)
}
function qRatio(d: Difficulty, rng: RNG): Question {
  const r = rng.pick([20, 25, 10, 12, 30, 5])
  return choice(KP_BASE, d, `ratio-${r}`, [T('base.ratioQ', { r })], `${100 + r}%`, [`${r}%`, `${100 - r}%`, '100%'], rng)
}
// ── 第 2 档 ──
function qRice(d: Difficulty, rng: RNG): Question {
  // 24.06 ÷ (1 + 7%) ≈ 22.49 → 22.5；错法：乘了 1.07（25.7）、乘 0.93（22.4）、直接减 7（17.1）
  return choice(KP_BASE, d, 'rice', [T('base.riceQ')], '22.5', ['25.7', '22.4', '17.1'], rng)
}
function qTv(d: Difficulty, rng: RNG): Question {
  // 2.07 ÷ (1 + 4.6%) ≈ 1.979 → 1.98；错法：乘 1.046（2.17）、乘 0.954（1.97）、去尾（1.97 重复，换 2.03）
  return choice(KP_BASE, d, 'tv', [T('base.tvQ')], '1.98', ['2.17', '1.97', '2.03'], rng)
}
/** 练习十八 1(2)：出油率约 42%，榨出 2100 千克油用了多少千克油菜籽（2100 ÷ 42%） */
export const OIL_BACK: [number, number][] = [
  [42, 2100],
  [40, 1000],
  [35, 700],
  [45, 900],
  [42, 840],
]
function qOilBack(d: Difficulty, rng: RNG): Question {
  const [p, n] = d === 2 && rng.chance(0.4) ? OIL_BACK[0]! : rng.pick(OIL_BACK)
  return keypad(KP_BASE, d, `oilback-${p}-${n}`, [T('base.oilQ', { p, n })], (n * 100) / p, rng)
}
function qBreakfastBack(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) return keypad(KP_BASE, d, 'bf-total', [T('base.bfCtx'), T('base.bfTotalQ')], 460, rng)
  return keypad(KP_BASE, d, 'bf-not', [T('base.bfCtx'), T('base.bfNotQ')], 23, rng)
}
/** 降价后求原价（复习与关联里有：降价 20% 后 100 元） */
export const SHIRTS: [number, number][] = [
  [20, 100],
  [10, 90],
  [25, 150],
  [20, 240],
]
function qShirt(d: Difficulty, rng: RNG): Question {
  const [r, now] = rng.pick(SHIRTS)
  return keypad(KP_BASE, d, `shirt-${r}-${now}`, [T('base.shirtQ', { r, now })], (now * 100) / (100 - r), rng)
}
function qLetter(d: Difficulty, rng: RNG): Question {
  const [now, r] = rng.pick(BASE_POOL.slice(0, 6))
  const y1 = rng.pick([2020, 2021, 2022])
  return choice(
    KP_BASE,
    d,
    `letter-${now}-${r}-${y1}`,
    [T('base.profitCtx', { y1, y2: y1 + 1, now, r }), T('base.letterQ', { y1 })],
    `a × (1 + ${r}%) = ${now}`,
    rng.shuffle([`a × ${r}% = ${now}`, `a ÷ (1 + ${r}%) = ${now}`, `${now} × (1 + ${r}%) = a`]),
    rng,
  )
}
function qTong(d: Difficulty, rng: RNG): Question {
  return choice(KP_BASE, d, 'tong', [T('base.tongMeanQ')], L('base.t.sameTime'), rng.shuffle([L('base.t.lastMonth'), L('base.t.plan'), L('base.t.nextYear')]), rng)
}
// ── 第 3 档 ──
/** 连续增长两年倒推：今年比去年增长 r1%，去年比前年增长 r2% */
export const TWO_YEARS: [number, number, number][] = [
  [10, 10, 121],
  [20, 20, 144],
  [10, 20, 132],
  [25, 20, 150],
]
function qTwoYears(d: Difficulty, rng: RNG): Question {
  const [r1, r2, now] = rng.pick(TWO_YEARS)
  return keypad(KP_BASE, d, `twoyears-${r1}-${r2}`, [T('base.twoQ', { r1, r2, now })], (now * 10000) / ((100 + r1) * (100 + r2)), rng)
}

function genBase(d: Difficulty, rng: RNG): Question {
  const r = rng.next()
  if (d === 1) {
    if (r < 0.22) return qProfit(d, rng)
    if (r < 0.34) return qGdp(d, rng)
    if (r < 0.5) return qForward(d, rng)
    if (r < 0.6) return qEggs(d, rng)
    if (r < 0.7) return qBaseFormula(d, rng)
    if (r < 0.78) return qUnit1(d, rng)
    if (r < 0.88) return qCheck(d, rng)
    return qRatio(d, rng)
  }
  if (d === 2) {
    if (r < 0.12) return qRice(d, rng)
    if (r < 0.24) return qTv(d, rng)
    if (r < 0.42) return qOilBack(d, rng)
    if (r < 0.56) return qBreakfastBack(d, rng)
    if (r < 0.72) return qShirt(d, rng)
    if (r < 0.88) return qLetter(d, rng)
    return qTong(d, rng)
  }
  if (r < 0.6) return qTwoYears(d, rng)
  return qLetter(d, rng)
}
defineGenerator(KP_BASE, genBase)

// ═════════════════════════════════════════════════════════════
// 6. 价格的连续变化（平台章节「价格连续变化带来的价格变化幅度」）：应用例 5、做一做、练习十七 1–7
// ═════════════════════════════════════════════════════════════

/** 一次变化：up 涨价 p%、down 降价 p%、off 打几折（z 是百分之几：80 = 八折） */
export type Step = { k: 'up' | 'down'; p: number } | { k: 'off'; z: number }
/** 变化后是原来的百分之几（乘 100 的整数） */
export const factorOf = (s: Step): number => (s.k === 'off' ? s.z : s.k === 'up' ? 100 + s.p : 100 - s.p)
const stepText = (s: Step): LStr => (s.k === 'off' ? L('chain.s.off', { z: L(`chain.z.${s.z}`) }) : L(`chain.s.${s.k}`, { p: s.p }))
const stepSig = (s: Step): string => (s.k === 'off' ? `z${s.z}` : `${s.k === 'up' ? '+' : '-'}${s.p}`)
/** 两次变化：第一组是课本例 5（打八折再涨价 20%），第二组是做一做（加价 20% 再降价 20%） */
export const CHAINS: [Step, Step][] = [
  [{ k: 'off', z: 80 }, { k: 'up', p: 20 }],
  [{ k: 'up', p: 20 }, { k: 'down', p: 20 }],
  [{ k: 'off', z: 90 }, { k: 'up', p: 10 }],
  [{ k: 'up', p: 25 }, { k: 'off', z: 80 }],
  [{ k: 'up', p: 10 }, { k: 'down', p: 10 }],
  [{ k: 'down', p: 20 }, { k: 'up', p: 30 }],
  [{ k: 'off', z: 75 }, { k: 'up', p: 40 }],
  [{ k: 'down', p: 10 }, { k: 'up', p: 10 }],
  [{ k: 'off', z: 80 }, { k: 'up', p: 25 }],
]
/** 变化后的价格是原价的万分之几（两次相乘） */
const after2 = ([s1, s2]: [Step, Step]): number => factorOf(s1) * factorOf(s2)
function chainCtx(ci: number): StemPart {
  if (ci === 0) return T('chain.book')
  if (ci === 1) return T('chain.product')
  const [s1, s2] = CHAINS[ci]!
  return T('chain.generic', { s1: stepText(s1), s2: stepText(s2) })
}
function pickChain(d: Difficulty, rng: RNG): number {
  return d === 1 && rng.chance(0.45) ? rng.int(0, 1) : rng.int(0, CHAINS.length - 1)
}
/** 变化幅度（百分之几的文字）和方向 */
function amplitude(f10000: number): { dir: 'cheaper' | 'dearer' | 'same'; p: string } {
  const diff = f10000 - 10000
  return { dir: diff === 0 ? 'same' : diff < 0 ? 'cheaper' : 'dearer', p: `${fix(Math.abs(diff), 2)}%` }
}
function qChainDir(d: Difficulty, rng: RNG): Question {
  const ci = pickChain(d, rng)
  const { dir } = amplitude(after2(CHAINS[ci]!))
  const all = [L('chain.dearer'), L('chain.cheaper'), L('chain.same')]
  const correct = dir === 'dearer' ? all[0]! : dir === 'cheaper' ? all[1]! : all[2]!
  return labelQuestion({ kpId: KP_CHAIN, type: 'percent', difficulty: d, sig: `dir-${ci}`, stem: [chainCtx(ci), T('chain.dirQ')], correct, distractors: all.filter((l) => labelKey(l) !== labelKey(correct)), rng })
}
function qChainBoth(d: Difficulty, rng: RNG): Question {
  let ci = pickChain(d, rng)
  if (amplitude(after2(CHAINS[ci]!)).dir === 'same') ci = 0
  const [s1, s2] = CHAINS[ci]!
  const f = after2(CHAINS[ci]!)
  const { dir, p } = amplitude(f)
  const k = dir as 'cheaper' | 'dearer'
  const res = (key: 'cheaper' | 'dearer', v: string): LStr => L(`chain.r.${key}`, { p: v })
  // 错法：方向反了、以为正好抵消、两次的百分数直接加减、答成「现在是原来的百分之几」
  const naive = Math.abs(factorOf(s1) - 100 + (factorOf(s2) - 100))
  const cands: LStr[] = [res(k === 'cheaper' ? 'dearer' : 'cheaper', p), L('chain.same'), ...(naive ? [res(k, `${naive}%`)] : []), res(k, `${fix(f, 2)}%`)]
  return choice(KP_CHAIN, d, `both-${ci}`, [chainCtx(ci), T('chain.bothQ')], res(k, p), cands, rng)
}
function qAssume(d: Difficulty, rng: RNG): Question {
  const ci = pickChain(d, rng)
  const [s1, s2] = CHAINS[ci]!
  if (rng.chance(0.5)) return keypad(KP_CHAIN, d, `first-${stepSig(s1)}`, [T('chain.firstQ', { s1: stepText(s1) })], factorOf(s1), rng)
  return keypad(KP_CHAIN, d, `assume-${ci}`, [chainCtx(ci), T('chain.assumeQ')], after2([s1, s2]) / 100, rng)
}
function qChainJudge(d: Difficulty, rng: RNG): Question {
  const p = rng.pick([10, 20, 25, 50])
  return judge(KP_CHAIN, d, `judge-${p}`, [T('chain.judgeQ', { p })], false, rng)
}
/** 练习十七 1：鸡蛋价格先涨 10% 再回落 15%（跌了 6.5%）；别的数 */
export const EGG_PRICES: [number, number][] = [
  [10, 15],
  [20, 10],
  [10, 20],
  [5, 10],
]
function qEggPrice(d: Difficulty, rng: RNG): Question {
  const [a, b] = d === 1 && rng.chance(0.4) ? EGG_PRICES[0]! : rng.pick(EGG_PRICES)
  const f = (100 + a) * (100 - b)
  const { dir, p } = amplitude(f)
  const res = (k: 'up' | 'down', v: string): LStr => L(`chain.r.${k}`, { p: v })
  const k = dir === 'dearer' ? 'up' : 'down'
  const naive = Math.abs(a - b)
  return choice(KP_CHAIN, d, `egg-${a}-${b}`, [T('chain.eggQ', { a, b })], res(k, p), [res(k === 'up' ? 'down' : 'up', p), res(a > b ? 'up' : 'down', `${naive}%`), res(k, `${a + b}%`), res(k, `${fix(f, 2)}%`)], rng)
}
/** 练习十七 2：连续两次降价 5%（一共降价 9.75%） */
export const VEG = [5, 10, 20]
function qVeg(d: Difficulty, rng: RNG): Question {
  const p = d === 1 && rng.chance(0.4) ? 5 : rng.pick(VEG)
  const f = (100 - p) * (100 - p)
  return choice(KP_CHAIN, d, `veg-${p}`, [T('chain.vegQ', { p })], `${fix(10000 - f, 2)}%`, [`${2 * p}%`, `${fix(f, 2)}%`, `${p}%`], rng)
}
/** 练习十七 3：电脑原价 3600 元，连降两次 10%（现价 2916 元） */
export const PCS: [number, number, number][] = [
  [3600, 10, 10],
  [1000, 10, 10],
  [2000, 20, 10],
  [500, 20, 20],
  [800, 10, 20],
  [2500, 20, 20],
  [5000, 10, 10],
]
function qPc(d: Difficulty, rng: RNG): Question {
  const [a, p1, p2] = d === 1 && rng.chance(0.35) ? PCS[0]! : rng.pick(PCS)
  return keypad(KP_CHAIN, d, `pc-${a}-${p1}-${p2}`, [T('chain.pcQ', { a, p1, p2 })], (a * (100 - p1) * (100 - p2)) / 10000, rng)
}
/** 练习十七 5：剪去整根的 40%，再剪去余下的 40%（剩 36%） */
export const ROPES = [40, 20, 50, 30, 10]
function qRope(d: Difficulty, rng: RNG): Question {
  const p = d === 1 && rng.chance(0.4) ? 40 : rng.pick(ROPES)
  const left = (100 - p) * (100 - p)
  return choice(KP_CHAIN, d, `rope-${p}`, [T('chain.ropeQ', { p })], `${fix(left, 2)}%`, [`${100 - 2 * p}%`, `${fix(p * p, 2)}%`, `${100 - p}%`], rng)
}
// ── 第 2 档 ──
function qPhone(d: Difficulty, rng: RNG): Question {
  // 0.92 × 0.95 = 0.874，相当于降价 12.6%
  return choice(KP_CHAIN, d, 'phone', [T('chain.phoneQ')], '12.6%', ['13%', '3%', '87.4%'], rng)
}
/** 练习十七 6：甲先减 80 元再打八折，乙先打八折再减 80 元（乙便宜 16 元）；给一个原价 */
export const LAPTOPS = [4000, 3000, 5000, 6000]
function qMall2(d: Difficulty, rng: RNG): Question {
  const a = rng.pick(LAPTOPS)
  const jia = ((a - 80) * 80) / 100
  const yi = (a * 80) / 100 - 80
  if (rng.chance(0.5)) {
    const all = [L('chain.jia'), L('chain.yi'), L('chain.sameCheap')]
    const correct = jia === yi ? all[2]! : jia < yi ? all[0]! : all[1]!
    return labelQuestion({ kpId: KP_CHAIN, type: 'percent', difficulty: d, sig: `mall-${a}`, stem: [T('chain.mallCtx', { a }), T('chain.mallWhich')], correct, distractors: all.filter((l) => labelKey(l) !== labelKey(correct)), rng })
  }
  return keypad(KP_CHAIN, d, `malldiff-${a}`, [T('chain.mallCtx', { a }), T('chain.mallDiff')], Math.abs(jia - yi), rng)
}
function qIncome(d: Difficulty, rng: RNG): Question {
  if (d === 3 || rng.chance(0.3)) return choice(KP_CHAIN, d, 'income-last', [T('chain.incomeCtx'), T('chain.incomeQ2'), KEEP1], '17.0%', ['16.0%', '4.0%', '117.0%'], rng)
  return choice(KP_CHAIN, d, 'income-this', [T('chain.incomeCtx'), T('chain.incomeQ1')], '110%', ['94%', '104%', '10%'], rng)
}
function qBase100(d: Difficulty, rng: RNG): Question {
  const ci = rng.int(2, CHAINS.length - 1)
  const [s1, s2] = CHAINS[ci]!
  return keypad(KP_CHAIN, d, `base100-${ci}`, [T('chain.base100Q', { s1: stepText(s1), s2: stepText(s2) })], after2([s1, s2]) / 100, rng)
}
// ── 第 3 档 ──
function qChainLetter(d: Difficulty, rng: RNG): Question {
  const y = (e: string): LStr => L('chain.aYuan', { e })
  return choice(KP_CHAIN, d, 'letter', [T('chain.letterQ')], y('0.96a'), [y('a'), y('1.2a'), y('0.8a')], rng)
}
function qThree(d: Difficulty, rng: RNG): Question {
  const s: [Step, Step, Step] = [
    { k: 'up', p: 10 },
    { k: 'up', p: 10 },
    { k: 'down', p: 20 },
  ]
  // 1.1 × 1.1 × 0.8 = 0.968，便宜了 3.2%；错法：方向反了、以为加加减减正好抵消、答成「现在是原来的 96.8%」
  return choice(
    KP_CHAIN,
    d,
    'three',
    [T('chain.threeQ', { s1: stepText(s[0]), s2: stepText(s[1]), s3: stepText(s[2]) })],
    L('chain.r.cheaper', { p: '3.2%' }),
    [L('chain.r.dearer', { p: '3.2%' }), L('chain.same'), L('chain.r.cheaper', { p: '96.8%' })],
    rng,
  )
}

function genChain(d: Difficulty, rng: RNG): Question {
  const r = rng.next()
  if (d === 1) {
    if (r < 0.14) return qChainDir(d, rng)
    if (r < 0.28) return qChainBoth(d, rng)
    if (r < 0.4) return qAssume(d, rng)
    if (r < 0.48) return qChainJudge(d, rng)
    if (r < 0.6) return qEggPrice(d, rng)
    if (r < 0.72) return qVeg(d, rng)
    if (r < 0.86) return qPc(d, rng)
    return qRope(d, rng)
  }
  if (d === 2) {
    if (r < 0.2) return qPhone(d, rng)
    if (r < 0.45) return qMall2(d, rng)
    if (r < 0.65) return qIncome(d, rng)
    if (r < 0.85) return qBase100(d, rng)
    return qChainBoth(d, rng)
  }
  if (r < 0.35) return qChainLetter(d, rng)
  if (r < 0.7) return qThree(d, rng)
  return qIncome(d, rng)
}
defineGenerator(KP_CHAIN, genChain)

// ═════════════════════════════════════════════════════════════
// 7. 确定达标线（p95–97）：100 名五年级学生 1 分钟跳绳（排序表），实践应用 五（1）班 40 人
// ═════════════════════════════════════════════════════════════

/** p96 的排序表（从多到少，名次 1–100）；p95 的原始表排序后和它逐个一致（测试查） */
export const SORTED100 = [
  182, 180, 174, 174, 163, 162, 160, 158, 156, 155, 155, 155, 154, 153, 153, 152, 152, 150, 150, 150,
  150, 150, 150, 145, 145, 143, 143, 141, 141, 140, 140, 137, 137, 137, 136, 136, 135, 135, 133, 133,
  133, 132, 130, 130, 130, 130, 130, 128, 127, 127, 126, 125, 123, 123, 122, 121, 121, 121, 121, 120,
  119, 119, 118, 118, 116, 116, 116, 115, 112, 112, 112, 111, 110, 110, 109, 109, 107, 106, 105, 103,
  103, 102, 101, 99, 99, 96, 96, 95, 95, 93, 90, 87, 87, 86, 85, 80, 80, 65, 61, 40,
]
/** p95 的原始表（序号 1–100） */
export const RAW100 = [
  154, 152, 141, 136, 130, 133, 132, 99, 40, 95, 103, 120, 133, 141, 140, 174, 160, 155, 103, 110,
  96, 87, 61, 85, 121, 130, 182, 80, 145, 135, 135, 122, 119, 112, 87, 65, 107, 128, 126, 116,
  155, 153, 150, 150, 180, 150, 143, 101, 116, 95, 80, 90, 86, 130, 130, 127, 163, 152, 150, 133,
  137, 140, 137, 150, 162, 156, 136, 119, 112, 112, 118, 137, 143, 155, 153, 150, 145, 121, 121, 123,
  125, 127, 121, 118, 116, 93, 115, 111, 110, 96, 106, 109, 109, 102, 99, 158, 105, 123, 130, 174,
]
/** 实践应用 五（1）班 40 人（序号 1–40） */
export const CLASS40 = [
  140, 134, 136, 128, 108, 117, 104, 90, 127, 162, 165, 129, 140, 131, 141, 121, 120, 100, 151, 105,
  114, 109, 144, 158, 148, 138, 103, 130, 69, 56, 150, 129, 130, 132, 142, 140, 59, 109, 153, 85,
]
/** 达到或超过 t 次的有几人 */
export const passCount = (list: number[], t: number): number => list.filter((v) => v >= t).length
/** 排序表的一截：名次 from 起 6 个（10 个时对战 / 打怪兽的窄栏放不下）；「100 名学生从多到少排好、这是其中一段」写成表题（不朗读），手机竖屏一屏放得下 */
function sliceTable(list: number[], from: number): StemPart {
  const ranks = Array.from({ length: 6 }, (_, i) => from + i)
  return { kind: 'stat-table', head: 'col', title: L('std.t.sorted'), rows: [[L('std.t.rank'), ...ranks], [L('std.t.count'), ...ranks.map((r) => list[r - 1]!)]] }
}
/** 课本「我希望有 60% 的同学能达标」：百分数 → 名次 → 截哪一段（名次 from 起 6 个，含这个名次、后面同分的和第一个不达标的） */
export const LINE_ASK: [number, number][] = [
  [60, 57],
  [50, 47],
  [75, 72],
  [80, 77],
  [85, 82],
  [90, 87],
  [70, 67],
]
function qNeed(d: Difficulty, rng: RNG): Question {
  const pool: [number, number][] = [
    [100, 60],
    [100, 75],
    [100, 85],
    [40, 85],
    [50, 80],
    [20, 75],
    [40, 75],
    [50, 90],
    [20, 90],
    [40, 80],
    [100, 90],
    [50, 70],
  ]
  const [n, p] = d === 1 && rng.chance(0.3) ? pool[0]! : rng.pick(pool)
  return keypad(KP_STANDARD, d, `need-${n}-${p}`, [T('std.needQ', { n, p })], (n * p) / 100, rng)
}
function qLine(d: Difficulty, rng: RNG): Question {
  const [p, from] = d === 1 && rng.chance(0.35) ? LINE_ASK[0]! : rng.pick(LINE_ASK)
  return keypad(KP_STANDARD, d, `line-${p}`, [sliceTable(SORTED100, from), T('std.lineQ', { p })], SORTED100[p - 1]!, rng)
}
function qCountPass(d: Difficulty, rng: RNG): Question {
  // 只问截段里看得出达标人数的：60 → 120 次 60 人、85 → 99 次 85 人、90 → 93 次 90 人、50 → 127 次 50 人
  const [p, from] = rng.pick(LINE_ASK.filter(([q]) => [60, 85, 90, 50].includes(q)))
  const t = SORTED100[p - 1]!
  return keypad(KP_STANDARD, d, `count-${t}`, [sliceTable(SORTED100, from), T('std.countQ', { t })], passCount(SORTED100, t), rng)
}
/** 编一个小组（n 人）的跳绳次数，从多到少排好（第 1 档互不相同） */
export function makeGroup(n: number, rng: RNG, distinct: boolean): number[] {
  const out: number[] = []
  while (out.length < n) {
    const v = rng.int(70, 175)
    if (distinct && out.includes(v)) continue
    out.push(v)
  }
  return out.sort((a, b) => b - a)
}
/** 小组的表：一行 8 个名次（10 个时对战 / 打怪兽的窄栏放不下）；「某小组 n 名同学、从多到少」写成表题（不朗读） */
function groupTable(list: number[]): StemPart {
  const rows: (number | LStr | null)[][] = []
  for (let i = 0; i < list.length; i += 8) {
    const ranks = list.slice(i, i + 8).map((_, k) => i + k + 1)
    rows.push([L('std.t.rank'), ...ranks], [L('std.t.count'), ...list.slice(i, i + 8)])
  }
  return { kind: 'stat-table', head: 'col', title: L('std.t.group', { n: list.length }), rows }
}
function qGroup(d: Difficulty, rng: RNG): Question {
  // 第 1 档 8 人（一个人是 12.5%），第 2、3 档 16 人（有同分的）
  const n = d === 1 ? 8 : 16
  const list = makeGroup(n, rng, d === 1)
  const stem0: StemPart[] = [groupTable(list)]
  const key = list.join('.')
  const r = rng.next()
  if (r < 0.35) {
    // 达标线取表里的一个数，或两个数中间
    const m = rng.int(3, n - 2)
    const t = rng.chance(0.6) || list[m - 1]! - list[m]! < 2 ? list[m - 1]! : list[m]! + 1
    return keypad(KP_STANDARD, d, `gcount-${key}-${t}`, [...stem0, T('std.groupCountQ', { t })], passCount(list, t), rng)
  }
  if (r < 0.7) {
    const m = rng.int(3, n - 2)
    const t = list[m - 1]!
    const c = passCount(list, t)
    const p = pctOf(c, n)
    return choice(KP_STANDARD, d, `grate-${key}-${t}`, [...stem0, T('std.groupRateQ', { t })], p.text, [pctOf(c - 1, n).text, pctOf(c + 1, n).text, pctOf(n - c, n).text, ...(n > c ? [pctOf(c, n - c).text] : [])], rng)
  }
  const p = rng.pick(n === 8 ? [50, 75, 87.5] : [50, 62.5, 75, 87.5])
  const m = (n * p) / 100
  return keypad(KP_STANDARD, d, `gmax-${key}-${p}`, [...stem0, T('std.groupMaxQ', { p })], list[m - 1]!, rng)
}
/** 实践应用 (1) 的简化：40 人里达到或超过 105 次的 32 人（80%）；别的数 */
export const CLASS_RATES: [number, number][] = [
  [40, 32],
  [40, 34],
  [50, 45],
  [40, 30],
  [45, 36],
]
function qClassRate(d: Difficulty, rng: RNG): Question {
  const [n, h] = d === 1 && rng.chance(0.35) ? CLASS_RATES[0]! : rng.pick(CLASS_RATES)
  const p = pctOf(h, n)
  return choice(KP_STANDARD, d, `classrate-${n}-${h}`, [T('std.classQ', { n, h })], p.text, [pctOf(n - h, n).text, pctOf(h, n - h).text, `${h}%`], rng)
}
function qSort(d: Difficulty, rng: RNG): Question {
  return choice(KP_STANDARD, d, 'sort', [T('std.sortQ')], L('std.o.sort'), rng.shuffle([L('std.o.best'), L('std.o.random'), L('std.o.sum')]), rng)
}
function qPrinciple(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) return judge(KP_STANDARD, d, 'most', [T('std.mostQ')], true, rng)
  return judge(KP_STANDARD, d, 'bestonly', [T('std.bestOnlyQ')], false, rng)
}
// ── 第 2 档 ──
/** 同分的陷阱：选名次 75 的 109 次作达标线，达标的其实有 76 人（70 → 71 人、80 → 81 人同理） */
export const TIES: [number, number][] = [
  [75, 72],
  [70, 67],
  [80, 77],
]
function qTie(d: Difficulty, rng: RNG): Question {
  const [p, from] = d === 2 && rng.chance(0.5) ? TIES[0]! : rng.pick(TIES)
  const t = SORTED100[p - 1]!
  const c = passCount(SORTED100, t)
  const stem: StemPart[] = [sliceTable(SORTED100, from)]
  if (rng.chance(0.5)) return judge(KP_STANDARD, d, `must-${p}`, [...stem, T('std.mustQ', { k: p, p })], c === p, rng)
  return choice(KP_STANDARD, d, `tie-${p}`, [...stem, T('std.rateQ', { k: p, t })], `${c}%`, [`${p}%`, `${p - 1}%`, `${c + 1}%`], rng)
}
/** 实践应用的 40 个数：只排数、不排序号（序号这几问用不到；带序号一共 8 行，手机竖屏一屏放不下） */
const class40Table = (): StemPart => ({ kind: 'stat-table', head: 'none', rows: [0, 10, 20, 30].map((i) => CLASS40.slice(i, i + 10)) })
function qClass40(d: Difficulty, rng: RNG): Question {
  const r = rng.next()
  if (r < 0.4) {
    const c = passCount(CLASS40, 105)
    return choice(KP_STANDARD, d, 'c40-rate', [T('std.c40Intro'), class40Table(), T('std.c40RateQ')], pctOf(c, 40).text, ['85%', '75%', '20%'], rng)
  }
  // 达标人数只要 40 × 85%，用不到表
  if (r < 0.7) return keypad(KP_STANDARD, d, 'c40-count85', [T('std.c85CountQ')], 34, rng)
  // 达标率 85%：34 人达标，从多到少第 34 名 103 次、第 35 名 100 次 → 101～103 次都行，选项只放 103
  const opt = (n: number): LStr => L('std.times', { n })
  return choice(KP_STANDARD, d, 'c40-line85', [T('std.c40Intro'), class40Table(), T('std.c85LineQ')], opt(103), [opt(100), opt(105), opt(109)], rng)
}
function qGender(d: Difficulty, rng: RNG): Question {
  return choice(KP_STANDARD, d, 'gender', [T('std.genderQ')], L('std.g.split'), rng.shuffle([L('std.g.boys'), L('std.g.mix'), L('std.g.girls')]), rng)
}
// ── 第 3 档 ──
export const GROUP_PAIRS: [number, number, number, number][] = [
  [20, 17, 25, 21],
  [40, 34, 50, 43],
  [20, 18, 30, 27],
]
function qCompareGroups(d: Difficulty, rng: RNG): Question {
  const [n1, h1, n2, h2] = rng.pick(GROUP_PAIRS)
  const a = h1 * n2
  const b = h2 * n1
  const all = [L('std.jia'), L('std.yi'), L('std.sameHigh')]
  const correct = a === b ? all[2]! : a > b ? all[0]! : all[1]!
  return labelQuestion({ kpId: KP_STANDARD, type: 'percent', difficulty: d, sig: `groups-${n1}-${h1}-${n2}-${h2}`, stem: [T('std.groupsQ', { n1, h1, n2, h2 })], correct, distractors: all.filter((l) => labelKey(l) !== labelKey(correct)), rng })
}

function genStandard(d: Difficulty, rng: RNG): Question {
  const r = rng.next()
  if (d === 1) {
    if (r < 0.14) return qNeed(d, rng)
    if (r < 0.3) return qLine(d, rng)
    if (r < 0.42) return qCountPass(d, rng)
    if (r < 0.7) return qGroup(d, rng)
    if (r < 0.8) return qClassRate(d, rng)
    if (r < 0.9) return qSort(d, rng)
    return qPrinciple(d, rng)
  }
  if (d === 2) {
    if (r < 0.3) return qTie(d, rng)
    if (r < 0.6) return qClass40(d, rng)
    if (r < 0.75) return qGender(d, rng)
    return qGroup(d, rng)
  }
  if (r < 0.5) return qCompareGroups(d, rng)
  return qGroup(d, rng)
}
defineGenerator(KP_STANDARD, genStandard)
