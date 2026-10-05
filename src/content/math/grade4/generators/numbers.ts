import type { Difficulty, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 四上「万以上数的认识」（课本 p1–23，四个小节 = 四个知识点）：
//   亿以内数的认识（p2–9）：计数单位、数位、数级（数位顺序表）、自然数；例 1–2 读两级的数、例 3 写数；练习一（数字表示的含义、
//     由几个万和几个一组成、由几个十万……组成的数、写成几个整万相加、计数器）。
//   亿以上数的认识（p10–14）：十亿 / 百亿 / 千亿、十进制计数法、完整的数位顺序表；例 4 读、例 5 写三级的数；练习二（最高位、
//     进率填空、由几个亿几个万几个一组成、读每组数、算盘、说法合不合理）；最大 / 最小的几位数（练习三 6）。
//   数的大小比较（p15）：例 6 农产品产量（位数不同 / 位数相同）、做一做；练习三 1、练习四 3 / 7（带「万」「亿」、□ 里填几）。
//   数的改写和求近似数（p16–20）：例 7 整万 / 整亿改写（准确，用「=」）、例 8「四舍五入」法省略万位 / 亿位后面的尾数（用「≈」）；
//     练习三（近似数与准确数、人口表、先写数再求近似数、行星距离）、练习四 2 / 6 / 7。
// 课本的规矩（需求 G13）：大数连写不分隔；读法先分级、每级末尾的 0 不读、中间连续的 0 只读一个零，「读作」写「二」不写「两」；
// 改写只出整万、整亿；近似数只省略万位或亿位后面的尾数；数到千亿位（12 位）。数字键盘的答案最多 9 位，更长的用选项卡。
// 朗读：数在大数卡（big-num）里不朗读——这一单元几乎每种题，把数读出来就等于把读法 / 组成 / 近似数说了；写作题的读法写在卡上，
// 朗读读它的数（say，按课本读法读）。
// ─────────────────────────────────────────────────────────────

const KP_WITHIN = 'm4s1-01-within-yi'
const KP_ABOVE = 'm4s1-01-above-yi'
const KP_COMPARE = 'm4s1-01-compare'
const KP_ROUND = 'm4s1-01-round'

type P = Record<string, LStr | number>
const K = (k: string, p?: P): LStr => (p ? { k, p } : { k })
const T = (k: string, p?: P): StemPart => ({ kind: 'text', text: K(k, p) })
const WAN = 1e4
const YI = 1e8
const digitsOf = (n: number): number => String(n).length

/** 大数卡：数（连写）+ 可选的分级线 / 横线 / 右边的「= ?万」「○ 另一个数」 */
type BigOpts = Omit<Extract<StemPart, { kind: 'big-num' }>, 'kind' | 'n'>
const big = (n: number | string, o: BigOpts = {}): StemPart => ({ kind: 'big-num', n: String(n), ...o })

// ═════════════════════════════════════════════════════════════
// 读法（课本 p4 例 2 的框：先读万级再读个级；每级末尾的 0 都不读，其他数位上有一个 0 或连续几个 0 都只读一个零）
// ═════════════════════════════════════════════════════════════

const CN_DIGITS = '零一二三四五六七八九'
const IN_LEVEL = ['', '十', '百', '千']
const LEVEL_UNIT = ['', '万', '亿']

/**
 * 读 0 的方式：rule 照课本；下面三种是常见的错法（读法题的干扰项）——
 * none 一个零也不读（一千三万四十）、double 连续几个 0 读成「零零」（一千零零三万零零四十）、
 * trail 把每级末尾的 0 也读了（六百四十万零七千）
 */
export type ZeroMode = 'rule' | 'none' | 'double' | 'trail'

/** 一个数的汉字读法（0 到千亿级）：「二」不写「两」，打头的十几读「十几」（十万二千三百四十五），中间的读「一十」 */
export function cnRead(n: number, mode: ZeroMode = 'rule'): string {
  if (n === 0) return '零'
  const s = String(n)
  const len = s.length
  let out = ''
  let run = 0 // 上一个非 0 数字之后连着几个 0（读到下一个非 0 数字时决定读不读「零」）
  for (let i = 0; i < len; i++) {
    const p = len - 1 - i // 第几位：0 = 个位
    const d = Number(s[i])
    const inLevel = p % 4
    const level = Math.floor(p / 4)
    if (d === 0) run++
    else {
      if (run > 0 && out && mode !== 'none') out += mode === 'double' && run >= 2 ? '零零' : '零'
      run = 0
      out += inLevel === 1 && d === 1 && out === '' ? '十' : CN_DIGITS[d]! + IN_LEVEL[inLevel]
    }
    // 一级读完：这一级有数就加「万」「亿」；每级末尾的 0 不读（trail 的错法把它留到下一级前面读成「零」）
    if (inLevel === 0 && level > 0 && /[1-9]/.test(s.slice(Math.max(0, i - 3), i + 1))) {
      out += LEVEL_UNIT[level]
      if (mode !== 'trail') run = 0
    }
  }
  return out
}

const CHAR_KEY: Record<string, string> = {
  零: 'm4.num.w.0',
  一: 'm4.num.w.1',
  二: 'm4.num.w.2',
  三: 'm4.num.w.3',
  四: 'm4.num.w.4',
  五: 'm4.num.w.5',
  六: 'm4.num.w.6',
  七: 'm4.num.w.7',
  八: 'm4.num.w.8',
  九: 'm4.num.w.9',
  十: 'm4.num.w.10',
  百: 'm4.num.w.100',
  千: 'm4.num.w.1000',
  万: 'm4.num.w.wan',
  亿: 'm4.num.w.yi',
}
/** 读法最长几个字（九千九百九十九亿九千九百九十九万九千九百九十九是 23 个字，错法多读几个零也够） */
export const MAX_READ_LEN = 40

/**
 * 汉字读法 → 嵌套词条：每个字一条，各带拼音（同二年级 numword.ts 的做法）。
 * 「一」的变调：在千、百前面标 yì，在万、亿前面标 yí（十一万的「一」不变），其余标 yī。英文界面也显示汉字（考的是汉字读法）。
 */
export function cnWords(chars: string): LStr {
  const list = Array.from(chars)
  const p: Record<string, LStr> = {}
  list.forEach((ch, i) => {
    let key = CHAR_KEY[ch]
    if (!key) throw new Error(`读法里有不认识的字：${chars}`)
    if (ch === '一') {
      const next = list[i + 1]
      if (next === '千' || next === '百') key = 'm4.num.w.1a'
      else if ((next === '万' || next === '亿') && list[i - 1] !== '十') key = 'm4.num.w.1b'
    }
    p[`c${i}`] = { k: key }
  })
  return { k: `m4.num.seq.${list.length}`, p }
}

/** 把数里 0 和相邻的非 0 数字对调（0 写错了位置），最高位不能是 0 */
export function zeroSwaps(n: number): number[] {
  const s = String(n).split('')
  const out: number[] = []
  for (let i = 0; i + 1 < s.length; i++) {
    if ((s[i] === '0') === (s[i + 1] === '0')) continue
    const t = [...s]
    ;[t[i], t[i + 1]] = [t[i + 1]!, t[i]!]
    if (t[0] !== '0') out.push(Number(t.join('')))
  }
  return out
}

/** 相邻两位对调（数字读错了位置，没有 0 的数用），最高位不能是 0 */
function digitSwaps(n: number): number[] {
  const s = String(n).split('')
  const out: number[] = []
  for (let i = 0; i + 1 < s.length; i++) {
    if (s[i] === s[i + 1]) continue
    const t = [...s]
    ;[t[i], t[i + 1]] = [t[i + 1]!, t[i]!]
    if (t[0] !== '0') out.push(Number(t.join('')))
  }
  return out
}

/** 每一级去掉前面的 0 直接连着写（写数的常见错法：七千零三亿零二十万写成 7003200000） */
export function unpadded(n: number): number {
  const groups: number[] = []
  for (let x = n; x > 0; x = Math.floor(x / WAN)) groups.push(x % WAN)
  return Number(
    groups
      .reverse()
      .map((g, i) => (i === 0 || g === 0 ? String(g).padStart(i === 0 ? 1 : 4, '0') : String(g)))
      .join(''),
  )
}

/**
 * 读法的干扰项（三个）：少读零、多读零、每级末尾的 0 读了、整万 / 整亿的数漏了「万」「亿」（2496 和 24960000，课本 p4 例 1 放在一起读），
 * 不够再用位数数错（×10、÷10）、0 写错了位置、数字对调的数的读法
 */
export function readWrongs(n: number, rng: RNG): string[] {
  const correct = cnRead(n)
  const first: string[] = []
  if (n >= YI && n % YI === 0) first.push(cnRead(n / YI))
  else if (n >= WAN && n % WAN === 0) first.push(cnRead(n / WAN))
  first.push(...(['none', 'double', 'trail'] as const).map((m) => cnRead(n, m)))
  const others: number[] = []
  if (n % 10 === 0) others.push(n / 10)
  if (n * 10 < 1e12) others.push(n * 10)
  others.push(...zeroSwaps(n), ...digitSwaps(n))
  const out: string[] = []
  const push = (s: string): void => {
    if (s !== correct && !out.includes(s) && out.length < 3) out.push(s)
  }
  for (const s of rng.shuffle(first)) push(s)
  for (const m of rng.shuffle(others)) push(cnRead(m))
  return out
}

/** 写数的干扰项（数）：每级前面的 0 漏写、少写 / 多写一个 0、0 写错了位置、数字对调 */
export function writeWrongs(n: number, rng: RNG): number[] {
  const cands = [unpadded(n), ...(n % 10 === 0 ? [n / 10] : []), n * 10, ...rng.shuffle(zeroSwaps(n)), ...rng.shuffle(digitSwaps(n))]
  const out: number[] = []
  for (const c of cands) if (c !== n && c > 0 && !out.includes(c) && out.length < 3) out.push(c)
  return out
}

/** 给正确的选项配朗读：读法、「一万」这种汉字选项答错时读它的数（按课本读法拆读，不用一条条合成读法） */
function sayCorrect(q: Question, say: string): Question {
  if (q.answer.kind !== 'choice') return q
  const id = q.answer.choiceId
  q.choices = q.choices!.map((c) => (c.id === id ? { ...c, say } : c))
  return q
}

/**
 * 数的答案：不到 1e9 的用数字键盘（6 位以内的有时用选项；numpadOnly = 只用键盘），更长的一律选项（干扰项给数）。
 * 7 位以上的数放进两列的选项卡在手机上放不下一行，能用键盘的就用键盘
 */
function numQ(kpId: string, d: Difficulty, sig: string, stem: StemPart[], value: number, rng: RNG, wrongs: number[], numpadOnly = false): Question {
  const smart = [...new Set(wrongs.filter((w) => Number.isInteger(w) && w >= 0 && w !== value))]
  if (value < 1e9) {
    const keypad = numpadOnly || value >= 1e6
    return numberQuestion({ kpId, type: 'big-number', difficulty: d, sig, stem, value, rng, min: 0, max: 1e12, smart, ...(keypad ? { input: 'numpad' as const } : {}) })
  }
  return labelQuestion({ kpId, type: 'big-number', difficulty: d, sig, stem, correct: String(value), distractors: smart.slice(0, 3).map(String), rng })
}

// ═════════════════════════════════════════════════════════════
// 课本里的数
// ═════════════════════════════════════════════════════════════

/** 亿以内的读数（例 1、例 2、做一做 1–3、练习一 3 / 6、p1 人口） */
const READ_WITHIN = [
  24960000, 3080000, 40500000, 54621, 6407000, 10030040, 340000, 3400000, 30040000, 30400000, 569200, 3706000, 40080501, 32680, 5205000,
  1200605, 107070, 470050, 3070800, 30600900, 1053600, 563004, 45000600, 5320190, 96000000, 13909000, 860100, 13090034, 21893095, 99365519,
]
/** 亿以内的写数（例 3、做一做、练习一 4 / 5） */
const WRITE_WITHIN = [230184, 102345, 3026000, 20400700, 3267500, 40090, 90200300, 1000000, 299800, 28000, 48320000, 28587, 7035000, 142950, 60123, 37000040, 42000000, 40075700, 125000, 60090500]
/** 亿以上的读数（例 4、做一做、练习二 4 / 6、p10 全国总人口） */
const READ_ABOVE = [
  8000000000, 10040002000, 400305000000, 9200000000, 26705000000, 508040003000, 300700400, 19336275, 456146658, 6500000000, 407500000000,
  350000000000, 914250000, 920710000, 932670000, 943500000, 1443497378,
]
/** 亿以上的写数（例 5、做一做、练习二 5） */
const WRITE_ABOVE = [300000000, 3090001500, 700300200000, 3000000000, 10700000000, 2500000000, 49000600000, 500407001306, 240000000, 84093000000, 506200000, 60450003200, 3080070000, 206000090040]

/** 一个 len 位数：最高位 1–9，其余每一位以 pZero 的概率是 0（课本的读写数都在 0 上做文章） */
function randNum(rng: RNG, len: number, pZero: number): number {
  let s = String(rng.int(1, 9))
  for (let i = 1; i < len; i++) s += rng.chance(pZero) ? '0' : String(rng.int(1, 9))
  return Number(s)
}

/** 亿以内（5–8 位）的数：整万的（例 1：只有万级）和两级都有的（例 2），档位越高 0 越多 */
function withinNum(rng: RNG, d: Difficulty): number {
  const len = d === 3 ? 8 : rng.pick(d === 1 ? [5, 6, 6, 7, 7, 8, 8] : [6, 7, 8, 8])
  if (rng.chance(d === 1 ? 0.35 : 0.25)) return randNum(rng, len - 4, d === 1 ? 0.3 : 0.45) * WAN
  let n = randNum(rng, len, d === 1 ? 0.35 : 0.5)
  if (n % WAN === 0) n += rng.int(1, 9) * 10 ** rng.int(0, 3)
  return n
}

/** 亿以上（9–12 位）的数：整亿的、亿级和万级的（个级是 0）、三级都有的 */
function aboveNum(rng: RNG, d: Difficulty): number {
  const len = d === 1 ? rng.int(9, 12) : d === 2 ? rng.int(10, 12) : rng.int(11, 12)
  const r = rng.next()
  if (d === 1 && r < 0.3) return randNum(rng, len - 8, 0.3) * YI
  if (r < 0.6) {
    const n = randNum(rng, len - 4, d === 1 ? 0.4 : 0.5) * WAN
    return n % YI === 0 ? n + rng.int(1, 9) * 10 ** rng.int(4, 7) : n
  }
  return randNum(rng, len, d === 1 ? 0.4 : 0.55)
}

// ═════════════════════════════════════════════════════════════
// 读、写
// ═════════════════════════════════════════════════════════════

/** 读数：这个数读作什么（数写在大数卡上不朗读——读出来就是答案）；split = 画好分级线（做一做 1、亿以上做一做 1） */
function readQ(kpId: string, d: Difficulty, n: number, rng: RNG, split = false): Question {
  const q = labelQuestion({
    kpId,
    type: 'big-number',
    difficulty: d,
    sig: `read-${n}`,
    stem: [T('m4.num.readAs'), big(n, split ? { split } : {})],
    correct: cnWords(cnRead(n)),
    distractors: readWrongs(n, rng).map(cnWords),
    rng,
  })
  return sayCorrect(q, String(n))
}

/** 写数：卡上写课本的读法（注音），写作多少（不到 9 位用键盘为主，亿以上的用选项） */
function writeQ(kpId: string, d: Difficulty, n: number, rng: RNG): Question {
  const stem: StemPart[] = [T('m4.num.writeAs'), { kind: 'big-num', words: cnWords(cnRead(n)), say: String(n) }]
  return numQ(kpId, d, `write-${n}`, stem, n, rng, writeWrongs(n, rng), n < 1e9 && rng.chance(0.65))
}

/** 课本里带情境的写数（例 3 永乐大钟、做一做 2、练习一 4、例 4 的全球人口、练习三 4）：一句话里写着读法，问这个数写作多少 */
const WRITE_CTX: { key: string; n: number; above: boolean }[] = [
  { key: 'bell', n: 230184, above: false },
  { key: 'light', n: 299800, above: false },
  { key: 'dragonfly', n: 28000, above: false },
  { key: 'heart', n: 42000000, above: false },
  { key: 'equator', n: 40075700, above: false },
  { key: 'whale', n: 125000, above: false },
  { key: 'world', n: 8000000000, above: true },
  { key: 'grain', n: 706498900, above: true },
  { key: 'tour', n: 5615000000, above: true },
]
function writeCtxQ(kpId: string, d: Difficulty, rng: RNG, above: boolean): Question {
  const c = rng.pick(WRITE_CTX.filter((x) => x.above === above))
  return numQ(kpId, d, `wctx-${c.key}`, [T(`m4.num.ctx.${c.key}`)], c.n, rng, writeWrongs(c.n, rng), c.n < 1e9 && rng.chance(0.7))
}

// ═════════════════════════════════════════════════════════════
// 计数单位、数位、数级、十进制计数法
// ═════════════════════════════════════════════════════════════

/** 计数单位「一万、十万……一千亿」（10 的 p 次方）的词条；数位名、计数单位名 */
const pow = (p: number): LStr => K(`m4.num.pow.${p}`)
const placeName = (p: number): LStr => K(`m4.num.place.${p}`)
const unitName = (p: number): LStr => K(`m4.num.unit.${p}`)
/** 「8个十」：n 个计数单位（1 个的英文单独一条：1 ten-thousand） */
export const countOf = (n: number, p: number): LStr => K(n === 1 ? 'm4.num.cnt1' : 'm4.num.cnt', { n, u: unitName(p) })

/** 计数器上的珠子：从 top 位到个位，每档颗数 = 这一位上的数字 */
function beadsOf(n: number, top: number): number[] {
  return String(n).padStart(top + 1, '0').split('').map(Number)
}

/**
 * 10 个一万是多少（课本 p2 / p10「一万一万地数，10 个一万是十万……10 个一百亿是一千亿」）：选项是计数单位的汉字（朗读读数）；
 * 一半配计数器的图（这一档上 10 颗珠子：9 颗加上刚拨上去的 1 颗）；反过来问「十万里面有几个一万」用键盘
 */
function tenOfQ(kpId: string, d: Difficulty, p: number, rng: RNG, top: number): Question {
  if (rng.chance(0.3)) {
    return numQ(kpId, d, `in-${p}`, [T('m4.num.howManyIn', { a: pow(p + 1), b: pow(p) })], 10, rng, [100, 1, 1000], true)
  }
  const stem: StemPart[] = [T('m4.num.tenOf', { a: pow(p) })]
  const pic = rng.chance(0.5)
  if (pic) stem.push({ kind: 'counter', top, beads: Array.from({ length: top + 1 }, (_, i) => (top - i === p ? 10 : 0)) })
  const wrongs = [p + 2, p - 1, p + 3, p - 2, p].filter((x) => x >= 3 && x <= 11 && x !== p + 1)
  const q = labelQuestion({ kpId, type: 'big-number', difficulty: d, sig: `ten-${p}${pic ? '-pic' : ''}`, stem, correct: pow(p + 1), distractors: wrongs.slice(0, 3).map(pow), rng })
  return sayCorrect(q, String(10 ** (p + 1)))
}

/** 练习二 2 的进率填空：10 个千万是 1 个（亿）、1 个十亿是（10）个亿、1 个千亿是 10 个（百亿）、10 个百万是（100）个十万 */
function rateQ(kpId: string, d: Difficulty, rng: RNG, lo: number): Question {
  const kind = rng.int(0, 3)
  const p = rng.int(lo, 10)
  if (kind === 0) {
    // 10 个 X 是 1 个什么
    const wrongs = [p + 2, p - 1, p].filter((x) => x >= 0 && x <= 11 && x !== p + 1)
    return labelQuestion({ kpId, type: 'big-number', difficulty: d, sig: `rate-ten1-${p}`, stem: [T('m4.num.tenIsOne', { a: unitName(p) })], correct: unitName(p + 1), distractors: wrongs.map(unitName), rng })
  }
  if (kind === 1) {
    // 1 个 X 是 10 个什么
    const q = p + 1
    const wrongs = [q - 2, q + 1, q].filter((x) => x >= 0 && x <= 11 && x !== q - 1)
    return labelQuestion({ kpId, type: 'big-number', difficulty: d, sig: `rate-one10-${q}`, stem: [T('m4.num.oneIsTen', { a: unitName(q) })], correct: unitName(q - 1), distractors: wrongs.map(unitName), rng })
  }
  if (kind === 2) {
    // 1 个 X 是几个（低一级的）
    return numQ(kpId, d, `rate-one-${p}`, [T('m4.num.oneIsHowMany', { a: unitName(p + 1), b: unitName(p) })], 10, rng, [100, 1, 1000], true)
  }
  // 10 个 X 是几个（低一级的）：跨两级，是 100
  const q = Math.max(p, 2)
  return numQ(kpId, d, `rate-ten-${q}`, [T('m4.num.tenIsHowMany', { a: unitName(q), b: unitName(q - 1) })], 100, rng, [10, 1000, 1], true)
}

/** 从个位起第几位是 X 位（做一做 2(2)：第几位是万位、亿位） */
function placeOrderQ(kpId: string, d: Difficulty, p: number, rng: RNG): Question {
  return numQ(kpId, d, `order-${p}`, [T('m4.num.placeOrder', { p: placeName(p) })], p + 1, rng, [p, p + 2, p - 1], true)
}

/** X 位的左面 / 右面一位是什么数位（做一做 2(3)） */
function neighborQ(kpId: string, d: Difficulty, p: number, rng: RNG, top: number): Question {
  const left = p === 0 ? true : p === top ? false : rng.chance(0.5)
  const ans = left ? p + 1 : p - 1
  const wrongs = [left ? p - 1 : p + 1, ans + (left ? 1 : -1), p, ans + (left ? -2 : 2), ans + (left ? 2 : -2)].filter((x) => x >= 0 && x <= top && x !== ans)
  const uniq = [...new Set(wrongs)].slice(0, 3)
  return labelQuestion({ kpId, type: 'big-number', difficulty: d, sig: `nb-${p}-${left ? 'l' : 'r'}`, stem: [T(left ? 'm4.num.leftOf' : 'm4.num.rightOf', { p: placeName(p) })], correct: placeName(ans), distractors: uniq.map(placeName), rng })
}

/** X 位在哪一级（数级：从右边起每四个数位是一级） */
function levelOfQ(kpId: string, d: Difficulty, p: number, rng: RNG): Question {
  const lv = Math.floor(p / 4)
  return labelQuestion({
    kpId,
    type: 'big-number',
    difficulty: d,
    sig: `lv-${p}`,
    stem: [T('m4.num.levelOf', { p: placeName(p) })],
    correct: K(`m4.num.level.${lv}`),
    distractors: [0, 1, 2].filter((x) => x !== lv).map((x) => K(`m4.num.level.${x}`)),
    rng,
  })
}

/** 数位顺序表（p3 做一做 2、p10）：打问号的那一格是什么数位 */
function tableQ(kpId: string, d: Difficulty, top: number, p: number, rng: RNG): Question {
  const wrongs = [p + 1, p - 1, p + 4, p - 4, p + 2, p - 2].filter((x) => x >= 0 && x <= top && x !== p)
  return labelQuestion({ kpId, type: 'big-number', difficulty: d, sig: `table-${top}-${p}`, stem: [T('m4.num.tableAsk'), { kind: 'place-table', top, ask: p }], correct: placeName(p), distractors: rng.shuffle(wrongs).slice(0, 3).map(placeName), rng })
}

/** 一个 k 位数的最高位是什么位（练习二 1） */
function highestQ(kpId: string, d: Difficulty, k: number, rng: RNG, maxPlace: number): Question {
  const ans = k - 1
  const wrongs = [ans - 1, ans + 1, ans - 4, ans + 4, ans - 2].filter((x) => x >= 0 && x <= maxPlace && x !== ans)
  return labelQuestion({ kpId, type: 'big-number', difficulty: d, sig: `high-${k}`, stem: [T('m4.num.highest', { k: K(`m4.num.len.${k}`) })], correct: placeName(ans), distractors: rng.shuffle(wrongs).slice(0, 3).map(placeName), rng })
}

/** 练习四 1(1)：这个数是几位数、最高位是什么位、某一位上是几（数在卡上）；maxPlace：选项里最高到什么位（亿以内到亿位） */
function placeFactsQ(kpId: string, d: Difficulty, n: number, rng: RNG, maxPlace: number): Question {
  const len = digitsOf(n)
  const kind = rng.int(0, 2)
  if (kind === 0) return numQ(kpId, d, `len-${n}`, [T('m4.num.digitsOf'), big(n)], len, rng, [len - 1, len + 1, len + 4], true)
  if (kind === 1) {
    const wrongs = [len - 2, len, len - 5, len + 3, len - 3].filter((x) => x >= 0 && x <= maxPlace && x !== len - 1)
    return labelQuestion({ kpId, type: 'big-number', difficulty: d, sig: `highof-${n}`, stem: [T('m4.num.highestOf'), big(n)], correct: placeName(len - 1), distractors: wrongs.slice(0, 3).map(placeName), rng })
  }
  const p = rng.int(0, len - 2)
  const digit = Math.floor(n / 10 ** p) % 10
  const others = [p + 1, p - 1, p + 2].filter((x) => x >= 0 && x < len).map((x) => Math.floor(n / 10 ** x) % 10)
  return numQ(kpId, d, `at-${n}-${p}`, [T('m4.num.digitAt', { p: placeName(p) }), big(n)], digit, rng, others, true)
}

/** 画横线的数字表示什么（p2「8 表示 8 个十万」、练习一 1）：选项是「8个十」「8个百」……；maxPlace：选项里最高到什么位 */
function meaningQ(kpId: string, d: Difficulty, n: number, rng: RNG, split: boolean, maxPlace: number): Question {
  const s = String(n)
  const cands = s
    .split('')
    .map((c, i) => ({ c: Number(c), p: s.length - 1 - i, i }))
    .filter((x) => x.c > 0)
  const at = rng.pick(cands)
  const wrongs = [at.p + 1, at.p - 1, at.p + 2, at.p - 2, at.p + 4, at.p - 4].filter((x) => x >= 0 && x <= maxPlace)
  return labelQuestion({
    kpId,
    type: 'big-number',
    difficulty: d,
    sig: `mean-${n}-${at.i}`,
    stem: [T('m4.num.digitMeans'), big(n, { split, marks: [at.i] })],
    correct: countOf(at.c, at.p),
    distractors: rng.shuffle(wrongs.slice(0, 4)).slice(0, 3).map((x) => countOf(at.c, x)),
    rng,
  })
}

// ═════════════════════════════════════════════════════════════
// 数的组成
// ═════════════════════════════════════════════════════════════

/**
 * 由几个亿、几个万和几个一组成（练习一 2「表示 4 个万，7578 个一」、练习二 3）：数在卡上（可能画好分级线），问其中一份；
 * 是 0 的那一级不说（3560000 由 356 个万组成、6154000000 由 61 个亿和 5400 个万组成）
 */
function composeQ(kpId: string, d: Difficulty, n: number, rng: RNG, split: boolean): Question {
  const parts = [Math.floor(n / YI), Math.floor(n / WAN) % WAN, n % WAN] // 亿、万、一
  const has = parts.map((x) => x > 0)
  const names = ['Yi', 'Wan', 'One']
  const key = names.filter((_, i) => has[i]).join('')
  const idx = [0, 1, 2].filter((i) => has[i])
  const ask = rng.pick(idx)
  const letter = 'abc'[idx.indexOf(ask)]!
  const params: P = {}
  idx.forEach((i, k) => {
    if (i !== ask) params['abc'[k]!] = parts[i]!
  })
  const value = parts[ask]!
  // 常见错误：多取 / 少取一位（46273580 的万取成 46273、462；个级取成 580、73580）、取成另一份
  const s = String(n)
  const others = parts.filter((x, i) => i !== ask && x > 0)
  const upto = ask === 0 ? s.length - 8 : s.length - 4
  const wrongs =
    ask === 2 ? [n % 1000, n % 100000, ...others, value * 10] : [Number(s.slice(0, upto + 1)), Number(s.slice(0, Math.max(1, upto - 1))), ...others, value * 10]
  return numQ(kpId, d, `comp-${n}-${ask}`, [T(`m4.num.comp.${key}.${letter}`, params), big(n, split ? { split } : {})], value, rng, wrongs)
}

/** 由 4 个百万、8 个十万……组成的数是多少（练习一 5(2)、练习四 1(2)） */
function madeQ(kpId: string, d: Difficulty, rng: RNG, lo: number, hi: number, count: number): Question {
  const places = rng.shuffle(Array.from({ length: hi - lo + 1 }, (_, i) => lo + i)).slice(0, count).sort((a, b) => b - a)
  const ds = places.map(() => rng.int(1, 9))
  const value = places.reduce((s, p, i) => s + ds[i]! * 10 ** p, 0)
  const params: P = {}
  places.forEach((p, i) => (params['abcd'[i]!] = countOf(ds[i]!, p)))
  // 常见错误：把几个数字直接连在一起写（漏了 0 占位）、少写 / 多写一个 0
  const glued = Number(ds.join(''))
  return numQ(kpId, d, `made-${places.join('.')}-${ds.join('')}`, [T(`m4.num.made${count}`, params)], value, rng, [glued, value / 10, value * 10, ...zeroSwaps(value)], digitsOf(value) <= 9 && rng.chance(0.7))
}

/** 写成几个整万、整千……相加：4000000 + 600000 + 70000 + 8000 + 2 = ?（练习一 5(3)）、440000 = 400000 + ?（练习一 8、练习四 1(4)） */
function sumQ(kpId: string, d: Difficulty, rng: RNG, lo: number, hi: number): Question {
  const n = randNum(rng, rng.int(lo, hi), 0.45)
  const s = String(n)
  const terms = s
    .split('')
    .map((c, i) => Number(c) * 10 ** (s.length - 1 - i))
    .filter((x) => x > 0)
  if (terms.length < 2) return sumQ(kpId, d, rng, lo, hi)
  if (rng.chance(0.5)) {
    const expr = `${terms.join(' + ')} = ?`
    return numQ(kpId, d, `sum-${n}`, [T('m4.num.askBox'), { kind: 'expr', expr }], n, rng, [Number(terms.map((t) => String(t)[0]).join('')), unpadded(n), n * 10, ...zeroSwaps(n)], n < 1e9)
  }
  const at = rng.int(1, terms.length - 1)
  const value = terms[at]!
  const expr = `${n} = ${terms.map((t, i) => (i === at ? '?' : String(t))).join(' + ')}`
  return numQ(kpId, d, `split-${n}-${at}`, [T('m4.num.askBox'), { kind: 'expr', expr }], value, rng, [value / 10, value * 10, Number(String(value)[0])], true)
}

/** 看计数器写数（练习一 8 的计数器）：亿以内 9 档、亿以上 12 档（p10） */
function counterQ(kpId: string, d: Difficulty, n: number, rng: RNG, top: number): Question {
  return numQ(kpId, d, `ctr-${top}-${n}`, [T('m4.num.counterRead'), { kind: 'counter', top, beads: beadsOf(n, top) }], n, rng, writeWrongs(n, rng), n < 1e9 && rng.chance(0.7))
}

/** 看算盘写数（练习二 7：602、534067、35215862、60470025000），13 档的算盘 */
const ABACUS = [602, 534067, 35215862, 60470025000]
function abacusQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const n = rng.chance(0.3) ? rng.pick(ABACUS) : randNum(rng, rng.int(d === 1 ? 3 : 6, d === 1 ? 9 : 12), 0.3)
  return numQ(kpId, d, `abacus-${n}`, [T('m4.num.abacusRead'), { kind: 'abacus', n: String(n) }], n, rng, writeWrongs(n, rng), n < 1e9 && rng.chance(0.7))
}

/** 一万一万地数（做一做 1）：从九十六万数到一百零三万、十万十万地数到一百万……跨过更高的计数单位；问下一个数 */
function countOnQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const p = rng.int(4, 7) // 一万、十万、一百万、一千万一个一个地数
  const step = 10 ** p
  // 课本：96 万数到 103 万、70 万到 100 万、600 万到 1000 万、8000 万到 1 亿——都跨过下一个计数单位
  const cross = p === 4 ? rng.pick([100, 1000]) * WAN : 10 ** (p + 1)
  const offset = d === 1 ? rng.int(-3, 0) : rng.int(-3, 1)
  const last = cross + offset * step
  const [a, b, c] = [last - 3 * step, last - 2 * step, last - step]
  if (a <= 0) return countOnQ(kpId, d, rng)
  return numQ(kpId, d, `count-${p}-${last}`, [T('m4.num.countOn', { s: pow(p), a, b, c })], last, rng, [last + step, c + step / 10, last * 10, unpadded(last) === last ? last - step : unpadded(last)], true)
}

/** 数线上的数（练习四 5：每小格 10000，跨过一千万）：一万一万地数的另一种问法，第 2 档 */
function lineQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const last = 10000000 + rng.int(-2, 3) * WAN
  const step = WAN
  const [a, b, c] = [last - 3 * step, last - 2 * step, last - step]
  return numQ(kpId, d, `line-${last}`, [T('m4.num.countOn', { s: pow(4), a, b, c })], last, rng, [last + step, last * 10, last - step], true)
}

// ═════════════════════════════════════════════════════════════
// 概念：自然数（p3）、计数单位 / 数位 / 数级（p2）、十进制计数法（p10）、说法合不合理（练习二 8）
// ═════════════════════════════════════════════════════════════

/** 自然数的说法对不对（p3 正文），以及「最小的自然数是几」 */
const NATURAL: [string, boolean][] = [
  ['zero', true],
  ['min1', false],
  ['min0', true],
  ['noMax', true],
  ['finite', false],
  ['infinite', true],
  ['int', true],
  ['count', true],
]
function naturalQ(kpId: string, d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.2)) return numQ(kpId, d, 'nat-min', [T('m4.num.natMin')], 0, rng, [1, 10, 9], true)
  const [id, ok] = rng.pick(NATURAL)
  return labelQuestion({ kpId, type: 'big-number', difficulty: d, sig: `nat-${id}`, stem: [T(`m4.num.nat.${id}`)], correct: K(ok ? 'm4.num.yes' : 'm4.num.no'), distractors: [K(ok ? 'm4.num.no' : 'm4.num.yes')], rng })
}

/** 术语：计数单位、数位、数级（p2）、十进制计数法（p10） */
const TERMS = ['unit', 'place', 'level', 'decimal'] as const
function termQ(kpId: string, d: Difficulty, rng: RNG, which: (typeof TERMS)[number]): Question {
  const pool = ['unit', 'place', 'level', 'decimal', 'natural', 'round']
  const wrongs = rng.shuffle(pool.filter((x) => x !== which)).slice(0, 3)
  return labelQuestion({ kpId, type: 'big-number', difficulty: d, sig: `term-${which}`, stem: [T(`m4.num.def.${which}`)], correct: K(`m4.num.term.${which}`), distractors: wrongs.map((x) => K(`m4.num.term.${x}`)), rng })
}

/** 十进制计数法：每相邻两个计数单位之间的进率都是几（p10） */
function radixQ(kpId: string, d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) return termQ(kpId, d, rng, 'decimal')
  return numQ(kpId, d, 'radix', [T('m4.num.radix')], 10, rng, [100, 1, 4], true)
}

/** 下面的说法合理吗（练习二 8）：前三句是课本的 */
const SENSE: [string, boolean][] = [
  ['school', false],
  ['icecream', false],
  ['library', true],
  ['class', true],
  ['china', true],
  ['beijing', true],
  ['book', false],
  ['pencil', false],
]
function senseQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const [id, ok] = rng.chance(0.5) ? rng.pick(SENSE.slice(0, 3)) : rng.pick(SENSE)
  return labelQuestion({ kpId, type: 'big-number', difficulty: d, sig: `sense-${id}`, stem: [T('m4.num.sense', { s: K(`m4.num.say.${id}`) })], correct: K(ok ? 'm4.num.yes' : 'm4.num.no'), distractors: [K(ok ? 'm4.num.no' : 'm4.num.yes')], rng })
}

/** 最大 / 最小的 k 位数（练习三 6：最大的九位数、最小的十位数） */
function maxMinQ(kpId: string, d: Difficulty, rng: RNG, lo: number, hi: number): Question {
  const k = rng.int(lo, hi)
  const max = rng.chance(0.5)
  const value = max ? 10 ** k - 1 : 10 ** (k - 1)
  const wrongs = max ? [10 ** k, 10 ** (k - 1) - 1, 10 ** (k - 1)] : [10 ** (k - 1) - 1, 10 ** k - 1, 10 ** k]
  return numQ(kpId, d, `${max ? 'max' : 'min'}-${k}`, [T(max ? 'm4.num.maxLen' : 'm4.num.minLen', { k: K(`m4.num.len.${k}`) })], value, rng, wrongs, value < 1e9 && rng.chance(0.6))
}

// ═════════════════════════════════════════════════════════════
// 亿以内数的认识
// ═════════════════════════════════════════════════════════════

type Maker = (d: Difficulty, rng: RNG) => Question
/** 按权重挑一种题 */
function pickBy(rng: RNG, table: [number, Maker][], d: Difficulty): Question {
  const total = table.reduce((s, [w]) => s + w, 0)
  let r = rng.next() * total
  for (const [w, make] of table) {
    if (r < w) return make(d, rng)
    r -= w
  }
  return table[table.length - 1]![1](d, rng)
}

const withinRead = (d: Difficulty, rng: RNG): number => (rng.chance(d === 1 ? 0.3 : 0.15) ? rng.pick(READ_WITHIN) : withinNum(rng, d))
const withinWrite = (d: Difficulty, rng: RNG): number => (rng.chance(d === 1 ? 0.3 : 0.15) ? rng.pick(WRITE_WITHIN) : withinNum(rng, d))

const WITHIN: Record<Difficulty, [number, Maker][]> = {
  // 第 1 档：引入的计数单位与计数器、做一做 1（数数）/ 2（数位顺序表），例 1、例 2（读）、例 3（写），自然数；练习一的含义、组成、计数器
  1: [
    [16, (d, rng) => readQ(KP_WITHIN, d, withinRead(d, rng), rng, rng.chance(0.3))],
    [11, (d, rng) => writeQ(KP_WITHIN, d, withinWrite(d, rng), rng)],
    [3, (d, rng) => writeCtxQ(KP_WITHIN, d, rng, false)],
    [7, (d, rng) => tenOfQ(KP_WITHIN, d, rng.int(4, 7), rng, 8)],
    [7, (d, rng) => countOnQ(KP_WITHIN, d, rng)],
    [5, (d, rng) => placeOrderQ(KP_WITHIN, d, rng.int(1, 8), rng)],
    [5, (d, rng) => neighborQ(KP_WITHIN, d, rng.int(0, 8), rng, 8)],
    [5, (d, rng) => tableQ(KP_WITHIN, d, 8, rng.int(0, 8), rng)],
    [3, (d, rng) => levelOfQ(KP_WITHIN, d, rng.int(0, 8), rng)],
    [8, (d, rng) => meaningQ(KP_WITHIN, d, withinNum(rng, d), rng, rng.chance(0.6), 8)],
    [7, (d, rng) => composeQ(KP_WITHIN, d, withinNum(rng, d), rng, rng.chance(0.5))],
    [3, (d, rng) => madeQ(KP_WITHIN, d, rng, 3, 7, rng.int(2, 4))],
    [3, (d, rng) => sumQ(KP_WITHIN, d, rng, 5, 8)],
    [7, (d, rng) => counterQ(KP_WITHIN, d, withinNum(rng, d), rng, 8)],
    [5, (d, rng) => naturalQ(KP_WITHIN, d, rng)],
    [3, (d, rng) => termQ(KP_WITHIN, d, rng, rng.pick(['unit', 'place', 'level'] as const))],
  ],
  // 第 2 档：0 更多的读写、组成、几位数 / 某一位上是几（练习四 1）、数线（练习四 5）
  2: [
    [22, (d, rng) => readQ(KP_WITHIN, d, withinRead(d, rng), rng, rng.chance(0.2))],
    [18, (d, rng) => writeQ(KP_WITHIN, d, withinWrite(d, rng), rng)],
    [10, (d, rng) => composeQ(KP_WITHIN, d, withinNum(rng, d), rng, false)],
    [10, (d, rng) => madeQ(KP_WITHIN, d, rng, 2, 7, rng.int(3, 4))],
    [8, (d, rng) => sumQ(KP_WITHIN, d, rng, 6, 8)],
    [12, (d, rng) => placeFactsQ(KP_WITHIN, d, withinNum(rng, d), rng, 8)],
    [8, (d, rng) => lineQ(KP_WITHIN, d, rng)],
    [6, (d, rng) => meaningQ(KP_WITHIN, d, withinNum(rng, d), rng, false, 8)],
    [6, (d, rng) => highestQ(KP_WITHIN, d, rng.int(5, 9), rng, 8)],
  ],
  3: [
    [30, (d, rng) => readQ(KP_WITHIN, d, withinNum(rng, d), rng)],
    [30, (d, rng) => writeQ(KP_WITHIN, d, withinNum(rng, d), rng)],
    [20, (d, rng) => madeQ(KP_WITHIN, d, rng, 0, 7, 4)],
    [20, (d, rng) => placeFactsQ(KP_WITHIN, d, withinNum(rng, d), rng, 8)],
  ],
}
defineGenerator(KP_WITHIN, (d, rng) => pickBy(rng, WITHIN[d], d))

// ═════════════════════════════════════════════════════════════
// 亿以上数的认识
// ═════════════════════════════════════════════════════════════

const aboveRead = (d: Difficulty, rng: RNG): number => (rng.chance(d === 1 ? 0.3 : 0.15) ? rng.pick(READ_ABOVE) : aboveNum(rng, d))
const aboveWrite = (d: Difficulty, rng: RNG): number => (rng.chance(d === 1 ? 0.3 : 0.15) ? rng.pick(WRITE_ABOVE) : aboveNum(rng, d))

const ABOVE: Record<Difficulty, [number, Maker][]> = {
  // 第 1 档：引入（十亿、百亿、千亿，计数器、数位顺序表、十进制计数法），例 4（读）、例 5（写）与做一做；练习二的最高位、进率、组成、算盘、合理不合理
  1: [
    [16, (d, rng) => readQ(KP_ABOVE, d, aboveRead(d, rng), rng, rng.chance(0.35))],
    [13, (d, rng) => writeQ(KP_ABOVE, d, aboveWrite(d, rng), rng)],
    [2, (d, rng) => writeCtxQ(KP_ABOVE, d, rng, true)],
    [8, (d, rng) => tenOfQ(KP_ABOVE, d, rng.int(8, 10), rng, 11)],
    [5, (d, rng) => radixQ(KP_ABOVE, d, rng)],
    [6, (d, rng) => tableQ(KP_ABOVE, d, 11, rng.chance(0.6) ? rng.int(9, 11) : rng.int(0, 8), rng)],
    [5, (d, rng) => placeOrderQ(KP_ABOVE, d, rng.int(8, 11), rng)],
    [9, (d, rng) => composeQ(KP_ABOVE, d, aboveNum(rng, d), rng, rng.chance(0.5))],
    [7, (d, rng) => highestQ(KP_ABOVE, d, rng.pick([5, 9, 10, 11, 12]), rng, 11)],
    [7, (d, rng) => rateQ(KP_ABOVE, d, rng, 4)],
    [7, (d, rng) => abacusQ(KP_ABOVE, d, rng)],
    [5, (d, rng) => counterQ(KP_ABOVE, d, aboveNum(rng, d), rng, 11)],
    [5, (d, rng) => senseQ(KP_ABOVE, d, rng)],
    [5, (d, rng) => maxMinQ(KP_ABOVE, d, rng, 8, 12)],
  ],
  2: [
    [22, (d, rng) => readQ(KP_ABOVE, d, aboveRead(d, rng), rng, rng.chance(0.2))],
    [22, (d, rng) => writeQ(KP_ABOVE, d, aboveWrite(d, rng), rng)],
    [5, (d, rng) => writeCtxQ(KP_ABOVE, d, rng, true)],
    [12, (d, rng) => composeQ(KP_ABOVE, d, aboveNum(rng, d), rng, false)],
    [10, (d, rng) => abacusQ(KP_ABOVE, d, rng)],
    [9, (d, rng) => maxMinQ(KP_ABOVE, d, rng, 5, 12)],
    [12, (d, rng) => placeFactsQ(KP_ABOVE, d, aboveNum(rng, d), rng, 11)],
    [8, (d, rng) => meaningQ(KP_ABOVE, d, aboveNum(rng, d), rng, rng.chance(0.4), 11)],
  ],
  3: [
    [30, (d, rng) => readQ(KP_ABOVE, d, aboveNum(rng, d), rng)],
    [30, (d, rng) => writeQ(KP_ABOVE, d, aboveNum(rng, d), rng)],
    [20, (d, rng) => madeQ(KP_ABOVE, d, rng, 3, 11, rng.int(3, 4))],
    [20, (d, rng) => sumQ(KP_ABOVE, d, rng, 9, 12)],
  ],
}
defineGenerator(KP_ABOVE, (d, rng) => pickBy(rng, ABOVE[d], d))

// ═════════════════════════════════════════════════════════════
// 数的大小比较（例 6、做一做、练习三 1、练习四 3 / 7）
// ═════════════════════════════════════════════════════════════

/** 课本里比大小的数（例 6 农产品产量、做一做、练习三 1） */
const CMP_PAIRS: [number, number][] = [
  [207534900, 20647800],
  [207534900, 294916900],
  [92504, 103600],
  [28906, 28890],
  [830207000, 1020010000],
  [100388770000, 99385270000],
  [208808, 99999],
  [26090800000, 26900800000],
  [30500000, 3050000],
  [7451030000, 54284000000],
]

/** 比一比，填 >、< 或 =（数在卡上，不朗读）；unit：右边的数写成「27万」「5亿」（练习四 3） */
function cmpQ(kpId: string, d: Difficulty, a: number, b: number, rng: RNG, unit?: 'wan' | 'yi'): Question {
  const bv = unit === 'wan' ? b * WAN : unit === 'yi' ? b * YI : b
  const correct = a > bv ? '>' : a < bv ? '<' : '='
  return labelQuestion({
    kpId,
    type: 'compare',
    difficulty: d,
    sig: `cmp-${a}-${b}${unit ? `-${unit}` : ''}`,
    stem: [T('m4.num.compare'), big(a, { rel: '○', rhs: String(b), ...(unit ? { unit } : {}) })],
    correct,
    distractors: ['>', '<', '='].filter((s) => s !== correct),
    rng,
  })
}

/** 位数不同的两个数（位数多的大）：一半让位数多的那个最高位反而小（100388770000 和 99385270000） */
function diffLenPair(rng: RNG, lo: number, hi: number): [number, number] {
  const la = rng.int(lo, hi - 1)
  const lb = la + rng.int(1, Math.min(2, hi - la))
  let a = randNum(rng, la, 0.3)
  let b = randNum(rng, lb, 0.3)
  if (rng.chance(0.5)) {
    // 长的那个以 1 开头、短的以 9 开头
    b = Number(`1${String(b).slice(1)}`)
    a = Number(`9${String(a).slice(1)}`)
  }
  return rng.chance(0.5) ? [a, b] : [b, a]
}

/** 位数相同的两个数：前面几位一样，从某一位起不一样；有时两个数的数字一样、只是换了位置（26090800000 和 26900800000） */
function sameLenPair(rng: RNG, lo: number, hi: number): [number, number] {
  const len = rng.int(lo, hi)
  const a = randNum(rng, len, 0.3)
  const s = String(a)
  if (rng.chance(0.3)) {
    const swaps = digitSwaps(a)
    if (swaps.length) return [a, rng.pick(swaps)]
  }
  const at = rng.int(rng.chance(0.6) ? 1 : 0, len - 1) // 从第几位起不一样
  let digit = Number(s[at])
  while (digit === Number(s[at]) || (at === 0 && digit === 0)) digit = rng.int(0, 9)
  const tail = Array.from({ length: len - at - 1 }, () => (rng.chance(0.3) ? 0 : rng.int(1, 9))).join('')
  return [a, Number(`${s.slice(0, at)}${digit}${tail}`)]
}

/** 例 6：2024 年全国主要农产品的产量（单位：t） */
const CROPS: [string, number][] = [
  ['rice', 207534900],
  ['wheat', 140099400],
  ['corn', 294916900],
  ['soy', 20647800],
]
function cropQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const most = rng.chance(0.5)
  const sorted = [...CROPS].sort((x, y) => y[1] - x[1])
  const ans = (most ? sorted[0] : sorted[sorted.length - 1])!
  const rows: (number | LStr)[][] = [[K('m4.num.head.crop'), K('m4.num.head.output')], ...rng.shuffle(CROPS).map(([id, v]) => [K(`m4.num.crop.${id}`), v])]
  return labelQuestion({
    kpId,
    type: 'compare',
    difficulty: d,
    sig: `crop-${most ? 'max' : 'min'}`,
    stem: [T(most ? 'm4.num.cropMax' : 'm4.num.cropMin'), { kind: 'stat-table', rows, head: 'row' }],
    correct: K(`m4.num.crop.${ans[0]}`),
    distractors: CROPS.filter((c) => c[0] !== ans[0]).map((c) => K(`m4.num.crop.${c[0]}`)),
    rng,
  })
}

/** 练习三 5：行星到太阳的平均距离（千米） */
export const PLANETS: [string, number][] = [
  ['mars', 227940000],
  ['uranus', 2870990000],
  ['earth', 149600000],
  ['venus', 108200000],
  ['mercury', 57910000],
  ['jupiter', 778330000],
  ['neptune', 4504000000],
  ['saturn', 1429400000],
]
function planetQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const pick = rng.shuffle(PLANETS).slice(0, 4)
  const near = rng.chance(0.5)
  const sorted = [...pick].sort((x, y) => x[1] - y[1])
  const ans = (near ? sorted[0] : sorted[sorted.length - 1])!
  const rows: (number | LStr)[][] = [[K('m4.num.head.planet'), K('m4.num.head.dist')], ...pick.map(([id, v]) => [K(`m4.num.planet.${id}`), v])]
  return labelQuestion({
    kpId,
    type: 'compare',
    difficulty: d,
    sig: `planet-${near ? 'near' : 'far'}-${pick.map((p) => p[0]).join('.')}`,
    stem: [T(near ? 'm4.num.planetNear' : 'm4.num.planetFar'), { kind: 'stat-table', rows, head: 'row' }],
    correct: K(`m4.num.planet.${ans[0]}`),
    distractors: pick.filter((p) => p[0] !== ans[0]).map((p) => K(`m4.num.planet.${p[0]}`)),
    rng,
  })
}

/** 几个数里哪个最大 / 最小（选项是数）：位数相同、数字相近的几个（五六位：选项卡两列放得下） */
function extremeQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const len = rng.int(5, 6)
  const base = randNum(rng, len, 0.3)
  const set = new Set<number>([base, ...digitSwaps(base).slice(0, 2), ...zeroSwaps(base).slice(0, 2)])
  if (set.size < 4) set.add(base + 10 ** rng.int(1, len - 2))
  const nums = rng.shuffle([...set]).slice(0, 4)
  const max = rng.chance(0.5)
  const ans = max ? Math.max(...nums) : Math.min(...nums)
  return labelQuestion({ kpId, type: 'compare', difficulty: d, sig: `ext-${max ? 'max' : 'min'}-${[...nums].sort().join('.')}`, stem: [T(max ? 'm4.num.maxOf' : 'm4.num.minOf')], correct: String(ans), distractors: nums.filter((x) => x !== ans).map(String), rng })
}

/** 带「万」「亿」的比大小（练习四 3：260800 ○ 27万、500000000 ○ 5亿、4000000 ○ 40万、297860000 ○ 3亿） */
function cmpUnitQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const yi = rng.chance(0.4)
  const U = yi ? YI : WAN
  const k = yi ? rng.int(1, 30) : rng.int(2, 999)
  const kind = rng.int(0, 3)
  let a: number
  if (kind === 0) a = k * U // 相等
  else if (kind === 1) a = k * U - rng.int(1, U / 10) * 10 // 差一点（260800 ○ 27万）
  else if (kind === 2) a = k * U * 10 // 多了一个 0（4000000 ○ 40万）
  else a = k * U + rng.int(1, U - 1)
  return cmpQ(kpId, d, a, k, rng, yi ? 'yi' : 'wan')
}

/** □ 里填几（练习四 7）：□ 在最高位，最小能填几（3562100000 < □103270000）；第 3 档 □ 在第二位、只有一个能填（2□00800000 > 2810800000） */
function boxCmpQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const len = rng.int(7, 11)
  if (d === 3 && rng.chance(0.5)) {
    // a = x 8 rest_a，b = x □ rest_b，rest_b < rest_a（第一位就小）：只有 9 能填
    const x = rng.int(1, 9)
    const restA = String(randNum(rng, len - 2, 0.3))
    const f = Number(restA[0])
    const tail = String(randNum(rng, len - 3, 0.4)).padStart(len - 3, '0')
    const restB = `${f > 1 ? rng.int(1, f - 1) : 0}${tail}`
    const a = Number(`${x}8${restA}`)
    const b = `${x}□${restB}`
    return numQ(kpId, d, `box1-${b}-${a}`, [T('m4.num.boxOnly'), big(b, { rel: '>', rhs: String(a) })], 9, rng, [8, 7, 0], true)
  }
  const a = randNum(rng, len, 0.3)
  const f = Number(String(a)[0])
  if (f === 9) return boxCmpQ(kpId, d, rng)
  const rest = String(randNum(rng, len - 1, 0.3)).padStart(len - 1, '0')
  const ans = Number(rest) > Number(String(a).slice(1)) ? f : f + 1
  const b = `□${rest}`
  return numQ(kpId, d, `box-${a}-${b}`, [T('m4.num.boxMin'), big(a, { rel: '<', rhs: b })], ans, rng, [ans === f ? f + 1 : f, ans + 1, 9], true)
}

const COMPARE: Record<Difficulty, [number, Maker][]> = {
  // 第 1 档：例 6（位数不同、位数相同，农产品产量）与做一做；练习三 1 的数
  1: [
    [30, (d, rng) => cmpQ(KP_COMPARE, d, ...diffLenPair(rng, 5, 12), rng)],
    [34, (d, rng) => cmpQ(KP_COMPARE, d, ...sameLenPair(rng, 5, 12), rng)],
    [20, (d, rng) => {
      const [a, b] = rng.pick(CMP_PAIRS)
      return rng.chance(0.5) ? cmpQ(KP_COMPARE, d, a, b, rng) : cmpQ(KP_COMPARE, d, b, a, rng)
    }],
    [8, (d, rng) => cropQ(KP_COMPARE, d, rng)],
    [8, (d, rng) => extremeQ(KP_COMPARE, d, rng)],
  ],
  // 第 2 档：带「万」「亿」的（练习四 3）、行星距离（练习三 5）、□ 里最小填几（练习四 7）
  2: [
    [25, (d, rng) => cmpQ(KP_COMPARE, d, ...sameLenPair(rng, 8, 12), rng)],
    [25, (d, rng) => cmpUnitQ(KP_COMPARE, d, rng)],
    [15, (d, rng) => planetQ(KP_COMPARE, d, rng)],
    [15, (d, rng) => boxCmpQ(KP_COMPARE, d, rng)],
    [20, (d, rng) => extremeQ(KP_COMPARE, d, rng)],
  ],
  3: [
    [40, (d, rng) => boxCmpQ(KP_COMPARE, d, rng)],
    [30, (d, rng) => cmpUnitQ(KP_COMPARE, d, rng)],
    [15, (d, rng) => planetQ(KP_COMPARE, d, rng)],
    [15, (d, rng) => cmpQ(KP_COMPARE, d, ...sameLenPair(rng, 10, 12), rng)],
  ],
}
defineGenerator(KP_COMPARE, (d, rng) => pickBy(rng, COMPARE[d], d))

// ═════════════════════════════════════════════════════════════
// 数的改写和求近似数（例 7、例 8、练习三、练习四 2 / 6 / 7）
// ═════════════════════════════════════════════════════════════

type Unit = 'wan' | 'yi'
const UNIT_VALUE: Record<Unit, number> = { wan: WAN, yi: YI }
/** 「四舍五入」：省略万位 / 亿位后面的尾数 */
export const roundTo = (n: number, unit: Unit): number => Math.round(n / UNIT_VALUE[unit])

/** 改写（例 7、做一做）：整万 / 整亿的数 = ?万 / ?亿（课本 25000000 = 2500万、30000 = 3万、530500000000 = 5305亿） */
function rewriteQ(kpId: string, d: Difficulty, unit: Unit, rng: RNG): Question {
  const k = unit === 'wan' ? (rng.chance(0.3) ? rng.int(1, 99) : randNum(rng, rng.int(3, 4), 0.35)) : rng.chance(0.4) ? rng.int(1, 99) : randNum(rng, rng.int(3, 4), 0.35)
  const n = k * UNIT_VALUE[unit]
  // 常见错误：去掉的 0 多了 / 少了一个（2500 万写成 250 万、25000 万）、用错了单位（亿写成万）
  const wrongs = [k * 10, ...(k % 10 === 0 ? [k / 10] : [k + 1]), unit === 'yi' ? k * WAN : Math.floor(k / 10) || k + 10]
  return numQ(kpId, d, `rw-${unit}-${n}`, [T(unit === 'wan' ? 'm4.num.toWan' : 'm4.num.toYi'), big(n, { split: rng.chance(0.5), rel: '=', rhs: '?', unit })], k, rng, wrongs, rng.chance(0.75))
}

/** 例 7 的情境：一小滴血液里的红细胞 25000000 个、白细胞 30000 个 */
function bloodQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const red = rng.chance(0.5)
  const n = red ? 25000000 : 30000
  const k = n / WAN
  return numQ(kpId, d, `blood-${red ? 'red' : 'white'}`, [T(red ? 'm4.num.bloodRed' : 'm4.num.bloodWhite'), big(n, { rel: '=', rhs: '?', unit: 'wan' })], k, rng, [k * 10, k / 10 >= 1 ? k / 10 : k + 1, n / 1000], true)
}

/**
 * 要求近似数的数：省略万位后面的尾数用 5–8 位数，省略亿位后面的尾数用 9–12 位数；不是整万 / 整亿（不然就不是近似数了）。
 * 尾数的最高位（千位 / 千万位）一半是 5 以上（入）；第 1 档有时正好是 5（课本做一做 25520、950228500）、有时入成新的一位（9.5 亿 ≈ 10 亿）
 */
function roundNum(rng: RNG, unit: Unit, d: Difficulty): number {
  const U = UNIT_VALUE[unit]
  const lenHead = unit === 'wan' ? rng.int(1, 4) : rng.int(1, d === 1 ? 3 : 4)
  let head = randNum(rng, lenHead, 0.3)
  const r = rng.next()
  let top: number
  if (r < 0.15) top = 5
  else if (r < 0.55) top = rng.int(0, 4)
  else top = rng.int(5, 9)
  if (rng.chance(d === 1 ? 0.1 : 0.2) && top >= 5) head = 10 ** lenHead - 1 // 9…9 入成 10…0
  const restLen = Math.log10(U) - 1
  let rest = randNum(rng, restLen, 0.35)
  if (rng.chance(0.3)) rest = Number(String(rest).replace(/\d/g, (c, i) => (i === 0 ? c : rng.chance(0.4) ? '0' : c)))
  const tail = top * 10 ** restLen + (rest % 10 ** restLen)
  return head * U + (tail === 0 ? 1 : tail)
}

/** 求近似数（例 8、做一做）：≈ ?万 / ?亿 */
function roundQ(kpId: string, d: Difficulty, unit: Unit, rng: RNG, n = roundNum(rng, unit, d)): Question {
  const U = UNIT_VALUE[unit]
  const ans = roundTo(n, unit)
  // 常见错误：该入没入 / 不该入入了、省略错了位（省略到千位 / 十万位）
  const wrongs = [Math.floor(n / U), Math.floor(n / U) + 1, Math.round(n / (U / 10)), Math.round(n / (U * 10)) || ans + 10]
  return numQ(kpId, d, `rd-${unit}-${n}`, [T(unit === 'wan' ? 'm4.num.roundWan' : 'm4.num.roundYi'), big(n, { rel: '≈', rhs: '?', unit })], ans, rng, wrongs, rng.chance(0.7))
}

/** 例 8 的第一步：182068 ≈ 180000（选项是整万的数；课本只在省略万位时写这一步，数用五六位的，选项卡两列放得下） */
function roundFullQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const U = WAN
  let n = roundNum(rng, 'wan', d)
  while (n >= 990000) n = roundNum(rng, 'wan', d)
  const value = roundTo(n, 'wan') * U
  const other = value === Math.floor(n / U) * U ? (Math.floor(n / U) + 1) * U : Math.floor(n / U) * U
  const wrongs = [other, Math.round(n / (U / 10)) * (U / 10), Math.round(n / (U * 10)) * U * 10].filter((x) => x > 0 && x !== value)
  return labelQuestion({ kpId, type: 'big-number', difficulty: d, sig: `rdf-${n}`, stem: [T('m4.num.roundFullWan'), big(n, { rel: '≈', rhs: '?' })], correct: String(value), distractors: [...new Set(wrongs)].slice(0, 3).map(String), rng })
}

/** 「舍」还是「入」：看省略的尾数部分的最高位（例 8 的蓝字） */
function sheRuQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const unit: Unit = rng.chance(0.6) ? 'wan' : 'yi'
  const n = roundNum(rng, unit, d)
  const top = Math.floor(n / (UNIT_VALUE[unit] / 10)) % 10
  const ru = top >= 5
  return labelQuestion({ kpId, type: 'big-number', difficulty: d, sig: `sr-${unit}-${n}`, stem: [T(unit === 'wan' ? 'm4.num.sheRuWan' : 'm4.num.sheRuYi'), big(n)], correct: K(ru ? 'm4.num.ru' : 'm4.num.she'), distractors: [K(ru ? 'm4.num.she' : 'm4.num.ru')], rng })
}

/** 省略万位 / 亿位后面的尾数，要看哪一位上的数（例 8：千位、千万位） */
function lookQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const yi = rng.chance(0.5)
  const ans = yi ? 7 : 3
  return labelQuestion({ kpId, type: 'big-number', difficulty: d, sig: `look-${yi ? 'yi' : 'wan'}`, stem: [T(yi ? 'm4.num.lookYi' : 'm4.num.lookWan')], correct: placeName(ans), distractors: [ans + 1, ans - 1, ans + 2].map(placeName), rng })
}

/** 填「=」还是「≈」（整理和复习：改写用「=」、求近似数用「≈」） */
function relQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const unit: Unit = rng.chance(0.65) ? 'wan' : 'yi'
  const exact = rng.chance(0.5)
  const n = exact ? randNum(rng, unit === 'wan' ? rng.int(1, 4) : rng.int(1, 3), 0.35) * UNIT_VALUE[unit] : roundNum(rng, unit, d)
  const k = roundTo(n, unit)
  const correct = exact ? '=' : '≈'
  return labelQuestion({ kpId, type: 'big-number', difficulty: d, sig: `rel-${n}`, stem: [T('m4.num.relAsk'), big(n, { rel: '?', rhs: String(k), unit })], correct, distractors: [exact ? '≈' : '='], rng })
}

/** 近似数还是准确数（练习三 2，课本的四句加几句同样的说法） */
const APPROX: [string, boolean][] = [
  ['height', true],
  ['weight', true],
  ['class', false],
  ['school', false],
  ['everest', true],
  ['volunteer', true],
  ['steps', true],
  ['phone', false],
  ['page', false],
]
function approxQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const [id, approx] = rng.pick(APPROX)
  return labelQuestion({ kpId, type: 'big-number', difficulty: d, sig: `ae-${id}`, stem: [T(`m4.num.ae.${id}`)], correct: K(approx ? 'm4.num.term.approx' : 'm4.num.term.exact'), distractors: [K(approx ? 'm4.num.term.exact' : 'm4.num.term.approx')], rng })
}

/** 第七次全国人口普查的人口（p1、练习三 3） */
export const POPULATION: [string, number][] = [
  ['beijing', 21893095],
  ['guangdong', 126012510],
  ['shandong', 101527453],
  ['henan', 99365519],
  ['jiangsu', 84748016],
  ['sichuan', 83674866],
  ['shanghai', 24870895],
  ['shanxi', 34915616],
  ['zhejiang', 64567588],
  ['hunan', 66444864],
  ['guangxi', 50126804],
  ['yunnan', 47209277],
]
function popQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const [id, n] = rng.pick(POPULATION)
  const ans = roundTo(n, 'wan')
  return numQ(kpId, d, `pop-${id}`, [T('m4.num.popRound', { r: K(`m4.num.region.${id}`) }), big(n, { rel: '≈', rhs: '?', unit: 'wan' })], ans, rng, [Math.floor(n / WAN), Math.floor(n / WAN) + 1, Math.round(n / 1000)], true)
}

/** 练习四 6：2017—2024 年纯电动汽车销量（辆），写出近似数（万辆） */
export const EV_SALES: [number, number][] = [
  [2017, 652000],
  [2018, 984000],
  [2019, 972000],
  [2020, 1115000],
  [2021, 2916000],
  [2022, 5365000],
  [2023, 6685000],
  [2024, 7719000],
]
function evQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const [y, n] = rng.pick(EV_SALES)
  const ans = roundTo(n, 'wan')
  return numQ(kpId, d, `ev-${y}`, [T('m4.num.evRound', { y }), big(n, { rel: '≈', rhs: '?', unit: 'wan' })], ans, rng, [Math.floor(n / WAN), Math.floor(n / WAN) + 1, Math.round(n / 1000)], true)
}

/** 练习三 5：行星到太阳的平均距离改写成用「万」作单位（这些数都是整万的） */
function planetWanQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const [id, n] = rng.pick(PLANETS)
  const k = n / WAN
  return numQ(kpId, d, `pw-${id}`, [T('m4.num.planetWan', { p: K(`m4.num.planet.${id}`) }), big(n, { rel: '=', rhs: '?', unit: 'wan' })], k, rng, [k * 10, Math.floor(k / 10), n / 1000], true)
}

/** 练习三 4：先写数，再省略万位或亿位后面的尾数求近似数（一句话里写着读法） */
const CTX_ROUND: { key: string; n: number; unit: Unit }[] = [
  { key: 'collection', n: 1862690, unit: 'wan' },
  { key: 'relics', n: 1683336, unit: 'wan' },
  { key: 'dive', n: 10909, unit: 'wan' },
  { key: 'grain', n: 706498900, unit: 'yi' },
  { key: 'tour', n: 5615000000, unit: 'yi' },
  { key: 'tourUp', n: 724000000, unit: 'yi' },
]
function ctxRoundQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const c = rng.pick(CTX_ROUND)
  const ans = roundTo(c.n, c.unit)
  const U = UNIT_VALUE[c.unit]
  return numQ(kpId, d, `rctx-${c.key}`, [T(`m4.num.rctx.${c.key}`)], ans, rng, [Math.floor(c.n / U), Math.floor(c.n / U) + 1, Math.round(c.n / (U / 10))], true)
}

/** 练习四 2：读法写在卡上（四百万五千九百），≈ ?万 / ?亿 */
function wordsRoundQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const unit: Unit = rng.chance(0.5) ? 'wan' : 'yi'
  const n = roundNum(rng, unit, d)
  const U = UNIT_VALUE[unit]
  const ans = roundTo(n, unit)
  return numQ(
    kpId,
    d,
    `rw2-${unit}-${n}`,
    [T(unit === 'wan' ? 'm4.num.roundWan' : 'm4.num.roundYi'), { kind: 'big-num', words: cnWords(cnRead(n)), say: String(n), rel: '≈', rhs: '?', unit }],
    ans,
    rng,
    [Math.floor(n / U), Math.floor(n / U) + 1, Math.round(n / (U / 10))],
    true,
  )
}

/** 练习四 7：9□8765000 ≈ 9亿（□ 最大填几）、68□000 ≈ 69万（□ 最小填几） */
function boxRoundQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const unit: Unit = rng.chance(0.5) ? 'wan' : 'yi'
  const U = UNIT_VALUE[unit]
  const restLen = Math.log10(U) - 1
  const head = randNum(rng, rng.int(1, 2), 0.2)
  const rest = String(randNum(rng, restLen, 0.3)).padStart(restLen, '0')
  const down = rng.chance(0.5) // 舍：≈ head，□ 最大填 4；入：≈ head + 1，□ 最小填 5
  const n = `${head}□${rest}`
  const k = down ? head : head + 1
  return numQ(kpId, d, `boxr-${n}-${down ? 'd' : 'u'}`, [T(down ? 'm4.num.boxMax' : 'm4.num.boxMin'), big(n, { rel: '≈', rhs: String(k), unit })], down ? 4 : 5, rng, down ? [5, 9, 3] : [4, 0, 6], true)
}

const ROUND: Record<Difficulty, [number, Maker][]> = {
  // 第 1 档：例 7（改写，=）与做一做、例 8（四舍五入，≈；舍还是入、看哪一位）与试一试、做一做；改写和近似数分清 = 与 ≈、近似数与准确数
  1: [
    [14, (d, rng) => rewriteQ(KP_ROUND, d, 'wan', rng)],
    [11, (d, rng) => rewriteQ(KP_ROUND, d, 'yi', rng)],
    [4, (d, rng) => bloodQ(KP_ROUND, d, rng)],
    [18, (d, rng) => roundQ(KP_ROUND, d, 'wan', rng)],
    [14, (d, rng) => roundQ(KP_ROUND, d, 'yi', rng)],
    [8, (d, rng) => roundFullQ(KP_ROUND, d, rng)],
    [8, (d, rng) => sheRuQ(KP_ROUND, d, rng)],
    [3, (d, rng) => lookQ(KP_ROUND, d, rng)],
    [10, (d, rng) => relQ(KP_ROUND, d, rng)],
    [10, (d, rng) => approxQ(KP_ROUND, d, rng)],
  ],
  // 第 2 档：练习三的人口表、先写数再求近似数、行星距离，练习四的读法求近似数、电动汽车销量、□ 里填几
  2: [
    [15, (d, rng) => popQ(KP_ROUND, d, rng)],
    [12, (d, rng) => ctxRoundQ(KP_ROUND, d, rng)],
    [12, (d, rng) => planetWanQ(KP_ROUND, d, rng)],
    [15, (d, rng) => wordsRoundQ(KP_ROUND, d, rng)],
    [12, (d, rng) => evQ(KP_ROUND, d, rng)],
    [12, (d, rng) => boxRoundQ(KP_ROUND, d, rng)],
    [11, (d, rng) => roundQ(KP_ROUND, d, rng.chance(0.5) ? 'wan' : 'yi', rng)],
    [11, (d, rng) => relQ(KP_ROUND, d, rng)],
  ],
  3: [
    [35, (d, rng) => boxRoundQ(KP_ROUND, d, rng)],
    [35, (d, rng) => wordsRoundQ(KP_ROUND, d, rng)],
    [30, (d, rng) => ctxRoundQ(KP_ROUND, d, rng)],
  ],
}
defineGenerator(KP_ROUND, (d, rng) => pickBy(rng, ROUND[d], d))
