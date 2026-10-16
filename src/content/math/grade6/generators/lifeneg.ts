import type { Difficulty, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator } from '@/engine'
import type { Ask, BillRow, Num, ReadItem } from './negative'
import {
  L,
  T,
  choose,
  judge,
  keyIn,
  num,
  qAlt,
  qBillMean,
  qBillWrite,
  qCount,
  qKind,
  qLeftOfZero,
  qLower,
  qOpp,
  qRead,
  qRods,
  qSide,
  qTempWrite,
  qThermo,
  qWhich,
  qZeroJudge,
  signed,
  temp,
  withUnit,
} from './negative'

// ─────────────────────────────────────────────────────────────
// 六上新教材「☆ 生活中的负数」（综合与实践，课本第 44–47 页；六年级数学 F）：一个知识点。
//   寻找负数（p44）：−4、−26、−3/8 这样的数；天气预报「北京，−4 ℃～0 ℃」（电视上还有哈尔滨 −26～−12 ℃、武汉 4～6 ℃、西安 −4～6 ℃、
//     拉萨 −6～6 ℃）；冰箱；电梯里的 −1、−2（地下层）；电子账单；吐鲁番盆地最低点海拔 −154.31 m。
//   认识负数（p45）：温度计（−10 ℃ 表示零下 10 ℃）、珠穆朗玛峰 8848.86 m、账单（−85.00、−500.00、+500.00）；6、4.7、3/8 是正数，
//     −6、−4.7、−3/8 是负数，正数和负数可以表示相反意义的量；想一想：负数标在 0 的左边（像温度计横过来），0 是正数还是负数？
//   应用负数（p46）：春节收支表（父母工资 +9500、给老人 −2000、给我和妹妹压岁钱 −200、买年货 −500）；坐位体前屈（调查，第 2 档、规则写进题里）。
//   小讲堂（p47）：刘徽「正算赤、负算黑」（红色算筹 +23、黑色算筹 −34）；小的数减大的数：8 − 10 = −2、20 − 30 = −10。
//   成长小档案：会读、写正数和负数，知道 0 既不是正数也不是负数。
// 这一册负数在「百分数」前面：不出百分数；也不出六下才有的比温度高低（第 2 档才有）、小数分数的直线、时差、水位、净重、余额。
// 课本这一页零上温度只写「6 ℃」这样（没讲「+」号），记作零上温度的选项不带「+」。
// 作答：负数、读法、名字一律选项；数一数有几个负数、收支表合计用数字键盘。
// ─────────────────────────────────────────────────────────────

const K = 'm6s1-04-negative'
const A: Ask = { K, type: 'negative' }

/** p44 电视上的天气预报（最低, 最高） */
export const FORECAST5: { id: string; low: number; high: number }[] = [
  { id: 'bj', low: -4, high: 0 },
  { id: 'hrb', low: -26, high: -12 },
  { id: 'wh', low: 4, high: 6 },
  { id: 'xa', low: -4, high: 6 },
  { id: 'ls', low: -6, high: 6 },
]
/** p44、p45 的数：−4、−26、−3/8；6、4.7、3/8 和 −6、−4.7、−3/8；0 */
export const POOL_S1: Num[] = ['−4', '−26', '−3/8', '6', '4.7', '3/8', '−6', '−4.7', '0'].map(num)
/** p45 的账单（三笔） */
export const BILL_S1: BillRow[] = [
  { id: 'restaurant', v: -85 },
  { id: 'market', v: -500 },
  { id: 'li', v: 500 },
]
/** p46 春节期间的收支表 */
export const FAMILY_S1: { id: string; v: number }[] = [
  { id: 'wage', v: 9500 },
  { id: 'elder', v: -2000 },
  { id: 'gift', v: -200 },
  { id: 'goods', v: -500 },
]
/** 读法题的数（成长小档案「能正确地读、写正数和负数」） */
export const READ_S1: ReadItem[] = [
  { sign: '−', v: '6' },
  { sign: '−', v: '4' },
  { sign: '−', v: '26' },
  { sign: '−', v: '4.7' },
  { sign: '−', frac: [3, 8] },
  { sign: '−', v: '10', temp: true },
  { sign: '−', v: '4', temp: true },
]

/** 天气预报：最低 / 最高气温（「−4 ℃ 到 0 ℃」，不写「～」） */
function qForecast(d: Difficulty, rng: RNG): Question {
  const c = rng.pick(FORECAST5)
  const low = rng.chance(0.55)
  const v = low ? c.low : c.high
  const stem = [T(low ? 'm6.lneg.fc.low' : 'm6.lneg.fc.high', { c: L(`m6.neg.city.${c.id}`), a: temp(c.low), b: temp(c.high) })]
  return choose(A, d, rng, `fc-${c.id}-${low ? 'low' : 'high'}`, stem, temp(v), [temp(low ? c.high : c.low), temp(-v)])
}
/** 电梯：按钮上的 −1 表示地下 1 层；地下 2 层写作 −2 */
function qFloor(d: Difficulty, rng: RNG): Question {
  const n = rng.int(1, 3)
  if (rng.chance(0.55)) return choose(A, d, rng, `floor-mean-${n}`, [T('m6.lneg.floor.mean', { n })], L('m6.lneg.floor.under', { n }), [L('m6.lneg.floor.over', { n })])
  return choose(A, d, rng, `floor-write-${n}`, [T('m6.lneg.floor.write', { n })], signed(-n), [String(n)])
}
const famTable = (ask?: string): StemPart => ({
  kind: 'stat-table',
  head: 'row',
  rows: [[L('m6.neg.th.item'), L('m6.neg.th.inout')], ...FAMILY_S1.map((r) => [L(`m6.lneg.fam.r.${r.id}`), r.id === ask ? null : signed(r.v, true)])],
})
/** 春节收支表：空着的一项记作多少元、表里的数表示什么 */
function qFamily(d: Difficulty, rng: RNG): Question {
  const lead = T('m6.lneg.fam.lead')
  if (rng.chance(0.45)) {
    const r = rng.pick(FAMILY_S1)
    const n = Math.abs(r.v)
    return choose(A, d, rng, `fammean-${r.id}`, [lead, famTable(), T('m6.lneg.fam.mean', { v: signed(r.v, true) })], L(r.v < 0 ? 'm6.neg.expense' : 'm6.neg.income', { n }), [L(r.v < 0 ? 'm6.neg.income' : 'm6.neg.expense', { n })])
  }
  const r = rng.pick(FAMILY_S1.filter((x) => x.id !== 'wage'))
  const wrongs: LStr[] = [withUnit('yuan', -r.v)]
  if (r.id === 'gift') wrongs.push(withUnit('yuan', -100))
  return choose(A, d, rng, `fam-${r.id}`, [lead, famTable(r.id), T(`m6.lneg.fam.${r.id}`)], withUnit('yuan', r.v), wrongs)
}
/** 第 3 档：收支表的收入减去三项支出还剩多少元（课本没让算） */
function qFamilySum(d: Difficulty, rng: RNG): Question {
  return keyIn(A, d, rng, 'famsum', [T('m6.lneg.fam.lead'), famTable(), T('m6.lneg.fam.sum')], FAMILY_S1.reduce((s, r) => s + r.v, 0), 99999)
}
/** 小讲堂：小的数减大的数（课本 8 − 10 = −2、20 − 30 = −10）；常错：大减小写成正的、加起来 */
function qSub(d: Difficulty, rng: RNG): Question {
  let a: number
  let b: number
  if (d === 1 && rng.chance(0.5)) [a, b] = rng.pick([[8, 10], [20, 30]] as const)
  else if (d === 1 && rng.chance(0.6)) {
    a = rng.int(2, 15)
    b = a + rng.int(1, 5)
  } else if (d === 1) {
    a = rng.int(1, 4) * 10
    b = a + rng.int(1, 3) * 10
  } else if (d === 2) {
    a = rng.int(2, 20)
    b = a + rng.int(1, 9)
  } else {
    a = rng.int(2, 60)
    b = a + rng.int(11, 40)
  }
  const stem: StemPart[] = [T('m6.lneg.sub.lead'), { kind: 'expr', expr: `${a} − ${b} = ?` }]
  return choose(A, d, rng, `sub-${a}-${b}`, stem, signed(a - b), [String(b - a), String(a + b), signed(a - b - 1)])
}
/** 第 2 档：坐位体前屈（课本只让调查，记分规则写进题里：脚底是 0，超过记正、没够到记负） */
function qSitReach(d: Difficulty, rng: RNG): Question {
  const n = rng.int(1, 12)
  const over = rng.chance(0.5)
  const stem = [T('m6.lneg.sit.rule'), T(over ? 'm6.lneg.sit.over' : 'm6.lneg.sit.short', { n })]
  return choose(A, d, rng, `sit-${over ? 'over' : 'short'}-${n}`, stem, withUnit('cm', over ? n : -n), [withUnit('cm', over ? -n : n)])
}
/** 第 3 档：下面哪句话是对的 */
function qClaim(d: Difficulty, rng: RNG): Question {
  const wrong = rng.shuffle(['zeroPos', 'zeroNeg', 'negPos', 'decNeg', 'fracNeg']).slice(0, 3)
  return choose(A, d, rng, `claim-${wrong.join('_')}`, [T('m6.lneg.claim.q')], L('m6.lneg.claim.zero'), wrong.map((w) => L(`m6.lneg.claim.${w}`)))
}

function lifeneg(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 寻找负数、认识负数、应用负数、小讲堂（每一处都在第 1 档出得到）
    if (roll < 0.1) return qTempWrite(A, d, rng, rng.chance(0.35) ? 10 : rng.int(1, 30), false)
    if (roll < 0.18) return qThermo(A, d, rng, rng.chance(0.35) ? -10 : (rng.chance(0.7) ? -1 : 1) * rng.int(1, 14) * 2, false)
    if (roll < 0.26) return qForecast(d, rng)
    if (roll < 0.31) return qAlt(A, d, rng, false, false)
    if (roll < 0.37) return qFloor(d, rng)
    if (roll < 0.44) return rng.chance(0.6) ? qBillMean(A, d, rng, BILL_S1) : qBillWrite(A, d, rng, BILL_S1)
    if (roll < 0.53) return rng.chance(0.55) ? qWhich(A, d, rng, POOL_S1) : qKind(A, d, rng, POOL_S1)
    if (roll < 0.57) return rng.chance(0.5) ? qKind(A, d, rng, [num('0')]) : qZeroJudge(A, d, rng)
    if (roll < 0.64) return qOpp(A, d, rng, ['money', 'temp', 'sea'])
    if (roll < 0.71) return rng.chance(0.6) ? qLeftOfZero(A, d, rng) : qSide(A, d, rng, ['−1', '−2', '−3', '−4', '1', '2', '3', '4', '5'])
    if (roll < 0.8) return qFamily(d, rng)
    if (roll < 0.86) return qRods(A, d, rng, true)
    if (roll < 0.93) return qSub(d, rng)
    return qRead(A, d, rng, rng.pick(READ_S1))
  }
  if (d === 2) {
    // 数一数、坐位体前屈、小数减大数换数、温度计不在整十的刻度上、两支温度计比高低、判断、别的相反意义的量
    if (roll < 0.15) return qCount(A, d, rng, POOL_S1, [5, 7])
    if (roll < 0.3) return qSitReach(d, rng)
    if (roll < 0.43) return qSub(d, rng)
    if (roll < 0.55) return qThermo(A, d, rng, -rng.int(1, 14) * 2 - 0, false)
    if (roll < 0.66) return qLower(A, d, rng, -rng.int(1, 14) * 2, rng.int(-14, 14) * 2 || 4, true)
    if (roll < 0.76) return judge(A, d, rng, 'unsignedj', [T('m6.neg.judge.unsigned')], false)
    if (roll < 0.88) return qOpp(A, d, rng, ['deposit', 'lift', 'east'])
    return qRods(A, d, rng, false)
  }
  if (roll < 0.35) return qClaim(d, rng)
  if (roll < 0.65) return qFamilySum(d, rng)
  return qSub(d, rng)
}
defineGenerator(K, lifeneg)
