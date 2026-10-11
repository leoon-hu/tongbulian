<script setup lang="ts">
import { computed } from 'vue'
import type { LineSeries, LStr } from '@/types/models'
import { t } from '@/engine/i18n'

/**
 * 折线统计图（五下「折线统计图」，照课本 p104–111 画）：
 * - 横轴是类别（年份、月份、年龄），名字写在横轴箭头右边；点画在每个类别的那条竖线上（不是格子中间），第一个点离纵轴一格；
 * - 纵轴每格代表 step、一共 cells 格，从 0 起每格都标数，轴名写在纵轴顶上；from：0 上面画一段锯齿形的折断号，
 *   第一格的刻度从 from 起（课本的人口 0→120000、身高 0→50、男女生身高 0→120）；
 * - 每条折线是实心圆点连成的线；两条（复式）时右上角画图例（一小段带点的线 + 名字）；
 * - numbers：每个点旁边写数（课本高铁、空气质量、GDP、气温几幅）——单式图写在点上面，挤的时候一上一下交错（课本 GDP 图的写法）；
 *   复式图同一个类别高的那个点写在上面、低的写在下面；
 * - grid：画方格（课本让学生自己画的空图：每个类别一条竖线、每个刻度一条横线）。
 * 图里的字（图题、轴名、类别、图例、数）不注音、不朗读——题目要问的都写在题干文字里；英文首字母大写。
 * 尺寸按内容算（自然宽度 300–420 像素），窄屏上整张图等比缩小；aria-label 只说图题，不说数。
 */
const props = withDefaults(
  defineProps<{
    title?: LStr
    cats: LStr[]
    series: LineSeries[]
    step: number
    cells: number
    from?: number
    valueAxis: LStr
    catAxis: LStr
    numbers?: boolean
    grid?: boolean
  }>(),
  { title: undefined, from: undefined, numbers: false, grid: false },
)

const PAD = 6
const F_TITLE = 15
const F_AXIS = 12
const F_LABEL = 12
const F_TICK = 12
const F_NUM = 11
const TONES = ['blue', 'orange', 'green'] as const

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)
const tc = (l: LStr): string => cap(t(l))

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
interface Dot {
  x: number
  y: number
  cls: string
  v: number
  i: number
  s: number
}
interface Layout {
  width: number
  height: number
  grid: Seg[]
  lines: Seg[]
  paths: { d: string; cls: string }[]
  dots: Dot[]
  zigzag: string | null
  texts: Txt[]
  swatches: { x: number; y: number; cls: string }[]
}

const tones = computed(() => props.series.map((s, i) => s.tone ?? TONES[i % TONES.length]!))
const label = (s: LineSeries, v: number): string => (s.digits === undefined ? String(v) : v.toFixed(s.digits))

/** 刻度：[值, 第几格]；有 from 时 0 在最下面，第 1 格是 from */
const ticks = computed((): [number, number][] => {
  const out: [number, number][] = [[0, 0]]
  for (let i = 1; i <= props.cells; i++) out.push([props.from === undefined ? i * props.step : props.from + (i - 1) * props.step, i])
  return out
})

const lay = computed((): Layout => {
  const out: Layout = { width: 0, height: 0, grid: [], lines: [], paths: [], dots: [], zigzag: null, texts: [], swatches: [] }
  const n = props.cats.length
  const m = props.series.length
  // 手机竖屏练习页要一屏放下（U5）：整张图大约 230 像素高、自然宽度 300–420
  const CW = clamp(Math.floor(300 / (n + 1)), 20, 44)
  const RH = clamp(Math.floor(118 / props.cells), 10, 22)
  const H = props.cells * RH
  const fTick = Math.min(F_TICK, RH)
  const tickW = Math.max(...ticks.value.map(([v]) => textW(String(v), fTick)))
  const L = PAD + tickW + 9
  const xAt = (i: number): number => L + (i + 1) * CW
  const right = L + (n + 0.6) * CW
  const catName = tc(props.catAxis)
  const width = Math.ceil(right + 12 + textW(catName, F_AXIS) + PAD)

  // 图题、图例、纵轴名（从上往下排）
  let y = PAD
  const valName = tc(props.valueAxis)
  const valW = textW(valName, F_AXIS)
  if (props.title) {
    const title = tc(props.title)
    const tf = textW(title, F_TITLE) > width - 2 * PAD ? Math.max(11, Math.floor((F_TITLE * (width - 2 * PAD)) / textW(title, F_TITLE))) : F_TITLE
    out.texts.push({ x: width / 2, y: y + tf, s: title, cls: 'title', anchor: 'middle', f: tf })
    y += tf + 8
  }
  if (m > 1) {
    const items = props.series.map((s, i) => ({ s: s.name ? tc(s.name) : '', tone: tones.value[i]! }))
    const widths = items.map((it) => 22 + 4 + textW(it.s, F_AXIS))
    const total = widths.reduce((a, b) => a + b, 0) + 12 * (items.length - 1)
    // 图例和纵轴名放得进一行就并排（图例靠右），放不下图例单独一行
    const shared = PAD + valW + 16 + total <= width - PAD
    let x = width - PAD - total
    items.forEach((it, i) => {
      out.swatches.push({ x, y: y + 7, cls: it.tone })
      out.texts.push({ x: x + 26, y: y + 11, s: it.s, cls: 'legend', anchor: 'start', f: F_AXIS })
      x += widths[i]! + 12
    })
    if (!shared) y += 18
  }
  out.texts.push({ x: PAD, y: y + F_AXIS, s: valName, cls: 'axis-name', anchor: 'start', f: F_AXIS })
  // 纵轴的箭头尖在轴名下面 6 像素（不压字）；点上写数时最高的点上面再留一行字高
  const y0 = y + F_AXIS + 18 + (props.numbers ? 8 : 0)
  const base = y0 + H
  const yAt = (v: number): number => (props.from === undefined ? base - (v / props.step) * RH : base - RH - ((v - props.from) / props.step) * RH)

  // 方格
  if (props.grid) {
    for (let i = 0; i < n; i++) out.grid.push({ x1: xAt(i), y1: y0, x2: xAt(i), y2: base, cls: 'grid' })
    for (const [, k] of ticks.value) if (k > 0) out.grid.push({ x1: L, y1: base - k * RH, x2: xAt(n - 1), y2: base - k * RH, cls: 'grid' })
  }
  // 两条轴（纵轴往上、横轴往右各多伸出一点，带箭头）；有折断号时纵轴在 0 和第一格中间断开，换成一段锯齿
  if (props.from !== undefined) {
    const zy = base - RH / 2
    const lo = Math.min(base, zy + 6)
    const hi = Math.max(y0, zy - 6)
    out.lines.push({ x1: L, y1: y0 - 11, x2: L, y2: hi, cls: 'axis' })
    out.lines.push({ x1: L, y1: lo, x2: L, y2: base, cls: 'axis' })
    out.zigzag = `M${L} ${lo}L${L - 4} ${lo - (lo - hi) * 0.25}L${L + 4} ${lo - (lo - hi) * 0.5}L${L - 4} ${lo - (lo - hi) * 0.75}L${L} ${hi}`
  } else out.lines.push({ x1: L, y1: y0 - 11, x2: L, y2: base, cls: 'axis' })
  out.lines.push({ x1: L, y1: base, x2: right + 6, y2: base, cls: 'axis' })
  out.paths.push({ d: `M${L - 4} ${y0 - 4}L${L} ${y0 - 12}L${L + 4} ${y0 - 4}`, cls: 'arrow' })
  out.paths.push({ d: `M${right} ${base - 4}L${right + 8} ${base}L${right} ${base + 4}`, cls: 'arrow' })
  ticks.value.forEach(([v, k]) => {
    const ty = base - k * RH
    if (k > 0) out.lines.push({ x1: L - 4, y1: ty, x2: L, y2: ty, cls: 'tick' })
    out.texts.push({ x: L - 6, y: ty + fTick * 0.36, s: String(v), cls: 'tick-label', anchor: 'end', f: fTick })
  })
  // 类别：竖线上的短刻度 + 名字（放不下就缩小字号）
  const names = props.cats.map((c) => tc(c))
  const widest = Math.max(...names.map((s) => textW(s, F_LABEL)))
  // 相邻两个名字之间至少空 5 像素（9 个年份并排时 12 号字挨在一起）
  const fCat = widest <= CW - 5 ? F_LABEL : Math.max(8, Math.floor((F_LABEL * (CW - 5)) / widest))
  names.forEach((s, i) => {
    out.lines.push({ x1: xAt(i), y1: base, x2: xAt(i), y2: base + 4, cls: 'tick' })
    out.texts.push({ x: xAt(i), y: base + 6 + fCat, s, cls: 'cat', anchor: 'middle', f: fCat })
  })
  out.texts.push({ x: right + 12, y: base + 6 + fCat, s: catName, cls: 'axis-name', anchor: 'start', f: F_AXIS })

  // 折线与点
  props.series.forEach((s, j) => {
    const tone = tones.value[j]!
    let d = ''
    let open = false
    s.values.forEach((v, i) => {
      if (v === null || v === undefined || i >= n) {
        open = false
        return
      }
      d += `${open ? 'L' : 'M'}${xAt(i).toFixed(2)} ${yAt(v).toFixed(2)}`
      open = true
    })
    if (d) out.paths.push({ d, cls: `line ${tone}` })
    s.values.forEach((v, i) => {
      if (v === null || v === undefined || i >= n) return
      out.dots.push({ x: xAt(i), y: yAt(v), cls: `pt ${tone}`, v, i, s: j })
    })
  })
  // 点旁边的数：字号按最长的数放得下来定（单式图挤的时候一上一下交错，能用两格宽；复式图同一行只有一格宽），最小 9 号
  if (props.numbers) {
    const longest = Math.max(...props.series.flatMap((s) => s.values.filter((v): v is number => v !== null).map((v) => label(s, v).length)))
    const crowded = 0.58 * F_NUM * longest > CW * 0.92
    const room = (m === 1 && crowded ? 2 * CW : CW) - 3
    const fNum = clamp(Math.floor(room / (0.58 * longest)), 9, F_NUM)
    props.series.forEach((s, j) => {
      const tone = tones.value[j]!
      s.values.forEach((v, i) => {
        if (v === null || v === undefined || i >= n) return
        // 复式图：这个类别里比别的线高（或一样高时排在前面）的写上面，低的写下面
        const others = props.series.filter((_, k) => k !== j).map((o) => o.values[i] ?? null)
        let pos: 'above' | 'below' | 'side' = 'above'
        if (m > 1) pos = others.every((o) => o === null || v > o || (v === o && j === 0)) ? 'above' : 'below'
        // 一上一下交错，最后一个点写在上面（课本 GDP 图的写法：最右边没有遮挡）
        else if (crowded) pos = (n - 1 - i) % 2 === 0 ? 'above' : 'below'
        const py = yAt(v)
        // 写在下面会压到横轴（数很小的点）：改写在上面；上面正好有另一条线的数（两个点挨着），就写在点的旁边
        if (pos === 'below' && py + 6 + fNum > base - 2) {
          const close = others.some((o) => o !== null && Math.abs(yAt(o) - py) < fNum + 8)
          pos = close ? 'side' : 'above'
        }
        if (pos === 'above' && py - 6 - fNum < y0 - 14) pos = 'below'
        // 写在旁边：第一个点写在左边（纵轴和第一个点之间空着一格），最后一个点也写在左边（右边是横轴的名字），其余写在右边
        const left = i === 0 || i === n - 1
        if (pos === 'side') out.texts.push({ x: xAt(i) + (left ? -7 : 7), y: py + fNum * 0.36, s: label(s, v), cls: `num ${tone}`, anchor: left ? 'end' : 'start', f: fNum })
        else out.texts.push({ x: xAt(i), y: pos === 'above' ? py - 6 : py + 6 + fNum, s: label(s, v), cls: `num ${tone}`, anchor: 'middle', f: fNum })
      })
    })
  }
  out.width = width
  out.height = Math.ceil(base + 6 + fCat + PAD + 2)
  return out
})

const aria = computed(() => (props.title ? tc(props.title) : t({ k: 'm5.line.aria' })))
</script>

<template>
  <figure class="line-chart" :class="{ double: series.length > 1, 'is-grid': grid }">
    <svg
      :viewBox="`0 0 ${lay.width} ${lay.height}`"
      :width="lay.width"
      :height="lay.height"
      role="img"
      :aria-label="aria"
      :data-step="step"
      :data-cells="cells"
      :data-from="from"
    >
      <line v-for="(g, i) in lay.grid" :key="`g${i}`" :x1="g.x1" :y1="g.y1" :x2="g.x2" :y2="g.y2" :class="g.cls" />
      <line v-for="(l, i) in lay.lines" :key="`l${i}`" :x1="l.x1" :y1="l.y1" :x2="l.x2" :y2="l.y2" :class="l.cls" />
      <path v-if="lay.zigzag" class="zigzag" :d="lay.zigzag" />
      <path v-for="(p, i) in lay.paths" :key="`p${i}`" :d="p.d" :class="p.cls" />
      <circle v-for="(p, i) in lay.dots" :key="`d${i}`" :cx="p.x" :cy="p.y" r="3.2" :class="p.cls" :data-v="p.v" :data-i="p.i" :data-s="p.s" />
      <g v-for="(w, i) in lay.swatches" :key="`w${i}`" class="swatch" :class="w.cls">
        <line :x1="w.x" :y1="w.y" :x2="w.x + 22" :y2="w.y" />
        <circle :cx="w.x + 11" :cy="w.y" r="3.2" />
      </g>
      <text v-for="(s, i) in lay.texts" :key="`t${i}`" :x="s.x" :y="s.y" :class="s.cls" :text-anchor="s.anchor" :font-size="s.f">{{ s.s }}</text>
    </svg>
  </figure>
</template>

<style scoped>
.line-chart {
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
.zigzag {
  fill: none;
  stroke: var(--c-text);
  stroke-width: 1.4;
  stroke-linejoin: round;
  /* 盖住折断处的那一截纵轴 */
  paint-order: stroke;
}
.tick {
  stroke: var(--c-text);
  stroke-width: 1.2;
}
.line {
  fill: none;
  stroke-width: 2;
  stroke-linejoin: round;
  stroke-linecap: round;
}
.line.blue,
.swatch.blue line {
  stroke: #2f86c8;
}
.line.orange,
.swatch.orange line {
  stroke: #ea8a2e;
}
.line.green,
.swatch.green line {
  stroke: #3ba371;
}
.swatch line {
  stroke-width: 2;
}
.pt.blue,
.swatch.blue circle {
  fill: #2f86c8;
}
.pt.orange,
.swatch.orange circle {
  fill: #ea8a2e;
}
.pt.green,
.swatch.green circle {
  fill: #3ba371;
}
text {
  fill: var(--c-text);
  font-family: inherit;
}
.title {
  font-weight: 800;
}
.axis-name,
.legend {
  fill: var(--c-text-light);
  font-weight: 700;
}
.cat {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.tick-label {
  font-variant-numeric: tabular-nums;
}
.num {
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.num.blue {
  fill: #1f6aa3;
}
.num.orange {
  fill: #b9631a;
}
.num.green {
  fill: #23784f;
}
</style>
