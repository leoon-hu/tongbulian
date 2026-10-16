<script setup lang="ts">
import { computed } from 'vue'
import type { AreaBrace } from '@/types/models'
import { lang } from '@/engine/i18n'
import { isFracLabel, labelWidth, parseFigLabel } from '@/components/math/figLabel'

/**
 * 长方形面积图（六上「分数乘法」的格子图、「分数除法」例 1 的面积条），照课本画：整个长方形横着平均分 rows 条、竖着平均分 cols 列，
 * 格线是细的蓝线，虚线的格子是整体里不算的那部分。
 * 乘法（课本做一做 1 的画法）：first = 第一个乘数——前 n 行（along: 'row'，从上往下数）或前 n 列（'col'，从左往右数）画红色斜线「\」；
 *   second = 在 first 那部分里沿另一个方向再取 n 条（first 是行就取列、是列就取行；from: 'end' 从最后一条往前取）再画「/」成交叉网线，
 *   也就是积，格子底下淡淡涂一层红；ghost = 最后几行（first 是列时是最后几列）画虚线：不属于这块地（例 2（2）的 4/5 公顷：第 5 行）。
 * 除法（分数除法例 1）：solid = 从下往上几条画实线，上面的几条画虚线（整体里不算的那部分）；shade = 涂浅蓝的条（along: 'row'，从下往上数，0 起）
 *   或列（'col'，从左往右数，只涂实线的格）。
 * braces = 左右的大括号：from、to 按条的边算、从下往上数（0 是下沿，rows 是上沿；from 0、to 4 = 最下面 4 条），尖上写数、分数（两层）或「?」。
 * 图里不写汉字和单位（题干写），不朗读；aria 只说「长方形面积图」，不透露答案。宽度按 viewBox 缩放，手机竖屏、对战窄栏都放得下。
 */
const props = defineProps<{
  rows: number
  cols: number
  first?: { along: 'row' | 'col'; n: number }
  second?: { n: number; from?: 'start' | 'end' }
  ghost?: number
  solid?: number
  shade?: { along: 'row' | 'col'; cells: number[] }
  braces?: AreaBrace[]
}>()

const RW = 168 // 长方形的宽（viewBox 单位；手机上题目、图和选项要一屏放下，图不超过约 150px 高）
const RH = 120 // 长方形的高
const TM = 10 // 上下留白
const STEP = 6 // 斜线之间的距离
const r1 = (n: number): number => Math.round(n * 10) / 10

const nR = computed(() => Math.max(1, Math.round(props.rows)))
const nC = computed(() => Math.max(1, Math.round(props.cols)))
const braceList = computed(() => props.braces ?? [])
const labels = computed(() => braceList.value.map((b) => parseFigLabel(b.label)))

/** 左右留白：有括号的一边留出括号、尖和字的地方 */
function margin(side: 'left' | 'right'): number {
  const ws = braceList.value.flatMap((b, i) => (b.side === side ? [labelWidth(labels.value[i]!)] : []))
  return ws.length ? 8 + 7 + 6 + Math.max(...ws) + 6 : 10
}
const LM = computed(() => margin('left'))
const RM = computed(() => margin('right'))
const W = computed(() => r1(LM.value + RW + RM.value))
const H = RH + 2 * TM
const cw = computed(() => RW / nC.value)
const ch = computed(() => RH / nR.value)

/** 第 r 行（从上往下，0 起）第 c 列（从左往右）是不是虚线的格子 */
function dashed(r: number, c: number): boolean {
  const ghost = Math.max(0, Math.round(props.ghost ?? 0))
  if (ghost > 0 && (props.first?.along === 'col' ? c >= nC.value - ghost : r >= nR.value - ghost)) return true
  if (props.solid !== undefined && r < nR.value - props.solid) return true
  return false
}
function inFirst(r: number, c: number): boolean {
  const f = props.first
  if (!f) return false
  return f.along === 'row' ? r < f.n : c < f.n
}
function inSecond(r: number, c: number): boolean {
  const f = props.first
  const s = props.second
  if (!f || !s || !inFirst(r, c)) return false
  const count = f.along === 'row' ? nC.value : nR.value
  const idx = f.along === 'row' ? c : r
  return s.from === 'end' ? idx >= count - s.n : idx < s.n
}
function shaded(r: number, c: number): boolean {
  const s = props.shade
  if (!s) return false
  return s.along === 'row' ? s.cells.includes(nR.value - 1 - r) : s.cells.includes(c)
}

interface Cell {
  r: number
  c: number
  x: number
  y: number
  w: number
  h: number
  dash: boolean
  shade: boolean
  first: boolean
  prod: boolean
}
const cells = computed<Cell[]>(() => {
  const out: Cell[] = []
  for (let r = 0; r < nR.value; r++) {
    for (let c = 0; c < nC.value; c++) {
      const dash = dashed(r, c)
      const first = !dash && inFirst(r, c)
      out.push({
        r,
        c,
        x: r1(LM.value + c * cw.value),
        y: r1(TM + r * ch.value),
        w: r1(cw.value),
        h: r1(ch.value),
        dash,
        shade: !dash && shaded(r, c),
        first,
        prod: first && inSecond(r, c),
      })
    }
  }
  return out
})
/** 先画虚线的格子，再画实线的格子（共用的边上实线盖住虚线） */
const ordered = computed(() => [...cells.value.filter((c) => c.dash), ...cells.value.filter((c) => !c.dash)])

/** 一个格子里的斜线：dir 1 =「\」（y = x + k），-1 =「/」（y = k − x）；k 按全图的网格取，相邻的格子连得上 */
function hatch(cell: Cell, dir: 1 | -1): string {
  const x0 = cell.x
  const y0 = cell.y
  const x1 = cell.x + cell.w
  const y1 = cell.y + cell.h
  const d = STEP * Math.SQRT2
  let path = ''
  if (dir === 1) {
    for (let k = Math.ceil((y0 - x1) / d); k * d <= y1 - x0; k++) {
      const c = k * d
      const xs = Math.max(x0, y0 - c)
      const xe = Math.min(x1, y1 - c)
      if (xe - xs > 0.5) path += `M${r1(xs)} ${r1(xs + c)}L${r1(xe)} ${r1(xe + c)}`
    }
  } else {
    for (let k = Math.ceil((x0 + y0) / d); k * d <= x1 + y1; k++) {
      const c = k * d
      const xs = Math.max(x0, c - y1)
      const xe = Math.min(x1, c - y0)
      if (xe - xs > 0.5) path += `M${r1(xs)} ${r1(c - xs)}L${r1(xe)} ${r1(c - xe)}`
    }
  }
  return path
}
const hatchFirst = computed(() => cells.value.filter((c) => c.first).map((c) => hatch(c, 1)).join(''))
const hatchProd = computed(() => cells.value.filter((c) => c.prod).map((c) => hatch(c, -1)).join(''))

/** 实线部分的外框（粗线）：实线格子的范围 */
const outline = computed(() => {
  const solid = cells.value.filter((c) => !c.dash)
  if (!solid.length) return null
  const x0 = Math.min(...solid.map((c) => c.x))
  const y0 = Math.min(...solid.map((c) => c.y))
  const x1 = Math.max(...solid.map((c) => c.x + c.w))
  const y1 = Math.max(...solid.map((c) => c.y + c.h))
  return { x: x0, y: y0, w: r1(x1 - x0), h: r1(y1 - y0) }
})

/** 竖着的大括号：x 是括号那条竖线，dir -1 尖朝左（左边的括号），1 尖朝右；两头往长方形那边弯 */
function vBrace(y1: number, y2: number, x: number, dir: -1 | 1): string {
  const m = (y1 + y2) / 2
  const r = Math.min(6, (y2 - y1) / 4)
  const end = x - dir * 7
  const tip = x + dir * 7
  return `M${r1(end)} ${r1(y1)}Q${r1(x)} ${r1(y1)} ${r1(x)} ${r1(y1 + r)}L${r1(x)} ${r1(m - r)}Q${r1(x)} ${r1(m)} ${r1(tip)} ${r1(m)}Q${r1(x)} ${r1(m)} ${r1(x)} ${r1(m + r)}L${r1(x)} ${r1(y2 - r)}Q${r1(x)} ${r1(y2)} ${r1(end)} ${r1(y2)}`
}
const drawnBraces = computed(() =>
  braceList.value.map((b, i) => {
    const lo = Math.max(0, Math.min(b.from, b.to))
    const hi = Math.min(nR.value, Math.max(b.from, b.to))
    const yTop = TM + (nR.value - hi) * ch.value + 2
    const yBot = TM + (nR.value - lo) * ch.value - 2
    const dir: -1 | 1 = b.side === 'left' ? -1 : 1
    const x = b.side === 'left' ? LM.value - 8 : LM.value + RW + 8
    const lab = labels.value[i]!
    const cx = x + dir * (7 + 6 + labelWidth(lab) / 2)
    const m = (yTop + yBot) / 2
    return {
      side: b.side,
      d: vBrace(yTop, yBot, x, dir),
      cx: r1(cx),
      m: r1(m),
      frac: isFracLabel(lab) ? lab : null,
      text: isFracLabel(lab) ? '' : lab.text,
      ask: !isFracLabel(lab) && lab.text.trim().startsWith('?'),
    }
  }),
)

const aria = computed(() => (lang.value === 'zh' ? '长方形面积图' : 'area model'))
</script>

<template>
  <svg class="frac-area" :viewBox="`0 0 ${W} ${H}`" :width="W" :height="H" role="img" :aria-label="aria">
    <rect
      v-for="cell in ordered"
      :key="`c${cell.r}-${cell.c}`"
      class="cell"
      :class="{ dash: cell.dash, shade: cell.shade, first: cell.first, prod: cell.prod }"
      :data-r="cell.r"
      :data-c="cell.c"
      :x="cell.x"
      :y="cell.y"
      :width="cell.w"
      :height="cell.h"
    />
    <path v-if="hatchFirst" class="hatch first" :d="hatchFirst" />
    <path v-if="hatchProd" class="hatch prod" :d="hatchProd" />
    <rect v-if="outline" class="outline" :x="outline.x" :y="outline.y" :width="outline.w" :height="outline.h" />
    <g v-for="(b, i) in drawnBraces" :key="`b${i}`" class="area-brace" :class="b.side">
      <path class="brace" :d="b.d" />
      <template v-if="b.frac">
        <text v-if="b.frac.w" class="lab whole" :x="b.cx - 9" :y="b.m + 6">{{ b.frac.w }}</text>
        <text class="lab num" :x="b.frac.w ? b.cx + 6 : b.cx" :y="b.m - 4">{{ b.frac.n }}</text>
        <line class="bar" :x1="(b.frac.w ? b.cx + 6 : b.cx) - 9" :y1="b.m" :x2="(b.frac.w ? b.cx + 6 : b.cx) + 9" :y2="b.m" />
        <text class="lab den" :x="b.frac.w ? b.cx + 6 : b.cx" :y="b.m + 15">{{ b.frac.d }}</text>
      </template>
      <text v-else class="lab" :class="{ ask: b.ask }" :x="b.cx" :y="b.m + 6">{{ b.text }}</text>
    </g>
  </svg>
</template>

<style scoped>
.frac-area {
  display: block;
  max-width: calc(100% - 8px);
  height: auto;
  padding: 6px 4px;
  background: var(--c-card);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  box-sizing: content-box;
}
.cell {
  fill: transparent;
  stroke: #2b8fd6;
  stroke-width: 1.2;
}
.cell.dash {
  stroke: var(--c-text-light);
  stroke-dasharray: 5 4;
}
.cell.shade {
  fill: var(--c-blue);
  fill-opacity: 0.35;
}
.cell.prod {
  fill: var(--c-red);
  fill-opacity: 0.16;
}
.hatch {
  fill: none;
  stroke: #e0525c;
  stroke-width: 1.2;
  stroke-linecap: round;
}
.outline {
  fill: none;
  stroke: #2b8fd6;
  stroke-width: 2.4;
}
.brace {
  fill: none;
  stroke: var(--c-primary);
  stroke-width: 2.6;
  stroke-linecap: round;
  stroke-linejoin: round;
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
