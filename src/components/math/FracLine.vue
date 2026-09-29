<script setup lang="ts">
import { computed } from 'vue'

/**
 * 一条平均分的线（三年级「分数的初步认识」「小数的初步认识」）：0…units 个整份，每份平均分成 per 小段。
 * - 线段（labels = false）：只画刻度不标数，上面用括号括出其中几段（线段平均分成 5 段，括出 1 段）；
 * - 数轴 / 米尺：整份处标 0、1、2……，1 以后带单位（「1 m」）；箭头（arrow）指着某个刻度，或括号（bracket）括出一段；
 * - 尺子（ruler）：画成尺身，每个刻度都标数，末尾写单位（1 分米的尺子：0…10，cm）。
 * 图里只有数和字母；宽度按 viewBox 缩放，手机竖屏放得下。
 */
const props = withDefaults(
  defineProps<{ units: number; per: number; bracket?: [number, number]; arrow?: number; unit?: string; ruler?: boolean; labels?: boolean }>(),
  { labels: true, ruler: false, unit: '' },
)

const W = 320
const L = 18 // 左端
const R = W - 22 // 右端（右边留一点给单位）
const count = computed(() => Math.max(1, props.units * props.per))
const x = (i: number): number => L + ((R - L) * i) / count.value
/** 线（或尺身上沿）的 y；上面留给箭头 / 括号 */
const top = computed(() => (props.arrow !== undefined ? 50 : props.bracket ? 40 : 14))
const H = computed(() => top.value + (props.ruler ? 50 : props.labels ? 36 : 18))

const ticks = computed(() =>
  Array.from({ length: count.value + 1 }, (_, i) => {
    const major = i % props.per === 0
    let label: string | undefined
    if (props.ruler) label = String(i)
    else if (props.labels && major) {
      const n = i / props.per
      label = n > 0 && props.unit ? `${n} ${props.unit}` : String(n)
    }
    return { x: x(i), major, label }
  }),
)

/** 括号（︷）：两头往下弯，中间一个尖 */
const brace = computed(() => {
  if (!props.bracket) return null
  const [a, b] = props.bracket
  const x1 = x(Math.min(a, b))
  const x2 = x(Math.max(a, b))
  const y = top.value - 16
  const m = (x1 + x2) / 2
  const r = Math.min(6, (x2 - x1) / 4)
  return `M${x1} ${y + 9}Q${x1} ${y} ${x1 + r} ${y}L${m - r} ${y}Q${m} ${y} ${m} ${y - 7}Q${m} ${y} ${m + r} ${y}L${x2 - r} ${y}Q${x2} ${y} ${x2} ${y + 9}`
})
const arrowX = computed(() => (props.arrow === undefined ? null : x(props.arrow)))
</script>

<template>
  <svg class="frac-line" :viewBox="`0 0 ${W} ${H}`" :width="W * 1.1" :height="H * 1.1" role="img" aria-hidden="true">
    <!-- 尺子：尺身 + 从上沿往下的刻度，每个刻度标数 -->
    <template v-if="ruler">
      <rect class="body" :x="L - 12" :y="top" :width="R - L + 28" height="44" rx="6" />
      <g v-for="(t, i) in ticks" :key="i">
        <line class="tick" :x1="t.x" :y1="top" :x2="t.x" :y2="top + (i % 5 === 0 ? 16 : 11)" />
        <text class="num small" :x="t.x" :y="top + 32">{{ t.label }}</text>
      </g>
      <text v-if="unit" class="unit" :x="R + 4" :y="top + 42">{{ unit }}</text>
    </template>
    <!-- 线段 / 数轴 -->
    <template v-else>
      <line class="axis" :x1="L" :y1="top" :x2="R" :y2="top" />
      <g v-for="(t, i) in ticks" :key="i">
        <line class="tick" :class="{ major: t.major }" :x1="t.x" :y1="top - (t.major ? 9 : 6)" :x2="t.x" :y2="top + (t.major ? 9 : 6)" />
        <text v-if="t.label !== undefined" class="num" :x="t.x" :y="top + 28">{{ t.label }}</text>
      </g>
    </template>
    <path v-if="brace" class="brace" :d="brace" />
    <g v-if="arrowX !== null" class="arrow">
      <line :x1="arrowX" :y1="top - 44" :x2="arrowX" :y2="top - 16" />
      <path :d="`M${arrowX - 7} ${top - 18}L${arrowX + 7} ${top - 18}L${arrowX} ${top - 5}Z`" />
    </g>
  </svg>
</template>

<style scoped>
.frac-line {
  display: block;
  max-width: 100%;
  height: auto;
  padding: 6px 4px;
  background: var(--c-card);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  box-sizing: content-box;
}
.axis {
  stroke: var(--c-text);
  stroke-width: 3;
  stroke-linecap: round;
}
.tick {
  stroke: var(--c-text);
  stroke-width: 1.6;
}
.tick.major {
  stroke-width: 2.6;
}
.body {
  fill: #fff4d6; /* 同 RulerGauge 的尺身 */
  stroke: var(--c-primary-dark);
  stroke-width: 2;
}
.num {
  font-size: 15px;
  font-weight: 800;
  text-anchor: middle;
  fill: var(--c-text);
}
.num.small {
  font-size: 12px;
}
.unit {
  font-size: 12px;
  font-weight: 700;
  fill: var(--c-primary-dark);
}
.brace {
  fill: none;
  stroke: var(--c-primary);
  stroke-width: 3;
  stroke-linecap: round;
  stroke-linejoin: round;
}
.arrow line {
  stroke: var(--c-primary);
  stroke-width: 3;
}
.arrow path {
  fill: var(--c-primary);
}
</style>
