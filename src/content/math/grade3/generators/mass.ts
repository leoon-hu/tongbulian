import type { Difficulty, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'
import type { Thing, Unit } from './length'
import { BLANK, comparePair, compareQuestion, convQuestion, judgeQ, rateQuestion, thingStem, unitL } from './length'

// ─────────────────────────────────────────────────────────────
// ☆ 曹冲称象的故事（三上综合与实践，课本四节：认识质量单位 / 称重我很行 / 称重大挑战 / 小讲堂）：
// 认识质量单位（克、千克、吨：选单位、进率、换算、认一认读秤；小讲堂的公斤 / 斤在第 2 档）、
// 称重我很行（id 沿用 m3s1-04-weighing；比一比「苹果比橙子大约重 30 克」、1 克 / 1 千克大约有几个、粮食 10 袋 1 吨，
// 并进称重大挑战的「用 200 克一袋的盐当标准来称」和开头曹冲称象的「各次称出的石头质量的和」）。
// 课本电子秤上的「2.3kg」是小数，这里不出小数；北极熊、河马用千克还是吨都说得通，选单位不用。
// ─────────────────────────────────────────────────────────────

const KP_UNITS = 'm3s1-04-mass-units'
const KP_WEIGH = 'm3s1-04-weighing'
const MASS: Unit[] = ['g', 'kg', 't']

const text = (k: string, p?: Record<string, string | number | LStr>): StemPart => ({ kind: 'text', text: p ? { k, p } : { k } })

/** 每样东西只有一个质量单位说得通 */
export const MASS_THINGS: Thing[] = [
  { id: 'pear', icon: '🍐', n: 200, unit: 'g' },
  { id: 'egg', icon: '🥚', n: 50, unit: 'g' },
  { id: 'berry', icon: '🍓', n: 20, unit: 'g' },
  { id: 'banana', icon: '🍌', n: 150, unit: 'g' },
  { id: 'book', icon: '📖', n: 300, unit: 'g' },
  { id: 'candy', icon: '🍬', n: 5, unit: 'g' },
  { id: 'pencil', icon: '✏️', n: 10, unit: 'g' },
  { id: 'dog', icon: '🐶', n: 8, unit: 'kg' },
  { id: 'kid', icon: '🧒', n: 25, unit: 'kg' },
  { id: 'melon', icon: '🍉', n: 5, unit: 'kg' },
  { id: 'panda', icon: '🐼', n: 100, unit: 'kg' },
  { id: 'rice', icon: '🍚', n: 10, unit: 'kg' },
  { id: 'bag', icon: '🎒', n: 3, unit: 'kg' },
  { id: 'elephant', icon: '🐘', n: 5, unit: 't' },
  { id: 'truck', icon: '🚚', n: 10, unit: 't' },
  { id: 'whale', icon: '🐋', n: 150, unit: 't' },
]

/** 选单位：克 / 千克 / 吨三个都给 */
function chooseQ(d: Difficulty, rng: RNG): Question {
  const t = rng.pick(MASS_THINGS)
  return labelQuestion({
    kpId: KP_UNITS,
    type: 'mass',
    difficulty: d,
    sig: `unit-${t.id}`,
    stem: [...thingStem('m3.mass.it', t, BLANK), text('m3.u.which')],
    correct: unitL(t.unit),
    distractors: MASS.filter((u) => u !== t.unit).map(unitL),
    rng,
  })
}

/**
 * 读秤（认一认 p33，「指针指着几，就表示所称的物体有几克或几千克」），秤面照课本的刻度：
 * - 1000 克的盘秤：0、50、100…950 每 50 克一个数、一个刻度，读整 50 克；
 * - 5 千克的手提秤：1 到 5 千克，每千克分 10 小格，读整千克；
 * - 体重秤：每 10 千克一个数，每小格 1 千克（第 5 小格长一点），读几十几千克（课本「我的体重是 25 千克」）；
 * - 第 2 档另有 500 克的盘秤（说一说 p32）：每 50 克一个数，每小格 10 克。
 */
function scaleQ(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (d >= 2 && roll < 0.3) {
    let value = rng.int(2, 48) * 10
    if (value % 50 === 0) value += 20
    return numberQuestion({
      kpId: KP_UNITS,
      type: 'mass',
      difficulty: d,
      sig: `scale-g500-${value}`,
      stem: [text('m3.mass.readG'), { kind: 'scale', max: 500, major: 50, minor: 5, value, unit: 'g' }],
      value,
      rng,
      min: 10,
      max: 500,
      smart: [value + 10, value - 10, value + 20, value - 20, value + 50].filter((x) => x > 0 && x !== value),
    })
  }
  if (roll < 0.6) {
    const value = rng.int(1, 19) * 50
    return numberQuestion({
      kpId: KP_UNITS,
      type: 'mass',
      difficulty: d,
      sig: `scale-g-${value}`,
      stem: [text('m3.mass.readG'), { kind: 'scale', max: 1000, major: 50, minor: 1, value, unit: 'g' }],
      value,
      rng,
      min: 50,
      max: 1000,
      smart: [value + 50, value - 50, 1000 - value, value + 100].filter((x) => x > 0 && x !== value),
    })
  }
  if (roll < 0.75) {
    const value = rng.int(1, 4)
    return numberQuestion({
      kpId: KP_UNITS,
      type: 'mass',
      difficulty: d,
      sig: `scale-kg-${value}`,
      stem: [text('m3.mass.readKg'), { kind: 'scale', max: 5, major: 1, minor: 10, value, unit: 'kg' }],
      value,
      rng,
      min: 1,
      max: 5,
      smart: [5 - value, value + 1, value - 1].filter((x) => x > 0 && x !== value),
    })
  }
  let value = rng.int(18, 45)
  if (value % 10 === 0) value += 5
  return numberQuestion({
    kpId: KP_UNITS,
    type: 'mass',
    difficulty: d,
    sig: `scale-body-${value}`,
    stem: [text('m3.mass.readBody'), { kind: 'scale', max: 100, major: 10, minor: 10, value, unit: 'kg' }],
    value,
    rng,
    min: 1,
    max: 100,
    // 常见的读错：小格数多数一格 / 少数一格、数到了另一边的整十
    smart: [value + 1, value - 1, value + 10, value - 10, Math.floor(value / 10) * 10 + 10 - (value % 10)].filter((x) => x > 0 && x !== value),
  })
}

/** 质量单位换算：大 → 小给 1–9，小 → 大给整千 */
function convMassQ(d: Difficulty, rng: RNG): Question {
  const [big, small] = rng.pick<[Unit, Unit]>([
    ['kg', 'g'],
    ['t', 'kg'],
  ])
  const n = rng.int(1, 9)
  return rng.chance(0.5) ? convQuestion(KP_UNITS, 'mass', d, n, big, small, rng) : convQuestion(KP_UNITS, 'mass', d, n * 1000, small, big, rng)
}

/** 带单位的加减：500 克 + 500 克 = 几千克、1 千克 - 300 克 = 几克、2 吨 - 500 千克 = 几千克 */
function massAddSubQ(d: Difficulty, rng: RNG): Question {
  const [big, small] = rng.pick<[Unit, Unit]>([
    ['kg', 'g'],
    ['t', 'kg'],
  ])
  if (rng.chance(0.5)) {
    // 两个整百的小单位凑成整千，化成大单位
    const k = rng.int(1, 2)
    const x = rng.int(1, 9) * 100
    const y = k * 1000 - x
    return numberQuestion({
      kpId: KP_UNITS,
      type: 'mass',
      difficulty: d,
      sig: `add-${x}${small}-${y}-${big}`,
      stem: [text('m3.u.add', { a: x, ua: unitL(small), b: y, ub: unitL(small), uc: unitL(big) })],
      value: k,
      rng,
      min: 1,
      max: 20,
      smart: [k * 10, k + 1, 10].filter((v) => v !== k),
    })
  }
  const a = rng.int(1, 3)
  const b = rng.int(1, 9) * 100
  const value = a * 1000 - b
  return numberQuestion({
    kpId: KP_UNITS,
    type: 'mass',
    difficulty: d,
    sig: `sub-${a}${big}-${b}${small}`,
    stem: [text('m3.u.sub', { a, ua: unitL(big, a), b, ub: unitL(small), uc: unitL(small) })],
    value,
    rng,
    min: 1,
    max: 5000,
    smart: [a * 100 - b > 0 ? a * 100 - b : b - a, value + 100, value - 100, b - a].filter((v) => v > 0 && v !== value),
  })
}

/** 小讲堂：1 公斤 = 2 斤、1 斤 = 500 克、1 公斤 = 1 千克 */
function jinQ(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (roll < 0.45) {
    const k = rng.int(2, 9)
    return numberQuestion({ kpId: KP_UNITS, type: 'mass', difficulty: d, sig: `jin-${k}`, stem: [text('m3.mass.jinOfGongjin', { k })], value: 2 * k, rng, min: 1, max: 30, smart: [k, k + 2, 10 * k] })
  }
  if (roll < 0.9) {
    const k = rng.int(2, 6)
    return numberQuestion({ kpId: KP_UNITS, type: 'mass', difficulty: d, sig: `jing-${k}`, stem: [text('m3.mass.gOfJin', { k })], value: 500 * k, rng, min: 100, max: 5000, smart: [1000 * k, 50 * k, 500 * k + 500] })
  }
  return numberQuestion({ kpId: KP_UNITS, type: 'mass', difficulty: d, sig: 'gongjin', stem: [text('m3.mass.gongjin')], value: 1, rng, min: 1, max: 10, smart: [2, 10, 5] })
}

defineGenerator(KP_UNITS, (d, rng) => {
  const roll = rng.next()
  if (d === 1) {
    // 课本这一节：克、千克、吨用在哪（选单位）、1 千克 = 1000 克、1 吨 = 1000 千克、认一认读秤
    if (roll < 0.45) return chooseQ(d, rng)
    if (roll < 0.7) return scaleQ(d, rng)
    if (roll < 0.85) return rng.chance(0.5) ? rateQuestion(KP_UNITS, 'mass', d, 'kg', 'g', rng) : rateQuestion(KP_UNITS, 'mass', d, 't', 'kg', rng)
    return convMassQ(d, rng)
  }
  if (d === 2) {
    if (roll < 0.2) return chooseQ(d, rng)
    if (roll < 0.45) return convMassQ(d, rng)
    if (roll < 0.75) return scaleQ(d, rng)
    // 小讲堂：公斤、斤、两
    return jinQ(d, rng)
  }
  if (roll < 0.25) {
    const [small, big] = rng.pick<[Unit, Unit]>([
      ['g', 'kg'],
      ['kg', 't'],
    ])
    const [a, ua, b, ub] = comparePair(rng, small, big)
    return compareQuestion(KP_UNITS, 'mass', d, a, ua, b, ub, rng)
  }
  if (roll < 0.5) return massAddSubQ(d, rng)
  if (roll < 0.7) return judgeQ(KP_UNITS, 'mass', d, rng, MASS_THINGS, MASS, 'm3.mass.it')
  if (roll < 0.85) return scaleQ(d, rng)
  return jinQ(d, rng)
})

// ── 称重我很行（并进称重大挑战的盐袋、曹冲称象求和）──

/** 「称」东西用的标准：几袋 200 克的盐（称重大挑战：手电筒约 2 袋盐） */
const SALT_THINGS: { id: string; icon: string; bags: [number, number] }[] = [
  { id: 'torch', icon: '🔦', bags: [1, 3] },
  { id: 'cup', icon: '🥤', bags: [1, 2] },
  { id: 'plant', icon: '🪴', bags: [3, 6] },
  { id: 'dict', icon: '📕', bags: [2, 3] },
  { id: 'case', icon: '👝', bags: [1, 1] },
  { id: 'ball', icon: '🏀', bags: [3, 3] },
]
function saltQ(d: Difficulty, rng: RNG): Question {
  const t = rng.pick(SALT_THINGS)
  const k = rng.int(t.bags[0], t.bags[1])
  const thing: LStr = { k: `m3.mass.th.${t.id}` }
  return numberQuestion({
    kpId: KP_WEIGH,
    type: 'mass',
    difficulty: d,
    sig: `salt-${t.id}-${k}`,
    stem: [{ kind: 'picture', icon: t.icon }, k === 1 ? text('m3.mass.salt1', { thing }) : text('m3.mass.salt', { thing, k })],
    value: 200 * k,
    rng,
    min: 100,
    max: 2000,
    smart: [200 + k, 200 * (k + 1), 100 * k].filter((v) => v !== 200 * k),
  })
}

/** 两种水果 */
const FRUITS = ['apple', 'orange', 'pear', 'peach', 'mango']
const gramsL = (n: number): LStr => ({ k: 'm3.mass.gN', p: { n } })

/**
 * 比一比（p34）：一个苹果 226 克、一个橙子 195 克，「苹果比橙子大约重 30 克」——问大约重多少克，答案是相差数最接近的整十。
 * 相差数离整十只差 1 或 2（31、48、69……），选项：对的整十、另一边挨着的整十、两个数大约一共多重（加了的错）。
 */
function diffAboutQ(d: Difficulty, rng: RNG): Question {
  const [a, b] = rng.shuffle(FRUITS).slice(0, 2) as [string, string]
  const tens = rng.int(2, 8)
  const off = rng.pick([-2, -1, 1, 2])
  const gap = tens * 10 + off
  const y = rng.int(150, 250)
  const x = y + gap
  const value = tens * 10
  const other = off > 0 ? value + 10 : value - 10
  const sum = Math.round((x + y) / 10) * 10
  return labelQuestion({
    kpId: KP_WEIGH,
    type: 'mass',
    difficulty: d,
    sig: `about-${a}-${x}-${b}-${y}`,
    stem: [text('m3.mass.diffAbout', { a: { k: `m3.mass.f.${a}` }, x, b: { k: `m3.mass.f.${b}` }, y })],
    correct: gramsL(value),
    distractors: [gramsL(other), gramsL(sum)],
    rng,
  })
}

/** 比轻重算准：一个苹果比一个橙子重多少克（第 2 档的变式） */
function diffQ(d: Difficulty, rng: RNG): Question {
  const [a, b] = rng.shuffle(FRUITS).slice(0, 2) as [string, string]
  const y = rng.int(150, 280)
  const gap = d === 1 ? rng.int(1, 9) * 10 : rng.int(11, 89)
  const x = y + gap
  return numberQuestion({
    kpId: KP_WEIGH,
    type: 'mass',
    difficulty: d,
    sig: `diff-${a}-${x}-${b}-${y}`,
    stem: [text('m3.mass.diff', { a: { k: `m3.mass.f.${a}` }, x, b: { k: `m3.mass.f.${b}` }, y })],
    value: gap,
    rng,
    min: 1,
    max: 300,
    smart: [x + y, gap + 10, gap - 10, gap + 1].filter((v) => v > 0 && v !== gap),
  })
}

/** 曹冲称象：分三次称，各次的和（千克）；分四次、和是整千，问几吨 */
function caoQ(d: Difficulty, rng: RNG, tons: boolean): Question {
  for (;;) {
    const n = tons ? 4 : 3
    const ws = Array.from({ length: n }, () => rng.int(5, 15) * 100)
    const sum = ws.reduce((s, w) => s + w, 0)
    if (tons && sum % 1000 !== 0) continue
    const [a, b, c, e] = ws as [number, number, number, number?]
    const value = tons ? sum / 1000 : sum
    return numberQuestion({
      kpId: KP_WEIGH,
      type: 'mass',
      difficulty: d,
      sig: `cao-${ws.join('-')}`,
      stem: [text(tons ? 'm3.mass.cao4' : 'm3.mass.cao3', tons ? { a, b, c, e: e! } : { a, b, c })],
      value,
      rng,
      min: 1,
      max: tons ? 20 : 10000,
      smart: tons ? [sum / 100, value + 1, value - 1] : [sum - ws[n - 1]!, sum + 100, sum - 100],
    })
  }
}

/** 1 克 / 1 千克大约有几个：5 粒黄豆约 1 克、1 千克西红柿约 6 个、5 个梨约 1 千克（p34–35） */
function aboutQ(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (roll < 0.4) {
    const g = rng.int(2, 10)
    return numberQuestion({ kpId: KP_WEIGH, type: 'mass', difficulty: d, sig: `beans-${g}`, stem: [text('m3.mass.beans', { g })], value: 5 * g, rng, min: 1, max: 100, smart: [g + 5, 10 * g, g] })
  }
  if (roll < 0.7) {
    const k = rng.int(2, 5)
    return numberQuestion({ kpId: KP_WEIGH, type: 'mass', difficulty: d, sig: `tomato-${k}`, stem: [text('m3.mass.tomato', { k })], value: 6 * k, rng, min: 1, max: 60, smart: [k + 6, 6 * k + 6, 6 * k - 6] })
  }
  const k = rng.int(2, 6)
  return numberQuestion({ kpId: KP_WEIGH, type: 'mass', difficulty: d, sig: `pears-${k}`, stem: [text('m3.mass.pears', { k })], value: 5 * k, rng, min: 1, max: 60, smart: [k + 5, 5 * k + 5, 5 * k - 5] })
}

/** 粮食：每袋 100 千克，k 袋几千克 / 几袋是 1 吨（课本「10 袋重 1 吨」）/ t 吨要装几袋 */
function sacksQ(d: Difficulty, rng: RNG): Question {
  if (d === 1 && rng.chance(0.2)) return numberQuestion({ kpId: KP_WEIGH, type: 'mass', difficulty: d, sig: 'sacks-ton', stem: [text('m3.mass.sacksTon')], value: 10, rng, min: 1, max: 100, smart: [100, 1000, 5] })
  if (d === 1) {
    const k = rng.int(2, 9)
    return numberQuestion({ kpId: KP_WEIGH, type: 'mass', difficulty: d, sig: `sacks-${k}`, stem: [text('m3.mass.sacks', { k })], value: 100 * k, rng, min: 100, max: 2000, smart: [1000 * k, 10 * k, 100 * k + 100] })
  }
  if (d === 2) return numberQuestion({ kpId: KP_WEIGH, type: 'mass', difficulty: d, sig: 'sacks-ton', stem: [text('m3.mass.sacksTon')], value: 10, rng, min: 1, max: 100, smart: [100, 1000, 5] })
  const t = rng.int(2, 5)
  return numberQuestion({ kpId: KP_WEIGH, type: 'mass', difficulty: d, sig: `sacks-t-${t}`, stem: [text('m3.mass.sacksOfTons', { t })], value: 10 * t, rng, min: 1, max: 100, smart: [t, 100 * t, 10 * t + 10] })
}

defineGenerator(KP_WEIGH, (d, rng) => {
  const roll = rng.next()
  if (d === 1) {
    // 比一比（大约重多少）、称一称（黄豆 / 西红柿 / 梨、10 袋粮食 1 吨）、称重大挑战的盐袋、曹冲称象求和
    if (roll < 0.22) return diffAboutQ(d, rng)
    if (roll < 0.4) return aboutQ(d, rng)
    if (roll < 0.55) return sacksQ(d, rng)
    if (roll < 0.8) return saltQ(d, rng)
    return caoQ(d, rng, false)
  }
  if (d === 2) {
    if (roll < 0.2) return caoQ(d, rng, false)
    if (roll < 0.35) return caoQ(d, rng, true)
    if (roll < 0.55) return aboutQ(d, rng)
    if (roll < 0.75) return diffQ(d, rng)
    if (roll < 0.85) return saltQ(d, rng)
    return sacksQ(d, rng)
  }
  if (roll < 0.4) return caoQ(d, rng, true)
  if (roll < 0.65) return sacksQ(d, rng)
  if (roll < 0.85) return aboutQ(d, rng)
  return saltQ(d, rng)
})
