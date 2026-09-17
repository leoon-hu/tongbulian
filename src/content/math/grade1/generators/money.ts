import type { Difficulty, LStr, MoneyPiece, Question } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator } from '@/engine'
import { labelQuestion, numberQuestion } from './common'

// 面额（分）：角币画成硬币（1 角、5 角），元币画成纸币（1 元、5 元、10 元）
const NOTE_FEN = [100, 500, 1000]

function piece(fen: number): MoneyPiece {
  return { fen, form: fen < 100 ? 'coin' : 'note' }
}

function moneyLabel(fen: number): LStr {
  return { k: 'money.amount', p: { fen } }
}

/** 金额型干扰项：优先 ±1 元 / ±5 角 / +2 元，不足时从 5 角起每 5 角补；互异、为正、小于 max。 */
function moneyDistractors(correct: number, max = Infinity): LStr[] {
  const out: LStr[] = []
  const seen = new Set<number>([correct])
  const push = (f: number): void => {
    if (f > 0 && f < max && !seen.has(f) && out.length < 3) {
      seen.add(f)
      out.push(moneyLabel(f))
    }
  }
  for (const f of [correct + 100, correct - 100, correct + 50, correct - 50, correct + 200]) push(f)
  for (let f = 50; out.length < 3 && f < max; f += 50) push(f)
  return out
}

/**
 * 认识人民币：显示一把钱，问一共多少钱。
 * d1 只有整元、d2 加到 10 元、d3 出现角与元角混合。
 */
function genRecognize(d: Difficulty, rng: RNG): Question {
  const denoms = d === 1 ? [100, 500] : d === 2 ? NOTE_FEN : [10, 50, 100, 500]
  const count = rng.int(2, d === 1 ? 3 : 4)
  const pieces: MoneyPiece[] = Array.from({ length: count }, () => piece(rng.pick(denoms)))
  const total = pieces.reduce((s, p) => s + p.fen, 0)
  const sig = pieces
    .map((p) => p.fen)
    .sort((a, b) => a - b)
    .join('-')
  return labelQuestion({
    kpId: 's2-07-money',
    type: 'money',
    difficulty: d,
    sig: `mn-${sig}`,
    stem: [
      { kind: 'text', text: { k: 'q.totalMoney' } },
      { kind: 'money', pieces },
    ],
    correct: moneyLabel(total),
    distractors: moneyDistractors(total),
    rng,
  })
}

/**
 * 简单的计算——付钱找零：买东西花了 price，付了整钞 pay，应找回 pay - price。
 * d1 整元、d2/d3 可能含角。选项为金额。
 */
function genChange(d: Difficulty, rng: RNG): Question {
  const yuan = rng.int(1, d === 3 ? 8 : 4)
  const jiao = d === 1 ? 0 : rng.pick([0, 0, 5]) // d2/d3 有时含 5 角
  const price = yuan * 100 + jiao * 10
  const pay = price < 500 ? 500 : 1000 // 付 5 元 或 10 元
  const change = pay - price
  return labelQuestion({
    kpId: 's2-07-money',
    type: 'money',
    difficulty: d,
    sig: `chg-${price}-${pay}`,
    stem: [
      { kind: 'text', text: { k: 'q.moneyChange', p: { price: moneyLabel(price), pay: moneyLabel(pay) } } },
    ],
    correct: moneyLabel(change),
    distractors: moneyDistractors(change, pay),
    rng,
  })
}

/** 简单的计算——元角换算：1 元 = 10 角。数字键盘作答。 */
function genConvert(d: Difficulty, rng: RNG): Question {
  const yuan = rng.int(1, 9)
  if (rng.chance(0.5)) {
    // 元 → 角
    return numberQuestion({
      kpId: 's2-07-money',
      type: 'money',
      difficulty: d,
      sig: `cvt-y2j-${yuan}`,
      stem: [{ kind: 'text', text: { k: 'q.moneyY2J', p: { yuan } } }],
      value: yuan * 10,
      rng,
      min: 0,
      max: 90,
    })
  }
  // 角 → 元
  return numberQuestion({
    kpId: 's2-07-money',
    type: 'money',
    difficulty: d,
    sig: `cvt-j2y-${yuan}`,
    stem: [{ kind: 'text', text: { k: 'q.moneyJ2Y', p: { jiao: yuan * 10 } } }],
    value: yuan,
    rng,
    min: 0,
    max: 9,
  })
}

function genMoney(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (roll < 0.55) return genRecognize(d, rng)
  if (roll < 0.8) return genChange(d, rng)
  return genConvert(d, rng)
}

defineGenerator('s2-07-money', genMoney)
