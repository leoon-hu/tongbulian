<script setup lang="ts">
import { computed } from 'vue'

/**
 * 百数表（五下「因数和倍数」，照课本画：2、5 的倍数的特征例 1 和 3 的倍数的特征例 2 是 0–99，质数表例 1 是 1–100，练习三 11 是 1–50）：
 * 从 start 起 count 个连续的数，每行 cols 个（默认 10），一格一个数。
 * circled = 画红圈的数（课本「把……圈起来」），boxed = 画蓝框的数（「把……框起来」），两样都有的圈画在框里面；
 * crossed = 找质数时去掉的数（画一条斜线、数变淡）。
 * 表里的数不朗读、图里没有汉字（题目文字里说清问什么）；aria-label 只说是从几到几的表。
 * 尺寸：一格 30（viewBox 单位），10 列的表自然宽 304；窄屏、对战的窄栏里整张表等比缩小（max-width: 100%）。
 */
const props = withDefaults(
  defineProps<{ start: number; count: number; cols?: number; circled?: number[]; boxed?: number[]; crossed?: number[] }>(),
  { cols: 10, circled: () => [], boxed: () => [], crossed: () => [] },
)

const CELL = 30
const PAD = 2

const lay = computed(() => {
  const cols = Math.max(1, props.cols)
  const rows = Math.ceil(props.count / cols)
  const circ = new Set(props.circled)
  const box = new Set(props.boxed)
  const cross = new Set(props.crossed)
  const cells = Array.from({ length: props.count }, (_, i) => {
    const n = props.start + i
    return {
      n,
      x: PAD + (i % cols) * CELL,
      y: PAD + Math.floor(i / cols) * CELL,
      circled: circ.has(n),
      boxed: box.has(n),
      crossed: cross.has(n),
    }
  })
  return { cells, width: PAD * 2 + cols * CELL, height: PAD * 2 + rows * CELL }
})
</script>

<template>
  <figure class="hundred-chart">
    <svg
      :viewBox="`0 0 ${lay.width} ${lay.height}`"
      :width="lay.width"
      :height="lay.height"
      role="img"
      :aria-label="`${start}–${start + count - 1}`"
    >
      <g v-for="c in lay.cells" :key="c.n" class="cell" :class="{ crossed: c.crossed }" :data-n="c.n">
        <rect :x="c.x" :y="c.y" :width="CELL" :height="CELL" class="bg" />
        <rect v-if="c.boxed" :x="c.x + 2.5" :y="c.y + 2.5" :width="CELL - 5" :height="CELL - 5" rx="3" class="box" />
        <circle v-if="c.circled" :cx="c.x + CELL / 2" :cy="c.y + CELL / 2" :r="c.boxed ? 10 : 12" class="ring" />
        <text :x="c.x + CELL / 2" :y="c.y + CELL / 2 + 4.3" text-anchor="middle" class="num" :class="{ small: c.n >= 100 }">{{ c.n }}</text>
        <line v-if="c.crossed" :x1="c.x + 5" :y1="c.y + CELL - 5" :x2="c.x + CELL - 5" :y2="c.y + 5" class="cross" />
      </g>
    </svg>
  </figure>
</template>

<style scoped>
.hundred-chart {
  margin: 0;
  max-width: 100%;
  padding: 4px;
  border-radius: var(--radius-sm);
  background: var(--c-card);
  box-shadow: var(--shadow-card);
}
svg {
  display: block;
  max-width: 100%;
  height: auto;
}
.bg {
  fill: #f4fbfd;
  stroke: #7cc6d9;
  stroke-width: 1;
}
.num {
  fill: var(--c-text);
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.num.small {
  font-size: 11px;
}
.crossed .num {
  opacity: 0.38;
}
.ring {
  fill: none;
  stroke: #e2483d;
  stroke-width: 1.8;
}
.box {
  fill: none;
  stroke: #2f7bd6;
  stroke-width: 1.8;
}
.cross {
  stroke: #8a7f74;
  stroke-width: 1.6;
  stroke-linecap: round;
}
</style>
