import { describe, expect, it } from 'vitest'
import type { Question, StemPart } from '@/types/models'
import '@/content/math/grade1' // 副作用：注册生成器与词条
import { KNOWLEDGE_POINTS } from '@/content/math/grade1/curriculum'
import { buildSession, createRng, getGenerator, hasGenerator } from '@/engine'
import { checkAnswer } from '@/engine/answer'
import { SHAPE_NAMES, formatMoney } from '@/content/math/shared/labels'
import { cnChars, cnWords } from '@/content/math/grade1/cnum'
import { rubySegments, translate } from '@/engine/i18n'
import { questionSpeech } from '@/engine/speech'

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
  it('31 个知识点都有生成器；每个单元 1~4 个知识点', () => {
    expect(registered.length).toBe(KNOWLEDGE_POINTS.length)
    expect(registered.length).toBe(31)
    const perUnit = new Map<string, number>()
    for (const kp of KNOWLEDGE_POINTS) perUnit.set(kp.unitId, (perUnit.get(kp.unitId) ?? 0) + 1)
    for (const n of perUnit.values()) expect(n).toBeLessThanOrEqual(4)
  })

  it('标题照课本的小节名（按小节拆开的单元）', () => {
    const title = (id: string): string => KNOWLEDGE_POINTS.find((kp) => kp.id === id)!.title
    expect(title('s1-00-position')).toBe('前后左右')
    expect(title('s1-01-ordinal')).toBe('第几')
    expect(['s1-05-carry-add', 's1-05-add-876', 's1-05-add-5432'].map(title)).toEqual(['9 加几', '8、7、6 加几', '5、4、3、2 加几'])
    expect(['s2-02-borrow-sub', 's2-02-sub-876', 's2-02-sub-5432'].map(title)).toEqual(['十几减 9', '十几减 8、7、6', '十几减 5、4、3、2'])
    expect(['s2-03-num-100', 's2-03-compare-100', 's2-03-tens-addsub'].map(title)).toEqual(['数数、数的组成', '数的顺序、比较大小', '简单的加、减法'])
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
    it(`${kp.id} 一轮 8 题出得满，会话内题目签名不重复`, () => {
      for (let seed = 1; seed <= 30; seed++) {
        const qs = buildSession(kp.id, 8, { seed })
        expect(qs.length).toBe(8)
        expect(new Set(qs.map((q) => q.id)).size).toBe(qs.length)
      }
    })
  }
})

/** 一个知识点第 1 档出 n 道题（练习固定第 1 档：课本每个小节的核心内容都要在第 1 档出得到，G12） */
function tier1(kpId: string, n = 400): Question[] {
  const gen = getGenerator(kpId)!
  return Array.from({ length: n }, (_, i) => gen(1, createRng(i + 1)))
}
const textKey = (q: Question): string | undefined => {
  const t = stemOf(q, 'text')
  return t && typeof t.text === 'object' ? t.text.k : undefined
}
const exprOf = (q: Question): string | undefined => stemOf(q, 'expr')?.expr

describe('第 1 档出得到课本的核心内容（G12）', () => {
  it('进位加法三个小节：每节第 1 档出全这一节的全部算式，还有解决问题', () => {
    const want: Record<string, string[]> = {
      's1-05-carry-add': [2, 3, 4, 5, 6, 7, 8, 9].map((b) => `9 + ${b} = ?`),
      's1-05-add-876': [8, 7, 6].flatMap((a) => Array.from({ length: a - 1 }, (_, i) => `${a} + ${11 - a + i} = ?`)),
      's1-05-add-5432': [5, 4, 3, 2].flatMap((a) => Array.from({ length: a - 1 }, (_, i) => `${a} + ${11 - a + i} = ?`)),
    }
    for (const [kp, exprs] of Object.entries(want)) {
      const qs = tier1(kp)
      const seen = new Set(qs.map(exprOf))
      for (const e of exprs) expect(seen, `${kp} 缺 ${e}`).toContain(e)
      expect(qs.some((q) => /^q\.wp/.test(textKey(q) ?? ''))).toBe(true)
    }
  })

  it('退位减法三个小节：第 1 档出全这一节的算式，有想加算减和解决问题；没有 10 减几', () => {
    const subs: Record<string, number[]> = { 's2-02-borrow-sub': [9], 's2-02-sub-876': [8, 7, 6], 's2-02-sub-5432': [5, 4, 3, 2] }
    for (const [kp, list] of Object.entries(subs)) {
      const qs = tier1(kp)
      const seen = new Set(qs.map(exprOf))
      for (const s of list) for (let u = 1; u < s; u++) expect(seen, `${kp} 缺 ${10 + u} - ${s}`).toContain(`${10 + u} - ${s} = ?`)
      expect(qs.some((q) => textKey(q) === 'q.thinkAdd')).toBe(true)
      expect(qs.some((q) => textKey(q) === 'q.wpPart')).toBe(true)
      for (const q of qs) expect(exprOf(q) ?? '').not.toMatch(/^10 - /)
    }
  })

  it('5 以内的分与合第 1 档主要是 5 的分与合，没有加法算式；6~10 的分与合第 1 档 6~10 都有', () => {
    const five = tier1('s1-01-compose-5')
    const totals = (qs: Question[]) =>
      qs.map((q) => {
        const t = stemOf(q, 'text')!.text as { k: string; p: Record<string, number> }
        return t.k === 'q.composeOf' ? t.p.a! + t.p.b! : t.p.total!
      })
    const t5 = totals(five)
    expect(t5.filter((t) => t === 5).length / t5.length).toBeGreaterThan(0.25)
    for (const q of five) expect(exprOf(q)).toBeUndefined()
    expect(new Set(totals(tier1('s1-02-compose-10')))).toEqual(new Set([6, 7, 8, 9, 10]))
  })

  it('10 以内的加、减法第 1 档的和 / 被减数是 6~10（不是 6 以内），有解决问题', () => {
    const qs = tier1('s1-02-addsub-10')
    const tops = new Set<number>()
    for (const q of qs) {
      const e = exprOf(q)
      if (!e) continue
      const [a, b] = evalOperands(e)
      tops.add(e.includes('+') ? a + b : a)
    }
    for (const t of [7, 8, 9, 10]) expect(tops).toContain(t)
    expect(qs.some((q) => textKey(q) === 'q.wpTakeAway')).toBe(true)
    expect(qs.some((q) => stemOf(q, 'tenframe')?.taken)).toBe(true) // 减法的划掉图
  })

  it('简单的加、减法第 1 档有 10 + 几、十几 - 几、十几 - 10、十几 + 几、之间有几个', () => {
    const exprs = tier1('s1-04-simple-addsub').map(exprOf).filter((e): e is string => !!e)
    expect(exprs.some((e) => /^10 \+ /.test(e))).toBe(true)
    expect(exprs.some((e) => / - 10 = /.test(e))).toBe(true)
    expect(exprs.some((e) => /^1[1-8] \+ [1-8] = /.test(e))).toBe(true)
    expect(exprs.some((e) => { const [a, b] = evalOperands(e); return e.includes('-') && b < 10 && a - b > 10 })).toBe(true)
    expect(tier1('s1-04-simple-addsub').some((q) => textKey(q) === 'q.between')).toBe(true)
  })

  it('口算 / 笔算第 1 档：进位、退位、两位数 ± 两位数和装袋都出得到', () => {
    const add = tier1('s2-04-oral-add').map((q) => evalOperands(exprOf(q)!))
    expect(add.some(([a, b]) => a % 10 + (b % 10) >= 10)).toBe(true)
    expect(add.some(([a, b]) => a >= 10 && b >= 10 && a % 10 !== 0 && b % 10 !== 0)).toBe(true)
    const sub = tier1('s2-04-oral-sub')
    expect(sub.some((q) => /^q\.bag/.test(textKey(q) ?? ''))).toBe(true)
    const subOps = sub.map(exprOf).filter((e): e is string => !!e).map(evalOperands)
    expect(subOps.some(([a, b]) => a % 10 < b % 10)).toBe(true)
    expect(subOps.some(([, b]) => b >= 10 && b % 10 !== 0)).toBe(true)
    const wadd = tier1('s2-05-written-add').map((q) => evalOperands(exprOf(q)!))
    expect(wadd.some(([a, b]) => a % 10 + (b % 10) >= 10)).toBe(true)
    expect(wadd.some(([a, b]) => a % 10 + (b % 10) < 10)).toBe(true)
    const wsub = tier1('s2-05-written-sub').map((q) => evalOperands(exprOf(q)!))
    expect(wsub.some(([a, b]) => a % 10 < b % 10)).toBe(true)
    expect(wsub.some(([a]) => a % 10 === 0)).toBe(true) // 60 - 32
  })

  it('100 以内数的认识：第 1 档到 100，有读数写数、数位、接近几十、大得多 / 大一些', () => {
    const num = tier1('s2-03-num-100')
    const answers = num.map((q) => (q.answer.kind === 'number' ? q.answer.value : Number(correctLabel(q))))
    expect(answers).toContain(100)
    for (const k of ['q.writeNum', 'q.readNum', 'q.tensDigit', 'q.addOne']) expect(num.some((q) => textKey(q) === k), k).toBe(true)
    const cmp = tier1('s2-03-compare-100')
    for (const k of ['q.closer', 'q.muchBigger', 'q.after']) expect(cmp.some((q) => textKey(q) === k), k).toBe(true)
    const pairs = cmp.map(exprOf).filter((e): e is string => !!e?.includes('○')).map((e) => e.split(' ○ ').map(Number))
    expect(pairs.length).toBeGreaterThan(100)
    for (const [x, y] of pairs) {
      expect(x).toBeGreaterThanOrEqual(10)
      expect(y).toBeGreaterThanOrEqual(10)
    }
    expect(pairs.some(([x, y]) => Math.max(x!, y!) > 80)).toBe(true)
    expect(pairs.some(([x, y]) => Math.floor(x! / 10) === Math.floor(y! / 10))).toBe(true)
  })

  it('人民币第 1 档：认一认有 100 元、50 元和分币，一共多少钱有几角几分，有换一换', () => {
    const qs = tier1('s2-07-money')
    const single = qs.map((q) => stemOf(q, 'money')).filter((m) => m && m.pieces.length === 1).map((m) => m!.pieces[0]!.fen)
    for (const f of [10000, 5000, 2000, 5, 2, 1]) expect(single).toContain(f)
    expect(qs.some((q) => /角\d分$/.test(correctLabel(q)))).toBe(true)
    expect(qs.some((q) => /^q\.exchange/.test(textKey(q) ?? ''))).toBe(true)
    expect(qs.some((q) => /^q\.moneyJ2F|^q\.moneyF2J/.test(textKey(q) ?? ''))).toBe(true)
  })

  it('平面图形第 1 档：认名字、数一数、用哪个物体画、拼一拼、七巧板都有', () => {
    const qs = tier1('s2-01-flat-shapes')
    for (const k of ['q.whatShape', 'q.countShape', 'q.traceFrom', 'q.joinedShape', 'q.tangramPieces']) expect(qs.some((q) => textKey(q) === k), k).toBe(true)
  })
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
        const expr = stemOf(q, 'expr')?.expr
        if (!expr) continue // 解决问题
        const [a, b] = evalOperands(expr)
        total++
        if (a === 0 || b === 0 || (expr.includes('-') && a === b)) trivial++
      }
      expect(trivial).toBeGreaterThan(0)
      expect(trivial / total).toBeLessThan(0.3)
    }
  })

  it('减法的划掉图：格里 a 个、划掉 b 个，剩下的 = 答案', () => {
    let checked = 0
    for (const kp of ['s1-01-addsub-5', 's1-02-addsub-10']) {
      const gen = getGenerator(kp)!
      for (let seed = 1; seed <= 300; seed++) {
        const q = gen(1, createRng(seed))
        const frame = stemOf(q, 'tenframe')
        if (!frame) continue
        checked++
        const [a, b] = evalOperands(stemOf(q, 'expr')!.expr)
        expect(frame).toEqual({ kind: 'tenframe', filled: a, taken: b })
        expect(Number(correctLabel(q))).toBe(a - b)
        expect(zh(stemOf(q, 'text')!.text)).toContain('还剩')
      }
    }
    expect(checked).toBeGreaterThan(20)
  })

  it('10 以内的解决问题：一共有几个 = 两部分相加，还剩几个 = 总数减去拿走的', () => {
    let checked = 0
    for (let seed = 1; seed <= 300; seed++) {
      const q = getGenerator('s1-02-addsub-10')!(((seed % 3) + 1) as 1 | 2 | 3, createRng(seed))
      if (stemOf(q, 'expr')) continue
      checked++
      const text = zh(stemOf(q, 'text')!.text)
      const [x, y] = text.match(/\d+/g)!.map(Number) as [number, number]
      expect(Number(correctLabel(q))).toBe(/还剩/.test(text) ? x - y : x + y)
      expect(text).not.toContain('只') // 「数字 + 只」朗读会读错
    }
    expect(checked).toBeGreaterThan(30)
  })

  it('分与合：「T 分成 P 和几」= T - P，「P 和几组成 T」= T - P，「A 和 B 组成几」= A + B', () => {
    let checked = 0
    for (const kp of ['s1-01-compose-5', 's1-02-compose-10']) {
      const gen = getGenerator(kp)!
      for (let seed = 1; seed <= 200; seed++) {
        const q = gen(((seed % 3) + 1) as 1 | 2 | 3, createRng(seed))
        const text = zh(stemOf(q, 'text')!.text)
        const v = Number(correctLabel(q))
        let m = text.match(/^(\d+) 可以分成 (\d+) 和几/)
        if (m) expect(v).toBe(Number(m[1]) - Number(m[2]))
        else if ((m = text.match(/^(\d+) 和几组成 (\d+)/))) expect(v).toBe(Number(m[2]) - Number(m[1]))
        else if ((m = text.match(/^(\d+) 和 (\d+) 组成几/))) expect(v).toBe(Number(m[1]) + Number(m[2]))
        else throw new Error(text)
        checked++
      }
    }
    expect(checked).toBe(400)
  })

  it('退位减法：十几减几都要退位，算式 / 想加算减 / 解决问题的答案与讲解参数都对，减数在这一节里', () => {
    const subs: Record<string, number[]> = { 's2-02-borrow-sub': [9], 's2-02-sub-876': [8, 7, 6], 's2-02-sub-5432': [5, 4, 3, 2] }
    for (const [kp, list] of Object.entries(subs)) {
      const gen = getGenerator(kp)!
      for (let seed = 1; seed <= 300; seed++) {
        const q = gen(((seed % 3) + 1) as 1 | 2 | 3, createRng(seed))
        expect(q.explain?.kind).toBe('break-ten')
        if (q.explain?.kind !== 'break-ten') continue
        const { minuend: min, subtrahend: sub } = q.explain
        expect(list).toContain(sub)
        expect(min).toBeGreaterThanOrEqual(11)
        expect(min).toBeLessThanOrEqual(18)
        expect(min % 10).toBeLessThan(sub) // 需要退位
        expect(Number(correctLabel(q))).toBe(min - sub)
        const expr = stemOf(q, 'expr')?.expr
        if (expr?.includes('- ')) expect(evalOperands(expr)).toEqual([min, sub])
        else if (expr) expect(expr).toBe(`${sub} + ? = ${min}`)
        else {
          const nums = zh(stemOf(q, 'text')!.text).match(/\d+/g)!.map(Number)
          expect(nums).toContain(min)
          expect(nums).toContain(sub)
        }
      }
    }
  })

  it('进位加法的解决问题与填未知加数：领走了 a 个还剩 b 个 → a + b；a + ? = s → s - a', () => {
    let word = 0
    let miss = 0
    for (const kp of ['s1-05-carry-add', 's1-05-add-876', 's1-05-add-5432']) {
      const gen = getGenerator(kp)!
      for (let seed = 1; seed <= 300; seed++) {
        const q = gen(((seed % 3) + 1) as 1 | 2 | 3, createRng(seed))
        const expr = stemOf(q, 'expr')?.expr
        const m = expr?.match(/^(\d+) \+ \? = (\d+)$/)
        if (m) {
          miss++
          expect(Number(correctLabel(q))).toBe(Number(m[2]) - Number(m[1]))
        } else if (!expr && textKey(q)?.startsWith('q.wp')) {
          word++
          const [a, b] = zh(stemOf(q, 'text')!.text).match(/\d+/g)!.map(Number) as [number, number]
          expect(Number(correctLabel(q))).toBe(a + b)
          expect(a + b).toBeGreaterThanOrEqual(11)
        }
      }
    }
    expect(word).toBeGreaterThan(50)
    expect(miss).toBeGreaterThan(20)
  })

  it('比大小：○ 两边的数或算式，选中的符号正确；全册不再用 ⬜', () => {
    let checked = 0
    for (const kp of registered) {
      const gen = getGenerator(kp.id)!
      for (let seed = 1; seed <= 150; seed++) {
        const q = gen(((seed % 3) + 1) as 1 | 2 | 3, createRng(seed))
        const expr = stemOf(q, 'expr')?.expr
        if (!expr) continue
        expect(expr).not.toContain('⬜')
        if (!expr.includes('○')) continue
        checked++
        const [x, y] = expr.split(' ○ ').map((s) => evalExpr(s)) as [number, number]
        expect(correctLabel(q)).toBe(x > y ? '>' : x < y ? '<' : '=')
        expect(zh(stemOf(q, 'text')!.text)).toBe('比一比，填 >、< 或 =')
      }
    }
    expect(checked).toBeGreaterThan(200)
  })

  it('比多少：选中较多的一行（或同样多）', () => {
    const gen = getGenerator('s1-00-compare')!
    for (let seed = 1; seed <= 300; seed++) {
      const q = gen(((seed % 3) + 1) as 1 | 2 | 3, createRng(seed))
      const rows = stemOf(q, 'compare-rows')!.rows
      const [ra, rb] = rows
      const expected = ra!.count > rb!.count ? ra!.icon : ra!.count < rb!.count ? rb!.icon : '同样多'
      expect(correctLabel(q)).toBe(expected)
      expect(Math.max(ra!.count, rb!.count)).toBeLessThanOrEqual(6) // 数学游戏的数不超过 6
    }
  })

  it('数的认识：组成、反过来问组成、数位、前后的数、中间的数、接近几十、读数写数、添 1、数方块的答案都对', () => {
    let checked = 0
    for (const kp of ['s1-04-num-20', 's2-03-num-100', 's2-03-compare-100']) {
      const gen = getGenerator(kp)!
      for (let seed = 1; seed <= 300; seed++) {
        const q = gen(((seed % 3) + 1) as 1 | 2 | 3, createRng(seed))
        const t = stemOf(q, 'text')
        if (!t || typeof t.text === 'string') continue
        const p = t.text.p as Record<string, number> | undefined
        const v = correctLabel(q)
        checked++
        switch (t.text.k) {
          case 'q.composeTensOnes':
            expect(Number(v)).toBe(p!.tens! * 10 + p!.ones!)
            break
          case 'q.composeTens':
            expect(Number(v)).toBe(p!.tens! * 10)
            break
          case 'q.onesWith':
            expect(Number(v)).toBe(p!.n! - p!.tens! * 10)
            break
          case 'q.tensWith':
            expect(Number(v) * 10 + p!.ones!).toBe(p!.n)
            break
          case 'q.tensDigit':
            expect(Number(v)).toBe(Math.floor(p!.n! / 10) % 10)
            break
          case 'q.onesDigit':
            expect(Number(v)).toBe(p!.n! % 10)
            break
          case 'q.after':
          case 'q.more':
            expect(Number(v)).toBe(p!.n! + 1)
            break
          case 'q.before':
          case 'q.less':
            expect(Number(v)).toBe(p!.n! - 1)
            break
          case 'q.midNum':
            expect(Number(v) * 2).toBe(p!.a! + p!.b!)
            break
          case 'q.addOne':
            expect(Number(v)).toBe(p!.n! + 1)
            break
          case 'q.closer':
            expect(Number(v)).toBe(Math.abs(p!.n! - p!.lo!) < Math.abs(p!.hi! - p!.n!) ? p!.lo : p!.hi)
            break
          case 'q.writeNum':
            expect(cnChars(Number(v))).toBe(zh(t.text).replace('写作几？', ''))
            break
          case 'q.readNum':
            expect(v).toBe(cnChars(p!.n!))
            break
          case 'q.countBlocks': {
            const b = stemOf(q, 'blocks')!
            expect(Number(v)).toBe(b.tens * 10 + b.ones)
            break
          }
          case 'q.muchBigger':
          case 'q.muchSmaller': {
            const diff = Math.abs(p!.a! - p!.b!)
            expect(v).toBe(`${t.text.k === 'q.muchBigger' ? '大' : '小'}${diff >= 40 ? '得多' : '一些'}`)
            expect(diff >= 40 || diff <= 8).toBe(true)
            break
          }
          default:
            checked--
        }
      }
    }
    expect(checked).toBeGreaterThan(500)
  })

  it('100 以内数的汉字读法照课本：十几不读「一十」，整十不读「零」，100 读一百（注 yì）', () => {
    expect([7, 10, 14, 20, 38, 40, 99, 100].map(cnChars)).toEqual(['七', '十', '十四', '二十', '三十八', '四十', '九十九', '一百'])
    expect(rubySegments(cnWords('一百'), 'zh')).toEqual([
      { text: '一', py: 'yì' },
      { text: '百', py: 'bǎi' },
    ])
    expect(rubySegments(cnWords('十一'), 'zh').map((s) => s.py)).toEqual(['shí', 'yī'])
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

  it('人民币：付钱找零 / 换算 / 换一换都出，找零只有整元，换一换的答案对', () => {
    const gen = getGenerator('s2-07-money')!
    let changeSeen = 0
    let convertSeen = 0
    let exchangeSeen = 0
    const yuanOf = (s: string): number => {
      const m = s.match(/^(?:(\d+)元)?(?:(\d+)角)?(?:(\d+)分)?$/)!
      return Number(m[1] ?? 0) * 100 + Number(m[2] ?? 0) * 10 + Number(m[3] ?? 0)
    }
    for (let seed = 1; seed <= 300; seed++) {
      const q = gen(((seed % 3) + 1) as 1 | 2 | 3, createRng(seed))
      const t = stemOf(q, 'text')!.text
      const txt = zh(t)
      if (/应找回多少/.test(txt)) {
        changeSeen++
        expect(correctLabel(q)).toMatch(/^\d+元$/)
        const [price, pay] = [...txt.matchAll(/(\d+)元/g)].map((m) => Number(m[1]))
        expect(Number(correctLabel(q).replace('元', ''))).toBe(pay! - price!)
      }
      if (/=\s*几[角元分]/.test(txt)) convertSeen++
      if (typeof t === 'object' && t.k.startsWith('q.exchange')) {
        exchangeSeen++
        const p = t.p as unknown as Record<string, { k: string; p: { fen: number } }>
        const big = p.big!.p.fen
        const small = p.small!.p.fen
        const mid = p.mid?.p.fen ?? 0
        expect(Number(correctLabel(q))).toBe((big - mid) / small)
        expect(yuanOf(zh(p.big!))).toBe(big)
      }
    }
    expect(changeSeen).toBeGreaterThan(10)
    expect(convertSeen).toBeGreaterThan(10)
    expect(exchangeSeen).toBeGreaterThan(10)
  })

  it('人民币的写法：几元几角几分，是 0 的单位不写', () => {
    expect([650, 500, 50, 67, 2, 105, 10000].map(formatMoney)).toEqual(['6元5角', '5元', '5角', '6角7分', '2分', '1元5分', '100元'])
  })

  it('图形：认名字、数图形、用哪个物体画、拼一拼、七巧板的答案都对；平面图形的颜色不跟图形走', () => {
    const TRACE: Record<string, string> = { rectangle: '长方体', square: '正方体', circle: '圆柱' }
    const JOINED: Record<string, string> = { 'tri-para': '平行四边形', 'tri-square': '正方形', 'tri-rect': '长方形', 'tri-tri': '三角形', 'rect-rect': '长方形', 'rect-square': '正方形', 'sq2-rect': '长方形', 'sq4-square': '正方形' }
    const tonesOf = new Map<string, Set<number>>()
    for (const kp of ['s1-03-solid-shapes', 's2-01-flat-shapes']) {
      const gen = getGenerator(kp)!
      for (let seed = 1; seed <= 300; seed++) {
        const q = gen(((seed % 3) + 1) as 1 | 2 | 3, createRng(seed))
        const key = textKey(q)
        const single = stemOf(q, 'shape')
        if (single && single.tone !== undefined) tonesOf.set(single.shape, (tonesOf.get(single.shape) ?? new Set()).add(single.tone))
        if (key === 'q.whatShape') expect(correctLabel(q)).toBe(SHAPE_NAMES[single!.shape])
        else if (key === 'q.traceFrom') expect(correctLabel(q)).toBe(TRACE[single!.shape])
        else if (key === 'q.rollAnyWay') expect(correctLabel(q)).toBe('球')
        else if (key === 'q.countShape') {
          const group = stemOf(q, 'shape-group')!
          const name = zh(stemOf(q, 'text')!.text).match(/有几个(.+?)？/)![1]!
          const kind = Object.keys(SHAPE_NAMES).find((k) => SHAPE_NAMES[k as keyof typeof SHAPE_NAMES] === name)
          expect(Number(correctLabel(q))).toBe(group.shapes.filter((s) => s === kind).length)
        } else if (key === 'q.joinedShape') {
          expect(correctLabel(q)).toBe(JOINED[q.id.split(':join-')[1]!])
          expect(stemOf(q, 'geo')!.figs[0]!.items).toHaveLength(Number(zh(stemOf(q, 'text')!.text).match(/\d+/)![0]))
        } else if (key === 'q.tangramPieces') expect(Number(correctLabel(q))).toBe(7)
        else if (key === 'q.tangramCount') {
          const shape = zh(stemOf(q, 'text')!.text).match(/有几个(.+?)？/)![1]
          expect(Number(correctLabel(q))).toBe(shape === '三角形' ? 5 : 1)
        } else throw new Error(`没测到的图形题：${key}`)
      }
    }
    for (const s of ['square', 'rectangle', 'circle']) expect(tonesOf.get(s)!.size).toBeGreaterThan(2)
  })

  it('前后左右：只有前后、左右两个方向（数学游戏没有教上下）', () => {
    const gen = getGenerator('s1-00-position')!
    const axes = new Set<string>()
    for (let seed = 1; seed <= 200; seed++) {
      const q = gen(((seed % 3) + 1) as 1 | 2 | 3, createRng(seed))
      const line = stemOf(q, 'lineup')
      if (line?.axis) axes.add(line.axis)
      expect(zh(stemOf(q, 'text')!.text)).not.toMatch(/上|下/)
    }
    expect(axes).toEqual(new Set(['lr', 'fb']))
  })

  it('第几：排队排第几、前面 / 后面有几个、从左 / 右数第几个，5 个一排', () => {
    const gen = getGenerator('s1-01-ordinal')!
    const kinds = new Set<string>()
    for (let seed = 1; seed <= 300; seed++) {
      const q = gen(((seed % 3) + 1) as 1 | 2 | 3, createRng(seed))
      const line = stemOf(q, 'lineup')!
      expect(line.items).toHaveLength(5)
      const key = textKey(q)!
      kinds.add(key)
      const label = correctLabel(q)
      if (key === 'q.posAhead') expect(Number(label)).toBe(line.highlight)
      else if (key === 'q.posBehind') expect(Number(label)).toBe(4 - line.highlight!)
      else if (key === 'q.posWhich') expect(Number(label)).toBe(line.highlight! + 1)
      else expect(line.items).toContain(label)
    }
    expect(kinds).toEqual(new Set(['q.posWhich', 'q.posAhead', 'q.posBehind', 'q.posFrom']))
  })

  it('位置：「从哪边数第几个」用汉字（第一个，一注 yī），朗读里没有阿拉伯数字；英文界面是 number 1', () => {
    // 阿拉伯数字夹在中文句子里，合成出来是读数字的调子（「第1个」的 1 常读得像四声）
    const gen = getGenerator('s1-00-position')!
    const seen = new Set<string>()
    for (let seed = 1; seed <= 300; seed++) {
      const q = gen(((seed % 3) + 1) as 1 | 2 | 3, createRng(seed))
      const text = q.stem[0]!
      if (text.kind !== 'text' || typeof text.text === 'string' || text.text.k !== 'q.posFrom') continue
      const zh = translate(text.text, 'zh')
      const m = /第([一二三四五六])个是谁/.exec(zh)
      expect(m, zh).not.toBeNull()
      seen.add(m![1]!)
      expect(zh).not.toMatch(/\d/)
      for (const t of questionSpeech(q, 'zh')) expect(t).not.toMatch(/\d/)
      expect(translate(text.text, 'en')).toMatch(/who is number [1-6]\?$/)
      if (m![1] === '一') expect(rubySegments(text.text, 'zh')).toContainEqual({ text: '一', py: 'yī' })
    }
    expect(seen).toEqual(new Set(['一', '二', '三', '四', '五', '六']))
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

  it('口算加法：两位数 + 一位数 / 整十数 / 两位数，和不超过 100；两位数 + 两位数（都不是整十）不进位', () => {
    const gen = getGenerator('s2-04-oral-add')!
    for (let seed = 1; seed <= 300; seed++) {
      for (const d of [1, 2, 3] as const) {
        const q = gen(d, createRng(seed))
        const [a, b] = evalOperands(stemOf(q, 'expr')!.expr)
        expect(Math.max(a, b)).toBeGreaterThanOrEqual(10)
        expect(a + b).toBeLessThanOrEqual(100)
        if (a >= 10 && b >= 10 && a % 10 && b % 10) expect((a % 10) + (b % 10)).toBeLessThan(10)
      }
    }
  })

  it('口算减法：两位数 - 两位数（不是整十）不退位；装袋题与「连续减」的答案对', () => {
    const gen = getGenerator('s2-04-oral-sub')!
    let bags = 0
    for (let seed = 1; seed <= 300; seed++) {
      for (const d of [1, 2, 3] as const) {
        const q = gen(d, createRng(seed))
        const expr = stemOf(q, 'expr')?.expr
        if (!expr) {
          const t = stemOf(q, 'text')!.text as { k: string; p: Record<string, number> }
          const { n, k } = t.p
          if (t.k === 'q.repeatSub') expect(Number(correctLabel(q))).toBe(n! - k! * t.p.t!)
          else {
            bags++
            expect(n!).toBeLessThanOrEqual(50)
            expect(Number(correctLabel(q))).toBe(t.k === 'q.bagFull' ? Math.floor(n! / k!) : n! % k!)
            expect(n! % k!).toBeGreaterThan(0)
          }
          continue
        }
        const [a, b] = evalOperands(expr)
        expect(a).toBeGreaterThanOrEqual(10)
        expect(a - b).toBeGreaterThanOrEqual(0)
        if (b >= 10 && b % 10) expect(a % 10).toBeGreaterThanOrEqual(b % 10)
      }
    }
    expect(bags).toBeGreaterThan(50)
  })

  it('笔算加减法：都带竖式；和不超过 99，没有 100 减两位数', () => {
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
          expect(Math.max(a, b)).toBeGreaterThanOrEqual(10)
          if (op === '+') expect(a + b).toBeLessThanOrEqual(99)
          else {
            expect(a).toBeLessThan(100)
            expect(a - b).toBeGreaterThan(0)
          }
        }
      }
    }
  })

  it('数量间的加减关系：相差数 / 多几少几 / 连续两问（多几、少几）的答案正确', () => {
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
        else if (/多 \d+ 个.*一共有几个/.test(text)) expect(v).toBe(nums[0]! * 2 + nums[1]!)
        else if (/少 \d+ 个.*一共有几个/.test(text)) expect(v).toBe(nums[0]! * 2 - nums[1]!)
        else if (/多 \d+ 个/.test(text)) expect(v).toBe(nums[0]! + nums[1]!)
        else if (/少 \d+ 个/.test(text)) expect(v).toBe(nums[0]! - nums[1]!)
        else throw new Error(text)
      }
    }
  })

  it('数量间的加减关系：第 1 档就有连续两问（多几、少几都有），相差几的数到 30', () => {
    const qs = tier1('s2-06-more-less')
    expect(qs.some((q) => textKey(q) === 'q.moreThanTotal')).toBe(true)
    expect(qs.some((q) => textKey(q) === 'q.lessThanTotal')).toBe(true)
    const diffs = tier1('s2-06-diff').filter((q) => !stemOf(q, 'compare-rows'))
    expect(diffs.some((q) => Math.max(...zh(stemOf(q, 'text')!.text).match(/\d+/g)!.map(Number)) > 20)).toBe(true)
  })
})

/** 解析 "a - b = ?" 形式的两个操作数 */
function evalOperands(expr: string): [number, number] {
  const t = expr.replace('= ?', '').trim().split(/\s+/)
  return [parseInt(t[0]!, 10), parseInt(t[2]!, 10)]
}
