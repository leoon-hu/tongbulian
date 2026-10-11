import { describe, expect, it } from 'vitest'
import type { GeoFig, GeoItem, GeoPt, LStr, MotionItem, Question, StemPart } from '@/types/models'
import '@/content/math/grade5' // 副作用：注册生成器与词条
import { createRng, getGenerator, labelKey } from '@/engine'
import { translate } from '@/engine/i18n'
import { type Rot, TRI_OLD, rotAbout } from '../motion'

// 五下「图形的运动（三）」（旧版）：旋转题用的是五上的办法，这里查旧书的数（例 3 的三角形 AOB、练习二十一 4 的图形 OABC、
// 5 的小旗）、旧书的说法（「按顺时针方向」「从 12 到 1」），答案从图和参数重新推一遍。

const SEEDS = 150
const KP = 'm5s2-06-rotate'
const zh = (l: LStr): string => translate(l, 'zh')
function each(fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator(KP)!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const sigOf = (q: Question): string => q.id.slice(q.id.indexOf(':') + 1)
const kind = (q: Question): string => sigOf(q).split('-')[0]!
type Geo = Extract<StemPart, { kind: 'geo' }>
type Dial = Extract<StemPart, { kind: 'dial' }>
type Motion = Extract<StemPart, { kind: 'motion-figs' }>
const geoOf = (q: Question): Geo => q.stem.find((p): p is Geo => p.kind === 'geo')!
const textOf = (q: Question): { k: string; p: Record<string, unknown> } => {
  const t = (q.stem.find((p) => p.kind === 'text') as { text: LStr }).text
  return typeof t === 'string' ? { k: t, p: {} } : { k: t.k, p: (t.p ?? {}) as Record<string, unknown> }
}
const answerLabel = (q: Question): LStr => q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)!.label
const answer = (q: Question): string => (q.answer.kind === 'number' ? String(q.answer.value) : labelKey(answerLabel(q)))
const key = (k: string): string => labelKey({ k })
const turnOf = (l: unknown): Rot => (l as { k: string }).k.split('.').pop() as Rot
type Poly = Extract<GeoItem, { t: 'poly' }>
type Txt = Extract<GeoItem, { t: 'text' }>
type Dot = Extract<GeoItem, { t: 'dot' }>
const polys = (f: GeoFig): Poly[] => f.items.filter((it): it is Poly => it.t === 'poly')
const texts = (f: GeoFig): Txt[] => f.items.filter((it): it is Txt => it.t === 'text')
const dots = (f: GeoFig): Dot[] => f.items.filter((it): it is Dot => it.t === 'dot')
const dist = (a: GeoPt, b: GeoPt): number => Math.hypot(a[0] - b[0], a[1] - b[1])
const same = (a: GeoPt, b: GeoPt): boolean => dist(a, b) < 1e-6
const samePointSet = (a: GeoPt[], b: GeoPt[]): boolean => a.length === b.length && a.every((p) => b.some((q) => dist(p, q) < 0.01))
const badgeNear = (f: GeoFig, c: GeoPt): string =>
  texts(f)
    .filter((t) => t.badge)
    .sort((a, b) => dist(a.at, c) - dist(b.at, c))[0]!.text

describe('图形的运动（三）（旧版）：课本的图', () => {
  it('例 3：三角形 AOB 的直角在 O，A 在 O 上面 4 格、B 在右边 3 格；按顺时针方向旋转 90° 后 A 在右边 4 格、B 在下面 3 格', () => {
    expect([TRI_OLD.A[0] - TRI_OLD.O[0], TRI_OLD.A[1] - TRI_OLD.O[1]]).toEqual([0, -4])
    expect([TRI_OLD.B[0] - TRI_OLD.O[0], TRI_OLD.B[1] - TRI_OLD.O[1]]).toEqual([3, 0])
    expect(rotAbout(TRI_OLD.A, TRI_OLD.O, 'cw')).toEqual([9, 6])
    expect(rotAbout(TRI_OLD.B, TRI_OLD.O, 'cw')).toEqual([5, 9])
    // 做一做：按逆时针方向
    expect(rotAbout(TRI_OLD.A, TRI_OLD.O, 'ccw')).toEqual([1, 6])
    expect(rotAbout(TRI_OLD.B, TRI_OLD.O, 'ccw')).toEqual([5, 3])
  })
})

describe('旋转（m5s2-06-rotate）', () => {
  it('从题目反推答案', () => {
    const J: Record<string, boolean> = { center: true, turnDir: true, movePos: true, size: true, shape: false }
    const SELF: Record<string, boolean> = { rect180: true, rect90: false, square90: true, circle: true }
    each((q) => {
      const k = kind(q)
      const t = textOf(q)
      expect(t.k.startsWith('m5.rot.'), q.id).toBe(true)
      if (k === 'dial') {
        const dial = q.stem.find((p): p is Dial => p.kind === 'dial')!
        const { a, b } = t.p as { a: number; b: number }
        expect([dial.from, dial.to]).toEqual([a, b])
        expect(answer(q), q.id).toBe(String(30 * ((b - a + 12) % 12)))
      } else if (k === 'dialto') {
        const { a, deg } = t.p as { a: number; deg: number }
        expect(answer(q), q.id).toBe(String(((a - 1 + deg / 30) % 12) + 1))
      } else if (k === 'gate') {
        const raise = sigOf(q).endsWith('-up')
        const left = sigOf(q).split('-')[1] === 'left'
        expect(answer(q), q.id).toBe(key(`m5.rot.way.${left === raise ? 'cw' : 'ccw'}`))
      } else if (k === 'gatedeg') {
        expect(answer(q)).toBe('90')
      } else if (k === 'setsq') {
        const DIRV: Record<string, GeoPt> = { up: [0, -1], right: [1, 0], down: [0, 1], left: [-1, 0] }
        const { way, from } = t.p as { way: { k: string }; from: { k: string } }
        const to = rotAbout(DIRV[from.k.split('.').pop()!]!, [0, 0], way.k.split('.').pop() as Rot)
        expect(answer(q), q.id).toBe(key(`m5.rot.to.${Object.keys(DIRV).find((x) => same(DIRV[x]!, to))}`))
      } else if (k === 'trifig') {
        const r = turnOf(t.p.turn)
        const ok = geoOf(q).figs.map((f) => {
          const orig = polys(f).find((p) => !p.dash)!.pts
          const O = dots(f).find((d) => d.label === 'O')!.at
          return samePointSet(orig.map((p) => rotAbout(p, O, r)), polys(f).find((p) => p.dash)!.pts)
        })
        expect(ok.filter(Boolean).length, q.id).toBe(1)
        expect(answer(q), q.id).toBe(String(ok.indexOf(true) + 1))
      } else if (k === 'tripoint') {
        const f = geoOf(q).figs[0]!
        const A = dots(f).find((d) => d.label === 'A')!.at
        const O = dots(f).find((d) => d.label === 'O')!.at
        expect(answer(q), q.id).toBe(badgeNear(f, rotAbout(A, O, turnOf(t.p.turn))))
      } else if (k === 'trilen') {
        const f = geoOf(q).figs[0]!
        expect(answer(q), q.id).toBe(String(dist(dots(f).find((d) => d.label === 'A')!.at, dots(f).find((d) => d.label === 'O')!.at)))
      } else if (k === 'four' || k === 'fourhow') {
        // 图形 OABC 或小旗：答案那个正好是原来的绕 O 转过去的（小旗的两块都要对上）
        const f = geoOf(q).figs[0]!
        const O = dots(f).find((d) => d.label === 'O')!.at
        const flag = sigOf(q).includes('-flag-')
        const per = flag ? 2 : 1
        const all = polys(f)
        const orig = all.slice(0, per)
        const copies = [0, 1, 2].map((i) => all.slice(per + i * per, per + i * per + per))
        const turnFor = (ps: Poly[]): Rot => (['cw', 'ccw', 'half'] as Rot[]).find((r) => ps.every((p, j) => samePointSet(orig[j]!.pts.map((x) => rotAbout(x, O, r)), p.pts)))!
        const tipOf = (ps: Poly[]): GeoPt => ps.flatMap((p) => p.pts).sort((a, b) => dist(b, O) - dist(a, O))[0]!
        if (k === 'four') {
          const r = turnOf(t.p.turn)
          expect(answer(q), q.id).toBe(badgeNear(f, tipOf(copies.find((c) => turnFor(c) === r)!)))
        } else {
          const hit = copies.find((c) => badgeNear(f, tipOf(c)) === String(t.p.n))!
          expect(answer(q), q.id).toBe(key(`m5.rot.turn.${turnFor(hit)}`))
        }
      } else if (k === 'rect') {
        const r = turnOf(t.p.turn)
        const ok = geoOf(q).figs.map((f) => {
          const A = dots(f).find((d) => d.label === 'A')!.at
          return samePointSet(polys(f).find((p) => !p.dash)!.pts.map((p) => rotAbout(p, A, r)), polys(f).find((p) => p.dash)!.pts)
        })
        expect(answer(q), q.id).toBe(String(ok.indexOf(true) + 1))
      } else if (k === 'pend') {
        const it = q.stem.find((p): p is Motion => p.kind === 'motion-figs')!.items[0] as MotionItem
        expect(answer(q), q.id).toBe(key(`m5.rot.way.${it.swing === 'left' ? 'cw' : 'ccw'}`))
      } else if (k === 'pin') {
        const [a, b] = q.stem.find((p): p is Motion => p.kind === 'motion-figs')!.items.map((it) => (it as MotionItem).spin ?? 0)
        const turn = ((b! - a!) % 360 + 360) % 360
        expect(answer(q), q.id).toBe(turn === 180 ? '180' : key(`m5.rot.way.${turn === 90 ? 'cw' : 'ccw'}`))
      } else if (k === 'card') {
        const f = geoOf(q).figs[0]!
        const reds = polys(f).filter((p) => p.fill === 'd')
        const cards = polys(f).filter((p) => p.fill === 'paper')
        const cornerOf = (i: number): number => cards[i]!.pts.findIndex((c) => same(c, reds[i]!.pts[0]!))
        expect(answer(q), q.id).toBe(key(cornerOf(0) === cornerOf(1) ? 'm5.rot.translate' : 'm5.rot.rotate'))
      } else if (k === 'j') {
        expect(answer(q), q.id).toBe(key(J[sigOf(q).slice(2)] ? 'm5.rot.yes' : 'm5.rot.no'))
      } else if (k === 'self') {
        expect(answer(q), q.id).toBe(key(SELF[sigOf(q).slice(5)] ? 'm5.rot.yes' : 'm5.rot.no'))
      } else if (k === 'pieces') {
        expect(answer(q)).toBe('9')
      } else {
        throw new Error(`没见过的题：${q.id}`)
      }
    })
  })

  it('第 1 档覆盖例 1–4 与做一做（旧书例 3 的三角形出得到）；第 2 档有练习二十一 2–5；第 3 档有练习二十一 6、练习二十二 1', () => {
    const seen = new Set<string>()
    each((q, d) => {
      seen.add(`${d}-${kind(q)}`)
      if (sigOf(q).startsWith(`trifig-${TRI_OLD.id}-`)) seen.add(`${d}-book`)
      if (sigOf(q).includes('-kiteo-')) seen.add(`${d}-kiteo`)
      if (sigOf(q).includes('-flag-')) seen.add(`${d}-flag`)
    })
    for (const k of ['1-dial', '1-dialto', '1-gate', '1-setsq', '1-trifig', '1-book', '1-tripoint', '1-trilen', '1-j', '2-pend', '2-pin', '2-kiteo', '2-flag', '2-card', '3-self', '3-pieces'])
      expect(seen.has(k), k).toBe(true)
  })

  it('用词：旧书的「按顺时针方向」；不提「杆」「标着」「指着」，没有圆括号', () => {
    each((q) => {
      for (const t of [...q.stem.filter((p) => p.kind === 'text').map((p) => zh((p as { text: LStr }).text)), ...(q.choices ?? []).map((c) => zh(c.label))]) {
        expect(t, q.id).not.toMatch(/杆|标着|指着|[（）()]/)
        expect(t, q.id).not.toMatch(/(?<!按)顺时针旋转/)
      }
    })
  })
})
