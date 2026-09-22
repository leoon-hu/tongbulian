<script setup lang="ts">
// 幸运题答对了（B65）：撒一阵金色彩纸，1.8 秒自己消失（由竞技场按 store.lucky 挂 / 卸）；只画，不接触摸
import { computed } from 'vue'
import type { Team } from '@/battle/protocol'

const props = defineProps<{ team: Team }>()
const GOLD = ['#ffd54a', '#ffc93c', '#fff3c4', '#ffb347', '#ffffff']
const pieces = computed(() =>
  Array.from({ length: 30 }, (_, i) => ({
    left: `${props.team === 'red' ? (i * 23) % 50 : 50 + ((i * 23) % 50)}%`,
    background: GOLD[i % GOLD.length],
    animationDelay: `${(i % 6) * 0.08}s`,
    animationDuration: `${1.1 + (i % 4) * 0.2}s`,
    width: `${6 + (i % 3) * 3}px`,
    height: `${8 + (i % 4) * 3}px`,
    borderRadius: i % 2 ? '50%' : '2px',
  })),
)
</script>

<template>
  <div class="lucky-burst" aria-hidden="true">
    <span v-for="(p, i) in pieces" :key="i" class="gold" :style="p" />
  </div>
</template>

<style scoped>
.lucky-burst {
  position: absolute;
  inset: 0;
  z-index: 26;
  overflow: hidden;
  pointer-events: none;
}
.gold {
  position: absolute;
  top: -16px;
  animation: gold-fall ease-in forwards;
}
@keyframes gold-fall {
  to {
    transform: translateY(70vh) rotate(540deg);
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .gold {
    animation-duration: 0.6s;
  }
}
</style>
