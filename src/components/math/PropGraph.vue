<script setup lang="ts">
import { computed } from 'vue'
import type { GraphAxis, GraphSeries, LStr } from '@/types/models'
import { t } from '@/engine/i18n'

/**
 * 正比例 / 反比例图象（六下「比例」p44–50，照课本画）：方格纸上横轴、纵轴都从 0 起（原点写 0），每格代表 step，每 every 格标一个数；
 * 纵轴名写在纵轴顶上、横轴名写在横轴箭头右边。
 * - 每组点是实心圆点；line = 'origin' 从 0 点画直线经过这些点（课本的正比例图象），extend 一直画到方格的边上（「连起来再延长」）；
 *   'curve' 画过这些点的光滑曲线 xy = 常数（课本「你知道吗」的反比例图象，extend 从方格顶上画到右边）；名字（斑马 / 梅花鹿）写在线的末端。
 * - guide：读图的红虚线，从横轴上的 x（或纵轴上的 y）画到第一组的线上，再拐到另一条轴，那一头画「?」（「买 9 m 彩带，总价是多少」）。
 * - marks：另外描的点，画空心圈（「把这个点描出来，它在这条直线上吗」）。
 * 图里的字（轴名、刻度、名字）不注音、不朗读——题目要问的都写在题干文字里；英文首字母大写。
 * 尺寸按格子算（自然宽度约 300 像素），窄屏上整张图等比缩小；aria-label 只说「图象」，不说是正比例还是反比例。
 */
const props = withDefaults(
  defineProps<{
    x: GraphAxis
    y: GraphAxis
    series: GraphSeries[]
    guide?: { x?: number; y?: number }
    marks?: [number, number][]
  }>(),
  { guide: undefined, marks: () => [] },
)

const PAD = 6
const F_AXIS = 12
const F_TICK = 11
const F_NAME = 12
const TONES = ['blue', 'orange', 'green'] as const

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)
const tc = (l: LStr): string => cap(t(l))
/** 刻度上的数：去掉浮点尾巴（3.5 × 3 = 10.5，0.8 × 3 = 2.4000000000000004 → 2.4） */
const num = (v: number): string => String(Number(v.toFixed(4)))

/** 估一段字的宽度（像素）：汉字一个字号宽，数字、拉丁字母约 0.58 个，小数点、斜杠窄 */
function textW(s: string, f: number): number {
  let w = 0
  for (const ch of s) {
    if (/[⺀-鿿　-〿＀-￯]/.test(ch)) w += f
    else if (/[ il.,:;'!|()/]/.test(ch)) w += 0.32 * f
    else if (/[mwMW]/.test(ch)) w += 0.86 * f
    else w += 0.58 * f
  }
  return w
}

interface Txt {
  x: number
  y: number
  s: string
  cls: string
  anchor: 'start' | 'middle' | 'end'
  f: number
}
interface Seg {
  x1: number
  y1: number
  x2: number
  y2: number
  cls: string
}
interface Layout {
  width: number
  height: number
  grid: Seg[]
  axes: Seg[]
  arrows: string[]
  lines: { d: string; cls: string }[]
  dots: { x: number; y: number; cls: string; vx: number; vy: number }[]
  marks: { x: number; y: number; vx: number; vy: number }[]
  guide: string | null
  texts: Txt[]
}

/** 第一个横坐标不是 0 的点：正比例的比值 y ÷ x、反比例的乘积 x × y 都按它算 */
const lead = (s: GraphSeries): [number, number] | undefined => s.pts.find(([px]) => px > 0)

/** 这组线在 x 处的纵坐标（没有线的按相邻两点连线算） */
function valueAt(s: GraphSeries, vx: number): number | null {
  const p = lead(s)
  if (!p) return null
  if (s.line === 'origin') return (p[1] / p[0]) * vx
  if (s.line === 'curve') return vx > 0 ? (p[0] * p[1]) / vx : null
  const pts = [...s.pts].sort((a, b) => a[0] - b[0])
  for (let i = 0; i + 1 < pts.length; i++) {
    const [x1, y1] = pts[i]!
    const [x2, y2] = pts[i + 1]!
    if (vx >= x1 && vx <= x2 && x2 > x1) return y1 + ((y2 - y1) * (vx - x1)) / (x2 - x1)
  }
  return null
}
/** 这组线上纵坐标是 vy 的点的横坐标 */
function argAt(s: GraphSeries, vy: number): number | null {
  const p = lead(s)
  if (!p) return null
  if (s.line === 'origin') return p[1] === 0 ? null : (vy * p[0]) / p[1]
  if (s.line === 'curve') return vy > 0 ? (p[0] * p[1]) / vy : null
  const pts = [...s.pts].sort((a, b) => a[0] - b[0])
  for (let i = 0; i + 1 < pts.length; i++) {
    const [x1, y1] = pts[i]!
    const [x2, y2] = pts[i + 1]!
    if ((vy - y1) * (vy - y2) <= 0 && y2 !== y1) return x1 + ((x2 - x1) * (vy - y1)) / (y2 - y1)
  }
  return null
}

const lay = computed((): Layout => {
  const out: Layout = { width: 0, height: 0, grid: [], axes: [], arrows: [], lines: [], dots: [], marks: [], guide: null, texts: [] }
  const X = props.x
  const Y = props.y
  // 方格一样大（课本的方格纸）：方格不超过 250 × 105 像素，整张图不超过约 300 像素宽、160 像素高，手机竖屏练习页连题目和选项一屏放得下（U5）
  const C = clamp(Math.min(Math.floor(250 / X.cells), Math.floor(105 / Y.cells)), 9, 26)
  const xMax = X.cells * X.step
  const yMax = Y.cells * Y.step
  const yEvery = Y.every ?? 1
  const xEvery = X.every ?? 1
  const yLabels: [number, string][] = []
  for (let k = yEvery; k <= Y.cells; k += yEvery) yLabels.push([k, num(k * Y.step)])
  const tickW = Math.max(textW('0', F_TICK), ...yLabels.map(([, s]) => textW(s, F_TICK)))
  const L = Math.ceil(PAD + tickW + 7)
  const yName = tc(Y.name)
  const xName = tc(X.name)
  const top = PAD + F_AXIS + 16
  const base = top + Y.cells * C
  const gridR = L + X.cells * C
  const right = gridR + 12
  const xAt = (v: number): number => L + (v / X.step) * C
  const yAt = (v: number): number => base - (v / Y.step) * C

  // 方格
  for (let i = 1; i <= X.cells; i++) out.grid.push({ x1: L + i * C, y1: top, x2: L + i * C, y2: base, cls: 'grid' })
  for (let k = 1; k <= Y.cells; k++) out.grid.push({ x1: L, y1: base - k * C, x2: gridR, y2: base - k * C, cls: 'grid' })
  // 两条轴（多伸出一点，带箭头）
  out.axes.push({ x1: L, y1: base, x2: L, y2: top - 12, cls: 'axis' })
  out.axes.push({ x1: L, y1: base, x2: right, y2: base, cls: 'axis' })
  out.arrows.push(`M${L - 4} ${top - 5}L${L} ${top - 13}L${L + 4} ${top - 5}`)
  out.arrows.push(`M${right - 7} ${base - 4}L${right + 1} ${base}L${right - 7} ${base + 4}`)
  out.texts.push({ x: PAD, y: PAD + F_AXIS, s: yName, cls: 'axis-name y-name', anchor: 'start', f: F_AXIS })
  out.texts.push({ x: right + 5, y: base + F_AXIS * 0.36, s: xName, cls: 'axis-name x-name', anchor: 'start', f: F_AXIS })
  // 刻度：原点写一个 0（课本的写法），纵轴的数写在左边、横轴的数写在下面
  out.texts.push({ x: L - 4, y: base + 4 + F_TICK, s: '0', cls: 'tick origin', anchor: 'end', f: F_TICK })
  for (const [k, s] of yLabels) out.texts.push({ x: L - 5, y: base - k * C + F_TICK * 0.36, s, cls: 'tick tick-y', anchor: 'end', f: F_TICK })
  const xLabels: [number, string][] = []
  for (let k = xEvery; k <= X.cells; k += xEvery) xLabels.push([k, num(k * X.step)])
  // 横轴上的数挤（每格很窄、数又长）时缩小字号
  const room = C * xEvery - 3
  const widest = Math.max(...xLabels.map(([, s]) => textW(s, F_TICK)), 1)
  const fx = widest <= room ? F_TICK : Math.max(8, Math.floor((F_TICK * room) / widest))
  for (const [k, s] of xLabels) out.texts.push({ x: L + k * C, y: base + 4 + fx, s, cls: 'tick tick-x', anchor: 'middle', f: fx })

  // 线、点、名字
  props.series.forEach((s, j) => {
    const tone = s.tone ?? TONES[j % TONES.length]!
    const p = lead(s)
    let end: [number, number] | null = null
    if (s.line === 'origin' && p) {
      const k = p[1] / p[0]
      const last = Math.max(...s.pts.map(([px]) => px))
      const ex = s.extend ? Math.min(xMax, k > 0 ? yMax / k : xMax) : last
      end = [ex, k * ex]
      out.lines.push({ d: `M${xAt(0).toFixed(2)} ${yAt(0).toFixed(2)}L${xAt(ex).toFixed(2)} ${yAt(k * ex).toFixed(2)}`, cls: `line ${tone}` })
    } else if (s.line === 'curve' && p) {
      const c = p[0] * p[1]
      const xs = s.pts.map(([px]) => px).filter((v) => v > 0)
      const from = s.extend ? Math.max(c / yMax, Math.min(...xs) / 4) : Math.min(...xs)
      const to = s.extend ? xMax : Math.max(...xs)
      // 横坐标按等比取点（越靠近纵轴曲线越陡，点取得越密），折线看起来就是光滑的曲线
      const n = 64
      let d = ''
      for (let i = 0; i <= n; i++) {
        const vx = from * (to / from) ** (i / n)
        d += `${i ? 'L' : 'M'}${xAt(vx).toFixed(2)} ${yAt(c / vx).toFixed(2)}`
      }
      end = [to, c / to]
      out.lines.push({ d, cls: `line curve ${tone}` })
    }
    for (const [vx, vy] of s.pts) out.dots.push({ x: xAt(vx), y: yAt(vy), cls: `pt ${tone}`, vx, vy })
    if (s.name) {
      const [ex, ey] = end ?? s.pts[s.pts.length - 1] ?? [0, 0]
      out.texts.push({ x: xAt(ex), y: yAt(ey) - 7, s: tc(s.name), cls: `series-name ${tone}`, anchor: 'middle', f: F_NAME })
    }
  })
  for (const [vx, vy] of props.marks) out.marks.push({ x: xAt(vx), y: yAt(vy), vx, vy })

  // 读图的虚线：按第一组线算交点
  const first = props.series[0]
  if (props.guide && first) {
    if (props.guide.x !== undefined) {
      const gy = valueAt(first, props.guide.x)
      if (gy !== null) {
        const gx = xAt(props.guide.x)
        out.guide = `M${gx.toFixed(2)} ${base}L${gx.toFixed(2)} ${yAt(gy).toFixed(2)}L${L} ${yAt(gy).toFixed(2)}`
        out.texts.push({ x: L + 4, y: yAt(gy) - 4, s: '?', cls: 'ask', anchor: 'start', f: 15 })
      }
    } else if (props.guide.y !== undefined) {
      const gx = argAt(first, props.guide.y)
      if (gx !== null) {
        const gy = yAt(props.guide.y)
        out.guide = `M${L} ${gy.toFixed(2)}L${xAt(gx).toFixed(2)} ${gy.toFixed(2)}L${xAt(gx).toFixed(2)} ${base}`
        out.texts.push({ x: xAt(gx) + 4, y: base - 5, s: '?', cls: 'ask', anchor: 'start', f: 15 })
      }
    }
  }
  out.width = Math.ceil(Math.max(right + 5 + textW(xName, F_AXIS) + PAD, PAD + textW(yName, F_AXIS) + PAD))
  out.height = Math.ceil(base + 4 + Math.max(F_TICK, fx) + PAD + 2)
  return out
})

const aria = computed(() => t({ k: 'm6.prop.graphAria' }))
</script>

<template>
  <figure class="prop-graph">
    <svg
      :viewBox="`0 0 ${lay.width} ${lay.height}`"
      :width="lay.width"
      :height="lay.height"
      role="img"
      :aria-label="aria"
      :data-xstep="x.step"
      :data-xcells="x.cells"
      :data-ystep="y.step"
      :data-ycells="y.cells"
    >
      <line v-for="(g, i) in lay.grid" :key="`g${i}`" :x1="g.x1" :y1="g.y1" :x2="g.x2" :y2="g.y2" :class="g.cls" />
      <line v-for="(a, i) in lay.axes" :key="`a${i}`" :x1="a.x1" :y1="a.y1" :x2="a.x2" :y2="a.y2" :class="a.cls" />
      <path v-for="(d, i) in lay.arrows" :key="`r${i}`" :d="d" class="arrow" />
      <path v-for="(l, i) in lay.lines" :key="`l${i}`" :d="l.d" :class="l.cls" />
      <path v-if="lay.guide" class="guide" :d="lay.guide" />
      <circle v-for="(p, i) in lay.dots" :key="`d${i}`" :cx="p.x" :cy="p.y" r="3.2" :class="p.cls" :data-x="p.vx" :data-y="p.vy" />
      <circle v-for="(m, i) in lay.marks" :key="`m${i}`" :cx="m.x" :cy="m.y" r="4.4" class="mark" :data-x="m.vx" :data-y="m.vy" />
      <text v-for="(s, i) in lay.texts" :key="`t${i}`" :x="s.x" :y="s.y" :class="s.cls" :text-anchor="s.anchor" :font-size="s.f">{{ s.s }}</text>
    </svg>
  </figure>
</template>

<style scoped>
.prop-graph {
  margin: 0;
  max-width: 100%;
  padding: 4px 2px;
  border-radius: var(--radius-sm);
  background: var(--c-card);
  box-shadow: var(--shadow-card);
}
svg {
  display: block;
  max-width: 100%;
  height: auto;
  overflow: visible;
}
.grid {
  stroke: #9fcbeb;
  stroke-width: 1;
}
.axis {
  stroke: var(--c-text);
  stroke-width: 1.6;
  stroke-linecap: round;
}
.arrow {
  fill: none;
  stroke: var(--c-text);
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.line {
  fill: none;
  stroke-width: 2;
  stroke-linejoin: round;
  stroke-linecap: round;
}
.line.blue {
  stroke: #2f86c8;
}
.line.orange {
  stroke: #ea8a2e;
}
.line.green {
  stroke: #3ba371;
}
.pt {
  fill: #d9483b;
}
.mark {
  fill: var(--c-card);
  stroke: #d9483b;
  stroke-width: 2;
}
.guide {
  fill: none;
  stroke: #d9483b;
  stroke-width: 1.6;
  stroke-dasharray: 4 3;
}
text {
  fill: var(--c-text);
  font-family: inherit;
}
.axis-name {
  fill: var(--c-text-light);
  font-weight: 700;
}
.tick {
  font-variant-numeric: tabular-nums;
}
.series-name {
  font-weight: 800;
}
.series-name.blue {
  fill: #1f6aa3;
}
.series-name.orange {
  fill: #b9631a;
}
.series-name.green {
  fill: #23784f;
}
.ask {
  fill: #d9483b;
  font-weight: 800;
}
</style>
