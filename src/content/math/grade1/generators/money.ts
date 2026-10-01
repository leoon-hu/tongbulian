import type { Difficulty, LStr, MoneyPiece, Question } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator } from '@/engine'
import { labelQuestion, numberQuestion } from './common'

// ☆ 欢乐购物街（一下 p77–82）：认一认（纸币 100、50、20、10、5、1 元，硬币 1 元、5 角、1 角、5 分、2 分、1 分；
// 单位元、角、分）、一共多少钱（「（ ）元（ ）角」「（ ）角（ ）分」）、换一换（1 元 = 10 角、1 角 = 10 分、
// 1 张 20 元换 2 张 10 元或 4 张 5 元、1 张 10 元换 1 张 5 元和 5 张 1 元）、买卖我做主（8 元的东西收 10 元找零，只有整元）。
// 金额以「分」存。

const KP = 's2-07-money'
const NOTES = [100, 500, 1000, 2000, 5000, 10000]
const COINS = [100, 50, 10, 5, 2, 1]

function moneyLabel(fen: number): LStr {
  return { k: 'money.amount', p: { fen } }
}

/** 金额型干扰项：按这个金额的最小单位（元 / 角 / 分）上下挪；互异、为正、小于 max。 */
function moneyDistractors(correct: number, max = Infinity): LStr[] {
  const unit = correct % 10 ? 1 : correct % 100 ? 10 : 100
  const out: LStr[] = []
  const seen = new Set<number>([correct])
  const push = (f: number): void => {
    if (f > 0 && f < max && !seen.has(f) && out.length < 3) {
      seen.add(f)
      out.push(moneyLabel(f))
    }
  }
  for (const k of [1, -1, 2, -2, 5, -5, 10, -10, 3, -3]) push(correct + k * unit)
  return out
}

/** 认一认：一张纸币或一个硬币，是多少钱。干扰项是同一个数字换个单位（5 元、5 角、5 分、50 元），课本最怕的就是元角分弄混 */
function genIdentify(d: Difficulty, rng: RNG): Question {
  const coin = rng.chance(0.45)
  const fen = rng.pick(coin ? COINS : NOTES)
  const digit = Number(String(fen)[0])
  const same = [1, 10, 100, 1000, 10000].map((m) => digit * m).filter((f) => f !== fen)
  const distractors = rng.shuffle(same).slice(0, 3).map(moneyLabel)
  return labelQuestion({
    kpId: KP,
    type: 'money',
    difficulty: d,
    sig: `id-${coin ? 'c' : 'n'}${fen}`,
    stem: [
      { kind: 'text', text: { k: 'q.whatMoney' } },
      { kind: 'money', pieces: [{ fen, form: coin ? 'coin' : 'note' }] },
    ],
    correct: moneyLabel(fen),
    distractors,
    rng,
  })
}

/**
 * 一共多少钱：几元几角（纸币 + 1 元 / 5 角 / 1 角硬币，课本 p79「5 元、1 元和 2 个 1 角」）或几角几分（角币 + 分币）。
 * 第 1 档 2~4 张，第 2 档起 3~5 张、可以有 20 元。
 */
function genTotal(d: Difficulty, rng: RNG): Question {
  const jiaoFen = rng.chance(0.35)
  const pool: { fen: number; form: 'note' | 'coin' }[] = jiaoFen
    ? [
        { fen: 50, form: 'coin' },
        { fen: 10, form: 'coin' },
        { fen: 5, form: 'coin' },
        { fen: 2, form: 'coin' },
        { fen: 1, form: 'coin' },
      ]
    : [
        { fen: 1000, form: 'note' },
        { fen: 500, form: 'note' },
        { fen: 100, form: 'note' },
        { fen: 100, form: 'coin' },
        { fen: 50, form: 'coin' },
        { fen: 10, form: 'coin' },
        ...(d === 1 ? [] : [{ fen: 2000, form: 'note' as const }]),
      ]
  const count = rng.int(d === 1 ? 2 : 3, d === 1 ? 4 : 5)
  let pieces: MoneyPiece[] = Array.from({ length: count }, () => ({ ...rng.pick(pool) }))
  // 几角几分不满 1 元（课本「（ ）角（ ）分」）
  if (jiaoFen) {
    while (pieces.reduce((s, p) => s + p.fen, 0) >= 100) pieces = pieces.slice(1)
    if (pieces.length < 2) pieces.push({ fen: rng.pick([1, 2, 5]), form: 'coin' })
  }
  pieces.sort((a, b) => b.fen - a.fen)
  const total = pieces.reduce((s, p) => s + p.fen, 0)
  return labelQuestion({
    kpId: KP,
    type: 'money',
    difficulty: d,
    sig: `mn-${pieces.map((p) => `${p.form[0]}${p.fen}`).join('-')}`,
    stem: [
      { kind: 'text', text: { k: 'q.totalMoney' } },
      { kind: 'money', pieces },
    ],
    correct: moneyLabel(total),
    distractors: moneyDistractors(total),
    rng,
  })
}

/** 换算：1 元 = 10 角、1 角 = 10 分（p79）。数字键盘作答。 */
function genConvert(d: Difficulty, rng: RNG): Question {
  const n = rng.int(1, 9)
  const kind = rng.pick(['y2j', 'j2y', 'j2f', 'f2j'] as const)
  const spec: { key: string; p: Record<string, number>; value: number } = {
    y2j: { key: 'q.moneyY2J', p: { yuan: n }, value: n * 10 },
    j2y: { key: 'q.moneyJ2Y', p: { jiao: n * 10 }, value: n },
    j2f: { key: 'q.moneyJ2F', p: { jiao: n }, value: n * 10 },
    f2j: { key: 'q.moneyF2J', p: { fen: n * 10 }, value: n },
  }[kind]
  return numberQuestion({
    kpId: KP,
    type: 'money',
    difficulty: d,
    sig: `cvt-${kind}-${n}`,
    stem: [{ kind: 'text', text: { k: spec.key, p: spec.p } }],
    value: spec.value,
    rng,
    min: 0,
    max: 100,
    smart: [n, n * 100, spec.value + 10, spec.value - 1],
  })
}

/**
 * 换一换（p77「一张 20 元可以换几张 1 元」、p79「1 张 20 元可以换 2 张 10 元或 4 张 5 元」「1 张 10 元可以换 1 张 5 元和 5 张 1 元」、
 * 1 元 = 10 个 1 角、1 角 = 10 个 1 分）：[大面额, 换成的面额, 换成的是纸币吗, 先换一张的面额（可以没有）]
 */
const EXCHANGES: [number, number, boolean, number?][] = [
  [2000, 1000, true],
  [2000, 500, true],
  [2000, 100, true],
  [1000, 500, true],
  [1000, 100, true],
  [500, 100, true],
  [5000, 1000, true],
  [10000, 5000, true],
  [10000, 1000, true],
  [100, 10, false],
  [100, 50, false],
  [50, 10, false],
  [10, 1, false],
  [1000, 100, true, 500],
  [2000, 500, true, 1000],
  [2000, 100, true, 1000],
  [5000, 1000, true, 2000],
  [10000, 1000, true, 5000],
]
function genExchange(d: Difficulty, rng: RNG): Question {
  const [big, small, note, first] = rng.pick(EXCHANGES)
  const value = (big - (first ?? 0)) / small
  const text: LStr = first
    ? { k: 'q.exchangeMix', p: { big: moneyLabel(big), mid: moneyLabel(first), small: moneyLabel(small) } }
    : { k: note ? 'q.exchangeNote' : 'q.exchangeCoin', p: { big: moneyLabel(big), small: moneyLabel(small) } }
  return numberQuestion({
    kpId: KP,
    type: 'money',
    difficulty: d,
    sig: `ex-${big}-${first ?? 0}-${small}`,
    stem: [{ kind: 'text', text }],
    value,
    rng,
    min: 0,
    max: 100,
    smart: [value + 1, value - 1, value * 2, big / small],
  })
}

/** 付钱找零（p81「我卖了一个 8 元的布娃娃，买家付了我 10 元」）：只有整元。第 1 档付 10 元（或 5 元），第 2 档起可以付 20 元 */
function genChange(d: Difficulty, rng: RNG): Question {
  const pay = d === 1 ? rng.pick([1000, 1000, 500]) : rng.pick([1000, 2000, 2000])
  const price = rng.int(1, pay / 100 - 1) * 100
  const change = pay - price
  return labelQuestion({
    kpId: KP,
    type: 'money',
    difficulty: d,
    sig: `chg-${price}-${pay}`,
    stem: [{ kind: 'text', text: { k: 'q.moneyChange', p: { price: moneyLabel(price), pay: moneyLabel(pay) } } }],
    correct: moneyLabel(change),
    distractors: moneyDistractors(change, pay),
    rng,
  })
}

function genMoney(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (roll < 0.2) return genIdentify(d, rng)
  if (roll < 0.5) return genTotal(d, rng)
  if (roll < 0.68) return genConvert(d, rng)
  if (roll < 0.85) return genExchange(d, rng)
  return genChange(d, rng)
}

defineGenerator('s2-07-money', genMoney)
