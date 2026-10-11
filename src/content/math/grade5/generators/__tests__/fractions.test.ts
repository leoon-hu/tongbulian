import { describe, expect, it } from 'vitest'
import type { FracPic, LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade5' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'
import { MIXED_SEP } from '@/engine/fraction'
import { hasBlank } from '@/components/practice/blank'

// 五下「分数的意义和性质」前 9 个知识点的专项检查（五年级数学 H）：从题目本身（题干词条的参数、图、分数链、集合图、算式）
// 独立地把答案再算一遍，查正确选项 / 键盘答案对、干扰项都错；「约分」之前的知识点和只考数值的题，选项里没有和答案等值的另一种写法；
// 第 1 档出得到每个例题与做一做的题型；分数从小池子里取（每个不同的分数都是一条朗读音频）。
const SEEDS = 150
const KPS = ['m5s2-05-meaning', 'm5s2-05-division', 'm5s2-05-proper', 'm5s2-05-mixed', 'm5s2-05-property', 'm5s2-05-gcf', 'm5s2-05-reduce', 'm5s2-05-lcm', 'm5s2-05-common'] as const
const zh = (l: LStr): string => translate(l, 'zh')

function each(kpId: string, fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator(kpId)!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const sig = (q: Question): string => q.id.slice(q.kpId.length + 1)
const kind = (q: Question): string => sig(q).split('-')[0]!
const part = <K extends StemPart['kind']>(q: Question, k: K): Extract<StemPart, { kind: K }> | undefined =>
  q.stem.find((p): p is Extract<StemPart, { kind: K }> => p.kind === k)
/** 第一个文字部分的词条键（去掉 m5.frac. 前缀）与参数 */
function textOf(q: Question): { key: string; p: Record<string, unknown> } {
  const t = part(q, 'text')
  if (!t || typeof t.text !== 'object') return { key: '', p: {} }
  return { key: t.text.k.replace(/^m5\.frac\./, ''), p: t.text.p ?? {} }
}
const labels = (q: Question): string[] => (q.choices ?? []).map((c) => zh(c.label))
const correctLabel = (q: Question): string =>
  q.answer.kind === 'number' ? String(q.answer.value) : zh(q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)!.label)
const wrongLabels = (q: Question): string[] => {
  const id = q.answer.kind === 'choice' ? q.answer.choiceId : ''
  return (q.choices ?? []).filter((c) => c.id !== id).map((c) => zh(c.label))
}

// ── 数的解析（独立实现，不用生成器里的函数） ──
const g2 = (a: number, b: number): number => (b === 0 ? a : g2(b, a % b))
const l2 = (a: number, b: number): number => (a / g2(a, b)) * b
type R = [number, number]
/** 「3/4」「2 1/5」（细空格）「7」 → [分子, 分母]；别的返回 null */
function val(s: string): R | null {
  const m = new RegExp(`^(?:(\\d+)${MIXED_SEP})?(\\d+)/(\\d+)$`).exec(s.trim())
  if (m) return [Number(m[1] ?? 0) * Number(m[3]) + Number(m[2]), Number(m[3])]
  if (/^\d+$/.test(s.trim())) return [Number(s), 1]
  return null
}
const eqR = (a: R, b: R): boolean => a[0] * b[1] === b[0] * a[1]
const cmpR = (a: R, b: R): number => a[0] * b[1] - b[0] * a[1]
const frac = (s: unknown): R => {
  const v = val(String(s))
  if (!v) throw new Error(`不是分数：${String(s)}`)
  return v
}
const simp = (r: R): string => {
  const g = g2(r[0], r[1])
  return `${r[0] / g}/${r[1] / g}`
}
const mixOf = (r: R): string => {
  const q = Math.floor(r[0] / r[1])
  return `${q}${MIXED_SEP}${r[0] - q * r[1]}/${r[1]}`
}
const factors = (n: number): number[] => Array.from({ length: n }, (_, i) => i + 1).filter((x) => n % x === 0)
const list = (xs: (number | string)[]): string => xs.join('，')
const num = (v: unknown): number => Number(v)
const tri = (ok: boolean, yes = '对', no = '不对'): string => (ok ? yes : no)
/** 词条的键与参数（集合图两个圈的名字「8 的因数」） */
const keyOf = (l: LStr): string => (typeof l === 'string' ? l : l.k)
const paramOf = (l: LStr, name: string): unknown => (typeof l === 'string' ? undefined : l.p?.[name])

/** 一幅平均分的图涂了几份（前面整个涂满的 whole 个也算） */
const shadedOf = (p: FracPic): number => (p.whole ?? 0) * p.parts + p.shaded.length

/** 单位换算的进率（独立写一份） */
const RATE: Record<string, number> = { 'cm>dm': 10, 'cm>m': 100, 'dm>m': 10, 'cm2>dm2': 100, 'dm2>m2': 100, 'ml>l': 1000, 'kg>t': 1000, 'g>kg': 1000, 's>min': 60, 'ha>km2': 100, 'dm3>m3': 1000 }
const unitOf = (v: unknown): string => (v as { k: string }).k.replace('m5.frac.u.', '')

/**
 * 从题目独立算出正确答案（选项的中文 / 键盘的数）；null = 这种题另有检查（下面单独查）
 */
function expected(q: Question): string | null {
  const { key, p } = textOf(q)
  const shape = part(q, 'frac-shape')
  const line = part(q, 'frac-line')
  const expr = part(q, 'expr')
  const chain = part(q, 'frac-chain')
  const venn = part(q, 'venn')
  switch (key) {
    // ── 分数的意义 ──
    case 'pic':
    case 'picMany': {
      const pic = shape!.items[0]!
      return `${shadedOf(pic)}/${pic.parts}`
    }
    case 'picMix': {
      const pic = shape!.items[0]!
      return `${pic.whole}${MIXED_SEP}${pic.shaded.length}/${pic.parts}`
    }
    case 'set': {
      const set = part(q, 'frac-set')!
      expect(set.groups).toBe(num(p.k))
      expect(set.shaded).toBe(num(p.j))
      return `${p.j}/${p.k}`
    }
    case 'row': {
      const set = part(q, 'frac-set')!
      expect([set.groups, set.shaded]).toEqual([num(p.n), num(p.j)])
      return `${p.j}/${p.n}`
    }
    case 'unitOf':
      return `1/${frac(p.f)[1]}`
    case 'unitCount':
      expect(String(p.u)).toBe(`1/${frac(p.f)[1]}`)
      return String(frac(p.f)[0])
    case 'unitsMake':
      return `${p.k}/${frac(p.u)[1]}`
    case 'oneHas':
    case 'oneMake':
      return String(frac(p.u)[1])
    case 'rest': {
      const f = frac(p.f)
      const set = part(q, 'frac-set')!
      expect([set.shaded, set.groups]).toEqual(f)
      return `${f[1] - f[0]}/${f[1]}`
    }
    case 'biscuitFrac':
      return `1/${p.k}`
    case 'biscuitCount':
      return String(num(p.t) / num(p.k))
    case 'line':
    case 'lineImp':
      return `${line!.arrow}/${line!.per}`
    case 'lineUnit':
      expect(line!.arrow).toBeUndefined()
      return `1/${line!.per}`
    case 'lineMix':
      return mixOf([line!.arrow!, line!.per])
    case 'tf.unitSmaller':
    case 'tf.setAsOne':
    case 'tf.den0':
    case 'tf.properLess':
    case 'tf.impGe':
    case 'noMax':
    case 'tf.product':
      return '对'
    case 'tf.allLess':
    case 'tf.impNumLess':
    case 'tf.impGreater':
    case 'tf.lcmBigger':
      return '不对'
    case 'tf.unitIs':
      return tri(String(p.u) === `1/${frac(p.f)[1]}`)
    case 'tf.oneHas':
      return tri(num(p.n) === frac(p.u)[1])
    case 'cmpUnit':
      return cmpR(frac(p.u), frac(p.v)) > 0 ? String(p.u) : String(p.v)

    // ── 分数与除法 ──
    case 'share':
    case 'shareBing': {
      if (shape) {
        expect(shape.items).toHaveLength(num(p.a))
        for (const it of shape.items) expect([it.parts, it.shaded.length]).toEqual([num(p.b), 1])
      }
      return `${p.a}/${p.b}`
    }
    case 'quot': {
      const m = /^(\d+) ÷ (\d+) = \?$/.exec(expr!.expr)!
      return `${m[1]}/${m[2]}`
    }
    case 'toDiv': {
      const [n, d] = frac(p.f)
      return `${n} ÷ ${d}`
    }
    case 'fill': {
      const m = /^(\?|\d+) ÷ (\?|\d+) = (\d+)\/(\d+)$/.exec(expr!.expr)!
      return m[1] === '?' ? m[3]! : m[4]!
    }
    case 'pw':
      return `${p.b}/${p.a}`
    case 'pwTimes':
      expect(num(p.a) % num(p.b)).toBe(0)
      return String(num(p.a) / num(p.b))
    case 'rel.num':
      return '分子'
    case 'rel.den':
      return '分母'
    case 'us.raisin':
    case 'us.bed':
    case 'us.ribbon':
    case 'us.walk':
    case 'stickLen':
      return `${p.a}/${p.b}`
    case 'stickPart':
      return `1/${p.b}`
    case 'conv': {
      const r = RATE[`${unitOf(p.u)}>${unitOf(p.v)}`]
      expect(r, `${unitOf(p.u)}>${unitOf(p.v)}`).toBeDefined()
      return `${p.a}/${r}`
    }
    case 'year': {
      const [n, d] = frac(p.f)
      expect((12 * n) % d).toBe(0)
      return String((12 * n) / d)
    }
    case 'bigMonth':
      return '7/12'
    case 'weekend':
      return '2/7'
    case 'price':
    case 'prize':
    case 'plane':
      return `${p.b}/${p.a}`
    case 'tf.div': {
      const m = /^(\d+) ÷ (\d+)$/.exec(String(p.e))!
      return tri(String(p.f) === `${m[1]}/${m[2]}`)
    }

    // ── 真分数和假分数 ──
    case 'pickImproper':
    case 'pickProper': {
      const imp = key === 'pickImproper'
      const isImp = (s: string): boolean => frac(s)[0] >= frac(s)[1]
      expect(isImp(correctLabel(q))).toBe(imp)
      for (const w of wrongLabels(q)) expect(isImp(w), `${q.id} ${w}`).toBe(!imp)
      return null
    }
    case 'isImproper':
      return tri(frac(p.f)[0] >= frac(p.f)[1])
    case 'isProper':
      return tri(frac(p.f)[0] < frac(p.f)[1])
    case 'name.mixed':
      expect(String(p.m)).toContain(MIXED_SEP)
      return '带分数'
    case 'name.proper':
      return '真分数'
    case 'name.improper':
      return '假分数'
    case 'drink':
      expect(num(p.a)).toBeGreaterThan(num(p.b))
      return `${p.a}/${p.b}`
    case 'sleepBear':
      return `${p.a}/${p.b}`
    case 'sleepMouse':
      return `${p.b}/${p.a}`
    case 'countProper':
      return String(num(p.d) - 1)
    case 'countImproper':
      return String(num(p.n))
    case 'eqOne':
      for (const w of wrongLabels(q)) expect(eqR(frac(w), [1, 1])).toBe(false)
      return null
    case 'melon':
      return frac(p.f)[0] <= frac(p.f)[1] ? '可能' : '不可能'
    case 'choco':
      return tri(eqR([frac(p.f)[0] + frac(p.g)[0], frac(p.f)[1]], [1, 1]))

    // ── 假分数化成整数或带分数 ──
    case 'toInt': {
      const [n, d] = frac(p.f)
      expect(n % d).toBe(0)
      return String(n / d)
    }
    case 'toMixed':
      return mixOf(frac(p.f))
    case 'mixWhole':
    case 'mixNum': {
      const f = frac(p.f)
      const q0 = Math.floor(f[0] / f[1])
      const terms = chain!.terms
      expect(terms[0]).toEqual({ n: String(f[0]), d: String(f[1]) })
      // 分数链里另一半照写对了（整数部分 / 分子）
      if (key === 'mixWhole') expect(terms[2]).toEqual({ w: '?', n: String(f[0] - q0 * f[1]), d: String(f[1]) })
      else expect(terms[2]).toEqual({ w: String(q0), n: '?', d: String(f[1]) })
      return String(key === 'mixWhole' ? q0 : f[0] - q0 * f[1])
    }
    case 'canInt': {
      expect(frac(correctLabel(q))[0] % frac(correctLabel(q))[1]).toBe(0)
      for (const w of wrongLabels(q)) expect(frac(w)[0] % frac(w)[1]).not.toBe(0)
      return null
    }
    case 'pill':
      return mixOf([num(p.n), num(p.k)])
    case 'toImp': {
      const m = frac(p.m)
      expect(chain!.terms[2]).toEqual({ n: '?', d: String(m[1]) })
      return String(m[0])
    }

    // ── 分数的基本性质 ──
    case 'pair2':
    case 'pair2sq': {
      const [a, b] = shape!.items
      expect(a!.label).toBeTruthy()
      expect(b!.label).toBeUndefined()
      expect(eqR([shadedOf(b!), b!.parts], frac(a!.label))).toBe(true)
      return `${b!.shaded.length}/${b!.parts}`
    }
    case 'arcMul': {
      const f = frac(p.f)
      const g = frac(p.g)
      expect(g[0] % f[0] === 0 && g[1] / f[1] === g[0] / f[0]).toBe(true)
      return String(g[0] / f[0])
    }
    case 'arcDiv': {
      const f = frac(p.f)
      const g = frac(p.g)
      expect(f[1] / g[1]).toBe(f[0] / g[0])
      return String(f[0] / g[0])
    }
    case 'toDen': {
      const f = frac(p.f)
      const D = num(p.D)
      expect((f[0] * D) % f[1]).toBe(0)
      return String((f[0] * D) / f[1])
    }
    case 'toNum': {
      const f = frac(p.f)
      const N = num(p.N)
      expect((f[1] * N) % f[0]).toBe(0)
      return String((f[1] * N) / f[0])
    }
    case 'rule.ok':
      return '对'
    case 'rule.add':
    case 'rule.one':
    case 'rule.zero':
      return '不对'
    case 'eqTf':
      return tri(eqR(frac(p.f), frac(p.g)))
    case 'whichEq':
      expect(eqR(frac(correctLabel(q)), frac(p.f))).toBe(true)
      for (const w of wrongLabels(q)) expect(eqR(frac(w), frac(p.f)), `${q.id} ${w}`).toBe(false)
      return null
    case 'groups': {
      const s = cmpR(frac(p.f), frac(p.g))
      return s === 0 ? '一样多' : s > 0 ? '舞蹈小组' : '书法小组'
    }
    case 'chainFill': {
      const fr = chain!.terms.filter((x): x is { n: string; d: string } => 'n' in x)
      const known = fr.find((x) => !x.n.includes('?') && !x.d.includes('?'))!
      const ask = fr.find((x) => x.n === '?' || x.d === '?')!
      const k: R = [Number(known.n), Number(known.d)]
      for (const x of fr) if (x !== ask) expect(eqR([Number(x.n), Number(x.d)], k)).toBe(true)
      return ask.n === '?' ? String((k[0] * Number(ask.d)) / k[1]) : String((k[1] * Number(ask.n)) / k[0])
    }
    case 'shadeMore': {
      const [a, b] = shape!.items
      const f = frac(a!.label)
      return String((f[0] * b!.parts) / f[1])
    }
    case 'minutes': {
      const s = cmpR([num(p.x), 40], frac(p.f))
      return s === 0 ? '一样多' : s > 0 ? '一班' : '二班'
    }
    case 'change.numMul':
    case 'change.denDiv':
      return `扩大到原来的 ${p.k} 倍`
    case 'change.denMul':
      return `缩小到原来的 1/${p.k}`

    // ── 最大公因数 ──
    case 'cfList':
      return list(factors(g2(num(p.a), num(p.b))))
    case 'cfPick': {
      const a = num(p.a)
      const b = num(p.b)
      const c = num(correctLabel(q))
      expect(a % c === 0 && b % c === 0).toBe(true)
      for (const w of wrongLabels(q)) expect(a % num(w) === 0 && b % num(w) === 0, `${q.id} ${w}`).toBe(false)
      return null
    }
    case 'gcf':
    case 'vennGcf':
    case 'tile':
    case 'paper':
    case 'rows':
    case 'share2':
    case 'sweep':
      return String(g2(num(p.a ?? p.L), num(p.b ?? p.W)))
    case 'tileCan':
      return num(p.L) % num(p.s) === 0 && num(p.W) % num(p.s) === 0 ? '能' : '不能'
    case 'gcf3':
    case 'sticks':
      return String(g2(g2(num(p.a), num(p.b)), num(p.c)))
    case 'fracGcf':
      return String(g2(...frac(p.f)))
    case 'rowsBoys':
      return String(num(p.a) / g2(num(p.a), num(p.b)))
    case 'jiaYi':
      return '乙数'
    case 'gcfOne': {
      const pair = (s: string): [number, number] => s.split(' 和 ').map(Number) as [number, number]
      expect(g2(...pair(correctLabel(q)))).toBe(1)
      for (const w of wrongLabels(q)) expect(g2(...pair(w))).not.toBe(1)
      return null
    }
    case 'vennMid': {
      const a = num(paramOf(venn!.left, 'n'))
      const b = num(paramOf(venn!.right, 'n'))
      if (keyOf(venn!.left).endsWith('.vf')) return list(factors(g2(a, b)))
      const l = l2(a, b)
      return list([l, l * 2, l * 3, '…'])
    }
    case 'vennWhere': {
      const a = num(paramOf(venn!.left, 'n'))
      const b = num(paramOf(venn!.right, 'n'))
      const x = num(p.x)
      const isFac = keyOf(venn!.left).endsWith('.vf')
      const inA = isFac ? a % x === 0 : x % a === 0
      const inB = isFac ? b % x === 0 : x % b === 0
      expect(inA || inB).toBe(true)
      // 图里先拿掉了这个数
      expect([...venn!.only1, ...venn!.both, ...venn!.only2]).not.toContain(String(x))
      return inA && inB ? '中间那一块' : inA ? '左边那一块' : '右边那一块'
    }

    // ── 约分 ──
    case 'simplest':
    case 'photo':
    case 'photoOther':
    case 'sleepDay':
    case 'dm': {
      const f: R =
        key === 'simplest' ? frac(p.f) : key === 'photo' ? [num(p.a), num(p.t)] : key === 'photoOther' ? [num(p.t) - num(p.a), num(p.t)] : key === 'sleepDay' ? [12 - num(p.s) + num(p.w), 24] : [num(p.a), 10]
      return simp(f)
    }
    case 'gcdDiv':
      return String(g2(...frac(p.f)))
    case 'pickSimplest':
      expect(g2(...frac(correctLabel(q)))).toBe(1)
      for (const w of wrongLabels(q)) expect(g2(...frac(w))).not.toBe(1)
      return null
    case 'isSimplest':
      return tri(g2(...frac(p.f)) === 1)
    case 'circles': {
      const [a, b] = shape!.items
      const s = cmpR([a!.shaded.length, a!.parts], [b!.shaded.length, b!.parts])
      return s === 0 ? '一样大' : s > 0 ? '左边大' : '右边大'
    }
    case 'hasCf': {
      const k = num(p.k)
      const has = (s: string): boolean => frac(s)[0] % k === 0 && frac(s)[1] % k === 0
      expect(has(correctLabel(q))).toBe(true)
      for (const w of wrongLabels(q)) expect(has(w)).toBe(false)
      return null
    }
    case 'done':
      expect(eqR(frac(p.f), frac(p.g))).toBe(true)
      return tri(g2(...frac(p.g)) === 1)
    case 'eqTo':
      expect(eqR(frac(correctLabel(q)), frac(p.u))).toBe(true)
      for (const w of wrongLabels(q)) expect(eqR(frac(w), frac(p.u))).toBe(false)
      return null
    case 'reduceMix':
      return mixOf(frac(simp(frac(p.f))))
    case 'orig': {
      const f = frac(p.f)
      return `${f[0] * 12}/${f[1] * 12}`
    }

    // ── 最小公倍数 ──
    case 'cmPick':
    case 'both': {
      const a = num(p.a)
      const b = num(p.b)
      const isCm = (x: number): boolean => x % a === 0 && x % b === 0
      expect(isCm(num(correctLabel(q)))).toBe(true)
      for (const w of wrongLabels(q)) expect(isCm(num(w)), `${q.id} ${w}`).toBe(false)
      return null
    }
    case 'lcm':
    case 'vennLcm':
    case 'square':
    case 'groupMin':
    case 'bus':
    case 'run':
    case 'cloth':
    case 'fountain':
      return String(l2(num(p.a), num(p.b)))
    case 'groupMay': {
      const a = num(p.a)
      const b = num(p.b)
      const lim = num(p.lim)
      const c = num(correctLabel(q))
      expect(c % a === 0 && c % b === 0 && c < lim).toBe(true)
      for (const w of wrongLabels(q)) expect(num(w) % a === 0 && num(w) % b === 0, `${q.id} ${w}`).toBe(false)
      return null
    }
    case 'countCm':
      return String(Math.floor(100 / l2(num(p.a), num(p.b))))
    case 'isCm':
      return tri(num(p.x) % num(p.a) === 0 && num(p.x) % num(p.b) === 0)
    case 'water':
      return String(1 + l2(num(p.a), num(p.b)))
    case 'denLcm':
      return String(l2(frac(p.f)[1], frac(p.g)[1]))
    case 'runLaps':
      return String(l2(num(p.a), num(p.b)) / num(p.a))
    case 'whichLcm': {
      const pair = (s: string): [number, number] => s.split(' 和 ').map(Number) as [number, number]
      expect(l2(...pair(correctLabel(q)))).toBe(num(p.n))
      for (const w of wrongLabels(q)) expect(l2(...pair(w))).not.toBe(num(p.n))
      return null
    }
    case 'other': {
      const ans = (num(p.g) * num(p.l)) / num(p.a)
      expect(g2(ans, num(p.a))).toBe(num(p.g))
      expect(l2(ans, num(p.a))).toBe(num(p.l))
      return String(ans)
    }
    case 'pome':
      return String(l2(num(p.a), num(p.b)) + num(p.r))

    // ── 通分 ──
    case 'cmp':
    case 'reduceCmp': {
      const m = /^(.+) ○ (.+)$/.exec(expr!.expr)!
      const s = cmpR(val(m[1]!)!, val(m[2]!)!)
      return s > 0 ? '>' : s < 0 ? '<' : '='
    }
    case 'earth':
      expect(cmpR(frac(p.f), frac(p.g))).toBeLessThan(0)
      return '海洋'
    case 'bean':
      expect(cmpR(frac(p.f), frac(p.g))).toBeGreaterThan(0)
      return '黄豆'
    case 'read':
    case 'worker': {
      const s = cmpR(frac(p.f), frac(p.g))
      return s === 0 ? '一样多' : key === 'read' ? (s > 0 ? '小明' : '小红') : s > 0 ? '张叔叔' : '李叔叔'
    }
    case 'commonDen':
      return String(l2(frac(p.f)[1], frac(p.g)[1]))
    case 'commonNum': {
      const h = frac(p.h)
      const D = num(p.D)
      expect(D).toBe(l2(frac(p.f)[1], frac(p.g)[1]))
      return String((h[0] * D) / h[1])
    }
    case 'commonPair': {
      const f = frac(p.f)
      const g = frac(p.g)
      const ok = (s: string): boolean => {
        const [x, y] = s.split(' 和 ').map((t) => frac(t))
        return x![1] === y![1] && eqR(x!, f) && eqR(y!, g)
      }
      expect(ok(correctLabel(q))).toBe(true)
      expect(frac(correctLabel(q).split(' 和 ')[0]!)[1]).toBe(l2(f[1], g[1]))
      for (const w of wrongLabels(q)) expect(ok(w), `${q.id} ${w}`).toBe(false)
      return null
    }
    case 'lessQ':
    case 'moreQ': {
      const u = frac(p.u)
      const side = key === 'lessQ' ? -1 : 1
      expect(Math.sign(cmpR(frac(correctLabel(q)), u))).toBe(side)
      for (const w of wrongLabels(q)) expect(Math.sign(cmpR(frac(w), u))).toBe(-side)
      return null
    }
    case 'continent':
      return '亚洲'
    case 'continentMin':
      return '南美洲'
    case 'bookType':
      return '科普类'
    case 'bookTypeMin':
      return '童话类'
    case 'maxOf':
    case 'minOf': {
      const all = labels(q).map(frac)
      const sorted = [...all].sort(cmpR)
      const want = key === 'maxOf' ? sorted[sorted.length - 1]! : sorted[0]!
      expect(eqR(frac(correctLabel(q)), want)).toBe(true)
      return null
    }
    case 'between': {
      const u = frac(p.u)
      const v = frac(p.v)
      const inside = (s: string): boolean => cmpR(frac(s), u) > 0 && cmpR(frac(s), v) < 0
      expect(inside(correctLabel(q))).toBe(true)
      for (const w of wrongLabels(q)) expect(inside(w)).toBe(false)
      return null
    }
    case 'riddle': {
      const c = frac(correctLabel(q))
      expect(g2(...c)).toBe(1)
      expect(c[0] + 1).toBe(c[1])
      expect(eqR([c[0], c[1] + 1], frac(p.f))).toBe(true)
      return null
    }
  }
  throw new Error(`没有检查到的题：${q.id}（${key}）`)
}

/** 题目明说要约成最简（或考写法）的：干扰项可以和答案等值 */
const EQ_OK = new Set(['simplest', 'photo', 'photoOther', 'sleepDay', 'dm', 'orig', 'reduceMix', 'eqTo'])

describe('分数的意义和性质：从题目反推答案（150 种子 × 三档）', () => {
  for (const kp of KPS) {
    it(kp, () => {
      each(kp, (q) => {
        const want = expected(q)
        if (want !== null) expect(correctLabel(q), q.id).toBe(want)
        // 选项里只有正确答案对：分数 / 带分数 / 整数的选项，除了考写法的题，和答案都不等值
        const c = val(correctLabel(q))
        if (c && q.input === 'choice' && !EQ_OK.has(textOf(q).key)) {
          for (const w of wrongLabels(q)) {
            const v = val(w)
            if (v) expect(eqR(v, c), `${q.id}：${w} 和答案 ${correctLabel(q)} 相等`).toBe(false)
          }
        }
        // 考写法的题：答案是最简的（带分数的分数部分也是）
        if (c && EQ_OK.has(textOf(q).key) && textOf(q).key !== 'orig' && textOf(q).key !== 'eqTo') {
          const fp = correctLabel(q).split(MIXED_SEP).pop()!
          expect(g2(...frac(fp)), q.id).toBe(1)
          for (const w of wrongLabels(q)) expect(w, q.id).not.toBe(correctLabel(q))
        }
      })
    })
  }
})

describe('分数的意义和性质：写法与朗读', () => {
  it('约分之前的知识点答案照课本不化简；带分数的分数部分是真分数', () => {
    for (const kp of KPS) {
      each(kp, (q) => {
        for (const l of labels(q)) {
          if (!l.includes(MIXED_SEP)) continue
          const [n, d] = l.split(MIXED_SEP)[1]!.split('/').map(Number)
          expect(n! < d!, `${q.id} ${l}`).toBe(true)
        }
      })
    }
  })

  it('题干文字里不写「?」（会读成「几」），要填的数在分数链或算式里；「长」只在长度 / 长方形 / 边长里，不写「只」', () => {
    for (const kp of KPS) {
      each(kp, (q) => {
        for (const p of q.stem) {
          if (p.kind !== 'text') continue
          const s = zh(p.text)
          expect(s, q.id).not.toMatch(/\?/)
          expect(s.replace(/长度|长方形|边长/g, ''), q.id).not.toMatch(/长/)
          expect(s, q.id).not.toMatch(/只|得多|种|重叠|（/)
        }
      })
    }
  })

  it('要填数的题（分数链里的「?」、算式里的「?」）都用数字键盘，练习页把按的数填进去', () => {
    for (const kp of KPS) {
      each(kp, (q) => {
        const ch = part(q, 'frac-chain')
        const ask = ch && (ch.terms.some((t) => ('t' in t ? t.t : `${t.w ?? ''}${t.n}${t.d}`).includes('?')) || (ch.arcs ?? []).some((a) => `${a.top ?? ''}${a.bottom ?? ''}`.includes('?')))
        if (ask) {
          expect(q.input, q.id).toBe('numpad')
          expect(hasBlank(q), q.id).toBe(true)
        }
      })
    }
  })

  it('分数从小池子里取：每个知识点朗读的题干和答案里出现的不同分数不超过 150 个（每个都是一条朗读音频；干扰项不朗读）', () => {
    const FR = new RegExp(`(?:\\d+${MIXED_SEP})?\\d+/\\d+`, 'g')
    for (const kp of KPS) {
      const seen = new Set<string>()
      each(kp, (q) => {
        for (const p of q.stem) if (p.kind === 'text' || p.kind === 'expr') for (const m of (p.kind === 'text' ? zh(p.text) : p.expr).matchAll(FR)) seen.add(m[0])
        for (const m of correctLabel(q).matchAll(FR)) seen.add(m[0])
      })
      expect(seen.size, kp).toBeLessThanOrEqual(150)
    }
  })
})

describe('分数的意义和性质：第 1 档出得到每个例题与做一做的题型', () => {
  const NEED: Record<string, string[]> = {
    'm5s2-05-meaning': ['pic', 'set', 'row', 'unit', 'ucount', 'make', 'onehas', 'onemake'],
    'm5s2-05-division': ['share', 'quot', 'todiv', 'fill', 'pw', 'times', 'rel'],
    'm5s2-05-proper': ['kind', 'kindtf', 'imp', 'make', 'line', 'name', 'cmp1'],
    'm5s2-05-mixed': ['int', 'mix', 'mixp', 'canint'],
    'm5s2-05-property': ['pp', 'ppsq', 'arc', 'toden', 'rule'],
    'm5s2-05-gcf': ['cfl', 'cfp', 'vmid', 'vwhere', 'vgcf', 'gcf', 'tile', 'tilecan'],
    'm5s2-05-reduce': ['simp', 'gdiv', 'psimp', 'issimp', 'eqm'],
    'm5s2-05-lcm': ['cmp', 'cmid', 'cwhere', 'vlcm', 'lcm', 'sq', 'gmin', 'gmay', 'nomax'],
    'm5s2-05-common': ['sd', 'sn', 'earth', 'bean', 'read', 'cden', 'cnum', 'cpair', 'dc'],
  }
  for (const kp of KPS) {
    it(kp, () => {
      const kinds = new Set<string>()
      const gen = getGenerator(kp)!
      for (let seed = 1; seed <= 400; seed++) kinds.add(kind(gen(1, createRng(seed))))
      for (const k of NEED[kp]!) expect(kinds, `${kp} 第 1 档没有 ${k}`).toContain(k)
    })
  }
})

describe('课本里的数', () => {
  /** 第 1 档多抽一些 */
  function sample(kpId: string, fn: (q: Question) => void, n = 3000): void {
    const gen = getGenerator(kpId)!
    for (let seed = 1; seed <= n; seed++) fn(gen(1, createRng(seed)))
  }

  it('例 1：一盒糖 12 颗分成 2 / 3 / 4 / 6 份；例 3 的 7/3 = 2 1/3、做一做 2 的 69/20 = 3 9/20', () => {
    const ks = new Set<string>()
    sample('m5s2-05-meaning', (q) => {
      if (sig(q).startsWith('set-candy-')) ks.add(sig(q).split('-')[2]!)
    })
    expect([...ks].sort()).toEqual(['2', '3', '4', '6'])
    const mix = new Set<string>()
    sample('m5s2-05-mixed', (q) => {
      if (textOf(q).key === 'toMixed') mix.add(`${String(textOf(q).p.f)}=${correctLabel(q)}`)
    })
    expect(mix).toContain(`7/3=2${MIXED_SEP}1/3`)
    expect(mix).toContain(`69/20=3${MIXED_SEP}9/20`)
  })

  it('例 2（分数的基本性质）：2/3 化成分母是 12 的分数是 8/12，10/24 是 5/12', () => {
    const seen = new Set<string>()
    sample('m5s2-05-property', (q) => {
      if (textOf(q).key === 'toDen') seen.add(`${String(textOf(q).p.f)}→${correctLabel(q)}/${String(textOf(q).p.D)}`)
    })
    expect(seen).toContain('2/3→8/12')
    expect(seen).toContain('10/24→5/12')
  })

  it('例 4（约分）：24/30 约成最简分数是 4/5，没约完的 12/15、8/10 是干扰项', () => {
    let found = 0
    sample('m5s2-05-reduce', (q) => {
      if (sig(q) !== 'simp-24/30') return
      found++
      expect(correctLabel(q)).toBe('4/5')
      expect(labels(q).filter((l) => l === '12/15' || l === '8/10').length).toBeGreaterThan(0)
    })
    expect(found).toBeGreaterThan(0)
  })

  it('最大公因数 / 最小公倍数：课本例题的数（8 和 12 → 4，18 和 27 → 9；4 和 6 → 12，6 和 8 → 24）', () => {
    const seen = new Map<string, string>()
    for (const kp of ['m5s2-05-gcf', 'm5s2-05-lcm']) sample(kp, (q) => (textOf(q).key === 'gcf' || textOf(q).key === 'lcm') && seen.set(`${textOf(q).key}-${textOf(q).p.a}-${textOf(q).p.b}`, correctLabel(q)))
    expect(seen.get('gcf-8-12')).toBe('4')
    expect(seen.get('gcf-18-27')).toBe('9')
    expect(seen.get('lcm-4-6')).toBe('12')
    expect(seen.get('lcm-6-8')).toBe('24')
  })
})
