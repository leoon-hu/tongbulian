import type { Difficulty, GeoFig, GeoItem, GeoPt, Question, StemPart } from '@/types/models'
import type { RNG } from '@/engine'
import { defineGenerator, labelQuestion, numberQuestion } from '@/engine'

// ─────────────────────────────────────────────────────────────
// 认识线段（二上「厘米和米」例 3，p61–62、p67）：
// - 这个图形由几条线段组成（做一做 2：正方形、三角形、长方形；练一练 5：带一条连线的图形）
// - 哪一个是线段（做一做 1：线段和曲线放在一起）
// - 把每两个点用线段连起来，一共可以画几条（做一做 3：三个点）
// 图都用 GeoFigure 画（图里不写字），alt 是静态页上的说明。
// ─────────────────────────────────────────────────────────────

const KP = 'm2s1-05-segment'

interface Figure {
  id: string
  /** 一共几条线段 */
  segs: number
  items: GeoItem[]
  w: number
  h: number
  alt: string
}

const poly = (pts: GeoPt[]): GeoItem => ({ t: 'poly', pts })
const line = (a: GeoPt, b: GeoPt): GeoItem => ({ t: 'line', a, b })

/** 只有外框的图形：边数就是线段数 */
const PLAIN: Figure[] = [
  { id: 'tri', segs: 3, items: [poly([[70, 10], [130, 100], [10, 100]])], w: 140, h: 110, alt: '（一个三角形）' },
  { id: 'square', segs: 4, items: [poly([[10, 10], [100, 10], [100, 100], [10, 100]])], w: 110, h: 110, alt: '（一个正方形）' },
  { id: 'rect', segs: 4, items: [poly([[10, 20], [150, 20], [150, 90], [10, 90]])], w: 160, h: 110, alt: '（一个长方形）' },
  { id: 'house', segs: 5, items: [poly([[70, 10], [130, 50], [130, 110], [10, 110], [10, 50]])], w: 140, h: 120, alt: '（一个五边形，像一座小房子）' },
  { id: 'notch', segs: 5, items: [poly([[10, 10], [130, 10], [130, 100], [10, 100], [55, 55]])], w: 140, h: 110, alt: '（一个左边凹进去一个尖角的图形，由 5 条线段组成）' },
  { id: 'hex', segs: 6, items: [poly([[40, 10], [100, 10], [130, 60], [100, 110], [40, 110], [10, 60]])], w: 140, h: 120, alt: '（一个六边形）' },
]

/** 外框里还有一条线段的图形（练一练 5） */
const INNER: Figure[] = [
  { id: 'rect-diag', segs: 5, items: [poly([[10, 20], [150, 20], [150, 90], [10, 90]]), line([10, 20], [150, 90])], w: 160, h: 110, alt: '（一个长方形，连着一条对角线）' },
  { id: 'trap-diag', segs: 5, items: [poly([[50, 10], [110, 10], [150, 90], [10, 90]]), line([50, 10], [150, 90])], w: 160, h: 100, alt: '（一个梯形，连着一条对角线）' },
  { id: 'house-line', segs: 6, items: [poly([[70, 10], [130, 50], [130, 110], [10, 110], [10, 50]]), line([10, 50], [130, 50])], w: 140, h: 120, alt: '（一座小房子，屋顶和墙之间有一条线段）' },
  { id: 'square-diag', segs: 5, items: [poly([[10, 10], [100, 10], [100, 100], [10, 100]]), line([10, 10], [100, 100])], w: 110, h: 110, alt: '（一个正方形，连着一条对角线）' },
]

function countQuestion(d: Difficulty, rng: RNG): Question {
  const pool = d === 1 ? PLAIN : [...PLAIN, ...INNER]
  const f = rng.pick(pool)
  const fig: GeoFig = { w: f.w, h: f.h, items: f.items }
  return numberQuestion({
    kpId: KP,
    type: 'length',
    difficulty: d,
    sig: `count-${f.id}`,
    stem: [
      { kind: 'text', text: { k: 'q.seg.count' } },
      { kind: 'geo', figs: [fig], alt: f.alt },
    ],
    value: f.segs,
    rng,
    min: 1,
    max: 10,
    smart: [f.segs + 1, f.segs - 1, f.segs * 2],
  })
}

type Kind = 'segment' | 'arc' | 'wave' | 'hump'

/** 一条线（在 120 × 60 的格子里）：线段可以斜着放 */
function lineFig(kind: Kind, tilt: number): GeoFig {
  const items: GeoItem[] =
    kind === 'segment'
      ? [line([10, 30 + tilt], [110, 30 - tilt])]
      : kind === 'arc'
        ? [{ t: 'curve', pts: [[10, 50], [35, 20], [60, 12], [85, 20], [110, 50]] }]
        : kind === 'hump'
          ? [{ t: 'curve', pts: [[10, 15], [35, 40], [60, 48], [85, 40], [110, 15]] }]
          : [{ t: 'curve', pts: [[10, 30], [35, 12], [60, 30], [85, 48], [110, 30]] }]
  return { w: 120, h: 60, items }
}

function whichQuestion(d: Difficulty, rng: RNG): Question {
  const others = rng.shuffle(['arc', 'wave', 'hump'] as Kind[]).slice(0, d === 1 ? 2 : 3)
  const kinds = rng.shuffle(['segment', ...others] as Kind[])
  const tilt = rng.pick([0, 0, 12, -12, 20])
  const at = kinds.indexOf('segment')
  const names: Record<Kind, string> = { segment: '线段', arc: '向上弯的曲线', wave: '波浪线', hump: '向下弯的曲线' }
  return labelQuestion({
    kpId: KP,
    type: 'length',
    difficulty: d,
    sig: `which-${kinds.join('-')}-${tilt}`,
    stem: [
      { kind: 'text', text: { k: 'q.seg.which' } },
      { kind: 'geo', figs: kinds.map((k) => lineFig(k, tilt)), numbered: true, alt: `（${kinds.map((k, i) => `${i + 1}. ${names[k]}`).join('；')}）` },
    ],
    correct: String(at + 1),
    distractors: kinds.map((_, i) => String(i + 1)).filter((x) => x !== String(at + 1)),
    rng,
  })
}

/** 每两个点连一条线段：3 个点 3 条，4 个点 6 条（任意三点不在一条直线上） */
const POINTS: Record<3 | 4, GeoPt[]> = {
  3: [[60, 10], [110, 90], [10, 80]],
  4: [[20, 15], [110, 10], [120, 90], [15, 85]],
}

function connectQuestion(d: Difficulty, rng: RNG): Question {
  const n = d === 1 ? 3 : rng.pick([3, 4] as const)
  const value = (n * (n - 1)) / 2
  const part: StemPart = { kind: 'geo', figs: [{ w: 130, h: 100, items: POINTS[n].map((at): GeoItem => ({ t: 'dot', at })) }], alt: `（${n} 个点，任意三个点都不在一条直线上）` }
  return numberQuestion({
    kpId: KP,
    type: 'length',
    difficulty: d,
    sig: `connect-${n}`,
    stem: [{ kind: 'text', text: { k: 'q.seg.connect' } }, part],
    value,
    rng,
    min: 1,
    max: 12,
    smart: [n, n - 1, n * 2, value + 1],
  })
}

function genSegment(d: Difficulty, rng: RNG): Question {
  const roll = rng.next()
  if (roll < 0.5) return countQuestion(d, rng)
  if (roll < 0.82) return whichQuestion(d, rng)
  return connectQuestion(d, rng)
}
defineGenerator(KP, genSegment)
