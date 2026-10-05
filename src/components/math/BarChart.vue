<script setup lang="ts">
import { computed } from 'vue'
import type { BarSeries, LStr } from '@/types/models'
import { t } from '@/engine/i18n'

/**
 * 条形统计图（四上「条形统计图」，照课本 p88–101 画）：
 * - dir：v 竖向（条立着，类别在横轴下面，数量轴在左边，轴名写在数量轴顶上；类别轴的名字写在横轴右端）；
 *   h 横向（条躺着，类别从下往上排、第一个最靠近原点，类别轴的名字写在纵轴顶上；数量轴在下面，轴名写在右端）。
 * - grid：满格方格纸（课本的单式图：横竖格线都画，条宽 1 格、条与条之间空 1 格，数量轴每条格线都标数，条上不写数）；
 *   否则只在数量轴上画短刻度（课本的复式图）。numbers：条顶（横向图是条的右端）写数。
 * - step = 1 格代表几、cells = 数量轴一共几格，刻度从 0 开始、每格都标数（隔一格标一个会让孩子把「每格代表几」看错）。
 *   hideScale：刻度上的数不写、画成空框（「每格代表几本」要自己推）。值可以是半格。
 * - series 两三组（复式）：每个类别的几条紧挨着，颜色看右上角的图例；null 的那一条没画，画一个虚线框「?」（按统计表补画的题）。
 * 图里的字（类别、轴名、图例、图题）不注音、不朗读——同三年级的统计表，题目文字里会说清问的是哪一类；英文首字母大写。
 * 尺寸按内容算（自然宽度 300–420 像素），窄屏上整张图等比缩小；aria-label 只说图题，不说数。
 */
const props = withDefaults(
  defineProps<{
    dir?: 'v' | 'h'
    title?: LStr
    cats: LStr[]
    series: BarSeries[]
    step: number
    cells: number
    valueAxis: LStr
    catAxis: LStr
    grid?: boolean
    numbers?: boolean
    hideScale?: boolean
  }>(),
  { dir: 'v', title: undefined, grid: false, numbers: false, hideScale: false },
)

const PAD = 6
const F_TITLE = 15
const F_AXIS = 12
const F_LABEL = 13
const F_TICK = 12
const F_NUM = 12
const TONES = ['blue', 'pink', 'green'] as const

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)
const tc = (l: LStr): string => cap(t(l))

/** 估一段字的宽度（像素）：汉字一个字号宽，数字、拉丁字母约 0.58 个，emoji 1.2 个 */
function textW(s: string, f: number): number {
  let w = 0
  for (const ch of s) {
    if (/\p{Extended_Pictographic}/u.test(ch)) w += 1.2 * f
    else if (/[⺀-鿿　-〿＀-￯]/.test(ch)) w += f
    else if (/[ il.,:;'!|()]/.test(ch)) w += 0.32 * f
    else if (/[mwMW]/.test(ch)) w += 0.86 * f
    else w += 0.58 * f
  }
  return w
}

/** 一个名字放不下时折成两行：英文在中间附近的空格处断，「100及以下」断成「100」「及以下」，四个字以上的汉字对半断 */
function split2(s: string): string[] | null {
  const spaces = [...s].map((c, i) => (c === ' ' ? i : -1)).filter((i) => i > 0)
  if (spaces.length) {
    const mid = s.length / 2
    const at = spaces.reduce((b, i) => (Math.abs(i - mid) < Math.abs(b - mid) ? i : b), spaces[0]!)
    return [s.slice(0, at), s.slice(at + 1)]
  }
  const num = /^(\d+)(\D+)$/.exec(s)
  if (num) return [num[1]!, num[2]!]
  const chars = [...s]
  if (chars.length >= 4 && chars.every((c) => /[一-鿿]/.test(c))) {
    const h = Math.ceil(chars.length / 2)
    return [chars.slice(0, h).join(''), chars.slice(h).join('')]
  }
  return null
}
interface Fitted {
  lines: string[]
  f: number
}
function fit(s: string, maxW: number, f0: number, min = 9): Fitted {
  if (textW(s, f0) <= maxW) return { lines: [s], f: f0 }
  const two = split2(s)
  if (two) {
    const w = Math.max(...two.map((x) => textW(x, f0)))
    return { lines: two, f: w <= maxW ? f0 : Math.max(min, Math.floor((f0 * maxW) / w)) }
  }
  return { lines: [s], f: Math.max(min, Math.floor((f0 * maxW) / textW(s, f0))) }
}

interface Txt {
  x: number
  y: number
  s: string
  cls: string
  anchor: 'start' | 'middle' | 'end'
  f: number
}
interface Box {
  x: number
  y: number
  w: number
  h: number
  cls: string
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
  lines: Seg[]
  bars: Box[]
  boxes: Box[]
  texts: Txt[]
}

/** 图题、图例、一条轴的名字（竖向图是数量轴、横向图是类别轴）：从上往下排，返回下面一行能从哪里开始 */
function header(width: number, name: string, out: Layout): number {
  let y = PAD
  const nameW = textW(name, F_AXIS)
  if (props.title) {
    const title = tc(props.title)
    out.texts.push({ x: width / 2, y: y + F_TITLE, s: title, cls: 'title', anchor: 'middle', f: F_TITLE })
    // 单式图没有图例：轴名放得进图题左边就和图题并排一行（省出一行高，手机竖屏练习页放得下）
    if (props.series.length === 1 && PAD + nameW + 10 <= width / 2 - textW(title, F_TITLE) / 2) {
      out.texts.push({ x: PAD, y: y + F_TITLE, s: name, cls: 'axis-name', anchor: 'start', f: F_AXIS })
      return y + F_TITLE + 6
    }
    y += F_TITLE + 8
  }
  let legendRow = -1
  if (props.series.length > 1) {
    const items = props.series.map((s, i) => ({ s: s.name ? tc(s.name) : '', tone: tones.value[i]! }))
    const widths = items.map((it) => 14 + 4 + textW(it.s, F_AXIS))
    const total = widths.reduce((a, b) => a + b, 0) + 12 * (items.length - 1)
    // 图例和轴名放得进一行就并排（图例靠右），放不下图例单独一行
    const shared = PAD + nameW + 16 + total <= width - PAD
    legendRow = y
    let x = width - PAD - total
    items.forEach((it, i) => {
      out.boxes.push({ x, y: legendRow + 3, w: 14, h: 10, cls: `swatch ${it.tone}` })
      out.texts.push({ x: x + 18, y: legendRow + 12, s: it.s, cls: 'legend', anchor: 'start', f: F_AXIS })
      x += widths[i]! + 12
    })
    if (!shared) y += 18
  }
  out.texts.push({ x: PAD, y: y + F_AXIS, s: name, cls: 'axis-name', anchor: 'start', f: F_AXIS })
  return y + F_AXIS + 6
}

const tones = computed(() => props.series.map((s, i) => s.tone ?? TONES[i % 3]!))

function layoutV(): Layout {
  const out: Layout = { width: 0, height: 0, grid: [], lines: [], bars: [], boxes: [], texts: [] }
  const n = props.cats.length
  const m = props.series.length
  const cols = 1 + n * (m + 1)
  // 手机竖屏练习页要一屏放下（U5）：方格图的格子最矮 11 像素（刻度的数 10 号字），整张图大约 200 像素高
  const CW = clamp(Math.floor(290 / cols), 12, 28)
  const RH = props.grid ? clamp(Math.floor(140 / props.cells), 11, 20) : clamp(Math.floor(140 / props.cells), 13, 30)
  const W = cols * CW
  const H = props.cells * RH
  const fTick = Math.min(F_TICK, RH - 1)
  const ticks = Array.from({ length: props.cells + 1 }, (_, i) => i * props.step)
  const tickW = props.hideScale ? 18 : Math.max(...ticks.map((v) => textW(String(v), fTick)))
  const L = PAD + tickW + 9
  const catName = tc(props.catAxis)
  const width = Math.ceil(L + W + 12 + textW(catName, F_AXIS) + PAD)
  const top = header(width, tc(props.valueAxis), out)
  const y0 = top + (props.numbers ? 18 : 10)
  const base = y0 + H
  // 方格纸
  if (props.grid) {
    for (let j = 0; j <= cols; j++) out.grid.push({ x1: L + j * CW, y1: y0, x2: L + j * CW, y2: base, cls: 'grid' })
    for (let i = 0; i <= props.cells; i++) out.grid.push({ x1: L, y1: y0 + i * RH, x2: L + W, y2: y0 + i * RH, cls: 'grid' })
  }
  // 两条轴（纵轴往上、横轴往右各多伸出一点，课本的画法）
  out.lines.push({ x1: L, y1: y0 - 10, x2: L, y2: base, cls: 'axis' })
  out.lines.push({ x1: L, y1: base, x2: L + W + 10, y2: base, cls: 'axis' })
  ticks.forEach((v, i) => {
    const y = base - i * RH
    if (!props.grid && i > 0) out.lines.push({ x1: L - 5, y1: y, x2: L, y2: y, cls: 'tick' })
    if (props.hideScale) out.boxes.push({ x: L - 7 - 16, y: y - 7, w: 16, h: 14, cls: 'blank' })
    else out.texts.push({ x: L - 6, y: y + fTick * 0.36, s: String(v), cls: 'tick-label', anchor: 'end', f: fTick })
  })
  // 条
  props.cats.forEach((_, i) => {
    props.series.forEach((s, j) => {
      const v = s.values[i] ?? null
      const x = L + (1 + i * (m + 1) + j) * CW
      if (v === null) {
        out.boxes.push({ x: x + 1, y: base - 20, w: CW - 2, h: 18, cls: 'qbox' })
        out.texts.push({ x: x + CW / 2, y: base - 6, s: '?', cls: 'q', anchor: 'middle', f: Math.min(14, CW) })
        return
      }
      const h = (v / props.step) * RH
      const inset = props.grid ? 0 : 0.5
      if (h > 0) out.bars.push({ x: x + inset, y: base - h, w: CW - 2 * inset, h, cls: `bar ${tones.value[j]}` })
      if (props.numbers) out.texts.push({ x: x + CW / 2, y: base - h - 4, s: String(v), cls: 'num', anchor: 'middle', f: F_NUM })
    })
  })
  // 类别名（放不下折两行或缩小）、类别轴的名字
  const slot = (m + 1) * CW
  const labels = props.cats.map((c) => fit(tc(c), slot - 3, F_LABEL))
  const labF = Math.max(...labels.map((l) => l.f))
  const rowsOfLabels = Math.max(...labels.map((l) => l.lines.length))
  labels.forEach((l, i) => {
    const cx = L + (1 + i * (m + 1) + m / 2) * CW
    l.lines.forEach((s, k) => out.texts.push({ x: cx, y: base + 5 + l.f + k * (l.f + 2), s, cls: 'cat', anchor: 'middle', f: l.f }))
  })
  out.texts.push({ x: L + W + 12, y: base + 5 + labF, s: catName, cls: 'axis-name', anchor: 'start', f: F_AXIS })
  out.width = width
  out.height = Math.ceil(base + 5 + rowsOfLabels * (labF + 2) + PAD)
  return out
}

function layoutH(): Layout {
  const out: Layout = { width: 0, height: 0, grid: [], lines: [], bars: [], boxes: [], texts: [] }
  const n = props.cats.length
  const m = props.series.length
  const rows = 1 + n * (m + 1)
  const RH = clamp(Math.floor(140 / rows), 12, 22)
  const CW = clamp(Math.floor(250 / props.cells), 16, 34)
  const W = props.cells * CW
  const H = rows * RH
  const ticks = Array.from({ length: props.cells + 1 }, (_, i) => i * props.step)
  const widest = Math.max(...ticks.map((v) => textW(String(v), F_TICK)))
  const fTick = widest <= CW - 3 ? F_TICK : Math.max(9, Math.floor((F_TICK * (CW - 3)) / widest))
  const labels = props.cats.map((c) => fit(tc(c), 86, F_LABEL))
  const labW = Math.max(...labels.map((l) => Math.max(...l.lines.map((s) => textW(s, l.f)))))
  const L = PAD + labW + 9
  const valName = tc(props.valueAxis)
  const valW = textW(valName, F_AXIS)
  const numRoom = props.numbers ? 30 : 0
  // 数量轴的名字写在横轴右端（课本），整张图太宽就写到刻度下面、靠右
  const nameRight = L + W + 12 + valW + PAD <= 440
  const width = Math.ceil(L + W + Math.max(nameRight ? 12 + valW : 10, numRoom) + PAD)
  const top = header(width, tc(props.catAxis), out)
  const y0 = top + 10
  const base = y0 + H
  if (props.grid) {
    for (let i = 0; i <= props.cells; i++) out.grid.push({ x1: L + i * CW, y1: y0, x2: L + i * CW, y2: base, cls: 'grid' })
    for (let k = 0; k <= rows; k++) out.grid.push({ x1: L, y1: y0 + k * RH, x2: L + W, y2: y0 + k * RH, cls: 'grid' })
  }
  out.lines.push({ x1: L, y1: y0 - 10, x2: L, y2: base, cls: 'axis' })
  out.lines.push({ x1: L, y1: base, x2: L + W + 10, y2: base, cls: 'axis' })
  ticks.forEach((v, i) => {
    const x = L + i * CW
    if (!props.grid && i > 0) out.lines.push({ x1: x, y1: base, x2: x, y2: base + 5, cls: 'tick' })
    if (props.hideScale) out.boxes.push({ x: x - 8, y: base + 5, w: 16, h: 14, cls: 'blank' })
    else out.texts.push({ x, y: base + 6 + fTick, s: String(v), cls: 'tick-label', anchor: 'middle', f: fTick })
  })
  props.cats.forEach((_, i) => {
    props.series.forEach((s, j) => {
      const v = s.values[i] ?? null
      // 第一组在最上面（课本练习十九第 2 题：A 社区的条在 B 社区上面）
      const fromBottom = 1 + i * (m + 1) + (m - 1 - j)
      const y = base - (fromBottom + 1) * RH
      if (v === null) {
        out.boxes.push({ x: L + 2, y: y + 1, w: 22, h: RH - 2, cls: 'qbox' })
        out.texts.push({ x: L + 13, y: y + RH / 2 + 5, s: '?', cls: 'q', anchor: 'middle', f: Math.min(14, RH) })
        return
      }
      const w = (v / props.step) * CW
      const inset = props.grid ? 0 : 0.5
      if (w > 0) out.bars.push({ x: L, y: y + inset, w, h: RH - 2 * inset, cls: `bar ${tones.value[j]}` })
      if (props.numbers) out.texts.push({ x: L + w + 4, y: y + RH / 2 + F_NUM * 0.36, s: String(v), cls: 'num', anchor: 'start', f: F_NUM })
    })
  })
  labels.forEach((l, i) => {
    const cy = base - (1 + i * (m + 1) + m / 2) * RH
    const first = cy - ((l.lines.length - 1) * (l.f + 2)) / 2 + l.f * 0.36
    l.lines.forEach((s, k) => out.texts.push({ x: L - 7, y: first + k * (l.f + 2), s, cls: 'cat', anchor: 'end', f: l.f }))
  })
  const tickRow = base + 6 + fTick
  if (nameRight) out.texts.push({ x: L + W + 12, y: tickRow, s: valName, cls: 'axis-name', anchor: 'start', f: F_AXIS })
  else out.texts.push({ x: L + W, y: tickRow + F_AXIS + 6, s: valName, cls: 'axis-name', anchor: 'end', f: F_AXIS })
  out.width = width
  out.height = Math.ceil(tickRow + (nameRight ? 0 : F_AXIS + 6) + PAD + 2)
  return out
}

const lay = computed(() => (props.dir === 'h' ? layoutH() : layoutV()))
const label = computed(() => (props.title ? tc(props.title) : t({ k: 'm4.bar.aria' })))
</script>

<template>
  <figure class="bar-chart" :class="[dir === 'h' ? 'horizontal' : 'vertical', { double: series.length > 1, 'is-grid': grid }]">
    <svg
      :viewBox="`0 0 ${lay.width} ${lay.height}`"
      :width="lay.width"
      :height="lay.height"
      role="img"
      :aria-label="label"
      :data-step="step"
      :data-cells="cells"
    >
      <line v-for="(g, i) in lay.grid" :key="`g${i}`" :x1="g.x1" :y1="g.y1" :x2="g.x2" :y2="g.y2" :class="g.cls" />
      <rect v-for="(b, i) in lay.bars" :key="`b${i}`" :x="b.x" :y="b.y" :width="b.w" :height="b.h" :class="b.cls" />
      <line v-for="(l, i) in lay.lines" :key="`l${i}`" :x1="l.x1" :y1="l.y1" :x2="l.x2" :y2="l.y2" :class="l.cls" />
      <rect v-for="(b, i) in lay.boxes" :key="`x${i}`" :x="b.x" :y="b.y" :width="b.w" :height="b.h" :class="b.cls" rx="3" />
      <text v-for="(s, i) in lay.texts" :key="`t${i}`" :x="s.x" :y="s.y" :class="s.cls" :text-anchor="s.anchor" :font-size="s.f">{{ s.s }}</text>
    </svg>
  </figure>
</template>

<style scoped>
.bar-chart {
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
.tick {
  stroke: var(--c-text);
  stroke-width: 1.2;
}
.bar {
  stroke-width: 1;
}
.bar.blue,
.swatch.blue {
  fill: #bcd8f3;
  stroke: #6b9fd3;
}
.bar.pink,
.swatch.pink {
  fill: #f8caca;
  stroke: #d98a8a;
}
.bar.green,
.swatch.green {
  fill: #bfe6d0;
  stroke: #5fae86;
}
.qbox {
  fill: #fff3e6;
  stroke: var(--c-primary);
  stroke-width: 1.5;
  stroke-dasharray: 3 2;
}
.blank {
  fill: none;
  stroke: var(--c-locked);
  stroke-width: 1.4;
  stroke-dasharray: 3 2;
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
}
.tick-label {
  font-variant-numeric: tabular-nums;
}
.num {
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.q {
  fill: var(--c-primary-dark);
  font-weight: 800;
}
</style>
