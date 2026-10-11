<script setup lang="ts">
import { computed } from 'vue'
import type { LStr, PartSeg } from '@/types/models'
import { t } from '@/engine/i18n'

/**
 * 线段图（四下「加、减法的意义和各部分间的关系」例 1：西宁—格尔木—拉萨；也画运算律例 3 的 A—B—C—D—E 骑行路线）：
 * 一条横线分成几段，每段上面一个大括号写这一段的数（「814 km」，不知道的写「?」）；total = 整条线下面的大括号（总数或「?」）；
 * names = 各个分点下面的名字（图里的字，不注音、不朗读——题目要问的都写在题干文字里）。
 * 段的长短按 len 的比例画，太短的段拉长一点，免得字挤在一起；aria-label 只说是线段图（不透露数）。
 * 五上「小数乘法」例 8（出租车分段计费）加的可选项（不传和原来一样）：ticks = 每隔几（len 的单位）画一个小刻度（1 = 每 1 km 一个），
 * 这时段长严格按比例画、不拉长短段，label 是空串的段上面不画大括号（课本只括「8 元」「1.5 元」两段）；tail = 右端接一段虚线（路还没走完）；
 * aria = 换一个 aria-label 的词条（五年级的包单独加载时也有字）。
 */
// tail 的默认值写成 undefined：不传时 props 里还是没有它（布尔 prop 不写默认值会变成 false，四下的测试按原来的 props 比对）
const props = withDefaults(defineProps<{ parts: PartSeg[]; total?: string; names?: LStr[]; ticks?: number; tail?: boolean; aria?: LStr }>(), { tail: undefined })

const W = 320
const X0 = 34
const LINE_Y = 50
/** 右端：接虚线时让出一段 */
const X1 = computed(() => (props.tail ? 262 : 286))

/** 每段画多宽：按比例，太短的拉到最小宽度（两段 30%、三段 24%、四段以上 20%），其余按比例缩 */
const xs = computed(() => {
  const n = props.parts.length
  const X1v = X1.value
  if (props.ticks) {
    // 分段计费：严格按比例
    const total = props.parts.reduce((a, p) => a + Math.max(0, p.len), 0) || 1
    const out = [X0]
    for (const p of props.parts) out.push(out[out.length - 1]! + (Math.max(0, p.len) / total) * (X1v - X0))
    out[out.length - 1] = X1v
    return out
  }
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
  for (const x of f) out.push(out[out.length - 1]! + x * (X1v - X0))
  out[out.length - 1] = X1v
  return out
})

/** 小刻度（ticks）：每隔 ticks 一个，分点上已经有大刻度的不重画 */
const minor = computed(() => {
  if (!props.ticks) return []
  const total = props.parts.reduce((a, p) => a + Math.max(0, p.len), 0)
  if (!(total > 0)) return []
  const out: number[] = []
  const at = new Set(xs.value.map((x) => r1(x)))
  for (let v = props.ticks; v < total - 1e-9; v += props.ticks) {
    const x = r1(X0 + (v / total) * (X1.value - X0))
    if (!at.has(x)) out.push(x)
  }
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
  <svg class="part-line" :viewBox="`0 0 ${W} ${height}`" :width="W" :height="height" role="img" :aria-label="t(aria ?? { k: 'm4.ops.lineAria' })">
    <g v-for="(p, i) in parts" :key="`p${i}`" class="seg">
      <template v-if="!(ticks && p.label === '')">
        <path class="brace" :d="brace(xs[i]! + 2, xs[i + 1]! - 2, LINE_Y - 4, LINE_Y - 12)" />
        <text class="label" :class="{ ask: p.label === '?', small }" :x="r1((xs[i]! + xs[i + 1]!) / 2)" y="22" text-anchor="middle">{{ p.label }}</text>
      </template>
    </g>
    <line class="line" :x1="X0" :y1="LINE_Y" :x2="X1" :y2="LINE_Y" />
    <line v-if="tail" class="line tail" :x1="X1 + 4" :y1="LINE_Y" :x2="W - 6" :y2="LINE_Y" />
    <line v-for="(x, i) in xs" :key="`t${i}`" class="tick" :x1="r1(x)" :y1="LINE_Y - 7" :x2="r1(x)" :y2="LINE_Y + 7" />
    <line v-for="(x, i) in minor" :key="`m${i}`" class="tick minor" :x1="x" :y1="LINE_Y - 5" :x2="x" :y2="LINE_Y + 5" />
    <template v-if="hasNames">
      <text v-for="(nm, i) in names" :key="`n${i}`" class="name" :x="r1(xs[i] ?? X1)" y="75" text-anchor="middle">{{ t(nm) }}</text>
    </template>
    <g v-if="total !== undefined" class="whole">
      <path class="brace" :d="brace(X0, X1, lowEnd, lowEnd + 8)" />
      <text class="total" :class="{ ask: total === '?' || total.startsWith('? ') }" :x="(X0 + X1) / 2" :y="lowEnd + 34" text-anchor="middle">{{ total }}</text>
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
.tick.minor {
  stroke-width: 1.8;
}
.tail {
  stroke-dasharray: 5 5;
  stroke-linecap: butt;
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
