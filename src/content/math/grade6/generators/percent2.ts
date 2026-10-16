import type { Difficulty, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator } from '@/engine'
import type { Ask } from './negative'
import { L, T, choose, fmt, judge, keyIn } from './negative'

// ─────────────────────────────────────────────────────────────
// 六下「2 百分数（二）」（平台当前的旧版六下，课本第 8–14 页；六年级数学 F）：五个知识点——
//   折扣（p8 例 1 (1)(2)、做一做；练习二 1、2、3）、成数（p9 例 2、做一做；练习二 4、5、11*）、税率（p10 例 3、做一做；练习二 6、7）、
//   利率（p11 存款基准利率表、例 4、做一做；练习二 10*）、打折与满减（p12 例 5、做一做；练习二 8、9，课本没印小标题）。
//   ☆「生活与百分数」（p15）是去银行调查、设计理财方案的活动，不设知识点；「你知道吗」的千分数、万分数不出（朗读不认 ‰ ‱）。
// 另外注册六上新教材「五 百分数」的折扣（m6s1-07-discount）、利率（m6s1-07-interest）：两册这两节的说明、例题、做一做一字不差
//   （六上折扣 p85 例 1、做一做；利率 p86 例 2、做一做），出题函数共用，练习照各自的课本——
//   六上：练习十五 1 家具八折、2 面包五折、3 小明 800 元存一年、4 运动服满减和七折（第 2 档）、5 国债和定期（第 2、3 档）、7 信用卡分期（第 2 档）、
//   练习十七 8 电影票（第 2 档）、练习十八 7 剧院门票打几折（第 3 档）；
//   六下：练习二 1 面包、2 家具、3 凭优惠卡省了 9.6 元求原价。六上的税率、成数只在「你知道吗」里，归六下这两个知识点。
// 写法：「几折」「几成」照课本写汉字（八五折、二成五，读法就是字），百分数紧挨着 %（「85%」读「百分之八十五」）；金额写「元」。
// 朗读避坑：「应付」「应缴纳」（应）写「要付」「要缴纳」——只有术语「应纳税额」照写；「相差」（差）写「便宜多少元」；「可得」（得）写「可以得到」；
//   「增长」写「增加」（成数），「产量」（量）写「收了多少吨」；「两种」（种）写「两个商场」；「得数」不写；「晚 8:00」写「晚上 8 点」。
// 作答：整数答案（现价、便宜了多少、利息、本息、税款……）用数字键盘；小数、百分数、几折、几成、名字一律选项。
// ─────────────────────────────────────────────────────────────

const K1D = 'm6s1-07-discount'
const K1I = 'm6s1-07-interest'
const KD = 'm6s2-02-discount'
const KC = 'm6s2-02-chengshu'
const KT = 'm6s2-02-tax'
const KI = 'm6s2-02-interest'
const KS = 'm6s2-02-sale'
const ask = (K: string): Ask => ({ K, type: 'percent' })

/** 金额：最多两位小数（先放大成整数分再算，免得 0.1 + 0.2 那种尾巴） */
const money = (x: number): number => Math.round(x * 100) / 100
const isInt = (x: number): boolean => Math.abs(x - Math.round(x)) < 1e-9
const pct = (p: number): string => `${fmt(p)}%`
/** 几折（85 = 八五折）、几成（35 = 三成五）的词条 */
export const zhe = (p: number): LStr => L(`m6.pct2.z.${p}`)
export const cheng = (p: number | 'two'): LStr => L(`m6.pct2.c.${p}`)
const it = (id: string): LStr => L(`m6.pct2.it.${id}`)
/** 答案是整数就用数字键盘，否则做成选项（小数的干扰项照常见错误给） */
function amount(a: Ask, d: Difficulty, rng: RNG, sig: string, stem: StemPart[], v: number, wrongs: number[]): Question {
  if (isInt(v)) return keyIn(a, d, rng, sig, stem, Math.round(v), 999999)
  return choose(a, d, rng, sig, stem, fmt(v), wrongs.filter((w) => w > 0).map(fmt))
}

// ═════════════════════════════════════════════════════════════
// 折扣（六上 m6s1-07-discount、六下 m6s2-02-discount）
// ═════════════════════════════════════════════════════════════

/** 课本出现过的折扣：九折、八五折、八折、七五折、七折、六五折、六折、五五折、五折、八八折、九五折 */
export const ZHE = [90, 85, 80, 75, 70, 65, 60, 55, 50, 88, 95]
/** 几折是原价的百分之几；常错：八五折当 8.5%、当成便宜的 15%、数字读反 */
function qZheToPct(a: Ask, d: Difficulty, rng: RNG): Question {
  const z = rng.pick(ZHE)
  const swap = Number(String(z).split('').reverse().join(''))
  return choose(a, d, rng, `zpct-${z}`, [T('m6.pct2.zhe.rule'), T('m6.pct2.zhe.toPct', { z: zhe(z) })], pct(z), [pct(z / 10), pct(100 - z), pct(swap >= 10 && swap !== z ? swap : z / 100)])
}
/** 按原价的百分之几出售是打几折 */
function qPctToZhe(a: Ask, d: Difficulty, rng: RNG): Question {
  const z = rng.pick(ZHE)
  // 干扰项都是真有的折扣：把便宜的部分当成折扣（100 − z，整五的才放），再取两个挨着的课本折扣
  const near = [...ZHE].filter((x) => x !== z).sort((x, y) => Math.abs(x - z) - Math.abs(y - z) || x - y)
  const wrongs = [...(z % 5 === 0 && 100 - z >= 20 && 100 - z !== z ? [100 - z] : []), ...near].slice(0, 3).map(zhe)
  return choose(a, d, rng, `pctz-${z}`, [T('m6.pct2.zhe.fromPct', { p: z })], zhe(z), wrongs)
}
/** 一件东西：原价 p 元，打 z 折 */
export interface Priced {
  id: string
  p: number
  z: number
}
const nowOf = (x: Priced): number => money((x.p * x.z) / 100)
/** 例 1 (1) 自行车 280 元八五折、做一做（80 元六五折、105 元七折、35 元八八折） */
export const EX1_NOW: Priced[] = [
  { id: 'bike', p: 280, z: 85 },
  { id: 'ball', p: 80, z: 65 },
  { id: 'bag', p: 105, z: 70 },
  { id: 'book', p: 35, z: 88 },
]
/** 例 1 (2) 电水壶 160 元九折 */
export const EX1_SAVE: Priced = { id: 'kettle', p: 160, z: 90 }
const ITEMS = ['bike', 'kettle', 'ball', 'bag', 'lamp', 'coat', 'racket', 'tv']
/** 随机出一件：原价配折扣，现价是整数（整折配 10 的倍数，带五的折配 20 的倍数，八八折配 25 的倍数） */
function randomPriced(rng: RNG): Priced {
  const z = rng.pick(ZHE)
  const step = z === 88 ? 25 : z % 10 === 5 ? 20 : 10
  return { id: rng.pick(ITEMS), p: step * rng.int(Math.ceil(40 / step), Math.floor(600 / step)), z }
}
/** 现价是多少元；常错：算成便宜的钱、小数点错一位 */
function qNow(a: Ask, d: Difficulty, rng: RNG, x: Priced): Question {
  const v = nowOf(x)
  const stem = [T('m6.pct2.price.q', { it: it(x.id), p: fmt(x.p), z: zhe(x.z) })]
  return amount(a, d, rng, `now-${x.id}-${x.p}-${x.z}`, stem, v, [money(x.p - v), money(v / 10), money(v * 10)])
}
/** 比原价便宜了多少元；常错：算成现价 */
function qSave(a: Ask, d: Difficulty, rng: RNG, x: Priced): Question {
  const v = money(x.p - nowOf(x))
  const stem = [T('m6.pct2.save.q', { it: it(x.id), p: fmt(x.p), z: zhe(x.z) })]
  return amount(a, d, rng, `save-${x.id}-${x.p}-${x.z}`, stem, v, [nowOf(x), money(v / 10)])
}
/** 六上的「列式」：求现价 / 便宜了多少，哪个算式对（例 1 的两个算式） */
function qFormula(a: Ask, d: Difficulty, rng: RNG): Question {
  const save = rng.chance(0.5)
  const x = save ? EX1_SAVE : EX1_NOW[0]!
  const p = fmt(x.p)
  const r = `${x.z}%`
  const right = save ? `${p} × (1 − ${r})` : `${p} × ${r}`
  const wrongs = save ? [`${p} × ${r}`, `${p} ÷ ${r}`, `${p} × (1 + ${r})`] : [`${p} × (1 − ${r})`, `${p} ÷ ${r}`, `${p} − ${r}`]
  return choose(a, d, rng, `formula-${save ? 'save' : 'now'}`, [T(save ? 'm6.pct2.formula.save' : 'm6.pct2.formula.now', { it: it(x.id), p, z: zhe(x.z) })], right, wrongs)
}
/** 面包店晚上 8 点以后一律五折（六上练习十五 2、六下练习二 1）：4 元、6 元、8.8 元、5 元 */
export const BREAD = [4, 6, 8.8, 5]
function qBread(a: Ask, d: Difficulty, rng: RNG): Question {
  const rule = T('m6.pct2.bread.rule')
  const roll = rng.next()
  if (roll < 0.5) {
    const p = rng.pick(BREAD)
    const v = money(p / 2)
    return amount(a, d, rng, `bread-${p}`, [rule, T('m6.pct2.bread.one', { p: fmt(p) })], v, [money(v / 10), money(p * 0.05), money(p - 0.5)])
  }
  if (roll < 0.75) {
    // 课本「她可以怎样买」是开放题：改成买给定的几个，一共多少元（总价是整数）
    let p1: number
    let p2: number
    let c1: number
    let c2: number
    do {
      ;[p1, p2] = rng.shuffle(BREAD).slice(0, 2) as [number, number]
      c1 = rng.int(1, 3)
      c2 = rng.int(1, 3)
    } while (!isInt((p1 * c1 + p2 * c2) / 2))
    return keyIn(a, d, rng, `breadbuy-${c1}x${p1}-${c2}x${p2}`, [rule, T('m6.pct2.bread.buy', { a: c1, p: fmt(p1), b: c2, q: fmt(p2) })], Math.round((p1 * c1 + p2 * c2) / 2), 99)
  }
  const p = rng.pick(BREAD)
  return keyIn(a, d, rng, `breadmax-${p}`, [rule, T('m6.pct2.bread.max', { p: fmt(p) })], Math.floor(10 / (p / 2) + 1e-9), 99)
}
/** 周年店庆家具一律八折（六上练习十五 1、六下练习二 2）：桌子 220 元、椅子 120 元、床 2400 元、衣柜 880 元 */
export const FURNITURE: Priced[] = [
  { id: 'table', p: 220, z: 80 },
  { id: 'chair', p: 120, z: 80 },
  { id: 'bed', p: 2400, z: 80 },
  { id: 'wardrobe', p: 880, z: 80 },
]
function qFurniture(a: Ask, d: Difficulty, rng: RNG): Question {
  const x = rng.pick(FURNITURE)
  return keyIn(a, d, rng, `furn-${x.id}`, [T('m6.pct2.furn.rule'), T('m6.pct2.furn.q', { it: it(x.id), p: x.p })], Math.round(nowOf(x)), 99999)
}
/** 六下练习二 3：凭优惠卡打八折，省了 9.6 元，原价多少；常错：用省的钱除以折扣（9.6 ÷ 80%）；第 2 档换数 */
function qOriginal(a: Ask, d: Difficulty, rng: RNG, book: boolean): Question {
  const z = book ? 80 : rng.pick([80, 90, 75, 85])
  const p = book ? 48 : 4 * rng.int(6, 30)
  const s = money((p * (100 - z)) / 100)
  return keyIn(a, d, rng, `orig-${z}-${p}`, [T('m6.pct2.orig.q', { z: zhe(z), s: fmt(s) })], p, 9999)
}
/** 判断：打八折就是便宜了 80%（不对）/ 按原价的 80% 出售（对） */
function qZheJudge(a: Ask, d: Difficulty, rng: RNG): Question {
  // 五折便宜的也是 50%，「便宜了 50%」怎么说都对：不出五折
  const z = rng.pick(ZHE.filter((x) => x !== 50))
  const off = rng.chance(0.5)
  const truth = rng.chance(0.5)
  const p = off ? (truth ? 100 - z : z) : truth ? z : 100 - z
  return judge(a, d, rng, `zj-${off ? 'off' : 'at'}-${z}-${p}`, [T(off ? 'm6.pct2.zhe.jOff' : 'm6.pct2.zhe.jAt', { z: zhe(z), p })], truth)
}
/** 第 2 档：原价 50 元现价 40 元，打了几折 */
function qWhichZhe(a: Ask, d: Difficulty, rng: RNG): Question {
  const z = rng.pick([90, 80, 75, 70, 60, 50])
  const p = rng.pick([40, 60, 80, 100, 120, 200])
  const now = (p * z) / 100
  return choose(a, d, rng, `whichzhe-${p}-${z}`, [T('m6.pct2.zhe.which', { p, q: fmt(now) })], zhe(z), [100 - z, z === 50 ? 60 : z - 10].filter((x) => x >= 10 && x !== z).map(zhe))
}
/** 第 2 档：打 z 折后是 v 元，原价多少（v ÷ z%） */
function qFromNow(a: Ask, d: Difficulty, rng: RNG): Question {
  const x = randomPriced(rng)
  const v = nowOf(x)
  return keyIn(a, d, rng, `fromnow-${x.p}-${x.z}`, [T('m6.pct2.fromNow.q', { z: zhe(x.z), v: fmt(v) })], x.p, 99999)
}
/** 第 2 档：打 z 折比原价便宜了百分之几 */
function qOffPct(a: Ask, d: Difficulty, rng: RNG): Question {
  const z = rng.pick(ZHE)
  return choose(a, d, rng, `offpct-${z}`, [T('m6.pct2.zhe.off', { z: zhe(z) })], pct(100 - z), [pct(z), pct((100 - z) / 10)])
}
/** 六上练习十七 8：三人看电影，每张 80 元；上午场买二送一（省 80 元）、下午场七五折（省 60 元）。节省了 60 元是哪一场 */
function qMovie(a: Ask, d: Difficulty, rng: RNG): Question {
  const s = rng.pick([60, 80])
  const table: StemPart = {
    kind: 'stat-table',
    head: 'col',
    rows: [
      [L('m6.pct2.mv.price'), L('m6.pct2.mv.each')],
      [L('m6.pct2.mv.am'), L('m6.pct2.mv.two1')],
      [L('m6.pct2.mv.pm'), L('m6.pct2.z.75')],
    ],
  }
  return choose(a, d, rng, `movie-${s}`, [table, T('m6.pct2.mv.q', { s })], L(s === 60 ? 'm6.pct2.mv.pm' : 'm6.pct2.mv.am'), [L(s === 60 ? 'm6.pct2.mv.am' : 'm6.pct2.mv.pm')])
}
/**
 * 六上练习十六 7（第 3 档，「利润率」课本没讲过）：洗衣机按 50% 的利润率定价、再打八折，获利 1200 元——
 * 成本价 × 150% × 80% − 成本价 = 成本价 × 20% = 1200，成本价 6000 元；想至少获利 2100 元，售价至少 8100 元，是定价 9000 元的 90%，最多打九折
 */
function qProfit(a: Ask, d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) return keyIn(a, d, rng, 'profit-cost', [T('m6.pct2.profit.cost')], 6000, 99999)
  return choose(a, d, rng, 'profit-most', [T('m6.pct2.profit.most')], zhe(90), [zhe(80), zhe(95)])
}
/** 六上练习十八 7：门票 20 元，打折后观众多了 1 倍、总收入多了 50%，打了几折（1.5 ÷ 2 = 75%） */
function qShow(a: Ask, d: Difficulty, rng: RNG): Question {
  return choose(a, d, rng, 'show', [T('m6.pct2.show.q')], zhe(75), [zhe(50), zhe(80), zhe(25)])
}

function discount(book: 1 | 2): (d: Difficulty, rng: RNG) => Question {
  const a = ask(book === 1 ? K1D : KD)
  return (d, rng) => {
    const roll = rng.next()
    if (d === 1) {
      // 说明（几折 = 百分之几十）、例 1 (1)(2)、做一做；练习：面包、家具（六下还有练习二 3 的原价）；六上多一个「列式」
      if (roll < 0.12) return qZheToPct(a, d, rng)
      if (roll < 0.2) return qPctToZhe(a, d, rng)
      if (roll < 0.36) return qNow(a, d, rng, rng.chance(0.55) ? rng.pick(EX1_NOW) : randomPriced(rng))
      if (roll < 0.48) return qSave(a, d, rng, rng.chance(0.45) ? EX1_SAVE : randomPriced(rng))
      if (roll < 0.62) return qBread(a, d, rng)
      if (roll < 0.74) return qFurniture(a, d, rng)
      if (roll < 0.84) return book === 2 ? qOriginal(a, d, rng, true) : qFormula(a, d, rng)
      return qZheJudge(a, d, rng)
    }
    if (d === 2) {
      if (book === 1 && roll < 0.3) return roll < 0.15 ? saleOne(a, d, rng, SALE_S1, true) : qMovie(a, d, rng)
      if (roll < 0.45) return qWhichZhe(a, d, rng)
      if (roll < 0.6) return qOffPct(a, d, rng)
      if (roll < 0.75) return book === 2 ? qOriginal(a, d, rng, false) : qFromNow(a, d, rng)
      if (roll < 0.88) return qFromNow(a, d, rng)
      return book === 2 ? qFormula(a, d, rng) : qNow(a, d, rng, randomPriced(rng))
    }
    if (book === 1 && roll < 0.45) return roll < 0.2 ? qShow(a, d, rng) : qProfit(a, d, rng)
    if (roll < 0.7) return qTwiceZhe(a, d, rng)
    return qFromNow(a, d, rng)
  }
}

// ═════════════════════════════════════════════════════════════
// 打折与满减（六下 m6s2-02-sale；六上练习十五 4 也用）
// ═════════════════════════════════════════════════════════════

export type Deal = { kind: 'zhe'; z: number } | { kind: 'full'; t: number; m: number } | { kind: 'twice'; z1: number; z2: number }
/** 两家店（A、B 商场 / A、B 店 / 甲、乙品牌）的促销，同一件东西标价 p 元 */
export interface Sale {
  it: string
  p: number
  st: [string, string]
  deals: [Deal, Deal]
}
export const payOf = (p: number, deal: Deal): number =>
  deal.kind === 'zhe' ? money((p * deal.z) / 100) : deal.kind === 'full' ? p - Math.floor(p / deal.t) * deal.m : money((p * deal.z1 * deal.z2) / 10000)
/** 例 5 裙子、做一做运动鞋、练习二 8 鞋、练习二 9 书 */
export const SALES6: Sale[] = [
  { it: 'skirt', p: 230, st: ['A', 'B'], deals: [{ kind: 'zhe', z: 55 }, { kind: 'full', t: 100, m: 50 }] },
  { it: 'sneakers', p: 120, st: ['A', 'B'], deals: [{ kind: 'full', t: 100, m: 40 }, { kind: 'zhe', z: 60 }] },
  { it: 'shoes', p: 220, st: ['jia', 'yi'], deals: [{ kind: 'full', t: 200, m: 100 }, { kind: 'twice', z1: 60, z2: 95 }] },
  { it: 'books', p: 80, st: ['Ashop', 'Bshop'], deals: [{ kind: 'zhe', z: 70 }, { kind: 'full', t: 69, m: 19 }] },
]
/** 六上练习十五 4：运动服 550 元，A 商场每满 100 元减 30 元，B 商场打七折 */
export const SALE_S1: Sale[] = [{ it: 'suit', p: 550, st: ['A', 'B'], deals: [{ kind: 'full', t: 100, m: 30 }, { kind: 'zhe', z: 70 }] }]
const store = (s: string): LStr => L(`m6.pct2.st.${s}`)
/** 「在 A 商场」「在甲品牌」（题干里用；st / a / b 参数照旧带着商店名，测试按它找规则） */
const atStore = (s: string): LStr => L(`m6.pct2.at.${s}`)
const ruleOf = (st: string, deal: Deal): LStr =>
  deal.kind === 'zhe'
    ? L('m6.pct2.sale.ruleZhe', { st: store(st), z: zhe(deal.z) })
    : deal.kind === 'full'
      ? L('m6.pct2.sale.ruleFull', { st: store(st), t: deal.t, m: deal.m })
      : L('m6.pct2.sale.ruleTwice', { st: store(st), z1: zhe(deal.z1), z2: zhe(deal.z2) })
const saleCtx = (s: Sale): StemPart => T('m6.pct2.sale.ctx', { it: it(s.it), r1: ruleOf(s.st[0], s.deals[0]), r2: ruleOf(s.st[1], s.deals[1]), p: s.p })
/** 随机一组：一家打折、一家满减（标价 110–590 元） */
function randomSale(rng: RNG): Sale {
  const p = 10 * rng.int(11, 59)
  const z = rng.pick([50, 55, 60, 65, 70, 75, 80, 85, 90])
  const t = rng.pick([100, 100, 200])
  const m = t === 100 ? rng.pick([20, 30, 40, 50]) : rng.pick([50, 80, 100])
  const zFirst = rng.chance(0.5)
  const z1: Deal = { kind: 'zhe', z }
  const f: Deal = { kind: 'full', t, m }
  return { it: rng.pick(['skirt', 'sneakers', 'suit', 'coat', 'racket', 'lamp']), p, st: ['A', 'B'], deals: zFirst ? [z1, f] : [f, z1] }
}
/** 在某一家买要付多少元；常错：满减只减一次、零头也算满、两次打折当一次 / 相减 */
function qPayAt(a: Ask, d: Difficulty, rng: RNG, s: Sale, k: 0 | 1): Question {
  const deal = s.deals[k]
  const v = payOf(s.p, deal)
  const wrongs =
    deal.kind === 'zhe'
      ? [money(s.p - v), money(v / 10)]
      : deal.kind === 'full'
        ? [s.p - deal.m, s.p - Math.ceil(s.p / deal.t) * deal.m, money(s.p / 2)]
        : [money((s.p * (deal.z1 + deal.z2 - 100)) / 100), money((s.p * deal.z1) / 100)]
  const stem = [saleCtx(s), T('m6.pct2.sale.payAt', { st: store(s.st[k]), at: atStore(s.st[k]) })]
  // 满减的答案一定是整数：选项版也给（课本这一问要比较两家，常错放在选项里）
  if (deal.kind === 'full' && rng.chance(0.4)) return choose(a, d, rng, `pay-${s.it}-${s.p}-${k}`, stem, fmt(v), wrongs.filter((w) => w > 0 && w !== v).map(fmt))
  return amount(a, d, rng, `pay-${s.it}-${s.p}-${k}`, stem, v, wrongs)
}
/** 在哪里买更省钱（一样多也是一个选项） */
function qWhere(a: Ask, d: Difficulty, rng: RNG, s: Sale): Question {
  const [x, y] = [payOf(s.p, s.deals[0]), payOf(s.p, s.deals[1])]
  const right = x === y ? L('m6.pct2.st.same') : store(x < y ? s.st[0] : s.st[1])
  return choose(a, d, rng, `where-${s.it}-${s.p}`, [saleCtx(s), T('m6.pct2.sale.which')], right, [store(s.st[0]), store(s.st[1]), L('m6.pct2.st.same')])
}
/** 在便宜的那家买比在另一家便宜多少元（差是整数时问） */
function qCheaper(a: Ask, d: Difficulty, rng: RNG, s: Sale): Question {
  const [x, y] = [payOf(s.p, s.deals[0]), payOf(s.p, s.deals[1])]
  const lo = x < y ? 0 : 1
  const v = money(Math.abs(x - y))
  return amount(a, d, rng, `cheaper-${s.it}-${s.p}`, [saleCtx(s), T('m6.pct2.sale.cheaper', { a: store(s.st[lo]), b: store(s.st[1 - lo]), atA: atStore(s.st[lo]), atB: atStore(s.st[1 - lo]) })], v, [money(v * 10), money(v + 1)])
}
/** 例 5 阅读与理解：每满 100 元减 50 元，230 元一共减去几个 50 元 */
function qMinus(a: Ask, d: Difficulty, rng: RNG, book: boolean): Question {
  const [p, t, m] = book ? rng.pick([[230, 100, 50], [120, 100, 40], [220, 200, 100], [80, 69, 19]] as const) : [10 * rng.int(11, 99), rng.pick([100, 200]), rng.pick([20, 30, 50])]
  return keyIn(a, d, rng, `minus-${p}-${t}-${m}`, [T('m6.pct2.sale.minus', { t, m, p })], Math.floor(p / t) * m, 9999)
}
/** 一组促销里出一问 */
function saleOne(a: Ask, d: Difficulty, rng: RNG, pool: Sale[], book: boolean): Question {
  const s = book ? rng.pick(pool) : randomSale(rng)
  const roll = rng.next()
  if (roll < 0.5) return qPayAt(a, d, rng, s, rng.chance(0.5) ? 0 : 1)
  const [x, y] = [payOf(s.p, s.deals[0]), payOf(s.p, s.deals[1])]
  if (roll < 0.75 || !isInt(Math.abs(x - y)) || x === y) return qWhere(a, d, rng, s)
  return qCheaper(a, d, rng, s)
}
/** 第 2、3 档：先打 z1 折再打 z2 折，相当于打几折；常错：两次折扣相减（六折再九五折当五五折）、只算一次 */
export const TWICE: [number, number][] = [
  [60, 95],
  [80, 90],
  [80, 95],
  [90, 90],
  [70, 90],
  [50, 90],
  [80, 80],
]
function qTwiceZhe(a: Ask, d: Difficulty, rng: RNG): Question {
  const [z1, z2] = rng.pick(TWICE)
  const v = (z1 * z2) / 100
  return choose(a, d, rng, `twice-${z1}-${z2}`, [T('m6.pct2.sale.asZhe', { z1: zhe(z1), z2: zhe(z2) })], zhe(v), [zhe(z1 + z2 - 100), zhe(z1), zhe(Math.min(z1, z2) - 5)])
}

function sale(d: Difficulty, rng: RNG): Question {
  const a = ask(KS)
  const roll = rng.next()
  if (d === 1) {
    // 例 5（裙子）、做一做（运动鞋）、练习二 8（鞋）、9（书）；阅读与理解的「每满……减……」
    if (roll < 0.75) return saleOne(a, d, rng, SALES6, true)
    if (roll < 0.9) return qMinus(a, d, rng, true)
    return saleOne(a, d, rng, SALES6, false)
  }
  if (d === 2) {
    if (roll < 0.45) return saleOne(a, d, rng, SALES6, false)
    if (roll < 0.7) return qTwiceZhe(a, d, rng)
    if (roll < 0.85) return qMinus(a, d, rng, false)
    return saleOne(a, d, rng, SALE_S1, true)
  }
  if (roll < 0.5) return qTwiceZhe(a, d, rng)
  return saleOne(a, d, rng, SALES6, false)
}

// ═════════════════════════════════════════════════════════════
// 成数（六下 m6s2-02-chengshu）
// ═════════════════════════════════════════════════════════════

/** 课本的成数：一成 10%、二成（两成）20%、三成 30%、三成五 35%、二成五 25%……（数是十分之几 × 10） */
export const CHENG = [10, 20, 30, 35, 25, 40, 50, 60, 75, 80, 90, 15, 45]
const CA = ask(KC)
/** 成数改写成百分数；常错：三成五写成 3.5%、305% */
function qChengPct(d: Difficulty, rng: RNG): Question {
  const two = rng.chance(0.12)
  const c = two ? 20 : rng.pick(CHENG)
  const tens = Math.floor(c / 10)
  const glued = c % 10 ? pct(tens * 100 + (c % 10)) : pct(tens)
  return choose(CA, d, rng, `cpct-${two ? 'two' : c}`, [T('m6.pct2.ch.rule'), T('m6.pct2.ch.toPct', { c: cheng(two ? 'two' : c) })], pct(c), [pct(c / 10), glued, pct(100 - c)])
}
/** 二成就是十分之几（只出整成） */
function qChengFrac(d: Difficulty, rng: RNG): Question {
  const n = rng.int(1, 9)
  const two = n === 2 && rng.chance(0.4)
  const w = L(`m6.pct2.d.${n}`)
  const wrongs = [L('m6.pct2.hundredths', { w }), ...(n > 1 ? [L('m6.pct2.over', { w })] : [L('m6.pct2.tenths', { w: L('m6.pct2.d.9') })])]
  return choose(CA, d, rng, `cfrac-${two ? 'two' : n}`, [T('m6.pct2.ch.toFrac', { c: cheng(two ? 'two' : n * 10) })], L('m6.pct2.tenths', { w }), wrongs)
}
/** 百分数是几成：45% 是四成五 */
function qPctCheng(d: Difficulty, rng: RNG): Question {
  const c = rng.pick(CHENG)
  const t = Math.floor(c / 10) * 10
  const wrongs = c % 10 ? [cheng(t), cheng(t + 10)] : [cheng(c + 5), cheng(c >= 20 ? c - 10 : c + 10)]
  return choose(CA, d, rng, `pctc-${c}`, [T('m6.pct2.ch.fromPct', { p: c })], cheng(c), wrongs)
}
/** 例 2：去年用电 350 万千瓦时，今年节电二成五（350 × (1 − 25%)）；常错：只算了节约的、直接减 25 */
function qSaveCheng(d: Difficulty, rng: RNG, book: boolean): Question {
  const c = book ? 25 : rng.pick([10, 20, 25, 30])
  const a = book ? 350 : c === 25 ? 4 * rng.int(50, 150) : 10 * rng.int(20, 60)
  const v = money((a * (100 - c)) / 100)
  return amount(CA, d, rng, `csave-${a}-${c}`, [T('m6.pct2.ch.save', { a, c: cheng(c) })], v, [money((a * c) / 100), a - c, money((a * (100 + c)) / 100)])
}
/** 做一做：今年接待游客约 96 万人次，比去年增加两成，去年约多少（96 ÷ (1 + 20%)）；常错：96 × 80%、96 × 120% */
function qBackCheng(d: Difficulty, rng: RNG, book: boolean): Question {
  const c = book ? 20 : rng.pick([10, 20, 30, 50])
  const old = book ? 80 : 10 * rng.int(3, 20)
  const now = (old * (100 + c)) / 100
  const two = book || (c === 20 && rng.chance(0.5))
  return keyIn(CA, d, rng, `cback-${now}-${c}`, [T('m6.pct2.ch.back', { b: fmt(now), c: cheng(two ? 'two' : c) })], old, 9999)
}
/** 练习二 4：前年 48 万吨，去年增产二成（48 × (1 + 20%) = 57.6）；常错：只算增加的、乘 (1 − 20%) */
function qUpCheng(d: Difficulty, rng: RNG, book: boolean): Question {
  const c = book ? 20 : rng.pick([10, 20, 30, 15])
  const a = book ? 48 : c === 15 ? 20 * rng.int(2, 10) : 10 * rng.int(3, 20)
  const v = money((a * (100 + c)) / 100)
  return amount(CA, d, rng, `cup-${a}-${c}`, [T('m6.pct2.ch.up', { a, c: cheng(c) })], v, [money((a * c) / 100), money((a * (100 - c)) / 100)])
}
/** 练习二 5：2 月份出口汽车 1.3 万辆，比上月增加三成，1 月份多少（1.3 ÷ 1.3 = 1） */
function qCarCheng(d: Difficulty, rng: RNG, book: boolean): Question {
  const old = book ? 1 : rng.int(2, 9)
  const now = money((old * 130) / 100)
  return keyIn(CA, d, rng, `ccar-${old}`, [T('m6.pct2.ch.car', { b: fmt(now), c: cheng(30) })], old, 99)
}
/** 判断：增产二成就是今年是去年的 20%（不对）/ 120%（对） */
function qChengJudge(d: Difficulty, rng: RNG): Question {
  const c = rng.pick([10, 20, 30, 50])
  const truth = rng.chance(0.5)
  return judge(CA, d, rng, `cj-${c}-${truth ? 'y' : 'n'}`, [T('m6.pct2.ch.j', { c: cheng(c), p: truth ? 100 + c : c })], truth)
}
/** 增产三成：多收的是去年的百分之几（30%） */
function qChengMean(d: Difficulty, rng: RNG): Question {
  const c = rng.pick([10, 20, 30, 35, 25])
  return choose(CA, d, rng, `cmean-${c}`, [T('m6.pct2.ch.mean', { c: cheng(c) })], pct(c), [pct(100 + c), pct(c / 10)])
}
/** 第 2 档：去年 100 吨、今年 130 吨，增加了几成 */
function qHowMany(d: Difficulty, rng: RNG): Question {
  const c = rng.pick([10, 20, 30, 40, 50, 25, 15])
  const old = c % 10 ? 20 * rng.int(2, 10) : 10 * rng.int(2, 20)
  const now = (old * (100 + c)) / 100
  return choose(CA, d, rng, `chow-${old}-${now}`, [T('m6.pct2.ch.how', { a: old, b: fmt(now) })], cheng(c), [cheng(c + 10 <= 95 ? c + 10 : c - 5), cheng(c % 10 ? c - 5 : c + 5)])
}
/** 第 3 档：练习二 11*（改写成「减少了 9.5%」）：17424.3 ÷ (1 − 9.5%) ≈ 19253.4 */
function qTv(d: Difficulty, rng: RNG): Question {
  return choose(CA, d, rng, 'tv', [T('m6.pct2.ch.tv')], '19253.4', ['15769.0', '19079.6'])
}

function chengshu(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 说明（一成、二成、三成五）、例 2、做一做、练习二 4、5
    if (roll < 0.14) return qChengPct(d, rng)
    if (roll < 0.24) return qChengFrac(d, rng)
    if (roll < 0.33) return qPctCheng(d, rng)
    if (roll < 0.46) return qSaveCheng(d, rng, rng.chance(0.5))
    if (roll < 0.59) return qBackCheng(d, rng, rng.chance(0.5))
    if (roll < 0.72) return qUpCheng(d, rng, rng.chance(0.5))
    if (roll < 0.82) return qCarCheng(d, rng, rng.chance(0.5))
    if (roll < 0.91) return qChengJudge(d, rng)
    return qChengMean(d, rng)
  }
  if (d === 2) {
    if (roll < 0.3) return qHowMany(d, rng)
    if (roll < 0.5) return qSaveCheng(d, rng, false)
    if (roll < 0.7) return qBackCheng(d, rng, false)
    if (roll < 0.85) return qUpCheng(d, rng, false)
    return qCarCheng(d, rng, false)
  }
  if (roll < 0.4) return qTv(d, rng)
  return qHowMany(d, rng)
}

// ═════════════════════════════════════════════════════════════
// 税率（六下 m6s2-02-tax）
// ═════════════════════════════════════════════════════════════

const TA = ask(KT)
/** 应纳税额、税率是什么 */
function qTaxWord(d: Difficulty, rng: RNG): Question {
  const amountQ = rng.chance(0.5)
  if (amountQ) return choose(TA, d, rng, 'taxword-amount', [T('m6.pct2.tax.whatAmount')], L('m6.pct2.w.taxAmount'), [L('m6.pct2.w.taxRate'), L('m6.pct2.w.sales')])
  return choose(TA, d, rng, 'taxword-rate', [T('m6.pct2.tax.whatRate')], L('m6.pct2.w.taxRate'), [L('m6.pct2.w.rate'), L('m6.pct2.w.discount')])
}
/** 例 3：按销售额的 3% 缴纳增值税，10 月份销售额 30 万元，缴 0.9 万元；常错：3% 当 0.3、0.003 */
function qVat(d: Difficulty, rng: RNG, book: boolean): Question {
  const r = book ? 3 : rng.pick([3, 5, 6, 9, 13])
  const s = book ? 30 : 10 * rng.int(1, 9)
  const m = book ? 10 : rng.int(1, 12)
  const v = money((s * r) / 100)
  return amount(TA, d, rng, `vat-${s}-${r}-${m}`, [T('m6.pct2.tax.vat', { r: pct(r), m, s })], v, [money(v * 10), money(v / 10), money(s - v)])
}
/** 做一做：工资中要纳税的部分 2500 元，按 3% 缴个人所得税（75 元） */
function qWage(d: Difficulty, rng: RNG, book: boolean): Question {
  const s = book ? 2500 : 100 * rng.int(10, 99)
  return keyIn(TA, d, rng, `wage-${s}`, [T('m6.pct2.tax.wage', { s, r: '3%' })], (s * 3) / 100, 9999)
}
/** 练习二 6：化妆品售价 200 元，消费税占售价的 15%（30 元） */
function qConsume(d: Difficulty, rng: RNG, book: boolean): Question {
  const p = book ? 200 : 20 * rng.int(3, 30)
  return keyIn(TA, d, rng, `consume-${p}`, [T('m6.pct2.tax.consume', { p, r: '15%' })], (p * 15) / 100, 9999)
}
/** 练习二 7：劳务报酬 3000 元，800 元免税，其余按 20% 缴税（440 元）；常错：忘了扣免税的 800 元 */
function qLabor(d: Difficulty, rng: RNG, book: boolean): Question {
  const p = book ? 3000 : 100 * rng.int(10, 60)
  return keyIn(TA, d, rng, `labor-${p}`, [T('m6.pct2.tax.labor', { p })], ((p - 800) * 20) / 100, 9999)
}
/** 第 2 档：知道税款和要纳税的部分，求税率；知道税率和税款，求要纳税的部分；扣掉消费税还剩多少 */
function qTaxBack(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (roll < 0.35) {
    const r = rng.pick([3, 5, 6, 10])
    const s = 1000 * rng.int(1, 9)
    return choose(TA, d, rng, `taxrate-${s}-${r}`, [T('m6.pct2.tax.rateBack', { s, t: (s * r) / 100 })], pct(r), [pct(r * 10), pct(r / 10)])
  }
  if (roll < 0.7) {
    const s = 100 * rng.int(10, 99)
    return keyIn(TA, d, rng, `taxbase-${s}`, [T('m6.pct2.tax.baseBack', { r: '3%', t: (s * 3) / 100 })], s, 99999)
  }
  const p = 20 * rng.int(3, 30)
  return keyIn(TA, d, rng, `taxleft-${p}`, [T('m6.pct2.tax.left', { p, r: '15%' })], (p * 85) / 100, 9999)
}

function tax(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d === 1) {
    // 说明（应纳税额、税率）、例 3、做一做、练习二 6、7
    if (roll < 0.16) return qTaxWord(d, rng)
    if (roll < 0.36) return qVat(d, rng, rng.chance(0.5))
    if (roll < 0.56) return qWage(d, rng, rng.chance(0.4))
    if (roll < 0.74) return qConsume(d, rng, rng.chance(0.4))
    if (roll < 0.92) return qLabor(d, rng, rng.chance(0.4))
    return judge(TA, d, rng, 'taxj', [T('m6.pct2.tax.j')], false)
  }
  if (d === 2) {
    if (roll < 0.6) return qTaxBack(d, rng)
    if (roll < 0.8) return qVat(d, rng, false)
    return qLabor(d, rng, false)
  }
  return qTaxBack(d, rng)
}

// ═════════════════════════════════════════════════════════════
// 利率（六上 m6s1-07-interest、六下 m6s2-02-interest）
// ═════════════════════════════════════════════════════════════

/** 中国人民银行 2015 年 10 月 23 日公布的存款基准利率（年利率 %），两册课本同一张表 */
export const RATES: { id: string; r: string }[] = [
  { id: 'live', r: '0.35' },
  { id: 'm3', r: '1.10' },
  { id: 'm6', r: '1.30' },
  { id: 'y1', r: '1.50' },
  { id: 'y2', r: '2.10' },
  { id: 'y3', r: '2.75' },
]
const YEARS: Record<string, number> = { y1: 1, y2: 2, y3: 3 }
const rateOf = (term: string): number => Number(RATES.find((x) => x.id === term)!.r)
/** 一笔存款：谁、本金、存期（一年 / 二年 / 三年定期） */
export interface Deposit {
  who: string
  p: number
  term: 'y1' | 'y2' | 'y3'
}
export const interestOf = (x: Deposit): number => money((x.p * rateOf(x.term) * YEARS[x.term]!) / 100)
/** 例题（两册都是王奶奶 5000 元二年）、做一做（张爷爷 8000 元三年）；六上练习十五 3（小明 800 元一年） */
export const DEPOSIT_BOOK: Deposit[] = [
  { who: 'wang', p: 5000, term: 'y2' },
  { who: 'zhang', p: 8000, term: 'y3' },
]
export const DEPOSIT_S1_EX3: Deposit = { who: 'ming', p: 800, term: 'y1' }
/** 随机存款：利息是整数（一年 200 的倍数、二年 500 的倍数、三年 400 的倍数） */
function randomDeposit(rng: RNG): Deposit {
  const term = rng.pick(['y1', 'y2', 'y3'] as const)
  // 本金取整千（三年定期取 2000 的倍数），利息都是整数
  const p = term === 'y3' ? 2000 * rng.int(1, 10) : 1000 * rng.int(1, 20)
  return { who: rng.pick(['wang', 'zhang', 'ming', 'mom', 'li']), p, term }
}
const rateTable: StemPart = {
  kind: 'stat-table',
  head: 'row',
  title: L('m6.pct2.th.title'),
  rows: [[L('m6.pct2.th.term'), L('m6.pct2.th.rate')], ...RATES.map((x) => [L(`m6.pct2.term.${x.id}`), x.r])],
}
const depositCtx = (x: Deposit): StemPart => T('m6.pct2.int.ctx', { who: L(`m6.pct2.who.${x.who}`), p: x.p, term: L(`m6.pct2.term.${x.term}`), r: `${RATES.find((y) => y.id === x.term)!.r}%` })
/** 本金、利息、利率、存期是什么（六上课本没把利率说成「比率」，六上只问本金、利息、存期） */
function qIntWord(a: Ask, d: Difficulty, rng: RNG, book: 1 | 2): Question {
  const words = book === 1 ? ['principal', 'interest', 'term'] : ['principal', 'interest', 'rate', 'term']
  const w = rng.pick(words)
  const all = ['principal', 'interest', 'rate', 'term'].filter((x) => x !== w)
  return choose(a, d, rng, `intword-${w}`, [T(`m6.pct2.int.what.${w}`)], L(`m6.pct2.w.${w}`), rng.shuffle(all).slice(0, 2).map((x) => L(`m6.pct2.w.${x}`)))
}
/** 利息怎样算 */
function qIntFormula(a: Ask, d: Difficulty, rng: RNG): Question {
  return choose(a, d, rng, 'intformula', [T('m6.pct2.int.formula.q')], L('m6.pct2.f.right'), [L('m6.pct2.f.noTerm'), L('m6.pct2.f.plus'), L('m6.pct2.f.div')])
}
/** 查利率表 */
function qRateTable(a: Ask, d: Difficulty, rng: RNG): Question {
  const x = rng.pick(RATES)
  const others = rng.shuffle(RATES.filter((y) => y.id !== x.id)).slice(0, 2)
  const q = x.id === 'live' ? T('m6.pct2.int.table.live') : T('m6.pct2.int.table.q', { term: L(`m6.pct2.term.${x.id}`) })
  return choose(a, d, rng, `ratetable-${x.id}`, [rateTable, q], `${x.r}%`, others.map((y) => `${y.r}%`))
}
/** 到期得多少利息 / 连本带息一共取出多少；常错：忘乘存期、问本息只答利息 */
function qInterest(a: Ask, d: Difficulty, rng: RNG, x: Deposit): Question {
  const i = interestOf(x)
  if (rng.chance(0.5)) return keyIn(a, d, rng, `interest-${x.who}-${x.p}-${x.term}`, [depositCtx(x), T('m6.pct2.int.q.interest')], Math.round(i), 999999)
  return keyIn(a, d, rng, `total-${x.who}-${x.p}-${x.term}`, [depositCtx(x), T('m6.pct2.int.q.total')], Math.round(x.p + i), 999999)
}
/** 例题的两种算法：一共取出多少，哪个算式对 */
function qIntFormula2(a: Ask, d: Difficulty, rng: RNG): Question {
  const x = rng.pick(DEPOSIT_BOOK)
  const r = `${RATES.find((y) => y.id === x.term)!.r}%`
  const n = YEARS[x.term]!
  return choose(a, d, rng, `intformula2-${x.who}`, [depositCtx(x), T('m6.pct2.int.q.formula')], `${x.p} × (1 + ${r} × ${n})`, [`${x.p} × ${r} × ${n}`, `${x.p} × (1 + ${r})`, `${x.p} + ${r} × ${n}`])
}
/** 判断：利息 = 本金 × 利率（不对）/ 本金 × 利率 × 存期（对） */
function qIntJudge(a: Ask, d: Difficulty, rng: RNG): Question {
  const truth = rng.chance(0.4)
  return judge(a, d, rng, `intj-${truth ? 'y' : 'n'}`, [T(truth ? 'm6.pct2.int.jRight' : 'm6.pct2.int.jWrong')], truth)
}
/** 六上练习十五 7：信用卡账单 10000 元分期付清，每期按总额付分期利率（表） */
export const CARD: { n: number; r: string }[] = [
  { n: 3, r: '0.65' },
  { n: 6, r: '0.60' },
  { n: 12, r: '0.60' },
  { n: 18, r: '0.65' },
  { n: 24, r: '0.63' },
]
function qCard(a: Ask, d: Difficulty, rng: RNG): Question {
  const c = rng.pick(CARD)
  // 课本的分期利率表有五行，配数字键盘手机竖屏放不下；题里已经写了这一种分法的利率，表不画
  return keyIn(a, d, rng, `card-${c.n}`, [T('m6.pct2.card.q', { n: c.n, r: `${c.r}%` })], Math.round(10000 * Number(c.r) * c.n) / 100, 99999)
}
/** 六上练习十五 5 前一半、六下练习二 10* 前一半：1 万元买三年期国债（2.38% → 714 元；3.35% → 1005 元） */
function qBond(a: Ask, d: Difficulty, rng: RNG, r: string): Question {
  return keyIn(a, d, rng, `bond-${r}`, [T('m6.pct2.bond.q', { r: `${r}%` })], Math.round(10000 * Number(r) * 3) / 100, 99999)
}
/** 第 3 档：国债和一年期续存 / 理财比收益（要算三次，结果是约数） */
function qBondCompare(a: Ask, d: Difficulty, rng: RNG, book: 1 | 2): Question {
  if (book === 1) return choose(a, d, rng, 'bondcmp1', [T('m6.pct2.bond.cmp1')], L('m6.pct2.about', { n: '257.22' }), [L('m6.pct2.about', { n: '264' }), L('m6.pct2.about', { n: '714' })])
  return choose(a, d, rng, 'bondcmp2', [T('m6.pct2.bond.cmp2')], L('m6.pct2.about', { n: '114.35' }), [L('m6.pct2.about', { n: '75' }), L('m6.pct2.about', { n: '1005' })])
}
/** 第 2 档：存三年比存二年多得多少利息（同一笔钱） */
function qMoreTerm(a: Ask, d: Difficulty, rng: RNG): Question {
  const p = 2000 * rng.int(1, 10)
  const i3 = interestOf({ who: 'mom', p, term: 'y3' })
  const i2 = interestOf({ who: 'mom', p, term: 'y2' })
  // 只用到二年、三年两种利率：写在题里，不画整张利率表（七行表配数字键盘手机竖屏放不下）
  return amount(a, d, rng, `moreterm-${p}`, [T('m6.pct2.int.more', { p })], money(i3 - i2), [i3, i2])
}

function interest(book: 1 | 2): (d: Difficulty, rng: RNG) => Question {
  const a = ask(book === 1 ? K1I : KI)
  return (d, rng) => {
    const roll = rng.next()
    if (d === 1) {
      // 储蓄、本金、利息、利率（六下）、存期、公式、利率表、例题、做一做（六上还有练习十五 3）
      if (roll < 0.14) return qIntWord(a, d, rng, book)
      if (roll < 0.22) return qIntFormula(a, d, rng)
      if (roll < 0.34) return qRateTable(a, d, rng)
      if (roll < 0.62) return qInterest(a, d, rng, rng.chance(0.5) ? rng.pick(book === 1 ? [...DEPOSIT_BOOK, DEPOSIT_S1_EX3] : DEPOSIT_BOOK) : randomDeposit(rng))
      if (roll < 0.82) return qInterest(a, d, rng, randomDeposit(rng))
      if (roll < 0.92) return qIntFormula2(a, d, rng)
      return qIntJudge(a, d, rng)
    }
    if (d === 2) {
      if (book === 1 && roll < 0.35) return roll < 0.2 ? qCard(a, d, rng) : qBond(a, d, rng, '2.38')
      if (roll < 0.55) return qMoreTerm(a, d, rng)
      return qInterest(a, d, rng, randomDeposit(rng))
    }
    if (roll < 0.5) return qBondCompare(a, d, rng, book)
    return book === 2 ? qBond(a, d, rng, '3.35') : qMoreTerm(a, d, rng)
  }
}

defineGenerator(K1D, discount(1))
defineGenerator(KD, discount(2))
defineGenerator(KS, sale)
defineGenerator(KC, chengshu)
defineGenerator(KT, tax)
defineGenerator(K1I, interest(1))
defineGenerator(KI, interest(2))
