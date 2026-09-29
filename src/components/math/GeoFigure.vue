<script setup lang="ts">
import { computed } from 'vue'
import type { GeoFig, GeoItem, GeoPt, GeoSide, GeoTone } from '@/types/models'

/**
 * 几何图（三年级「线和角」「长方形和正方形」「图形的面积」）：点、线、多边形、方格纸……在每幅图自己的坐标里给出，
 * 这里换算成像素画 SVG——线宽、点、字的大小不随图缩放，放不下时整幅等比缩小。
 * 一组图时下面标 1、2、3……（numbered），选项就是这几个数；一组图共用一个比例，大小能直接比。
 * 图里只画数、字母、「?」和 emoji：汉字要注音、要朗读，都写在题干文字里。alt（图的中文说明）只放在读屏用的 aria-label 上，不显示。
 */
const props = withDefaults(defineProps<{ figs: GeoFig[]; numbered?: boolean; alt?: string }>(), { numbered: false, alt: '' })

const MAX_W = 300 // 一幅图（含留白）最宽多少像素：手机竖屏 360 宽里放得下
const MAX_ROW = 336 // 几幅图排一行时一共最宽多少（窄屏放不下就折行）
const MAX_H_ONE = 190 // 一幅图最高多少：手机竖屏上题目、图和数字键盘要一屏放下（U5）
const MAX_H_MANY = 150
const GAP = 12

type Op =
  | { k: 'path'; d: string; cls: string }
  | { k: 'circle'; x: number; y: number; r: number; cls: string }
  | { k: 'rect'; x: number; y: number; w: number; h: number; cls: string }
  | { k: 'text'; x: number; y: number; text: string; cls: string }

interface Drawn {
  width: number
  height: number
  back: Op[]
  mid: Op[]
  top: Op[]
}

const pad = computed(() => (props.figs.length > 1 ? 10 : 20))

/** 共用的缩放：每幅都放得下；几幅时尽量排成一行（缩得太小就换行） */
const scale = computed(() => {
  const p = pad.value
  const nat = props.figs.map((f) => ({ w: f.w * (f.px ?? 1), h: f.h * (f.px ?? 1) }))
  const maxH = props.figs.length > 1 ? MAX_H_MANY : MAX_H_ONE
  const one = Math.min(1, ...nat.map((n) => (MAX_W - 2 * p) / n.w), ...nat.map((n) => (maxH - 2 * p) / n.h))
  if (props.figs.length < 2) return one
  const row = (MAX_ROW - GAP * (props.figs.length - 1) - 2 * p * props.figs.length) / nat.reduce((a, n) => a + n.w, 0)
  return row >= one * 0.6 ? Math.min(one, row) : one
})

const f1 = (n: number): number => Math.round(n * 10) / 10
const SIDE: Record<GeoSide, [number, number]> = {
  n: [0, -1],
  s: [0, 1],
  e: [1, 0],
  w: [-1, 0],
  ne: [0.8, -0.8],
  nw: [-0.8, -0.8],
  se: [0.8, 0.8],
  sw: [-0.8, 0.8],
}
const unit = (x: number, y: number): [number, number] => {
  const l = Math.hypot(x, y) || 1
  return [x / l, y / l]
}
const tone = (t: GeoTone | undefined, fallback: GeoTone): GeoTone => t ?? fallback

/** 经过各点的平滑曲线（Catmull-Rom → 三次贝塞尔） */
function smooth(ps: [number, number][], closed: boolean): string {
  if (ps.length < 2) return ''
  const at = (i: number): [number, number] => {
    if (closed) return ps[(i + ps.length) % ps.length]!
    return ps[Math.max(0, Math.min(ps.length - 1, i))]!
  }
  const n = closed ? ps.length : ps.length - 1
  let d = `M ${f1(ps[0]![0])} ${f1(ps[0]![1])}`
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1)
    const p1 = at(i)
    const p2 = at(i + 1)
    const p3 = at(i + 2)
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6]
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6]
    d += ` C ${f1(c1[0]!)} ${f1(c1[1]!)} ${f1(c2[0]!)} ${f1(c2[1]!)} ${f1(p2[0])} ${f1(p2[1])}`
  }
  return closed ? d + ' Z' : d
}

/** 直角记号：从顶点沿两边各走 s 再连成小方块 */
function rightMark(v: [number, number], ua: [number, number], ub: [number, number], s = 11): string {
  const p1 = [v[0] + ua[0] * s, v[1] + ua[1] * s]
  const p2 = [v[0] + (ua[0] + ub[0]) * s, v[1] + (ua[1] + ub[1]) * s]
  const p3 = [v[0] + ub[0] * s, v[1] + ub[1] * s]
  return `M ${f1(p1[0]!)} ${f1(p1[1]!)} L ${f1(p2[0]!)} ${f1(p2[1]!)} L ${f1(p3[0]!)} ${f1(p3[1]!)}`
}

function draw(fig: GeoFig): Drawn {
  const p = pad.value
  const k = (fig.px ?? 1) * scale.value
  const P = (pt: GeoPt): [number, number] => [p + pt[0] * k, p + pt[1] * k]
  const back: Op[] = []
  const mid: Op[] = []
  const top: Op[] = []
  const dot = (q: [number, number]): void => {
    top.push({ k: 'circle', x: f1(q[0]), y: f1(q[1]), r: 4.5, cls: 'dot' })
  }
  for (const it of fig.items as GeoItem[]) {
    switch (it.t) {
      case 'poly': {
        const ps = it.pts.map(P)
        const d = ps.map((q, i) => `${i ? 'L' : 'M'} ${f1(q[0])} ${f1(q[1])}`).join(' ') + (it.open ? '' : ' Z')
        if (it.fill && !it.open) back.push({ k: 'path', d, cls: `fill f-${it.fill}` })
        mid.push({ k: 'path', d, cls: `stroke s-${tone(it.stroke, 'ink')}${it.dash ? ' dash' : ''}` })
        const n = ps.length
        // 边长标注：放在每条边中点的外侧，竖边按字的宽度再让开一点。封闭的多边形按顶点的绕向定「外侧」
        // （凹进去的口子里也对）；折线没有里外，放在离各点中心远的那一边
        const cx = ps.reduce((a, q) => a + q[0], 0) / n
        const cy = ps.reduce((a, q) => a + q[1], 0) / n
        const area = ps.reduce((s, q, i) => s + q[0] * ps[(i + 1) % n]![1] - ps[(i + 1) % n]![0] * q[1], 0)
        it.labels?.forEach((text, i) => {
          if (text === null || text === undefined || text === '' || (it.open && i >= n - 1)) return
          const a = ps[i]!
          const b = ps[(i + 1) % n]!
          const mx = (a[0] + b[0]) / 2
          const my = (a[1] + b[1]) / 2
          let [nx, ny] = unit(b[1] - a[1], a[0] - b[0])
          if (it.open ? (mx - cx) * nx + (my - cy) * ny < 0 : area < 0) [nx, ny] = [-nx, -ny]
          const q = text === '?'
          const off = 11 + Math.abs(nx) * (text.length * (q ? 6.5 : 5)) + Math.abs(ny) * (q ? 3 : 1)
          top.push({ k: 'text', x: f1(mx + nx * off), y: f1(my + ny * off), text, cls: q ? 'lbl q' : 'lbl' })
        })
        for (const i of it.right ?? []) {
          const v = ps[i]!
          const prev = ps[(i - 1 + n) % n]!
          const next = ps[(i + 1) % n]!
          mid.push({ k: 'path', d: rightMark(v, unit(prev[0] - v[0], prev[1] - v[1]), unit(next[0] - v[0], next[1] - v[1])), cls: 'mark' })
        }
        break
      }
      case 'line': {
        const a = P(it.a)
        const b = P(it.b)
        mid.push({ k: 'path', d: `M ${f1(a[0])} ${f1(a[1])} L ${f1(b[0])} ${f1(b[1])}`, cls: `stroke s-${tone(it.stroke, 'ink')}${it.dash ? ' dash' : ''}${it.thin ? ' thin' : ''}` })
        if (it.dots?.[0]) dot(a)
        if (it.dots?.[1]) dot(b)
        break
      }
      case 'curve': {
        const ps = it.pts.map(P)
        const d = smooth(ps, !!it.closed)
        if (it.fill && it.closed) back.push({ k: 'path', d, cls: `fill f-${it.fill}` })
        mid.push({ k: 'path', d, cls: `stroke s-${tone(it.stroke, 'ink')}` })
        if (it.dots?.[0]) dot(ps[0]!)
        if (it.dots?.[1]) dot(ps[ps.length - 1]!)
        break
      }
      case 'dot': {
        const q = P(it.at)
        dot(q)
        if (it.label) {
          const [sx, sy] = SIDE[it.side ?? 's']
          top.push({ k: 'text', x: f1(q[0] + sx * 15), y: f1(q[1] + sy * 15), text: it.label, cls: 'letter' })
        }
        break
      }
      case 'text': {
        const q = P(it.at)
        if (it.badge) {
          top.push({ k: 'circle', x: f1(q[0]), y: f1(q[1]), r: 13, cls: 'badge' })
          top.push({ k: 'text', x: f1(q[0]), y: f1(q[1] + 1), text: it.text, cls: 'badge-txt' })
        } else if (it.letter) {
          top.push({ k: 'text', x: f1(q[0]), y: f1(q[1]), text: it.text, cls: 'letter' })
        } else {
          top.push({ k: 'text', x: f1(q[0]), y: f1(q[1]), text: it.text, cls: `txt t-${tone(it.tone, 'ink')}${it.big ? ' big' : ''}` })
        }
        break
      }
      case 'grid': {
        if (it.lines !== false) {
          const lines: string[] = []
          for (let i = 0; i <= it.w; i++) {
            const a = P([it.x + i, it.y])
            const b = P([it.x + i, it.y + it.h])
            lines.push(`M ${f1(a[0])} ${f1(a[1])} L ${f1(b[0])} ${f1(b[1])}`)
          }
          for (let j = 0; j <= it.h; j++) {
            const a = P([it.x, it.y + j])
            const b = P([it.x + it.w, it.y + j])
            lines.push(`M ${f1(a[0])} ${f1(a[1])} L ${f1(b[0])} ${f1(b[1])}`)
          }
          back.push({ k: 'path', d: lines.join(' '), cls: 'gridline' })
        }
        const cells = it.cells ?? []
        if (cells.length) {
          const t = tone(it.fill, 'a')
          const has = new Set(cells.map(([c, r]) => `${c},${r}`))
          for (const [c, r] of cells) {
            const q = P([it.x + c, it.y + r])
            back.push({ k: 'rect', x: f1(q[0]), y: f1(q[1]), w: f1(k), h: f1(k), cls: `cell f-${t} s-${t}` })
          }
          // 涂色区域的外沿：格子的某条边外面没有涂色的格子，就是外沿
          const edges: string[] = []
          const seg = (x1: number, y1: number, x2: number, y2: number): void => {
            const a = P([it.x + x1, it.y + y1])
            const b = P([it.x + x2, it.y + y2])
            edges.push(`M ${f1(a[0])} ${f1(a[1])} L ${f1(b[0])} ${f1(b[1])}`)
          }
          for (const [c, r] of cells) {
            if (!has.has(`${c},${r - 1}`)) seg(c, r, c + 1, r)
            if (!has.has(`${c},${r + 1}`)) seg(c, r + 1, c + 1, r + 1)
            if (!has.has(`${c - 1},${r}`)) seg(c, r, c, r + 1)
            if (!has.has(`${c + 1},${r}`)) seg(c + 1, r, c + 1, r + 1)
          }
          mid.push({ k: 'path', d: edges.join(' '), cls: `stroke outline s-${t}` })
        }
        break
      }
      case 'arc': {
        const v = P(it.at)
        const a = P(it.a)
        const b = P(it.b)
        const ua = unit(a[0] - v[0], a[1] - v[1])
        const ub = unit(b[0] - v[0], b[1] - v[1])
        if (it.right) {
          mid.push({ k: 'path', d: rightMark(v, ua, ub), cls: 'mark' })
        } else {
          const r = 16
          const sweep = ua[0] * ub[1] - ua[1] * ub[0] > 0 ? 1 : 0
          const d = `M ${f1(v[0] + ua[0] * r)} ${f1(v[1] + ua[1] * r)} A ${r} ${r} 0 0 ${sweep} ${f1(v[0] + ub[0] * r)} ${f1(v[1] + ub[1] * r)}`
          mid.push({ k: 'path', d, cls: 'mark' })
        }
        break
      }
    }
  }
  return { width: Math.ceil(fig.w * k + 2 * p), height: Math.ceil(fig.h * k + 2 * p), back, mid, top }
}

const pics = computed(() => props.figs.map(draw))
</script>

<template>
  <div class="geo" :class="{ many: figs.length > 1 }" role="img" :aria-label="alt || undefined">
    <figure v-for="(pic, i) in pics" :key="i" class="geo-fig">
      <svg class="geo-svg" :viewBox="`0 0 ${pic.width} ${pic.height}`" :width="pic.width" :height="pic.height" aria-hidden="true">
        <template v-for="(layer, li) in [pic.back, pic.mid, pic.top]" :key="li">
          <template v-for="(op, j) in layer" :key="j">
            <path v-if="op.k === 'path'" :d="op.d" :class="op.cls" />
            <circle v-else-if="op.k === 'circle'" :cx="op.x" :cy="op.y" :r="op.r" :class="op.cls" />
            <rect v-else-if="op.k === 'rect'" :x="op.x" :y="op.y" :width="op.w" :height="op.h" :class="op.cls" />
            <text v-else :x="op.x" :y="op.y" :class="op.cls">{{ op.text }}</text>
          </template>
        </template>
      </svg>
      <figcaption v-if="numbered">{{ i + 1 }}</figcaption>
    </figure>
  </div>
</template>

<style scoped>
.geo {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-end;
  gap: 10px 12px;
  max-width: 100%;
}
.geo-fig {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  border-radius: var(--radius-md);
  background: var(--c-bg);
}
.geo-svg {
  display: block;
  max-width: 100%;
  height: auto;
  overflow: visible;
}
.geo-fig figcaption {
  min-width: 34px;
  margin-bottom: 6px;
  padding: 0 8px;
  border-radius: 999px;
  background: var(--c-primary);
  color: #fff;
  font-weight: 800;
  font-size: var(--fs-lg);
  text-align: center;
}
.stroke {
  fill: none;
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.stroke.thin {
  stroke-width: 2;
}
.stroke.dash {
  stroke-width: 2.2;
  stroke-dasharray: 7 6;
}
.stroke.outline {
  stroke-width: 3;
  stroke-linecap: square;
}
.s-ink {
  stroke: var(--c-text);
}
.s-a {
  stroke: var(--c-primary-dark);
}
.s-b {
  stroke: #2f7bd6;
}
.s-c {
  stroke: #1f9d68;
}
.s-d {
  stroke: #e04848;
}
.s-soft {
  stroke: #b8ab9c;
}
.fill {
  stroke: none;
}
.f-ink {
  fill: #e9e1d6;
}
.f-a {
  fill: #ffe1bd;
}
.f-b {
  fill: #dcefff;
}
.f-c {
  fill: #d4f5e5;
}
.f-d {
  fill: #ffdcdc;
}
.f-soft {
  fill: #f1ebe2;
}
.f-paper {
  fill: #fff;
}
.s-paper {
  stroke: var(--c-text);
}
.badge {
  fill: var(--c-primary);
}
.badge-txt {
  font-size: 17px;
  font-weight: 800;
  fill: #fff;
}
.cell {
  stroke-width: 1.2;
}
.gridline {
  fill: none;
  stroke: #e0d4c4;
  stroke-width: 1.2;
}
.mark {
  fill: none;
  stroke: var(--c-primary-dark);
  stroke-width: 2.5;
}
.dot {
  fill: var(--c-text);
}
text {
  text-anchor: middle;
  dominant-baseline: central;
}
.lbl {
  font-size: 17px;
  font-weight: 800;
  fill: var(--c-text);
}
.lbl.q {
  font-size: 22px;
  fill: var(--c-primary-dark);
}
.letter {
  font-family: 'Times New Roman', Times, serif;
  font-style: italic;
  font-size: 19px;
  font-weight: 700;
  fill: var(--c-text);
}
.txt {
  font-size: 17px;
  font-weight: 800;
}
.txt.big {
  font-size: 24px;
}
.t-ink {
  fill: var(--c-text);
}
.t-a {
  fill: var(--c-primary-dark);
}
.t-b {
  fill: #2f7bd6;
}
.t-c {
  fill: #1f9d68;
}
.t-d {
  fill: #e04848;
}
.t-soft {
  fill: #9a8c7c;
}
</style>
