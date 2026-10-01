import type { Difficulty, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 数量间的乘除关系（二下）：倍的认识（几倍 / 几倍是多少 / 一份是多少）、用乘除法解决问题（倍的两步题、和差倍辨析、几个几）
// ─────────────────────────────────────────────────────────────

const ITEMS = ['🍎', '🍬', '⭐', '🎈', '🍪', '🌸', '🎁', '🧁', '🥟', '🍓']
const NAMES = ['🐰', '🐶', '🐱', '🐼', '🦊', '🐷']
/** 配图最多画几个实物：再多手机上要换好几行，数圈不如直接算 */
const PIC_MAX = 24

function word(kpId: string, d: Difficulty, sig: string, text: LStr, value: number, rng: RNG, smart: number[], extra: StemPart[] = []): Question {
  return numberQuestion({ kpId, type: value > 9 ? 'multiply' : 'divide', difficulty: d, sig, stem: [{ kind: 'text', text }, ...extra], value, rng, min: 1, max: 99, smart })
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
    // 是几倍（G6，d1 都配图、d2/d3 40% 且总数不多才配）：两行实物，每行开头是谁的，n 个一圈——第二行有几圈就是几倍
    const pic = d === 1 || rng.chance(0.4)
    const extra: StemPart[] =
      pic && n * k <= PIC_MAX ? [{ kind: 'times-rows', icon: item, per: n, rows: [{ who: a1, count: n }, { who: a2, count: n * k }] }] : []
    return word(kpId, d, `times-${n}-${k}`, { k: 'q.times.howMany', p: { a1, a2, item, n, m: n * k } }, k, rng, [n * k - n, n, k + 1, k - 1], extra)
  }
  if (roll < 0.7) {
    // 几倍是多少
    return word(kpId, d, `of-${n}-${k}`, { k: 'q.times.timesOf', p: { a1, a2, item, n, k } }, n * k, rng, [n + k, n * (k + 1), n * (k - 1)])
  }
  // 一份是多少
  return word(kpId, d, `base-${n}-${k}`, { k: 'q.times.base', p: { a1, a2, item, m: n * k, k } }, n, rng, [n * k - k, k, n + 1, n - 1])
})

// ── 用乘除法解决问题（例 5 倍的两步题「7 × 3 = 21，21 + 7 = 28」；例 6 同样两个数问和、问差、问几倍；
//    p24 引入复习「几个几」）。课本不讲「每份数、份数、总数」，也没有先除后乘的归一题（那是三上的） ──
const GOODS = ['🎈', '🧁', '🍎', '🍪', '🌸', '🎁']

defineGenerator('m2s2-03-mul-div-solve', (d, rng) => {
  const kpId = 'm2s2-03-mul-div-solve'
  const roll = rng.next()
  if (roll < 0.4) {
    // 倍的两步题：买了 n 个 a，b 是 a 的 k 倍；b 和 a 一共多少个 / b 比 a 多多少个
    const [a, b] = rng.shuffle(GOODS).slice(0, 2) as [string, string]
    const n = rng.int(2, 9)
    const k = rng.int(2, d === 1 ? 5 : 9)
    const sum = rng.chance(0.6)
    return sum
      ? word(kpId, d, `tsum-${n}-${k}`, { k: 'q.rel.timesSum', p: { n, a, b, k } }, n * k + n, rng, [n * k, n + k, n * k + n + 1, n * k - n])
      : word(kpId, d, `tmore-${n}-${k}`, { k: 'q.rel.timesMore', p: { n, a, b, k } }, n * k - n, rng, [n * k, n * k + n, k, n * k - n + 1])
  }
  if (roll < 0.8) {
    // 同样两个数（男生 m 人、女生 f 人，f 是 m 的 k 倍），问几倍 / 多几 / 一共
    const m = rng.int(2, 9)
    const k = rng.int(2, d === 1 ? 5 : 9)
    const f = m * k
    const girlsMore = rng.chance(0.5)
    const [x, y] = girlsMore ? (['rel.boy', 'rel.girl'] as const) : (['rel.girl', 'rel.boy'] as const)
    const p = { x: { k: x }, y: { k: y }, m, f }
    const ask = rng.next()
    if (ask < 0.4) return word(kpId, d, `ptimes-${x}-${m}-${f}`, { k: 'q.rel.pairTimes', p }, k, rng, [f - m, f + m, k + 1, k - 1])
    if (ask < 0.75) return word(kpId, d, `pmore-${x}-${m}-${f}`, { k: 'q.rel.pairMore', p }, f - m, rng, [k, f + m, f - m + 1, f - m - 1])
    return word(kpId, d, `psum-${x}-${m}-${f}`, { k: 'q.rel.pairSum', p }, f + m, rng, [f - m, k, f + m + 1, f + m - 1])
  }
  // 复习「几个几」：每盒 n 个，k 盒；平均装；每盒装 n 个要几盒
  const item = rng.pick(ITEMS)
  const n = rng.int(2, 9)
  const k = rng.int(2, 9)
  const t = n * k
  const r = rng.next()
  if (r < 0.4) return word(kpId, d, `total-${n}-${k}`, { k: 'q.rel.total', p: { item, n, k } }, t, rng, [n + k, n * (k + 1), n * (k - 1)])
  if (r < 0.7) return word(kpId, d, `each-${t}-${k}`, { k: 'q.rel.perBox', p: { item, t, k } }, n, rng, [k, t - k, n + 1, n - 1])
  return word(kpId, d, `boxes-${t}-${n}`, { k: 'q.rel.boxes', p: { item, t, n } }, k, rng, [n, t - n, k + 1, k - 1])
})
