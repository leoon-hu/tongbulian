import type { Difficulty, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 数字编码（三上 ☆，p57–60）：公民身份号码由 18 位数字组成——地址码 6 位、出生日期码 8 位（年 4 位、月 2 位、日 2 位）、
// 顺序码 3 位、校验码 1 位（0—10，10 写成 X）；第 17 位分辨性别，单数是男性、双数是女性；邮政编码 6 位，前两位表示省；
// 第一代身份证 15 位（少两位年份码和一位校验码）；书号里有组区号、出版者号、出版序号和校验码。设计学号是活动，不考；
// 第 3 档按题目给的学号方案读信息（方案是编的）。
// 号码只用课本上的，或一眼就是编出来的（地址码是同一个数字重复六遍），不随机拼号码——随机拼的可能正好是真人的号码。
// 号码画在号码条（code-strip）里，不写进题目文字（一长串数字会被当成一个大数来读）。
// ─────────────────────────────────────────────────────────────

export const KP = 'm3s1-06-digit-code'

/** 公民身份号码的校验码：前 17 位按权相加除以 11 的余数对应的码（课本脚注：校验码是根据前 17 位数字确定的） */
const WEIGHTS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
const CHECK_CHARS = '10X98765432'
export function checkCode(first17: string): string {
  const sum = Array.from(first17).reduce((s, ch, i) => s + Number(ch) * WEIGHTS[i]!, 0)
  return CHECK_CHARS[sum % 11]!
}

/** 课本上的两个公民身份号码（p58 的 1880 年那个是男性，p60 的 1949 年那个是女性） */
export const BOOK_IDS = ['440524188001010014', '11010519491231002X']
/** 演示用的号码：地址码是同一个数字重复六遍（没有这样的地区），出生日期、顺序码随手取，校验码按规则算 */
const DEMO_PARTS: [string, string, string][] = [
  ['111111', '20150601', '001'],
  ['222222', '20160808', '002'],
  ['333333', '20171001', '013'],
  ['444444', '20140707', '009'],
  ['555555', '20141225', '024'],
  ['666666', '20180312', '005'],
  ['777777', '20151111', '016'],
  ['888888', '20160520', '027'],
  ['999999', '20170909', '038'],
]
export const DEMO_IDS = DEMO_PARTS.map(([addr, date, seq]) => addr + date + seq + checkCode(addr + date + seq))
export const ALL_IDS = [...BOOK_IDS, ...DEMO_IDS]

/** 公民身份号码的四段：地址码、出生日期码、顺序码、校验码 */
export const ID_SEGS = [6, 8, 3, 1]
const segName = (k: string): LStr => ({ k: `m3.code.seg.${k}` })
export const ID_NAMES: LStr[] = ['addr', 'date', 'seq', 'check'].map(segName)

/** 课本 p58 的邮政编码（湖北省荆门邮区沙洋县五里镇），前两位 44 是省 */
export const POSTCODE = '448268'
/** 课本 p60：第一代身份证号码（15 位）与同一个人的公民身份号码 */
export const GEN1_ID = '110105491231002'
/** 课本 p57 / p60 的书号 978-7-5640-0145-2 */
export const ISBN = '9787564001452'
export const ISBN_SEGS = [3, 1, 4, 4, 1]
const ISBN_NAMES: LStr[] = ['', segName('group'), segName('publisher'), segName('title'), segName('check')]
/** 学号方案（题目给的）：入学年份 4 位 + 班级 2 位 + 性别 1 位（1 男 2 女）+ 序号 2 位 */
export const STUDENT_SEGS = [4, 2, 1, 2]
const STUDENT_NAMES: LStr[] = ['year', 'class', 'sex', 'no'].map(segName)

const text = (k: string, p?: Record<string, LStr | number>): StemPart => ({ kind: 'text', text: p ? { k, p } : { k } })
const opt = (k: string): LStr => ({ k: `m3.code.${k}` })

/** 公民身份号码的号码条：names = 标出四段的名字；segs = 只分段；mark = 标出一段；cell = 标出一位 */
function idStrip(id: string, o: { names?: boolean; segs?: boolean; mark?: number; cell?: number } = {}): StemPart {
  const part: StemPart = { kind: 'code-strip', digits: id }
  if (o.names || o.segs || o.mark !== undefined) part.segs = ID_SEGS
  if (o.names) part.names = ID_NAMES
  if (o.mark !== undefined) part.mark = o.mark
  if (o.cell !== undefined) part.cell = o.cell
  return part
}

/** 出生日期码读出来的年、月、日，第 17 位 */
export const yearOf = (id: string): number => Number(id.slice(6, 10))
export const monthOf = (id: string): number => Number(id.slice(10, 12))
export const dayOf = (id: string): number => Number(id.slice(12, 14))
export const isMale = (id: string): boolean => Number(id[16]) % 2 === 1

function num(d: Difficulty, sig: string, stem: StemPart[], value: number, rng: RNG, smart: number[]): Question {
  return numberQuestion({
    kpId: KP,
    type: 'code',
    difficulty: d,
    sig,
    stem,
    value,
    rng,
    min: 1,
    max: 9999,
    smart: smart.filter((x) => Number.isInteger(x) && x >= 1 && x !== value),
  })
}
function pick(d: Difficulty, sig: string, stem: StemPart[], correct: LStr, distractors: LStr[], rng: RNG): Question {
  return labelQuestion({ kpId: KP, type: 'code', difficulty: d, sig, stem, correct, distractors, rng })
}

// ── 第 1 档：几位数字、各段有几位、标出的一段是什么码、出生在哪一年、按写出的规则看第十七位分辨性别（sexQ 在下面） ──

function idLenQ(d: Difficulty, rng: RNG): Question {
  return num(d, 'len-id', [text('m3.code.idLen'), idStrip(rng.pick(ALL_IDS))], 18, rng, [15, 17, 16])
}
function postLenQ(d: Difficulty, rng: RNG): Question {
  return num(d, 'len-post', [text('m3.code.postLen'), { kind: 'code-strip', digits: POSTCODE }], 6, rng, [5, 8, 7])
}
const SEG_LEN_SMART = [
  [8, 3, 4],
  [6, 4, 3],
  [6, 2, 1],
  [3, 2, 4],
]
function segLenQ(d: Difficulty, rng: RNG): Question {
  const k = rng.int(0, 3)
  const id = rng.pick(ALL_IDS)
  return num(d, `seglen-${k}`, [text('m3.code.segLen', { seg: ID_NAMES[k]! }), idStrip(id, { names: true })], ID_SEGS[k]!, rng, SEG_LEN_SMART[k]!)
}
function whichSegQ(d: Difficulty, rng: RNG): Question {
  const k = rng.int(0, 3)
  const id = rng.pick(ALL_IDS)
  return pick(d, `which-${k}`, [text('m3.code.whichSeg'), idStrip(id, { mark: k })], ID_NAMES[k]!, ID_NAMES.filter((_, i) => i !== k), rng)
}
/** 出生在哪一年：第 1 档标出四段的名字，第 2 档起只分段。选项写「1880 年」——答案带「年」，朗读才按位读成「一八八零年」（G11） */
function yearQ(d: Difficulty, rng: RNG): Question {
  const id = rng.pick(ALL_IDS)
  const y = yearOf(id)
  const opt = (v: number): LStr => ({ k: 'm3.code.yearOpt', p: { y: v } })
  const wrong = rng.shuffle([y + 1, y - 1, y + 10, y - 10]).slice(0, 3)
  return pick(d, `year-${id}`, [text('m3.code.year'), idStrip(id, d === 1 ? { names: true } : { segs: true })], opt(y), wrong.map(opt), rng)
}

// ── 第 2 档：几月几日、第十七位单双数与性别、双胞胎、号码会不会变、第几位分辨性别、邮政编码前两位 ──

function monthQ(d: Difficulty, rng: RNG): Question {
  const id = rng.pick(ALL_IDS)
  const m = monthOf(id)
  return num(d, `month-${id}`, [text('m3.code.month'), idStrip(id, { segs: true })], m, rng, [dayOf(id), m + 1, m - 1, yearOf(id) % 100])
}
function dayQ(d: Difficulty, rng: RNG): Question {
  const id = rng.pick(ALL_IDS)
  const day = dayOf(id)
  return num(d, `day-${id}`, [text('m3.code.day'), idStrip(id, { segs: true })], day, rng, [monthOf(id), day + 1, day - 1, day + 10])
}
function oddEvenQ(d: Difficulty, rng: RNG): Question {
  const id = rng.pick(ALL_IDS)
  const odd = isMale(id)
  return pick(d, `odd-${id}`, [text('m3.code.oddEven'), idStrip(id, { segs: true, cell: 16 })], opt(odd ? 'odd' : 'even'), [opt(odd ? 'even' : 'odd')], rng)
}
/** 第 1、2 档题里写着规则、标出第十七位（课本 p58 说一说的核心句）；第 3 档什么都不给（要知道看第十七位） */
function sexQ(d: Difficulty, rng: RNG): Question {
  const id = rng.pick(ALL_IDS)
  const male = isMale(id)
  const stem = d <= 2 ? [text('m3.code.sexBy17'), idStrip(id, { segs: true, cell: 16 })] : [text('m3.code.sex'), idStrip(id)]
  return pick(d, `sex${d}-${id}`, stem, opt(male ? 'male' : 'female'), [opt(male ? 'female' : 'male')], rng)
}
function twinsQ(d: Difficulty, rng: RNG): Question {
  return pick(d, 'twins', [text('m3.code.twins')], opt('notSame'), [opt('same')], rng)
}
function changeQ(d: Difficulty, rng: RNG): Question {
  return pick(d, 'change', [text('m3.code.change')], opt('neverChange'), [opt('willChange')], rng)
}
function sexDigitQ(d: Difficulty, rng: RNG): Question {
  return num(d, 'sex-digit', [text('m3.code.sexDigit')], 17, rng, [18, 16, 7])
}
function postFirst2Q(d: Difficulty, rng: RNG): Question {
  return pick(
    d,
    'post-first2',
    [text('m3.code.postFirst2'), { kind: 'code-strip', digits: POSTCODE, segs: [2, 4], mark: 0 }],
    opt('province'),
    [opt('county'), opt('town')],
    rng,
  )
}

// ── 第 3 档：按方案读学号、第一代身份证、不给提示判断性别、出生日期码从第几位开始、校验码是第几位、书号 ──

const pad2 = (n: number): string => String(n).padStart(2, '0')

function studentQ(d: Difficulty, rng: RNG): Question {
  const year = rng.int(2022, 2025)
  const cls = rng.int(1, 12)
  const sex = rng.int(1, 2)
  const no = rng.int(1, 45)
  const digits = `${year}${pad2(cls)}${sex}${pad2(no)}`
  const head: StemPart[] = [text('m3.code.stuIntro'), text('m3.code.stuRule'), { kind: 'code-strip', digits, segs: STUDENT_SEGS, names: STUDENT_NAMES }]
  const ask = rng.int(0, 2)
  if (ask === 0) return num(d, `stu-class-${digits}`, [...head, text('m3.code.stuClass')], cls, rng, [no, cls + 1, cls - 1, cls + 10])
  if (ask === 1) return pick(d, `stu-sex-${digits}`, [...head, text('m3.code.stuSex')], opt(sex === 1 ? 'boy' : 'girl'), [opt(sex === 1 ? 'girl' : 'boy')], rng)
  return num(d, `stu-no-${digits}`, [...head, text('m3.code.stuNo')], no, rng, [cls, no + 10, no + 1, no - 1])
}

function gen1Q(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) return num(d, 'gen1-len', [text('m3.code.gen1Len'), { kind: 'code-strip', digits: GEN1_ID }], 15, rng, [18, 16, 14])
  return num(
    d,
    'gen1-less',
    [text('m3.code.gen1Less'), { kind: 'code-strip', digits: GEN1_ID, fit: 18 }, { kind: 'code-strip', digits: BOOK_IDS[1]!, fit: 18 }],
    3,
    rng,
    [2, 1, 15],
  )
}

function positionQ(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) return num(d, 'date-start', [text('m3.code.dateStart'), idStrip(rng.pick(ALL_IDS), { segs: true })], 7, rng, [6, 8, 9])
  return num(d, 'check-pos', [text('m3.code.checkPos')], 18, rng, [17, 16, 1])
}

function isbnQ(d: Difficulty, rng: RNG): Question {
  const strip: StemPart = { kind: 'code-strip', digits: ISBN, segs: ISBN_SEGS, names: ISBN_NAMES }
  const ask = rng.int(0, 2)
  if (ask === 0) return num(d, 'isbn-group', [text('m3.code.isbnGroup'), strip], 7, rng, [9, 8, 5])
  if (ask === 1) return num(d, 'isbn-publisher', [text('m3.code.isbnPubLen'), strip], 4, rng, [3, 5, 1])
  return num(d, 'isbn-check', [text('m3.code.isbnCheck'), strip], 2, rng, [7, 5, 1])
}

defineGenerator(KP, (d, rng) => {
  const roll = rng.next()
  if (d === 1) {
    if (roll < 0.1) return idLenQ(d, rng)
    if (roll < 0.17) return postLenQ(d, rng)
    if (roll < 0.37) return segLenQ(d, rng)
    if (roll < 0.58) return whichSegQ(d, rng)
    if (roll < 0.78) return sexQ(d, rng)
    return yearQ(d, rng)
  }
  if (d === 2) {
    if (roll < 0.16) return monthQ(d, rng)
    if (roll < 0.29) return dayQ(d, rng)
    if (roll < 0.44) return oddEvenQ(d, rng)
    if (roll < 0.62) return sexQ(d, rng)
    if (roll < 0.69) return twinsQ(d, rng)
    if (roll < 0.75) return changeQ(d, rng)
    if (roll < 0.84) return sexDigitQ(d, rng)
    if (roll < 0.92) return postFirst2Q(d, rng)
    return yearQ(d, rng)
  }
  if (roll < 0.4) return studentQ(d, rng)
  if (roll < 0.55) return gen1Q(d, rng)
  if (roll < 0.75) return sexQ(d, rng)
  if (roll < 0.87) return positionQ(d, rng)
  return isbnQ(d, rng)
})
