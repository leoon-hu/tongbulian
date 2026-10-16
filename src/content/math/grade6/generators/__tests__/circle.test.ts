import { describe, expect, it } from 'vitest'
import type { GeoFig, GeoItem, GeoPt, LStr, Question, StemPart } from '@/types/models'
import '@/content/math/grade6' // 副作用：注册生成器与词条
import { createRng, getGenerator, labelKey } from '@/engine'
import { translate } from '@/engine/i18n'

// 六上「四 圆」的专项检查：答案都从题目本身（题干的参数、图上画的东西、签名里的数）另算一遍，不用生成器里的公式；
// 课本的每个例题、做一做在第 1 档出得到；选项里没有第二个对的；题干避开读不准的字。

const SEEDS = 150
const PI = 3.14
function each(kpId: string, fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator(kpId)!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const zh = (l: LStr): string => translate(l, 'zh')
const sigOf = (q: Question): string => q.id.slice(q.id.indexOf(':') + 1)
const kind = (q: Question): string => sigOf(q).split('-')[0]!
const sigParts = (q: Question): string[] => sigOf(q).split('-').slice(1)
type Geo = Extract<StemPart, { kind: 'geo' }>
const geoOf = (q: Question): Geo | undefined => q.stem.find((p): p is Geo => p.kind === 'geo')
const texts = (q: Question): { k: string; p: Record<string, unknown> }[] =>
  q.stem.flatMap((p) => (p.kind === 'text' ? [typeof p.text === 'string' ? { k: p.text, p: {} } : { k: p.text.k, p: (p.text.p ?? {}) as Record<string, unknown> }] : []))
const param = (q: Question, name: string): number => {
  for (const t of texts(q)) if (name in t.p) return Number(t.p[name])
  throw new Error(`${q.id} 题干里没有参数 ${name}`)
}
const textKey = (q: Question): string => texts(q).map((t) => t.k).join('|')
const answerLabel = (q: Question): LStr => q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)!.label
/** 答案：数字键盘的数；选项是数的取它的值；别的取词条键或字面量 */
const answer = (q: Question): string => (q.answer.kind === 'number' ? String(q.answer.value) : labelKey(answerLabel(q)))
const numAnswer = (q: Question): number => Number(q.answer.kind === 'number' ? q.answer.value : zh(answerLabel(q)))
const key = (k: string): string => labelKey({ k })
const near = (a: number, b: number, eps = 1e-6): boolean => Math.abs(a - b) < eps
const round = (x: number, n = 4): number => Math.round(x * 10 ** n) / 10 ** n

type Dot = Extract<GeoItem, { t: 'dot' }>
type Poly = Extract<GeoItem, { t: 'poly' }>
type Line = Extract<GeoItem, { t: 'line' }>
const dots = (f: GeoFig): Dot[] => f.items.filter((it): it is Dot => it.t === 'dot')
const circles = (f: GeoFig): Dot[] => dots(f).filter((d) => d.r !== undefined)
const points = (f: GeoFig): Dot[] => dots(f).filter((d) => d.r === undefined)
const polys = (f: GeoFig): Poly[] => f.items.filter((it): it is Poly => it.t === 'poly')
const lines = (f: GeoFig): Line[] => f.items.filter((it): it is Line => it.t === 'line')
const dist = (a: GeoPt, b: GeoPt): number => Math.hypot(a[0] - b[0], a[1] - b[1])
/** 多边形的面积（鞋带公式） */
const shoelace = (pts: GeoPt[]): number => Math.abs(pts.reduce((s, p, i) => s + p[0] * pts[(i + 1) % pts.length]![1] - pts[(i + 1) % pts.length]![0] * p[1], 0)) / 2

/** 图里每样东西：坐标是有限数、不写汉字、都有读屏说明 */
function figuresSane(q: Question): void {
  for (const part of q.stem) {
    if (part.kind !== 'geo') continue
    expect(part.alt.length, q.id).toBeGreaterThan(2)
    for (const fig of part.figs) {
      expect(fig.w > 0 && fig.h > 0, q.id).toBe(true)
      for (const it of fig.items) {
        const json = JSON.stringify(it)
        expect(json, q.id).not.toMatch(/NaN|Infinity|null/)
        expect(json, q.id).not.toMatch(/\p{Script=Han}/u)
      }
    }
  }
}

/** 题干与选项的中文：会被朗读，避开读不准的字（选项里的算式可以有括号，读「括号」） */
function speakable(q: Question): void {
  const stem = texts(q).map((t) => zh({ k: t.k, p: t.p as Record<string, string> })).join('｜')
  const all = [stem, ...(q.choices ?? []).map((c) => zh(c.label))].join('｜')
  // 「长」只在长度、长方形、周长、边长里（《墨经》「一中同长」单独报给主会话换字合成）
  expect(all.replace(/长度|长方形|周长|边长|一中同长/g, ''), q.id).not.toMatch(/长/)
  expect(all.replace(/转动|旋转/g, ''), q.id).not.toMatch(/转/)
  expect(all.replace(/测量|量角器/g, ''), q.id).not.toMatch(/量/)
  expect(all.replace(/因为|为什么/g, ''), q.id).not.toMatch(/为/)
  expect(all.replace(/得到/g, ''), q.id).not.toMatch(/得/)
  expect(all, q.id).not.toMatch(/着|还|只|数一数/)
  // 题干的文案里不写半角「?」（读成「几」）、不写圆括号（读成「括号」）；句末的全角问号照常，代进去的算式可以有括号
  for (const x of texts(q)) expect(zh({ k: x.k }), q.id).not.toMatch(/[?(（]/)
}

/** 数的选项：没有和答案相等的别的选项 */
function oneRight(q: Question): void {
  if (q.input !== 'choice') return
  const right = answerLabel(q)
  const v = Number(zh(right))
  if (!Number.isFinite(v)) return
  for (const c of q.choices!) if (c.label !== right) expect(near(Number(zh(c.label)), v), `${q.id} 选项 ${zh(c.label)} 和答案相等`).toBe(false)
}

const ALL = ['m6s1-05-circle', 'm6s1-05-sector', 'm6s1-05-circumference', 'm6s1-05-area', 'm6s1-05-ring', 'm6s1-05-composite', 'm6s1-05-square-circle']

describe('圆：通用检查', () => {
  for (const kp of ALL) {
    it(`${kp}：图都画得出来、题干读得准、数的选项只有一个对的`, () =>
      each(kp, (q) => {
        figuresSane(q)
        speakable(q)
        oneRight(q)
      }))
  }
})

/** 第 1 档出得到的签名种类（课本的每个例题、做一做） */
function firstTierKinds(kp: string): Set<string> {
  const out = new Set<string>()
  const gen = getGenerator(kp)!
  for (let seed = 1; seed <= 400; seed++) out.add(kind(gen(1, createRng(seed))))
  return out
}

describe('圆的认识（m6s1-05-circle）', () => {
  const KP = 'm6s1-05-circle'
  it('第 1 档出得到认一认、折一折、圆的大小和位置、做一做 1、2、练习十 1、2、7、8、9', () => {
    const k = firstTierKinds(KP)
    for (const x of ['name', 'def', 'pick', 'r2d', 'd2r', 'dec', 'count', 'judge', 'axes', 'pos', 'compass', 'care', 'fold', 'square', 'row', 'bed', 'trap']) expect(k, x).toContain(x)
  })
  it('答案从题目里另算一遍', () => {
    const NAME: Record<string, string> = { O: 'center', r: 'radius', d: 'diameter' }
    const JUDGE: Record<string, boolean> = { sameR: true, sameD: true, d2r: true, rHalf: true, fold: true, axis: true, dHalf: false, two: false }
    const TRAP: Record<string, boolean> = { ends: false, through: false, twoCircles: false, longest: true }
    const AXES: Record<string, string> = { one: 'countless', concentric: 'countless', cross: 'lines2', bigTwo: 'lines1', three: 'lines3', rect: 'lines2' }
    const SHAPE: Record<string, string> = { rect: 'lines2', square: 'lines4', equi: 'lines3', isoTrap: 'lines1', iso: 'lines1' }
    each(KP, (q) => {
      const k = kind(q)
      const s = sigParts(q)
      if (k === 'name') expect(answer(q), q.id).toBe(key(`m6.circ.w.${NAME[s[0]!]}`))
      if (k === 'def') expect(answer(q), q.id).toBe(key(`m6.circ.w.${s[0]}`))
      if (k === 'r2d') expect(numAnswer(q), q.id).toBe(2 * param(q, 'r'))
      if (k === 'd2r') expect(near(numAnswer(q), param(q, 'd') / 2), q.id).toBe(true)
      if (k === 'dec') expect(near(numAnswer(q), textKey(q).includes('r2dQ') ? param(q, 'r') * 2 : param(q, 'd') / 2), q.id).toBe(true)
      if (k === 'count' || k === 'axes') expect(answer(q), q.id).toBe(key('m6.circ.w.countless'))
      if (k === 'judge') expect(answer(q), q.id).toBe(key(JUDGE[s[0]!] ? 'm6.circ.yes' : 'm6.circ.no'))
      if (k === 'ctrap') expect(answer(q), q.id).toBe(key(TRAP[s[0]!] ? 'm6.circ.yes' : 'm6.circ.no'))
      if (k === 'pos') expect(answer(q), q.id).toBe(key(s[0] === 'center' ? 'm6.circ.w.position' : s[0] === 'radius' ? 'm6.circ.w.size' : 'm6.circ.w.radius'))
      if (k === 'compass') expect(near(numAnswer(q), s[0] === 'r' ? param(q, 'r') : param(q, 'd') / 2), q.id).toBe(true)
      if (k === 'care') expect(answer(q), q.id).toBe(key(s[0] === 'pin' ? 'm6.circ.w.fixed' : 'm6.circ.no'))
      if (k === 'fold') expect(answer(q), q.id).toBe(s[0] === 'point' ? key('m6.circ.w.center') : '2')
      if (k === 'square') {
        const a = param(q, 'a')
        expect(numAnswer(q), q.id).toBe(s[1] === 'd' ? a : a / 2)
        // 图：正方形里的圆碰到四条边（圆的直径 = 正方形的边）
        const f = geoOf(q)!.figs[0]!
        const sq = polys(f)[0]!.pts
        expect(near(circles(f)[0]!.r! * 2, dist(sq[0]!, sq[1]!), 0.2), q.id).toBe(true)
      }
      if (k === 'row' || k === 'rows2') {
        const n = param(q, 'n')
        const L = param(q, 'L')
        const f = geoOf(q)!.figs[0]!
        expect(circles(f).length, q.id).toBe(k === 'row' ? n : 2 * n)
        if (k === 'rows2') expect(numAnswer(q), q.id).toBe(2 * (L + (2 * L) / n))
        else expect(numAnswer(q), q.id).toBe(s[2] === 'dia' ? L / n : 2 * (L + L / n))
      }
      if (k === 'bed') expect(numAnswer(q), q.id).toBe(param(q, 'd') / 2)
      if (k === 'trap') expect(near(numAnswer(q), param(q, 'h')), q.id).toBe(true)
      if (k === 'axesfig') expect(answer(q), q.id).toBe(key(`m6.circ.w.${AXES[s[0]!]}`))
      if (k === 'axesshape') expect(answer(q), q.id).toBe(key(`m6.circ.w.${SHAPE[s[0]!]}`))
      if (k === 'life') expect(answer(q), q.id).toBe(key(s[0] === 'wheel' ? 'm6.circ.w.radius' : 'm6.circ.w.diameter'))
      if (k === 'mojing') expect(answer(q), q.id).toBe(key('m6.circ.w.radius'))
      if (k === 'ruler') {
        // 圆夹在两块三角尺之间：直径（像素）÷ 每厘米 24 像素 = 答案
        const f = geoOf(q)!.figs[0]!
        expect(near((circles(f)[0]!.r! * 2) / 24, numAnswer(q), 0.05), q.id).toBe(true)
      }
      if (k === 'pick') {
        // 选出的那幅：直径 = 两头在圆上且中点是圆心；半径 = 一头是圆心、一头在圆上。别的几幅都不是
        const figs = geoOf(q)!.figs
        const isIt = (f: GeoFig): boolean => {
          const c = circles(f)[0]!
          const o = points(f)[0]!.at
          const l = lines(f)[0]!
          const on = (p: GeoPt): boolean => near(dist(p, c.at), c.r!, 0.3)
          if (s[0] === 'dia') return on(l.a) && on(l.b) && near(dist([(l.a[0] + l.b[0]) / 2, (l.a[1] + l.b[1]) / 2], o), 0, 0.3)
          return (near(dist(l.a, o), 0, 0.3) && on(l.b)) || (near(dist(l.b, o), 0, 0.3) && on(l.a))
        }
        const right = Number(answer(q)) - 1
        figs.forEach((f, i) => expect(isIt(f), `${q.id} 第 ${i + 1} 幅`).toBe(i === right))
      }
      if (k === 'tri3') {
        // 选出的那幅：每个圆都经过另外两个圆心（半径 = 边长）
        const f = geoOf(q)!.figs[Number(answer(q)) - 1]!
        const cs = circles(f)
        expect(near(cs[0]!.r!, dist(cs[0]!.at, cs[1]!.at), 0.3), q.id).toBe(true)
      }
    })
  })
})

describe('扇形的认识（m6s1-05-sector）', () => {
  const KP = 'm6s1-05-sector'
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)
  it('第 1 档出得到弧 / 扇形 / 圆心角的定义、扇形例 1、做一做 1、2、练习十 5、6', () => {
    const k = firstTierKinds(KP)
    for (const x of ['def', 'fig', 'which', 'tofrac', 'todeg', 'split', 'shade', 'cmp', 'relate', 'sides', 'arcs', 'sym', 'life', 'draw', 'hq']) expect(k, x).toContain(x)
  })
  it('答案从题目里另算一遍', () => {
    const TRAP: Record<string, boolean> = { bigger: false, semi: true, only: false }
    each(KP, (q) => {
      const k = kind(q)
      const s = sigParts(q)
      if (k === 'def') expect(answer(q), q.id).toBe(key(`m6.circ.w.${s[0]}`))
      if (k === 'fig') expect(answer(q), q.id).toBe(key(s[0] === 'shape' ? 'm6.circ.w.sector' : s[0] === 'angle' ? 'm6.circ.w.central' : 'm6.circ.w.arc'))
      if (k === 'tofrac') {
        const n = param(q, 'n')
        const g = gcd(n, 360)
        expect(answer(q), q.id).toBe(`${n / g}/${360 / g}`)
      }
      if (k === 'todeg') {
        if (s[0] === 'half') expect(numAnswer(q), q.id).toBe(180)
        else {
          const [a, b] = String(texts(q)[0]!.p.f).split('/').map(Number)
          expect(numAnswer(q), q.id).toBe((360 * a!) / b!)
        }
      }
      if (k === 'split' || k === 'shade') {
        const fs = q.stem.find((p) => p.kind === 'frac-shape') as Extract<StemPart, { kind: 'frac-shape' }>
        const pic = fs.items[0]!
        expect(pic.parts, q.id).toBe(param(q, 'n'))
        expect(numAnswer(q), q.id).toBe(k === 'split' ? 360 / pic.parts : (360 * pic.shaded.length) / pic.parts)
      }
      if (k === 'cmp') {
        const a = param(q, 'a')
        const b = param(q, 'b')
        expect(answer(q), q.id).toBe(a > b ? '>' : a < b ? '<' : '=')
      }
      if (k === 'relate') expect(answer(q), q.id).toBe(key('m6.circ.w.byAngle'))
      if (k === 'sides') expect(answer(q), q.id).toBe(key('m6.circ.w.radius'))
      if (k === 'arcs') expect(numAnswer(q), q.id).toBe(1)
      if (k === 'sym') expect(answer(q), q.id).toBe(key(s[0] === 'judge' ? 'm6.circ.yes' : 'm6.circ.w.lines1'))
      if (k === 'life') expect(answer(q), q.id).toBe(key('m6.circ.w.sector'))
      if (k === 'draw') expect(answer(q), q.id).toBe(s[0] === 'r' ? String(param(q, 'r')) : key('m6.circ.w.protractor'))
      if (k === 'hq') {
        // 图上的扇形：圆心角从多边形两条半径的方向算出来
        const f = geoOf(q)!.figs[0]!
        const sec = polys(f).find((p) => p.fill)!
        const [c, a, ...rest] = sec.pts
        const b = rest[rest.length - 1]!
        const ang = (p: GeoPt): number => Math.atan2(-(p[1] - c![1]), p[0] - c![0])
        let deg = Math.round(((ang(b) - ang(a!)) * 180) / Math.PI)
        deg = ((deg % 360) + 360) % 360 || 360
        expect(numAnswer(q), q.id).toBe(deg === 360 ? 180 : deg)
      }
      if (k === 'which') {
        // 选出的那幅：角的顶点就是圆心
        const figs = geoOf(q)!.figs
        const right = Number(answer(q)) - 1
        figs.forEach((f, i) => {
          const o = points(f)[0]!.at
          const v = (f.items.find((it) => it.t === 'arc') as Extract<GeoItem, { t: 'arc' }>).at
          expect(near(dist(o, v), 0, 0.3), `${q.id} 第 ${i + 1} 幅`).toBe(i === right)
        })
      }
      if (k === 'trap') expect(answer(q), q.id).toBe(key(TRAP[s[0]!] ? 'm6.circ.yes' : 'm6.circ.no'))
      if (k === 'diffr') {
        // 两个扇形圆心角一样：半径大的那个大
        const figs = geoOf(q)!.figs
        const R = figs.map((f) => {
          const p = polys(f).find((x) => x.fill)!.pts
          return Math.max(...p.map((x) => dist(x, p[0]!)))
        })
        expect(answer(q), q.id).toBe(String(R[0]! > R[1]! ? 1 : 2))
      }
      if (k === 'clock') {
        const c = q.stem.find((p) => p.kind === 'clock') as Extract<StemPart, { kind: 'clock' }>
        expect(numAnswer(q), q.id).toBe(30 * Math.min(c.hour, 12 - c.hour))
      }
      if (k === 'dial') {
        const c = q.stem.find((p) => p.kind === 'dial') as Extract<StemPart, { kind: 'dial' }>
        expect(numAnswer(q), q.id).toBe(30 * c.to)
      }
      if (k === 'arcname') expect(answer(q), q.id).toBe(key('m6.circ.w.arcAB'))
      if (k === 'third') expect(numAnswer(q), q.id).toBe(360 - param(q, 'a') - param(q, 'b'))
      if (k === 'secarea') expect(numAnswer(q), q.id).toBe((param(q, 's') * param(q, 'a')) / 360)
    })
  })
})

describe('圆的周长（m6s1-05-circumference）', () => {
  const KP = 'm6s1-05-circumference'
  it('第 1 档出得到测量、圆周率、公式、周长例 1 两问、做一做 1、2、练习十一 1、3、4、5、11、练习十三 1', () => {
    const k = firstTierKinds(KP)
    for (const x of ['def', 'measure', 'three', 'pi', 'approx', 'formula', 'pj', 'byd', 'byr', 'fountain', 'tod', 'tor', 'wheel', 'turns', 'unicycle', 'fast', 'minute', 'table']) expect(k, x).toContain(x)
  })
  it('答案从题目里另算一遍（π 取 3.14）', () => {
    const MEASURE: Record<string, boolean> = { roll: true, rope: true, ruler: false }
    const PJ: Record<string, boolean> = { is314: false, times: true, endless: true }
    each(KP, (q) => {
      const k = kind(q)
      const s = sigParts(q)
      const v = numAnswer(q)
      const ok = (x: number): void => expect(near(v, round(x)), `${q.id}：${v} ≠ ${x}`).toBe(true)
      if (k === 'def') expect(answer(q), q.id).toBe(key('m6.circ.w.circumference'))
      if (k === 'measure') expect(answer(q), q.id).toBe(key(MEASURE[s[0]!] ? 'm6.circ.yes' : 'm6.circ.no'))
      if (k === 'pj') expect(answer(q), q.id).toBe(key(PJ[s[0]!] ? 'm6.circ.yes' : 'm6.circ.no'))
      if (k === 'three') ok(3)
      if (k === 'pi') expect(answer(q), q.id).toBe(s[0] === 'name' ? key('m6.circ.w.pi') : 'π')
      if (k === 'approx') expect(answer(q), q.id).toBe('3.14')
      if (k === 'formula') expect(['πd', '2πr'], q.id).toContain(answer(q))
      if (k === 'byd') ok(PI * param(q, 'd'))
      if (k === 'byr' || k === 'fountain') ok(PI * 2 * param(q, 'r'))
      if (k === 'tod') ok(param(q, 'c') / PI)
      if (k === 'tor') ok(param(q, 'c') / PI / 2)
      if (k === 'wheel') ok((PI * param(q, 'd')) / 100)
      if (k === 'turns') {
        expect(near(param(q, 'c'), round((PI * param(q, 'd')) / 100)), q.id).toBe(true)
        ok((param(q, 'L') * 1000) / param(q, 'c'))
      }
      if (k === 'unicycle') ok(param(q, 'L') / (PI * 0.4))
      if (k === 'fast') ok(PI * param(q, 'd'))
      if (k === 'minute') {
        const t = param(q, 't')
        const dial = q.stem.find((p) => p.kind === 'dial') as Extract<StemPart, { kind: 'dial' }>
        expect(dial.to * 5, q.id).toBe(t)
        ok(PI * 2 * param(q, 'l') * (t / 60))
      }
      if (k === 'table') {
        const tb = q.stem.find((p) => p.kind === 'stat-table') as Extract<StemPart, { kind: 'stat-table' }>
        const given = Number(tb.rows[0]![1])
        const from = labelKey(tb.rows[0]![0] as LStr)
        if (from === key('m6.circ.t.c')) ok(given / PI)
        if (from === key('m6.circ.t.d')) ok(PI * given)
        if (from === key('m6.circ.t.r')) ok(PI * 2 * given)
      }
      if (k === 'pavilion') ok((PI * param(q, 'n') * param(q, 's')) / 100)
      if (k === 'wire') ok(PI * 2 * param(q, 'r') * param(q, 'k'))
      if (k === 'stakes') ok(Math.floor((PI * 2 * param(q, 'r')) / 2))
      if (k === 'paper') ok(param(q, 'p') / 8)
      if (k === 'fill') {
        const r = param(q, 'r')
        if (s[0] === 'sq') ok(8 * r)
        if (s[0] === 'c' || s[0] === 'rc') ok(PI * 2 * r)
        if (s[0] === 'rect') ok(14 * r)
      }
      // 窗户的边长、直径只标在图上（window-{a}）
      if (k === 'window') ok(3 * Number(s[0]) + (PI * Number(s[0])) / 2)
      if (k === 'semi') ok((PI * param(q, 'd')) / 2 + param(q, 'd'))
      if (k === 'hoops') ok(Math.floor((param(q, 'L') * 100) / (PI * param(q, 'd'))))
      if (k === 'roller') ok(PI * param(q, 'd') * param(q, 'n') * param(q, 't'))
      if (k === 'scale') ok(param(q, 'n'))
      if (k === 'zu') expect(answer(q), q.id).toBe(key('m6.circ.w.zu'))
      if (k === 'jiuzhang') ok(3)
      if (k === 'yinperi') ok(PI * 2 * param(q, 'a'))
      if (k === 'rope') ok(4 * (param(q, 'n') - 1) * param(q, 'd') + PI * param(q, 'd'))
    })
  })
})

describe('圆的面积（m6s1-05-area）', () => {
  const KP = 'm6s1-05-area'
  it('第 1 档出得到数方格、剪拼、S = πr²、面积例 1 两问、做一做 1、2、练习十二 1–4', () => {
    const k = firstTierKinds(KP)
    for (const x of ['grid', 'ratio', 'finer', 'cut', 'side', 'formula', 'rsq', 'byr', 'byd', 'byc', 'wind', 'field', 'spray', 'both', 'table']) expect(k, x).toContain(x)
  })
  it('数方格的图：半径 10 格的 1/4 圆，满格 69 个、不满格 17 个（和课本一样）', () => {
    each(KP, (q) => {
      if (kind(q) !== 'grid') return
      const grids = geoOf(q)!.figs[0]!.items.filter((it): it is Extract<GeoItem, { t: 'grid' }> => it.t === 'grid')
      expect(grids[0]!.cells!.length, q.id).toBe(69)
      expect(grids[1]!.cells!.length, q.id).toBe(17)
    })
  })
  it('答案从题目里另算一遍（π 取 3.14）', () => {
    const AJ: Record<string, boolean> = { equal: false, double: false, circleBig: true }
    each(KP, (q) => {
      const k = kind(q)
      const s = sigParts(q)
      const v = numAnswer(q)
      const ok = (x: number): void => expect(near(v, round(x)), `${q.id}：${v} ≠ ${x}`).toBe(true)
      if (k === 'grid') ok(s[0] === 'half' ? (69 + 17 / 2) * 4 : s[0] === 'one' ? (69 + 17) * 4 : 69 * 4)
      if (k === 'ratio') expect(answer(q), q.id).toBe('3.1')
      if (k === 'finer') expect(answer(q), q.id).toBe(key('m6.circ.yes'))
      if (k === 'cut') expect(answer(q), q.id).toBe(key('m6.circ.w.rect'))
      if (k === 'side') expect(answer(q), q.id).toBe(key(s[0] === 'len' ? 'm6.circ.w.halfC' : 'm6.circ.w.radius'))
      if (k === 'formula') expect(answer(q), q.id).toBe('πr²')
      if (k === 'rsq') expect(answer(q), q.id).toBe('r × r')
      if (k === 'byr') ok(PI * param(q, 'r') ** 2)
      if (k === 'byd') {
        const d = textKey(q).includes('table') ? 1 : textKey(q).includes('embroidery') ? 20 : param(q, 'd')
        ok(PI * (d / 2) ** 2)
      }
      if (k === 'byc') ok(PI * (param(q, 'c') / PI / 2) ** 2)
      if (k === 'wind') ok(PI * param(q, 'r') ** 2)
      if (k === 'field') {
        // 题里只给扫风面积 s（field-{r}）
        expect(near(param(q, 's'), PI * Number(s[0]) ** 2), q.id).toBe(true)
        ok(Math.round(param(q, 's') / (105 * 68)))
      }
      if (k === 'spray') ok(PI * param(q, 'r') ** 2)
      if (k === 'both') ok(s[0] === 'c' ? PI * param(q, 'd') : PI * (param(q, 'd') / 2) ** 2)
      if (k === 'table') {
        const tb = q.stem.find((p) => p.kind === 'stat-table') as Extract<StemPart, { kind: 'stat-table' }>
        const given = Number(tb.rows[0]![1])
        ok(labelKey(tb.rows[0]![0] as LStr) === key('m6.circ.t.r') ? PI * given ** 2 : PI * (given / 2) ** 2)
      }
      if (k === 'aj') expect(answer(q), q.id).toBe(key(AJ[s[0]!] ? 'm6.circ.yes' : 'm6.circ.no'))
      if (k === 'ascale') ok(param(q, 'n') ** 2)
      if (k === 'part') ok((PI * param(q, 'r') ** 2) / (s[0] === 'half' ? 2 : 4))
      if (k === 'grow') {
        const r = param(q, 'c') / PI / 2
        ok(PI * ((r + param(q, 'k')) ** 2 - r ** 2))
      }
      if (k === 'enclose') {
        if (s[0] === 'shape') expect(answer(q), q.id).toBe(key('m6.circ.w.circle'))
        else ok(PI * (param(q, 'c') / PI / 2) ** 2)
      }
      if (k === 'geyuan') expect(answer(q), q.id).toBe(key('m6.circ.w.geyuan'))
      if (k === 'ainv') ok(Math.sqrt(param(q, 's') / PI))
      if (k === 'gc') {
        // 自己数图上的格子：格子的四个角都在 1/4 圆里 = 满格，有一部分在圆里 = 不满格
        const f = geoOf(q)!.figs[0]!
        const R = (f.items.find((it) => it.t === 'grid') as Extract<GeoItem, { t: 'grid' }>).w
        let full = 0
        let part = 0
        for (let c = 0; c < R; c++)
          for (let r = 0; r < R; r++) {
            const corners: GeoPt[] = [
              [c, r],
              [c + 1, r],
              [c, r + 1],
              [c + 1, r + 1],
            ]
            const inside = corners.filter(([x, y]) => x * x + (R - y) ** 2 <= R * R + 1e-9).length
            if (inside === 4) full++
            else if (corners.some(([x, y]) => x * x + (R - y) ** 2 < R * R - 1e-9)) part++
          }
        if (s[0] === 'full') ok(full)
        else {
          expect(param(q, 'f'), q.id).toBe(full)
          expect(param(q, 'p'), q.id).toBe(part)
          ok((full + part / 2) * 4)
        }
      }
    })
  })
})

describe('圆环的面积（m6s1-05-ring）', () => {
  const KP = 'm6s1-05-ring'
  it('第 1 档出得到面积例 2 的两种算法、做一做 ①、练习十二 5–8、练习十三 4', () => {
    const k = firstTierKinds(KP)
    for (const x of ['name', 'how', 'ways', 'jade', 'byr', 'byd', 'width', 'inner', 'carousel', 'tissue', 'washer', 'pos', 'coin', 'rj']) expect(k, x).toContain(x)
  })
  it('答案从题目里另算一遍（π 取 3.14）', () => {
    each(KP, (q) => {
      const k = kind(q)
      const s = sigParts(q)
      const v = numAnswer(q)
      const ok = (x: number): void => expect(near(v, round(x)), `${q.id}：${v} ≠ ${x}`).toBe(true)
      const ring = (D: number, d: number): number => PI * ((D / 2) ** 2 - (d / 2) ** 2)
      if (k === 'name') expect(answer(q), q.id).toBe(key('m6.circ.w.ring'))
      if (k === 'how') expect(answer(q), q.id).toBe(key('m6.circ.w.ringMinus'))
      if (k === 'ways') {
        if (s[0] === 'j') expect(answer(q), q.id).toBe(key('m6.circ.yes'))
        else expect(answer(q), q.id).toBe(`3.14 × (${param(q, 'R')}² − ${param(q, 'r')}²)`)
      }
      if (k === 'jade') expect(answer(q), q.id).toBe(s[0] === 'expr' ? '3.14 × (13.15² − 2.7²)' : String(Math.round(ring(26.3, 5.4) * 10) / 10))
      if (k === 'byr') {
        // 图上的两条尺寸线：外圆半径、内圆半径
        const dims = lines(geoOf(q)!.figs[0]!).filter((l) => l.dim)
        const [R, r] = dims.map((l) => Number(l.dim))
        ok(PI * (R! ** 2 - r! ** 2))
      }
      if (k === 'byd' || k === 'tissue' || k === 'washer') ok(ring(param(q, 'D'), param(q, 'd')))
      if (k === 'width') ok(param(q, 'R') - param(q, 'r'))
      if (k === 'inner') ok(PI * ((param(q, 'r') + param(q, 'w')) ** 2 - param(q, 'r') ** 2))
      if (k === 'carousel') {
        const R = param(q, 'd') / 2 + param(q, 'w')
        ok(s[0] === 'in' ? PI * R ** 2 : PI * (R ** 2 - (param(q, 'd') / 2) ** 2))
      }
      if (k === 'pos') {
        if (s[0] === 'j') expect(answer(q), q.id).toBe(key('m6.circ.no'))
        else ok(PI * (param(q, 's') ** 2 - (param(q, 's') / 2) ** 2))
      }
      if (k === 'coin') ok(PI * (param(q, 'D') / 2) ** 2 - param(q, 'a') ** 2)
      if (k === 'rj') expect(answer(q), q.id).toBe(key(s[0] === 'minus' ? 'm6.circ.yes' : 'm6.circ.no'))
      if (k === 'rs') {
        if (s[0] === 'name') expect(answer(q), q.id).toBe(key('m6.circ.w.ringSector'))
        else {
          const R = param(q, 'R')
          const w = param(q, 'w')
          ok((PI * (R ** 2 - (R - w) ** 2)) / (s[0] === 'one' ? 4 : 2))
        }
      }
      if (k === 'tulou') {
        const big = ring(34, 14)
        const small = ring(26, 14)
        ok(s[0] === 'diff' ? big - small : s[0] === 'big' ? big : small)
      }
      if (k === 'target') {
        // 十环：直径 0.5 毫米的圆；九环：外圆直径 5.5 毫米、去掉十环的一圈
        const ten = 0.25 ** 2
        const nine = 2.75 ** 2 - ten
        expect(answer(q), q.id).toBe(`1/${Math.round(nine / ten)}`)
        expect(near(nine / ten, 120), q.id).toBe(true)
      }
    })
  })
})

describe('组合图形的面积（m6s1-05-composite）', () => {
  const KP = 'm6s1-05-composite'
  it('第 1 档出得到面积例 3 的两幅图、做一做 ②③、练习十二 9、10、17、练习十三 7', () => {
    const k = firstTierKinds(KP)
    for (const x of ['rot', 'shift', 'corner', 'conc', 'sqq', 'stadium', 'petal', 'dog', 'pin', 'lawn', 'win']) expect(k, x).toContain(x)
  })
  it('答案从题目里另算一遍（π 取 3.14）', () => {
    each(KP, (q) => {
      const k = kind(q)
      const s = sigParts(q)
      const v = numAnswer(q)
      const ok = (x: number): void => expect(near(v, round(x)), `${q.id}：${v} ≠ ${x}`).toBe(true)
      if (k === 'rot') {
        if (s[0] === 'which') expect(answer(q), q.id).toBe(key('m6.circ.w.bigSemi'))
        else ok((PI * param(q, 'a') ** 2) / 2)
      }
      if (k === 'shift') ok(2 * param(q, 'r') ** 2)
      if (k === 'corner') {
        const [a, b] = s.map(Number)
        ok(a! * (a! + b!))
      }
      if (k === 'conc') {
        const kk = Number(s[0])
        ok((PI * (3 * kk) ** 2) / 4)
      }
      if (k === 'sqq') ok(param(q, 'a') ** 2 - (PI * param(q, 'a') ** 2) / 4)
      if (k === 'stadium') {
        const L = param(q, 'L')
        const r = param(q, 'r')
        ok(s[0] === 'c' ? 2 * L + PI * 2 * r : 2 * r * L + PI * r * r)
      }
      if (k === 'petal') {
        const a = param(q, 'a')
        ok(s[0] === 'c' ? 4 * ((PI * a) / 2) : a * a + 4 * ((PI * (a / 2) ** 2) / 2))
      }
      if (k === 'dog') ok((PI * param(q, 'l') ** 2 * 3) / 4)
      if (k === 'pin') {
        const a = param(q, 'a')
        ok(s[0] === 'c' ? 4 * a + 4 * ((PI * 2 * a) / 4) : a * a + 4 * ((PI * a * a) / 4))
      }
      if (k === 'lawn') ok(PI * (param(q, 'd') / 2) ** 2)
      if (k === 'win') ok(param(q, 'a') ** 2 + (PI * (param(q, 'a') / 2) ** 2) / 2)
      if (k === 'lawnp') {
        // 半圆的周长 = 3.14r + 2r
        const r = param(q, 'c') / (PI + 2)
        ok(PI * r * r)
      }
      if (k === 'trisemi') ok(Number(s[0]) ** 2 / 4)
      if (k === 'twosemi') ok(PI * (param(q, 'a') / 2) ** 2 - param(q, 'a') ** 2 / 2)
      if (k === 'tricircle') ok(4 * param(q, 's'))
    })
  })
  it('图里涂色部分的面积（多边形逼近）和答案的比例一致', () => {
    each(KP, (q) => {
      const k = kind(q)
      const s = sigParts(q)
      const f = geoOf(q)?.figs[0]
      if (!f) return
      const shaded = polys(f).filter((p) => p.fill && p.fill !== 'paper' && !p.dash)
      const area = shaded.reduce((sum, p) => sum + shoelace(p.pts), 0)
      if (k === 'corner') {
        // 涂色 = a × (a + b) 个单位正方形：用图里正方形的边长换算
        const [a, b] = s.map(Number)
        const frame = polys(f)[0]!.pts
        const U = dist(frame[0]!, frame[1]!) / (2 * a! + b!)
        expect(near(area / (U * U), a! * (a! + b!), 0.1), q.id).toBe(true)
      }
      if (k === 'trisemi') {
        // 两块涂色合起来是直角边平方的 1/4（图里直角边是 100）
        expect(near(area, 2500, 25), q.id).toBe(true)
      }
      if (k === 'conc') {
        // 三块合起来是大圆的 1/4（图里大圆半径 66）
        expect(near(area / ((Math.PI * 66 * 66) / 4), 1, 0.01), q.id).toBe(true)
      }
    })
  })
})

describe('外方内圆和外圆内方（m6s1-05-square-circle）', () => {
  const KP = 'm6s1-05-square-circle'
  it('第 1 档出得到面积例 4 的阅读理解、两张表、发现、回顾反思和做一做', () => {
    const k = firstTierKinds(KP)
    for (const x of ['mean', 'edge', 'outsq', 'insq', 'tri', 'piform', 'qj', 'twice', 'outs', 'ins', 'shr']) expect(k, x).toContain(x)
  })
  it('答案从题目里另算一遍（π 取 3.14）', () => {
    const QJ: Record<string, boolean> = { always: true, bigger: false, outBig: true }
    each(KP, (q) => {
      const k = kind(q)
      const s = sigParts(q)
      const v = numAnswer(q)
      const ok = (x: number): void => expect(near(v, round(x)), `${q.id}：${v} ≠ ${x}`).toBe(true)
      if (k === 'mean') {
        if (s[0] === 'fig') {
          // 选出的那幅：外方内圆 = 圆在正方形里面（圆的直径 = 正方形的边）；外圆内方 = 正方形的顶点在圆上
          const f = geoOf(q)!.figs[Number(answer(q)) - 1]!
          const c = circles(f)[0]!
          const sq = polys(f)[0]!.pts
          const side = dist(sq[0]!, sq[1]!)
          if (s[1] === 'out') expect(near(side, 2 * c.r!, 0.3), q.id).toBe(true)
          else expect(near(dist(sq[0]!, c.at), c.r!, 0.3), q.id).toBe(true)
        } else expect(answer(q), q.id).toBe(key(s[0] === 'out' ? 'm6.circ.w.outSq' : 'm6.circ.w.inSq'))
      }
      if (k === 'edge') expect(answer(q), q.id).toBe(key('m6.circ.w.diameter'))
      if (k === 'outsq') ok(4 * param(q, 'r') ** 2)
      if (k === 'insq') ok(2 * param(q, 'r') ** 2)
      if (k === 'tri') expect(answer(q), q.id).toBe(key(s[0] === 'base' ? 'm6.circ.w.diameter' : 'm6.circ.w.radius'))
      if (k === 'piform') expect(answer(q), q.id).toBe(`${param(q, 'r') ** 2}π`)
      if (k === 'qj') expect(answer(q), q.id).toBe(key(QJ[s[0]!] ? 'm6.circ.yes' : 'm6.circ.no'))
      if (k === 'twice') ok(2)
      if (k === 'outs') {
        // 外方内圆：r² = 正方形面积 ÷ 4
        const r2 = param(q, 's') / 4
        ok(s[0] === 'c' ? PI * r2 : param(q, 's') - PI * r2)
      }
      if (k === 'ins') {
        // 外圆内方：正方形 = 2r²，r² = 正方形面积 ÷ 2
        const r2 = param(q, 's') / 2
        ok(s[0] === 'c' ? PI * r2 : PI * r2 - param(q, 's'))
      }
      if (k === 'shr') {
        const r = param(q, 'r')
        ok(s[0] === 'out' ? 4 * r * r - PI * r * r : PI * r * r - 2 * r * r)
      }
      if (k === 'cornersq') ok(PI * param(q, 's'))
      if (k === 'nested') ok(param(q, 's') / 2)
      if (k === 'layers') expect(answer(q), q.id).toBe('1/2')
    })
  })
})
