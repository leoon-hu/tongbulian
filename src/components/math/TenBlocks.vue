<script setup lang="ts">
import { computed } from 'vue'

/**
 * 十块条和小方块（三年级口算乘法，课本 p40 的图）：groups 组并排，每组一个蓝框，框里 tens 根竖着的十块条（10 个小方块连成一根）、
 * 右下角 ones 个小方块（5 个一列）。20 × 3 = 3 组、每组 2 根；12 × 3 = 3 组、每组 1 根 2 个——孩子数「几个十、几个一」。
 * SVG，宽度随 viewBox 缩放（组多的时候在手机上整体缩小）。
 */
const props = defineProps<{ groups: number; tens: number; ones: number }>()

/** 小方块边长、十块条之间的缝、组里的留白、组与组之间的缝；画出来放大 SCALE 倍 */
const U = 9
const GAP = 3
const PAD = 6
const GROUP_GAP = 8
const ROD_H = U * 10
const SCALE = 1.1

/** 小方块排几列（5 个一列） */
const cubeCols = computed(() => Math.ceil(props.ones / 5))
/** 一组的宽：十块条 + 小方块那几列 */
const groupW = computed(() => {
  const rods = props.tens * U + Math.max(0, props.tens - 1) * GAP
  const cubes = props.ones ? (props.tens ? 4 : 0) + cubeCols.value * U + (cubeCols.value - 1) * GAP : 0
  return PAD * 2 + rods + cubes
})
const groupH = PAD * 2 + ROD_H
const width = computed(() => props.groups * groupW.value + (props.groups - 1) * GROUP_GAP + 4)
const height = groupH + 4

/** 一组里的十块条（左边的 x）与小方块（左上角，从下往上摞） */
const rods = computed(() => Array.from({ length: props.tens }, (_, i) => PAD + i * (U + GAP)))
const cubes = computed(() => {
  const x0 = PAD + props.tens * U + Math.max(0, props.tens - 1) * GAP + (props.tens ? 4 : 0)
  return Array.from({ length: props.ones }, (_, i) => ({
    x: x0 + Math.floor(i / 5) * (U + GAP),
    y: PAD + ROD_H - U - (i % 5) * U,
  }))
})
const groupX = (g: number): number => 2 + g * (groupW.value + GROUP_GAP)
</script>

<template>
  <div class="blocks">
    <svg
      :viewBox="`0 0 ${width} ${height}`"
      :width="width * SCALE"
      :height="height * SCALE"
      role="img"
      :aria-label="`${groups} × ${tens * 10 + ones}`"
    >
      <g v-for="g in groups" :key="g" class="group" :transform="`translate(${groupX(g - 1)} 2)`">
        <rect class="frame" x="0" y="0" :width="groupW" :height="groupH" rx="7" />
        <g v-for="(x, i) in rods" :key="`r${i}`" class="rod">
          <rect class="cube" :x="x" :y="PAD" :width="U" :height="ROD_H" />
          <line v-for="k in 9" :key="k" class="seam" :x1="x" :x2="x + U" :y1="PAD + k * U" :y2="PAD + k * U" />
        </g>
        <rect v-for="(c, i) in cubes" :key="`c${i}`" class="cube one" :x="c.x" :y="c.y" :width="U" :height="U" />
      </g>
    </svg>
  </div>
</template>

<style scoped>
.blocks {
  max-width: 100%;
  padding: 6px 8px;
  background: var(--c-bg);
  border-radius: var(--radius-md);
}
.blocks svg {
  display: block;
  max-width: 100%;
  height: auto;
  margin: 0 auto;
}
.frame {
  fill: #ffffff;
  stroke: var(--c-blue);
  stroke-width: 1.5;
}
.cube {
  fill: #ffe1bd;
  stroke: var(--c-primary-dark);
  stroke-width: 1;
}
.seam {
  stroke: var(--c-primary-dark);
  stroke-width: 0.6;
}
</style>
