import type { Difficulty, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 数量间的加减关系（一下）：求两数相差几、求比一个数多（少）几的数、含相差关系的连续两问
// ─────────────────────────────────────────────────────────────

const ITEMS = ['🍎', '🍬', '⭐', '🎈', '🍪', '📚', '🌸', '🎁']
const NAMES = ['🐰', '🐶', '🐱', '🐼', '🦊', '🐷']

function word(kpId: string, d: Difficulty, sig: string, text: LStr, value: number, rng: RNG, smart: number[], extra: StemPart[] = []): Question {
  return numberQuestion({ kpId, type: 'arith', difficulty: d, sig, stem: [{ kind: 'text', text }, ...extra], value, rng, min: 0, max: 100, smart })
}

/** 两数相差几：d1 看图（两行实物一一对应），d2 / d3 文字题（谁比谁多几 / 少几） */
defineGenerator('s2-06-diff', (d, rng) => {
  const kpId = 's2-06-diff'
  const [a1, a2] = rng.shuffle(NAMES).slice(0, 2) as [string, string]
  const item = rng.pick(ITEMS)
  if (d === 1) {
    const [iconA, iconB] = rng.shuffle(ITEMS).slice(0, 2) as [string, string]
    const big = rng.int(4, 10)
    const small = rng.int(1, big - 1)
    return word(kpId, d, `pic-${iconA}${big}-${iconB}${small}`, { k: 'q.diffPic', p: { a: iconA, b: iconB } }, big - small, rng, [big + small, big, small], [
      { kind: 'compare-rows', rows: [{ icon: iconA, count: big }, { icon: iconB, count: small }] },
    ])
  }
  const cap = d === 2 ? 40 : 100
  const big = rng.int(10, cap)
  const small = rng.int(1, big - 1)
  const more = rng.chance(0.5)
  const text: LStr = more
    ? { k: 'q.diffMore', p: { a1, a2, item, n: big, m: small } }
    : { k: 'q.diffLess', p: { a1, a2, item, n: big, m: small } }
  return word(kpId, d, `${more ? 'more' : 'less'}-${big}-${small}`, text, big - small, rng, [big + small, big, small])
})

/** 求比一个数多几 / 少几的数；d3 含连续两问（先求一个，再合起来） */
defineGenerator('s2-06-more-less', (d, rng) => {
  const kpId = 's2-06-more-less'
  const [a1, a2] = rng.shuffle(NAMES).slice(0, 2) as [string, string]
  const item = rng.pick(ITEMS)
  const cap = d === 1 ? 20 : d === 2 ? 60 : 100
  if (d === 3 && rng.chance(0.35)) {
    // 连续两问：A 有 n 个，B 比 A 多 k 个，两人一共有几个
    const n = rng.int(10, 40)
    const k = rng.int(2, 15)
    return word(kpId, d, `both-${n}-${k}`, { k: 'q.moreThanTotal', p: { a1, a2, item, n, k } }, n + n + k, rng, [n + k, n + n, n + n + k + 1, n + n + k - 1])
  }
  if (rng.chance(0.5)) {
    const n = rng.int(3, cap - 3)
    const k = rng.int(1, cap - n)
    return word(kpId, d, `more-${n}-${k}`, { k: 'q.moreThan', p: { a1, a2, item, n, k } }, n + k, rng, [n - k, n, k, n + k + 1])
  }
  const n = rng.int(5, cap)
  const k = rng.int(1, n - 2)
  return word(kpId, d, `less-${n}-${k}`, { k: 'q.lessThan', p: { a1, a2, item, n, k } }, n - k, rng, [n + k, n, k, n - k - 1])
})
