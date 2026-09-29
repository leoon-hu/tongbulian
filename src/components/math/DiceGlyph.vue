<script setup lang="ts">
import { computed } from 'vue'

/**
 * 写着数的正方体（三年级「观察物体」做一做 1：「正方体相对两个面上的数，和是 7」）：
 * 斜二测画法（同 ShapeGlyph），看得见的前面、上面、右面各写一个数。
 */
const props = withDefaults(defineProps<{ front: number; top: number; right: number; size?: number }>(), { size: 120 })

const g = computed(() => {
  const a = props.size * 0.62
  const r = (a / 2) * Math.SQRT1_2
  const y0 = r + 2
  const x0 = 2
  const pt = (x: number, y: number): string => `${x.toFixed(1)},${y.toFixed(1)}`
  return {
    a,
    r,
    w: a + r + 4,
    h: a + r + 4,
    front: [pt(x0, y0), pt(x0 + a, y0), pt(x0 + a, y0 + a), pt(x0, y0 + a)].join(' '),
    top: [pt(x0, y0), pt(x0 + r, y0 - r), pt(x0 + a + r, y0 - r), pt(x0 + a, y0)].join(' '),
    right: [pt(x0 + a, y0), pt(x0 + a + r, y0 - r), pt(x0 + a + r, y0 + a - r), pt(x0 + a, y0 + a)].join(' '),
    // 三个面上写数的位置（斜面上的数压扁一点，像印在面上）
    frontAt: { x: x0 + a / 2, y: y0 + a / 2 },
    topAt: { x: x0 + a / 2 + r / 2, y: y0 - r / 2 },
    rightAt: { x: x0 + a + r / 2, y: y0 + a / 2 - r / 2 },
  }
})
</script>

<template>
  <svg class="dice" :width="g.w" :height="g.h" :viewBox="`0 0 ${g.w} ${g.h}`" role="img" :aria-label="`${front} ${top} ${right}`">
    <polygon class="ftop" :points="g.top" />
    <polygon class="fright" :points="g.right" />
    <polygon class="ffront" :points="g.front" />
    <text class="num" :x="g.frontAt.x" :y="g.frontAt.y" :font-size="g.a * 0.5">{{ front }}</text>
    <text class="num" :x="g.topAt.x" :y="g.topAt.y" :font-size="g.a * 0.3" :transform="`translate(${g.topAt.x} ${g.topAt.y}) scale(1 0.55) translate(${-g.topAt.x} ${-g.topAt.y})`">{{ top }}</text>
    <text class="num" :x="g.rightAt.x" :y="g.rightAt.y" :font-size="g.a * 0.3" :transform="`translate(${g.rightAt.x} ${g.rightAt.y}) scale(0.55 1) translate(${-g.rightAt.x} ${-g.rightAt.y})`">{{ right }}</text>
  </svg>
</template>

<style scoped>
.dice {
  display: block;
  margin: 0 auto;
  overflow: visible;
}
polygon {
  stroke: #2c3e66;
  stroke-width: 2;
  stroke-linejoin: round;
}
.ffront {
  fill: #ffffff;
}
.ftop {
  fill: #eef3ff;
}
.fright {
  fill: #d5def5;
}
.num {
  font-weight: 800;
  fill: #2c3e66;
  text-anchor: middle;
  dominant-baseline: central;
}
</style>
