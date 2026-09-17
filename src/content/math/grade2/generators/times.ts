import type { Difficulty, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 数量间的乘除关系（二下）：倍的认识（几倍 / 几倍是多少 / 一份是多少）、每份数 × 份数 = 总数 的三量关系
// ─────────────────────────────────────────────────────────────

const ITEMS = ['🍎', '🍬', '⭐', '🎈', '🍪', '🌸', '🎁', '🧁', '🥟', '🍓']
const NAMES = ['🐰', '🐶', '🐱', '🐼', '🦊', '🐷']

function word(kpId: string, d: Difficulty, sig: string, text: LStr, value: number, rng: RNG, smart: number[], extra: StemPart[] = []): Question {
  return numberQuestion({ kpId, type: value > 9 ? 'multiply' : 'divide', difficulty: d, sig, stem: [{ kind: 'text', text }, ...extra], value, rng, min: 1, max: 81, smart })
}

// ── 倍的认识 ──
defineGenerator('m2s2-03-times', (d, rng) => {
  const kpId = 'm2s2-03-times'
  const [a1, a2] = rng.shuffle(NAMES).slice(0, 2) as [string, string]
  const item = rng.pick(ITEMS)
  const n = rng.int(2, d === 1 ? 4 : 9) // 一份
  const k = rng.int(2, d === 1 ? 4 : 9) // 几倍
  const roll = rng.next()
  if (roll < 0.4) {
    // 是几倍（d1 配图：两行实物，第二行是第一行的几倍）
    const extra: StemPart[] = d === 1 || rng.chance(0.4) ? [{ kind: 'compare-rows', rows: [{ icon: item, count: n }, { icon: item, count: n * k }] }] : []
    return word(kpId, d, `times-${n}-${k}`, { k: 'q.times.howMany', p: { a1, a2, item, n, m: n * k } }, k, rng, [n * k - n, n, k + 1, k - 1], extra)
  }
  if (roll < 0.7) {
    // 几倍是多少
    return word(kpId, d, `of-${n}-${k}`, { k: 'q.times.timesOf', p: { a1, a2, item, n, k } }, n * k, rng, [n + k, n * (k + 1), n * (k - 1)])
  }
  // 一份是多少
  return word(kpId, d, `base-${n}-${k}`, { k: 'q.times.base', p: { a1, a2, item, m: n * k, k } }, n, rng, [n * k - k, k, n + 1, n - 1])
})

// ── 乘除法解决问题：每份数、份数、总数 ──
defineGenerator('m2s2-03-mul-div-solve', (d, rng) => {
  const kpId = 'm2s2-03-mul-div-solve'
  const item = rng.pick(ITEMS)
  const cap = d === 1 ? 6 : 9
  const n = rng.int(2, cap) // 每份
  const k = rng.int(2, cap) // 份数
  const t = n * k
  const roll = rng.next()
  if (roll < 0.3) return word(kpId, d, `total-${n}-${k}`, { k: 'q.rel.total', p: { item, n, k } }, t, rng, [n + k, n * (k + 1), n * (k - 1)])
  if (roll < 0.55) return word(kpId, d, `each-${t}-${k}`, { k: 'q.rel.perBox', p: { item, t, k } }, n, rng, [k, t - k, n + 1, n - 1])
  if (roll < 0.8 || d === 1) return word(kpId, d, `boxes-${t}-${n}`, { k: 'q.rel.boxes', p: { item, t, n } }, k, rng, [n, t - n, k + 1, k - 1])
  // 两步：k 盒一共 t 个，每盒一样多，k2 盒有几个（先求每份数）
  const k2 = rng.int(2, Math.min(9, Math.floor(81 / n)))
  return word(kpId, d, `two-${t}-${k}-${k2}`, { k: 'q.rel.twoStep', p: { item, k, t, k2 } }, n * k2, rng, [n, t, n * k2 + n, n * (k2 - 1)])
})
