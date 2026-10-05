import type { Difficulty, InputMode, LStr, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 加法模型和乘法模型（四上第四单元，课本 p58–69；课本没有小节标题，知识点名照平台同步课的章节名）。
// 课本框出的数量关系：总量 = 分量 + 分量、分量 = 总量 - 分量（例 1）；总价 = 单价 × 数量、单价 = 总价 ÷ 数量、
// 数量 = 总价 ÷ 单价（例 3）；路程 = 速度 × 时间、速度 = 路程 ÷ 时间、时间 = 路程 ÷ 速度（例 5）。
// 记法照课本：单价「12元/千克」、速度「80米/分」「800千米/时」（朗读读「每」）。除法照课本：除数是一位数、都能整除。
// 题目里的表（借书人数、花店、购物小票）用统计表画，表里的字不注音、不朗读，题目要问的都写在文字里。
// ─────────────────────────────────────────────────────────────

export const TOTAL = 'm4s1-05-total-part'
export const PRICE = 'm4s1-05-price'
export const SPEED = 'm4s1-05-speed'

type Params = Record<string, LStr | number>
const text = (k: string, p?: Params): StemPart => ({ kind: 'text', text: p ? { k, p } : { k } })
const expr = (e: string): StemPart => ({ kind: 'expr', expr: e })
const key = (k: string, p?: Params): LStr => (p ? { k, p } : { k })
const flat = (e: string): string => e.replace(/\s+/g, '')

/** 数值题：键盘或选项（input 不填就随机） */
function numQ(kpId: string, d: Difficulty, sig: string, stem: StemPart[], value: number, rng: RNG, smart: number[], input?: InputMode): Question {
  return numberQuestion({
    kpId,
    type: 'quantity',
    difficulty: d,
    sig,
    stem,
    value,
    rng,
    min: 0,
    max: 999999,
    input,
    smart: smart.filter((x) => Number.isInteger(x) && x >= 0 && x !== value),
  })
}

/** 选项题 */
function pickQ(kpId: string, d: Difficulty, sig: string, stem: StemPart[], correct: LStr, distractors: LStr[], rng: RNG): Question {
  return labelQuestion({ kpId, type: 'quantity', difficulty: d, sig, stem, correct, distractors, rng })
}

const yesNo = (yes: boolean, a: LStr, b: LStr): [LStr, LStr[]] => (yes ? [a, [b]] : [b, [a]])
const ENOUGH: LStr = { k: 'm4.mod.enough' }
const NOT_ENOUGH: LStr = { k: 'm4.mod.notEnough' }
const CAN: LStr = { k: 'm4.mod.can' }
const CANNOT: LStr = { k: 'm4.mod.cannot' }

/** 「下面哪个是求 X 的数量关系」：正确的那个 + 三个干扰（运算错的、把式子倒过来的、求别的量的） */
function relQ(kpId: string, d: Difficulty, rng: RNG, what: string, correct: string, wrongs: string[]): Question {
  const pick = rng.shuffle(wrongs).slice(0, 3)
  return pickQ(kpId, d, `rel-${what}`, [text('m4.mod.q.rel', { x: key(`m4.mod.word.${what}`) })], key(`m4.mod.f.${correct}`), pick.map((w) => key(`m4.mod.f.${w}`)), rng)
}

// ─────────────────────────────────────────────────────────────
// 总量与分量的关系（p58–61，例 1、例 2、做一做，练习十二）
// 第 1 档：例 1 的借书人数表（上午 / 下午 / 一共 / 教师一共 / 学生一共来了多少人），知道总量和一个分量求另一个分量；
//          数量关系选一选（总量 = 分量 + 分量、分量 = 总量 - 分量）；例 2 的买书（这 3 本 100 元够吗、
//          4 本一共多少元、不买其中一本剩下 3 本多少元）；做一做的课后社团（两个社团一共多少名、女生一共多少名）。
// 第 2 档：练习十二 1 的填数（45 + 55 + 50 = ?、? - 55 - 45 = 50）；借出后还剩、鸡比兔多、共享单车；
//          苹果和梨一共多少千克（含「比梨少」）。
// 第 3 档：练习十二 4 研学租车（大巴、中巴、小巴一共多少人；方案二有多少人坐小巴）；社团里的女生。
// ─────────────────────────────────────────────────────────────

/** 例 1：学校图书馆星期一借阅图书的人数表 */
function libraryQ(d: Difficulty, rng: RNG): Question {
  const [t1, t2] = [rng.int(11, 29), rng.int(11, 29)]
  const [s1, s2] = [rng.int(21, 59), rng.int(21, 59)]
  const ask = rng.pick([
    { k: 'm4.mod.lib.am', v: t1 + s1, smart: [t1, s1, t1 + t2] },
    { k: 'm4.mod.lib.pm', v: t2 + s2, smart: [t2, s2, s1 + s2] },
    { k: 'm4.mod.lib.all', v: t1 + t2 + s1 + s2, smart: [t1 + s1, t2 + s2, t1 + t2 + s1] },
    { k: 'm4.mod.lib.teachers', v: t1 + t2, smart: [t1 + s1, t2 + s2, s1 + s2] },
    { k: 'm4.mod.lib.students', v: s1 + s2, smart: [t1 + s1, t2 + s2, t1 + t2] },
  ])
  const rows: (number | LStr | null)[][] = [
    [{ k: 'm4.mod.t.kind' }, { k: 'm4.mod.t.am' }, { k: 'm4.mod.t.pm' }],
    [{ k: 'm4.mod.t.teacher' }, t1, t2],
    [{ k: 'm4.mod.t.student' }, s1, s2],
  ]
  return numQ(
    TOTAL,
    d,
    `lib-${t1}-${t2}-${s1}-${s2}-${ask.k}`,
    [text(ask.k), { kind: 'stat-table', title: { k: 'm4.mod.lib.title' }, rows, head: 'both' }],
    ask.v,
    rng,
    ask.smart,
  )
}

/** 知道总量和其中一个分量，求另一个分量（例 1「分量 = 总量 - 分量」） */
function partQ(d: Difficulty, rng: RNG): Question {
  const t = rng.int(11, 29)
  const s = rng.int(t + 10, 89)
  return numQ(TOTAL, d, `part-${s}-${t}`, [text('m4.mod.lib.amStudents', { s, t })], s - t, rng, [s + t, s - t + 10, s - t - 10])
}

/** 数量关系选一选：求一共有多少用「总量 = 分量 + 分量」，求另一个分量用「分量 = 总量 - 分量」 */
function totalRelQ(d: Difficulty, rng: RNG): Question {
  const sum = rng.chance(0.5)
  const correct = { k: sum ? 'm4.mod.f.sumAdd' : 'm4.mod.f.partSub' }
  const others: LStr[] = ['m4.mod.f.sumAdd', 'm4.mod.f.partSub', 'm4.mod.f.sumSub', 'm4.mod.f.partAdd'].filter((k) => k !== correct.k).map((k) => ({ k }))
  return pickQ(TOTAL, d, `rel-${sum ? 'sum' : 'part'}`, [text(sum ? 'm4.mod.q.relSum' : 'm4.mod.q.relPart')], correct, others, rng)
}

const BOOKS = ['idiom', 'wall', 'math', 'crane'].map((b) => ({ k: `m4.mod.book.${b}` }))

/** 例 2：四本书的价钱（34、21、49、26 元这样），小丽有 100 元买 3 本不同的书 */
function bookQ(d: Difficulty, rng: RNG): Question {
  for (;;) {
    const prices = BOOKS.map(() => rng.int(18, 55))
    const total = prices.reduce((s, p) => s + p, 0)
    if (total < 115 || total > 160) continue
    const kind = rng.int(0, 2)
    if (kind === 0) {
      // 这 3 本，100 元够吗（不出正好 100 元的）
      const skip = rng.int(0, 3)
      const three = [0, 1, 2, 3].filter((i) => i !== skip)
      const sum = three.reduce((s, i) => s + prices[i]!, 0)
      if (sum === 100) continue
      const p: Params = { m: 100 }
      three.forEach((i, j) => {
        p[`b${j + 1}`] = BOOKS[i]!
        p[`p${j + 1}`] = prices[i]!
      })
      const [correct, others] = yesNo(sum <= 100, ENOUGH, NOT_ENOUGH)
      return pickQ(TOTAL, d, `book3-${three.map((i) => prices[i]).join('-')}`, [text('m4.mod.book.three', p)], correct, others, rng)
    }
    if (kind === 1) {
      const p: Params = {}
      prices.forEach((x, i) => {
        p[`b${i + 1}`] = BOOKS[i]!
        p[`p${i + 1}`] = x
      })
      return numQ(TOTAL, d, `book4-${prices.join('-')}`, [text('m4.mod.book.all', p)], total, rng, [total - prices[3]!, total + 10, total - 10])
    }
    // 4 本一共 s 元，不买其中一本，买另外 3 本要多少元（女孩的方法：130 - 34 = 96）
    const skip = rng.int(0, 3)
    return numQ(TOTAL, d, `bookrest-${total}-${prices[skip]}-${skip}`, [text('m4.mod.book.rest', { s: total, b: BOOKS[skip]!, p: prices[skip]! })], total - prices[skip]!, rng, [total + prices[skip]!, total - prices[skip]! + 10, prices[skip]!])
  }
}

/** 做一做：课后社团（舞蹈社团、美术社团一共多少名；参加社团的女生一共多少名） */
function clubQ(d: Difficulty, rng: RNG): Question {
  const [a, b, c, e] = [rng.int(3, 15), rng.int(15, 29), rng.int(12, 25), rng.int(12, 25)]
  if (rng.chance(0.5)) {
    const v = a + b + c + e
    return numQ(TOTAL, d, `club2-${a}-${b}-${c}-${e}`, [text('m4.mod.club.two', { a, b, c, d: e })], v, rng, [a + c, b + e, v - 10])
  }
  const [m1, m2, m3] = [rng.int(3, 15), rng.int(15, 30), rng.int(10, 25)]
  const girls = rng.int(30, 55)
  const n = m1 + m2 + m3 + girls
  return numQ(TOTAL, d, `girls-${n}-${m1}-${m2}-${m3}`, [text('m4.mod.club.girls', { n, a: m1, b: m2, c: m3 })], girls, rng, [m1 + m2 + m3, n - m1 - m2, girls + 10])
}

/** 练习十二 1：45 + 55 + 50 = ?、22 + 78 + ? = 180、? - 55 - 45 = 50、180 - 22 - ? = 78 */
function fillQ(d: Difficulty, rng: RNG): Question {
  const a = rng.int(11, 89)
  const b = rng.chance(0.5) ? 100 - a : rng.int(11, 89)
  const c = rng.int(2, 9) * 10
  const s = a + b + c
  const form = rng.int(0, 3)
  const [e, v] =
    form === 0
      ? [`${a} + ${b} + ${c} = ?`, s]
      : form === 1
        ? [`${a} + ${b} + ? = ${s}`, c]
        : form === 2
          ? [`? - ${a} - ${b} = ${c}`, s]
          : [`${s} - ${a} - ? = ${c}`, b]
  return numQ(TOTAL, d, flat(e), [text('m4.mod.fillQ'), expr(e)], v, rng, [v + 10, v - 10, s - v > 0 ? s - v : v + 20])
}

/** 练习十二 2、3：借出后还剩、鸡比兔多、共享单车、苹果和梨 */
function storyQ(d: Difficulty, rng: RNG): Question {
  const pool: (() => { k: string; p: Params; v: number; smart: number[] })[] = [
    () => {
      const [a, b] = [rng.int(11, 29), rng.int(20, 49)]
      return { k: 'm4.mod.w.bookCorner', p: { a, b }, v: a + b, smart: [b - a, b, a + b + 10] }
    },
    () => {
      const [a, b] = [rng.int(20, 49), rng.int(5, 19)]
      return { k: 'm4.mod.w.farm', p: { a, b }, v: a + a + b, smart: [a + b, a + a, a + b + b] }
    },
    () => {
      const a = rng.int(25, 49)
      const b = rng.int(10, a - 5)
      const c = rng.int(3, 9)
      return { k: 'm4.mod.w.bikes', p: { a, b, c }, v: a - b + c, smart: [a - b - c, a + b - c, a - b] }
    },
    () => {
      const a = rng.int(12, 49) * 10
      const b = a + rng.pick([-1, 1]) * rng.int(5, 25) * 10
      return { k: 'm4.mod.w.fruit', p: { a, b }, v: a + b, smart: [Math.abs(a - b), a + b + 100, a + b - 100] }
    },
    () => {
      const b = rng.int(30, 49) * 10
      const c = rng.int(10, b / 10 - 5) * 10
      return { k: 'm4.mod.w.fruitLess', p: { b, c }, v: b + b - c, smart: [b - c, b + c, b + b + c] }
    },
  ]
  const w = rng.pick(pool)()
  return numQ(TOTAL, d, `${w.k}-${Object.values(w.p).join('-')}`, [text(w.k, w.p)], w.v, rng, w.smart)
}

/** 练习十二 4：研学租车，每辆车都正好坐满（大巴载客 55 人、中巴 32 人、小巴 8 人这样） */
function busesQ(d: Difficulty, rng: RNG): Question {
  const [a, b, c] = [rng.pick([45, 50, 55]), rng.pick([28, 30, 32]), rng.pick([6, 8, 10])]
  const [x, y, z] = [rng.int(3, 8), rng.int(3, 6), rng.int(2, 4)]
  const total = a * x + b * y + c * z
  return numQ(TOTAL, d, `buses-${a}-${x}-${b}-${y}-${c}-${z}`, [text('m4.mod.w.buses', { a, x, b, y, c, z })], total, rng, [a + b + c, a * x + b * y, total + 10, total - 10])
}

defineGenerator(TOTAL, (d, rng) => {
  const roll = rng.next()
  if (d === 1) {
    if (roll < 0.36) return libraryQ(d, rng)
    if (roll < 0.5) return partQ(d, rng)
    if (roll < 0.64) return totalRelQ(d, rng)
    if (roll < 0.84) return bookQ(d, rng)
    return clubQ(d, rng)
  }
  if (d === 2) {
    if (roll < 0.35) return fillQ(d, rng)
    if (roll < 0.75) return storyQ(d, rng)
    if (roll < 0.9) return bookQ(d, rng)
    return clubQ(d, rng)
  }
  if (roll < 0.5) return busesQ(d, rng)
  if (roll < 0.75) return clubQ(d, rng)
  return storyQ(d, rng)
})

// ─────────────────────────────────────────────────────────────
// 单价、数量和总价的关系（p62–65，例 3、例 4、两个做一做，练习十三）
// 第 1 档：总价 = 单价 × 数量及两个变式（例 3 的小票：牛奶、苹果；做一做的校服、粉笔）；单价、数量、总价是什么；
//          数量关系选一选；单价写作「9 元/千克」；例 4 原价 12 元/千克、现价 9 元/千克，买 4 千克节省多少（两种列式）；
//          做一做的大米原价每袋多少元。
// 第 2 档：练习十三：花店表里缺的数、购物小票里缺的金额 / 数量、篮球和足球一共花了多少、108 ÷ 6 求的是什么、
//          哪种买法每盒牛奶最便宜、套餐一共要多少元。
// 第 3 档：门票最少要花多少元（练习十三 7）、套餐有几种买法（练习十三 3）、小票合计。
// ─────────────────────────────────────────────────────────────

/** 例 3 和做一做 2：总价、单价、数量知二求一（除数是一位数、都能整除） */
function priceBasicQ(d: Difficulty, rng: RNG): Question {
  const kind = rng.int(0, 5)
  if (kind === 0) {
    const [p, n] = [rng.int(11, 29), rng.int(2, 9)]
    return numQ(PRICE, d, `milk-${p}-${n}`, [text('m4.mod.w.milk', { p, n })], p * n, rng, [p + n, p * n + p, p * n - p])
  }
  if (kind === 1) {
    const [p, n] = [rng.int(8, 20) * 10, rng.int(2, 9)]
    return numQ(PRICE, d, `uniform-${p}-${n}`, [text('m4.mod.w.uniform', { p, n })], p * n, rng, [p + n, (p * n) / 10, p * n + p])
  }
  if (kind === 2) {
    const [u, n] = [rng.int(10, 30) * 10, rng.int(2, 9)]
    return numQ(PRICE, d, `chalk-${n}-${u * n}`, [text('m4.mod.w.chalk', { n, t: u * n })], u, rng, [u * n * n, u + 10, u - 10])
  }
  if (kind === 3) {
    const [p, n] = [rng.int(3, 9), rng.int(2, 9)]
    return numQ(PRICE, d, `appleqty-${p}-${p * n}`, [text('m4.mod.w.appleQty', { p, t: p * n })], n, rng, [p * n * p, n + 1, p])
  }
  if (kind === 4) {
    const [p, n] = [rng.int(11, 25), rng.int(3, 9)]
    return numQ(PRICE, d, `pens-${p}-${n}`, [text('m4.mod.w.pens', { p, n })], p * n, rng, [p + n, p * n + p, p * n - 10])
  }
  const [u, n] = [rng.int(11, 25), rng.int(3, 9)]
  return numQ(PRICE, d, `pensunit-${n}-${u * n}`, [text('m4.mod.w.pensUnit', { n, t: u * n })], u, rng, [u * n * n, u + 1, u - 1])
}

/** 例 3：单价、数量、总价各是什么（课本红字） */
function priceDefQ(d: Difficulty, rng: RNG): Question {
  const which = rng.pick(['unit', 'qty', 'total'] as const)
  const q = { unit: 'm4.mod.q.defUnit', qty: 'm4.mod.q.defQty', total: 'm4.mod.q.defTotal' }[which]
  const correct = key(`m4.mod.word.${which}`)
  const others = (['unit', 'qty', 'total'] as const).filter((w) => w !== which).map((w) => key(`m4.mod.word.${w}`))
  return pickQ(PRICE, d, `def-${which}`, [text(q)], correct, others, rng)
}

/** 例 3 的数量关系：总价 = 单价 × 数量，单价 = 总价 ÷ 数量，数量 = 总价 ÷ 单价 */
function priceRelQ(d: Difficulty, rng: RNG): Question {
  const which = rng.pick(['total', 'unit', 'qty'] as const)
  if (which === 'total') return relQ(PRICE, d, rng, 'total', 'pMul', ['pAdd', 'pDiv', 'uDiv', 'qDiv'])
  if (which === 'unit') return relQ(PRICE, d, rng, 'unit', 'uDiv', ['uMul', 'uInv', 'pMul', 'qDiv'])
  return relQ(PRICE, d, rng, 'qty', 'qDiv', ['qMul', 'qInv', 'pMul', 'uDiv'])
}

/** 单价的写法：苹果每千克 9 元，单价写作「9 元/千克」 */
function unitWriteQ(d: Difficulty, rng: RNG): Question {
  const p = rng.int(3, 15)
  return pickQ(PRICE, d, `unitwrite-${p}`, [text('m4.mod.w.writeUnit', { p })], key('m4.mod.u.ypk', { v: p }), [key('m4.mod.u.kpy', { v: p }), key('m4.mod.u.yuan', { v: p })], rng)
}

/** 例 4：原价 12 元/千克、现价 9 元/千克，买 4 千克节省了多少元；也问哪个算式能算出来 */
function saveQ(d: Difficulty, rng: RNG): Question {
  const a = rng.int(8, 20)
  const b = rng.int(4, a - 2)
  const n = rng.int(3, 9)
  if (rng.chance(0.6)) {
    return numQ(PRICE, d, `save-${a}-${b}-${n}`, [text('m4.mod.w.save', { a, b, n })], (a - b) * n, rng, [a - b, a * n, (a + b) * n, b * n])
  }
  const correct = rng.chance(0.5) ? `(${a} - ${b}) × ${n}` : `${a} × ${n} - ${b} × ${n}`
  const others = [`${a} × ${n} + ${b} × ${n}`, `${a} - ${b} × ${n}`, `(${a} + ${b}) × ${n}`]
  return pickQ(PRICE, d, `savehow-${a}-${b}-${n}-${flat(correct)}`, [text('m4.mod.w.saveInfo', { a, b, n }), text('m4.mod.q.saveHow')], correct, others, rng)
}

/** 例 4 做一做：买 4 袋同样的大米总价 236 元，比原来便宜了 84 元，原价每袋多少元 */
function riceQ(d: Difficulty, rng: RNG): Question {
  const n = rng.int(2, 6)
  const orig = rng.int(8, 18) * 5
  const off = rng.int(3, Math.min(25, orig - 20))
  return numQ(PRICE, d, `rice-${n}-${orig}-${off}`, [text('m4.mod.w.rice', { n, t: (orig - off) * n, c: off * n })], orig, rng, [orig - off, orig - 2 * off, (orig - off) * n, off])
}

/** 练习十三 2：花店的表（单价 / 数量 / 总价缺一个） */
function flowerQ(d: Difficulty, rng: RNG): Question {
  const flower = rng.pick(['rose', 'lily', 'sunflower'])
  const missing = rng.int(0, 2)
  // 求单价、求数量都是除法，除数照课本是一位数（135 ÷ 9、288 ÷ 8）
  const [u, n] = missing === 0 ? [rng.int(11, 30), rng.int(3, 9)] : missing === 1 ? [rng.int(3, 9), rng.int(11, 40)] : [rng.int(3, 15), rng.int(9, 40)]
  const row: (number | LStr | null)[] = [{ k: `m4.mod.n.${flower}` }, u, n, u * n]
  const value = [u, n, u * n][missing]!
  row[missing + 1] = null
  const rows: (number | LStr | null)[][] = [[{ k: 'm4.mod.t.flower' }, { k: 'm4.mod.t.unitYuan' }, { k: 'm4.mod.t.qtyStem' }, { k: 'm4.mod.t.totalYuan' }], row]
  return numQ(PRICE, d, `flower-${flower}-${u}-${n}-${missing}`, [text('m4.mod.tableFill'), { kind: 'stat-table', rows, head: 'row' }], value, rng, [value + 1, value - 1, value * 2], 'numpad')
}

const RECEIPT_ITEMS = [
  { n: 'bass', unit: 'kg', price: [18, 30], qty: [2, 4] },
  { n: 'tomato', unit: 'kg', price: [4, 9], qty: [2, 6] },
  { n: 'water', unit: 'box', price: [12, 20], qty: [2, 8] },
  { n: 'milk', unit: 'box', price: [15, 25], qty: [2, 5] },
  { n: 'oil', unit: 'barrel', price: [50, 80], qty: [1, 2] },
  { n: 'candy', unit: 'piece', price: [2, 3], qty: [4, 9] },
]

/** 练习十三 4：购物小票（物品 / 单价 / 数量 / 金额），缺一个金额或数量；第 3 档问合计 */
function receiptQ(d: Difficulty, rng: RNG): Question {
  const items = rng.shuffle(RECEIPT_ITEMS).slice(0, 3)
  const lines = items.map((it) => {
    const p = rng.int(it.price[0]!, it.price[1]!)
    const q = rng.int(it.qty[0]!, it.qty[1]!)
    return { ...it, p, q, amount: p * q }
  })
  const total = lines.reduce((s, l) => s + l.amount, 0)
  const askSum = d === 3
  const target = rng.int(0, 2)
  // 问数量是金额 ÷ 单价，单价是一位数的才问（除数照课本是一位数）
  const askQty = !askSum && lines[target]!.p <= 9 && rng.chance(0.6)
  const rows: (number | LStr | null)[][] = [[{ k: 'm4.mod.t.item' }, { k: 'm4.mod.t.unitYuan' }, { k: 'm4.mod.t.qty' }, { k: 'm4.mod.t.amountYuan' }]]
  lines.forEach((l, i) => {
    const ask = !askSum && i === target
    rows.push([{ k: `m4.mod.n.${l.n}` }, l.p, ask && askQty ? null : key(`m4.mod.u.${l.unit}`, { v: l.q }), ask && !askQty ? null : l.amount])
  })
  rows.push([{ k: 'm4.mod.t.sum' }, '', '', askSum ? null : total])
  const l = lines[target]!
  const [q, value] = askSum
    ? [text('m4.mod.rcpt.sum'), total]
    : askQty
      ? [text('m4.mod.rcpt.qty', { item: key(`m4.mod.n.${l.n}`), unit: key(`m4.mod.u.${l.unit}W`) }), l.q]
      : [text('m4.mod.rcpt.amount', { item: key(`m4.mod.n.${l.n}`) }), l.amount]
  return numQ(PRICE, d, `rcpt-${lines.map((x) => `${x.n}${x.p}x${x.q}`).join('-')}-${askSum ? 's' : `${target}${askQty ? 'q' : 'a'}`}`, [q, { kind: 'stat-table', title: { k: 'm4.mod.rcpt.title' }, rows, head: 'row' }], value, rng, [value + 1, value - 1, value + 10], 'numpad')
}

/** 练习十三 5：6 个篮球每个 85 元，买足球一共花了 66 元，一共花了多少元（足球的个数是多余的条件） */
function ballsQ(d: Difficulty, rng: RNG): Question {
  const [n, f, p, s] = [rng.int(3, 9), rng.int(2, 5), rng.int(41, 99), rng.int(40, 99)]
  return numQ(PRICE, d, `balls-${n}-${f}-${p}-${s}`, [text('m4.mod.w.balls', { n, f, p, s })], n * p + s, rng, [n * p, n * p + s * f, n * p - s, p + s])
}

/** 练习十三 6：买 6 个碗和 6 个杯子共 108 元，108 ÷ 6 求的是什么 */
function bowlsQ(d: Difficulty, rng: RNG): Question {
  const n = rng.int(3, 9)
  const b = rng.int(5, 12)
  const c = rng.int(3, 12)
  const t = (b + c) * n
  return pickQ(PRICE, d, `bowls-${n}-${b}-${t}`, [text('m4.mod.w.bowls', { n, t, b })], key('m4.mod.c.set'), [key('m4.mod.c.cup'), key('m4.mod.c.bowls', { n })], rng)
}

/** 练习十三 8：牛奶 1 盒 5 元、4 盒一组 16 元、一箱 8 盒 24 元，哪种买法每盒最便宜 */
function milkDealQ(d: Difficulty, rng: RNG): Question {
  for (;;) {
    const one = rng.int(4, 7)
    const four = 4 * rng.int(3, one)
    const eight = 8 * rng.int(2, one)
    const per = [one, four / 4, eight / 8]
    const best = Math.min(...per)
    if (per.filter((x) => x === best).length > 1) continue
    const labels = [key('m4.mod.c.single'), key('m4.mod.c.four'), key('m4.mod.c.case')]
    const i = per.indexOf(best)
    return pickQ(PRICE, d, `milkdeal-${one}-${four}-${eight}`, [text('m4.mod.w.milkDeal', { a: one, b: four, c: eight })], labels[i]!, labels.filter((_, j) => j !== i), rng)
  }
}

/** 练习十三 3：套餐一、套餐二，买几份一共多少元；第 3 档有 60 元买 3 份有几种买法 */
function mealQ(d: Difficulty, rng: RNG): Question {
  const x = rng.int(18, 25)
  const y = rng.int(12, x - 2)
  if (d < 3) {
    const m = rng.int(1, 3)
    const k = rng.int(1, 3)
    return numQ(PRICE, d, `meal-${x}-${y}-${m}-${k}`, [text('m4.mod.w.meal', { x, y, m, k })], x * m + y * k, rng, [x + y, x * k + y * m, (x + y) * (m + k)])
  }
  const m = rng.int(3 * y, 3 * x)
  let ways = 0
  for (let i = 0; i <= 3; i++) if (x * i + y * (3 - i) <= m) ways++
  return numQ(PRICE, d, `mealways-${x}-${y}-${m}`, [text('m4.mod.w.mealWays', { x, y, m })], ways, rng, [1, 2, 3, 4].filter((w) => w !== ways), 'choice')
}

/** 练习十三 7：成人票、儿童票、团体票（10 人及以上），老师带学生最少要花多少元 */
function ticketsQ(d: Difficulty, rng: RNG): Question {
  const [a, c, g] = [8, 4, 6]
  const t = rng.int(2, 4)
  const n = rng.int(20, 40)
  // 三种买法：都按成人、儿童买；都买团体票；老师和几个学生凑够 10 人买团体票，其余学生买儿童票
  const best = Math.min(t * a + n * c, (t + n) * g, 10 * g + (n - (10 - t)) * c)
  return numQ(PRICE, d, `tickets-${t}-${n}`, [text('m4.mod.w.tickets', { a, c, g, t, n })], best, rng, [(t + n) * g, (t + n) * c, t * a + n * g])
}

defineGenerator(PRICE, (d, rng) => {
  const roll = rng.next()
  if (d === 1) {
    if (roll < 0.36) return priceBasicQ(d, rng)
    if (roll < 0.48) return priceDefQ(d, rng)
    if (roll < 0.6) return priceRelQ(d, rng)
    if (roll < 0.66) return unitWriteQ(d, rng)
    if (roll < 0.86) return saveQ(d, rng)
    return riceQ(d, rng)
  }
  if (d === 2) {
    if (roll < 0.22) return flowerQ(d, rng)
    if (roll < 0.44) return receiptQ(d, rng)
    if (roll < 0.58) return ballsQ(d, rng)
    if (roll < 0.72) return bowlsQ(d, rng)
    if (roll < 0.86) return milkDealQ(d, rng)
    return mealQ(d, rng)
  }
  if (roll < 0.35) return ticketsQ(d, rng)
  if (roll < 0.65) return mealQ(d, rng)
  return receiptQ(d, rng)
})

// ─────────────────────────────────────────────────────────────
// 时间、速度、路程的关系（p66–69，例 5、例 6、两个做一做，练习十四）
// 第 1 档：例 5 求每分钟走多少米、比谁走得快（时间相同比路程、路程相同比时间、都不同先算速度）；路程、速度、时间是什么；
//          速度的写法「80 米/分」「800 千米/时」；数量关系选一选；做一做的小林 15 分钟走多少米、蜜蜂飞 600 米要多少秒；
//          例 6 从里程表求速度（8:30 出发 11:30 到达）；做一做的乙地到丙地多少千米、离乙城还有 20 千米求速度。
// 第 2 档：练习十四：72 米/分和 5 分钟走 400 米谁快、一星期跑多少千米、从服务区到乙地 3 小时能不能到、往返的路程。
// 第 3 档：返回时平均每小时行驶多少千米（练习十四 4(2)）、服务区、一星期跑多少千米。
// ─────────────────────────────────────────────────────────────

const NAMES = ['li', 'hong', 'ming', 'jun', 'dong'].map((n) => ({ k: `m4.mod.n.${n}` }))

/** 例 5：小丽家到学校 480 米走了 6 分钟，每分钟走多少米；汽车几小时行驶多少千米，每小时行驶多少千米 */
function speedFromQ(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.6)) {
    const [v, t] = [rng.int(50, 90), rng.int(4, 9)]
    const name = rng.pick(NAMES)
    return numQ(SPEED, d, `walkv-${name.k}-${v * t}-${t}`, [text('m4.mod.w.walkSpeed', { x: name, d: v * t, t })], v, rng, [v * t * t, v + 10, v - 10])
  }
  const [v, t] = [rng.int(6, 12) * 10, rng.int(2, 5)]
  return numQ(SPEED, d, `carv-${v * t}-${t}`, [text('m4.mod.w.carSpeed', { t, d: v * t })], v, rng, [v * t * t, v + 10, v - 10])
}

/** 例 5 比一比谁走得快：时间相同比路程（小红和小明）、路程相同比时间（小丽和小明）、都不同先算每分钟走多少米（小丽和小红） */
function whoQ(d: Difficulty, rng: RNG): Question {
  for (;;) {
    const [x, y] = rng.shuffle(NAMES).slice(0, 2) as [LStr, LStr]
    const kind = rng.int(0, 2)
    let [dx, tx, dy, ty] = [0, 0, 0, 0]
    if (kind === 0) {
      const t = rng.int(5, 12)
      ;[dx, dy] = [rng.int(40, 90) * 10, rng.int(40, 90) * 10]
      ;[tx, ty] = [t, t]
    } else if (kind === 1) {
      const dist = rng.int(40, 90) * 10
      ;[dx, dy] = [dist, dist]
      ;[tx, ty] = [rng.int(5, 12), rng.int(5, 12)]
    } else {
      const [vx, vy] = [rng.int(55, 90), rng.int(55, 90)]
      ;[tx, ty] = [rng.int(4, 9), rng.int(4, 9)]
      ;[dx, dy] = [vx * tx, vy * ty]
    }
    const [vx, vy] = [dx / tx, dy / ty]
    if (vx === vy || dx === dy && tx === ty) continue
    const faster = vx > vy ? x : y
    const slower = vx > vy ? y : x
    return pickQ(SPEED, d, `who-${(x as { k: string }).k}-${dx}-${tx}-${(y as { k: string }).k}-${dy}-${ty}`, [text('m4.mod.w.who', { x, dx, tx, y, dy, ty })], faster, [slower, key('m4.mod.c.same')], rng)
  }
}

/** 例 5：路程、速度、时间各是什么（课本红字） */
function speedDefQ(d: Difficulty, rng: RNG): Question {
  const which = rng.pick(['dist', 'speed', 'time'] as const)
  const q = { dist: 'm4.mod.q.defDist', speed: 'm4.mod.q.defSpeed', time: 'm4.mod.q.defTime' }[which]
  const correct = key(`m4.mod.word.${which}`)
  const others = (['dist', 'speed', 'time'] as const).filter((w) => w !== which).map((w) => key(`m4.mod.word.${w}`))
  return pickQ(SPEED, d, `def-${which}`, [text(q)], correct, others, rng)
}

/** 速度的写法：80 米/分（读作 80 米每分）、800 千米/时 */
function speedWriteQ(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.6)) {
    const v = rng.int(50, 90)
    const name = rng.pick(NAMES)
    return pickQ(SPEED, d, `write-m-${name.k}-${v}`, [text('m4.mod.w.writeSpeed', { x: name, v })], key('m4.mod.u.mpm', { v }), [key('m4.mod.u.m', { v }), key('m4.mod.u.mpmRev', { v })], rng)
  }
  const v = rng.int(5, 9) * 100
  return pickQ(SPEED, d, `write-km-${v}`, [text('m4.mod.w.planeSpeed', { v })], key('m4.mod.u.kmh', { v }), [key('m4.mod.u.km', { v }), key('m4.mod.u.kmhRev', { v })], rng)
}

/** 例 5 的数量关系：路程 = 速度 × 时间，速度 = 路程 ÷ 时间，时间 = 路程 ÷ 速度 */
function speedRelQ(d: Difficulty, rng: RNG): Question {
  const which = rng.pick(['dist', 'speed', 'time'] as const)
  if (which === 'dist') return relQ(SPEED, d, rng, 'dist', 'dMul', ['dAdd', 'dDiv', 'vDiv', 'tDiv'])
  if (which === 'speed') return relQ(SPEED, d, rng, 'speed', 'vDiv', ['vMul', 'vInv', 'dMul', 'tDiv'])
  return relQ(SPEED, d, rng, 'time', 'tDiv', ['tMul', 'tInv', 'dMul', 'vDiv'])
}

/** 例 5 做一做 2：小林每分钟走 60 米，15 分钟走多少米；蜜蜂每秒飞 5 米，飞 600 米要多少秒 */
function walkOrBeeQ(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.6)) {
    const [v, t] = [rng.int(5, 8) * 10, rng.int(11, 20)]
    const name = rng.pick(NAMES)
    return numQ(SPEED, d, `walkd-${name.k}-${v}-${t}`, [text('m4.mod.w.walkDist', { x: name, v, t })], v * t, rng, [v + t, v * t + v, v * t - 10])
  }
  const v = rng.int(3, 8)
  const t = rng.int(20, 150)
  return numQ(SPEED, d, `bee-${v}-${v * t}`, [text('m4.mod.w.bee', { v, d: v * t })], t, rng, [v * t * v, t + 10, t - 10])
}

/** 例 6：早上 8:30 出发、11:30 到达，出发时总里程 2522 千米、到达时 2792 千米，平均每小时行驶多少千米 */
function odometerQ(d: Difficulty, rng: RNG): Question {
  const h1 = rng.int(7, 9)
  const t = rng.int(2, 12 - h1)
  const v = rng.int(6, 9) * 10 + rng.pick([0, 5])
  const o1 = rng.int(1000, 8000)
  const o2 = o1 + v * t
  return numQ(SPEED, d, `odo-${h1}-${t}-${o1}-${o2}`, [text('m4.mod.w.odometer', { h1, h2: h1 + t, o1, o2 })], v, rng, [o2 - o1, (o2 - o1) * t, v + 10, v - 10])
}

/** 例 6 做一做：下午 1:30 出发、3:30 到达，每小时行驶 90 千米，路程多少千米；两城相距 305 千米，行驶 3 小时还剩 20 千米，速度多少 */
function tripTimeQ(d: Difficulty, rng: RNG): Question {
  if (rng.chance(0.5)) {
    const h1 = rng.int(1, 3)
    const t = rng.int(2, 3)
    const v = rng.int(6, 9) * 10
    return numQ(SPEED, d, `pm-${h1}-${t}-${v}`, [text('m4.mod.w.afternoon', { h1, h2: h1 + t, v })], v * t, rng, [v * (h1 + t), v + t, v * t + v])
  }
  const t = rng.int(2, 5)
  const v = rng.int(13, 19) * 5
  const r = rng.int(1, 9) * 5
  const D = v * t + r
  return numQ(SPEED, d, `left-${D}-${t}-${r}`, [text('m4.mod.w.leftover', { D, t, r })], v, rng, [D - r, Math.floor(D / t), v + 5, v - 5])
}

/** 练习十四 1：小军的速度是 72 米/分，小东 5 分钟走了 400 米，谁走得快 */
function whoFasterQ(d: Difficulty, rng: RNG): Question {
  for (;;) {
    const [x, y] = rng.shuffle(NAMES).slice(0, 2) as [LStr, LStr]
    const vx = rng.int(60, 85)
    const t = rng.int(4, 9)
    const vy = rng.int(60, 85)
    if (vx === vy) continue
    return pickQ(SPEED, d, `faster-${(x as { k: string }).k}-${vx}-${(y as { k: string }).k}-${t}-${vy * t}`, [text('m4.mod.w.whoFaster', { x, v: vx, y, t, d: vy * t })], vx > vy ? x : y, [vx > vy ? y : x, key('m4.mod.c.same')], rng)
  }
}

/** 练习十四 2：每天跑 20 分钟、每分钟 300 米，一星期能跑多少千米（一天跑的正好是整千米） */
function jogQ(d: Difficulty, rng: RNG): Question {
  for (;;) {
    const v = rng.pick([200, 250, 300, 400, 500])
    const t = rng.pick([10, 20, 30, 40])
    if ((v * t) % 1000 !== 0) continue
    const km = ((v * t) / 1000) * 7
    return numQ(SPEED, d, `jog-${v}-${t}`, [text('m4.mod.w.jog', { t, v })], km, rng, [(v * t) / 1000, v * t * 7, km + 7])
  }
}

/** 练习十四 3：两地相距 500 千米，开了一段在服务区休息；剩下的路每小时行驶 95 千米，3 小时能到吗 */
function serviceQ(d: Difficulty, rng: RNG): Question {
  for (;;) {
    const D = rng.int(40, 60) * 10
    const a = rng.int(150, 300)
    const v = rng.int(16, 19) * 5
    const t = rng.int(2, 3)
    const rest = D - a
    if (rest === v * t || Math.abs(rest - v * t) > 40) continue
    const [correct, others] = yesNo(v * t >= rest, CAN, CANNOT)
    return pickQ(SPEED, d, `service-${D}-${a}-${v}-${t}`, [text('m4.mod.w.service', { D, a, v, t })], correct, others, rng)
  }
}

/** 练习十四 4：去的时候 40 千米/时、用了 3 小时，从县城到王庄乡多少千米；原路返回用了 2 小时，返回时每小时行驶多少千米 */
function tripQ(d: Difficulty, rng: RNG): Question {
  for (;;) {
    const v = rng.int(3, 9) * 10
    const t = rng.int(2, 5)
    const dist = v * t
    if (d < 3 || rng.chance(0.3)) return numQ(SPEED, d, `trip-${v}-${t}`, [text('m4.mod.w.trip', { v, t })], dist, rng, [v + t, dist + v, dist - v])
    const s = rng.int(2, 6)
    // 返回的速度也要像汽车在县乡公路上开的（20–100 千米/时）
    if (s === t || dist % s !== 0 || dist / s > 100 || dist / s < 20) continue
    return numQ(SPEED, d, `tripback-${v}-${t}-${s}`, [text('m4.mod.w.tripBack', { v, t, s })], dist / s, rng, [dist, v, dist / t, dist * s])
  }
}

defineGenerator(SPEED, (d, rng) => {
  const roll = rng.next()
  if (d === 1) {
    if (roll < 0.2) return speedFromQ(d, rng)
    if (roll < 0.34) return whoQ(d, rng)
    if (roll < 0.44) return speedDefQ(d, rng)
    if (roll < 0.54) return speedWriteQ(d, rng)
    if (roll < 0.64) return speedRelQ(d, rng)
    if (roll < 0.78) return walkOrBeeQ(d, rng)
    if (roll < 0.88) return odometerQ(d, rng)
    return tripTimeQ(d, rng)
  }
  if (d === 2) {
    if (roll < 0.22) return whoFasterQ(d, rng)
    if (roll < 0.4) return jogQ(d, rng)
    if (roll < 0.58) return serviceQ(d, rng)
    if (roll < 0.76) return tripQ(d, rng)
    if (roll < 0.88) return odometerQ(d, rng)
    return tripTimeQ(d, rng)
  }
  if (roll < 0.45) return tripQ(d, rng)
  if (roll < 0.75) return serviceQ(d, rng)
  return jogQ(d, rng)
})
