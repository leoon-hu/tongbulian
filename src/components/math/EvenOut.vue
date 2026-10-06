<script setup lang="ts">
import { computed } from 'vue'
import type { EvenRow } from '@/types/models'
import { t } from '@/engine/i18n'

/**
 * 移多补少图（四下「平均数」例 1，照课本第 87 页画）：环保小队每人收集的空水瓶，一人一行横着排，左边写名字（纵轴上头写「姓名」），
 * 一个瓶子占一格，下面一条数轴 0…max（每格都标数，轴名「数量/个」写在右端）——数到第几个看下面的数就行。
 * avg：在平均数那里画一条红色竖虚线，比它少的行把差的几个画成虚线空瓶（补上的），比它多的照样画在虚线外面（移走的）——课本的移多补少；
 * 不传就不画（平均数要自己求）。图里的字不注音、不朗读（题目文字里会说清问谁）；aria-label 不说数。
 * 尺寸按内容算（自然宽度 320–420 像素），窄屏上整张图等比缩小。
 */
const props = withDefaults(defineProps<{ rows: EvenRow[]; max: number; avg?: number }>(), { avg: undefined })

const PAD = 6
const F_NAME = 14
const F_TICK = 12
const F_AXIS = 12
const RH = 28

const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v))
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)
/** 估字宽：汉字一个字号，其他约 0.58 个 */
const textW = (s: string, f: number): number => [...s].reduce((w, ch) => w + (/[⺀-鿿　-〿＀-￯]/.test(ch) ? f : 0.58 * f), 0)

const lay = computed(() => {
  const names = props.rows.map((r) => cap(t(r.name)))
  const nameW = Math.max(...names.map((s) => textW(s, F_NAME)), textW(t({ k: 'm4.avg.eo.who' }), F_AXIS))
  const CW = clamp(Math.floor(300 / props.max), 15, 22)
  const L = Math.ceil(PAD + nameW + 10)
  const top = PAD + F_AXIS + 8
  const base = top + props.rows.length * RH + 4
  const axisName = t({ k: 'm4.avg.eo.count' })
  const width = Math.ceil(L + props.max * CW + 16 + textW(axisName, F_AXIS) + PAD)
  const height = Math.ceil(base + 6 + F_TICK + PAD)
  const bottles: { x: number; y: number; ghost: boolean }[] = []
  props.rows.forEach((r, i) => {
    const y = top + i * RH
    for (let k = 0; k < r.count; k++) bottles.push({ x: L + k * CW, y, ghost: false })
    if (props.avg !== undefined) for (let k = r.count; k < props.avg; k++) bottles.push({ x: L + k * CW, y, ghost: true })
  })
  const ticks = Array.from({ length: props.max + 1 }, (_, i) => ({ x: L + i * CW, s: String(i) }))
  return { names, CW, L, top, base, width, height, bottles, ticks, axisName }
})
/** 一个瓶子（格子左上角 x, y）：瓶身圆角矩形、瓶颈、瓶盖 */
function bottle(x: number, y: number, cw: number): { body: string; neck: string; cap: string } {
  const w = cw - 4
  const bx = x + 2
  return {
    body: `M${bx} ${y + 11} q0 -3 ${w / 2 - 2} -4 h4 q${w / 2 - 2} 1 ${w / 2 - 2} 4 v${RH - 15} q0 2 -2 2 h${-(w - 4)} q-2 0 -2 -2 z`,
    neck: `M${x + cw / 2 - 2.5} ${y + 7} v-3 h5 v3`,
    cap: `M${x + cw / 2 - 3} ${y + 4} v-3 h6 v3 z`,
  }
}
</script>

<template>
  <figure class="even-out">
    <svg
      :viewBox="`0 0 ${lay.width} ${lay.height}`"
      :width="lay.width"
      :height="lay.height"
      role="img"
      :aria-label="t({ k: 'm4.avg.eo.aria' })"
      :data-max="max"
    >
      <text :x="PAD" :y="PAD + F_AXIS" class="axis-name" :font-size="F_AXIS">{{ t({ k: 'm4.avg.eo.who' }) }}</text>
      <g v-for="(b, i) in lay.bottles" :key="`b${i}`" :class="b.ghost ? 'ghost' : 'bottle'">
        <path :d="bottle(b.x, b.y, lay.CW).body" class="body" />
        <path :d="bottle(b.x, b.y, lay.CW).neck" class="neck" />
        <path :d="bottle(b.x, b.y, lay.CW).cap" class="cap" />
      </g>
      <text
        v-for="(n, i) in lay.names"
        :key="`n${i}`"
        :x="lay.L - 8"
        :y="lay.top + i * RH + RH / 2 + F_NAME * 0.36"
        class="name"
        text-anchor="end"
        :font-size="F_NAME"
      >{{ n }}</text>
      <line :x1="lay.L" :y1="PAD + F_AXIS + 2" :x2="lay.L" :y2="lay.base" class="axis" />
      <line :x1="lay.L" :y1="lay.base" :x2="lay.L + max * lay.CW + 10" :y2="lay.base" class="axis" />
      <g v-for="(tk, i) in lay.ticks" :key="`t${i}`">
        <line :x1="tk.x" :y1="lay.base" :x2="tk.x" :y2="lay.base + 4" class="tick" />
        <text :x="tk.x" :y="lay.base + 6 + F_TICK" class="tick-label" text-anchor="middle" :font-size="F_TICK">{{ tk.s }}</text>
      </g>
      <text :x="lay.L + max * lay.CW + 14" :y="lay.base + 6 + F_TICK" class="axis-name" :font-size="F_AXIS">{{ lay.axisName }}</text>
      <line
        v-if="avg !== undefined"
        :x1="lay.L + avg * lay.CW"
        :y1="lay.top - 4"
        :x2="lay.L + avg * lay.CW"
        :y2="lay.base"
        class="avg"
      />
    </svg>
  </figure>
</template>

<style scoped>
.even-out {
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
.bottle .body {
  fill: #cfe6f8;
  stroke: #5a95cc;
  stroke-width: 1;
}
.bottle .neck {
  fill: none;
  stroke: #5a95cc;
  stroke-width: 1;
}
.bottle .cap {
  fill: #f2c14e;
  stroke: #c9962a;
  stroke-width: 0.8;
}
.ghost .body,
.ghost .neck,
.ghost .cap {
  fill: none;
  stroke: #9aa7b3;
  stroke-width: 1;
  stroke-dasharray: 2 2;
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
.avg {
  stroke: #e2483d;
  stroke-width: 1.6;
  stroke-dasharray: 4 3;
}
text {
  fill: var(--c-text);
  font-family: inherit;
}
.name {
  font-weight: 700;
}
.axis-name {
  fill: var(--c-text-light);
  font-weight: 700;
}
.tick-label {
  font-variant-numeric: tabular-nums;
}
</style>
