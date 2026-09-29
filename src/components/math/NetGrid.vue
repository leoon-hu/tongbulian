<script setup lang="ts">
import { computed } from 'vue'
import type { LStr } from '@/types/models'
import { t } from '@/engine/i18n'

/**
 * 剪开后的图形（三年级「观察物体」长方体纸盒剪开 / 能不能折成正方体）：按格子坐标画几个正方形，
 * 格子里可以写字（「前」、1、2、3……）。只画给出的格，没有底格。
 */
const props = withDefaults(defineProps<{ cells: { r: number; c: number; label?: LStr }[]; size?: number }>(), { size: 46 })

const box = computed(() => {
  const rows = Math.max(...props.cells.map((c) => c.r)) + 1
  const cols = Math.max(...props.cells.map((c) => c.c)) + 1
  return { w: cols * props.size + 6, h: rows * props.size + 6 }
})
</script>

<template>
  <svg class="net" :width="box.w" :height="box.h" :viewBox="`0 0 ${box.w} ${box.h}`" role="img">
    <g v-for="(cell, i) in cells" :key="i">
      <rect class="face" :class="{ marked: cell.label !== undefined }" :x="3 + cell.c * size" :y="3 + cell.r * size" :width="size" :height="size" />
      <text v-if="cell.label !== undefined" class="label" :x="3 + cell.c * size + size / 2" :y="3 + cell.r * size + size / 2" :font-size="size * 0.42">{{ t(cell.label) }}</text>
    </g>
  </svg>
</template>

<style scoped>
.net {
  display: block;
  margin: 0 auto;
}
.face {
  fill: #e8f4ff;
  stroke: #2f7bd6;
  stroke-width: 2.5;
}
.label {
  font-weight: 800;
  fill: var(--c-text);
  text-anchor: middle;
  dominant-baseline: central;
}
</style>
