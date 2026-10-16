<script setup lang="ts">
import { computed } from 'vue'
import type { BarBrace, BarRow } from '@/types/models'
import { lang, t } from '@/engine/i18n'
import { isFracLabel, parseFigLabel, type FigLabel } from '@/components/math/figLabel'

/**
 * 多行线段图（六上「分数乘法」例 6 / 练习五、「分数除法」例 2、「百分数」的增长线段图），照课本画：一行一条线，左端对齐，左边写名字；
 * 第一行平均分成 unit 段，别的行按 len 用同样长的「段」画长短（见 BarRow）。
 * 每行的刻度：平均分成 parts 段的分点（不填按 len 取整；1 = 只画两端），括号的两端、虚线段的两端也画刻度；dash 那一段画虚线（少掉的部分）。
 * 括号（BarBrace）可以只括一部分，画在线的上面或下面；同一边互相重叠的括号短的贴着线、长的往外排一层。尖上写数、分数（两层）、百分数或「?」。
 * guides = true：从上一行拉灰色竖虚线到这一行——这一行有虚线段就对着虚线段的起点，否则对着两行里短的那一行的右端（长短一样就不画）；
 * guides 给数组：在这些位置（按「段」计）从第一行到最后一行拉红色竖虚线（百分数例 3 标出原来的长度）。
 * 图里的字（名字、括号上的数）不注音、不朗读，题目要问的都写在题干文字里；aria 只说「线段图」。宽度按 viewBox 缩放。
 */
const props = defineProps<{ unit: number; rows: BarRow[]; guides?: boolean | number[] }>()

const W = 320
const X1 = W - 16 // 线最右能画到哪里（右边留给最后一个括号上的字）
const r1 = (n: number): number => Math.round(n * 10) / 10

const names = computed(() => props.rows.map((r) => (r.name === undefined ? '' : t(r.name))))
/** 名字那一栏多宽：汉字 15、数字和字母 9（名字的字号 15） */
const nameW = computed(() => Math.max(0, ...names.value.map((n) => [...n].reduce((s, ch) => s + (/[㐀-鿿]/.test(ch) ? 15 : 9), 0))))
const X0 = computed(() => (nameW.value > 0 ? 8 + nameW.value + 10 : 14))
/** 一共多长（段）：第一行的 unit、每行的长度、虚线段和括号伸到的地方、红线的位置，取最大的 */
const span = computed(() =>
  Math.max(
    props.unit,
    ...props.rows.flatMap((r) => [r.len, r.dash ? Math.max(...r.dash) : 0, ...(r.braces ?? []).map((b) => Math.max(b.from, b.to))]),
    ...(Array.isArray(props.guides) ? props.guides : []),
    0.0001,
  ),
)
const u = computed(() => (X1 - X0.value) / span.value)
const x = (p: number): number => r1(X0.value + p * u.value)

/** 同一边的括号分层：短的在里层（0），和它重叠（不只是挨着）的长括号往外排 */
function levelsOf(bs: BarBrace[]): number[] {
  const lo = (b: BarBrace): number => Math.min(b.from, b.to)
  const hi = (b: BarBrace): number => Math.max(b.from, b.to)
  const order = bs.map((_, i) => i).sort((i, j) => hi(bs[i]!) - lo(bs[i]!) - (hi(bs[j]!) - lo(bs[j]!)))
  const lv: number[] = []
  for (const i of order) {
    let l = 0
    const clash = (j: number): boolean => j !== i && lv[j] === l && Math.min(hi(bs[i]!), hi(bs[j]!)) - Math.max(lo(bs[i]!), lo(bs[j]!)) > 1e-6
    while (order.some(clash)) l++
    lv[i] = l
  }
  return lv
}

const BRACE_GAP = 11 // 里层括号离线多远
const TIP = 5 // 括号的尖
const levelH = (frac: boolean): number => TIP + 4 + (frac ? 31 : 16) + 4 // 一层括号（尖 + 空 + 字）占多高（不含离线的距离）

interface SideLayout {
  /** 每一层括号的横线离线多远 */
  offsets: number[]
  /** 这一边一共占多高（离线的距离 + 各层） */
  extent: number
}
function sideLayout(bs: BarBrace[], lv: number[]): SideLayout {
  if (!bs.length) return { offsets: [], extent: 9 }
  const n = Math.max(...lv) + 1
  const offsets: number[] = []
  let at = BRACE_GAP
  for (let l = 0; l < n; l++) {
    offsets.push(at)
    const frac = bs.some((b, i) => lv[i] === l && isFracLabel(parseFigLabel(b.label)))
    at += levelH(frac)
  }
  return { offsets, extent: at }
}

/** 横着的括号：y 是括号横线，dir -1 尖朝上（线上面的括号），1 尖朝下；两头往线那边弯 */
function hBrace(x1: number, x2: number, y: number, dir: -1 | 1): string {
  const m = (x1 + x2) / 2
  const r = Math.min(6, (x2 - x1) / 4)
  const end = y - dir * 7
  const tip = y + dir * TIP
  return `M${r1(x1)} ${r1(end)}Q${r1(x1)} ${r1(y)} ${r1(x1 + r)} ${r1(y)}L${r1(m - r)} ${r1(y)}Q${r1(m)} ${r1(y)} ${r1(m)} ${r1(tip)}Q${r1(m)} ${r1(y)} ${r1(m + r)} ${r1(y)}L${r1(x2 - r)} ${r1(y)}Q${r1(x2)} ${r1(y)} ${r1(x2)} ${r1(end)}`
}

interface DrawnBrace {
  side: 'top' | 'bottom'
  d: string
  m: number
  /** 字的基线（分数是分子的基线） */
  ty: number
  barY: number
  dy: number
  frac: { n: string; d: string; w?: string } | null
  text: string
  ask: boolean
}
interface DrawnRow {
  name: string
  y: number
  segs: { x1: number; x2: number; dash: boolean }[]
  ticks: number[]
  braces: DrawnBrace[]
}

const layout = computed(() => {
  const out: DrawnRow[] = []
  let cursor = 4
  for (const [ri, row] of props.rows.entries()) {
    const bs = row.braces ?? []
    const tops = bs.filter((b) => b.side === 'top')
    const bottoms = bs.filter((b) => b.side === 'bottom')
    const tLv = levelsOf(tops)
    const bLv = levelsOf(bottoms)
    const tL = sideLayout(tops, tLv)
    const bL = sideLayout(bottoms, bLv)
    const y = cursor + tL.extent
    cursor = y + bL.extent + 6

    // 线：0 到这一行画到的最远处，dash 那一段画虚线
    const end = Math.max(row.len, row.dash ? Math.max(...row.dash) : 0)
    const segs: DrawnRow['segs'] = []
    if (row.dash) {
      const a = Math.max(0, Math.min(...row.dash))
      const b = Math.min(end, Math.max(...row.dash))
      if (a > 0) segs.push({ x1: x(0), x2: x(a), dash: false })
      if (b > a) segs.push({ x1: x(a), x2: x(b), dash: true })
      if (end > b) segs.push({ x1: x(b), x2: x(end), dash: false })
    } else {
      segs.push({ x1: x(0), x2: x(end), dash: false })
    }

    // 刻度：平均分的分点 + 括号两端 + 虚线段两端
    const parts = Math.max(1, Math.round(row.parts ?? row.len))
    const at = new Set<number>()
    for (let k = 0; k <= parts; k++) at.add(r1((row.len * k) / parts))
    for (const b of bs) for (const p of [b.from, b.to]) if (p >= 0 && p <= end) at.add(r1(p))
    if (row.dash) for (const p of row.dash) if (p >= 0 && p <= end) at.add(r1(p))
    at.add(r1(end))
    const ticks = [...at].sort((p, q) => p - q).map(x)

    const drawn: DrawnBrace[] = []
    const place = (b: BarBrace, level: number, lay: SideLayout): void => {
      const dir: -1 | 1 = b.side === 'top' ? -1 : 1
      const lo = Math.min(b.from, b.to)
      const hi = Math.max(b.from, b.to)
      // 挨着的两个括号各往里收一点，免得连成一个
      const xa = x(lo) + 2
      const xb = x(hi) - 2
      const by = y + dir * lay.offsets[level]!
      const near = by + dir * (TIP + 4)
      const lab: FigLabel = parseFigLabel(b.label)
      const frac = isFracLabel(lab) ? lab : null
      drawn.push({
        side: b.side,
        d: hBrace(xa, xb, by, dir),
        m: r1((xa + xb) / 2),
        ty: r1(frac ? (dir < 0 ? near - 19 : near + 13) : dir < 0 ? near - 2 : near + 14),
        barY: r1(dir < 0 ? near - 15 : near + 17),
        dy: r1(dir < 0 ? near : near + 32),
        frac,
        text: frac ? '' : (lab as { text: string }).text,
        ask: !frac && (lab as { text: string }).text.trim().startsWith('?'),
      })
    }
    tops.forEach((b, i) => place(b, tLv[i]!, tL))
    bottoms.forEach((b, i) => place(b, bLv[i]!, bL))
    out.push({ name: names.value[ri]!, y: r1(y), segs, ticks, braces: drawn })
  }
  return { rows: out, height: r1(cursor - 4) }
})
const H = computed(() => layout.value.height)

/** 竖虚线：true = 灰色，上一行到这一行；数组 = 红色，第一行到最后一行 */
const guideLines = computed(() => {
  const rows = layout.value.rows
  if (!rows.length) return []
  if (Array.isArray(props.guides)) {
    const y1 = rows[0]!.y - 10
    const y2 = rows[rows.length - 1]!.y + 10
    return props.guides.map((p) => ({ x: x(p), y1: r1(y1), y2: r1(y2), red: true }))
  }
  if (props.guides !== true) return []
  const out: { x: number; y1: number; y2: number; red: boolean }[] = []
  for (let r = 1; r < props.rows.length; r++) {
    const row = props.rows[r]!
    const prev = props.rows[r - 1]!
    const at = row.dash ? Math.min(...row.dash) : row.len !== prev.len ? Math.min(row.len, prev.len) : null
    if (at === null) continue
    out.push({ x: x(at), y1: r1(rows[r - 1]!.y + 7), y2: r1(rows[r]!.y - 7), red: false })
  }
  return out
})

const aria = computed(() => (lang.value === 'zh' ? '线段图' : 'bar diagram'))
</script>

<template>
  <svg class="frac-bars" :viewBox="`0 0 ${W} ${H}`" :width="W" :height="H" role="img" :aria-label="aria">
    <line v-for="(g, i) in guideLines" :key="`g${i}`" class="guide" :class="{ red: g.red }" :x1="g.x" :y1="g.y1" :x2="g.x" :y2="g.y2" />
    <g v-for="(row, r) in layout.rows" :key="r" class="bar-row">
      <text v-if="row.name" class="name" x="8" :y="row.y + 5">{{ row.name }}</text>
      <line v-for="(s, k) in row.segs" :key="`s${k}`" class="seg" :class="{ dash: s.dash }" :x1="s.x1" :y1="row.y" :x2="s.x2" :y2="row.y" />
      <line v-for="(tx, k) in row.ticks" :key="`t${k}`" class="tick" :x1="tx" :y1="row.y - 6" :x2="tx" :y2="row.y + 6" />
      <g v-for="(b, k) in row.braces" :key="`b${k}`" class="bar-brace" :class="b.side">
        <path class="brace" :d="b.d" />
        <template v-if="b.frac">
          <text v-if="b.frac.w" class="lab whole" :x="b.m - 10" :y="(b.ty + b.dy) / 2 + 2">{{ b.frac.w }}</text>
          <text class="lab num" :x="b.frac.w ? b.m + 6 : b.m" :y="b.ty">{{ b.frac.n }}</text>
          <line class="bar" :x1="(b.frac.w ? b.m + 6 : b.m) - 9" :y1="b.barY" :x2="(b.frac.w ? b.m + 6 : b.m) + 9" :y2="b.barY" />
          <text class="lab den" :x="b.frac.w ? b.m + 6 : b.m" :y="b.dy">{{ b.frac.d }}</text>
        </template>
        <text v-else class="lab" :class="{ ask: b.ask }" :x="b.m" :y="b.ty">{{ b.text }}</text>
      </g>
    </g>
  </svg>
</template>

<style scoped>
.frac-bars {
  display: block;
  max-width: calc(100% - 8px);
  height: auto;
  padding: 6px 4px;
  background: var(--c-card);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  box-sizing: content-box;
}
.seg {
  stroke: #2b8fd6;
  stroke-width: 3;
  stroke-linecap: round;
}
.seg.dash {
  stroke-width: 2.4;
  stroke-dasharray: 6 5;
  stroke-linecap: butt;
}
.tick {
  stroke: #2b8fd6;
  stroke-width: 2;
}
.guide {
  stroke: var(--c-text-light);
  stroke-width: 1.5;
  stroke-dasharray: 4 4;
}
.guide.red {
  stroke: var(--c-red);
  stroke-width: 2;
}
.brace {
  fill: none;
  stroke: var(--c-primary);
  stroke-width: 2.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.name {
  font-size: 15px;
  font-weight: 700;
  fill: var(--c-text);
}
.lab {
  font-size: 15px;
  font-weight: 800;
  text-anchor: middle;
  fill: var(--c-text);
  font-variant-numeric: tabular-nums;
}
.lab.num,
.lab.den {
  font-size: 14px;
}
.lab.whole {
  font-size: 17px;
}
.lab.ask {
  font-size: 18px;
  fill: var(--c-primary-dark);
}
.bar {
  stroke: var(--c-text);
  stroke-width: 1.6;
}
</style>
