<script setup lang="ts">
import { computed } from 'vue'
import type { LStr } from '@/types/models'
import { t } from '@/engine/i18n'

/**
 * 剪开后的图形（三年级「观察物体」长方体纸盒剪开 / 能不能折成正方体）：按格子坐标画几个正方形，
 * 格子里可以写字（「前」、1、2、3……）。只画给出的格，没有底格。
 * 五下「长方体和正方体的展开图」加了两个可选参数（不传和三年级画得一模一样）：colW / rowH = 每一列宽、每一行高是一格的几倍——
 * 长方体的展开图格子不一样大（课本 p23、练习六 1）。窄栏里放不下时整幅等比缩小（max-width）。
 */
const props = withDefaults(defineProps<{ cells: { r: number; c: number; label?: LStr }[]; size?: number; colW?: number[]; rowH?: number[] }>(), {
  size: 46,
  colW: undefined,
  rowH: undefined,
})

const cw = (c: number): number => props.colW?.[c] ?? 1
const rh = (r: number): number => props.rowH?.[r] ?? 1
/** 第 c 列左边 / 第 r 行上边离起点几格（前面各列宽、各行高加起来） */
const xOf = (c: number): number => 3 + Array.from({ length: c }, (_, i) => cw(i)).reduce((a, b) => a + b, 0) * props.size
const yOf = (r: number): number => 3 + Array.from({ length: r }, (_, i) => rh(i)).reduce((a, b) => a + b, 0) * props.size

const box = computed(() => {
  const rows = Math.max(...props.cells.map((c) => c.r)) + 1
  const cols = Math.max(...props.cells.map((c) => c.c)) + 1
  return { w: xOf(cols) + 3, h: yOf(rows) + 3 }
})

const rects = computed(() =>
  props.cells.map((cell) => {
    const w = cw(cell.c) * props.size
    const h = rh(cell.r) * props.size
    return { cell, x: xOf(cell.c), y: yOf(cell.r), w, h, font: Math.min(w, h) * 0.42 }
  }),
)
</script>

<template>
  <svg class="net" :width="box.w" :height="box.h" :viewBox="`0 0 ${box.w} ${box.h}`" role="img">
    <g v-for="(r, i) in rects" :key="i">
      <rect class="face" :class="{ marked: r.cell.label !== undefined }" :x="r.x" :y="r.y" :width="r.w" :height="r.h" />
      <text v-if="r.cell.label !== undefined" class="label" :x="r.x + r.w / 2" :y="r.y + r.h / 2" :font-size="r.font">{{ t(r.cell.label) }}</text>
    </g>
  </svg>
</template>

<style scoped>
.net {
  display: block;
  margin: 0 auto;
  max-width: 100%;
  height: auto;
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
