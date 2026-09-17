<script setup lang="ts">
import { computed } from 'vue'

/**
 * 尺子 + 线段（量一量）：0…length 厘米的刻度尺，上方压着一条从 from 到 to 的线段。
 * 线段不一定从 0 开始（二年级要学会「右端刻度 − 左端刻度」），刻度间半厘米有小格。
 * SVG 按 viewBox 缩放，手机竖屏也放得下。
 */
const props = defineProps<{ length: number; from: number; to: number }>()

const UNIT = 36 // 每厘米的宽度（viewBox 单位）
const PAD = 22
const W = computed(() => props.length * UNIT + PAD * 2)
const H = 96
const RULER_Y = 40 // 尺子上沿
const x = (cm: number): number => PAD + cm * UNIT

const ticks = computed(() => {
  const out: { x: number; big: boolean; label?: number }[] = []
  for (let i = 0; i <= props.length * 2; i++) {
    const cm = i / 2
    out.push({ x: x(cm), big: i % 2 === 0, label: i % 2 === 0 ? cm : undefined })
  }
  return out
})
</script>

<template>
  <svg class="ruler" :viewBox="`0 0 ${W} ${H}`" :style="{ maxWidth: `${W}px` }" role="img">
    <!-- 线段：两端各一个端点 -->
    <line class="seg" :x1="x(from)" :y1="RULER_Y - 16" :x2="x(to)" :y2="RULER_Y - 16" />
    <circle class="end" :cx="x(from)" :cy="RULER_Y - 16" r="5" />
    <circle class="end" :cx="x(to)" :cy="RULER_Y - 16" r="5" />
    <!-- 尺身 -->
    <rect class="body" :x="4" :y="RULER_Y" :width="W - 8" :height="H - RULER_Y - 4" rx="8" />
    <g v-for="(t, i) in ticks" :key="i">
      <line class="tick" :x1="t.x" :y1="RULER_Y" :x2="t.x" :y2="RULER_Y + (t.big ? 16 : 9)" />
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
