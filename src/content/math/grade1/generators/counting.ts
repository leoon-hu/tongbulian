import type { Difficulty, LStr, Question } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator } from '@/engine'
import { labelQuestion, numberQuestion } from './common'
import { compareConcreteQuestion, compareNumberQuestion, compareTwoQuestion, twoDigitCompare } from './comparison'
import { cnChars, cnWords } from '../cnum'

const ICONS = ['🍎', '🐶', '⭐', '🎈', '🚗', '🌸', '🐟', '🍓', '🦋', '🍭', '🐥', '🌻']

/** 数一数：一组同类实物，问一共几个。 */
export function countObjectsQuestion(
  kpId: string,
  difficulty: Difficulty,
  lo: number,
  hi: number,
  rng: RNG,
): Question {
  const icon = rng.pick(ICONS)
  const n = rng.int(lo, hi)
  return numberQuestion({
    kpId,
    type: 'count',
    difficulty,
    sig: `co-${icon}-${n}`,
    stem: [
      { kind: 'text', text: { k: 'q.countAll' } },
      { kind: 'objects', icon, count: n },
    ],
    value: n,
    rng,
    min: 0,
    max: hi,
  })
}

/** 数的组成：X 个十和 Y 个一是几（Y = 0 时说「X 个十是几」：2 个十是 20、10 个十是一百）。 */
export function compositionQuestion(
  kpId: string,
  difficulty: Difficulty,
  tens: number,
  ones: number,
  rng: RNG,
): Question {
  const value = tens * 10 + ones
  return numberQuestion({
    kpId,
    type: 'count',
    difficulty,
    sig: `comp-${tens}-${ones}`,
    stem: [{ kind: 'text', text: ones ? { k: 'q.composeTensOnes', p: { tens, ones } } : { k: 'q.composeTens', p: { tens } } }],
    value,
    rng,
    min: 0,
    max: 100,
    smart: [tens + ones, ones * 10 + tens, value + 10, value - 10, tens],
  })
}

/** 反过来问组成：「1 个十和几个一组成 14」「几个十和 5 个一组成 45」（一上 p80「1 个十和 4 个一组成 14」，一下 p27「5 个十和 8 个一组成的数」） */
function partOfQuestion(kpId: string, d: Difficulty, n: number, rng: RNG): Question {
  const tens = Math.floor(n / 10)
  const ones = n % 10
  const askOnes = tens === 1 || rng.chance(0.5)
  return numberQuestion({
    kpId,
    type: 'count',
    difficulty: d,
    sig: `part-${askOnes ? 'o' : 't'}-${n}`,
    stem: [{ kind: 'text', text: askOnes ? { k: 'q.onesWith', p: { tens, n } } : { k: 'q.tensWith', p: { ones, n } } }],
    value: askOnes ? ones : tens,
    rng,
    min: 0,
    max: 9,
    smart: askOnes ? [tens, ones + 1, ones - 1, n] : [ones, tens + 1, tens - 1, n],
  })
}

/** 数位：「45 的十位上是几」「个位上是几」（一上 p77、一下 p26：从右边起第一位是个位，第二位是十位） */
function digitQuestion(kpId: string, d: Difficulty, n: number, rng: RNG): Question {
  const tensPlace = rng.chance(0.5)
  const value = tensPlace ? Math.floor(n / 10) % 10 : n % 10
  return numberQuestion({
    kpId,
    type: 'count',
    difficulty: d,
    sig: `digit-${tensPlace ? 't' : 'o'}-${n}`,
    stem: [{ kind: 'text', text: { k: tensPlace ? 'q.tensDigit' : 'q.onesDigit', p: { n } } }],
    value,
    rng,
    min: 0,
    max: 9,
    smart: [tensPlace ? n % 10 : Math.floor(n / 10) % 10, value + 1, value - 1],
  })
}

/** 更接近几十（一上 p78「12 更接近 10 还是更接近 20」，一下 p35「77 更接近 70 还是更接近 80」）：两个选项 */
function closerQuestion(kpId: string, d: Difficulty, lo: number, rng: RNG): Question {
  const o = rng.pick([1, 2, 3, 4, 6, 7, 8, 9])
  const n = lo + o
  const hi = lo + 10
  const correct = String(o < 5 ? lo : hi)
  return labelQuestion({
    kpId,
    type: 'count',
    difficulty: d,
    sig: `closer-${n}`,
    stem: [{ kind: 'text', text: { k: 'q.closer', p: { n, lo, hi } } }],
    correct,
    distractors: [String(o < 5 ? hi : lo)],
    rng,
  })
}

/** 写数：「三十八」写作几（一下 p27 做一做 2、p30 练一练 3、p35 练一练 2，含「一百」） */
function writeNumQuestion(kpId: string, d: Difficulty, n: number, rng: RNG): Question {
  const t = Math.floor(n / 10)
  const o = n % 10
  return numberQuestion({
    kpId,
    type: 'count',
    difficulty: d,
    sig: `write-${n}`,
    stem: [{ kind: 'text', text: { k: 'q.writeNum', p: { w: cnWords(cnChars(n)) } } }],
    value: n,
    rng,
    min: 0,
    max: 100,
    smart: [o * 10 + t, t * 10, t + o, n + 10],
  })
}

/** 读数：「38 读作什么」（一下 p26：写作 27、读作二十七）；干扰项是常见的错读——数字对调、只读十位、一个一个地读 */
function readNumQuestion(kpId: string, d: Difficulty, n: number, rng: RNG): Question {
  const t = Math.floor(n / 10)
  const o = n % 10
  const correct = cnChars(n)
  const wrong = new Set<string>()
  const add = (s: string): void => {
    if (s && s !== correct) wrong.add(s)
  }
  if (o) add(cnChars(o * 10 + t)) // 三十八 ↔ 八十三
  add(`${cnChars(t)}${o ? cnChars(o) : '零'}`) // 一个一个地读：三八、四零
  if (o) add(cnChars(t * 10)) // 只读了十位：三十
  for (const m of [n + 1, n - 1, n + 10, n - 10]) if (wrong.size < 3 && m >= 11 && m <= 99) add(cnChars(m))
  return labelQuestion({
    kpId,
    type: 'count',
    difficulty: d,
    sig: `read-${n}`,
    stem: [{ kind: 'text', text: { k: 'q.readNum', p: { n } } }],
    correct: cnWords(correct),
    distractors: [...wrong].slice(0, 3).map(cnWords),
    rng,
  })
}

/** 添 1：「39 添 1 是几」「99 添 1 是几」（一下 p24–28：二十九添 1 是三十、99 添 1 是一百） */
function addOneQuestion(kpId: string, d: Difficulty, n: number, rng: RNG): Question {
  return numberQuestion({
    kpId,
    type: 'count',
    difficulty: d,
    sig: `add1-${n}`,
    stem: [{ kind: 'text', text: { k: 'q.addOne', p: { n } } }],
    value: n + 1,
    rng,
    min: 0,
    max: 100,
    smart: [n + 10, n - 1, n + 2, Math.floor(n / 10) * 10],
  })
}

/** 中间的数：「15 和 17 中间的数是几」（一上 p80 练一练 7） */
function betweenNumQuestion(kpId: string, d: Difficulty, n: number, rng: RNG): Question {
  return numberQuestion({
    kpId,
    type: 'count',
    difficulty: d,
    sig: `mid-${n}`,
    stem: [{ kind: 'text', text: { k: 'q.midNum', p: { a: n - 1, b: n + 1 } } }],
    value: n,
    rng,
    min: 0,
    max: 100,
    smart: [n + 1, n - 1, n + 2, n - 2],
  })
}

/** 大得多 / 大一些、小得多 / 小一些（一下 p34 例 6：87 比 25 大得多，31 比 25 大一些） */
function muchOrBitQuestion(kpId: string, d: Difficulty, rng: RNG): Question {
  const much = rng.chance(0.5)
  const small = rng.int(10, much ? 50 : 90)
  const big = much ? rng.int(small + 40, 99) : rng.int(small + 1, Math.min(99, small + 8))
  const bigFirst = rng.chance(0.5)
  const [a, b] = bigFirst ? [big, small] : [small, big]
  const correct: LStr = { k: bigFirst ? (much ? 'opt.muchMore' : 'opt.bitMore') : much ? 'opt.muchLess' : 'opt.bitLess' }
  const other: LStr = { k: bigFirst ? (much ? 'opt.bitMore' : 'opt.muchMore') : much ? 'opt.bitLess' : 'opt.muchLess' }
  return labelQuestion({
    kpId,
    type: 'compare',
    difficulty: d,
    sig: `much-${a}-${b}`,
    stem: [{ kind: 'text', text: { k: bigFirst ? 'q.muchBigger' : 'q.muchSmaller', p: { a, b } } }],
    correct,
    distractors: [other],
    rng,
  })
}

/** 数小棒 / 方块（一下 p31 练一练 4：几根十块条和几个小方块，合起来是几） */
function blocksQuestion(kpId: string, d: Difficulty, n: number, rng: RNG): Question {
  const t = Math.floor(n / 10)
  const o = n % 10
  return numberQuestion({
    kpId,
    type: 'count',
    difficulty: d,
    sig: `blocks-${n}`,
    stem: [
      { kind: 'text', text: { k: 'q.countBlocks' } },
      { kind: 'blocks', groups: 1, tens: t, ones: o },
    ],
    value: n,
    rng,
    min: 0,
    max: 100,
    smart: [o * 10 + t, t + o, n + 10, n - 10],
  })
}

/** 相邻数：某数的前一个 / 后一个 / 多 1 / 少 1（lo~hi 是问的那个数的范围）。 */
function neighborQuestion(
  kpId: string,
  difficulty: Difficulty,
  lo: number,
  hi: number,
  rng: RNG,
): Question {
  const n = rng.int(lo, hi)
  const kind = rng.pick(['after', 'before', 'more', 'less'] as const)
  const value = kind === 'after' || kind === 'more' ? n + 1 : n - 1
  const text: LStr = {
    after: { k: 'q.after', p: { n } },
    before: { k: 'q.before', p: { n } },
    more: { k: 'q.more', p: { n } },
    less: { k: 'q.less', p: { n } },
  }[kind]
  return numberQuestion({
    kpId,
    type: 'count',
    difficulty,
    sig: `nb-${kind}-${n}`,
    stem: [{ kind: 'text', text }],
    value,
    rng,
    min: 0,
    max: Math.max(hi + 1, 10),
    smart: [n, n + 1, n - 1, n + 10],
  })
}

// ── 注册 ──

// 数学游戏里的数一数（p2–9：5 颗五角星、4 条鱼、6 个班……）：课本这几页的数不超过 6
defineGenerator('s1-00-count', (d, rng) =>
  countObjectsQuestion('s1-00-count', d, d === 1 ? 1 : 2, d === 1 ? 5 : 6, rng),
)

// 1~5 的认识（p14–16）与比大小（p17–18）：数数 / 比多少（实物）/ 比大小（>、<、=）；0 在 p30 才教，这里的数从 1 起
defineGenerator('s1-01-num-5', (d, rng) => {
  const roll = rng.next()
  if (roll < 0.45) return countObjectsQuestion('s1-01-num-5', d, 1, 5, rng)
  if (roll < 0.7) return compareConcreteQuestion('s1-01-num-5', d, 5, rng)
  return compareNumberQuestion('s1-01-num-5', d, 5, rng, 1)
})

// 6~10 的认识：数数 / 比多少（实物）/ 比大小（>、<、=）
defineGenerator('s1-02-num-10', (d, rng) => {
  const roll = rng.next()
  if (roll < 0.5) return countObjectsQuestion('s1-02-num-10', d, d === 1 ? 6 : 4, 10, rng)
  if (roll < 0.75) return compareConcreteQuestion('s1-02-num-10', d, 10, rng)
  return compareNumberQuestion('s1-02-num-10', d, 10, rng)
})

/**
 * 11~20 的认识（p74–80）：1 个十和几个一合起来是十几、2 个十是 20（例 1），反过来「1 个十和几个一组成 14」，
 * 数的顺序（例 3：14 的前一个、后一个，比 15 大 1，15 和 17 中间的数），更接近 10 还是 20，比大小，数一数（p79）；
 * 第 2 档另有数位（例 2：十位上是几、个位上是几）
 */
defineGenerator('s1-04-num-20', (d, rng) => {
  const kpId = 's1-04-num-20'
  const roll = rng.next()
  if (d > 1 && roll < 0.15) return digitQuestion(kpId, d, rng.int(11, 20), rng)
  if (roll < 0.25) {
    const ones = rng.int(0, 10) // 10 = 「2 个十」
    return ones === 10 ? compositionQuestion(kpId, d, 2, 0, rng) : compositionQuestion(kpId, d, 1, ones, rng)
  }
  if (roll < 0.33) return partOfQuestion(kpId, d, rng.int(11, 19), rng)
  if (roll < 0.5) return neighborQuestion(kpId, d, 11, 19, rng)
  if (roll < 0.57) return betweenNumQuestion(kpId, d, rng.int(11, 19), rng)
  if (roll < 0.67) return closerQuestion(kpId, d, 10, rng)
  if (roll < 0.85) {
    // 比大小：至少一个数是十几（课本 15 ○ 16、9 ○ 11、20 ○ 19）
    const x = rng.int(10, 20)
    let y = rng.int(rng.chance(0.3) ? 0 : 10, 20)
    if (y === x && !rng.chance(0.1)) y = x === 20 ? 19 : x + 1
    return compareTwoQuestion(kpId, d, x, y, rng)
  }
  return countObjectsQuestion(kpId, d, 11, 20, rng)
})

/**
 * 数数、数的组成（一下 p24–31）：几个十和几个一合起来是几（例 1、例 2，10 个十是一百）、反过来问组成，
 * 读数写数（例 2「写作 27、读作二十七」、做一做「三十八」写作几、「一百」），数位（十位上是几），添 1（二十九添 1、99 添 1），
 * 数十块条和小方块（练一练 4）——都在第 1 档，数的范围到 100。
 */
defineGenerator('s2-03-num-100', (d, rng) => {
  const kpId = 's2-03-num-100'
  const roll = rng.next()
  const n = rng.int(21, 99)
  if (roll < 0.2) {
    const tens = rng.int(1, 10)
    return compositionQuestion(kpId, d, tens, tens === 10 ? 0 : rng.int(0, 9), rng)
  }
  if (roll < 0.3) return partOfQuestion(kpId, d, n % 10 ? n : n + rng.int(1, 9), rng)
  if (roll < 0.45) return writeNumQuestion(kpId, d, rng.chance(0.1) ? 100 : rng.chance(0.2) ? rng.int(2, 9) * 10 : n, rng)
  if (roll < 0.6) return readNumQuestion(kpId, d, n, rng)
  if (roll < 0.72) return digitQuestion(kpId, d, n, rng)
  if (roll < 0.85) return addOneQuestion(kpId, d, rng.chance(0.6) ? rng.int(1, 9) * 10 + 9 : rng.int(20, 98), rng)
  return blocksQuestion(kpId, d, rng.int(11, 99), rng)
})

/**
 * 数的顺序、比较大小（一下 p32–36）：两位数比大小（例 5，○）、数的顺序（前一个 / 后一个 / 多 1 / 少 1）、
 * 更接近几十（p35「77 更接近 70 还是 80」）、大得多 / 大一些（例 6）——都在第 1 档；第 2 档比大小配数轴（p34）。
 */
defineGenerator('s2-03-compare-100', (d, rng) => {
  const kpId = 's2-03-compare-100'
  const roll = rng.next()
  if (roll < 0.45) return twoDigitCompare(kpId, d, rng)
  if (roll < 0.65) return neighborQuestion(kpId, d, 11, 99, rng)
  if (roll < 0.82) return closerQuestion(kpId, d, rng.int(1, 9) * 10, rng)
  return muchOrBitQuestion(kpId, d, rng)
})
