<script setup lang="ts">
import { computed } from 'vue'
import type { RatioRow } from '@/types/models'
import { t } from '@/engine/i18n'

/**
 * 小数倍的线段图（五上「小数乘法」例 5：一班 3.9 kg，二班是一班的 0.8 倍、三班是 1.2 倍），照课本画：
 * 一行一条线，左边写名字；第一行是「“1”倍」那条，平均分成 per 小段（每段画刻度）；别的行按 len（几小段）画长短，
 * 比第一行长的那部分也按小段画刻度；上面大括号写 top（「0.8 倍」），下面大括号写 bottom（「3.9 kg」「? kg」）；
 * 从第一行的刻度（短的行）/ 右端（长的行）拉竖虚线下来对齐。图里的字不注音、不朗读（题目要问的都写在题干文字里）；
 * aria-label 只说是线段图（不透露数）。宽度按 viewBox 缩放，手机竖屏、对战窄栏都放得下。
 */
const props = defineProps<{ per: number; rows: RatioRow[] }>()

const W = 320
const X0 = 62 // 线的左端（左边留给名字）
const X1 = W - 12
const ROW_H = 84
const TOP = 6

const maxLen = computed(() => Math.max(props.per, ...props.rows.map((r) => r.len)))
const u = computed(() => (X1 - X0) / maxLen.value)
const x = (i: number): number => Math.round((X0 + i * u.value) * 10) / 10
const lineY = (r: number): number => TOP + 40 + r * ROW_H
const height = computed(() => lineY(props.rows.length - 1) + 46)

/** 每行要画刻度的地方（第几小段的端点）：第一行每小段一个；别的行两端，长出第一行的部分每小段一个 */
function ticksOf(r: number): number[] {
  const row = props.rows[r]!
  if (r === 0) return Array.from({ length: row.len + 1 }, (_, i) => i)
  const out = [0, row.len]
  for (let i = props.per; i < row.len; i++) out.push(i)
  return [...new Set(out)].sort((a, b) => a - b)
}

/** 竖虚线：短的行从第一行它右端那个刻度拉下来，长的行从第一行的右端拉下来 */
const guides = computed(() =>
  props.rows.slice(1).map((row, k) => {
    const at = Math.min(row.len, props.per)
    return { x: x(at), y1: lineY(0) + 8, y2: lineY(k + 1) - 8 }
  }),
)

const r1 = (n: number): number => Math.round(n * 10) / 10
/** 大括号：xa…xb，开口朝着线（flat < end 是画在线上面），tip 往外凸 6 */
function brace(xa: number, xb: number, end: number, flat: number): string {
  const dir = flat < end ? -1 : 1
  const mid = (xa + xb) / 2
  const r = Math.min(6, (xb - xa) / 4)
  return [
    `M ${r1(xa)} ${end}`,
    `Q ${r1(xa)} ${flat} ${r1(xa + r)} ${flat}`,
    `L ${r1(mid - r)} ${flat}`,
    `Q ${r1(mid)} ${flat} ${r1(mid)} ${flat + dir * 6}`,
    `Q ${r1(mid)} ${flat} ${r1(mid + r)} ${flat}`,
    `L ${r1(xb - r)} ${flat}`,
    `Q ${r1(xb)} ${flat} ${r1(xb)} ${end}`,
  ].join(' ')
}
</script>

<template>
  <svg class="ratio-lines" :viewBox="`0 0 ${W} ${height}`" :width="W" :height="height" role="img" :aria-label="t({ k: 'm5.dmul.rl.aria' })">
    <line v-for="(g, i) in guides" :key="`g${i}`" class="guide" :x1="g.x" :y1="g.y1" :x2="g.x" :y2="g.y2" />
    <g v-for="(row, r) in rows" :key="r" class="row">
      <text class="name" x="4" :y="lineY(r) + 5">{{ t(row.name) }}</text>
      <path class="brace" :d="brace(X0 + 1, x(row.len) - 1, lineY(r) - 6, lineY(r) - 14)" />
      <text class="top" :x="r1((X0 + x(row.len)) / 2)" :y="lineY(r) - 24" text-anchor="middle">{{ t(row.top) }}</text>
      <line class="line" :x1="X0" :y1="lineY(r)" :x2="x(row.len)" :y2="lineY(r)" />
      <line v-for="i in ticksOf(r)" :key="`t${i}`" class="tick" :x1="x(i)" :y1="lineY(r) - 5" :x2="x(i)" :y2="lineY(r) + 5" />
      <path class="brace" :d="brace(X0 + 1, x(row.len) - 1, lineY(r) + 6, lineY(r) + 14)" />
      <text class="bottom" :class="{ ask: row.bottom.startsWith('?') }" :x="r1((X0 + x(row.len)) / 2)" :y="lineY(r) + 36" text-anchor="middle">{{ row.bottom }}</text>
    </g>
  </svg>
</template>

<style scoped>
.ratio-lines {
  display: block;
  max-width: 100%;
  height: auto;
}
.line {
  stroke: #2b8fd6;
  stroke-width: 3;
  stroke-linecap: round;
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
.brace {
  fill: none;
  stroke: var(--c-text);
  stroke-width: 1.6;
  stroke-linejoin: round;
}
.name {
  font-size: 15px;
  font-weight: 700;
  fill: var(--c-text);
}
.top,
.bottom {
  font-size: 15px;
  font-weight: 800;
  fill: var(--c-text);
  font-variant-numeric: tabular-nums;
}
.ask {
  fill: var(--c-primary-dark);
}
</style>
