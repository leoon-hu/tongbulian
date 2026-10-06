<script setup lang="ts">
import { computed } from 'vue'
import type { LStr, PartSeg } from '@/types/models'
import { t } from '@/engine/i18n'

/**
 * 线段图（四下「加、减法的意义和各部分间的关系」例 1：西宁—格尔木—拉萨；也画运算律例 3 的 A—B—C—D—E 骑行路线）：
 * 一条横线分成几段，每段上面一个大括号写这一段的数（「814 km」，不知道的写「?」）；total = 整条线下面的大括号（总数或「?」）；
 * names = 各个分点下面的名字（图里的字，不注音、不朗读——题目要问的都写在题干文字里）。
 * 段的长短按 len 的比例画，太短的段拉长一点，免得字挤在一起；aria-label 只说是线段图（不透露数）。
 */
const props = defineProps<{ parts: PartSeg[]; total?: string; names?: LStr[] }>()

const W = 320
const X0 = 34
const X1 = 286
const LINE_Y = 50

/** 每段画多宽：按比例，太短的拉到最小宽度（两段 30%、三段 24%、四段以上 20%），其余按比例缩 */
const xs = computed(() => {
  const n = props.parts.length
  const minFrac = n <= 2 ? 0.3 : n === 3 ? 0.24 : 0.2
  const sum = props.parts.reduce((a, p) => a + Math.max(0, p.len), 0) || 1
  let f = props.parts.map((p) => Math.max(0, p.len) / sum)
  for (let i = 0; i < 4; i++) {
    const small = f.map((x) => x < minFrac - 1e-9)
    if (!small.some(Boolean)) break
    const fixed = small.filter(Boolean).length * minFrac
    const rest = f.reduce((a, x, k) => (small[k] ? a : a + x), 0)
    if (rest <= 0) {
      f = f.map(() => 1 / n)
      break
    }
    f = f.map((x, k) => (small[k] ? minFrac : (x / rest) * (1 - fixed)))
  }
  const out = [X0]
  for (const x of f) out.push(out[out.length - 1]! + x * (X1 - X0))
  out[out.length - 1] = X1
  return out
})

const r1 = (n: number): number => Math.round(n * 10) / 10

/** 大括号：xa…xb，开口朝着线（up = 画在线上面），flat 是横的那一段的 y，tip 往外凸 6 */
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

const hasNames = computed(() => !!props.names?.length)
/** 下面的大括号从哪里开始（有名字时让开名字） */
const lowEnd = computed(() => (hasNames.value ? 84 : LINE_Y + 10))
const height = computed(() => (props.total !== undefined ? lowEnd.value + 44 : hasNames.value ? 84 : 64))
const small = computed(() => props.parts.length >= 4)
</script>

<template>
  <svg class="part-line" :viewBox="`0 0 ${W} ${height}`" :width="W" :height="height" role="img" :aria-label="t({ k: 'm4.ops.lineAria' })">
    <g v-for="(p, i) in parts" :key="`p${i}`" class="seg">
      <path class="brace" :d="brace(xs[i]! + 2, xs[i + 1]! - 2, LINE_Y - 4, LINE_Y - 12)" />
      <text class="label" :class="{ ask: p.label === '?', small }" :x="r1((xs[i]! + xs[i + 1]!) / 2)" y="22" text-anchor="middle">{{ p.label }}</text>
    </g>
    <line class="line" :x1="X0" :y1="LINE_Y" :x2="X1" :y2="LINE_Y" />
    <line v-for="(x, i) in xs" :key="`t${i}`" class="tick" :x1="r1(x)" :y1="LINE_Y - 7" :x2="r1(x)" :y2="LINE_Y + 7" />
    <template v-if="hasNames">
      <text v-for="(nm, i) in names" :key="`n${i}`" class="name" :x="r1(xs[i] ?? X1)" y="75" text-anchor="middle">{{ t(nm) }}</text>
    </template>
    <g v-if="total !== undefined" class="whole">
      <path class="brace" :d="brace(X0, X1, lowEnd, lowEnd + 8)" />
      <text class="total" :class="{ ask: total === '?' }" :x="(X0 + X1) / 2" :y="lowEnd + 34" text-anchor="middle">{{ total }}</text>
    </g>
  </svg>
</template>

<style scoped>
.part-line {
  display: block;
  max-width: 100%;
  height: auto;
}
.line {
  stroke: var(--c-text);
  stroke-width: 3;
  stroke-linecap: round;
}
.tick {
  stroke: var(--c-text);
  stroke-width: 2.5;
}
.brace {
  fill: none;
  stroke: #2b8fd6;
  stroke-width: 2;
  stroke-linejoin: round;
}
.label,
.total {
  font-size: 17px;
  font-weight: 800;
  fill: var(--c-text);
  font-variant-numeric: tabular-nums;
}
.label.small {
  font-size: 15px;
}
.ask {
  fill: var(--c-primary-dark);
  font-size: 20px;
}
.name {
  font-size: 14px;
  font-weight: 700;
  fill: var(--c-text-light);
}
</style>
