<script setup lang="ts">
import { computed } from 'vue'

/**
 * 米尺和数线（四下「小数的意义」例 1 的米尺、练习九 7 / 练习十 6 的直线）：
 * labels 是长刻度下面写的字（「0」「1」……「1 m」、「0」「0.1」……），相邻两个长刻度之间平均分成 per 小格（per 是双数时正中间那一格画中长刻度），
 * extra = 最后一个长刻度后面再画几小格。
 * - ruler：照课本画成浅蓝的尺身，刻度从上沿往下，字写在刻度下面；broken = 右端是折断线（课本放大的那一段）；红箭头从尺子下面指上去。
 * - 否则是向右带箭头的直线，刻度穿过直线、字写在下面；红箭头从上面指下来。
 * arrow = 红箭头指着从左数第几小格（0 起，可以是 .5：指在两小格中间，3.85）。图里只有数和字母，不朗读；宽度按 viewBox 缩放。
 */
const props = withDefaults(defineProps<{ labels: string[]; per: number; extra?: number; ruler?: boolean; broken?: boolean; arrow?: number }>(), {
  extra: 0,
  ruler: false,
  broken: false,
  arrow: undefined,
})

const W = 340
const L = 22 // 第一个刻度
const R = W - 30 // 最后一个刻度（右边留给折断线 / 直线的箭头）
const count = computed(() => Math.max(1, (props.labels.length - 1) * props.per + props.extra))
const x = (i: number): number => L + ((R - L) * i) / count.value

/** 尺身上沿 / 直线的 y */
const top = computed(() => (props.ruler ? 8 : props.arrow !== undefined ? 50 : 16))
const H = computed(() => (props.ruler ? top.value + 46 + (props.arrow !== undefined ? 40 : 6) : top.value + 34))

const ticks = computed(() =>
  Array.from({ length: count.value + 1 }, (_, i) => {
    const major = i % props.per === 0 && i / props.per < props.labels.length
    const mid = !major && props.per % 2 === 0 && i % props.per === props.per / 2
    return { x: x(i), major, mid, label: major ? props.labels[i / props.per] : undefined }
  }),
)
const tickLen = (t: { major: boolean; mid: boolean }): number => (t.major ? 16 : t.mid ? 12 : 8)

/** 尺身：右端是折断线时画成锯齿 */
const body = computed(() => {
  const l = L - 14
  const r = R + 14
  const t = top.value
  const b = t + 46
  if (!props.broken) return `M${l} ${t}H${r}V${b}H${l}Z`
  return `M${l} ${t}H${r}L${r - 6} ${t + 12}L${r + 4} ${t + 23}L${r - 6} ${t + 34}L${r} ${b}H${l}Z`
})
const arrowX = computed(() => (props.arrow === undefined ? null : x(props.arrow)))
</script>

<template>
  <svg class="dec-scale" :viewBox="`0 0 ${W} ${H}`" :width="W * 1.1" :height="H * 1.1" role="img" aria-hidden="true">
    <template v-if="ruler">
      <path class="body" :d="body" />
      <g v-for="(t, i) in ticks" :key="i">
        <line class="tick" :class="{ major: t.major }" :x1="t.x" :y1="top" :x2="t.x" :y2="top + tickLen(t)" />
        <text v-if="t.label !== undefined" class="num" :class="{ unit: /[a-z]/.test(t.label) }" :x="t.x" :y="top + 36">{{ t.label }}</text>
      </g>
      <g v-if="arrowX !== null" class="arrow">
        <line :x1="arrowX" :y1="top + 84" :x2="arrowX" :y2="top + 58" />
        <path :d="`M${arrowX - 7} ${top + 60}L${arrowX + 7} ${top + 60}L${arrowX} ${top + 47}Z`" />
      </g>
    </template>
    <template v-else>
      <line class="axis" :x1="L - 10" :y1="top" :x2="R + 22" :y2="top" />
      <path class="axis-head" :d="`M${R + 26} ${top}L${R + 15} ${top - 6}L${R + 15} ${top + 6}Z`" />
      <g v-for="(t, i) in ticks" :key="i">
        <line class="tick" :class="{ major: t.major }" :x1="t.x" :y1="top - tickLen(t) / 2" :x2="t.x" :y2="top + tickLen(t) / 2" />
        <text v-if="t.label !== undefined" class="num" :x="t.x" :y="top + 28">{{ t.label }}</text>
      </g>
      <g v-if="arrowX !== null" class="arrow">
        <line :x1="arrowX" :y1="top - 46" :x2="arrowX" :y2="top - 18" />
        <path :d="`M${arrowX - 7} ${top - 20}L${arrowX + 7} ${top - 20}L${arrowX} ${top - 7}Z`" />
      </g>
    </template>
  </svg>
</template>

<style scoped>
.dec-scale {
  display: block;
  /* content-box：内边距算在宽度外面，最宽只能是这一栏减去左右两边的内边距（以前 100% 再加 8px，窄栏里两边各溢出 4px） */
  max-width: calc(100% - 8px);
  height: auto;
  padding: 6px 4px;
  background: var(--c-card);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  box-sizing: content-box;
}
.body {
  fill: #d8eefb; /* 课本米尺的浅蓝 */
  stroke: var(--c-text);
  stroke-width: 1.6;
  stroke-linejoin: round;
}
.axis {
  stroke: var(--c-blue);
  stroke-width: 2.6;
  stroke-linecap: round;
}
.axis-head {
  fill: var(--c-blue);
}
.tick {
  stroke: var(--c-text);
  stroke-width: 1.3;
}
.tick.major {
  stroke-width: 2.2;
}
.num {
  font-size: 15px;
  font-weight: 800;
  text-anchor: middle;
  fill: var(--c-text);
}
/* 带单位的字（1 m、1 cm）小一号 */
.num.unit {
  font-size: 13px;
}
.arrow line {
  stroke: var(--c-red);
  stroke-width: 3;
}
.arrow path {
  fill: var(--c-red);
}
</style>
