<script setup lang="ts">
import { computed } from 'vue'

/**
 * 尺子 + 线段（量一量）：0…length 厘米的刻度尺，上方压着一条从 from 到 to 的线段。
 * 线段不一定从 0 开始（二年级要学会「右端刻度 − 左端刻度」），刻度间半厘米有小格。
 * mm：毫米尺（三年级「毫米、分米的认识」）——1 毫米一小格、5 毫米一个中格，这时 from / to 按毫米算。
 * SVG 按 viewBox 缩放，手机竖屏也放得下。
 */
const props = defineProps<{ length: number; from: number; to: number; mm?: boolean }>()

const UNIT = computed(() => (props.mm ? 44 : 36)) // 每厘米的宽度（viewBox 单位）；毫米尺放宽一点，小格才看得清
const PAD = 22
const W = computed(() => props.length * UNIT.value + PAD * 2)
const H = 96
const RULER_Y = 40 // 尺子上沿
/** 刻度位置：cm 是厘米数（可以带小数） */
const x = (cm: number): number => PAD + cm * UNIT.value
/** 线段两端：毫米尺按毫米给 */
const ends = computed(() => (props.mm ? [props.from / 10, props.to / 10] : [props.from, props.to]))

const ticks = computed(() => {
  const out: { x: number; len: number; label?: number }[] = []
  const per = props.mm ? 10 : 2 // 每厘米几格
  for (let i = 0; i <= props.length * per; i++) {
    const cm = i / per
    const whole = i % per === 0
    const half = props.mm && i % 5 === 0
    out.push({ x: x(cm), len: whole ? 16 : half ? 12 : props.mm ? 7 : 9, label: whole ? cm : undefined })
  }
  return out
})
</script>

<template>
  <svg class="ruler" :viewBox="`0 0 ${W} ${H}`" :style="{ maxWidth: `${W}px` }" role="img">
    <!-- 线段：两端各一个端点 -->
    <line class="seg" :x1="x(ends[0]!)" :y1="RULER_Y - 16" :x2="x(ends[1]!)" :y2="RULER_Y - 16" />
    <circle class="end" :cx="x(ends[0]!)" :cy="RULER_Y - 16" r="5" />
    <circle class="end" :cx="x(ends[1]!)" :cy="RULER_Y - 16" r="5" />
    <!-- 尺身 -->
    <rect class="body" :x="4" :y="RULER_Y" :width="W - 8" :height="H - RULER_Y - 4" rx="8" />
    <g v-for="(t, i) in ticks" :key="i">
      <line class="tick" :class="{ fine: mm && t.len < 12 }" :x1="t.x" :y1="RULER_Y" :x2="t.x" :y2="RULER_Y + t.len" />
      <text v-if="t.label !== undefined" class="num" :x="t.x" :y="RULER_Y + 36">{{ t.label }}</text>
    </g>
    <text class="unit" :x="W - PAD + 4" :y="H - 12">cm</text>
  </svg>
</template>

<style scoped>
.ruler {
  width: 100%;
  display: block;
  margin: 0 auto;
  overflow: visible;
}
.body {
  fill: #fff4d6;
  stroke: var(--c-primary-dark);
  stroke-width: 2;
}
.tick {
  stroke: var(--c-text);
  stroke-width: 2;
  stroke-linecap: round;
}
.tick.fine {
  stroke-width: 1.2;
}
.num {
  font-size: 14px;
  font-weight: 800;
  fill: var(--c-text);
  text-anchor: middle;
}
.unit {
  font-size: 12px;
  font-weight: 700;
  fill: var(--c-primary-dark);
  text-anchor: end;
}
.seg {
  stroke: var(--c-blue);
  stroke-width: 6;
  stroke-linecap: round;
}
.end {
  fill: var(--c-blue);
}
</style>
