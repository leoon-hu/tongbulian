<script setup lang="ts">
import { computed } from 'vue'

/**
 * 秤面（三年级「曹冲称象的故事」认识质量单位：读出几克 / 几千克）：一圈刻度从顶上的 0 顺时针走到 max 又回到顶上，
 * 每 major 标一个数、两个数之间分 minor 小格（minor 是 10 时第 5 小格画长一点，好数）；指针指着 value。
 * 课本 p32–33 的秤：5 千克的手提秤（1、2…4，每千克 10 小格）、1000 克的盘秤（0、50、100…950，每 50 克一个刻度）、
 * 500 克的盘秤（每 50 克一个数、每小格 10 克）、体重秤（每 10 千克一个数、每小格 1 千克）。中间写单位（g / kg，课本秤面上就是这样印的）。
 * aria-label 只说是什么秤，不说指针指着几（那是答案）。
 */
const props = withDefaults(defineProps<{ max: number; major: number; minor?: number; value: number; unit: 'g' | 'kg'; size?: number }>(), {
  minor: 5,
  size: 190,
})

const C = 100 // viewBox 0 0 200 200 的圆心
const R = 88
/** 刻度值 → 角度（弧度，0 在正上方、顺时针） */
const angle = (v: number): number => (v / props.max) * Math.PI * 2
const at = (v: number, r: number): { x: number; y: number } => ({ x: C + Math.sin(angle(v)) * r, y: C - Math.cos(angle(v)) * r })

const ticks = computed(() => {
  const out: { x1: number; y1: number; x2: number; y2: number; big: boolean; mid: boolean }[] = []
  const steps = Math.round(props.max / props.major) * props.minor
  const half = props.minor >= 10 && props.minor % 2 === 0 ? props.minor / 2 : 0
  for (let i = 0; i < steps; i++) {
    const v = (i / steps) * props.max
    const big = i % props.minor === 0
    const mid = !big && half > 0 && i % props.minor === half
    const a = at(v, R - 2)
    const b = at(v, R - (big ? 14 : mid ? 11 : 7))
    out.push({ x1: a.x, y1: a.y, x2: b.x, y2: b.y, big, mid })
  }
  return out
})
const labels = computed(() => {
  const out: { x: number; y: number; text: number }[] = []
  const n = Math.round(props.max / props.major)
  // 数多（盘秤 20 个数）时字小一点、离刻度近一点
  const r = n > 12 ? R - 26 : R - 30
  for (let i = 0; i < n; i++) {
    const v = i * props.major
    const p = at(v, r)
    out.push({ x: p.x, y: p.y, text: v })
  }
  return out
})
const small = computed(() => Math.round(props.max / props.major) > 12)
/** 小格很多（体重秤 100 格）时细线画细一点，挨得近也分得开 */
const dense = computed(() => Math.round(props.max / props.major) * props.minor > 60)
/** 小格多的秤面画大一点（手机竖屏 230 也放得下）；比这一栏宽时随栏宽等比缩小（样式里 max-width: 100%，高跟着宽走） */
const px = computed(() => (dense.value ? Math.max(props.size, 230) : props.size))
const needle = computed(() => at(props.value, R - 20))
</script>

<template>
  <svg class="dial" :class="{ dense }" viewBox="0 0 200 200" :style="{ width: `${px}px` }" role="img" :aria-label="`0–${max} ${unit}`">
    <circle class="face" :cx="C" :cy="C" :r="R + 6" />
    <line v-for="(t, i) in ticks" :key="`t${i}`" class="tick" :class="{ big: t.big, mid: t.mid }" :x1="t.x1" :y1="t.y1" :x2="t.x2" :y2="t.y2" />
    <!-- 指针画在数的下面、数带一圈白边：指针正好指着一个数时，那个数也看得清 -->
    <line class="needle" :x1="C" :y1="C" :x2="needle.x" :y2="needle.y" />
    <text v-for="l in labels" :key="`l${l.text}`" class="num" :class="{ small }" :x="l.x" :y="l.y">{{ l.text }}</text>
    <text class="unit" :x="C" :y="C + 38">{{ unit }}</text>
    <circle class="pivot" :cx="C" :cy="C" r="6" />
  </svg>
</template>

<style scoped>
.dial {
  display: block;
  margin: 0 auto;
  flex-shrink: 0;
  /* 放得下时照 px 的大小画；栏比它窄（打怪兽手机横屏两人一栏才一百多像素）就随栏宽等比缩小，不再比这一栏宽、两边被裁 */
  max-width: 100%;
  height: auto;
  aspect-ratio: 1;
}
.face {
  fill: var(--c-card);
  stroke: var(--c-primary);
  stroke-width: 6;
}
.tick {
  stroke: var(--c-text);
  stroke-width: 1.2;
  stroke-linecap: round;
}
.tick.big {
  stroke-width: 2.4;
}
.tick.mid {
  stroke-width: 1.8;
}
.dense .tick:not(.big):not(.mid) {
  stroke-width: 0.9;
}
.num {
  font-size: 15px;
  font-weight: 800;
  fill: var(--c-text);
  text-anchor: middle;
  dominant-baseline: central;
  paint-order: stroke;
  stroke: var(--c-card);
  stroke-width: 4px;
  stroke-linejoin: round;
}
.num.small {
  font-size: 10px;
}
.unit {
  font-size: 16px;
  font-weight: 800;
  fill: var(--c-primary-dark);
  text-anchor: middle;
}
.needle {
  stroke: var(--c-red);
  stroke-width: 4;
  stroke-linecap: round;
}
.pivot {
  fill: var(--c-red);
}
</style>
