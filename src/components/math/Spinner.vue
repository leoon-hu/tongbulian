<script setup lang="ts">
import { computed } from 'vue'
import type { ChanceColor } from '@/types/models'

/**
 * 转盘（五上「可能性」练习十九 2、练习二十 1，照课本画）：圆平均分成几份（items 里一个转盘一个数组，数组多长就分几份），
 * 从正上方起顺时针一份一个颜色，份与份之间一条白线，中心一个小圆钉、一根指向右边的深色指针。
 * 一个或几个并排，numbered 时下面标 1、2、3……（选项就是这几个数）。图里不写字、不朗读（题目文字里会说清问什么）。
 */
const props = withDefaults(defineProps<{ items: ChanceColor[][]; numbered?: boolean }>(), { numbered: false })

const FILL: Record<ChanceColor, string> = { red: '#ee5a52', yellow: '#f7d46a', blue: '#8ccbea', green: '#7ccf8f', white: '#ffffff' }
const R = 44
const C = 50
/** 三个以上并排时小一点，手机竖屏一行放得下（练习二十 1 的选转盘题） */
const size = computed(() => (props.items.length >= 3 ? 96 : 120))

const pt = (deg: number, r = R): string => {
  const a = ((deg - 90) * Math.PI) / 180
  return `${(C + r * Math.cos(a)).toFixed(2)} ${(C + r * Math.sin(a)).toFixed(2)}`
}

const wheels = computed(() =>
  props.items.map((sectors) => {
    const n = Math.max(1, sectors.length)
    const step = 360 / n
    return sectors.map((color, i) => ({
      color,
      d: n === 1 ? '' : `M${C} ${C} L${pt(i * step)} A${R} ${R} 0 0 1 ${pt((i + 1) * step)} Z`,
    }))
  }),
)
</script>

<template>
  <div class="spinners" :class="{ single: items.length === 1 }">
    <figure v-for="(w, i) in wheels" :key="i" class="spinner">
      <svg viewBox="0 0 100 100" :width="size" :height="size" role="img" :aria-label="`${w.length}`">
        <circle v-if="w.length === 1" :cx="C" :cy="C" :r="R" :fill="FILL[w[0]!.color]" />
        <template v-else>
          <path v-for="(s, k) in w" :key="k" class="sector" :d="s.d" :fill="FILL[s.color]" />
        </template>
        <circle class="rim" :cx="C" :cy="C" :r="R" />
        <line class="needle" :x1="C" :y1="C" :x2="C + R * 0.74" :y2="C" />
        <path class="tip" :d="`M${C + R * 0.82} ${C} l-7 -3.4 v6.8 z`" />
        <circle class="hub" :cx="C" :cy="C" r="3.6" />
      </svg>
      <figcaption v-if="numbered" class="no">{{ i + 1 }}</figcaption>
    </figure>
  </div>
</template>

<style scoped>
.spinners {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px 18px;
  max-width: 100%;
}
.spinner {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 100%;
}
svg {
  display: block;
  max-width: 100%;
  height: auto;
}
.single svg {
  width: 140px;
}
.sector {
  stroke: #fff;
  stroke-width: 1.4;
  stroke-linejoin: round;
}
.rim {
  fill: none;
  stroke: #2f6f99;
  stroke-width: 1.6;
}
.needle {
  stroke: #1d3f73;
  stroke-width: 3.2;
  stroke-linecap: round;
}
.tip {
  fill: #1d3f73;
}
.hub {
  fill: #fff;
  stroke: #1d3f73;
  stroke-width: 2;
}
.no {
  margin-top: 2px;
  font-size: 17px;
  font-weight: 800;
  color: var(--c-text);
}
</style>
