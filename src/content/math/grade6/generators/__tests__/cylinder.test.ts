import { describe, expect, it } from 'vitest'
import type { GeoFig, GeoItem, LParam, LStr, Question, RoundSolidSpec, StemPart } from '@/types/models'
import '@/content/math/grade6' // 副作用：注册生成器与词条
import { createRng, getGenerator } from '@/engine'
import { translate } from '@/engine/i18n'
import { ZH } from '../../lang/cylinder'
import { FACE_CTX, HAT_ROUND, KP_CA, KP_CC, KP_CK, KP_CN, KP_CS, KP_CV, KP_OK, KP_OV, OBJ_CONE, OBJ_CYL, PEN_ROUND } from '../cylinder'

// 六下「圆柱与圆锥」：从题目（题目文字的参数、图上标的数、图里画的是什么）另算一遍答案，150 种子 × 三档；
// 外加课本的约束——每个知识点第 1 档出得到例题和做一做的题、进一法的变式进一法和四舍五入结果不一样、
// 题目文字不写容易读错的字、选项里没有单独一个小写字母。
// 这里的算法和生成器分开写（π 取 3.14，结果去掉浮点尾巴再比）。

const zh = (l: LStr): string => translate(l, 'zh')
const SEEDS = 150
const KPS = [KP_CK, KP_CN, KP_CS, KP_CA, KP_CV, KP_CC, KP_OK, KP_OV]
const P = 3.14
const r6 = (v: number): number => Math.round(v * 1e6) / 1e6
const up10 = (v: number): number => Math.ceil(r6(v) / 10 - 1e-9) * 10
const near10 = (v: number): number => Math.floor(r6(v) / 10 + 0.5) * 10
const nearInt = (v: number): number => Math.floor(r6(v) + 0.5)

type Text = { k: string; p: Record<string, LParam> }
function each(kp: string, fn: (q: Question, d: 1 | 2 | 3) => void): void {
  const gen = getGenerator(kp)!
  for (let seed = 1; seed <= SEEDS; seed++) for (const d of [1, 2, 3] as const) fn(gen(d, createRng(seed)), d)
}
const fam = (q: Question): string => q.id.split(':')[1]!.split('-')[0]!
const texts = (q: Question): Text[] =>
  q.stem.filter((p): p is Extract<StemPart, { kind: 'text' }> => p.kind === 'text').map((p) => p.text as Text).map((t) => ({ k: t.k.replace(/^m6\.cyl\./, ''), p: t.p ?? {} }))
/** 题目文字（去掉「图中的单位是……」）里第一段的键和全部参数 */
function main(q: Question): Text {
  const ts = texts(q).filter((t) => t.k !== 'unitIs')
  return { k: ts.map((t) => t.k).join('+'), p: Object.assign({}, ...ts.map((t) => t.p)) }
}
const n = (v: LParam | undefined): number => Number(v)
const keyOf = (l: LStr): string => (typeof l === 'string' ? l : l.k.replace(/^m6\.cyl\./, ''))
const choiceLabel = (q: Question): LStr => q.choices!.find((c) => c.id === (q.answer as { choiceId: string }).choiceId)!.label
const numAnswer = (q: Question): number => (q.answer.kind === 'number' ? q.answer.value : Number(zh(choiceLabel(q))))
const solids = (q: Question): RoundSolidSpec[] => (q.stem.find((p) => p.kind === 'round-solid') as Extract<StemPart, { kind: 'round-solid' }> | undefined)?.items ?? []
const geos = (q: Question): GeoFig[] => (q.stem.find((p) => p.kind === 'geo') as Extract<StemPart, { kind: 'geo' }> | undefined)?.figs ?? []
const polys = (f: GeoFig): Extract<GeoItem, { t: 'poly' }>[] => f.items.filter((i): i is Extract<GeoItem, { t: 'poly' }> => i.t === 'poly')
const figTexts = (f: GeoFig): string[] => f.items.filter((i): i is Extract<GeoItem, { t: 'text' }> => i.t === 'text').map((i) => i.text)
/** 长方形 ABCD（AB 竖着、BC 横着）：边上标的数在右边（CD = AB）和下边（BC） */
function rect(q: Question): { a: number; b: number } {
  const labels = polys(geos(q)[0]!)[0]!.labels!
  return { a: Number(labels[2]), b: Number(labels[1]) }
}
/** 图上标的半径（标的是直径就除以 2）和高 */
function rh(s: RoundSolidSpec): { r: number; h: number } {
  const lab = s.labels!
  return { r: lab.r !== undefined ? Number(lab.r) : Number(lab.d) / 2, h: Number(lab.h) }
}
const cylV = (r: number, h: number): number => r6(P * r * r * h)
const cylS = (r: number, h: number): number => r6(2 * P * r * h + 2 * P * r * r)
/** 能不能围成圆柱：长方形和底面周长相等的那条边 = 3.14 × 直径 */
function netOk(f: GeoFig): boolean {
  const ts = figTexts(f)
  return r6(P * Number(ts[0])) === r6(Number(ts[ts.length - 1]))
}

/** 每种题另算的答案：数（number）或选项的词条键（string） */
function expected(q: Question): number | string | null {
  const { k, p } = main(q)
  const s = solids(q)
  switch (k) {
    // ── 圆柱的认识 ──
    case 'k.obj':
      return OBJ_CYL.find((o) => q.choices!.some((c) => keyOf(c.label) === `o.${o}`)) ? `o.${OBJ_CYL.find((o) => q.choices!.some((c) => keyOf(c.label) === `o.${o}`))}` : null
    case 'k.isCyl':
      return s.findIndex((x) => x.shape === 'cylinder') + 1
    case 'k.notCyl':
      return s.findIndex((x) => x.shape !== 'cylinder') + 1
    case 'k.countCyl':
      return s.filter((x) => x.shape === 'cylinder').length
    case 'k.faces':
      return 3
    case 'k.bases':
      return 2
    case 'k.sides':
      return 1
    case 'k.name.base':
      return 'p.base'
    case 'k.name.side':
      return 'p.side'
    case 'k.name.h':
      return 'p.h'
    case 'k.f.sameBases':
    case 'k.f.curved':
    case 'k.f.threeFaces':
      return 'yes'
    case 'k.f.flat':
    case 'k.f.bigSmall':
    case 'k.f.rectBase':
      return 'no'
    case 'k.part':
      return `p.${s[0]!.marks!.find((m) => m.text === p.x)!.at}`
    case 'k.spin':
      return 's.cylinder'
    case 'k.rot.r':
    case 'k.rot.h':
    case 'k.rot.d': {
      const { a, b } = rect(q)
      // 绕 AB（竖的边）转：半径是 BC、高是 AB；绕 BC 转：半径是 AB、高是 BC
      const r = p.e === 'AB' ? b : a
      const h = p.e === 'AB' ? a : b
      return k === 'k.rot.r' ? r : k === 'k.rot.h' ? h : 2 * r
    }
    case 'k.rot.which': {
      const { a, b } = rect(q)
      return n(p.r) === b && n(p.h) === a ? 'edge:AB' : 'edge:BC'
    }
    case 'k.cut.flat':
      return 's.circle'
    case 'k.cut.axial': {
      const { r, h } = rh(s[0]!)
      return 2 * r === h ? 's.square' : 's.rect'
    }
    case 'k.cutSides':
      return 'pair.dh'
    case 'k.bigger':
      return `aroundSide:${Math.min(n(p.a), n(p.b))}`
    case 'k.cutArea':
      return n(p.d) * n(p.h)
    case 'k.rotC':
      return r6(2 * P * n(p.b))
    // ── 圆柱的展开图 ──
    case 'n.unroll':
      return 's.rect'
    case 'n.is.len':
      return 'p.c'
    case 'n.is.wid':
      return 'p.h'
    case 'n.label.r+n.label.c':
      return r6(2 * P * n(p.n))
    case 'n.label.d+n.label.c':
      return r6(P * n(p.n))
    case 'n.label.r+n.label.w':
    case 'n.label.d+n.label.w':
      return n(p.h)
    case 'n.howCut': {
      const pts = polys(geos(q)[0]!)[0]!.pts
      return pts.length > 4 ? 'cutWay.byCurve' : pts[0]![0] !== pts[1]![0] ? 'cutWay.bySlant' : 'cutWay.byH'
    }
    case 'n.slant':
      return 's.para'
    case 'n.fold': {
      const fig = q.stem.find((x) => x.kind !== 'text')!
      return fig.kind === 'box-net' ? 's.cuboid' : fig.kind === 'net' ? 's.cube' : 's.cylinder'
    }
    case 'n.whichNet':
      return geos(q).findIndex(netOk) + 1
    case 'n.canWrap':
      return netOk(geos(q)[0]!) ? 'can' : 'cannot'
    case 'n.roll':
      return n(p.b)
    case 'n.diam':
      return r6(n(p.c) / P)
    case 'n.radius':
      return r6(n(p.c) / (2 * P))
    case 'n.square':
      return 's.square'
    case 'n.wrapR':
      return r6(2 * P * n(p.r)) === r6(n(p.l)) ? 'can' : 'cannot'
    case 'n.ratio':
      return '1∶π'
    case 'n.rollBig':
      return `asC:${Math.max(n(p.a), n(p.b))}`
    // ── 圆柱的侧面积 ──
    case 'sd.what':
      return 's.rect'
    case 'sd.formula':
      return 'f.cTimesH'
    case 'sd.words.r':
      return 'f.side.r'
    case 'sd.words.d':
      return 'f.side.d'
    case 'sd.label':
    case 'sd.byR':
      return r6(2 * P * n(p.r) * n(p.h))
    case 'sd.byC':
    case 'sd.byCcm':
      return r6(n(p.c) * n(p.h))
    case 'sd.hat':
    case 'sd.poster':
      return r6(P * n(p.d) * n(p.h))
    case 'sd.roller':
      return r6(P * n(p.d) * n(p.w))
    case 'sd.rollerN':
      return r6(P * n(p.d) * n(p.w) * n(p.n))
    case 'sd.height':
      return r6(n(p.s) / (2 * P * n(p.r)))
    case 'sd.radius':
      return r6(n(p.s) / (2 * P * n(p.h)))
    case 'sd.circ':
      return r6(n(p.s) / n(p.h))
    case 'sd.rect':
      return r6(n(p.a) * n(p.b))
    case 'sd.toM2':
      return r6((P * n(p.d) * n(p.h)) / 10000)
    case 'sd.j.cTimesH':
      return 'yes'
    case 'sd.j.baseTimesH':
    case 'sd.j.rTimesH':
      return 'no'
    case 'sd.same':
      return 'sameBig'
    // ── 圆柱的表面积 ──
    case 'sf.formula':
      return 'f.surf'
    case 'sf.base':
      return r6(P * n(p.r) * n(p.r))
    case 'sf.fig':
    case 'v.both.surf': {
      const { r, h } = rh(s[0]!)
      return cylS(r, h)
    }
    case 'sf.hat':
    case 'sf.pen': {
      const raw = r6(P * n(p.d) * n(p.h) + P * (n(p.d) / 2) ** 2)
      return up10(raw)
    }
    case 'sf.method':
      return 'm.up'
    case 'sf.which':
      return `fc.${FACE_CTX.find((c) => `m6.cyl.sf.ctx.${c.id}` === (p.ctx as { k: string }).k)!.ans}`
    case 'sf.lantern':
      return r6(P * 20 * n(p.h) + 2 * P * 100 - 2 * 78.5)
    case 'sf.cube':
      return 6 * n(p.a) * n(p.a)
    case 'sf.cuboid': {
      const b = (q.stem.find((x) => x.kind === 'box') as Extract<StemPart, { kind: 'box' }>).items[0]!
      return 2 * (b.l * b.w + b.l * b.h + b.w * b.h)
    }
    case 'sf.cutN':
      return 2 * (n(p.n) - 1)
    case 'sf.cutArea':
      return r6(2 * (n(p.n) - 1) * P * n(p.r) * n(p.r))
    case 'sf.hatColor': {
      const black = 20 * n(p.h) + 100
      const red = (10 + n(p.w)) ** 2 - 100
      return black === red ? 'cl.same' : black > red ? 'cl.black' : 'cl.red'
    }
    case 'sf.tableR':
      return cylS(n(p.r), n(p.h))
    case 'sf.tableD':
      return cylS(n(p.d) / 2, n(p.h))
    case 'sf.cover':
      return cylS(5, n(p.h))
    case 'sf.box+sf.box.long':
    case 'sf.box+sf.box.short':
    case 'sf.box+sf.box.high': {
      const f = geos(q)[0]!
      const cols = f.w / 2
      const rows = f.h / 2
      expect(f.items.filter((i) => i.t === 'dot').length, q.id).toBe(n(p.n))
      return k.endsWith('long') ? cols * n(p.d) : k.endsWith('short') ? rows * n(p.d) : n(p.h)
    }
    case 'sf.half':
      return 2 * n(p.d) * n(p.h)
    case 'sf.bucket':
      return r6(P * 8 * 12 + P * 16)
    // ── 圆柱的体积 ──
    case 'v.toBox+v.toBox.base':
      return 'w.base'
    case 'v.toBox+v.toBox.h':
      return 'p.h'
    case 'v.more':
      return 's.cuboid'
    case 'v.formula':
      return 'f.baseTimesH'
    case 'v.words':
      return 'f.vol.r'
    case 'v.bySh':
      return n(p.s) * n(p.h)
    case 'v.well':
      return cylV(n(p.d) / 2, n(p.h))
    case 'v.fig':
    case 'v.both.vol': {
      const { r, h } = rh(s[0]!)
      return cylV(r, h)
    }
    case 'v.height':
      return r6(n(p.v) / n(p.s))
    case 'v.j.baseTimesH':
      return 'yes'
    case 'v.j.cTimesH':
    case 'v.j.sideTimesH':
      return 'no'
    case 'v.cuboid': {
      const b = (q.stem.find((x) => x.kind === 'box') as Extract<StemPart, { kind: 'box' }>).items[0]!
      return b.l * b.w * b.h
    }
    case 'v.sameBase':
      return r6((n(p.v) / n(p.h1)) * n(p.h2))
    case 'v.spin': {
      const { a, b } = rect(q)
      return p.e === 'AB' ? cylV(b, a) : cylV(a, b)
    }
    case 'v.melt': {
      const b = (q.stem.find((x) => x.kind === 'box') as Extract<StemPart, { kind: 'box' }>).items[0]!
      return r6((Number(b.labels!.l) * Number(b.labels!.w) * Number(b.labels!.h)) / (P * (n(p.d) / 2) ** 2))
    }
    case 'v.cubeMax+v.cubeMax.d':
      return n(p.a)
    case 'v.cubeMax+v.cubeMax.v':
      return cylV(n(p.a) / 2, n(p.a))
    case 'v.pipe':
      return r6(P * ((n(p.D) / 2) ** 2 - (n(p.d) / 2) ** 2) * n(p.l))
    case 'v.tableR':
      return cylV(n(p.r), n(p.h))
    case 'v.tableD':
      return cylV(n(p.d) / 2, n(p.h))
    case 'v.rollMax':
    case 'v.rollMin': {
      // 用上面那条边（周长 C）围成圆柱：半径 C ÷ 6.28，体积 = 3.14 × 半径² × 另一条边
      const vs = geos(q).map((f) => {
        const lab = polys(f)[0]!.labels!
        const c = Number(lab[3])
        return P * (c / (2 * P)) ** 2 * Number(lab[2])
      })
      const best = k === 'v.rollMax' ? Math.max(...vs) : Math.min(...vs)
      return vs.indexOf(best) + 1
    }
    case 'v.holes':
      return Math.round(((P * 10 * (36 - 4 - 8)) / 1000) * 100) / 100
    // ── 圆柱的容积 ──
    case 'c.cup+c.cupFit':
      return cylV(n(p.d) / 2, n(p.h)) >= n(p.n) * n(p.v) ? 'fit' : 'noFit'
    case 'c.cup+c.cupCap':
      return cylV(n(p.d) / 2, n(p.h))
    case 'c.thermos':
      return cylV(n(p.d) / 2, n(p.h)) >= n(p.l) * 1000 ? 'enough' : 'notEnough'
    case 'c.pool':
      return cylV(n(p.r), n(p.h))
    case 'c.bottle':
      return cylV(n(p.d) / 2, n(p.a) + n(p.b))
    case 'c.bottleWhat':
      return 'bw.sum'
    case 'c.bottleSame':
      return 'same.no'
    case 'c.oil':
      return r6(cylV(n(p.d) / 2, n(p.h)) / 1000)
    case 'c.beds':
      return r6(2 * cylV(n(p.d) / 2, n(p.f)))
    case 'c.granary':
      return r6((cylV(n(p.r), n(p.h)) * 750) / 1000)
    case 'c.juice':
      return (n(p.k) + 1) * cylV(n(p.d) / 2, n(p.h)) <= 1000 ? 'enough' : 'notEnough'
    case 'c.iron':
    case 'c.rise':
      return cylV(n(p.d) / 2, n(p.x))
    case 'c.tea':
      return r6((n(p.s) * n(p.h) * n(p.m)) / 6)
    case 'c.gate':
      return r6(35 - P * (n(p.d) / 2) ** 2 * (n(p.t) / 100))
    case 'c.faucet':
      return cylV(n(p.d) / 2, n(p.sp) * n(p.sec)) >= 1000 ? 'can' : 'cannot'
    case 'c.flask':
      return cylV(5, n(p.h)) >= n(p.l) * 1000 ? 'fit' : 'noFit'
    case 'c.slant':
      return cylV(2, 5)
    // ── 圆锥的认识 ──
    case 'ck.obj':
      return `o.${OBJ_CONE.find((o) => q.choices!.some((c) => keyOf(c.label) === `o.${o}`))}`
    case 'ck.isCone':
      return s.findIndex((x) => x.shape === 'cone') + 1
    case 'ck.count':
      return s.filter((x) => x.shape === 'cone').length
    case 'ck.baseShape':
      return 's.circle'
    case 'ck.sideIs':
      return 'p.curved'
    case 'ck.heightIs':
      return 'p.h'
    case 'ck.part':
      return `p.${s[0]!.marks!.find((m) => m.text === p.x)!.at}`
    case 'ck.bases':
    case 'ck.apexes':
      return 1
    case 'ck.faces':
      return 2
    case 'ck.measure':
      return 'lay.flat'
    case 'ck.measureJ':
    case 'ck.f.circleBase':
    case 'ck.f.oneApex':
      return 'yes'
    case 'ck.f.flatSide':
    case 'ck.f.twoBases':
    case 'ck.slantJ':
      return 'no'
    case 'ck.spin':
      return 's.cone'
    case 'ck.rotate': {
      const ps = polys(geos(q)[0]!)
      if (ps.length === 1) return ps[0]!.pts.length === 4 ? 's.cylinder' : 's.cone'
      // 上面的三角形：第三个点和第二个点一样高就是直角三角形（转出一个圆锥），尖在中间就转出两个圆锥
      const tri = ps[0]!.pts
      return tri[2]![1] === tri[1]![1] ? 'rot.coneCyl' : 'rot.cones2'
    }
    case 'ck.compose':
      return 'pair.cylCone'
    case 'ck.cmp.apex':
      return 's.cone'
    case 'ck.cmp.bases':
      return 's.cylinder'
    case 'ck.tri.h':
    case 'ck.tri.r':
    case 'ck.tri.d': {
      const lab = polys(geos(q)[0]!)[0]!.labels!
      const a = Number(lab[0])
      const b = Number(lab[1])
      return k === 'ck.tri.h' ? a : k === 'ck.tri.r' ? b : 2 * b
    }
    case 'ck.bigger':
      return `aroundLeg:${Math.min(n(p.a), n(p.b))}`
    // ── 圆锥的体积 ──
    case 'cv.pour':
      return 3
    case 'cv.third':
      return '1/3'
    case 'cv.formula':
      return 'f.third'
    case 'cv.bySh':
      return r6((n(p.s) * n(p.h)) / 3)
    case 'cv.sand+cv.sand.v':
      return r6(cylV(n(p.d) / 2, n(p.h)) / 3)
    case 'cv.sand+cv.sand.t':
      return r6((cylV(n(p.d) / 2, n(p.h)) / 3) * 1.5)
    case 'cv.plumb':
      return nearInt((cylV(n(p.d) / 2, n(p.h)) / 3) * 7.9)
    case 'cv.toCone':
      return r6(n(p.v) / 3)
    case 'cv.toCyl':
      return r6(n(p.v) * 3)
    case 'cv.j.third':
    case 'cv.j.threeH':
      return 'no'
    case 'cv.j.bigger':
    case 'cv.j.triple':
      return 'yes'
    case 'cv.byC': {
      const r = n(p.c) / (2 * P)
      return r6((P * r * r * n(p.h)) / 3)
    }
    case 'cv.coal+cv.coal.v': {
      const r = n(p.c) / (2 * P)
      return r6((P * r * r * n(p.h)) / 3)
    }
    case 'cv.coal+cv.coal.t': {
      const r = n(p.c) / (2 * P)
      return nearInt(((P * r * r * n(p.h)) / 3) * 1.4)
    }
    case 'cv.fig': {
      const { r, h } = rh(s[0]!)
      return r6(cylV(r, h) / 3)
    }
    case 'cv.rice+cv.rice.kg':
      return r6((cylV(2, 1.5) / 3) * 650)
    case 'cv.rice.ha':
      return r6(n(p.kg) / 0.4)
    case 'cv.rice.yuan':
      return r6(n(p.kg) * 2.8)
    case 'cv.sameBase.cyl':
      return 3 * n(p.h)
    case 'cv.sameBase.cone':
      return n(p.h) / 3
    case 'cv.sameVol.cone':
      return r6(n(p.s) / 3)
    case 'cv.sameVol.cyl':
      return 3 * n(p.s)
    case 'cv.tableD':
      return r6(cylV(n(p.d) / 2, n(p.h)) / 3)
    case 'cv.tableR':
      return r6(cylV(n(p.r), n(p.h)) / 3)
    case 'cv.flip':
      return 12 / 3 + n(p.x)
    case 'cv.hopper':
      return nearInt((cylV(2, 2) + cylV(2, 4.2) / 3) * 0.64)
    case 'cv.road':
      return r6((n(p.s) * n(p.h)) / 3 / (n(p.w) * (n(p.t) / 100)))
  }
  return null
}

/** 词条答案的写法：带参数的（AB 边、绕 3 厘米的边……）写成「键:参数」 */
function answerKey(q: Question): string {
  const l = choiceLabel(q)
  if (typeof l === 'string') return l
  const k = keyOf(l)
  if (k === 'edge') return `edge:${String(l.p!.e)}`
  if (k === 'aroundSide' || k === 'aroundLeg' || k === 'asC') return `${k}:${String(l.p!.n)}`
  return k
}

describe('六下「圆柱与圆锥」：另算一遍答案（150 种子 × 三档）', () => {
  for (const kp of KPS) {
    it(kp, () => {
      each(kp, (q) => {
        const want = expected(q)
        expect(want, `${q.id}：测试没认出这种题（${main(q).k}）`).not.toBeNull()
        if (typeof want === 'number') {
          expect(numAnswer(q), q.id).toBeCloseTo(want, 6)
          // 选项里没有第二个对的
          if (q.choices) expect(q.choices.filter((c) => Math.abs(Number(zh(c.label)) - want) < 1e-6).length, q.id).toBe(1)
        } else {
          expect(answerKey(q), q.id).toBe(want)
          expect(q.choices!.filter((c) => zh(c.label) === zh(choiceLabel(q))).length, q.id).toBe(1)
        }
      })
    })
  }
})

describe('第 1 档出得到课本的每一问', () => {
  // 签名的第一段 = 哪种题；括号里是课本出处
  const NEED: Record<string, string[]> = {
    [KP_CK]: ['obj', 'isCyl', 'notCyl', 'faces', 'name', 'fact', 'part', 'spin', 'rotr', 'roth', 'rotWhich', 'cut'], // p16、例 1、做一做 1、2、练习三 1、4
    [KP_CN]: ['unroll', 'is', 'labelC', 'labelW', 'howCut', 'slant', 'fold', 'whichNet', 'canWrap', 'roll', 'diam'], // 例 2、做一做 1、2、练习三 2、3、5
    [KP_CS]: ['what', 'formula', 'words', 'label', 'byC', 'byR', 'hat', 'roller', 'poster', 'height', 'cInt', 'rect', 'judge'], // 例 3、做一做、例 4 做一做 1、练习四 2、3、10
    [KP_CA]: ['formula', 'base', 'surfR', 'surfD', 'hat', 'method', 'pen', 'faces', 'lantern', 'cube', 'cuboid', 'cutN', 'cutArea'], // 例 3、例 4、做一做 2、练习四 1、5、7、11
    [KP_CV]: ['toBox', 'more', 'formula', 'words', 'bySh', 'well', 'byR', 'byD', 'side', 'height', 'judge', 'cuboid'], // 例 5、做一做 1、2、练习五 1、4、6
    [KP_CC]: ['cupFit', 'cupCap', 'thermos', 'pool', 'bottle', 'bottleWhat', 'bottleSame', 'oil', 'beds', 'granary', 'juice', 'iron', 'tea'], // 例 6、做一做 1、2、例 7、练习五 2、3、5、8、10、13
    [KP_OK]: ['obj', 'isCone', 'baseShape', 'sideIs', 'heightIs', 'part', 'counts', 'measure', 'measureJ', 'spin', 'rotate', 'compose', 'fact', 'cmp'], // p30、例 1、做一做、练习六 1、2
    [KP_OV]: ['pour', 'third', 'formula', 'bySh', 'sand', 'sandWt', 'plumb', 'toCone', 'toCyl', 'judge', 'byC', 'coalV', 'coalT', 'byR'], // 例 2、例 3、做一做 1、2、练习六 3–6
  }
  for (const kp of KPS) {
    it(kp, () => {
      const seen = new Set<string>()
      const ids = new Set<string>()
      each(kp, (q, d) => {
        if (d !== 1) return
        seen.add(fam(q))
        ids.add(q.id)
      })
      expect(NEED[kp]!.filter((f) => !seen.has(f))).toEqual([])
      expect(ids.size).toBeGreaterThanOrEqual(12)
    })
  }

  it('做一做 2（p17）课本的数：BC 边 2 厘米、CD 边 1 厘米；例 7 瓶子 8、7、18 → 1256 毫升；例 4 只出进一法和四舍五入不一样的变式', () => {
    const ids = new Set<string>()
    for (const kp of [KP_CK, KP_CC]) each(kp, (q, d) => d === 1 && ids.add(q.id))
    expect([...ids].some((id) => /:rot[rh]-(AB|BC)-1-2$/.test(id))).toBe(true)
    expect(ids.has('m6s2-04-cyl-capacity:bottle-8-7-18')).toBe(true)
    for (const [dd, h] of [...HAT_ROUND, ...PEN_ROUND]) {
      const raw = r6(P * dd * h + P * (dd / 2) ** 2)
      expect(up10(raw), `${dd} × ${h}`).not.toBe(near10(raw))
    }
  })
})

describe('题目文字：朗读避坑、课本的说法', () => {
  const lines = Object.entries(ZH).map(([k, v]) => [k.replace(/^m6\.cyl\./, ''), String(v)] as const)
  it('「长」只在长度、长方形、长方体、周长、棱长里（例 2 的「长方形的长」照课本写）', () => {
    const bad = lines.filter(([k, v]) => k !== 'n.is.len' && /长/.test(v.replace(/长度|长方形|长方体|周长|棱长/g, '')))
    expect(bad).toEqual([])
  })
  it('不写重（除了「有……重」）、量（除了测量）、为、倒、着、还、浸没、铺、囤、朝、方程', () => {
    for (const [k, v] of lines) {
      expect(v.replace(/有 ?([\d.{}a-z]*|多少) ?(吨|千克|克)重/g, ''), `${k}：重`).not.toMatch(/重/)
      expect(v.replace(/测量/g, ''), `${k}：量`).not.toMatch(/量/)
      expect(v, k).not.toMatch(/[为倒着还铺囤朝]|浸没|方程/)
      // 「得」只在「得到」「得数」里
      expect(v.replace(/得到|得数/g, ''), `${k}：得`).not.toMatch(/得/)
      // 「周长相等」会被切成「长相」、「近似的」会被切成「似的」，都读错
      expect(v, k).not.toMatch(/长相|似的/)
      // 半角「?」会被当成要填的空；圆括号会读出「括号」
      expect(v, k).not.toMatch(/\?|[()（）]/)
    }
  })
  it('选项里没有单独一个小写字母，没有「πr²h」这种字母公式', () => {
    for (const kp of KPS)
      each(kp, (q) => {
        for (const c of q.choices ?? []) {
          expect(zh(c.label), q.id).not.toMatch(/^[a-z]$/)
          expect(zh(c.label), q.id).not.toMatch(/[rh]²|π[rh]/)
        }
      })
  })
})
