// 四下「小数的意义和性质」的生成器（四年级数学下册 C）。
import type { Difficulty, FracPic, LStr, Question, QuestionType, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'
import { cnRead } from './numbers'

// ─────────────────────────────────────────────────────────────
// 四下第四单元「小数的意义和性质」（课本 p32–56，平台当前的旧版四下）：
//   1. 小数的意义和读写法——小数的意义（p32–33：例 1 米尺分成 10 / 100 / 1000 份，做一做看图写分数和小数；计数单位 0.1、0.01、0.001，
//      进率 10）、小数的读法和写法（p34–35：例 2 小数的数位顺序表、各数位表示几个什么，做一做「2.83 是由几个一……组成的」；
//      例 3 读作、例 4 写作）；练习九。
//   2. 小数的性质和大小比较——小数的性质（p38–39：例 1 0.1 m = 0.10 m = 0.100 m、例 2 0.3 = 0.30、例 3 化简、例 4 写成三位小数）、
//      小数的大小比较（p40：例 5 跳远排名次、先比整数部分再依次比十分位、百分位）；练习十。
//   3. 小数点移动引起小数大小的变化（p43–44：例 1 金箍棒 0.009 m → 9 m 的规律、例 2 乘 / 除以 10、100、1000）；练习十一。
//   4. 小数与单位换算（p46–47：例 1 低级单位改写成高级单位、复名数改写成小数，例 2 高级单位改写成低级单位）；练习十二。
//   5. 小数的近似数（p50–51：例 1 四舍五入保留整数 / 一位 / 两位小数（末尾的 0 不能去掉）、例 2 / 例 3 改写成用「万」「亿」作单位的数
//      再求近似数）；练习十三；整理和复习、练习十四。
// 一个小节一个知识点（第 1、2 大节各两个小节），共 7 个；改写成用「万」「亿」作单位的数并在「小数的近似数」里。
// 规矩（需求 G14）：小数的答案一律选项卡（数字键盘只出整数答案）；只考数值的题选项写成最简（末尾不带 0）、数值互不相等，
// 考写法的题（化简、写成三位小数、保留两位小数、用两位小数表示钱数）才拿末尾的 0 区别；干扰项照课本暴露的错法造。
// 读法照课本：小数部分依次读出每个数字，整数部分按整数读（340.09 读作三百四十点零九），「二」不写「两」。
// 小数都从课本的数和小的池子里取（每个不同的小数都是一条朗读音频）；读法题的数写在小数卡（dec-card）上，不朗读（读出来就是答案）。
// 分母是 1000、10000 的分数文字里画不成上下两层、也读不对，只放在小数卡上（看卡写小数），不进选项。
// 程序里的小数一律当字符串处理：移小数点、四舍五入都按字符算，比大小、换算按 0.0001 为单位的整数算，没有浮点误差。
// ─────────────────────────────────────────────────────────────

const KP_MEANING = 'm4s2-04-meaning'
const KP_RW = 'm4s2-04-read-write'
const KP_PROP = 'm4s2-04-property'
const KP_CMP = 'm4s2-04-compare'
const KP_SHIFT = 'm4s2-04-shift'
const KP_UNITS = 'm4s2-04-units'
const KP_ROUND = 'm4s2-04-round'

type P = Record<string, LStr | number>
const K = (k: string, p?: P): LStr => (p ? { k: `m4.dec.${k}`, p } : { k: `m4.dec.${k}` })
const T = (k: string, p?: P): StemPart => ({ kind: 'text', text: K(k, p) })
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
const uniq = <X>(xs: X[]): X[] => [...new Set(xs)]

// ═════════════════════════════════════════════════════════════
// 小数串的运算（只按字符算，不走浮点）
// ═════════════════════════════════════════════════════════════

/** 规范写法：整数部分去掉打头多余的 0，小数部分去掉末尾的 0（「0.70」→「0.7」、「12.000」→「12」、「00.09」→「0.09」） */
export function norm(s: string): string {
  const [ip, fp = ''] = s.split('.')
  const i = ip!.replace(/^0+(?=\d)/, '')
  const f = fp.replace(/0+$/, '')
  return f ? `${i}.${f}` : i
}
/** 照写的小数部分有几位（末尾的 0 也算） */
export const placesOf = (s: string): number => (s.split('.')[1] ?? '').length
/** 两个数相等（不管写法：0.3 与 0.30） */
export const same = (a: string, b: string): boolean => norm(a) === norm(b)

/** 移动小数点：k > 0 向右移 k 位（乘 10 的 k 次方），k < 0 向左；结果是规范写法（位数不够用 0 补足） */
export function shiftPoint(s: string, k: number): string {
  const [ip, fp = ''] = s.split('.')
  const digits = ip! + fp
  const point = ip!.length + k
  let out: string
  if (point <= 0) out = `0.${'0'.repeat(-point)}${digits}`
  else if (point >= digits.length) out = digits + '0'.repeat(point - digits.length)
  else out = `${digits.slice(0, point)}.${digits.slice(point)}`
  return norm(out)
}

/** 以 0.0001 为单位的整数（课本的小数最多四位）：比大小、换算用 */
export function u4(s: string): number {
  const [i, f = ''] = norm(s).split('.')
  if (f.length > 4) throw new Error(`小数位数超过四位：${s}`)
  return Number(i) * 1e4 + Number(f.padEnd(4, '0'))
}
/** 以 0.0001 为单位的整数 → 规范写法 */
export function fromU4(u: number): string {
  const i = Math.floor(u / 1e4)
  const f = String(u % 1e4).padStart(4, '0')
  return norm(`${i}.${f}`)
}
/** 写成 places 位小数（末尾补 0；places = 0 写成整数）；原来的位数多于 places 时不截 */
export function padTo(s: string, places: number): string {
  const [i, f = ''] = norm(s).split('.')
  if (!places) return f ? `${i}.${f}` : i!
  return `${i}.${f.padEnd(places, '0')}`
}

/**
 * 「四舍五入」法保留 places 位小数（places = 0 是保留整数）：看下一位，小于 5 舍去，大于或等于 5 向前一位进 1；
 * 结果照写 places 位（末尾的 0 不能去掉：0.984 ≈ 1.0）。up = false 是只舍不入（干扰项：该进没进）
 */
export function roundAt(s: string, places: number, up = true): string {
  const [ip, fp = ''] = s.split('.')
  const keep = fp.slice(0, places).padEnd(places, '0')
  let n = Number(ip! + keep)
  if (up && fp.length > places && Number(fp[places]) >= 5) n += 1
  const str = String(n).padStart(places + 1, '0')
  return places ? `${str.slice(0, -places)}.${str.slice(-places)}` : str
}

/** 近似数的「反方向」错法：该入的舍了、该舍的入了（照写 places 位：1.0 的反方向是 0.9，0.9 的反方向是 1.0） */
export function otherWay(s: string, places: number): string {
  const c = roundAt(s, places)
  const down = roundAt(s, places, false)
  if (down !== c) return down
  return padTo(fromU4(u4(c) + 10 ** (4 - places)), places)
}

/** k 个 1/per（per = 10、100、1000、10000）写成小数 */
const EXP: Record<number, number> = { 1: 0, 10: 1, 100: 2, 1000: 3, 10000: 4 }
export const over = (k: number | string, per: number): string => shiftPoint(String(k), -EXP[per]!)

// ═════════════════════════════════════════════════════════════
// 读法（课本 p35：读小数时，整数部分按整数读，小数部分依次读出每个数字）
// ═════════════════════════════════════════════════════════════

const CN = '零一二三四五六七八九'
const digitWords = (ds: string): string => [...ds].map((c) => CN[Number(c)]).join('')

/** 一个小数（或整数）的汉字读法：0.058 → 零点零五八、340.09 → 三百四十点零九、40075.7 → 四万零七十五点七 */
export function decRead(s: string): string {
  const [ip, fp] = s.split('.')
  const head = cnRead(Number(ip))
  return fp === undefined ? head : `${head}点${digitWords(fp)}`
}

const W_KEY: Record<string, string> = {
  零: '0',
  一: '1',
  二: '2',
  三: '3',
  四: '4',
  五: '5',
  六: '6',
  七: '7',
  八: '8',
  九: '9',
  十: '10',
  百: '100',
  千: '1000',
  万: 'wan',
  亿: 'yi',
  点: 'dot',
}
/** 读法最长几个字（m4.dec.seq.<n> 的个数） */
export const MAX_WORDS = 24

/**
 * 汉字读法 → 嵌套词条：一个字一条，各带拼音（同上册的 cnWords）；「一」在千、百前面标 yì，在万、亿前面标 yí（十一万的「一」不变），
 * 其余标 yī（零点一、十一点二）。英文界面也显示汉字（考的是汉字读法）
 */
export function decWords(chars: string): LStr {
  const list = Array.from(chars)
  if (list.length > MAX_WORDS) throw new Error(`读法太长：${chars}`)
  const p: Record<string, LStr> = {}
  list.forEach((ch, i) => {
    let key = W_KEY[ch]
    if (!key) throw new Error(`读法里有不认识的字：${chars}`)
    if (ch === '一') {
      const next = list[i + 1]
      if (next === '千' || next === '百') key = '1a'
      else if ((next === '万' || next === '亿') && list[i - 1] !== '十') key = '1b'
    }
    p[`c${i}`] = { k: `m4.dec.w.${key}` }
  })
  return { k: `m4.dec.seq.${list.length}`, p }
}

/**
 * 读法的干扰项（课本的两个气泡反过来就是常见错法）：小数部分当整数读（0.58 读成零点五十八）、小数部分的 0 没读（0.058 读成零点五八）、
 * 整数部分一位一位读（340.09 读成三四零点零九）；不够再用小数点挪了一位、多读一个零、小数部分两位对调的数的读法
 */
export function readWrongs(s: string, rng: RNG): string[] {
  const correct = decRead(s)
  const [ip, fp = ''] = s.split('.')
  const first: string[] = []
  if (fp.length >= 2 && /[1-9]/.test(fp)) first.push(`${cnRead(Number(ip))}点${cnRead(Number(fp))}`)
  if (fp.includes('0') && /[1-9]/.test(fp)) first.push(`${cnRead(Number(ip))}点${digitWords(fp.replace(/0/g, ''))}`)
  if (Number(ip) >= 10) first.push(`${digitWords(ip!)}点${digitWords(fp)}`)
  const others: string[] = [decRead(shiftPoint(s, 1)), decRead(shiftPoint(s, -1)), `${cnRead(Number(ip))}点零${digitWords(fp)}`]
  for (let i = 0; i + 1 < fp.length; i++) {
    if (fp[i] === fp[i + 1]) continue
    const t = [...fp]
    ;[t[i], t[i + 1]] = [t[i + 1]!, t[i]!]
    others.push(`${cnRead(Number(ip))}点${digitWords(t.join(''))}`)
  }
  const out: string[] = []
  for (const w of [...rng.shuffle(first), ...rng.shuffle(others)]) {
    if (w !== correct && !out.includes(w) && Array.from(w).length <= MAX_WORDS && out.length < 3) out.push(w)
  }
  return out
}

/**
 * 写数的干扰项（数）：小数部分的 0 漏写（零点二零六写成 0.26）、多写一个 0、整数部分的 0 写多了 / 写少了、
 * 小数点点错了一位、小数部分两位对调
 */
export function writeWrongs(s: string): string[] {
  const [ip, fp = ''] = s.split('.')
  const out: string[] = []
  if (fp.includes('0') && /[1-9]/.test(fp)) out.push(`${ip}.${fp.replace(/0/g, '')}`)
  out.push(`${ip}.0${fp}`)
  if (/0/.test(ip!) && ip!.length > 1) out.push(`${ip!.replace(/0/, '')}.${fp}`)
  if (ip !== '0') out.push(`${ip}0.${fp}`)
  out.push(shiftPoint(s, 1), shiftPoint(s, -1))
  for (let i = 0; i + 1 < fp.length; i++) {
    if (fp[i] === fp[i + 1]) continue
    const t = [...fp]
    ;[t[i], t[i + 1]] = [t[i + 1]!, t[i]!]
    out.push(`${ip}.${t.join('')}`)
  }
  return out
}

// ═════════════════════════════════════════════════════════════
// 出题骨架
// ═════════════════════════════════════════════════════════════

/** 合规的数：整数或最多四位的小数，整数部分不以 0 开头（除了 0 本身） */
const WELL = /^(0|[1-9]\d*)(\.\d{1,4})?$/

/**
 * 同样位数的近似数（干扰项里要有和答案位数一样的，别让答案从位数上认出来）：末位 ±1、末两位对调；整数答案 ±1、×10
 */
export function sameShape(c: string): string[] {
  const [ip, fp = ''] = c.split('.')
  const out: string[] = []
  if (!fp) {
    const n = Number(ip)
    out.push(String(n + 1), String(n * 10))
    if (n > 1) out.push(String(n - 1))
    return out
  }
  const head = fp.slice(0, -1)
  const last = Number(fp[fp.length - 1])
  for (const x of [last + 1, last - 1, last + 2, last - 2]) if (x >= 1 && x <= 9) out.push(`${ip}.${head}${x}`)
  if (fp.length >= 2 && fp[fp.length - 2] !== fp[fp.length - 1] && fp[fp.length - 2] !== '0') out.push(`${ip}.${fp.slice(0, -2)}${fp[fp.length - 1]}${fp[fp.length - 2]}`)
  return out
}

/**
 * 干扰项（三个）：form = 考写法（选项照写，字串互不相同，可以有一个和答案等值的写法：4.08 与 4.080），
 * 否则只考数值（每个选项写成最简，数值互不相等、不等于答案）。候选不合规（多于四位小数、0 打头）的跳过；
 * 不够三个用小数点挪一位、同样位数的近似数补；最后保证至少有一个和答案位数一样的
 */
export function pickWrongs(correct: string, cands: (string | null | undefined)[], form = false): string[] {
  const out: string[] = []
  let sameValue = 0
  const push = (raw: string | null | undefined): void => {
    if (!raw || out.length >= 3) return
    const c = form ? raw : norm(raw)
    if (!WELL.test(c)) return
    if (form ? c === correct : same(c, correct)) return
    if (form && same(c, correct)) {
      if (sameValue >= 1) return
    }
    if (out.some((o) => (form ? o === c : same(o, c)))) return
    if (form && same(c, correct)) sameValue++
    out.push(c)
  }
  for (const c of cands) push(c)
  // 补足：只考数值的先用小数点挪一位（常见错法），考写法的先用末位差 1 的（「0.3」配「0.2」「0.4」，别出「3.0」这种怪写法）
  const shifts = [shiftPoint(correct, 1), shiftPoint(correct, -1), shiftPoint(correct, 2)]
  for (const c of form ? [...sameShape(correct), ...shifts.map((x) => padTo(x, placesOf(correct)))] : [...shifts, ...sameShape(correct)]) push(c)
  // 至少一个干扰项的小数位数和答案一样
  const p = placesOf(correct)
  if (p > 0 && !out.some((o) => placesOf(o) === p)) {
    const alt = sameShape(correct).find((s) => WELL.test(s) && !same(s, correct) && !out.some((o) => same(o, s)))
    if (alt) out[out.length - 1] = alt
  }
  return out
}

/** 小数（或整数）答案的选择题 */
function decQ(kpId: string, d: Difficulty, sig: string, stem: StemPart[], correct: string, cands: (string | null | undefined)[], rng: RNG, o: { form?: boolean; type?: QuestionType } = {}): Question {
  const c = o.form ? correct : norm(correct)
  return labelQuestion({ kpId, type: o.type ?? 'decimal', difficulty: d, sig, stem, correct: c, distractors: pickWrongs(c, cands, o.form), rng })
}

/** 整数答案（数字键盘或选项） */
function intQ(kpId: string, d: Difficulty, sig: string, stem: StemPart[], value: number, rng: RNG, smart: number[], max = 999999, o: { type?: QuestionType; numpad?: boolean } = {}): Question {
  return numberQuestion({
    kpId,
    type: o.type ?? 'decimal',
    difficulty: d,
    sig,
    stem,
    value,
    rng,
    min: 0,
    max,
    smart: uniq(smart.filter((x) => Number.isInteger(x) && x >= 0 && x !== value)),
    ...(o.numpad ? { input: 'numpad' as const } : {}),
  })
}

/** 比一比，填 >、< 或 =（a、b 是同一单位下的数） */
function cmpQ(kpId: string, d: Difficulty, sig: string, stem: StemPart[], a: string, b: string, rng: RNG, type: QuestionType): Question {
  const x = u4(a)
  const y = u4(b)
  const correct = x > y ? '>' : x < y ? '<' : '='
  return labelQuestion({ kpId, type, difficulty: d, sig, stem, correct, distractors: ['>', '<', '='].filter((s) => s !== correct), rng })
}

/** 判断题：……，对吗？（对 / 不对） */
function tfQ(kpId: string, d: Difficulty, sig: string, stem: StemPart[], ok: boolean, rng: RNG): Question {
  return labelQuestion({ kpId, type: 'decimal', difficulty: d, sig, stem, correct: K(ok ? 'yes' : 'no'), distractors: [K(ok ? 'no' : 'yes')], rng })
}

/** 词条选项的选择题 */
function keyQ(kpId: string, d: Difficulty, sig: string, stem: StemPart[], correct: LStr, wrongs: LStr[], rng: RNG, type: QuestionType = 'decimal'): Question {
  const key = JSON.stringify(correct)
  const ds = uniq(wrongs.map((w) => JSON.stringify(w)))
    .filter((w) => w !== key)
    .slice(0, 3)
    .map((w) => JSON.parse(w) as LStr)
  return labelQuestion({ kpId, type, difficulty: d, sig, stem, correct, distractors: ds, rng })
}

/** 小数卡（不朗读） */
const card = (n: string, marks?: number[]): StemPart => ({ kind: 'dec-card', n, ...(marks ? { marks } : {}) })
const fracCard = (n: number, den: number): StemPart => ({ kind: 'dec-card', frac: [n, den] })

/** 数位（p：个位 0、十位 1……，十分位 -1、百分位 -2……）的词条、计数单位的词条、「几个计数单位」的词条 */
const pk = (p: number): string => (p >= 0 ? String(p) : `d${-p}`)
const placeName = (p: number): LStr => K(`place.${pk(p)}`)
const unitName = (p: number): LStr => K(`unit.${pk(p)}`)
const countOf = (n: number, p: number): LStr => K(n === 1 ? 'cnt1' : 'cnt', { n, u: K(`cu${n === 1 ? '1' : ''}.${pk(p)}`) })
/** 「缩小到原数的十分之一」里的几分之一（10 的 e 次方分之一） */
const partName = (e: number): LStr => K(`part.${e}`)

/** 小数串里第 i 个字（数字）在什么数位上 */
function placeAt(s: string, i: number): number {
  const pt = s.indexOf('.')
  const point = pt < 0 ? s.length : pt
  return i < point ? point - 1 - i : -(i - point)
}

// ═════════════════════════════════════════════════════════════
// 1. 小数的意义（例 1、做一做；练习九 1 / 2 / 7 / 8；练习十四 1）
// ═════════════════════════════════════════════════════════════

/** 例 1 的三把尺：分成 10 份（整米，标 0–9 与 1 m）、100 份（放大 0–10 厘米这一段）、1000 份（放大 0–19 毫米这一段） */
type Stick = 10 | 100 | 1000
function stickPart(per: Stick, k: number): StemPart {
  if (per === 10) return { kind: 'dec-scale', ruler: true, labels: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '1 m'], per: 1, arrow: k }
  if (per === 100) return { kind: 'dec-scale', ruler: true, broken: true, labels: ['0', '1 cm', '2', '3', '4', '5', '6', '7', '8', '9', '10'], per: 1, arrow: k }
  return { kind: 'dec-scale', ruler: true, broken: true, labels: ['0', '1 cm'], per: 10, extra: 9, arrow: k }
}
/** 1000 份的尺子上箭头指的毫米数（课本 1、6、13） */
const MM_ARROWS = [1, 6, 13, 2, 5, 8, 11, 15, 17, 4, 9, 12]

/** 例 1：箭头指着的长度是几分米 / 几厘米 / 几毫米、用分数表示（十分之几、百分之几米）、用小数表示 */
function stickQ(kpId: string, d: Difficulty, rng: RNG, per: Stick = rng.pick([10, 10, 100, 100, 1000] as const)): Question {
  const k = per === 1000 ? rng.pick(MM_ARROWS) : rng.int(1, 9)
  const ask = per === 1000 ? rng.pick(['dec', 'dec', 'dec', 'int'] as const) : rng.pick(['dec', 'dec', 'frac', 'frac', 'int'] as const)
  const stem: StemPart[] = [T(`stick.${per}.${ask}`), stickPart(per, k)]
  const sig = `stick-${per}-${ask}-${k}`
  if (ask === 'int') return intQ(kpId, d, sig, stem, k, rng, [10 - k, k * 10, k + 1], 99)
  if (ask === 'frac') {
    const c = `${k}/${per}`
    const wrongs = [`${k}/${per === 10 ? 100 : 10}`, `${10 - k}/${per}`, `${k + 1}/${per}`, `${k - 1}/${per}`].filter((f) => f !== c && !/^(0|10)\//.test(f))
    return labelQuestion({ kpId, type: 'decimal', difficulty: d, sig, stem, correct: c, distractors: uniq(wrongs).slice(0, 3), rng })
  }
  const c = over(k, per)
  const cands = per === 10 ? [over(k, 100), String(k), over(10 - k, 10), `1.${k}`] : per === 100 ? [over(k, 10), over(k, 1000), over(10 - k, 100), String(k)] : [over(k, 100), over(k, 10000), String(k), over(k + 1, 1000)]
  return decQ(kpId, d, sig, stem, c, cands, rng)
}

/** 10 × 10 的方格从左往右一整列一整列地涂，最后一列从下往上涂（课本 32 格：3 整列 + 第 4 列下面 2 格）；FracShape 的格子按行编号 */
export function gridShaded(k: number): number[] {
  const out: number[] = []
  for (let n = 0; n < k; n++) out.push((9 - (n % 10)) * 10 + Math.floor(n / 10))
  return out
}
const strip = (k: number, whole = 0): FracPic => ({ shape: 'square', parts: 10, shaded: Array.from({ length: k }, (_, i) => i), ...(whole ? { whole } : {}) })
const grid = (k: number, whole = 0): FracPic => ({ shape: 'square', parts: 100, rows: 10, shaded: gridShaded(k), ...(whole ? { whole } : {}) })
/** 方格涂了几格（不取整十，免得 0.30 和 0.3 说不清；课本 32） */
const GRID = [32, 45, 7, 18, 56, 73, 91, 24, 39, 65, 81, 4, 13, 47, 68, 29]
const swap2 = (k: number): number => (k % 10) * 10 + Math.floor(k / 10)

/** 做一做：线段平均分成 10 份括出几段、正方形平均分成 10 份涂几条、平均分成 100 份涂几格——用分数 / 小数表示 */
function picQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const kind = rng.pick(['seg', 'strip', 'grid', 'grid'] as const)
  const frac = rng.chance(0.4)
  const k = kind === 'grid' ? rng.pick(GRID) : rng.int(1, 9)
  const pic: StemPart = kind === 'seg' ? { kind: 'frac-line', units: 1, per: 10, bracket: [0, k], labels: false } : { kind: 'frac-shape', items: [kind === 'grid' ? grid(k) : strip(k)] }
  const stem: StemPart[] = [T(`pic.${kind}.${frac ? 'frac' : 'dec'}`), pic]
  const sig = `pic-${kind}-${frac ? 'f' : 'd'}-${k}`
  const per = kind === 'grid' ? 100 : 10
  if (frac) {
    const c = `${k}/${per}`
    const wrongs = (per === 10 ? [`${k}/100`, `${10 - k}/10`, `${k + 1}/10`, `${k - 1}/10`] : [`${100 - k}/100`, `${swap2(k)}/100`, `${k + 1}/100`, `${k - 1}/100`]).filter(
      (f) => f !== c && !/^(0|10|100)\//.test(f),
    )
    return labelQuestion({ kpId, type: 'decimal', difficulty: d, sig, stem, correct: c, distractors: uniq(wrongs).slice(0, 3), rng })
  }
  const c = over(k, per)
  const cands = per === 10 ? [over(k, 100), String(k), over(10 - k, 10), `1.${k}`] : [over(k, 10), over(k, 1000), over(100 - k, 100), over(swap2(k), 100)]
  return decQ(kpId, d, sig, stem, c, cands, rng)
}

/** 计数单位与进率（p33）：每相邻两个计数单位之间的进率、十分之一写成小数、0.01 是哪个计数单位、1 里面有几个 0.1 */
function unitTermQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const kind = rng.int(0, 3)
  if (kind === 0) return intQ(kpId, d, 'rate', [T('rate')], 10, rng, [100, 1, 1000], 9999)
  const e = d === 1 ? rng.int(1, 3) : rng.int(1, 4)
  const dec = over(1, 10 ** e)
  if (kind === 1) {
    const others = [1, 2, 3, 4].filter((x) => x !== e).map((x) => over(1, 10 ** x))
    return labelQuestion({ kpId, type: 'decimal', difficulty: d, sig: `uw-${e}`, stem: [T('unitWrite', { u: unitName(-e) })], correct: dec, distractors: rng.shuffle(others).slice(0, 3), rng })
  }
  if (kind === 2) {
    return keyQ(kpId, d, `un-${e}`, [T('unitName', { x: dec })], unitName(-e), [1, 2, 3, 4].filter((x) => x !== e).map((x) => unitName(-x)), rng)
  }
  // 1 里面有几个 0.1、0.1 里面有几个 0.01、0.01 里面有几个 0.001（第 2 档起有隔一级的：1 里面有 100 个 0.01）
  const pairs: [number, number][] = d === 1 ? [[0, 1], [1, 2], [2, 3]] : [[0, 1], [1, 2], [2, 3], [0, 2], [1, 3], [0, 3]]
  const [a, b] = rng.pick(pairs)
  const v = 10 ** (b - a)
  return intQ(kpId, d, `in-${a}-${b}`, [T('countIn', { x: over(1, 10 ** a), u: over(1, 10 ** b) })], v, rng, [v * 10, v / 10 >= 1 ? v / 10 : 100, 1], 99999)
}

/** 练习九 2：0.8 里面有几个 0.1、0.32 里面有几个 0.01（键盘），反过来 8 个 0.1 是多少（选项） */
function countInQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const lv = d === 1 ? rng.pick([1, 1, 2, 2, 3]) : rng.pick([1, 2, 2, 3, 3])
  const k = lv === 1 ? rng.int(2, 9) : lv === 2 ? rng.pick(GRID) : rng.pick([6, 13, 47, 58, 5, 125, 9, 36])
  const x = over(k, 10 ** lv)
  const u = over(1, 10 ** lv)
  if (rng.chance(0.55)) return intQ(kpId, d, `cin-${lv}-${k}`, [T('countIn', { x, u })], k, rng, [k * 10, swap2(k) > 0 ? swap2(k) : k + 1, k + 1], 9999)
  return decQ(kpId, d, `cmake-${lv}-${k}`, [T('countMake', { n: k, u })], x, [over(k, 10 ** (lv + 1)), lv > 1 ? over(k, 10 ** (lv - 1)) : String(k), String(k)], rng)
}

/** 练习九 1：分母是 10、100 的分数写成小数（文字里画成上下两层），分母是 1000、10000 的放在小数卡上；反过来小数写成分数（只出 10、100） */
const TEXT_FRACS: [number, number][] = [
  [13, 100],
  [9, 10],
  [7, 10],
  [3, 10],
  [45, 100],
  [8, 100],
  [32, 100],
  [4, 100],
  [1, 100],
  [1, 10],
  [6, 10],
  [23, 100],
]
const CARD_FRACS: [number, number][] = [
  [47, 1000],
  [1, 1000],
  [6, 1000],
  [13, 1000],
  [125, 1000],
  [8, 1000],
]
function fracDecQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const r = rng.next()
  if (r < 0.45) {
    const [n, den] = rng.pick(TEXT_FRACS)
    const c = over(n, den)
    return decQ(kpId, d, `f2d-${n}-${den}`, [T('fracToDec', { f: `${n}/${den}` })], c, [over(n, den * 10), den > 10 ? over(n, den / 10) : String(n), n >= 10 ? over(swap2(n), den) : over(n, 1000)], rng)
  }
  if (r < 0.75) {
    const pool = d === 1 ? CARD_FRACS : [...CARD_FRACS, [1, 10000] as [number, number], [36, 10000] as [number, number]]
    const [n, den] = rng.pick(pool)
    const c = over(n, den)
    return decQ(kpId, d, `cf2d-${n}-${den}`, [T('cardFracToDec'), fracCard(n, den)], c, [over(n, den / 10), over(n, den * 10 > 10000 ? 100 : den * 10), String(n), n >= 10 && n < 100 ? over(swap2(n), den) : null], rng)
  }
  const [n, den] = rng.pick(TEXT_FRACS)
  const x = over(n, den)
  const c = `${n}/${den}`
  const wrongs = [`${n}/${den === 10 ? 100 : 10}`, n >= 10 ? `${swap2(n)}/${den}` : `${10 - n}/${den}`, `${n + 1}/${den}`, n > 1 ? `${n - 1}/${den}` : `${n}/1000`].filter((f) => f !== c && !/\/1000$/.test(f) && !/^0\//.test(f) && !(den === 10 && f.startsWith('10/')))
  return labelQuestion({ kpId, type: 'decimal', difficulty: d, sig: `d2f-${n}-${den}`, stem: [T('decToFrac', { x })], correct: c, distractors: uniq(wrongs).slice(0, 3), rng })
}

/** 练习九 7（反过来问）：直线上每 1 平均分成 10 份，箭头指的数是多少；第 2 档起有指在两小格中间的（3.85） */
function lineReadQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const half = d >= 2 && rng.chance(0.4)
  const units = d === 1 ? rng.int(2, 4) : rng.int(3, 5)
  let k = rng.int(1, units * 10 - 1)
  if (k % 10 === 0) k += 1
  const labels = Array.from({ length: units + 1 }, (_, i) => String(i))
  const arrow = half ? k + 0.5 : k
  const c = half ? over(k * 10 + 5, 100) : over(k, 10)
  const cands = half ? [over(k, 10), over(k + 1, 10), over(k * 10 + 5, 1000), `${Math.floor(k / 10)}.${k % 10}0${5}`] : [over(k + 1, 10), over(k - 1, 10), over(swap2(k), 10), over(k, 100)]
  return decQ(kpId, d, `line-${units}-${arrow}`, [T('lineRead'), { kind: 'dec-scale', labels, per: 10, extra: 4, arrow }], c, cands, rng)
}

/** 练习九 8、练习十四 1（反过来问）：涂色部分用小数表示（一个整的再加几条、圆分成 10 份、一个整的再加方格），尺子上的线段是多少米 */
function shadeReadQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const kind = rng.int(0, 3)
  if (kind === 0) {
    const k = rng.int(1, 9)
    const w = rng.int(1, 2)
    return decQ(kpId, d, `whole-${w}-${k}`, [T('shadeWhole'), { kind: 'frac-shape', items: [strip(k, w)] }], `${w}.${k}`, [`0.${k}`, `${w}.0${k}`, `${k}.${w}`, `${w + 1}.${k}`], rng)
  }
  if (kind === 1) {
    const k = rng.int(1, 9)
    return decQ(kpId, d, `circle-${k}`, [T('shadeCircle'), { kind: 'frac-shape', items: [{ shape: 'circle', parts: 10, shaded: Array.from({ length: k }, (_, i) => i) }] }], `0.${k}`, [`0.0${k}`, String(k), `0.${10 - k}`, `1.${k}`], rng)
  }
  if (kind === 2) {
    const k = rng.pick(GRID)
    return decQ(kpId, d, `grid1-${k}`, [T('shadeWhole'), { kind: 'frac-shape', items: [grid(k, 1)] }], `1.${String(k).padStart(2, '0')}`, [over(k, 100), `1.${swap2(k)}`, over(100 + k, 1000), `${k}.1`], rng)
  }
  const k = rng.int(1, 9)
  return decQ(kpId, d, `ruler-${k}`, [T('rulerM'), { kind: 'ruler', length: 10, from: 0, to: k }], over(k, 100), [over(k, 10), over(k, 1000), String(k)], rng)
}

/** 说法对不对（p33 气泡、练习十四 5(1)） */
const MEANING_TF: [string, boolean][] = [
  ['denom', true],
  ['m007', true],
  ['d03', false],
  ['d005', false],
  ['units', true],
  ['rate100', false],
  ['d08', true],
]
function meaningTfQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const [id, ok] = rng.pick(MEANING_TF)
  return tfQ(kpId, d, `tf-${id}`, [T(`tf.${id}`)], ok, rng)
}

const MEANING: Record<Difficulty, [number, Maker][]> = {
  // 第 1 档：例 1 三把尺（几分米 / 几厘米 / 几毫米、十分之几米、写成小数）、做一做三幅图、计数单位与进率；练习九 1 / 2 / 7 / 8
  1: [
    [26, (d, rng) => stickQ(KP_MEANING, d, rng)],
    [22, (d, rng) => picQ(KP_MEANING, d, rng)],
    [12, (d, rng) => unitTermQ(KP_MEANING, d, rng)],
    [12, (d, rng) => countInQ(KP_MEANING, d, rng)],
    [12, (d, rng) => fracDecQ(KP_MEANING, d, rng)],
    [8, (d, rng) => lineReadQ(KP_MEANING, d, rng)],
    [8, (d, rng) => shadeReadQ(KP_MEANING, d, rng)],
  ],
  2: [
    [15, (d, rng) => stickQ(KP_MEANING, d, rng)],
    [10, (d, rng) => picQ(KP_MEANING, d, rng)],
    [15, (d, rng) => countInQ(KP_MEANING, d, rng)],
    [15, (d, rng) => fracDecQ(KP_MEANING, d, rng)],
    [15, (d, rng) => lineReadQ(KP_MEANING, d, rng)],
    [15, (d, rng) => shadeReadQ(KP_MEANING, d, rng)],
    [15, (d, rng) => meaningTfQ(KP_MEANING, d, rng)],
  ],
  3: [
    [25, (d, rng) => meaningTfQ(KP_MEANING, d, rng)],
    [25, (d, rng) => fracDecQ(KP_MEANING, d, rng)],
    [25, (d, rng) => lineReadQ(KP_MEANING, d, rng)],
    [25, (d, rng) => unitTermQ(KP_MEANING, d, rng)],
  ],
}
defineGenerator(KP_MEANING, (d, rng) => pickBy(rng, MEANING[d], d))

// ═════════════════════════════════════════════════════════════
// 2. 小数的读法和写法（例 2 数位顺序表与做一做、例 3 读、例 4 写；练习九 4 / 5 / 6 / 10*）
// ═════════════════════════════════════════════════════════════

/** 读数（例 3、做一做，练习九 5，课本 p34 的 1.8、5.63、12.378） */
const READ1 = ['0.58', '3.5', '41.47', '6.5', '0.04', '6.72', '0.058', '340.09', '1.8', '5.63', '12.378', '29.5', '432.4', '8848.86', '1.4', '0.85', '2.7']
const READ2 = ['20.04', '105.09', '0.206', '300.71', '5.06', '0.089', '40075.7', '0.0001', '13.15', '0.557', '367.7', '0.672', '7.05', '60.08']
/** 写数（例 4、做一做，练习九 6） */
const WRITE1 = ['4.76', '0.06', '13.15', '0.206', '300.71', '5.06', '0.089', '3.5', '41.47', '0.58', '6.72', '0.04']
const WRITE2 = ['40075.7', '0.557', '367.7', '8848.86', '0.0506', '20.04', '105.09', '6.05', '0.009', '30.08']

/** 读作什么：数在小数卡上（不朗读），选项是汉字读法（注音），答错时读这个数 */
function readQ(kpId: string, d: Difficulty, rng: RNG, n = rng.pick(d === 1 ? READ1 : [...READ1, ...READ2])): Question {
  const q = labelQuestion({ kpId, type: 'decimal', difficulty: d, sig: `read-${n}`, stem: [T('readAs'), card(n)], correct: decWords(decRead(n)), distractors: readWrongs(n, rng).map(decWords), rng })
  const id = (q.answer as { choiceId: string }).choiceId
  q.choices = q.choices!.map((c) => (c.id === id ? { ...c, say: n } : c))
  return q
}

/** 写作多少：题目里写着读法（注音、朗读），选项是数 */
function writeQ(kpId: string, d: Difficulty, rng: RNG, n = rng.pick(d === 1 ? WRITE1 : [...WRITE1, ...WRITE2])): Question {
  return decQ(kpId, d, `write-${n}`, [T('writeAs', { r: decWords(decRead(n)) })], n, writeWrongs(n), rng)
}

/** 练习九 6：句子里写着读法（课本原句），问横线上的数写作多少 */
const CTX_WRITE: [string, string][] = [
  ['ev', '367.7'],
  ['egg', '0.557'],
  ['equator', '40075.7'],
]
function ctxWriteQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const [id, n] = rng.pick(CTX_WRITE)
  return decQ(kpId, d, `wctx-${id}`, [T(`ctx.${id}`)], n, writeWrongs(n), rng)
}

/** 例 2 的小数的数位顺序表：打问号的那一格是什么数位 / 计数单位是什么（万位到万分位） */
function tableQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const p = rng.chance(0.7) ? -rng.int(1, 4) : rng.int(0, 3)
  const near = [p + 1, p - 1, p + 2, p - 2, -p, p > 0 ? -p - 1 : -p + 1].filter((x) => x >= -4 && x <= 4 && x !== p)
  const part: StemPart = { kind: 'dec-table', top: 4, dec: 4, ask: p }
  if (rng.chance(0.55)) return keyQ(kpId, d, `table-p${p}`, [T('tablePlace'), part], placeName(p), rng.shuffle(uniq(near)).map(placeName), rng)
  return keyQ(kpId, d, `table-u${p}`, [T('tableUnit'), part], unitName(p), rng.shuffle(uniq(near)).map(unitName), rng)
}

/** 例 2「说出其他各数位表示什么」、练习九 4：小数卡上画横线的数字在什么数位上 / 表示几个什么 */
const PLACE_POOL = ['20.04', '5.42', '0.25', '0.672', '12.378', '2.83', '1.8', '5.63', '340.09', '8848.86', '41.47', '6.72', '0.058', '13.15', '4.76', '300.71']
function markQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const n = rng.pick(PLACE_POOL)
  const idx = [...n].map((c, i) => (c !== '.' && c !== '0' ? i : -1)).filter((i) => i >= 0)
  const i = rng.pick(idx)
  const p = placeAt(n, i)
  const digit = Number(n[i])
  const near = uniq([p + 1, p - 1, p + 2, p - 2, -p, p > 0 ? -p - 1 : -p + 1].filter((x) => x >= -4 && x <= 4 && x !== p))
  if (rng.chance(0.5)) return keyQ(kpId, d, `mark-p-${n}-${i}`, [T('markPlace'), card(n, [i])], placeName(p), rng.shuffle(near).map(placeName), rng)
  return keyQ(kpId, d, `mark-m-${n}-${i}`, [T('markMeans'), card(n, [i])], countOf(digit, p), rng.shuffle(near).map((x) => countOf(digit, x)), rng)
}

/** 例 2 做一做：2.83 是由几个一、几个十分之一和几个百分之一组成的（键盘，一次问一个；第 2 档有三位小数的） */
const COMPOSE2 = ['2.83', '5.63', '6.72', '4.76', '3.45', '1.58', '9.27', '7.39', '8.14', '2.96']
const COMPOSE3 = ['3.258', '1.476', '4.129', '6.352']
function composeQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const three = d >= 2 && rng.chance(0.4)
  const n = rng.pick(three ? COMPOSE3 : COMPOSE2)
  const ds = n.replace('.', '').split('').map(Number)
  const ask = rng.int(0, ds.length - 1)
  // 已知的几个数写成汉字（八个十分之一）：写成「8 个十分之一」朗读会切成「8个十 · 分之一」
  const params: P = { x: n }
  'abcd'.slice(0, ds.length).split('').forEach((l, k) => {
    if (k !== ask) params[l] = K(`ge.${ds[k]}`)
  })
  const v = ds[ask]!
  const smart = [Number(n.replace('.', '').slice(0, ask + 1)), ...ds.filter((_, k) => k !== ask), v + 1]
  return intQ(kpId, d, `comp-${n}-${ask}`, [T(`comp${ds.length}.${'abcd'[ask]}`, params)], v, rng, smart, 99)
}

/** 读法说得对不对（数在卡上不朗读；错的读法用常见错法） */
function readTfQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const n = rng.pick([...READ1, ...READ2])
  const ok = rng.chance(0.45)
  const r = ok ? decRead(n) : readWrongs(n, rng)[0]!
  return tfQ(kpId, d, `rtf-${n}-${ok ? 'y' : r}`, [T('readTf', { r: decWords(r) }), card(n)], ok, rng)
}

/** 练习九 10*：用 3、0、8、5 和小数点写数，每个数字都要用上、只能用一次——下面哪个符合要求 */
const CARD_RULES: { id: string; ok: string[]; bad: string[] }[] = [
  { id: 'lt1', ok: ['0.358', '0.385', '0.538', '0.583', '0.835', '0.853'], bad: ['3.058', '8.035', '0.38', '30.58', '5.038', '0.3585'] },
  { id: 'gt8', ok: ['8.035', '8.053', '8.305', '8.503'], bad: ['3.805', '85.03', '0.835', '8.35', '5.038', '80.35'] },
  { id: 'silent', ok: ['30.58', '30.85', '50.38', '50.83', '80.35', '80.53'], bad: ['3.058', '35.08', '0.358', '38.05', '3.508', '305.8'] },
]
function cardsQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const rule = rng.pick(CARD_RULES)
  const c = rng.pick(rule.ok)
  return labelQuestion({ kpId, type: 'decimal', difficulty: d, sig: `cards-${rule.id}-${c}`, stem: [T(`cards.${rule.id}`)], correct: c, distractors: rng.shuffle(rule.bad).slice(0, 3), rng })
}

const READ_WRITE: Record<Difficulty, [number, Maker][]> = {
  // 第 1 档：例 2 数位顺序表与各数位表示什么、做一做 2.83 的组成；例 3 读作、例 4 写作与做一做；练习九 4 / 6
  1: [
    [14, (d, rng) => tableQ(KP_RW, d, rng)],
    [14, (d, rng) => markQ(KP_RW, d, rng)],
    [12, (d, rng) => composeQ(KP_RW, d, rng)],
    [22, (d, rng) => readQ(KP_RW, d, rng)],
    [22, (d, rng) => writeQ(KP_RW, d, rng)],
    [8, (d, rng) => ctxWriteQ(KP_RW, d, rng)],
  ],
  2: [
    [22, (d, rng) => readQ(KP_RW, d, rng)],
    [22, (d, rng) => writeQ(KP_RW, d, rng)],
    [14, (d, rng) => markQ(KP_RW, d, rng)],
    [12, (d, rng) => ctxWriteQ(KP_RW, d, rng)],
    [10, (d, rng) => tableQ(KP_RW, d, rng)],
    [10, (d, rng) => readTfQ(KP_RW, d, rng)],
    [10, (d, rng) => composeQ(KP_RW, d, rng)],
  ],
  3: [
    [30, (d, rng) => cardsQ(KP_RW, d, rng)],
    [25, (d, rng) => readQ(KP_RW, d, rng)],
    [25, (d, rng) => writeQ(KP_RW, d, rng)],
    [20, (d, rng) => readTfQ(KP_RW, d, rng)],
  ],
}
defineGenerator(KP_RW, (d, rng) => pickBy(rng, READ_WRITE[d], d))

// ═════════════════════════════════════════════════════════════
// 3. 小数的性质（例 1–例 4、做一做；练习十 1–5）
// ═════════════════════════════════════════════════════════════

/** 例 1 / 例 2：0.1 米 ○ 0.10 米、看图 0.3 ○ 0.30（也有不相等的 0.3 ○ 0.03）；0.30 是几个 0.1；0.10 米是多少厘米 */
const SAME_PAIRS: [string, string][] = [
  ['0.1', '0.10'],
  ['0.10', '0.100'],
  ['0.3', '0.30'],
  ['0.4', '0.40'],
  ['0.3', '0.03'],
  ['0.07', '0.7'],
  ['0.5', '0.50'],
  ['0.6', '0.06'],
]
function sameQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const kind = rng.int(0, 3)
  if (kind === 0) {
    const [a, b] = rng.pick(SAME_PAIRS)
    return cmpQ(kpId, d, `samem-${a}-${b}`, [T('compare'), T('cmpMM', { a, b })], a, b, rng, 'decimal')
  }
  if (kind === 1) {
    // 看图：十条里涂 k 条（0.k）和 100 格里涂 k 列（0.k0），或涂 k 格（0.0k）
    const k = rng.int(1, 9)
    const eq = rng.chance(0.65)
    const a = `0.${k}`
    const b = eq ? `0.${k}0` : `0.0${k}`
    const pics: FracPic[] = [{ ...strip(k), label: a }, { ...grid(eq ? k * 10 : k), label: b }]
    return cmpQ(kpId, d, `samep-${a}-${b}`, [T('compare'), { kind: 'frac-shape', items: pics }, { kind: 'expr', expr: `${a} ○ ${b}` }], a, b, rng, 'decimal')
  }
  if (kind === 2) {
    const k = rng.int(2, 9)
    return intQ(kpId, d, `same-in-${k}`, [T('sameIn', { x: `0.${k}0`, n: k * 10 })], k, rng, [k * 10, k * 100, k + 1], 999)
  }
  const [x, u, v] = rng.pick([
    ['0.10', 'cm', 10],
    ['0.100', 'mm', 100],
    ['0.1', 'dm', 1],
    ['0.30', 'cm', 30],
    ['0.300', 'mm', 300],
  ] as const)
  return intQ(kpId, d, `same-u-${x}-${u}`, [T('conv', { n: x, a: K('u.m'), b: K(`u.${u}`) })], v, rng, [v * 10, v / 10 >= 1 ? v / 10 : v + 1, v + 1], 9999)
}

/** 小数的性质（p39 的框）与常见的错：末尾添 0 / 去 0（整数末尾不行）、中间的 0 去掉 */
const RULE_TF: [string, boolean, P?][] = [
  ['main', true],
  ['end', true, { x: '5.6' }],
  ['end', true, { x: '0.06' }],
  ['end', true, { x: '104.03' }],
  ['end', false, { x: 18 }],
  ['end', false, { x: 150 }],
  ['midZero', false, { x: '4.08', y: '4.8' }],
  ['midZero', false, { x: '105.09', y: '15.09' }],
  ['dropEnd', true, { x: '0.70', y: '0.7' }],
  ['dropEnd', true, { x: '12.000', y: '12' }],
  ['eq', true, { a: '0.7', b: '0.70' }],
  ['eq', false, { a: '0.7', b: '0.07' }],
  ['eq', true, { a: '3', b: '3.00' }],
]
function ruleTfQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const [id, ok, p] = rng.pick(RULE_TF)
  return tfQ(kpId, d, `rule-${id}-${JSON.stringify(p ?? {})}`, [T(`rule.${id}`, p)], ok, rng)
}

/** 例 3、做一做 1、练习十：化简（去掉小数末尾的 0）。干扰项：中间的 0 也去掉了、整数部分的 0 去掉了、只去掉一部分、小数点挪了 */
const SIMPLIFY = ['0.70', '105.0900', '0.40', '1.850', '2.900', '0.080', '12.000', '3.90', '0.30', '1.80', '72.060', '0.0050', '31.0100', '4.400', '6.500', '10.10']
function simplifyQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const x = rng.pick(SIMPLIFY)
  const c = norm(x)
  const [ip, fp = ''] = c.split('.')
  const cands: (string | null)[] = []
  if (fp.includes('0')) cands.push(`${ip}.${fp.replace(/0/g, '')}`)
  if (ip!.includes('0') && ip!.length > 1) cands.push(`${ip!.replace(/0/g, '')}${fp ? `.${fp}` : ''}`)
  if (/00$/.test(x)) cands.push(x.slice(0, -1))
  cands.push(shiftPoint(c, 1), shiftPoint(c, -1))
  return decQ(kpId, d, `simp-${x}`, [T('simplify', { x })], c, cands, rng, { form: true })
}

/** 例 4、做一做 2、练习十 4：不改变数的大小，写成三位小数。干扰项：0 添错了地方、位数不对（两位 / 四位） */
const PAD3 = ['0.2', '4.08', '3', '0.9', '30.04', '5.4', '8.18', '14', '0.27', '10.8', '3.6', '40', '5.0500', '0.4050', '2.5', '0.06', '7']
function padQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const x = rng.pick(PAD3)
  const c = padTo(x, 3)
  const [ip, fp = ''] = norm(x).split('.')
  const cands: (string | null)[] = []
  if (fp.length > 0 && fp.length < 3) cands.push(`${ip}.${'0'.repeat(3 - fp.length)}${fp}`)
  if (fp.length === 2) cands.push(`${ip}.${fp[0]}0${fp[1]}`)
  if (!fp) cands.push(shiftPoint(ip!, -3), `${ip}000`)
  cands.push(rng.chance(0.5) ? padTo(x, 2) : padTo(x, 4))
  cands.push(`${ip}0.${fp.padEnd(2, '0')}`)
  return decQ(kpId, d, `pad-${x}`, [T('pad3', { x })], c, cands, rng, { form: true })
}

/** 练习十 1：哪个数里的 0 可以去掉（只有末尾的 0）/ 不能去掉 */
const ZERO_CAN = ['3.90', '0.30', '1.80', '0.70', '6.50', '4.40', '12.30', '2.60']
const ZERO_CANNOT = ['500', '600', '0.04', '1.05', '30.6', '4.08', '70', '20.06', '0.09', '105']
function zeroQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const can = rng.chance(0.55)
  const c = rng.pick(can ? ZERO_CAN : ZERO_CANNOT)
  const wrongs = rng.shuffle(can ? ZERO_CANNOT : ZERO_CAN).slice(0, 3)
  return labelQuestion({ kpId, type: 'decimal', difficulty: d, sig: `zero-${can ? 'can' : 'cannot'}-${c}-${[...wrongs].sort().join(',')}`, stem: [T(can ? 'zeroCan' : 'zeroCannot')], correct: c, distractors: wrongs, rng })
}

/** 练习十 2：下面哪个数和 2.70 相等（干扰项：0 换了位置、小数点挪了、整数部分的 0 去掉了） */
const EQUAL_POOL = ['2.70', '31.0100', '72.060', '0.0050', '4.40', '0.300', '5.80', '10.050', '3.60', '0.90']
function equalQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const x = rng.pick(EQUAL_POOL)
  const n = norm(x)
  // 正确项写成最简（去掉末尾的 0），干扰项也都是最简写法：只比数值
  const c = n
  const [ip, fp = ''] = n.split('.')
  const cands: (string | null)[] = []
  if (fp.length === 1) cands.push(`${ip}.0${fp}`)
  for (let i = 0; i + 1 < fp.length; i++) if (fp[i] !== fp[i + 1]) cands.push(`${ip}.${fp.slice(0, i)}${fp[i + 1]}${fp[i]}${fp.slice(i + 2)}`)
  if (ip!.includes('0') && ip!.length > 1) cands.push(`${ip!.replace(/0/g, '')}.${fp}`)
  cands.push(shiftPoint(n, 1), shiftPoint(n, -1), `${ip}${fp}`)
  return labelQuestion({ kpId, type: 'decimal', difficulty: d, sig: `eq-${x}-${c}`, stem: [T('equalTo', { x })], correct: c, distractors: pickWrongs(n, cands), rng })
}

/** 练习十 3：在末尾添上 0，大小变不变（整数变，小数不变） */
const APPEND = ['3.4', '18', '0.06', '700', '3.0', '908', '104.03', '150', '10.01', '42.00']
function appendQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const x = rng.pick(APPEND)
  const dec = x.includes('.')
  return keyQ(kpId, d, `app-${x}`, [T('append', { x })], K(dec ? 'noChange' : 'changed'), [K(dec ? 'changed' : 'noChange')], rng)
}

/** 练习十 5：给物品加价签，以元为单位、用两位小数表示（15 元 5 角 = 15.50 元） */
const PRICE_TAGS: [number, number][] = [
  [15, 5],
  [0, 6],
  [8, 0],
  [2, 3],
  [3, 5],
  [12, 8],
  [0, 9],
  [5, 0],
  [9, 9],
  [1, 2],
]
function priceTagQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const [y, j] = rng.pick(PRICE_TAGS)
  const key = y && j ? 'price.yj' : y ? 'price.y' : 'price.j'
  const c = `${y}.${j}0`
  const cands = [`${y}.0${j}`, norm(c) === c ? null : padTo(c, 1), padTo(shiftPoint(c, 1), 2), padTo(shiftPoint(c, -1), 2), y ? null : `${j}.00`]
  return decQ(kpId, d, `price-${y}-${j}`, [T(key, { a: y, b: j })], c, cands, rng, { form: true })
}

const PROPERTY: Record<Difficulty, [number, Maker][]> = {
  // 第 1 档：例 1 / 例 2（相等、看图比较、0.30 是几个 0.1、0.10 米是几厘米）、性质的框、例 3 化简、例 4 写成三位小数与做一做；练习十 1–5
  1: [
    [16, (d, rng) => sameQ(KP_PROP, d, rng)],
    [10, (d, rng) => ruleTfQ(KP_PROP, d, rng)],
    [20, (d, rng) => simplifyQ(KP_PROP, d, rng)],
    [20, (d, rng) => padQ(KP_PROP, d, rng)],
    [10, (d, rng) => zeroQ(KP_PROP, d, rng)],
    [8, (d, rng) => equalQ(KP_PROP, d, rng)],
    [8, (d, rng) => appendQ(KP_PROP, d, rng)],
    [8, (d, rng) => priceTagQ(KP_PROP, d, rng)],
  ],
  2: [
    [18, (d, rng) => simplifyQ(KP_PROP, d, rng)],
    [18, (d, rng) => padQ(KP_PROP, d, rng)],
    [14, (d, rng) => zeroQ(KP_PROP, d, rng)],
    [14, (d, rng) => equalQ(KP_PROP, d, rng)],
    [12, (d, rng) => appendQ(KP_PROP, d, rng)],
    [12, (d, rng) => priceTagQ(KP_PROP, d, rng)],
    [12, (d, rng) => ruleTfQ(KP_PROP, d, rng)],
  ],
  3: [
    [25, (d, rng) => equalQ(KP_PROP, d, rng)],
    [25, (d, rng) => zeroQ(KP_PROP, d, rng)],
    [25, (d, rng) => priceTagQ(KP_PROP, d, rng)],
    [25, (d, rng) => ruleTfQ(KP_PROP, d, rng)],
  ],
}
defineGenerator(KP_PROP, (d, rng) => pickBy(rng, PROPERTY[d], d))

// ═════════════════════════════════════════════════════════════
// 4. 小数的大小比较（例 5、做一做；练习十 6–9、思考题）
// ═════════════════════════════════════════════════════════════

/** 例 5 四名同学的跳远成绩（课本：小明 3.05、小林 2.84、小东 2.88、小军 2.93 米），另几组同样大小的 */
const JUMPERS = ['ming', 'lin', 'dong', 'jun'] as const
const JUMP_BOOK = ['3.05', '2.84', '2.88', '2.93']
const JUMP_POOL = ['3.05', '2.84', '2.88', '2.93', '3.12', '2.79', '2.96', '3.08', '2.69', '2.91', '3.01', '2.87']
const JUMP_ASK = ['first', 'second', 'third', 'last'] as const
function jumpQ(kpId: string, d: Difficulty, rng: RNG): Question {
  let vals = rng.chance(0.4) ? [...JUMP_BOOK] : rng.shuffle(JUMP_POOL).slice(0, 4)
  while (new Set(vals.map(norm)).size < 4) vals = rng.shuffle(JUMP_POOL).slice(0, 4)
  const rank = rng.int(0, 3)
  const sorted = [...vals].sort((a, b) => u4(b) - u4(a))
  const at = vals.indexOf(sorted[rank]!)
  const rows: (number | LStr | null)[][] = [
    [K('head.name'), ...JUMPERS.map((w) => K(`who.${w}`))],
    [K('head.jump'), ...vals],
  ]
  return keyQ(
    kpId,
    d,
    `jump-${JUMP_ASK[rank]}-${vals.join(',')}`,
    [T(`jump.${JUMP_ASK[rank]}`), { kind: 'stat-table', rows, head: 'both' }],
    K(`who.${JUMPERS[at]}`),
    JUMPERS.filter((_, i) => i !== at).map((w) => K(`who.${w}`)),
    rng,
    'compare',
  )
}

/** 例 5 的方法：比较两个小数，比到哪一部分 / 哪一位才分出大小（整数部分、十分位、百分位、千分位） */
const STEP_PAIRS: [string, string][] = [
  ['3.05', '2.93'],
  ['2.88', '2.93'],
  ['2.88', '2.84'],
  ['6.35', '6.53'],
  ['4.723', '4.79'],
  ['0.458', '0.54'],
  ['2.613', '2.614'],
  ['0.51', '0.509'],
  ['1.374', '1.3'],
  ['7.9', '8.2'],
  ['3', '2.6'],
  ['1.23', '1.32'],
]
function stepQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const [a, b] = rng.pick(STEP_PAIRS)
  const [ia, fa = ''] = a.split('.')
  const [ib, fb = ''] = b.split('.')
  let at = 0 // 0 = 整数部分，-1 十分位……
  if (ia === ib) {
    const f1 = fa.padEnd(4, '0')
    const f2 = fb.padEnd(4, '0')
    let i = 0
    while (f1[i] === f2[i]) i++
    at = -(i + 1)
  }
  const name = (p: number): LStr => (p === 0 ? K('intPart') : placeName(p))
  return keyQ(kpId, d, `step-${a}-${b}`, [T('step', { a, b })], name(at), [0, -1, -2, -3].filter((p) => p !== at).map(name), rng, 'compare')
}

/** 做一做、练习十 7、整理和复习 2 的比大小（课本的数），和同一个池子里的数两两比 */
const CMP_BOOK: [string, string, ('yuan' | 'm')?][] = [
  ['3', '2.6', 'yuan'],
  ['6.35', '6.53', 'm'],
  ['4.723', '4.79'],
  ['0.458', '0.54'],
  ['7.9', '8.2'],
  ['0.51', '0.509'],
  ['1.374', '1.3'],
  ['5.7', '5.8'],
  ['0.6', '0.60'],
  ['1.23', '1.32'],
  ['0.09', '0.12'],
  ['0.28', '0.3'],
  ['0.4', '0.04'],
  ['8.7', '7.9'],
  ['4.300', '4.3'],
  ['2.613', '2.614'],
  ['0.41', '0.409'],
  ['2.88', '2.84', 'm'],
  ['3.05', '2.93', 'm'],
]
/** 同一组里的数整数部分相同或相近、位数不同、0 的位置不同（课本做一做、练习十 7 的样子），两两比才有意思 */
const CMP_FAMILIES: string[][] = [
  ['2.84', '2.88', '2.93', '2.8', '2.48'],
  ['6.35', '6.53', '6.5', '6.305'],
  ['0.6', '0.06', '0.66', '0.606', '0.60'],
  ['3.05', '3.5', '3.15', '3.051'],
  ['1.23', '1.32', '1.3', '1.203'],
  ['4.723', '4.79', '4.7', '4.8'],
  ['0.458', '0.54', '0.5', '0.45'],
  ['7.9', '8.2', '7.09', '8.02'],
  ['0.41', '0.409', '0.4', '0.14'],
  ['5.7', '5.8', '5.07', '5.78'],
  ['0.09', '0.12', '0.28', '0.3', '0.04'],
]
function cmpPairQ(kpId: string, d: Difficulty, rng: RNG): Question {
  let a: string
  let b: string
  let unit: 'yuan' | 'm' | undefined
  if (rng.chance(0.45)) [a, b, unit] = rng.pick(CMP_BOOK)
  else {
    ;[a, b] = rng.shuffle(rng.pick(CMP_FAMILIES)).slice(0, 2) as [string, string]
    unit = rng.pick([undefined, undefined, 'm', 'yuan'] as const)
  }
  if (rng.chance(0.5)) [a, b] = [b, a]
  const cmp: StemPart = unit ? T(unit === 'm' ? 'cmpMM' : 'cmpYuan', { a, b }) : { kind: 'expr', expr: `${a} ○ ${b}` }
  return cmpQ(kpId, d, `cmp-${unit ?? 'n'}-${a}-${b}`, [T('compare'), cmp], a, b, rng, 'compare')
}

/** 练习十 6（反过来问）：0–0.4 的直线，每 0.1 平均分成 10 小格，箭头指的数是多少 */
const LINE2 = [9, 12, 28, 4, 15, 23, 36, 41, 7, 33, 19, 26]
function line2Q(kpId: string, d: Difficulty, rng: RNG): Question {
  const k = rng.pick(LINE2)
  const c = over(k, 100)
  return decQ(
    kpId,
    d,
    `line2-${k}`,
    [T('lineRead'), { kind: 'dec-scale', labels: ['0', '0.1', '0.2', '0.3', '0.4'], per: 10, extra: 4, arrow: k }],
    c,
    [over(k, 10), over(k + 1, 100), over(k - 1, 100), k >= 10 ? over(swap2(k), 100) : over(k, 1000)],
    rng,
  )
}

/** 练习十 9：按体重排序（课本：小军 38.5、小芳 43.6、小丽 37.8、小刚 43.9 千克），谁的体重最大 / 最小 */
const WEIGHERS = ['jun', 'fang', 'li', 'gang'] as const
const WEIGHT_BOOK = ['38.5', '43.6', '37.8', '43.9']
const WEIGHT_POOL = ['38.5', '43.6', '37.8', '43.9', '40.2', '39.7', '42.05', '41.8', '36.9', '43.06', '38.05', '40.25']
function weightQ(kpId: string, d: Difficulty, rng: RNG): Question {
  let vals = rng.chance(0.4) ? [...WEIGHT_BOOK] : rng.shuffle(WEIGHT_POOL).slice(0, 4)
  while (new Set(vals.map(norm)).size < 4) vals = rng.shuffle(WEIGHT_POOL).slice(0, 4)
  const max = rng.chance(0.5)
  const pick = vals.reduce((m, v) => ((max ? u4(v) > u4(m) : u4(v) < u4(m)) ? v : m))
  const at = vals.indexOf(pick)
  const rows: (number | LStr | null)[][] = [
    [K('head.name'), ...WEIGHERS.map((w) => K(`who.${w}`))],
    [K('head.weightKg'), ...vals],
  ]
  return keyQ(kpId, d, `weight-${max ? 'max' : 'min'}-${vals.join(',')}`, [T(max ? 'weightMax' : 'weightMin'), { kind: 'stat-table', rows, head: 'both' }], K(`who.${WEIGHERS[at]}`), WEIGHERS.filter((_, i) => i !== at).map((w) => K(`who.${w}`)), rng, 'compare')
}

/** 练习十 8：三个商店的价钱（课本原价），买哪样去哪个商店最便宜；价钱一列可以换着放（答案跟着变） */
const SHOP_ITEMS: { id: string; prices: string[] }[] = [
  { id: 'racket', prices: ['28.98', '28.89', '29.00'] },
  { id: 'shuttle', prices: ['3.40', '3.35', '3.30'] },
  { id: 'kick', prices: ['3.50', '3.55', '3.45'] },
]
function shopQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const order = rng.chance(0.4) ? [0, 1, 2] : rng.shuffle([0, 1, 2])
  const item = rng.pick(SHOP_ITEMS)
  const prices = order.map((i) => item.prices[i]!)
  const at = prices.reduce((m, v, i) => (u4(v) < u4(prices[m]!) ? i : m), 0)
  const rows: (number | LStr | null)[][] = [[K('head.goods'), K('shop.a'), K('shop.b'), K('shop.c')], ...SHOP_ITEMS.map((it) => [K(`goods.${it.id}`), ...order.map((i) => it.prices[i]!)])]
  const shops = ['a', 'b', 'c']
  return keyQ(
    kpId,
    d,
    `shop-${item.id}-${order.join('')}`,
    [T(`shop.${item.id}`), { kind: 'stat-table', title: K('head.priceYuan'), rows, head: 'both' }],
    K(`shop.${shops[at]}`),
    shops.filter((_, i) => i !== at).map((s) => K(`shop.${s}`)),
    rng,
    'compare',
  )
}

/** 几个数里哪个最大 / 最小（位数不同、0 的位置不同的一组） */
const EXT_FAMILIES: string[][] = [
  ['2.84', '2.8', '2.88', '2.48'],
  ['0.6', '0.06', '0.66', '0.606'],
  ['3.05', '3.5', '3.15', '3.051'],
  ['1.23', '1.32', '1.3', '1.203'],
  ['4.723', '4.79', '4.7', '4.8'],
  ['0.458', '0.54', '0.5', '0.45'],
  ['7.9', '8.2', '7.09', '8.02'],
  ['0.41', '0.409', '0.4', '0.14'],
]
function extremeQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const fam = rng.shuffle(rng.pick(EXT_FAMILIES))
  const max = rng.chance(0.5)
  const pick = fam.reduce((m, v) => ((max ? u4(v) > u4(m) : u4(v) < u4(m)) ? v : m))
  return labelQuestion({ kpId, type: 'compare', difficulty: d, sig: `ext-${max ? 'max' : 'min'}-${[...fam].sort().join(',')}`, stem: [T(max ? 'maxOf' : 'minOf')], correct: pick, distractors: fam.filter((v) => v !== pick), rng })
}

/** 思考题：用数字卡片 2、3、4 和小数点组成小数（每张都用上）：一共几个（12）、最大 / 最小的是多少 */
function cards234Q(kpId: string, d: Difficulty, rng: RNG): Question {
  const ds = rng.chance(0.5) ? [2, 3, 4] : rng.shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 3).sort((x, y) => x - y)
  const [a, b, c] = ds as [number, number, number]
  const p = { a, b, c }
  const kind = rng.int(0, 2)
  if (kind === 0) return intQ(kpId, d, `c234-n-${a}${b}${c}`, [T('cards234.count', p)], 12, rng, [6, 9, 3], 99, { type: 'compare' })
  if (kind === 1) return decQ(kpId, d, `c234-max-${a}${b}${c}`, [T('cards234.max', p)], `${c}${b}.${a}`, [`${c}.${b}${a}`, `${c}${a}.${b}`, `${b}${c}.${a}`], rng, { type: 'compare' })
  return decQ(kpId, d, `c234-min-${a}${b}${c}`, [T('cards234.min', p)], `${a}.${b}${c}`, [`${a}.${c}${b}`, `${a}${b}.${c}`, `${b}.${a}${c}`], rng, { type: 'compare' })
}

const COMPARE: Record<Difficulty, [number, Maker][]> = {
  // 第 1 档：例 5 跳远排名次与比较的步骤、做一做比大小（含带单位的、位数不同的）；练习十 6–9
  1: [
    [18, (d, rng) => jumpQ(KP_CMP, d, rng)],
    [12, (d, rng) => stepQ(KP_CMP, d, rng)],
    [34, (d, rng) => cmpPairQ(KP_CMP, d, rng)],
    [10, (d, rng) => line2Q(KP_CMP, d, rng)],
    [10, (d, rng) => weightQ(KP_CMP, d, rng)],
    [8, (d, rng) => shopQ(KP_CMP, d, rng)],
    [8, (d, rng) => extremeQ(KP_CMP, d, rng)],
  ],
  2: [
    [25, (d, rng) => cmpPairQ(KP_CMP, d, rng)],
    [15, (d, rng) => line2Q(KP_CMP, d, rng)],
    [15, (d, rng) => weightQ(KP_CMP, d, rng)],
    [15, (d, rng) => shopQ(KP_CMP, d, rng)],
    [15, (d, rng) => extremeQ(KP_CMP, d, rng)],
    [15, (d, rng) => stepQ(KP_CMP, d, rng)],
  ],
  3: [
    [30, (d, rng) => cards234Q(KP_CMP, d, rng)],
    [25, (d, rng) => extremeQ(KP_CMP, d, rng)],
    [25, (d, rng) => cmpPairQ(KP_CMP, d, rng)],
    [20, (d, rng) => shopQ(KP_CMP, d, rng)],
  ],
}
defineGenerator(KP_CMP, (d, rng) => pickBy(rng, COMPARE[d], d))

// ═════════════════════════════════════════════════════════════
// 5. 小数点移动引起小数大小的变化（例 1、做一做、例 2、做一做；练习十一；整理和复习 3、练习十四 4）
// ═════════════════════════════════════════════════════════════

/** 「扩大到原数的 10 倍」「缩小到原数的十分之一」（e > 0 扩大，e < 0 缩小） */
const changeName = (e: number): LStr => (e > 0 ? K('bigger', { n: 10 ** e }) : K('smaller', { f: partName(-e) }))

/** 例 1 的规律（p43 两个框）：向右移动几位扩大到原数的多少倍、向左移动几位缩小到原数的几分之一；乘 / 除以 100 小数点怎样移动 */
function ruleShiftQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const e = rng.int(1, 3)
  const kind = rng.int(0, 3)
  if (kind === 0) return intQ(kpId, d, `rr-${e}`, [T('ruleRight', { m: K(`pos.${e}`) })], 10 ** e, rng, [10 ** (e + 1), e > 1 ? 10 ** (e - 1) : 100, e], 99999)
  if (kind === 1) return keyQ(kpId, d, `rl-${e}`, [T('ruleLeft', { m: K(`pos.${e}`) })], partName(e), [1, 2, 3, 4].filter((x) => x !== e).map(partName), rng)
  const mul = kind === 2
  const move = (dir: 'r' | 'l', k: number): LStr => K(`move.${dir}${k}`)
  const correct = move(mul ? 'r' : 'l', e)
  const wrongs = [move(mul ? 'l' : 'r', e), move(mul ? 'r' : 'l', e === 3 ? 2 : e + 1), move(mul ? 'r' : 'l', e === 1 ? 2 : e - 1)]
  return keyQ(kpId, d, `rm-${mul ? 'mul' : 'div'}-${e}`, [T(mul ? 'howMoveMul' : 'howMoveDiv', { n: 10 ** e })], correct, wrongs, rng)
}

/** 例 1 金箍棒：0.009 m = 9 mm、0.09 m = 90 mm……；从 0.009 米变成 0.09 米，长度扩大到原来的多少倍 */
const STAFF = ['0.009', '0.09', '0.9', '9']
function staffQ(kpId: string, d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    const i = rng.int(0, 3)
    const v = 9 * 10 ** i
    return intQ(kpId, d, `staff-mm-${i}`, [T('conv', { n: STAFF[i]!, a: K('u.m'), b: K('u.mm') })], v, rng, [v * 10, v >= 90 ? v / 10 : 900, 9], 99999)
  }
  const i = rng.int(0, 2)
  const j = d === 1 ? i + 1 : rng.int(i + 1, 3)
  const v = 10 ** (j - i)
  return intQ(kpId, d, `staff-x-${i}-${j}`, [T('staffTimes', { a: STAFF[i]!, b: STAFF[j]! })], v, rng, [v * 10, v === 10 ? 100 : v / 10, j - i], 99999)
}

/** 做一做（p44）、练习十一 1、整理和复习 3：圈里的数同方框里的数比较，大小有什么变化 */
const CHANGE: [string, string][] = [
  ['0.372', '372'],
  ['0.372', '3.72'],
  ['0.372', '37.2'],
  ['506', '0.506'],
  ['506', '50.6'],
  ['506', '5.06'],
  ['506', '0.0506'],
  ['6.25', '62.5'],
  ['6.25', '0.625'],
  ['6.25', '625'],
  ['6.25', '0.0625'],
  ['3.54', '354'],
  ['3.54', '0.354'],
  ['3.54', '35.4'],
  ['3.54', '0.0354'],
  ['3.54', '3540'],
]
/** b 是 a 的 10 的几次方（a、b 的数字相同，只是小数点不同） */
function powBetween(a: string, b: string): number {
  for (let e = -4; e <= 4; e++) if (shiftPoint(a, e) === norm(b)) return e
  throw new Error(`${a} 和 ${b} 不是小数点移动的关系`)
}
function changeQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const [a, b] = rng.pick(CHANGE)
  const e = powBetween(a, b)
  const near = [-e, e + (e > 0 ? 1 : -1), e - (e > 0 ? 1 : -1), e > 0 ? -e - 1 : -e + 1].filter((x) => x !== 0 && x !== e && Math.abs(x) <= 4)
  return keyQ(kpId, d, `chg-${a}-${b}`, [T('change', { a, b })], changeName(e), uniq(near).map(changeName), rng)
}

/** 例 2、做一做：乘 / 除以 10、100、1000（得数是整数的用键盘）；有时写成「扩大到原数的 100 倍」「缩小到原数的百分之一」 */
const MUL_BASE = ['0.07', '4.8', '0.735', '12.6', '2.63', '0.85', '1.63', '3.14', '0.03', '4.35', '0.6', '1.5']
const DIV_BASE = ['3.2', '93.5', '500', '9999', '42', '3.6', '30.5', '15.3', '48.3', '6', '72']
function shiftCalcQ(kpId: string, d: Difficulty, rng: RNG, mul = rng.chance(0.5)): Question {
  const x = rng.pick(mul ? MUL_BASE : DIV_BASE)
  const e = rng.int(1, 3)
  const n = 10 ** e
  const r = shiftPoint(x, mul ? e : -e)
  const words = rng.chance(0.3)
  const stem: StemPart[] = words ? [T(mul ? 'mulTimes' : 'divPart', mul ? { x, n } : { x, f: partName(e) })] : [{ kind: 'expr', expr: `${x} ${mul ? '×' : '÷'} ${n} = ?` }]
  const sig = `${mul ? 'mul' : 'div'}-${words ? 'w' : 'e'}-${x}-${e}`
  if (!r.includes('.')) {
    const v = Number(r)
    return intQ(kpId, d, sig, stem, v, rng, [Number(shiftPoint(x, mul ? e + 1 : -e + 1)), Number(shiftPoint(x, mul ? e - 1 : -e - 1)), Number(shiftPoint(x, mul ? -e : e))].filter((y) => Number.isInteger(y)), 999999)
  }
  return decQ(kpId, d, sig, stem, r, [shiftPoint(x, mul ? e + 1 : -e - 1), shiftPoint(x, mul ? e - 1 : -e + 1), shiftPoint(x, mul ? -e : e)], rng)
}

/** 练习十一 5：把 3.6 的小数点向左移动一位、把 3.14 的小数点向右移动两位 */
const MOVES: [string, 'r' | 'l', number][] = [
  ['3.6', 'l', 1],
  ['3.14', 'r', 2],
  ['0.03', 'r', 3],
  ['4.2', 'l', 2],
  ['5.08', 'r', 1],
  ['0.4', 'l', 2],
  ['12.5', 'r', 2],
  ['7.29', 'l', 1],
  ['0.256', 'r', 2],
  ['8.6', 'l', 1],
]
function moveQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const [x, dir, k] = rng.pick(MOVES)
  const e = dir === 'r' ? k : -k
  const r = shiftPoint(x, e)
  const stem = [T('move', { x, m: K(`move.${dir}${k}`) })]
  if (!r.includes('.')) return intQ(kpId, d, `move-${x}-${dir}${k}`, stem, Number(r), rng, [Number(shiftPoint(x, e + 1)), Number(shiftPoint(x, e - 1))].filter((y) => Number.isInteger(y)), 999999)
  return decQ(kpId, d, `move-${x}-${dir}${k}`, stem, r, [shiftPoint(x, -e), shiftPoint(x, e + 1), shiftPoint(x, e - 1)], rng)
}

/** 练习十一 5(3)(4)、练习十四 4：把 0.03 扩大到它的多少倍是 30（键盘）、把 42 缩小到它的几分之一是 0.042（选项） */
const TIMES_TO: [string, string][] = [
  ['0.03', '30'],
  ['0.25', '25'],
  ['0.001', '0.1'],
  ['4.8', '48'],
  ['0.07', '7'],
  ['1.2', '120'],
]
const PART_TO: [string, string][] = [
  ['42', '0.042'],
  ['30.5', '3.05'],
  ['15.3', '0.153'],
  ['500', '0.5'],
  ['3.2', '0.32'],
  ['9999', '9.999'],
]
function howManyQ(kpId: string, d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    const [a, b] = rng.pick(TIMES_TO)
    const e = powBetween(a, b)
    return intQ(kpId, d, `to-${a}-${b}`, [T('timesTo', { a, b })], 10 ** e, rng, [10 ** (e + 1), e > 1 ? 10 ** (e - 1) : 100, e], 99999)
  }
  const [a, b] = rng.pick(PART_TO)
  const e = -powBetween(a, b)
  return keyQ(kpId, d, `pt-${a}-${b}`, [T('partTo', { a, b })], partName(e), [1, 2, 3, 4].filter((x) => x !== e).map(partName), rng)
}

/** 练习十一 2：商品的总价（橡皮 2.63 元、练习本 0.85 元、直尺 1.63 元，买 10、100、1000 个） */
const GOODS: [string, string][] = [
  ['eraser', '2.63'],
  ['book', '0.85'],
  ['ruler', '1.63'],
]
function totalQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const [g, p] = rng.pick(GOODS)
  const e = rng.int(1, 3)
  const n = 10 ** e
  const r = shiftPoint(p, e)
  const stem = [T(`buy.${g}`, { p, n })]
  if (!r.includes('.')) return intQ(kpId, d, `buy-${g}-${n}`, stem, Number(r), rng, [Number(shiftPoint(p, e + 1)), Number(shiftPoint(p, e - 1))].filter((y) => Number.isInteger(y)), 999999)
  return decQ(kpId, d, `buy-${g}-${n}`, stem, r, [shiftPoint(p, e + 1), shiftPoint(p, e - 1), shiftPoint(p, -e)], rng)
}

/** 练习十一 3：连着乘、除以 10、100、1000（4.35 × 10 ÷ 100 × 1000） */
const CHAIN_BASE = ['4.35', '0.08', '0.67', '2.5', '0.36', '7.2']
function chainQ(kpId: string, d: Difficulty, rng: RNG): Question {
  for (;;) {
    const x = rng.pick(CHAIN_BASE)
    const ops = Array.from({ length: 3 }, () => (rng.chance(0.5) ? 1 : -1) * rng.int(1, 3))
    const e = ops.reduce((s, o) => s + o, 0)
    const r = shiftPoint(x, e)
    if (placesOf(r) > 4 || r.length > 7 || e === 0) continue
    const expr = `${x} ${ops.map((o) => `${o > 0 ? '×' : '÷'} ${10 ** Math.abs(o)}`).join(' ')} = ?`
    const sig = `chain-${x}-${ops.join('.')}`
    if (!r.includes('.')) return intQ(kpId, d, sig, [{ kind: 'expr', expr }], Number(r), rng, [Number(shiftPoint(x, e + 1)), Number(shiftPoint(x, e - 1))].filter((y) => Number.isInteger(y)), 999999)
    return decQ(kpId, d, sig, [{ kind: 'expr', expr }], r, [shiftPoint(x, e + 1), shiftPoint(x, e - 1), shiftPoint(x, -e)], rng)
  }
}

/** 练习十一 4：0.729 怎样变成 7.29（乘 10 / 除以 10 / 乘 100……） */
const FANS: [string, string][] = [
  ['0.729', '7.29'],
  ['72.9', '7.29'],
  ['7290', '7.29'],
  ['0.0729', '7.29'],
  ['48.3', '4.83'],
  ['48.3', '483'],
  ['48.3', '0.483'],
  ['48.3', '4830'],
]
function fanQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const [a, b] = rng.pick(FANS)
  const e = powBetween(a, b)
  const op = (x: number): LStr => K(x > 0 ? 'opMul' : 'opDiv', { n: 10 ** Math.abs(x) })
  const near = [-e, e + (e > 0 ? 1 : -1), e - (e > 0 ? 1 : -1), e > 0 ? -e - 1 : -e + 1].filter((x) => x !== 0 && x !== e && Math.abs(x) <= 3)
  return keyQ(kpId, d, `fan-${a}-${b}`, [T('fan', { a, b })], op(e), uniq(near).map(op), rng)
}

const SHIFT: Record<Difficulty, [number, Maker][]> = {
  // 第 1 档：例 1 金箍棒与规律的两个框、做一做（大小有什么变化）、例 2 乘 / 除以 10、100、1000 与做一做；练习十一 1 / 5
  1: [
    [14, (d, rng) => ruleShiftQ(KP_SHIFT, d, rng)],
    [8, (d, rng) => staffQ(KP_SHIFT, d, rng)],
    [16, (d, rng) => changeQ(KP_SHIFT, d, rng)],
    [20, (d, rng) => shiftCalcQ(KP_SHIFT, d, rng, true)],
    [20, (d, rng) => shiftCalcQ(KP_SHIFT, d, rng, false)],
    [12, (d, rng) => moveQ(KP_SHIFT, d, rng)],
    [10, (d, rng) => howManyQ(KP_SHIFT, d, rng)],
  ],
  2: [
    [14, (d, rng) => shiftCalcQ(KP_SHIFT, d, rng)],
    [12, (d, rng) => changeQ(KP_SHIFT, d, rng)],
    [15, (d, rng) => totalQ(KP_SHIFT, d, rng)],
    [15, (d, rng) => chainQ(KP_SHIFT, d, rng)],
    [15, (d, rng) => fanQ(KP_SHIFT, d, rng)],
    [15, (d, rng) => howManyQ(KP_SHIFT, d, rng)],
    [14, (d, rng) => moveQ(KP_SHIFT, d, rng)],
  ],
  3: [
    [30, (d, rng) => chainQ(KP_SHIFT, d, rng)],
    [25, (d, rng) => fanQ(KP_SHIFT, d, rng)],
    [25, (d, rng) => howManyQ(KP_SHIFT, d, rng)],
    [20, (d, rng) => totalQ(KP_SHIFT, d, rng)],
  ],
}
defineGenerator(KP_SHIFT, (d, rng) => pickBy(rng, SHIFT[d], d))

// ═════════════════════════════════════════════════════════════
// 6. 小数与单位换算（例 1、做一做、例 2、做一做；练习十二；练习十三 8、练习十四 3）
// ═════════════════════════════════════════════════════════════

/** 单位：长度、质量、面积、人民币；RATE[低>高] = 进率 */
type U = 'mm' | 'cm' | 'dm' | 'm' | 'km' | 'g' | 'kg' | 't' | 'dm2' | 'm2' | 'ha' | 'km2'
const RATE: Record<string, number> = {
  'mm>cm': 10,
  'cm>dm': 10,
  'dm>m': 10,
  'mm>dm': 100,
  'cm>m': 100,
  'mm>m': 1000,
  'm>km': 1000,
  'g>kg': 1000,
  'kg>t': 1000,
  'dm2>m2': 100,
  'ha>km2': 100,
}
const rateOf = (lo: U, hi: U): number => {
  const r = RATE[`${lo}>${hi}`]
  if (!r) throw new Error(`没有 ${lo} 到 ${hi} 的进率`)
  return r
}
const uName = (u: U): LStr => K(`u.${u}`)

/** 例 1、做一做、练习十二 1 / 4 / 8：低级单位的数改写成用高级单位作单位（80 厘米 = 0.8 米） */
const LOW_HIGH: [string, U, U][] = [
  ['80', 'cm', 'm'],
  ['24', 'dm', 'm'],
  ['1450', 'g', 'kg'],
  ['13', 'cm', 'dm'],
  ['86', 'g', 'kg'],
  ['109', 'dm', 'm'],
  ['5350', 'm', 'km'],
  ['1980', 'kg', 't'],
  ['120', 'cm', 'm'],
  ['95', 'cm', 'm'],
  ['45', 'cm', 'm'],
  ['350', 'm', 'km'],
  ['40', 'kg', 't'],
  ['600', 'g', 'kg'],
  ['75', 'cm', 'm'],
  ['8', 'cm', 'm'],
  ['250', 'g', 'kg'],
  ['1200', 'm', 'km'],
  ['36', 'mm', 'm'],
  ['5', 'mm', 'cm'],
]
function lowHighQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const [n, lo, hi] = rng.pick(LOW_HIGH)
  const e = EXP[rateOf(lo, hi)]!
  const c = shiftPoint(n, -e)
  const cands = [shiftPoint(n, -e + 1), shiftPoint(n, -e - 1), e === 1 ? shiftPoint(n, -2) : shiftPoint(n, -1)]
  return decQ(kpId, d, `lh-${n}-${lo}-${hi}`, [T('conv', { n, a: uName(lo), b: uName(hi) })], c, cands, rng)
}

/** 例 1 想一想、做一做、练习十二 8：复名数改写成小数（1 米 45 厘米 = 1.45 米、8 吨 40 千克 = 8.04 吨——中间的 0 别漏） */
const COMPOUND: [number, U, number, U][] = [
  [1, 'm', 45, 'cm'],
  [6, 'km', 350, 'm'],
  [8, 't', 40, 'kg'],
  [42, 'km', 195, 'm'],
  [3, 'kg', 600, 'g'],
  [2, 'm', 5, 'cm'],
  [5, 'kg', 80, 'g'],
  [1, 't', 30, 'kg'],
  [4, 'm', 35, 'cm'],
  [5, 'm', 70, 'cm'],
  [10, 'kg', 800, 'g'],
  [4, 'km', 800, 'm'],
  [3, 'km', 50, 'm'],
  [2, 'km', 860, 'm'],
]
function compoundQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const [a, ua, b, ub] = rng.pick(COMPOUND)
  const e = EXP[rateOf(ub, ua)]!
  const c = fromU4(u4(String(a)) + u4(shiftPoint(String(b), -e)))
  // 常见错：中间的 0 漏写（8 吨 40 千克写成 8.4 吨）、0 写多了（8.004）、小数点点错一位
  const cands = [`${a}.${b}`, `${a}.${'0'.repeat(Math.max(0, e - String(b).length) + 1)}${b}`, shiftPoint(c, 1), shiftPoint(c, -1)]
  return decQ(kpId, d, `cp-${a}${ua}${b}${ub}`, [T('compound', { a, ua: uName(ua), b, ub: uName(ub) })], c, cands, rng)
}

/** 例 2、做一做、练习十二 2 / 4：高级单位的小数改写成低级单位（0.95 米 = 95 厘米，得数是整数，用键盘） */
const HIGH_LOW: [string, U, U][] = [
  ['0.95', 'm', 'cm'],
  ['1.32', 'm', 'cm'],
  ['0.3', 'kg', 'g'],
  ['3.7', 't', 'kg'],
  ['2.63', 'km', 'm'],
  ['0.86', 'm2', 'dm2'],
  ['1.09', 'm', 'mm'],
  ['2.56', 't', 'kg'],
  ['2.3', 'kg', 'g'],
  ['4.6', 'm', 'dm'],
  ['7.5', 'kg', 'g'],
  ['8.2', 't', 'kg'],
  ['0.75', 't', 'kg'],
  ['0.35', 't', 'kg'],
  ['1.35', 't', 'kg'],
  ['1.2', 'm', 'cm'],
  ['0.5', 'km', 'm'],
]
function highLowQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const [x, hi, lo] = rng.pick(HIGH_LOW)
  const e = EXP[rateOf(lo, hi)]!
  const v = Number(shiftPoint(x, e))
  const wrongs = [shiftPoint(x, e + 1), shiftPoint(x, e - 1), shiftPoint(x, e === 1 ? 2 : 1)].map(Number).filter((y) => Number.isInteger(y))
  return intQ(kpId, d, `hl-${x}-${hi}-${lo}`, [T('conv', { n: x, a: uName(hi), b: uName(lo) })], v, rng, wrongs, 99999)
}

/** 练习十二 2、练习十三 8：小数改写成复名数（2.95 元是 2 元几角 5 分、25.52 米是 25 米多少厘米），键盘 */
const TO_COMPOUND: [string, string][] = [
  ['yjf', '2.95'],
  ['yjf', '3.48'],
  ['yjf', '6.25'],
  ['yjf', '1.37'],
  ['mcm', '25.52'],
  ['mcm', '1.45'],
  ['mcm', '4.35'],
  ['mcm', '2.08'],
  ['kgg', '3.6'],
  ['kgg', '2.05'],
  ['kgg', '1.25'],
  ['tkg', '8.04'],
  ['tkg', '1.03'],
  ['tkg', '2.5'],
]
function toCompoundQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const [kind, x] = rng.pick(TO_COMPOUND)
  const [ip, fp = ''] = x.split('.')
  if (kind === 'yjf') {
    const [j, f] = [Number(fp[0]), Number(fp[1] ?? 0)]
    return intQ(kpId, d, `tc-${x}`, [T('tc.yjf', { x, a: Number(ip), c: f })], j, rng, [f, j * 10 + f, j + 1], 99)
  }
  const e = kind === 'mcm' ? 2 : 3
  const v = Number(fp.padEnd(e, '0'))
  return intQ(kpId, d, `tc-${x}`, [T(`tc.${kind}`, { x, a: Number(ip) })], v, rng, [Number(fp), v * 10, v / 10 >= 1 && Number.isInteger(v / 10) ? v / 10 : v + 1], 9999)
}

/** 课本 p46 引入：四个小朋友的身高（80 cm、1 m 45 cm、1.32 m、0.95 m），谁最高 / 最矮 */
const HEIGHT_SETS: string[][] = [
  ['80 cm', '1 m 45 cm', '1.32 m', '0.95 m'],
  ['1.28 m', '1 m 3 cm', '125 cm', '0.99 m'],
  ['1.4 m', '135 cm', '1 m 42 cm', '1.09 m'],
]
const HEIGHT_CM = (s: string): number => {
  const m = /^(\d+) m (\d+) cm$/.exec(s)
  if (m) return Number(m[1]) * 100 + Number(m[2])
  if (s.endsWith(' cm')) return Number(s.slice(0, -3))
  return u4(s.slice(0, -2)) / 100
}
const KIDS = ['ming', 'hong', 'li', 'jun'] as const
function heightQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const set = rng.pick(HEIGHT_SETS)
  const vals = rng.shuffle(set)
  const tall = rng.chance(0.5)
  const cms = vals.map(HEIGHT_CM)
  const at = cms.indexOf(tall ? Math.max(...cms) : Math.min(...cms))
  const rows: (number | LStr | null)[][] = [
    [K('head.name'), ...KIDS.map((w) => K(`who.${w}`))],
    [K('head.height'), ...vals],
  ]
  return keyQ(kpId, d, `ht-${tall ? 'max' : 'min'}-${vals.join(',')}`, [T(tall ? 'tallest' : 'shortest'), { kind: 'stat-table', rows, head: 'both' }], K(`who.${KIDS[at]}`), KIDS.filter((_, i) => i !== at).map((w) => K(`who.${w}`)), rng)
}

/** 例 2 做一做 2：五种动物的体重（海豚 228 kg、北极熊 0.75 t、企鹅 35 kg、海豹 0.35 t、白鲸 1.35 t），谁的体重最大 / 最小、谁比谁大 */
const ANIMALS: [string, string][] = [
  ['dolphin', '228 kg'],
  ['polar', '0.75 t'],
  ['penguin', '35 kg'],
  ['seal', '0.35 t'],
  ['beluga', '1.35 t'],
]
const animalKg = (s: string): number => (s.endsWith(' t') ? u4(s.slice(0, -2)) / 10 : u4(s.slice(0, -3)) / 1e4)
function animalQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const rows: (number | LStr | null)[][] = [[K('head.animal'), K('head.weight')], ...ANIMALS.map(([id, w]) => [K(`animal.${id}`), w])]
  const table: StemPart = { kind: 'stat-table', rows, head: 'row' }
  const kind = rng.int(0, 2)
  if (kind < 2) {
    const max = kind === 0
    const sorted = [...ANIMALS].sort((x, y) => animalKg(y[1]) - animalKg(x[1]))
    const ans = (max ? sorted[0] : sorted[sorted.length - 1])![0]
    const others = rng.shuffle(ANIMALS.filter(([id]) => id !== ans)).slice(0, 3)
    return keyQ(kpId, d, `animal-${max ? 'max' : 'min'}-${others.map((o) => o[0]).sort().join('.')}`, [T(max ? 'animalMax' : 'animalMin'), table], K(`animal.${ans}`), others.map(([id]) => K(`animal.${id}`)), rng)
  }
  const [a, b] = rng.shuffle(ANIMALS).slice(0, 2) as [[string, string], [string, string]]
  const ans = animalKg(a[1]) > animalKg(b[1]) ? a[0] : b[0]
  return keyQ(kpId, d, `animal-pair-${a[0]}-${b[0]}`, [T('animalPair', { a: K(`animal.${a[0]}`), b: K(`animal.${b[0]}`) }), table], K(`animal.${ans}`), [K(`animal.${ans === a[0] ? b[0] : a[0]}`)], rng)
}

/** 练习十二 5、整理和复习 2、练习十四 7：不同单位的比大小（3.61 米 ○ 362 厘米） */
const CMP_UNITS: [string, U, string, U][] = [
  ['3.61', 'm', '362', 'cm'],
  ['284', 'g', '0.284', 'kg'],
  ['1480', 'm', '1.5', 'km'],
  ['532', 'cm', '5.3', 'm'],
  ['570', 'cm', '5.70', 'm'],
  ['70', 'g', '0.7', 'kg'],
  ['1.09', 'm', '109', 'cm'],
  ['2.5', 'kg', '2050', 'g'],
  ['0.8', 't', '800', 'kg'],
  ['45', 'dm', '4.05', 'm'],
  ['694', 'cm', '6.98', 'm'],
  ['0.24', 'm', '14', 'cm'],
]
/** 换成两个单位里小的那个的数 */
function toUnit(x: string, from: U, to: U): string {
  if (from === to) return x
  if (RATE[`${to}>${from}`]) return shiftPoint(x, EXP[RATE[`${to}>${from}`]!]!)
  return shiftPoint(x, -EXP[rateOf(from, to)]!)
}
function cmpUnitsQ(kpId: string, d: Difficulty, rng: RNG): Question {
  let [a, ua, b, ub] = rng.pick(CMP_UNITS)
  if (rng.chance(0.5)) [a, ua, b, ub] = [b, ub, a, ua]
  const small: U = RATE[`${ua}>${ub}`] ? ua : ub
  return cmpQ(kpId, d, `cu-${a}${ua}-${b}${ub}`, [T('compare'), T('cmpU', { a, ua: uName(ua), b, ub: uName(ub) })], toUnit(a, ua, small), toUnit(b, ub, small), rng, 'compare')
}

/** 练习十二 3、练习十七 3：盘秤（0–5 kg，每 0.5 kg 一个数，每小格 0.05 kg）上的东西有多少千克 / 多少克 */
const SCALE_VALS = ['0.8', '1.5', '3.6', '2.4', '4.2', '0.35', '0.95', '1.15', '2.75', '3.05']
function scaleQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const v = rng.pick(d === 1 ? SCALE_VALS.slice(0, 5) : SCALE_VALS)
  const dial: StemPart = { kind: 'scale', max: 5, major: 0.5, minor: 10, value: Number(v), unit: 'kg' }
  if (rng.chance(0.45)) {
    const g = Number(shiftPoint(v, 3))
    return intQ(kpId, d, `scale-g-${v}`, [T('scaleG'), dial], g, rng, [g / 10, g * 10, g + 50], 99999)
  }
  // 常见错：小格数错了一两格（每小格 0.05 千克）、看错了相邻的数（差 0.5 千克）
  return decQ(kpId, d, `scale-kg-${v}`, [T('scaleKg'), dial], v, [fromU4(u4(v) + 500), fromU4(Math.max(0, u4(v) - 500)), fromU4(u4(v) + 1000), fromU4(u4(v) + 5000)], rng)
}

/** 练习十二 6：四种动物奔跑的速度（大象 0.4 千米/分、野兔 1200 米/分、马 1170 米/分、猎豹 1.85 千米/分），谁快谁慢 */
const SPEEDS: [string, string, 'km' | 'm'][] = [
  ['elephant', '0.4', 'km'],
  ['hare', '1200', 'm'],
  ['horse', '1170', 'm'],
  ['cheetah', '1.85', 'km'],
]
const speedM = ([, v, u]: [string, string, 'km' | 'm']): number => (u === 'km' ? u4(shiftPoint(v, 3)) : u4(v))
function speedQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const rows: (number | LStr | null)[][] = [[K('head.animal'), K('head.speed')], ...SPEEDS.map(([id, v, u]) => [K(`animal.${id}`), K(u === 'km' ? 'kmPerMin' : 'mPerMin', { n: v })])]
  const table: StemPart = { kind: 'stat-table', rows, head: 'row' }
  const kind = rng.int(0, 2)
  if (kind < 2) {
    const fast = kind === 0
    const sorted = [...SPEEDS].sort((x, y) => speedM(y) - speedM(x))
    const ans = (fast ? sorted[0] : sorted[sorted.length - 1])![0]
    return keyQ(kpId, d, `speed-${fast ? 'fast' : 'slow'}`, [T(fast ? 'fastest' : 'slowest'), table], K(`animal.${ans}`), SPEEDS.filter(([id]) => id !== ans).map(([id]) => K(`animal.${id}`)), rng)
  }
  const [a, b] = rng.shuffle(SPEEDS).slice(0, 2) as [[string, string, 'km' | 'm'], [string, string, 'km' | 'm']]
  const ans = speedM(a) > speedM(b) ? a[0] : b[0]
  return keyQ(kpId, d, `speed-pair-${a[0]}-${b[0]}`, [T('fasterPair', { a: K(`animal.${a[0]}`), b: K(`animal.${b[0]}`) }), table], K(`animal.${ans}`), [K(`animal.${ans === a[0] ? b[0] : a[0]}`)], rng)
}

/** 练习十二 8、练习十四 3：按照要求改写数据（潜水器 10909 米、嫦娥五号 8.2 吨、马拉松 42 千米 195 米、轮船 2150000 千克、马里亚纳海沟 11034 米） */
function dataQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const kind = rng.pick(['dive', 'probe', 'marathon', 'ship', 'trench'] as const)
  if (kind === 'probe') return intQ(kpId, d, 'data-probe', [T('data.probe')], 8200, rng, [820, 82000, 8020], 99999)
  if (kind === 'ship') return intQ(kpId, d, 'data-ship', [T('data.ship')], 2150, rng, [21500, 215, 2150000], 9999999)
  const [c, cands] = kind === 'dive' ? ['10.909', ['109.09', '1.0909', '10.99']] : kind === 'trench' ? ['11.034', ['110.34', '1.1034', '11.34']] : ['42.195', ['42.95', '421.95', '4.2195']]
  return decQ(kpId, d, `data-${kind}`, [T(`data.${kind}`)], c, cands, rng)
}

/** 练习十二 9：声音每秒传播 340 米，每分钟传播多少千米（340 × 60 = 20400 米 = 20.4 千米） */
function soundQ(kpId: string, d: Difficulty, rng: RNG): Question {
  return decQ(kpId, d, 'sound', [T('sound')], '20.4', ['0.34', '204', '2.04', '20.04'], rng)
}

/** 练习十四 3 / 7：公顷和平方千米（44 公顷 = 0.44 平方千米、12.52 平方千米 = 1252 公顷） */
function areaQ(kpId: string, d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) return decQ(kpId, d, 'area-ha', [T('area.ha')], '0.44', ['4.4', '0.044', '440'], rng)
  return intQ(kpId, d, 'area-km2', [T('conv', { n: '12.52', a: uName('km2'), b: uName('ha') })], 1252, rng, [125, 12520, 1252000], 9999999)
}

const UNITS: Record<Difficulty, [number, Maker][]> = {
  // 第 1 档：引入的身高排序、例 1 低级单位改写成高级单位与复名数改写、做一做；例 2 高级单位改写成低级单位、做一做 1 / 2；练习十二 2 / 5
  1: [
    [22, (d, rng) => lowHighQ(KP_UNITS, d, rng)],
    [18, (d, rng) => compoundQ(KP_UNITS, d, rng)],
    [20, (d, rng) => highLowQ(KP_UNITS, d, rng)],
    [10, (d, rng) => heightQ(KP_UNITS, d, rng)],
    [8, (d, rng) => animalQ(KP_UNITS, d, rng)],
    [8, (d, rng) => toCompoundQ(KP_UNITS, d, rng)],
    [8, (d, rng) => cmpUnitsQ(KP_UNITS, d, rng)],
    [6, (d, rng) => scaleQ(KP_UNITS, d, rng)],
  ],
  2: [
    [20, (d, rng) => cmpUnitsQ(KP_UNITS, d, rng)],
    [18, (d, rng) => scaleQ(KP_UNITS, d, rng)],
    [15, (d, rng) => toCompoundQ(KP_UNITS, d, rng)],
    [15, (d, rng) => speedQ(KP_UNITS, d, rng)],
    [15, (d, rng) => dataQ(KP_UNITS, d, rng)],
    [9, (d, rng) => lowHighQ(KP_UNITS, d, rng)],
    [8, (d, rng) => compoundQ(KP_UNITS, d, rng)],
  ],
  3: [
    [25, (d, rng) => soundQ(KP_UNITS, d, rng)],
    [25, (d, rng) => dataQ(KP_UNITS, d, rng)],
    [25, (d, rng) => areaQ(KP_UNITS, d, rng)],
    [25, (d, rng) => speedQ(KP_UNITS, d, rng)],
  ],
}
defineGenerator(KP_UNITS, (d, rng) => pickBy(rng, UNITS[d], d))

// ═════════════════════════════════════════════════════════════
// 7. 小数的近似数（例 1、做一做；例 2、例 3、做一做（改写成用「万」「亿」作单位）；练习十三；整理和复习 4、练习十四 5 / 6）
// ═════════════════════════════════════════════════════════════

/** 课本里要求近似数的小数（例 1 的 0.984、做一做、练习十三 1 / 5、整理和复习 4、练习十四 6） */
const ROUND_POOL = ['0.984', '0.256', '12.006', '1.0987', '3.72', '0.58', '9.0548', '9.956', '0.905', '51.463', '1.995', '3.47', '0.239', '4.08', '5.344', '6.268', '0.402', '1.96', '2.104', '3.054', '20.0463', '0.596', '3.007']
const KEEP_NAMES = ['keep.0', 'keep.1', 'keep.2']

/**
 * 求近似数（选项照写：末尾的 0 不能去掉）：干扰项——该进没进 / 不该进进了、末尾的 0 去掉了（1.0 写成 1）、保留错了位数；
 * 保留整数的得数是整数，用键盘
 */
function roundQ(kpId: string, d: Difficulty, rng: RNG): Question {
  for (;;) {
    const x = rng.pick(ROUND_POOL)
    const p = rng.int(0, 2)
    if (placesOf(x) <= p) continue
    const c = roundAt(x, p)
    if (c === '0') continue // 0.256 保留整数是 0：课本没有这样的题
    const style = d >= 2 && p === 2 && rng.chance(0.3) ? 'omit' : rng.chance(0.25) ? 'acc' : 'keep'
    const stem = [style === 'omit' ? T('roundOmit', { x }) : style === 'acc' ? T('roundAcc', { x, p: placeName(p === 0 ? 0 : -p) }) : T('roundKeep', { x, k: K(KEEP_NAMES[p]!) })]
    const sig = `rd-${style}-${x}-${p}`
    if (p === 0) return intQ(kpId, d, sig, stem, Number(c), rng, [Number(roundAt(x, 0, false)), Number(roundAt(x, 0, false)) + 1, Math.round(Number(x) * 10)], 9999)
    const cands = [otherWay(x, p), norm(c) !== c ? norm(c) : null, roundAt(x, p + 1), p > 1 ? roundAt(x, p - 1) : null]
    return decQ(kpId, d, sig, stem, c, cands, rng, { form: true })
  }
}

/** 例 1：保留两位小数要看哪一位（千分位）；看的那一位是几，舍还是入 */
function lookQ(kpId: string, d: Difficulty, rng: RNG): Question {
  for (;;) {
    const x = rng.pick(ROUND_POOL)
    const p = rng.int(0, 2)
    if (placesOf(x) <= p) continue
    const look = -(p + 1)
    if (rng.chance(0.5)) return keyQ(kpId, d, `look-${x}-${p}`, [T('look', { x, k: K(KEEP_NAMES[p]!) })], placeName(look), [0, -1, -2, -3].filter((q) => q !== look).map(placeName), rng)
    const digit = Number(x.split('.')[1]![p])
    const ru = digit >= 5
    return keyQ(kpId, d, `sr-${x}-${p}`, [T('sheRu', { x, k: K(KEEP_NAMES[p]!), n: digit })], K(ru ? 'ru' : 'she'), [K(ru ? 'she' : 'ru')], rng)
  }
}

/** p50 正文：保留整数 / 一位 / 两位小数表示精确到哪一位；精确到十分位就是保留几位小数 */
function precisionQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const p = rng.int(0, 2)
  if (rng.chance(0.55)) return keyQ(kpId, d, `prec-${p}`, [T('precPlace', { k: K(KEEP_NAMES[p]!) })], placeName(p === 0 ? 0 : -p), [0, -1, -2, -3].filter((q) => q !== (p === 0 ? 0 : -p)).map(placeName), rng)
  const q = rng.int(1, 3)
  return intQ(kpId, d, `prec-n-${q}`, [T('precKeep', { p: placeName(-q) })], q, rng, [q + 1, q - 1 >= 0 ? q - 1 : 4, 10 ** q], 99)
}

/** 说法对不对（例 1 注意、练习十三 6、练习十四 5） */
const ROUND_TF: [string, boolean][] = [
  ['keep0', true],
  ['d0596', false],
  ['d356', false],
  ['d605', true],
  ['d3007', true],
  ['d529', true],
  ['d632', true],
  ['d520', true],
  ['dropEnd', false],
]
function roundTfQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const [id, ok] = rng.pick(ROUND_TF)
  return tfQ(kpId, d, `rtf-${id}`, [T(`rtf.${id}`)], ok, rng)
}

/** 改写成用「万」「亿」作单位的数（例 2、做一做、练习十三 3、练习十四 3）：= ?万 / = ?亿（准确，用「=」），选项是小数 */
const TO_WAN: [string, 'wan' | 'yi'][] = [
  ['384400', 'wan'],
  ['89921000', 'wan'],
  ['254700', 'wan'],
  ['35990', 'wan'],
  ['33900', 'wan'],
  ['778330000', 'yi'],
  ['3660000000', 'yi'],
  ['13010000000', 'yi'],
  ['270000000', 'yi'],
  ['660000000', 'yi'],
  ['6006000000', 'yi'],
]
const unitE = (u: 'wan' | 'yi'): number => (u === 'wan' ? 4 : 8)
function wanQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const [n, u] = rng.pick(TO_WAN)
  const e = unitE(u)
  const c = shiftPoint(n, -e)
  const cands = [shiftPoint(n, -e + 1), shiftPoint(n, -e - 1), u === 'yi' ? shiftPoint(n, -4) : shiftPoint(n, -3), String(Number(n.slice(0, -e)) || n.slice(0, 1))]
  return decQ(kpId, d, `wan-${n}`, [T(u === 'wan' ? 'toWan' : 'toYi'), { kind: 'big-num', n, rel: '=', rhs: '?', unit: u }], c, cands, rng)
}

/** 例 3、做一做、练习十三 4 / 7、整理和复习 4、练习十四 6：先改写成用「万」「亿」作单位的数，再保留一位 / 两位小数（≈，末尾的 0 不能去掉） */
const WAN_ROUND: [string, 'wan' | 'yi', number][] = [
  ['778330000', 'yi', 1],
  ['184965000', 'yi', 2],
  ['1443497378', 'yi', 1],
  ['35990', 'wan', 2],
  ['254700', 'wan', 1],
  ['299792', 'wan', 1],
  ['2870990000', 'yi', 1],
]
function wanRoundQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const [n, u, p] = rng.pick(WAN_ROUND)
  const x = shiftPoint(n, -unitE(u))
  const c = roundAt(x, p)
  const cands = [otherWay(x, p), norm(c) !== c ? norm(c) : null, roundAt(shiftPoint(x, 1), p), roundAt(x, p + 1), roundAt(shiftPoint(x, -1), p)]
  return decQ(kpId, d, `wr-${n}-${p}`, [T(u === 'wan' ? 'roundWan' : 'roundYi', { k: K(KEEP_NAMES[p]!) }), { kind: 'big-num', n, rel: '≈', rhs: '?', unit: u }], c, cands, rng, { form: true })
}

/**
 * 练习十三 2 / 7、练习十四 6：课本原句的情境，改写或求近似数。要改写的数和第 1 档一样放在大数卡上（不朗读）、文字里不写——
 * 读出「三十八万四千四百」等于提示了答案（四上大数卡的规矩）；文字只交代是什么、单位是什么。
 */
const CTX_ROUND: { id: string; n: string; u: 'wan' | 'yi'; p?: number }[] = [
  { id: 'moon', n: '384400', u: 'wan' },
  { id: 'fridge', n: '89921000', u: 'wan' },
  { id: 'hainan', n: '33900', u: 'wan' },
  { id: 'jupiter', n: '778330000', u: 'yi', p: 1 },
  { id: 'tv', n: '184965000', u: 'yi', p: 2 },
  { id: 'people', n: '1443497378', u: 'yi', p: 1 },
  { id: 'light', n: '299792', u: 'wan', p: 1 },
  { id: 'taiwan', n: '35990', u: 'wan', p: 2 },
]
function ctxRoundQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const c = rng.pick(CTX_ROUND)
  const x = shiftPoint(c.n, -unitE(c.u))
  const card: StemPart = { kind: 'big-num', n: c.n, rel: c.p === undefined ? '=' : '≈', rhs: '?', unit: c.u }
  if (c.p === undefined) return decQ(kpId, d, `rctx-${c.id}`, [T(`rctx.${c.id}`), card], x, [shiftPoint(x, 1), shiftPoint(x, -1), c.n.slice(0, -unitE(c.u))], rng)
  const a = roundAt(x, c.p)
  return decQ(kpId, d, `rctx-${c.id}`, [T(`rctx.${c.id}`), card], a, [otherWay(x, c.p), norm(a) !== a ? norm(a) : null, roundAt(shiftPoint(x, 1), c.p), roundAt(x, c.p + 1)], rng, { form: true })
}

/** 练习十三 2：这个小数在哪两个相邻的整数之间（较小 / 较大的整数是几）、近似于哪个整数（键盘） */
const BETWEEN = ['5.28', '12.71', '4.86', '7.05', '9.5', '3.49', '0.82', '15.6']
function betweenQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const x = rng.pick(BETWEEN)
  const lo = Number(x.split('.')[0])
  const kind = rng.int(0, 2)
  if (kind === 2) return intQ(kpId, d, `near-${x}`, [T('nearInt', { x })], Number(roundAt(x, 0)), rng, [lo, lo + 1, lo - 1 >= 0 ? lo - 1 : lo + 2], 99)
  return intQ(kpId, d, `btw-${x}-${kind}`, [T(kind === 0 ? 'betweenLo' : 'betweenHi', { x })], kind === 0 ? lo : lo + 1, rng, [kind === 0 ? lo + 1 : lo, lo + 2, lo - 1 >= 0 ? lo - 1 : lo + 3], 99)
}

/** 整理和复习、练习十四：改写用「=」，求近似数用「≈」 */
function relQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const exact = rng.chance(0.5)
  if (exact) {
    const [n, u] = rng.pick(TO_WAN)
    return labelQuestion({ kpId, type: 'decimal', difficulty: d, sig: `rel-${n}`, stem: [T('relAsk'), { kind: 'big-num', n, rel: '?', rhs: shiftPoint(n, -unitE(u)), unit: u }], correct: '=', distractors: ['≈'], rng })
  }
  const [n, u, p] = rng.pick(WAN_ROUND)
  return labelQuestion({ kpId, type: 'decimal', difficulty: d, sig: `rel-${n}-${p}`, stem: [T('relAsk'), { kind: 'big-num', n, rel: '?', rhs: roundAt(shiftPoint(n, -unitE(u)), p), unit: u }], correct: '≈', distractors: ['='], rng })
}

/** 练习十三 10*：哪个两位小数的百分位「四舍」后成为 3.6、「五入」后成为 5.0 */
function boxQ(kpId: string, d: Difficulty, rng: RNG): Question {
  const she = rng.chance(0.5)
  const base = she ? rng.pick(['3.6', '4.2', '7.5', '2.8']) : rng.pick(['5.0', '3.0', '8.0', '6.0'])
  const t = u4(base) / 100 // 以 0.01 为单位
  const two = (h: number): string => `${Math.floor(h / 100)}.${String(h % 100).padStart(2, '0')}`
  if (she) {
    const c = two(t + rng.int(1, 4))
    const wrongs = [two(t - rng.int(1, 5)), two(t + rng.int(5, 9)), two(t + 10 + rng.int(1, 4))]
    return labelQuestion({ kpId, type: 'decimal', difficulty: d, sig: `box-she-${base}-${c}`, stem: [T('boxShe', { x: base })], correct: c, distractors: uniq(wrongs), rng })
  }
  const c = two(t - rng.int(1, 5))
  const wrongs = [two(t + rng.int(1, 4)), two(t - 5 - rng.int(1, 5)), two(t + 5 + rng.int(0, 4))]
  return labelQuestion({ kpId, type: 'decimal', difficulty: d, sig: `box-ru-${base}-${c}`, stem: [T('boxRu', { x: base })], correct: c, distractors: uniq(wrongs), rng })
}

const ROUND: Record<Difficulty, [number, Maker][]> = {
  // 第 1 档：例 1 求近似数（保留整数 / 一位 / 两位小数、看哪一位、舍还是入、精确到哪一位、末尾的 0 不能去掉）与做一做；
  // 例 2 改写成用「万」作单位、例 3 改写成用「亿」作单位再保留一位小数与做一做；练习十三 2
  1: [
    [30, (d, rng) => roundQ(KP_ROUND, d, rng)],
    [10, (d, rng) => lookQ(KP_ROUND, d, rng)],
    [8, (d, rng) => precisionQ(KP_ROUND, d, rng)],
    [6, (d, rng) => roundTfQ(KP_ROUND, d, rng)],
    [16, (d, rng) => wanQ(KP_ROUND, d, rng)],
    [14, (d, rng) => wanRoundQ(KP_ROUND, d, rng)],
    [8, (d, rng) => relQ(KP_ROUND, d, rng)],
    [8, (d, rng) => betweenQ(KP_ROUND, d, rng)],
  ],
  2: [
    [25, (d, rng) => roundQ(KP_ROUND, d, rng)],
    [15, (d, rng) => wanQ(KP_ROUND, d, rng)],
    [15, (d, rng) => wanRoundQ(KP_ROUND, d, rng)],
    [15, (d, rng) => ctxRoundQ(KP_ROUND, d, rng)],
    [15, (d, rng) => roundTfQ(KP_ROUND, d, rng)],
    [15, (d, rng) => betweenQ(KP_ROUND, d, rng)],
  ],
  3: [
    [35, (d, rng) => boxQ(KP_ROUND, d, rng)],
    [25, (d, rng) => ctxRoundQ(KP_ROUND, d, rng)],
    [20, (d, rng) => roundTfQ(KP_ROUND, d, rng)],
    [20, (d, rng) => wanRoundQ(KP_ROUND, d, rng)],
  ],
}
defineGenerator(KP_ROUND, (d, rng) => pickBy(rng, ROUND[d], d))
