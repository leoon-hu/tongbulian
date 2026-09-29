<script setup lang="ts">
import { computed } from 'vue'
import type { MotionFig, MotionItem } from '@/types/models'

/**
 * 三下「生活中的运动现象」的小图（MotionItem）：课本的平面图形与剪影（判断轴对称、红虚线是不是对称轴、对折剪纸）、
 * 同一小图转了 / 翻了（能不能通过平移重合）、旋转的规律（直角三角形、四等分的圆、钟面的时针）、带弧形箭头的风车 / 螺旋桨 / 钟面
 * （顺时针还是逆时针），以及「虚线是原来的位置、实线是现在的」运动示意。每个图画在 100 × 100 的格子里（SVG），
 * 对称的图形都以竖着的中线 x = 50 为对称轴；图里不放汉字。一排图时下面标 1、2、3……（label），选项就是这几个数。
 */
const props = withDefaults(defineProps<{ items: MotionItem[]; arrows?: boolean }>(), { arrows: false })

type Cls =
  'body' | 'leaf' | 'wood' | 'roof' | 'accent' | 'dark' | 'glass' | 'light' | 'shade' | 'face' | 'ink' | 'tick' | 'min' | 'hour' | 'b1' | 'b2' | 'b3' | 'b4'
type Prim =
  | { t: 'path'; d: string; c: Cls; rot?: number }
  | { t: 'circle'; cx: number; cy: number; r: number; c: Cls }
  | { t: 'ellipse'; cx: number; cy: number; rx: number; ry: number; c: Cls; rot?: number }
  | { t: 'rect'; x: number; y: number; w: number; h: number; c: Cls; rx?: number; rot?: number }
  | { t: 'line'; x1: number; y1: number; x2: number; y2: number; c: Cls }
  | { t: 'text'; x: number; y: number; s: string; c: Cls; size: number }

const f1 = (n: number): string => (Math.round(n * 10) / 10).toString()
const poly = (pts: [number, number][], c: Cls): Prim => ({ t: 'path', d: `M ${pts.map(([x, y]) => `${f1(x)} ${f1(y)}`).join(' L ')} Z`, c })
/** 正多边形 / 星形的顶点：从正上方起顺时针 */
function ring(cx: number, cy: number, radii: number[], count: number): [number, number][] {
  const out: [number, number][] = []
  for (let i = 0; i < count * radii.length; i++) {
    const a = (i * Math.PI * 2) / (count * radii.length)
    const r = radii[i % radii.length]!
    out.push([cx + r * Math.sin(a), cy - r * Math.cos(a)])
  }
  return out
}

/** 每种图画在 100 × 100 里的几笔（不含转动 / 翻转） */
function prims(fig: MotionFig, hour: number | undefined, noHourHand: boolean): Prim[] {
  switch (fig) {
    case 'rect':
      return [{ t: 'rect', x: 15, y: 30, w: 70, h: 40, c: 'body' }]
    case 'square':
      return [{ t: 'rect', x: 25, y: 25, w: 50, h: 50, c: 'body' }]
    case 'scalene':
      return [
        poly(
          [
            [14, 80],
            [88, 80],
            [64, 18],
          ],
          'body',
        ),
      ]
    case 'circle':
      return [{ t: 'circle', cx: 50, cy: 50, r: 34, c: 'body' }]
    case 'parallelogram':
      return [
        poly(
          [
            [30, 30],
            [90, 30],
            [70, 70],
            [10, 70],
          ],
          'body',
        ),
      ]
    case 'pentagon':
      return [poly(ring(50, 54, [38], 5), 'body')]
    case 'iso-tall':
      return [
        poly(
          [
            [50, 12],
            [76, 86],
            [24, 86],
          ],
          'body',
        ),
      ]
    case 'iso-flat':
      return [
        poly(
          [
            [50, 38],
            [92, 72],
            [8, 72],
          ],
          'body',
        ),
      ]
    case 'star':
      return [poly(ring(50, 54, [42, 17], 5), 'body')]
    case 'arrow':
      // 左转弯箭头：竖杆往上，拐弯朝左，箭头指向左边
      return [{ t: 'path', d: 'M 70 90 L 70 40 Q 70 28 58 28 L 42 28 L 42 14 L 14 36 L 42 58 L 42 44 L 54 44 L 54 90 Z', c: 'body' }]
    case 'paddle':
      return [
        { t: 'path', d: 'M 44 62 L 56 62 L 55 90 Q 50 95 45 90 Z', c: 'wood' },
        { t: 'ellipse', cx: 50, cy: 38, rx: 27, ry: 29, c: 'body' },
      ]
    case 'plane':
      return [
        {
          t: 'path',
          d: 'M 50 6 C 56 6 57 16 57 24 L 57 44 L 93 60 L 93 67 L 57 58 L 56 80 L 67 88 L 67 93 L 50 89 L 33 93 L 33 88 L 44 80 L 43 58 L 7 67 L 7 60 L 43 44 L 43 24 C 43 16 44 6 50 6 Z',
          c: 'body',
        },
      ]
    case 'hoodie':
      return [
        {
          t: 'path',
          d: 'M 38 18 C 38 7 62 7 62 18 L 62 24 L 80 30 L 94 58 L 82 64 L 72 46 L 72 92 L 28 92 L 28 46 L 18 64 L 6 58 L 20 30 L 38 24 Z',
          c: 'body',
        },
        { t: 'ellipse', cx: 50, cy: 20, rx: 7, ry: 6, c: 'accent' },
        { t: 'path', d: 'M 38 66 L 62 66 L 60 80 L 40 80 Z', c: 'accent' },
      ]
    case 'comb': {
      // 梳齿只在右边，下面一个弯弯的柄：不对称
      const teeth: Prim[] = []
      for (let y = 11; y <= 55; y += 6) teeth.push({ t: 'rect', x: 50, y, w: 14, h: 3, c: 'body' })
      return [
        ...teeth,
        { t: 'rect', x: 38, y: 8, w: 12, h: 52, c: 'body' },
        { t: 'path', d: 'M 38 60 L 50 60 Q 57 78 48 94 L 42 94 Q 49 78 38 60 Z', c: 'body' },
      ]
    }
    case 'kettle':
      // 侧面的水壶：壶嘴在左边
      return [
        { t: 'path', d: 'M 38 40 Q 50 14 62 40', c: 'ink' },
        { t: 'path', d: 'M 31 58 L 9 42 L 12 38 L 34 51 Z', c: 'body' },
        { t: 'path', d: 'M 28 46 L 72 46 Q 76 86 50 86 Q 24 86 28 46 Z', c: 'body' },
        { t: 'path', d: 'M 34 46 Q 50 34 66 46 Z', c: 'body' },
        { t: 'circle', cx: 50, cy: 37, r: 3.5, c: 'dark' },
      ]
    case 'car':
      return [
        { t: 'rect', x: 14, y: 74, w: 14, h: 16, c: 'dark', rx: 3 },
        { t: 'rect', x: 72, y: 74, w: 14, h: 16, c: 'dark', rx: 3 },
        { t: 'path', d: 'M 24 46 L 32 18 L 68 18 L 76 46 Z', c: 'body' },
        { t: 'path', d: 'M 30 43 L 36 23 L 64 23 L 70 43 Z', c: 'glass' },
        { t: 'rect', x: 10, y: 44, w: 80, h: 34, c: 'body', rx: 8 },
        { t: 'circle', cx: 22, cy: 58, r: 6, c: 'light' },
        { t: 'circle', cx: 78, cy: 58, r: 6, c: 'light' },
        { t: 'rect', x: 36, y: 54, w: 28, h: 12, c: 'dark', rx: 2 },
      ]
    case 'leaf':
      return [
        { t: 'line', x1: 50, y1: 80, x2: 50, y2: 95, c: 'ink' },
        { t: 'path', d: 'M 50 8 C 82 30 84 64 50 82 C 16 64 18 30 50 8 Z', c: 'leaf' },
        { t: 'line', x1: 50, y1: 16, x2: 50, y2: 80, c: 'ink' },
      ]
    case 'kite':
      // 燕子风筝：圆脑袋、两边张开的翅膀（翅尖是弯的）、剪刀一样的尾巴
      return [
        {
          t: 'path',
          d: 'M 50 8 C 57 8 60 14 58 21 L 62 27 C 76 23 89 25 97 35 C 88 39 76 41 64 45 L 60 60 L 80 94 L 50 73 L 20 94 L 40 60 L 36 45 C 24 41 12 39 3 35 C 11 25 24 23 38 27 L 42 21 C 40 14 43 8 50 8 Z',
          c: 'body',
        },
        { t: 'circle', cx: 46, cy: 15, r: 1.8, c: 'dark' },
        { t: 'circle', cx: 54, cy: 15, r: 1.8, c: 'dark' },
      ]
    case 'dragonfly':
      return [
        { t: 'ellipse', cx: 30, cy: 34, rx: 21, ry: 7, c: 'glass', rot: -8 },
        { t: 'ellipse', cx: 70, cy: 34, rx: 21, ry: 7, c: 'glass', rot: 8 },
        { t: 'ellipse', cx: 32, cy: 48, rx: 18, ry: 6, c: 'glass', rot: 10 },
        { t: 'ellipse', cx: 68, cy: 48, rx: 18, ry: 6, c: 'glass', rot: -10 },
        { t: 'ellipse', cx: 50, cy: 54, rx: 4.5, ry: 34, c: 'body' },
        { t: 'circle', cx: 50, cy: 17, r: 7, c: 'body' },
      ]
    case 'heart':
      return [{ t: 'path', d: 'M 50 88 C 22 68 8 48 18 30 C 28 14 46 18 50 32 C 54 18 72 14 82 30 C 92 48 78 68 50 88 Z', c: 'body' }]
    case 'tree':
      return [
        { t: 'rect', x: 44, y: 76, w: 12, h: 18, c: 'wood' },
        poly(
          [
            [50, 8],
            [70, 34],
            [62, 34],
            [80, 56],
            [70, 56],
            [88, 78],
            [12, 78],
            [30, 56],
            [20, 56],
            [38, 34],
            [30, 34],
          ],
          'leaf',
        ),
      ]
    case 'house':
      // 门在右边：翻过来门就到了左边，和原来的不一样
      return [
        { t: 'rect', x: 26, y: 46, w: 48, h: 40, c: 'body' },
        { t: 'path', d: 'M 18 48 L 50 16 L 82 48 Z', c: 'roof' },
        { t: 'rect', x: 57, y: 62, w: 12, h: 24, c: 'accent' },
        { t: 'circle', cx: 60, cy: 75, r: 1.6, c: 'dark' },
      ]
    case 'fish':
      return [
        { t: 'path', d: 'M 28 52 L 8 37 L 8 67 Z', c: 'body' },
        { t: 'path', d: 'M 42 39 L 53 25 L 61 40 Z', c: 'body' },
        { t: 'ellipse', cx: 52, cy: 52, rx: 26, ry: 15, c: 'body' },
        { t: 'circle', cx: 67, cy: 48, r: 3.2, c: 'dark' },
      ]
    case 'flag':
      return [
        { t: 'rect', x: 24, y: 10, w: 5, h: 82, c: 'wood' },
        { t: 'path', d: 'M 29 12 L 80 12 L 80 46 L 29 46 Z', c: 'body' },
        poly(ring(54.5, 29, [9, 3.6], 5), 'light'),
      ]
    case 'right-tri':
      return [
        { t: 'path', d: 'M 22 20 L 22 80 L 80 80 Z', c: 'body' },
        { t: 'path', d: 'M 22 70 L 32 70 L 32 80', c: 'ink' },
      ]
    case 'quad':
      return [
        { t: 'circle', cx: 50, cy: 50, r: 34, c: 'face' },
        { t: 'path', d: 'M 50 50 L 16 50 A 34 34 0 0 1 50 16 Z', c: 'shade' },
        { t: 'line', x1: 16, y1: 50, x2: 84, y2: 50, c: 'ink' },
        { t: 'line', x1: 50, y1: 16, x2: 50, y2: 84, c: 'ink' },
        { t: 'circle', cx: 50, cy: 50, r: 34, c: 'ink' },
      ]
    case 'clock': {
      const out: Prim[] = [{ t: 'circle', cx: 50, cy: 50, r: 42, c: 'face' }]
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6
        const r0 = i % 3 === 0 ? 33 : 36
        out.push({ t: 'line', x1: 50 + r0 * Math.sin(a), y1: 50 - r0 * Math.cos(a), x2: 50 + 40 * Math.sin(a), y2: 50 - 40 * Math.cos(a), c: 'tick' })
      }
      for (const [n, x, y] of [
        ['12', 50, 29],
        ['3', 74, 54.5],
        ['6', 50, 79],
        ['9', 26, 54.5],
      ] as const)
        out.push({ t: 'text', x, y, s: n, c: 'dark', size: 12 })
      out.push({ t: 'line', x1: 50, y1: 50, x2: 50, y2: 16, c: 'min' })
      if (!noHourHand && hour !== undefined) {
        const a = ((hour % 12) * Math.PI) / 6
        out.push({ t: 'line', x1: 50, y1: 50, x2: 50 + 21 * Math.sin(a), y2: 50 - 21 * Math.cos(a), c: 'hour' })
      }
      out.push({ t: 'circle', cx: 50, cy: 50, r: 3.5, c: 'dark' })
      return out
    }
    case 'pinwheel': {
      const out: Prim[] = [{ t: 'rect', x: 48, y: 50, w: 4, h: 48, c: 'wood' }]
      const cls: Cls[] = ['b1', 'b2', 'b3', 'b4']
      for (let k = 0; k < 4; k++) out.push({ t: 'path', d: 'M 50 50 L 50 10 L 75 27 Z', c: cls[k]!, rot: k * 90 })
      out.push({ t: 'circle', cx: 50, cy: 50, r: 4, c: 'dark' })
      return out
    }
    case 'propeller': {
      const out: Prim[] = []
      for (let k = 0; k < 3; k++) out.push({ t: 'rect', x: 50, y: 45.5, w: 40, h: 9, c: 'body', rx: 4.5, rot: -90 + k * 120 })
      out.push({ t: 'circle', cx: 50, cy: 50, r: 7, c: 'dark' })
      return out
    }
  }
}

/** 画对称轴虚线用的外框 [左, 上, 右, 下] */
function bbox(fig: MotionFig): [number, number, number, number] {
  switch (fig) {
    case 'rect':
      return [15, 30, 85, 70]
    case 'square':
      return [25, 25, 75, 75]
    case 'circle':
    case 'quad':
      return [16, 16, 84, 84]
    case 'parallelogram':
      return [10, 30, 90, 70]
    default:
      return [8, 8, 92, 92]
  }
}

interface Seg {
  x1: number
  y1: number
  x2: number
  y2: number
}
function axisSeg(fig: MotionFig, axis: NonNullable<MotionItem['axis']>): Seg {
  const [l, tp, r, b] = bbox(fig)
  const cy = (tp + b) / 2
  const ext = (x1: number, y1: number, x2: number, y2: number): Seg => {
    // 两头各伸出去一点，看得出是一条穿过图形的线
    const dx = (x2 - x1) * 0.1
    const dy = (y2 - y1) * 0.1
    return { x1: x1 - dx, y1: y1 - dy, x2: x2 + dx, y2: y2 + dy }
  }
  switch (axis) {
    case 'v':
      return ext(50, tp, 50, b)
    case 'h':
      return ext(l, cy, r, cy)
    case 'd1':
      return ext(l, tp, r, b)
    case 'd2':
      return ext(r, tp, l, b)
    case 'off':
      return ext(50 + (r - l) * 0.22, tp, 50 + (r - l) * 0.22, b)
  }
}

/**
 * 弧形箭头（圆心 50, 50，半径 R；角度从正上方起顺时针量）：默认画在右上方，cw 箭头在下端、ccw 箭头在上端——
 * 两个方向的弧在同一个地方，只看箭头在哪一头。返回弧的 path + 箭头三角形
 */
function arcArrow(dir: 'cw' | 'ccw', R = 49, a0 = dir === 'cw' ? 8 : 78, a1 = dir === 'cw' ? 78 : 8): { arc: string; head: string } {
  const at = (deg: number): [number, number] => [50 + R * Math.sin((deg * Math.PI) / 180), 50 - R * Math.cos((deg * Math.PI) / 180)]
  const [x0, y0] = at(a0)
  const [x1, y1] = at(a1)
  const rad = (a1 * Math.PI) / 180
  // 顺时针走的切线方向（屏幕坐标 y 向下）：(cos, sin)；逆时针反过来
  const s = dir === 'cw' ? 1 : -1
  const tx = s * Math.cos(rad)
  const ty = s * Math.sin(rad)
  const tip: [number, number] = [x1 + tx * 7, y1 + ty * 7]
  const back: [number, number] = [x1 - tx * 3, y1 - ty * 3]
  const p1: [number, number] = [back[0] - ty * 6, back[1] + tx * 6]
  const p2: [number, number] = [back[0] + ty * 6, back[1] - tx * 6]
  return {
    arc: `M ${f1(x0)} ${f1(y0)} A ${R} ${R} 0 0 ${dir === 'cw' ? 1 : 0} ${f1(x1)} ${f1(y1)}`,
    head: `M ${f1(tip[0])} ${f1(tip[1])} L ${f1(p1[0])} ${f1(p1[1])} L ${f1(p2[0])} ${f1(p2[1])} Z`,
  }
}

/** 一个图：变换（先翻再转，绕中心）+ 几笔 */
interface Copy {
  transform: string
  prims: Prim[]
  ghost?: boolean
}
interface View {
  item: MotionItem
  copies: Copy[]
  axis?: Seg
  clip?: boolean
  arc?: { arc: string; head: string }
  /** 平移示意的直箭头 */
  line?: { d: string; head: string }
  /** 旋转示意：绕着转的那一点（红点） */
  pivot?: boolean
  question?: boolean
}

const orient = (turn = 0, flip = false, cx = 50, cy = 50, scale = 1): string =>
  `translate(${cx} ${cy}) rotate(${turn}) scale(${flip ? -scale : scale} ${scale}) translate(-50 -50)`

/** 平移示意：原来的位置（虚线）和现在的位置（实线）的中心、中间的箭头 */
const MOVES: Record<'up' | 'right' | 'slide', { from: [number, number]; to: [number, number] }> = {
  up: { from: [50, 74], to: [50, 26] },
  right: { from: [24, 50], to: [76, 50] },
  slide: { from: [72, 28], to: [28, 72] },
}

function straightArrow(from: [number, number], to: [number, number]): { d: string; head: string } {
  const dx = to[0] - from[0]
  const dy = to[1] - from[1]
  const len = Math.hypot(dx, dy)
  const ux = dx / len
  const uy = dy / len
  // 箭头画在两个图之间的空当里
  const a: [number, number] = [from[0] + ux * len * 0.36, from[1] + uy * len * 0.36]
  const b: [number, number] = [from[0] + ux * len * 0.6, from[1] + uy * len * 0.6]
  const tip: [number, number] = [b[0] + ux * 6, b[1] + uy * 6]
  const p1: [number, number] = [b[0] - uy * 5, b[1] + ux * 5]
  const p2: [number, number] = [b[0] + uy * 5, b[1] - ux * 5]
  return {
    d: `M ${f1(a[0])} ${f1(a[1])} L ${f1(b[0])} ${f1(b[1])}`,
    head: `M ${f1(tip[0])} ${f1(tip[1])} L ${f1(p1[0])} ${f1(p1[1])} L ${f1(p2[0])} ${f1(p2[1])} Z`,
  }
}

function viewOf(item: MotionItem): View {
  if (item.blank && item.fig !== 'clock') return { item, copies: [], question: true }
  const base = prims(item.fig, item.hour, !!item.blank)
  if (item.move === 'turn') {
    // 绕着中心的红点转 90°：原来在红点正上方（虚线），转过去到了右边（顺时针）或左边（逆时针）
    const dir = item.arrow ?? 'cw'
    const place = 'translate(50 25) scale(0.44) translate(-50 -50)'
    return {
      item,
      copies: [
        { transform: place, prims: base, ghost: true },
        { transform: `rotate(${dir === 'ccw' ? -90 : 90} 50 50) ${place}`, prims: base },
      ],
      arc: arcArrow(dir, 46, dir === 'cw' ? 30 : -30, dir === 'cw' ? 60 : -60),
      pivot: true,
    }
  }
  if (item.move) {
    const m = MOVES[item.move]
    return {
      item,
      copies: [
        { transform: orient(item.turn, item.flip, m.from[0], m.from[1], 0.42), prims: base, ghost: true },
        { transform: orient(item.turn, item.flip, m.to[0], m.to[1], 0.42), prims: base },
      ],
      line: straightArrow(m.from, m.to),
    }
  }
  return {
    item,
    copies: [{ transform: orient(item.turn, item.flip), prims: base }],
    axis: item.half ? axisSeg(item.fig, 'v') : item.axis ? axisSeg(item.fig, item.axis) : undefined,
    clip: !!item.half,
    arc: item.arrow ? arcArrow(item.arrow) : undefined,
    question: item.blank,
  }
}

const views = computed(() => props.items.map(viewOf))

/** 一排的个数越多，每个画得越小（手机竖屏 360px 宽里放得下一排） */
const size = computed(() => {
  const n = props.items.length
  if (n === 1) return props.items[0]!.move ? 180 : 140
  if (props.arrows) return n <= 3 ? 76 : 58
  return n === 2 ? 108 : n === 3 ? 90 : n === 4 ? 68 : 56
})

// clipPath 的 id 在整页里要唯一（一页上可能有好几排图，对战时两边各一份）
const uid = `mf-${Math.random().toString(36).slice(2, 10)}`
const clipId = (i: number): string => `${uid}-${i}`
</script>

<template>
  <div class="motion-figs" :class="{ seq: arrows }">
    <template v-for="(v, i) in views" :key="i">
      <span v-if="arrows && i > 0" class="step" aria-hidden="true">→</span>
      <figure class="fig" :class="[v.item.tone, { labeled: v.item.label !== undefined }]">
        <svg viewBox="-6 -6 112 112" :width="size" :height="size" role="img" overflow="visible">
          <defs v-if="v.clip">
            <clipPath :id="clipId(i)"><rect x="-6" y="-6" width="56" height="112" /></clipPath>
          </defs>
          <g v-for="(cp, k) in v.copies" :key="k" :class="{ ghost: cp.ghost }" :clip-path="v.clip ? `url(#${clipId(i)})` : undefined">
            <g :transform="cp.transform">
              <template v-for="(p, j) in cp.prims" :key="j">
                <path v-if="p.t === 'path'" :class="p.c" :d="p.d" :transform="p.rot ? `rotate(${p.rot} 50 50)` : undefined" />
                <circle v-else-if="p.t === 'circle'" :class="p.c" :cx="p.cx" :cy="p.cy" :r="p.r" />
                <ellipse
                  v-else-if="p.t === 'ellipse'"
                  :class="p.c"
                  :cx="p.cx"
                  :cy="p.cy"
                  :rx="p.rx"
                  :ry="p.ry"
                  :transform="p.rot ? `rotate(${p.rot} ${p.cx} ${p.cy})` : undefined"
                />
                <rect
                  v-else-if="p.t === 'rect'"
                  :class="p.c"
                  :x="p.x"
                  :y="p.y"
                  :width="p.w"
                  :height="p.h"
                  :rx="p.rx"
                  :transform="p.rot ? `rotate(${p.rot} 50 50)` : undefined"
                />
                <line v-else-if="p.t === 'line'" :class="p.c" :x1="p.x1" :y1="p.y1" :x2="p.x2" :y2="p.y2" />
                <text v-else-if="p.t === 'text'" :class="['label', p.c]" :x="p.x" :y="p.y" :font-size="p.size">{{ p.s }}</text>
              </template>
            </g>
          </g>
          <line v-if="v.axis" class="axis" :x1="v.axis.x1" :y1="v.axis.y1" :x2="v.axis.x2" :y2="v.axis.y2" />
          <g v-if="v.arc" class="arc">
            <path class="arc-line" :d="v.arc.arc" />
            <path class="arc-head" :d="v.arc.head" />
          </g>
          <circle v-if="v.pivot" class="arc-head" cx="50" cy="50" r="3.5" />
          <g v-if="v.line" class="arc">
            <path class="arc-line" :d="v.line.d" />
            <path class="arc-head" :d="v.line.head" />
          </g>
          <template v-if="v.question">
            <rect v-if="!v.copies.length" class="q-box" x="8" y="8" width="84" height="84" rx="12" />
            <text class="q-mark" :x="v.copies.length ? 67 : 50" :y="v.copies.length ? 68 : 52" :font-size="v.copies.length ? 24 : 44">?</text>
          </template>
        </svg>
        <figcaption v-if="v.item.label !== undefined">{{ v.item.label }}</figcaption>
      </figure>
    </template>
  </div>
</template>

<style scoped>
.motion-figs {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 8px;
  max-width: 100%;
}
.motion-figs.seq {
  gap: 2px;
  flex-wrap: nowrap;
}
.step {
  font-size: 18px;
  font-weight: 800;
  color: var(--c-text-light);
  flex: none;
}
.fig {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 5px;
  border-radius: var(--radius-md);
  background: var(--c-bg);
  flex: none;
}
.fig.red {
  box-shadow: inset 0 0 0 3px #ffb3a7;
}
.fig svg {
  display: block;
  max-width: 100%;
  height: auto;
  overflow: visible;
}
.fig figcaption {
  min-width: 30px;
  padding: 0 8px;
  border-radius: 999px;
  background: var(--c-primary);
  color: #fff;
  font-weight: 800;
  font-size: var(--fs-md);
  line-height: 1.4;
  text-align: center;
}
.body {
  fill: #cfe6ff;
  stroke: #2f7bd6;
  stroke-width: 2.5;
  stroke-linejoin: round;
}
.leaf {
  fill: #9ad48f;
  stroke: #3f8f3a;
  stroke-width: 2.5;
  stroke-linejoin: round;
}
.wood {
  fill: #d9a86c;
  stroke: #8a5a2b;
  stroke-width: 2;
}
.roof {
  fill: #ff8a80;
  stroke: #c0392b;
  stroke-width: 2.5;
  stroke-linejoin: round;
}
.accent {
  fill: #ffcf99;
  stroke: #c46f1d;
  stroke-width: 2;
}
.dark {
  fill: #3d2c1e;
}
.glass {
  fill: #eef7ff;
  stroke: #2f7bd6;
  stroke-width: 2;
}
.light {
  fill: #fff3b0;
  stroke: #c9a227;
  stroke-width: 1.5;
}
.shade {
  fill: #7fd3de;
}
.face {
  fill: #fff;
  stroke: #2f7bd6;
  stroke-width: 3;
}
.ink {
  fill: none;
  stroke: #3d2c1e;
  stroke-width: 2;
  stroke-linecap: round;
}
.tick {
  stroke: #3d2c1e;
  stroke-width: 2;
}
.min {
  stroke: #4aa3ff;
  stroke-width: 3.5;
  stroke-linecap: round;
}
.hour {
  stroke: #3d2c1e;
  stroke-width: 5.5;
  stroke-linecap: round;
}
.b1,
.b2,
.b3,
.b4 {
  stroke: #3d2c1e;
  stroke-width: 1.5;
  stroke-linejoin: round;
}
.b1 {
  fill: #ff6b6b;
}
.b2 {
  fill: #ffd166;
}
.b3 {
  fill: #4aa3ff;
}
.b4 {
  fill: #3ecf8e;
}
.label {
  font-weight: 800;
  text-anchor: middle;
  dominant-baseline: middle;
}
text.dark {
  fill: #3d2c1e;
}
/* 参照的那个：红色；剪纸：粉色（叶子、树、木头都一起换色） */
.red .body,
.red .roof,
.red .leaf {
  fill: #ff8f84;
  stroke: #c0392b;
}
.paper .body,
.paper .leaf,
.paper .wood,
.paper .roof,
.paper .glass,
.paper .accent {
  fill: #f9c6c0;
  stroke: #d98076;
}
/* 原来的位置：只画虚线轮廓 */
.ghost :is(path, circle, ellipse, rect, line) {
  fill: none;
  stroke: #8a7a6d;
  stroke-width: 2.5;
  stroke-dasharray: 6 5;
}
.ghost text {
  display: none;
}
.axis {
  stroke: #e53935;
  stroke-width: 2.5;
  stroke-dasharray: 7 5;
  stroke-linecap: round;
}
.arc-line {
  fill: none;
  stroke: #e53935;
  stroke-width: 3;
  stroke-linecap: round;
}
.arc-head {
  fill: #e53935;
}
.q-box {
  fill: #fff;
  stroke: var(--c-primary);
  stroke-width: 3;
  stroke-dasharray: 8 6;
}
.q-mark {
  fill: var(--c-primary-dark);
  font-weight: 800;
  text-anchor: middle;
  dominant-baseline: middle;
}
</style>
