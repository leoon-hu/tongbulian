import { describe, expect, it } from 'vitest'
import type { LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade5' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'
import { ZH } from '../../lang/letters'
import { ADDSUB, AXB, AXBX, EQUALITY, LAWS, MULDIV } from '../letters'

// 五上「用字母表示数和数量关系」的专项检查：从题干的参数、算式、线段图、表、图反推答案；含有字母的式子按「代几组数都相等」判同一个式子，
// 关系式按题里的数量关系造几组数来判成立不成立；第 1 档有课本每个例题和做一做；写法照课本、朗读不踩坑。
const zh = (l: LStr): string => translate(l, 'zh')
const SEEDS = 150
const ALL = [ADDSUB, MULDIV, LAWS, EQUALITY, AXB, AXBX]

function each(kpId: string, fn: (q: Question, d: 1 | 2 | 3) => void, seeds = SEEDS): void {
  const gen = getGenerator(kpId)!
  for (let seed = 1; seed <= seeds; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
function stemsOf<K extends StemPart['kind']>(q: Question, kind: K): Extract<StemPart, { kind: K }>[] {
  return q.stem.filter((p) => p.kind === kind) as Extract<StemPart, { kind: K }>[]
}
type P = Record<string, number | string | { k: string; p?: P }>
const texts = (q: Question): { k: string; p: P }[] =>
  stemsOf(q, 'text').map((t) => (typeof t.text === 'string' ? { k: '', p: {} } : { k: t.text.k, p: (t.text.p ?? {}) as P }))
const exprs = (q: Question): string[] => stemsOf(q, 'expr').map((e) => e.expr)
const num = (p: P, k: string): number => p[k] as number
const str = (p: P, k: string): string => p[k] as string
const keyOf = (p: P, k: string): string => (p[k] as { k: string }).k
function correctLabel(q: Question): LStr {
  if (q.answer.kind === 'number') return String(q.answer.value)
  const id = q.answer.choiceId
  return q.choices!.find((c) => c.id === id)!.label
}
const correctText = (q: Question): string => zh(correctLabel(q))
const correctKey = (q: Question): string => {
  const l = correctLabel(q)
  return typeof l === 'string' ? l : l.k
}
const answer = (q: Question): number => Number(correctText(q))
const wrongLabels = (q: Question): LStr[] => (q.choices ?? []).filter((c) => q.answer.kind === 'choice' && c.id !== q.answer.choiceId).map((c) => c.label)
const wrongTexts = (q: Question): string[] => wrongLabels(q).map(zh)
const close = (a: number, b: number): boolean => Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(a), Math.abs(b))

// ── 含有字母的式子：照课本的写法换成 JS 算（省略的乘号补回来，² 是平方，· × 是乘，÷ 是除）──
function js(e: string): string {
  let s = e
    .replace(/\s*\(c\s*≠\s*0\)$/, '')
    .replace(/\s+/g, '')
    .replace(/[×·]/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
  s = s.replace(/([0-9a-zA-Z)])(?=[a-zA-Z(])/g, '$1*')
  return s.replace(/\^/g, '**')
}
function ev(e: string, vars: Record<string, number>): number {
  const src = js(e).replace(/[a-zA-Z]/g, (ch) => {
    if (!(ch in vars)) throw new Error(`式子「${e}」里的 ${ch} 没有值`)
    return `(${vars[ch]})`
  })
  expect(src, e).toMatch(/^[\d.+\-*/()]+$/)
  return new Function(`return (${src})`)() as number
}
/** 给式子里每个字母一个值（几组，值互不相同、有非整数，免得碰巧相等） */
const LETTER_SETS: ((ch: string) => number)[] = [
  (ch) => ((ch.charCodeAt(0) * 7) % 13) + 2,
  (ch) => ((ch.charCodeAt(0) * 3) % 11) + 1.5,
  (ch) => ((ch.charCodeAt(0) * 5) % 17) + 0.25,
]
const varsFor = (set: (ch: string) => number): Record<string, number> => {
  const v: Record<string, number> = {}
  for (const ch of 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ') v[ch] = set(ch)
  return v
}
/** 两个式子是不是同一个（代几组数都相等） */
const sameExpr = (a: string, b: string): boolean => LETTER_SETS.every((s) => close(ev(a, varsFor(s)), ev(b, varsFor(s))))
/** 等式（a = b = …）在这组数下成不成立 */
const holds = (eq: string, vars: Record<string, number>): boolean => {
  const sides = eq.replace(/\s*\(c\s*≠\s*0\)$/, '').split(' = ').map((s) => ev(s, vars))
  return sides.every((x) => close(x, sides[0]!))
}
/** 选式子的题：正确项和 want 是同一个式子，干扰项都不是 */
function exprIs(q: Question, want: string): void {
  expect(sameExpr(correctText(q), want), `${q.id}：${correctText(q)} 应该是 ${want}`).toBe(true)
  for (const w of wrongTexts(q)) expect(sameExpr(w, want), `${q.id}：干扰项 ${w} 和 ${want} 一样`).toBe(false)
}
/** 关系式的题：按题里的数量关系造几组数（sample），正确项每组都成立，干扰项至少有一组不成立 */
function relIs(q: Question, sample: (i: number) => Record<string, number>, lead?: string): void {
  const sets = Array.from({ length: 6 }, (_, i) => sample(i))
  const c = correctText(q)
  for (const v of sets) expect(holds(c, v), `${q.id}：${c} 不成立`).toBe(true)
  if (lead) expect(c.startsWith(`${lead} = `), `${q.id}：${c} 要写成「${lead} = …」`).toBe(true)
  for (const w of wrongTexts(q)) expect(sets.some((v) => !holds(w, v)), `${q.id}：干扰项 ${w} 也成立`).toBe(true)
}
/** 求含有一个未知字母的等式：线性的，取 0 和 1 两点解出来 */
function solveFor(eq: string, known: Record<string, number>, unknown: string): number {
  const [l, r] = eq.split(' = ')
  const g = (t: number): number => ev(l!, { ...known, [unknown]: t }) - ev(r!, { ...known, [unknown]: t })
  const z = -g(0) / (g(1) - g(0))
  expect(Math.abs(g(z)), `${eq} 不是 ${unknown} 的一次等式`).toBeLessThan(1e-6)
  return z
}
/** 算式里不含字母、不是「?」的那几段，都等于答案（「b = a + 25 = 11 + 25 = ?」的「11 + 25」） */
function chainOk(q: Question, e: string, ans: number): void {
  for (const seg of e.split(' = ').slice(1)) {
    if (seg === '?' || /[a-zA-Z]/.test(seg)) continue
    expect(close(ev(seg, {}), ans), `${q.id}：${e} 的 ${seg} ≠ ${ans}`).toBe(true)
  }
}

/** 课本的运算律字母式（这本课本的分配律是 a × (b + c) = a × b + a × c） */
const LAW_FORM: Record<string, string> = {
  'm5.let.law.addComm': 'a + b = b + a',
  'm5.let.law.addAssoc': '(a + b) + c = a + (b + c)',
  'm5.let.law.mulComm': 'a × b = b × a',
  'm5.let.law.mulAssoc': '(a × b) × c = a × (b × c)',
  'm5.let.law.distrib': 'a × (b + c) = a × b + a × c',
}
/** 省略乘号的写法：数字乘到一起写在前面、1 不写、字母照原来的次序连写，两个相同的字母写成平方 */
function omitted(e: string): string {
  const fs = e.split(' × ')
  const coef = fs.filter((f) => /^\d+$/.test(f)).reduce((s, f) => s * Number(f), 1)
  const lets = fs.filter((f) => /^[a-z]$/.test(f))
  const body = lets.length === 2 && lets[0] === lets[1] ? `${lets[0]}²` : lets.join('')
  return `${coef === 1 ? '' : coef}${body}`
}
/** 做一做 1 的数列 */
const SEQ: Record<string, { f: (n: number) => number; form?: string }> = {
  '1, 2, 3, 4': { f: (n) => n },
  '2, 4, 6, 8': { f: (n) => 2 * n, form: '2n' },
  '1, 3, 5, 7': { f: (n) => 2 * n - 1, form: '2n - 1' },
  '1, 4, 9, 16': { f: (n) => n * n, form: 'n²' },
  '3, 6, 9, 12': { f: (n) => 3 * n, form: '3n' },
  '5, 9, 13, 17': { f: (n) => 4 * n + 1, form: '4n + 1' },
}
const ORD: Record<string, number> = { 'm5.let.ord.4': 4, 'm5.let.ord.5': 5, 'm5.let.ord.6': 6, 'm5.let.ord.7': 7, 'm5.let.ord.8': 8, 'm5.let.ord.9': 9, 'm5.let.ord.10': 10, 'm5.let.ord.15': 15 }
const POLY: Record<string, number> = { 'm5.let.poly.5': 5, 'm5.let.poly.6': 6, 'm5.let.poly.7': 7, 'm5.let.poly.8': 8, 'm5.let.poly.9': 9, 'm5.let.poly.10': 10, 'm5.let.poly.12': 12 }
const rnd = (i: number, lo: number, hi: number): number => lo + ((i * 7919 + 13) % (hi - lo + 1))

/** 选式子的题：最后一句的词条 → 正确的式子 */
const EXPR: Record<string, (p: P, q: Question) => string> = {
  'm5.let.as.age': (p) => `a + ${num(p, 'k')}`,
  'm5.let.as.ageRev': (p) => `b - ${num(p, 'k')}`,
  'm5.let.as.saleMore': (p) => `m + ${num(p, 'k')}`,
  'm5.let.as.saleLess': (p) => `m - ${num(p, 'k')}`,
  'm5.let.as.saleTotal': (p) => `${num(p, 't')} - m`,
  'm5.let.as.lineToSchool': (_, q) => `${stemsOf(q, 'part-line')[0]!.parts[0]!.label} + a`,
  'm5.let.as.lineHomeStore': () => 'a + b',
  'm5.let.as.lineMore': (_, q) => `a - ${stemsOf(q, 'part-line')[0]!.parts[0]!.label}`,
  'm5.let.as.bank': (p) => `n + ${num(p, 'k')}`,
  'm5.let.as.bus': (p) => `a - ${num(p, 'k')}`,
  'm5.let.as.temp': (p) => `a + ${num(p, 'k')}`,
  'm5.let.as.cls': (p) => `${num(p, 't')} - b`,
  'm5.let.as.weight': () => 'a - 105',
  'm5.let.as.height': () => 'a + 3',
  'm5.let.as.night': () => 'd - 2',
  'm5.let.as.ball': (p) => `${num(p, 'y')} + m`,
  'm5.let.as.chain': (p) => `m + ${num(p, 'k')} - ${num(p, 'j')}`,
  'm5.let.md.moon': () => '6m',
  'm5.let.md.stripX': () => '3x',
  'm5.let.md.fish': (p) => `${num(p, 'k')}b`,
  'm5.let.md.dumpling': (p) => `m ÷ ${num(p, 'p')}`,
  'm5.let.md.three': () => '3c',
  'm5.let.md.shuttle': (p) => `d ÷ ${num(p, 'k')}`,
  'm5.let.md.bone': () => '0.18b',
  'm5.let.md.power': (p) => `c ÷ ${num(p, 'w')}`,
  'm5.let.lw.partAll': () => '(a + b)c',
  'm5.let.lw.sqAll': () => '(a + b)²',
  'm5.let.ab.deskM': (_, q) => (texts(q)[0]!.k === 'm5.let.ab.desk1' ? '2 + 2m' : '4m + 2'),
  'm5.let.ab.discN': () => '2n',
  'm5.let.ab.cubeN': () => '4n + 1',
  'm5.let.ab.chairs': (p) => `${num(p, 'p')} + ${num(p, 'k')}m`,
  'm5.let.ab.diagN': () => 'n - 3',
  'm5.let.ab.hundredAll': () => '2a + 11',
  'm5.let.ab.stoneN': () => '(n + 1)(n + 2)',
  'm5.let.bx.factor': (_, q) => exprs(q)[0]!,
  'm5.let.lw.equal': (_, q) => exprs(q)[0]!,
  'm5.let.bx.courierSum': (_, q) => `${num(texts(q)[0]!.p, 'p') + num(texts(q)[0]!.p, 'q')}x`,
  'm5.let.bx.courierDiff': (_, q) => `${num(texts(q)[0]!.p, 'p') - num(texts(q)[0]!.p, 'q')}x`,
  'm5.let.bx.curlingA': () => 'a(a - 1) ÷ 2',
  'm5.let.bx.calc': (_, q) => exprs(q)[0]!.replace(/ = \?$/, ''),
  'm5.let.bx.meetSum': (_, q) => `${num(texts(q)[0]!.p, 'p') + num(texts(q)[0]!.p, 'q')}x`,
  'm5.let.bx.meetDiff': (_, q) => `${num(texts(q)[0]!.p, 'q') - num(texts(q)[0]!.p, 'p')}x`,
  'm5.let.bx.cruiseFrom': () => '36t',
  'm5.let.bx.cruiseTo': () => '648 - 36t',
}

/** 关系式的题：最后一句的词条 → [按题意造一组数, 等号左边该是哪个字母（不限就不填）] */
const REL: Record<string, (p: P, q: Question) => [(i: number) => Record<string, number>, string?]> = {
  'm5.let.as.ageRel': (p) => [(i) => ({ a: rnd(i, 1, 40), b: rnd(i, 1, 40) + num(p, 'k') })],
  'm5.let.as.ballRel': (p) => [(i) => ({ m: rnd(i, 1, 30), n: rnd(i, 1, 30) + num(p, 'y') })],
  'm5.let.md.moonRel': () => [(i) => ({ m: rnd(i, 1, 50), n: 6 * rnd(i, 1, 50) })],
  'm5.let.md.price': (p) => [(i) => ({ a: rnd(i, 2, 9), n: rnd(i + 3, 2, 9), c: rnd(i, 2, 9) * rnd(i + 3, 2, 9) }), str(p, 'y')],
  'm5.let.lw.speed': (p) => [(i) => ({ v: rnd(i, 2, 9), t: rnd(i + 2, 2, 9), s: rnd(i, 2, 9) * rnd(i + 2, 2, 9) }), str(p, 'y')],
  'm5.let.eq.typeRel': () => [(i) => ({ a: rnd(i, 20, 60), t: rnd(i + 5, 2, 30), c: rnd(i, 20, 60) * rnd(i + 5, 2, 30) })],
  'm5.let.ab.deskRel': (_, q) => {
    const side = texts(q)[0]!.k === 'm5.let.ab.desk1' ? 1 : 2
    return [(i) => ({ m: rnd(i, 1, 30), n: 2 * side * rnd(i, 1, 30) + 2 }), 'n']
  },
  'm5.let.bx.train': (p) => [(i) => ({ a: rnd(i, 1, 5), b: rnd(i + 1, 1, 5), s: num(p, 'v') * (rnd(i, 1, 5) + rnd(i + 1, 1, 5)) }), 's'],
  'm5.let.bx.tunnelS': (_, q) => {
    const t = num(texts(q)[0]!.p, 't')
    return [(i) => ({ a: rnd(i, 5, 15), b: rnd(i + 2, 5, 15), s: t * (rnd(i, 5, 15) + rnd(i + 2, 5, 15)) }), 's']
  },
  'm5.let.bx.truckRel': () => [(i) => ({ a: 100 * rnd(i, 1, 9), b: 36 * rnd(i, 1, 9) + 200 })],
  'm5.let.bx.tempRel': () => [(i) => ({ C: 5 * rnd(i, 0, 8), F: 9 * rnd(i, 0, 8) + 32 })],
}

/** 数值题：最后一句的词条 → 答案 */
const NUM: Record<string, (p: P, q: Question) => number> = {
  'm5.let.md.stripDec': (p) => 3 * num(p, 'l'),
  'm5.let.lw.sqCv': (p) => 4 * num(p, 'a'),
  'm5.let.lw.sqSv': (p) => num(p, 'a') ** 2,
  'm5.let.lw.rectCv': (p) => 2 * (num(p, 'a') + num(p, 'b')),
  'm5.let.lw.rectSv': (p) => num(p, 'a') * num(p, 'b'),
  'm5.let.lw.speedV': (p) => num(p, 'v') * num(p, 't'),
  'm5.let.md.sqEq': () => 4,
  'm5.let.eq.zero': () => 0,
  'm5.let.eq.findAdd': (p) => num(p, 'b') - num(p, 'k'),
  'm5.let.eq.findSub': (p) => num(p, 'b') + num(p, 'k'),
  'm5.let.eq.findMul': (p) => num(p, 'n') / num(p, 'k'),
  'm5.let.eq.findDiv': (p) => num(p, 'n') * num(p, 'k'),
  'm5.let.eq.typeVal': (p) => num(p, 'c') / num(p, 'a'),
  'm5.let.ab.deskK': (p, q) => (texts(q)[0]!.k === 'm5.let.ab.desk1' ? 2 : 4) * num(p, 'k') + 2,
  'm5.let.ab.discRows': (p) => num(p, 'k') / 2,
  'm5.let.ab.discNth': (p) => 2 * ORD[keyOf(p, 'nth')]!,
  'm5.let.ab.cubeK': (p) => 4 * num(p, 'k') + 1,
  'm5.let.ab.chairsV': (p) => num(p, 'p') + num(p, 'k') * num(p, 'm'),
  'm5.let.ab.diagK': (p) => POLY[keyOf(p, 'poly')]! - 3,
  'm5.let.ab.diagAll': (p) => (POLY[keyOf(p, 'poly')]! * (POLY[keyOf(p, 'poly')]! - 3)) / 2,
  'm5.let.ab.stoneBlack': (p) => ((ORD[keyOf(p, 'nth')]! + 1) * (ORD[keyOf(p, 'nth')]! + 2)) / 2,
  'm5.let.ab.stoneAll': (p) => (ORD[keyOf(p, 'nth')]! + 1) * (ORD[keyOf(p, 'nth')]! + 2),
  'm5.let.ab.sum100': () => 5050,
  'm5.let.bx.courierVal': (p, q) => (num(texts(q)[0]!.p, 'p') - num(texts(q)[0]!.p, 'q')) * num(p, 'x'),
  'm5.let.bx.tunnelV': (p, q) => num(texts(q)[0]!.p, 't') * (num(p, 'a') + num(p, 'b')),
  'm5.let.bx.curling': (p) => (num(p, 'n') * (num(p, 'n') - 1)) / 2,
  'm5.let.bx.cruiseFromV': (p) => 36 * num(p, 't'),
  'm5.let.bx.cruiseToV': (p) => 648 - 36 * num(p, 't'),
  'm5.let.bx.truckV': (p) => 0.36 * num(p, 'a') + 200,
  'm5.let.bx.tempF': (p) => 1.8 * num(p, 'c') + 32,
  'm5.let.bx.tempC': (p) => (num(p, 'f') - 32) / 1.8,
}

/** 认出题型并核对答案；认不出返回 false */
function check(q: Question): boolean {
  const ts = texts(q)
  const last = ts[ts.length - 1]!
  const k = last.k
  const p = last.p
  const es = exprs(q)
  if (EXPR[k]) {
    exprIs(q, EXPR[k]!(p, q))
    return true
  }
  if (REL[k]) {
    const [sample, lead] = REL[k]!(p, q)
    relIs(q, sample, lead)
    return true
  }
  if (NUM[k]) {
    const v = NUM[k]!(p, q)
    expect(close(answer(q), v), `${q.id}：${answer(q)} 应该是 ${v}`).toBe(true)
    for (const w of wrongTexts(q)) expect(close(Number(w), v), `${q.id}：干扰项 ${w} 也对`).toBe(false)
    for (const e of es) chainOk(q, e, v)
    return true
  }
  if (k === 'm5.let.when1' || k === 'm5.let.when2') {
    // 当 x = u（y = v）时 z 是多少：公式是算式的第一段等式
    const known: Record<string, number> = { [str(p, 'x')]: num(p, 'u') }
    if (k === 'm5.let.when2') known[str(p, 'y')] = num(p, 'v')
    const unknown = str(p, k === 'm5.let.when1' ? 'y' : 'z')
    const [l, r] = es[0]!.split(' = ')
    const v0 = solveFor(`${l} = ${r}`, known, unknown)
    const v = Math.round(v0)
    expect(close(v0, v) && v >= 0, `${q.id}：${v0}`).toBe(true)
    expect(answer(q), q.id).toBe(v)
    chainOk(q, es[0]!, v)
    return true
  }
  if (k === 'm5.let.findVal' || k === 'm5.let.findVal2') {
    const vars: Record<string, number> = { [str(p, 'x')]: num(p, 'u') }
    if (k === 'm5.let.findVal2') vars[str(p, 'y')] = num(p, 'v')
    const v = ev(str(p, 'e'), vars)
    expect(close(answer(q), v), `${q.id}：${answer(q)} 应该是 ${v}`).toBe(true)
    for (const w of wrongTexts(q)) expect(close(Number(w), v), q.id).toBe(false)
    return true
  }
  if (k === 'm5.let.as.can') {
    // 小红的年龄可以是 6–12，不可能是 120、150、200
    expect(correctKey(q), q.id).toBe(num(p, 'v') <= 15 ? 'm5.let.right' : 'm5.let.wrong')
    return true
  }
  if (k === 'm5.let.mean.q') {
    const e = str(p, 'e')
    const kind = e.includes('+') ? 'add' : e.includes('-') ? 'sub' : e.includes('÷') ? 'div' : 'mul'
    expect(correctKey(q), q.id).toBe(`m5.let.mean.${kind}`)
    expect((correctLabel(q) as { p: P }).p.n, q.id).toBe(Number(e.match(/\d+/)![0]))
    return true
  }
  if (k === 'm5.let.md.omit') {
    const e = str(p, 'e')
    expect(correctText(q), q.id).toBe(`${e} = ${omitted(e)}`)
    for (const w of wrongTexts(q)) expect(w, q.id).not.toBe(`${e} = ${omitted(e)}`)
    return true
  }
  if (k === 'm5.let.md.means') {
    const e = str(p, 'e')
    expect(sameExpr(correctText(q), e), q.id).toBe(true)
    expect(correctText(q), q.id).toMatch(/×/)
    for (const w of wrongTexts(q)) expect(sameExpr(w, e), `${q.id}：${w}`).toBe(false)
    return true
  }
  if (k === 'm5.let.md.jFront' || k === 'm5.let.md.jOne' || k === 'm5.let.md.jDot') {
    expect(correctKey(q), q.id).toBe('m5.let.right')
    return true
  }
  if (k === 'm5.let.md.jWrite') {
    expect(correctKey(q), q.id).toBe(str(p, 'w') === omitted(str(p, 'e')) ? 'm5.let.right' : 'm5.let.wrong')
    return true
  }
  if (k === 'm5.let.md.jSq2a') {
    const a = num(p, 'a')
    expect(correctKey(q), q.id).toBe(a * a === 2 * a ? 'm5.let.right' : 'm5.let.wrong')
    return true
  }
  if (k === 'm5.let.md.strip') {
    // 宽 3 厘米：面积 = 3 × 长度，缺的那一格是答案
    const [lens, areas] = stemsOf(q, 'stat-table')[0]!.rows
    let nulls = 0
    lens!.slice(1).forEach((l, i) => {
      const a = areas![i + 1]
      if (a === null) {
        nulls++
        expect(answer(q), q.id).toBe(3 * (l as number))
      } else expect(a, q.id).toBe(3 * (l as number))
    })
    expect(nulls, q.id).toBe(1)
    return true
  }
  if (k === 'm5.let.lw.letter') {
    const want = LAW_FORM[keyOf(p, 'law')]!
    expect(correctText(q), q.id).toBe(want)
    for (const w of wrongTexts(q)) expect(w, q.id).not.toBe(want)
    return true
  }
  if (k === 'm5.let.lw.which') {
    expect(LAW_FORM[correctKey(q)], q.id).toBe(es[0])
    return true
  }
  if (k === 'm5.let.lw.sqC' || k === 'm5.let.lw.sqS' || k === 'm5.let.lw.rectC' || k === 'm5.let.lw.rectS') {
    // 选项写成「C = …」「S = …」：等号右边和公式是同一个式子
    const want = { 'm5.let.lw.sqC': '4a', 'm5.let.lw.sqS': 'a²', 'm5.let.lw.rectC': '2(a + b)', 'm5.let.lw.rectS': 'ab' }[k]
    const lead = k.endsWith('C') ? 'C' : 'S'
    const rhs = (s: string): string => {
      expect(s.startsWith(`${lead} = `), `${q.id}：${s}`).toBe(true)
      return s.slice(lead.length + 3)
    }
    expect(sameExpr(rhs(correctText(q)), want), q.id).toBe(true)
    for (const w of wrongTexts(q)) expect(sameExpr(rhs(w), want), `${q.id}：${w}`).toBe(false)
    return true
  }
  if (k === 'm5.let.lw.partOf') {
    expect(correctKey(q), q.id).toBe(str(p, 'e') === 'ac' ? 'm5.let.lw.part.left' : 'm5.let.lw.part.right')
    return true
  }
  if (k === 'm5.let.lw.sqPart') {
    expect(correctKey(q), q.id).toBe(str(p, 'e') === 'a²' ? 'm5.let.lw.sq.big' : 'm5.let.lw.sq.small')
    return true
  }
  if (k === 'm5.let.eq.prop') {
    // a = b 时一定成立：取几组 a = b（c 不是 0），正确项都成立，干扰项至少一组不成立
    const sets = [3, 7, 11.5].flatMap((a) => [2, 5, 0.5].map((c) => ({ a, b: a, c, m: c })))
    for (const v of sets) expect(holds(correctText(q), v), `${q.id}：${correctText(q)}`).toBe(true)
    for (const w of wrongTexts(q)) expect(sets.some((v) => !holds(w, v)), `${q.id}：${w}`).toBe(true)
    return true
  }
  if (k === 'm5.let.eq.fill') {
    // a = b 时把答案填进「?」等式成立，填别的数不成立
    const e = es[0]!
    const a = answer(q)
    expect(holds(e.replace('?', String(a)), { a: 12, b: 12 }), q.id).toBe(true)
    expect(holds(e.replace('?', String(a + 1)), { a: 12, b: 12 }), q.id).toBe(false)
    for (const w of wrongTexts(q)) expect(holds(e.replace('?', w), { a: 12, b: 12 }), `${q.id}：${w}`).toBe(false)
    return true
  }
  if (k === 'm5.let.eq.solve') {
    // 第一个算式是只有一个字母的等式，解出来就是答案
    const e = es[0]!
    const letter = e.match(/[a-z]/)![0]
    const v = solveFor(e, {}, letter)
    expect(close(answer(q), v), `${q.id}：${answer(q)} 应该是 ${v}`).toBe(true)
    for (const w of wrongTexts(q)) expect(close(Number(w), v), q.id).toBe(false)
    if (es[1]) expect(es[1], q.id).toBe(`${letter} = ?`)
    return true
  }
  if (k === 'm5.let.eq.step') {
    // 两边同时做的是和字母那边相反的运算，做的数就是那个数
    const e = es[0]!
    const c = correctLabel(q) as { k: string; p: P }
    const m = /^a \+ (\d+) =/.exec(e) ?? /^a - (\d+) =/.exec(e) ?? /^(\d+)a =/.exec(e) ?? /^a ÷ (\d+) =/.exec(e)
    const want = e.startsWith('a + ') ? 'sub' : e.startsWith('a - ') ? 'add' : e.startsWith('a ÷ ') ? 'mul' : 'div'
    expect(c.k, q.id).toBe(`m5.let.eq.op.${want}`)
    expect(c.p.k, q.id).toBe(Number(m![1]))
    return true
  }
  if (k === 'm5.let.eq.lineRel' || k === 'm5.let.eq.lineVal') {
    // 线段图：下面的总数 = 上面两段的和
    const line = stemsOf(q, 'part-line')[0]!
    const eq = `${line.total} = ${line.parts.map((x) => x.label).join(' + ')}`
    if (k === 'm5.let.eq.lineRel') {
      const sample = (i: number): Record<string, number> => {
        const known: Record<string, number> = { n: rnd(i, 30, 60) }
        const unknown = 'm'
        return { ...known, [unknown]: solveFor(eq, known, unknown) }
      }
      relIs(q, sample)
    } else {
      const v = solveFor(eq, { n: num(p, 'n') }, 'm')
      expect(v >= 0, q.id).toBe(true)
      expect(close(answer(q), v), q.id).toBe(true)
    }
    return true
  }
  if (k === 'm5.let.eq.jAddSub' || k === 'm5.let.eq.jZero') {
    expect(correctKey(q), q.id).toBe('m5.let.wrong')
    return true
  }
  if (k === 'm5.let.eq.jBack' || k === 'm5.let.eq.jMul') {
    expect(correctKey(q), q.id).toBe('m5.let.right')
    return true
  }
  if (k === 'm5.let.ab.deskTable') {
    const side = ts[0]!.k === 'm5.let.ab.desk1' ? 1 : 2
    const [desks, seats] = stemsOf(q, 'stat-table')[0]!.rows
    let nulls = 0
    desks!.slice(1).forEach((m, i) => {
      const s = seats![i + 1]
      const want = 2 * side * (m as number) + 2
      if (s === null) {
        nulls++
        expect(answer(q), q.id).toBe(want)
      } else expect(s, q.id).toBe(want)
    })
    expect(nulls, q.id).toBe(1)
    return true
  }
  if (k === 'm5.let.ab.seqNext' || k === 'm5.let.ab.seqNth' || k === 'm5.let.ab.seqN') {
    const list = es[0]!.replace(/, (\?|…)$/, '')
    const s = SEQ[list]
    expect(s, `${q.id}：${list}`).toBeDefined()
    // 写出来的前四个数合规律
    list.split(', ').forEach((x, i) => expect(Number(x), q.id).toBe(s!.f(i + 1)))
    if (k === 'm5.let.ab.seqNext') expect(answer(q), q.id).toBe(s!.f(5))
    else if (k === 'm5.let.ab.seqNth') expect(answer(q), q.id).toBe(s!.f(ORD[keyOf(p, 'nth')]!))
    else exprIs(q, s!.form!)
    return true
  }
  if (k === 'm5.let.ab.hundredSum' || k === 'm5.let.ab.hundredPos') {
    // 百数表框出的「田」字：左上 x、右上 x + 1、左下 x + 10、右下 x + 11，都在表里
    const chart = stemsOf(q, 'hundred-chart')[0]!
    const [x, ...rest] = chart.boxed!
    expect(rest, q.id).toEqual([x! + 1, x! + 10, x! + 11])
    expect(x! % 10, q.id).not.toBe(0)
    expect(x! >= chart.start && x! + 11 <= chart.start + chart.count - 1, q.id).toBe(true)
    if (k === 'm5.let.ab.hundredSum') expect(answer(q), q.id).toBe(2 * x! + 11)
    else exprIs(q, { 'm5.let.ab.pos.tr': 'a + 1', 'm5.let.ab.pos.bl': 'a + 10', 'm5.let.ab.pos.br': 'a + 11' }[keyOf(p, 'pos')]!)
    return true
  }
  return false
}

describe('六个知识点：答案都对得上', () => {
  for (const kp of ALL) {
    it(`${kp}：认得出每道题、答案对`, () => {
      each(kp, (q) => {
        expect(check(q), `${q.id} 认不出题型`).toBe(true)
      })
    })
  }
})

describe('图和题对得上', () => {
  it('拼桌子：1、2、3 张桌子，每张上下各坐 1 人（例 4）或 2 人（练习十三 6），和题里说的人数一样', () => {
    each(AXB, (q) => {
      const intro = texts(q)[0]!.k
      if (intro !== 'm5.let.ab.desk1' && intro !== 'm5.let.ab.desk2') return
      const fig = stemsOf(q, 'pattern-dots')[0]
      if (!fig) return // 表格那一种不画图
      const side = intro === 'm5.let.ab.desk1' ? 1 : 2
      expect(fig.figs, q.id).toEqual([1, 2, 3].map((n) => ({ t: 'tables', n, side })))
      expect(fig.more, q.id).toBe(true)
    })
  })

  it('小正方体一摞一摞（1、2、3、4 个），棋子 2、3、4 行，圆片 2、4、6、8 个', () => {
    each(AXB, (q) => {
      for (const s of stemsOf(q, 'cube-solids')) expect(s.items, q.id).toEqual([1, 2, 3, 4].map((h) => ({ rows: [[h]] })))
      for (const s of stemsOf(q, 'pattern-dots')) {
        const f = s.figs[0]!
        if (f.t === 'stones') expect(s.figs, q.id).toEqual([2, 3, 4].map((r) => ({ t: 'stones', r })))
        if (f.t === 'rows') expect(f.counts, q.id).toEqual([2, 4, 6, 8])
      }
    })
  })

  it('做一做 2 的线段图：超市—兰兰家—学校—书店，第一段是 500 这样的整百数，学校那段比它长', () => {
    each(ADDSUB, (q) => {
      for (const line of stemsOf(q, 'part-line')) {
        expect(line.names!.map((n) => (n as { k: string }).k), q.id).toEqual(['market', 'home', 'school', 'store'].map((x) => `m5.let.place.${x}`))
        expect(line.parts.map((x) => x.label).slice(1), q.id).toEqual(['a', 'b'])
        expect(Number(line.parts[0]!.label) % 100, q.id).toBe(0)
        expect(line.parts[1]!.len, q.id).toBeGreaterThan(line.parts[0]!.len)
      }
    })
  })
})

describe('照课本的写法', () => {
  it('选项里没有单独一个小写字母（朗读会读成拼音字母）', () => {
    for (const kp of ALL) each(kp, (q) => {
      for (const c of q.choices ?? []) expect(zh(c.label), q.id).not.toMatch(/^[a-z]$/)
    })
  })

  it('算式和选项里的运算符前后空一格（朗读才读「加」「等于」），字母小写（周长 C、面积 S、华氏 F 除外）', () => {
    for (const kp of ALL) each(kp, (q) => {
      const all = [...exprs(q), ...(q.choices ?? []).map((c) => c.label).filter((l): l is string => typeof l === 'string')]
      for (const s of all) {
        expect(s, q.id).not.toMatch(/\S[+\-×÷=]|[+\-×÷=]\S/)
        expect(s.replace(/[CSF]/g, ''), q.id).not.toMatch(/[A-Z]/)
      }
    })
  })

  it('题目文字不写圆括号、「长」只在长度 / 长方形 / 周长 / 边长里、「只」前面不放数、序数写汉字', () => {
    for (const kp of ALL) each(kp, (q) => {
      for (const part of stemsOf(q, 'text')) {
        const s = zh(part.text)
        expect(s, q.id).not.toMatch(/[()（）]/)
        expect(s.replace(/长度|长方形|长方体|周长|边长/g, ''), q.id).not.toMatch(/长/)
        expect(s, q.id).not.toMatch(/\d\s*只/)
        expect(s, q.id).not.toMatch(/第\s*\d/)
        // 量词表外的量词前面不出 2（读不成「两」）
        expect(s, q.id).not.toMatch(/(?<![\d.])2\s*(把|枚|幅|面)/)
        // 课本这一册没有方程
        expect(s, q.id).not.toMatch(/方程/)
      }
    })
  })

  it('课本里会读错的原句都改写了：增长、隧道长、水路长、投中、多得、倒出、还剩、第 1 行', () => {
    for (const v of Object.values(ZH)) expect(String(v)).not.toMatch(/增长|隧道长|水路长|投中|多得|倒出|还剩|还有|第\s*\d+\s*行|方程/)
  })
})

describe('第 1 档有课本每个例题和做一做', () => {
  const kinds = (kp: string): Set<string> => {
    const seen = new Set<string>()
    const gen = getGenerator(kp)!
    for (let seed = 1; seed <= 1500; seed++) {
      const q = gen(1, createRng(seed))
      const ts = texts(q)
      const last = ts[ts.length - 1]!
      const p = last.p
      if (last.k === 'm5.let.when1') seen.add(`when1:${str(p, 'x')}->${str(p, 'y')}`)
      else if (last.k === 'm5.let.when2') seen.add(`when2:${str(p, 'x')},${str(p, 'y')}->${str(p, 'z')}`)
      else if (last.k === 'm5.let.md.omit' || last.k === 'm5.let.md.means') seen.add(`${last.k}:${str(p, 'e')}`)
      else if (last.k === 'm5.let.lw.letter') seen.add(`${last.k}:${keyOf(p, 'law')}`)
      else if (last.k === 'm5.let.lw.speed') seen.add(`${last.k}:${str(p, 'y')}`)
      else if (last.k === 'm5.let.ab.seqN') seen.add(`${last.k}:${exprs(q)[0]}`)
      else if (last.k === 'm5.let.bx.calc') seen.add(`${last.k}:${exprs(q)[0]}`)
      else seen.add(last.k)
      seen.add(q.id.split(':')[1]!.replace(/-\d+$/, ''))
      seen.add(q.id.split(':')[1]!)
    }
    return seen
  }
  const has = (s: Set<string>, xs: string[]): void => {
    for (const x of xs) expect(s.has(x), `第 1 档缺 ${x}`).toBe(true)
  }
  it('加减关系：例 1 的式子、关系式、试一试求值（11 → 36、57 → 32）、想一想，做一做 1、2', () => {
    has(kinds(ADDSUB), [
      'm5.let.as.age',
      'm5.let.as.ageRel',
      'when1:a->b',
      'when1:b->a',
      'ageB-25-11-1',
      'ageA-25-57-1',
      'm5.let.as.can',
      'm5.let.as.saleMore',
      'm5.let.as.saleTotal',
      'm5.let.as.lineToSchool',
      'm5.let.as.lineHomeStore',
      'm5.let.as.lineMore',
      'line0-500',
    ])
  })
  it('乘除关系：例 2 的 6m、n = 6m、试一试（15 → 90、210 → 35），省略乘号的写法（练习十一 4），做一做的纸条', () => {
    has(kinds(MULDIV), [
      'm5.let.md.moon',
      'm5.let.md.moonRel',
      'moonN-15',
      'moonM-35',
      'm5.let.md.omit:m × 6',
      'm5.let.md.omit:a × x',
      'm5.let.md.omit:x × x',
      'm5.let.md.omit:b × 8',
      'm5.let.md.omit:b × 1',
      'm5.let.md.omit:a × b × c',
      'm5.let.md.means:6m',
      'm5.let.md.means:a²',
      'm5.let.md.jFront',
      'm5.let.md.jOne',
      'm5.let.md.jDot',
      'm5.let.md.strip',
      'stripDec-5.6',
      'm5.let.md.stripX',
    ])
  })
  it('运算律和公式：五条运算律、正方形和长方形的周长面积公式、路程公式与 250 × 20', () => {
    has(kinds(LAWS), [
      ...Object.keys(LAW_FORM).map((l) => `m5.let.lw.letter:${l}`),
      'm5.let.lw.which',
      'm5.let.lw.sqC',
      'm5.let.lw.sqS',
      'm5.let.lw.rectC',
      'm5.let.lw.rectS',
      'm5.let.lw.speed:s',
      'm5.let.lw.speed:v',
      'm5.let.lw.speed:t',
      'speedV-250-20',
    ])
  })
  it('等式的基本性质：哪个式子成立、填数、c 不能是 0，例 ①②（37 → 12、9 → 1.5）、试一试（62、54）、做一做（t = 20）', () => {
    has(kinds(EQUALITY), [
      'm5.let.eq.prop',
      'm5.let.eq.fill',
      'm5.let.eq.zero',
      'findAdd-25-37',
      'findMulDec-6-9',
      'findSub-25-37',
      'findDiv-6-9',
      'm5.let.eq.solve',
      'm5.let.eq.step',
      'm5.let.eq.typeRel',
      'typeVal-45-20',
    ])
  })
  it('ax + b：例 4 拼桌子（几张坐几人、2 + 2m、关系式、表、m = 15 → 32、n = 52 → 25），做一做 1 的四个数列', () => {
    has(kinds(AXB), [
      'm5.let.ab.deskK',
      'm5.let.ab.deskM',
      'm5.let.ab.deskRel',
      'm5.let.ab.deskTable',
      'desk1-n-15',
      'desk1-m-25',
      'm5.let.ab.seqNext',
      'm5.let.ab.seqNth',
      'm5.let.ab.seqN:2, 4, 6, 8, …',
      'm5.let.ab.seqN:1, 3, 5, 7, …',
      'm5.let.ab.seqN:1, 4, 9, 16, …',
      'seqNext-1, 2, 3, 4',
    ])
  })
  it('ax + bx：例 5 的 s = 320(a + b)、320a + 320b、试一试（1600、b = 4），做一做 2、3、4，练习十三 5', () => {
    has(kinds(AXBX), [
      'm5.let.bx.train',
      'm5.let.bx.factor',
      'trainS-320-2-3-1',
      'trainB-320-3-4',
      'm5.let.bx.courierSum',
      'm5.let.bx.courierDiff',
      'courierVal-75-60-3',
      'm5.let.bx.tunnelS',
      'tunnelV-150-10-9',
      'curling-10',
      'm5.let.bx.calc:2a + 6a = ?',
      'm5.let.bx.calc:11x - 9x = ?',
      'm5.let.bx.calc:8y - y = ?',
      'm5.let.bx.calc:b + 7b = ?',
    ])
  })
})
