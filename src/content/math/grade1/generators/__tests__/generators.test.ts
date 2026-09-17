import { describe, expect, it } from 'vitest'
import type { Question, StemPart } from '@/types/models'
import '@/content/math/grade1' // 副作用：注册生成器与词条
import { KNOWLEDGE_POINTS } from '@/content/math/grade1/curriculum'
import { buildSession, createRng, getGenerator, hasGenerator } from '@/engine'
import { checkAnswer } from '@/engine/answer'
import { SHAPE_NAMES, formatMoney } from '@/content/math/shared/labels'
import { translate } from '@/engine/i18n'

const registered = KNOWLEDGE_POINTS.filter((kp) => hasGenerator(kp.id))

/** 把 LStr 解析成中文（题目文本/选项现在是可本地化字符串）。 */
const zh = (l: import('@/types/models').LStr): string => translate(l, 'zh')

function stemOf<K extends StemPart['kind']>(
  q: Question,
  kind: K,
): Extract<StemPart, { kind: K }> | undefined {
  return q.stem.find((p) => p.kind === kind) as Extract<StemPart, { kind: K }> | undefined
}

/** 存储答案对应的「作答输入」（用于自洽校验） */
function correctInput(q: Question): unknown {
  return q.answer.kind === 'number' ? q.answer.value : q.answer.choiceId
}

/** 正确答案的展示文本 */
function correctLabel(q: Question): string {
  if (q.answer.kind === 'number') return String(q.answer.value)
  return zh(q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)!.label)
}

/** 计算只含 + - 的算式（左到右） */
function evalExpr(expr: string): number {
  const tokens = expr.replace('= ?', '').trim().split(/\s+/)
  let acc = parseInt(tokens[0]!, 10)
  for (let i = 1; i < tokens.length; i += 2) {
    const op = tokens[i]
    const n = parseInt(tokens[i + 1]!, 10)
    acc = op === '+' ? acc + n : acc - n
  }
  return acc
}

describe('全部生成器：结构自洽（多种子）', () => {
  it('26 个知识点都有生成器', () => {
    expect(registered.length).toBe(KNOWLEDGE_POINTS.length)
    expect(registered.length).toBe(26)
  })

  for (const kp of registered) {
    it(`${kp.id} 每题结构合法且答案自洽`, () => {
      const gen = getGenerator(kp.id)!
      for (let seed = 1; seed <= 150; seed++) {
        const rng = createRng(seed)
        for (const d of [1, 2, 3] as const) {
          const q = gen(d, rng)
          expect(q.kpId).toBe(kp.id)
          expect([1, 2, 3]).toContain(q.difficulty)
          expect(q.stem.length).toBeGreaterThan(0)
          expect(['numpad', 'choice']).toContain(q.input)
          expect(kp.questionTypes).toContain(q.type)
          // 存储的正确答案必须能通过校验
          expect(checkAnswer(q, correctInput(q))).toBe(true)
          // 实物类教具不能画出「0 个」——那是一行空白，孩子没法看图
          for (const part of q.stem) {
            if (part.kind === 'objects') expect(part.count).toBeGreaterThan(0)
            if (part.kind === 'compare-rows') {
              for (const row of part.rows) expect(row.count).toBeGreaterThan(0)
            }
          }

          if (q.input === 'choice') {
            expect(q.answer.kind).toBe('choice')
            const choices = q.choices ?? []
            expect(choices.length).toBeGreaterThanOrEqual(2)
            // 选项互异：按显示出来的文本判，两个不同词条译成同一个词也算重复
            const labels = choices.map((c) => zh(c.label))
            expect(new Set(labels).size).toBe(labels.length)
            const ids = choices.map((c) => c.id)
            expect(new Set(ids).size).toBe(ids.length)
            if (q.answer.kind === 'choice') expect(ids).toContain(q.answer.choiceId)
          } else {
            expect(q.answer.kind).toBe('number')
            if (q.answer.kind === 'number') {
              expect(Number.isInteger(q.answer.value)).toBe(true)
              expect(q.answer.value).toBeGreaterThanOrEqual(0)
            }
          }
        }
      }
    })
  }
})

describe('buildSession：足量且去重', () => {
  for (const kp of registered) {
    it(`${kp.id} 会话内题目签名不重复`, () => {
      for (let seed = 1; seed <= 30; seed++) {
        const qs = buildSession(kp.id, 8, { seed })
        expect(qs.length).toBeGreaterThan(0)
        expect(new Set(qs.map((q) => q.id)).size).toBe(qs.length)
      }
    })
  }
})

describe('数学正确性（按题型抽样）', () => {
  it('所有含算式的题：expr 结果 == 标注答案', () => {
    for (const kp of registered) {
      const gen = getGenerator(kp.id)!
      for (let seed = 1; seed <= 120; seed++) {
        const rng = createRng(seed)
        for (const d of [1, 2, 3] as const) {
          const q = gen(d, rng)
          const expr = stemOf(q, 'expr')
          if (!expr || !expr.expr.includes('= ?')) continue
          expect(evalExpr(expr.expr)).toBe(Number(correctLabel(q)))
        }
      }
    }
  })

  it('5 / 10 以内加减法：有关 0 的题（+0、-0、a-a）只占少数但仍会出现', () => {
    for (const kp of ['s1-01-addsub-5', 's1-02-addsub-10']) {
      const gen = getGenerator(kp)!
      let total = 0
      let trivial = 0
      for (let seed = 1; seed <= 600; seed++) {
        const q = gen(((seed % 3) + 1) as 1 | 2 | 3, createRng(seed))
        const expr = stemOf(q, 'expr')!.expr
        const [a, b] = evalOperands(expr)
        total++
        if (a === 0 || b === 0 || (expr.includes('-') && a === b)) trivial++
      }
      expect(trivial).toBeGreaterThan(0)
      expect(trivial / total).toBeLessThan(0.3)
    }
  })

  it('分与合：「T 分成 P 和几」答案 == T-P', () => {
    let checked = 0
    for (const kp of ['s1-01-compose-5', 's1-02-compose-10']) {
      const gen = getGenerator(kp)!
      for (let seed = 1; seed <= 200; seed++) {
        const q = gen(((seed % 3) + 1) as 1 | 2 | 3, createRng(seed))
        const text = stemOf(q, 'text')
        const m = text ? zh(text.text).match(/^(\d+) 可以分成 (\d+) 和几/) : null
        if (!m) continue
        checked++
        expect(Number(correctLabel(q))).toBe(Number(m[1]) - Number(m[2]))
      }
    }
    expect(checked).toBeGreaterThan(20)
  })

  it('破十法：退位成立（个位不够减）且演示参数正确', () => {
    const gen = getGenerator('s2-02-borrow-sub')!
    for (let seed = 1; seed <= 300; seed++) {
      const q = gen(((seed % 3) + 1) as 1 | 2 | 3, createRng(seed))
      const [min, sub] = evalOperands(stemOf(q, 'expr')!.expr)
      expect(min).toBeGreaterThanOrEqual(11)
      expect(min).toBeLessThanOrEqual(18)
      expect(min % 10).toBeLessThan(sub) // 需要退位
      expect(Number(correctLabel(q))).toBe(min - sub)
      expect(q.explain).toEqual({ kind: 'break-ten', minuend: min, subtrahend: sub })
    }
  })

  it('比大小：选中的符号正确', () => {
    const gen = getGenerator('s2-03-compare-100')!
    for (let seed = 1; seed <= 300; seed++) {
      const q = gen(((seed % 3) + 1) as 1 | 2 | 3, createRng(seed))
      const expr = stemOf(q, 'expr')!.expr // "x ⬜ y"
      const [x, y] = expr.split('⬜').map((s) => parseInt(s.trim(), 10)) as [number, number]
      const expected = x > y ? '>' : x < y ? '<' : '='
      expect(correctLabel(q)).toBe(expected)
    }
  })

  it('比多少：选中较多的一行（或一样多）', () => {
    const gen = getGenerator('s1-00-compare')!
    for (let seed = 1; seed <= 300; seed++) {
      const q = gen(((seed % 3) + 1) as 1 | 2 | 3, createRng(seed))
      const rows = stemOf(q, 'compare-rows')!.rows
      const [ra, rb] = rows
      const expected = ra!.count > rb!.count ? ra!.icon : ra!.count < rb!.count ? rb!.icon : '一样多'
      expect(correctLabel(q)).toBe(expected)
    }
  })

  it('人民币：总额 == 各面额之和', () => {
    const gen = getGenerator('s2-07-money')!
    let checked = 0
    for (let seed = 1; seed <= 200; seed++) {
      const q = gen(((seed % 3) + 1) as 1 | 2 | 3, createRng(seed))
      const money = stemOf(q, 'money')
      if (!money) continue // 找零 / 换算题没有钱币图，另测
      checked++
      const total = money.pieces.reduce((s, p) => s + p.fen, 0)
      expect(correctLabel(q)).toBe(formatMoney(total))
    }
    expect(checked).toBeGreaterThan(20)
  })

  it('人民币：付钱找零题覆盖存在且答案落在选项中', () => {
    const gen = getGenerator('s2-07-money')!
    let changeSeen = 0
    let convertSeen = 0
    for (let seed = 1; seed <= 300; seed++) {
      const q = gen(((seed % 3) + 1) as 1 | 2 | 3, createRng(seed))
      const txt = zh(stemOf(q, 'text')!.text)
      if (/应找回多少/.test(txt)) changeSeen++
      if (/=\s*几[角元]/.test(txt)) convertSeen++
    }
    expect(changeSeen).toBeGreaterThan(10)
    expect(convertSeen).toBeGreaterThan(10)
  })

  it('图形：认名字与数图形都正确', () => {
    for (const kp of ['s1-03-solid-shapes', 's2-01-flat-shapes']) {
      const gen = getGenerator(kp)!
      for (let seed = 1; seed <= 200; seed++) {
        const q = gen(((seed % 3) + 1) as 1 | 2 | 3, createRng(seed))
        const single = stemOf(q, 'shape')
        if (single) {
          expect(correctLabel(q)).toBe(SHAPE_NAMES[single.shape])
          continue
        }
        const group = stemOf(q, 'shape-group')
        if (!group) continue // 拼组题另测
        const name = zh(stemOf(q, 'text')!.text).match(/有几个(.+?)？/)![1]!
        const kind = Object.keys(SHAPE_NAMES).find(
          (k) => SHAPE_NAMES[k as keyof typeof SHAPE_NAMES] === name,
        )
        const count = group.shapes.filter((s) => s === kind).length
        expect(Number(correctLabel(q))).toBe(count)
      }
    }
  })

  it('图形拼组：数格子 == 行×列；正方形(行=列)/长方形命名正确', () => {
    const gen = getGenerator('s2-01-flat-shapes')!
    let checked = 0
    for (let seed = 1; seed <= 300; seed++) {
      const q = gen(((seed % 3) + 1) as 1 | 2 | 3, createRng(seed))
      const tiles = stemOf(q, 'tiles')
      if (!tiles) continue
      checked++
      const label = correctLabel(q)
      if (/^\d+$/.test(label)) {
        expect(Number(label)).toBe(tiles.rows * tiles.cols)
      } else {
        const expected = tiles.rows === tiles.cols ? SHAPE_NAMES.square : SHAPE_NAMES.rectangle
        expect(label).toBe(expected)
      }
    }
    expect(checked).toBeGreaterThan(10)
  })

  it('位置：覆盖上下前后左右三个方位轴', () => {
    const gen = getGenerator('s1-00-position')!
    const axes = new Set<string>()
    for (let seed = 1; seed <= 200; seed++) {
      const q = gen(((seed % 3) + 1) as 1 | 2 | 3, createRng(seed))
      const line = stemOf(q, 'lineup')
      if (line?.axis) axes.add(line.axis)
    }
    expect(axes).toEqual(new Set(['lr', 'ud', 'fb']))
  })

  it('位置：第几题答案 == 高亮序号，方位题答案在队列中', () => {
    const gen = getGenerator('s1-00-position')!
    for (let seed = 1; seed <= 300; seed++) {
      const q = gen(((seed % 3) + 1) as 1 | 2 | 3, createRng(seed))
      const line = stemOf(q, 'lineup')!
      const label = correctLabel(q)
      if (/^\d+$/.test(label)) {
        // 「第几」题：答案是高亮项的序号（无论用键盘还是选项作答）
        expect(line.highlight).toBeDefined()
        expect(Number(label)).toBe(line.highlight! + 1)
      } else {
        expect(line.items).toContain(label)
      }
    }
  })

  it('整十数加减法：两个数或结果里至少有一个整十数，结果 0~100', () => {
    const gen = getGenerator('s2-03-tens-addsub')!
    for (let seed = 1; seed <= 300; seed++) {
      const q = gen(((seed % 3) + 1) as 1 | 2 | 3, createRng(seed))
      const [a, b] = evalOperands(stemOf(q, 'expr')!.expr)
      const v = Number(correctLabel(q))
      expect(a % 10 === 0 || b % 10 === 0 || v % 10 === 0).toBe(true)
      expect(v).toBeLessThanOrEqual(100)
    }
  })

  it('口算加法：第 1 档不进位、第 2 档进位；加数是一位数或整十数', () => {
    const gen = getGenerator('s2-04-oral-add')!
    for (let seed = 1; seed <= 300; seed++) {
      for (const d of [1, 2, 3] as const) {
        const q = gen(d, createRng(seed))
        const [a, b] = evalOperands(stemOf(q, 'expr')!.expr)
        expect(a).toBeGreaterThanOrEqual(10)
        expect(b < 10 || b % 10 === 0).toBe(true)
        expect(a + b).toBeLessThanOrEqual(100)
        if (d === 1) expect((a % 10) + (b % 10)).toBeLessThan(10)
        if (d === 2) expect((a % 10) + (b % 10)).toBeGreaterThanOrEqual(10)
      }
    }
  })

  it('口算减法：第 1 档不退位、第 2 档退位；第 3 档有连减应用题', () => {
    const gen = getGenerator('s2-04-oral-sub')!
    let chain = 0
    for (let seed = 1; seed <= 300; seed++) {
      for (const d of [1, 2, 3] as const) {
        const q = gen(d, createRng(seed))
        const expr = stemOf(q, 'expr')!.expr
        if (expr.split('-').length === 3) {
          chain++
          expect(d).toBe(3)
          continue
        }
        const [a, b] = evalOperands(expr)
        expect(a).toBeGreaterThanOrEqual(10)
        expect(b < 10 || b % 10 === 0).toBe(true)
        if (d === 1) expect(a % 10).toBeGreaterThanOrEqual(b % 10)
        if (d === 2) expect(a % 10).toBeLessThan(b % 10)
      }
    }
    expect(chain).toBeGreaterThan(20)
  })

  it('笔算加减法：两位数 ± 两位数、都带竖式；第 1 档不进 / 退位，第 2 档进 / 退位', () => {
    for (const [kp, op] of [
      ['s2-05-written-add', '+'],
      ['s2-05-written-sub', '-'],
    ] as const) {
      const gen = getGenerator(kp)!
      for (let seed = 1; seed <= 300; seed++) {
        for (const d of [1, 2, 3] as const) {
          const q = gen(d, createRng(seed))
          const v = stemOf(q, 'vertical')!
          const [a, b] = evalOperands(stemOf(q, 'expr')!.expr)
          expect(v).toEqual({ kind: 'vertical', a, op, b })
          expect(b).toBeGreaterThanOrEqual(10)
          const carry = op === '+' ? (a % 10) + (b % 10) >= 10 : a % 10 < b % 10
          if (d === 1) expect(carry).toBe(false)
          if (d === 2) expect(carry).toBe(true)
          expect(Number(correctLabel(q))).toBeLessThanOrEqual(100)
        }
      }
    }
  })

  it('数量间的加减关系：相差数 / 多几少几 / 连续两问 的答案正确', () => {
    for (const kp of ['s2-06-diff', 's2-06-more-less']) {
      const gen = getGenerator(kp)!
      for (let seed = 1; seed <= 300; seed++) {
        const q = gen(((seed % 3) + 1) as 1 | 2 | 3, createRng(seed))
        const text = zh(stemOf(q, 'text')!.text)
        const rows = stemOf(q, 'compare-rows')
        const v = Number(correctLabel(q))
        if (rows) {
          expect(v).toBe(rows.rows[0]!.count - rows.rows[1]!.count)
          continue
        }
        const nums = text.match(/\d+/g)!.map(Number)
        if (/多几个|少几个/.test(text)) expect(v).toBe(nums[0]! - nums[1]!)
        else if (/一共有几个/.test(text)) expect(v).toBe(nums[0]! * 2 + nums[1]!)
        else if (/多 \d+ 个/.test(text)) expect(v).toBe(nums[0]! + nums[1]!)
        else if (/少 \d+ 个/.test(text)) expect(v).toBe(nums[0]! - nums[1]!)
        else throw new Error(text)
      }
    }
  })
})

/** 解析 "a - b = ?" 形式的两个操作数 */
function evalOperands(expr: string): [number, number] {
  const t = expr.replace('= ?', '').trim().split(/\s+/)
  return [parseInt(t[0]!, 10), parseInt(t[2]!, 10)]
}
