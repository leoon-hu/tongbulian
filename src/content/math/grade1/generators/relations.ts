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

/**
 * 两数相差几（p69–70 例 1：一班 12 面、二班 9 面，多得几面 / 少得几面；做一做 25 和 32、14 和 8）：
 * 约三分之一看图（两行实物一一对应），其余文字题（谁比谁多几 / 少几）；第 1 档的数到 30，第 2 档到 60，第 3 档到 100
 */
defineGenerator('s2-06-diff', (d, rng) => {
  const kpId = 's2-06-diff'
  const [a1, a2] = rng.shuffle(NAMES).slice(0, 2) as [string, string]
  const item = rng.pick(ITEMS)
  if (rng.chance(d === 1 ? 0.3 : 0.15)) {
    const [iconA, iconB] = rng.shuffle(ITEMS).slice(0, 2) as [string, string]
    const big = rng.int(5, 12)
    const small = rng.int(1, big - 1)
    return word(kpId, d, `pic-${iconA}${big}-${iconB}${small}`, { k: 'q.diffPic', p: { a: iconA, b: iconB } }, big - small, rng, [big + small, big, small], [
      { kind: 'compare-rows', rows: [{ icon: iconA, count: big }, { icon: iconB, count: small }] },
    ])
  }
  const cap = d === 1 ? 30 : d === 2 ? 60 : 100
  const big = rng.int(10, cap)
  const small = rng.int(1, big - 1)
  const more = rng.chance(0.5)
  const text: LStr = more
    ? { k: 'q.diffMore', p: { a1, a2, item, n: big, m: small } }
    : { k: 'q.diffLess', p: { a1, a2, item, n: big, m: small } }
  return word(kpId, d, `${more ? 'more' : 'less'}-${big}-${small}`, text, big - small, rng, [big + small, big, small])
})

/**
 * 求比一个数多几 / 少几的数（p71 例 2：三班比一班多得 3 面、四班比一班少 4 面），
 * 约四分之一是连续两问（p73 例 3：小红比妈妈少 5 次，两人一共多少次；做一做「多 6 本」、练一练「少 7 人」），直接问一共有几个
 */
defineGenerator('s2-06-more-less', (d, rng) => {
  const kpId = 's2-06-more-less'
  const [a1, a2] = rng.shuffle(NAMES).slice(0, 2) as [string, string]
  const item = rng.pick(ITEMS)
  const cap = d === 1 ? 30 : d === 2 ? 60 : 100
  if (rng.chance(0.25)) {
    // 连续两问：A 有 n 个，B 比 A 多（少）k 个，两人一共有几个
    const n = rng.int(10, d === 1 ? 20 : 40)
    const more = rng.chance(0.5)
    const k = rng.int(2, more ? 15 : n - 2)
    const b = more ? n + k : n - k
    const key = more ? 'q.moreThanTotal' : 'q.lessThanTotal'
    return word(kpId, d, `both-${more ? 'm' : 'l'}-${n}-${k}`, { k: key, p: { a1, a2, item, n, k } }, n + b, rng, [b, n + n, n + b + 1, n + b - 1, more ? n + n - k : n + n + k])
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
