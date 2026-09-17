<script setup lang="ts">
import { computed } from 'vue'

/**
 * 一个角：顶点 + 两条边 + 小弧（直角画成小方块，课本记法）。
 * deg 是角的大小，rot 让整个角随机转个方向——免得孩子靠「开口朝右」判断。
 */
const props = withDefaults(defineProps<{ deg: number; rot?: number; size?: number }>(), { rot: 0, size: 96 })

const R = computed(() => props.size * 0.42) // 边长
const ARC = computed(() => props.size * 0.16) // 弧的半径
const c = computed(() => props.size / 2)
const rad = (d: number): number => (d * Math.PI) / 180
const pt = (d: number, r: number): { x: number; y: number } => ({
  x: c.value + Math.cos(rad(d)) * r,
  y: c.value - Math.sin(rad(d)) * r,
})
const a = computed(() => pt(props.rot, R.value))
const b = computed(() => pt(props.rot + props.deg, R.value))
const arcPath = computed(() => {
  const p1 = pt(props.rot, ARC.value)
  const p2 = pt(props.rot + props.deg, ARC.value)
  const large = props.deg > 180 ? 1 : 0
  return `M ${p1.x} ${p1.y} A ${ARC.value} ${ARC.value} 0 ${large} 0 ${p2.x} ${p2.y}`
})
// 直角记号：沿两边各走一小段再连成方块
const squarePath = computed(() => {
  const s = ARC.value * 0.8
  const p1 = pt(props.rot, s)
  const p3 = pt(props.rot + 90, s)
  const p2 = { x: p1.x + p3.x - c.value, y: p1.y + p3.y - c.value }
  return `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p3.x} ${p3.y}`
})
</script>

<template>
  <svg class="angle" :viewBox="`0 0 ${size} ${size}`" :width="size" :height="size" role="img">
    <path v-if="deg === 90" class="arc" :d="squarePath" />
    <path v-else class="arc" :d="arcPath" />
    <line class="ray" :x1="c" :y1="c" :x2="a.x" :y2="a.y" />
    <line class="ray" :x1="c" :y1="c" :x2="b.x" :y2="b.y" />
    <circle class="vertex" :cx="c" :cy="c" r="4" />
  </svg>
</template>

<style scoped>
.angle {
  display: block;
  overflow: visible;
}
.ray {
  stroke: var(--c-text);
  stroke-width: 4;
  stroke-linecap: round;
}
.arc {
  fill: none;
  stroke: var(--c-primary);
  stroke-width: 3;
}
.vertex {
  fill: var(--c-primary-dark);
}
</style>
