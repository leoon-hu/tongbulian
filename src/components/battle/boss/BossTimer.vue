<script setup lang="ts">
// 打怪兽顶栏的计时器（M6）：大号「1:23」+ 一圈进度（剩下的占整段时长的多少），最后 10 秒变红、每秒跳一下
import { computed } from 'vue'
import { ui } from '@/engine/i18n'
import { LAST_TEN_MS, formatClock } from '@/battle/timed'

const props = defineProps<{ ms: number; total: number }>()

const R = 16
const C = 2 * Math.PI * R
const left = computed(() => Math.max(0, Math.min(1, props.total > 0 ? props.ms / props.total : 0)))
const urgent = computed(() => props.ms > 0 && props.ms <= LAST_TEN_MS)
const text = computed(() => formatClock(props.ms))
/** 最后 10 秒每换一个数字重新挂一次，跳一下 */
const beat = computed(() => (urgent.value ? Math.ceil(props.ms / 1000) : 0))
</script>

<template>
  <div class="timer" :class="{ urgent }" role="timer" :aria-label="ui('boss.timer')">
    <svg class="ring" viewBox="0 0 40 40" aria-hidden="true">
      <circle class="track" cx="20" cy="20" :r="R" />
      <circle class="left" cx="20" cy="20" :r="R" :stroke-dasharray="C" :stroke-dashoffset="C * (1 - left)" />
    </svg>
    <span :key="beat" class="clock">{{ text }}</span>
  </div>
</template>

<style scoped>
.timer {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 12px 2px 4px;
  border-radius: 999px;
  background: var(--c-card);
  box-shadow: var(--shadow-card);
}
.ring {
  width: 34px;
  height: 34px;
  transform: rotate(-90deg);
}
.track {
  fill: none;
  stroke: var(--c-locked);
  stroke-width: 5;
  opacity: 0.35;
}
.left {
  fill: none;
  stroke: var(--c-primary);
  stroke-width: 5;
  stroke-linecap: round;
  transition: stroke-dashoffset 0.25s linear;
}
.clock {
  min-width: 3.2em;
  font-size: var(--fs-lg);
  font-weight: 900;
  font-variant-numeric: tabular-nums;
  color: var(--c-text);
}
.timer.urgent .left {
  stroke: var(--c-red);
}
.timer.urgent .clock {
  color: var(--c-red);
  animation: beat 0.5s ease-out;
}
@keyframes beat {
  from {
    transform: scale(1.25);
  }
}
@media (prefers-reduced-motion: reduce) {
  .timer.urgent .clock {
    animation: none;
  }
}
</style>
