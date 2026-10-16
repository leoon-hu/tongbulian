<script setup lang="ts">
import { computed } from 'vue'
import type { PairItem, PairMark, PairShape } from '@/types/models'
import { t } from '@/engine/i18n'
import { arrowHead, f1 } from './bearing'

/**
 * 有序数对方格图（六上「用有序数对确定位置」，照课本画）：
 * cells——格子（例 1 老师的座位表、练习一 3 涂色格、练习二 1 格子柜）：数标在格子上、从 1 起，列号写在下面、行号写在左边，
 *   第 1 行在最下面；seats 画成一张张分开的桌子，下面、左边写「第 1 列」「第 1 行」；格子可以涂色、放 emoji、写字母或「?」。
 * points——格点（例 2、做一做、练习一 4/5、练习二 2/7/8）：数标在格线上、从 0 起（0 只在左下角写一次），axes 画两条带箭头的轴；
 *   点画在交点上：大写字母写在左上（课本的写法）、地名写在右上（小字）、emoji 画在点上；shapes 连线（dash 虚线），
 *   route 是带箭头的红色虚线路线，marks 是分拣机器人图的投递口（蓝三角）和传递口（红圆里写号）。
 * north 右上角画「北」，per 左上角写一格表示多少，diag 在第一个小正方形里画对角线。图里的字不注音、不朗读。
 */
const props = withDefaults(
  defineProps<{
    mode: 'cells' | 'points'
    cols: number
    rows: number
    seats?: boolean
    axes?: boolean
    items?: PairItem[]
    shapes?: PairShape[]
    route?: [number, number][]
    marks?: PairMark[]
    north?: boolean
    per?: string
    diag?: boolean
    alt?: string
  }>(),
  { seats: false, axes: false, items: () => [], shapes: () => [], route: undefined, marks: () => [], north: false, per: undefined, diag: false, alt: '' },
)

interface Txt {
  x: number
  y: number
  text: string
  cls: string
  anchor?: 'start' | 'middle' | 'end'
}
interface Rect {
  x: number
  y: number
  w: number
  h: number
  cls: string
  rx?: number
}

const layout = computed(() => {
  const cells = props.mode === 'cells'
  // 手机竖屏上一屏要放下题目、图和作答区：格子图最高约 150 像素（座位表 170，好写「第 1 列」）
  const s = cells
    ? Math.max(18, Math.min(props.seats ? 46 : 34, Math.floor((props.seats ? 250 : 264) / props.cols), Math.floor((props.seats ? 170 : 150) / props.rows)))
    : Math.max(14, Math.min(30, Math.floor(250 / props.cols), Math.floor(150 / props.rows)))
  // 座位表的「第 1 列」「第 1 行」要 33 像素宽，格子窄了就只写数
  const words = cells && props.seats && s >= 33
  const left = cells ? (words ? 42 : 22) : 24
  const top = 10 + (props.per || props.north ? 20 : 0) + (props.axes ? 12 : 0)
  const width = left + props.cols * s + (props.axes ? 22 : 10) + (props.north ? 26 : 0)
  const height = top + props.rows * s + (props.seats ? 24 : 20)
  return { cells, s, words, left, top, width, height }
})

/** 格点 / 格子中心的像素位置 */
function at(x: number, y: number): [number, number] {
  const { cells, s, left, top } = layout.value
  if (cells) return [f1(left + (x - 0.5) * s), f1(top + (props.rows - y + 0.5) * s)]
  return [f1(left + x * s), f1(top + (props.rows - y) * s)]
}

const drawn = computed(() => {
  const { cells, s, words, left, top } = layout.value
  const rects: Rect[] = []
  const paths: { d: string; cls: string }[] = []
  const dots: { x: number; y: number; r: number; cls: string }[] = []
  const texts: Txt[] = []
  const bottom = top + props.rows * s
  const right = left + props.cols * s
  if (cells) {
    const fill = new Map(props.items.filter((it) => it.fill).map((it) => [`${it.x},${it.y}`, it.fill!]))
    for (let x = 1; x <= props.cols; x++)
      for (let y = 1; y <= props.rows; y++) {
        const f = fill.get(`${x},${y}`)
        const x0 = left + (x - 1) * s
        const y0 = top + (props.rows - y) * s
        if (props.seats) rects.push({ x: f1(x0 + 4), y: f1(y0 + 5), w: f1(s - 8), h: f1(s - 10), rx: 4, cls: f ? `desk f-${f}` : 'desk' })
        else rects.push({ x: f1(x0), y: f1(y0), w: s, h: s, cls: f ? `cell f-${f}` : 'cell' })
      }
    for (let x = 1; x <= props.cols; x++)
      texts.push({ x: f1(left + (x - 0.5) * s), y: f1(bottom + 15), text: words ? t({ k: 'm6.pos.fig.col', p: { n: x } }) : String(x), cls: words ? 'axis-word' : 'axis-num' })
    for (let y = 1; y <= props.rows; y++)
      texts.push({ x: f1(left - 5), y: f1(top + (props.rows - y + 0.5) * s + 4), text: words ? t({ k: 'm6.pos.fig.row', p: { n: y } }) : String(y), cls: words ? 'axis-word' : 'axis-num', anchor: 'end' })
  } else {
    const lines: string[] = []
    for (let i = 0; i <= props.cols; i++) lines.push(`M ${left + i * s} ${top} L ${left + i * s} ${bottom}`)
    for (let j = 0; j <= props.rows; j++) lines.push(`M ${left} ${top + j * s} L ${right} ${top + j * s}`)
    paths.push({ d: lines.join(' '), cls: 'grid' })
    if (props.axes) {
      paths.push({ d: `M ${left} ${bottom} L ${right + 16} ${bottom} M ${left} ${bottom} L ${left} ${top - 16}`, cls: 'axis' })
      paths.push({ d: arrowHead(right + 16, bottom, 90, 7), cls: 'axis' })
      paths.push({ d: arrowHead(left, top - 16, 0, 7), cls: 'axis' })
    }
    // 横轴的数：分拣机器人图的传递口（红圆里写着号，号就是这一列的数）那几列不再写
    const ports = new Set(props.marks.filter((m) => m.t === 'dot' && m.y === 0 && m.n === m.x).map((m) => m.x))
    for (let i = 0; i <= props.cols; i++) if (!ports.has(i)) texts.push({ x: left + i * s, y: f1(bottom + 15), text: String(i), cls: 'axis-num' })
    for (let j = 1; j <= props.rows; j++) texts.push({ x: left - 6, y: f1(bottom - j * s + 4), text: String(j), cls: 'axis-num', anchor: 'end' })
    if (props.diag) paths.push({ d: `M ${left} ${bottom} L ${left + s} ${bottom - s}`, cls: 'diag' })
    for (const sh of props.shapes) {
      const ps = sh.pts.map(([x, y]) => at(x, y))
      paths.push({ d: ps.map(([x, y], i) => `${i ? 'L' : 'M'} ${x} ${y}`).join(' ') + (sh.closed ? ' Z' : ''), cls: sh.dash ? 'shape dash' : 'shape' })
    }
    if (props.route && props.route.length > 1) {
      const ps = props.route.map(([x, y]) => at(x, y))
      paths.push({ d: ps.map(([x, y], i) => `${i ? 'L' : 'M'} ${x} ${y}`).join(' '), cls: 'route' })
      const [ax, ay] = ps[ps.length - 2]!
      const [bx, by] = ps[ps.length - 1]!
      const az = (Math.atan2(bx - ax, -(by - ay)) * 180) / Math.PI
      paths.push({ d: arrowHead(bx, by, (az + 360) % 360, 8), cls: 'route-head' })
    }
    for (const m of props.marks) {
      const [x, y] = at(m.x, m.y)
      const r = Math.max(7, s * 0.38)
      if (m.t === 'tri') paths.push({ d: `M ${f1(x)} ${f1(y - r)} L ${f1(x + r * 0.95)} ${f1(y + r * 0.7)} L ${f1(x - r * 0.95)} ${f1(y + r * 0.7)} Z`, cls: 'tri' })
      else {
        dots.push({ x, y, r, cls: 'port' })
        if (m.n !== undefined) texts.push({ x, y: f1(y + 4), text: String(m.n), cls: 'port-no' })
      }
    }
  }
  for (const it of props.items) {
    const [x, y] = at(it.x, it.y)
    if (cells) {
      if (it.icon) texts.push({ x, y: f1(y + s * 0.22), text: it.icon, cls: 'icon' })
      if (it.tag) texts.push({ x, y: f1(y + 6), text: it.tag, cls: 'cell-tag' })
      if (it.ask) texts.push({ x, y: f1(y + 6), text: '?', cls: 'ask' })
      continue
    }
    if (it.icon) texts.push({ x, y: f1(y + 6), text: it.icon, cls: 'icon' })
    else dots.push({ x, y, r: 4, cls: 'pt' })
    if (it.tag) texts.push({ x: f1(x - 6), y: f1(y - 6), text: it.tag, cls: 'tag', anchor: 'end' })
    if (it.name) texts.push({ x: f1(x + 5), y: f1(y - 6), text: t(it.name), cls: 'name', anchor: 'start' })
    if (it.ask) texts.push({ x: f1(x + 6), y: f1(y - 6), text: '?', cls: 'ask', anchor: 'start' })
  }
  if (props.north) {
    const nx = right + 22
    paths.push({ d: `M ${nx} ${top + 22} L ${nx} ${top + 4}`, cls: 'north' })
    paths.push({ d: arrowHead(nx, top + 4, 0, 6), cls: 'north' })
    texts.push({ x: nx, y: top - 2, text: t({ k: 'm6.pos.ax.n' }), cls: 'compass' })
  }
  if (props.per) {
    paths.push({ d: `M ${left} ${top - 2} L ${left} ${top - 6} L ${left + s} ${top - 6} L ${left + s} ${top - 2}`, cls: 'per-line' })
    texts.push({ x: left, y: top - 9, text: props.per, cls: 'per', anchor: 'start' })
  }
  return { rects, paths, dots, texts }
})
</script>

<template>
  <figure class="pair-grid" role="img" :aria-label="alt || undefined">
    <svg :viewBox="`0 0 ${layout.width} ${layout.height}`" :width="layout.width" :height="layout.height" aria-hidden="true">
      <rect v-for="(r, i) in drawn.rects" :key="`r${i}`" :x="r.x" :y="r.y" :width="r.w" :height="r.h" :rx="r.rx" :class="r.cls" />
      <path v-for="(p, i) in drawn.paths" :key="`p${i}`" :d="p.d" :class="p.cls" />
      <circle v-for="(c, i) in drawn.dots" :key="`c${i}`" :cx="c.x" :cy="c.y" :r="c.r" :class="c.cls" />
      <text v-for="(x, i) in drawn.texts" :key="`t${i}`" :x="x.x" :y="x.y" :text-anchor="x.anchor ?? 'middle'" :class="x.cls">{{ x.text }}</text>
    </svg>
  </figure>
</template>

<style scoped>
.pair-grid {
  margin: 0;
  display: flex;
  justify-content: center;
  max-width: 100%;
}
svg {
  display: block;
  max-width: 100%;
  height: auto;
  overflow: visible;
}
.cell {
  fill: #fff;
  stroke: #5b6b7a;
  stroke-width: 1;
}
.desk {
  fill: #fdf7ea;
  stroke: #8a6d3b;
  stroke-width: 1.4;
}
.f-red {
  fill: #ef5350;
}
.desk.f-red {
  stroke: #b71c1c;
}
.f-blue {
  fill: #64b5f6;
}
.grid {
  fill: none;
  stroke: #9aa7b4;
  stroke-width: 1;
}
.axis,
.north,
.per-line {
  fill: none;
  stroke: var(--c-text);
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.diag {
  fill: none;
  stroke: var(--c-text);
  stroke-width: 1.6;
}
.shape {
  fill: none;
  stroke: #e04848;
  stroke-width: 2.4;
  stroke-linejoin: round;
}
.shape.dash {
  stroke-dasharray: 6 5;
}
.route,
.route-head {
  fill: none;
  stroke: #e04848;
  stroke-width: 2;
  stroke-linecap: round;
}
.route {
  stroke-dasharray: 5 4;
}
.tri {
  fill: #2f7bd6;
}
.port {
  fill: #e8453c;
}
.pt {
  fill: var(--c-text);
}
text {
  font-weight: 700;
}
.axis-num {
  font-size: 12px;
  fill: var(--c-text);
}
.axis-word {
  font-size: 11px;
  fill: var(--c-text-soft, #5b6b7a);
}
.tag {
  font-family: 'Times New Roman', Georgia, serif;
  font-style: italic;
  font-size: 15px;
  fill: var(--c-text);
  paint-order: stroke;
  stroke: #fff;
  stroke-width: 3px;
}
.cell-tag {
  font-family: 'Times New Roman', Georgia, serif;
  font-style: italic;
  font-size: 16px;
  fill: var(--c-text);
}
.name {
  font-size: 11px;
  fill: #2e5f8a;
  paint-order: stroke;
  stroke: #fff;
  stroke-width: 3px;
  stroke-linejoin: round;
}
.icon {
  font-size: 16px;
}
.ask {
  font-size: 15px;
  font-weight: 800;
  fill: var(--c-primary-dark);
}
.port-no {
  font-size: 9px;
  font-weight: 800;
  fill: #fff;
}
.compass {
  font-size: 13px;
  font-weight: 800;
  fill: var(--c-red);
}
.per {
  font-size: 11px;
  fill: var(--c-text);
}
</style>
