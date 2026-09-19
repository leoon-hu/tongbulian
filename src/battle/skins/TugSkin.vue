<script setup lang="ts">
// 🪢 拔河（拉锯，上方横条）：绳结的位置 = 比分差；谁先到 8 分谁把对方拉过线
import { computed } from 'vue'
import type { SkinProps } from './index'

const props = defineProps<SkinProps>()
/** -1…1：正数偏红队（左） */
const pull = computed(() => {
  if (props.winner) return props.winner === 'red' ? 1 : -1
  return (props.red - props.blue) / props.target
})
</script>

<template>
  <div class="tug">
    <span class="puller red" :class="{ win: winner === 'red', lose: winner === 'blue' }">🐻</span>
    <div class="rope">
      <div class="line" />
      <div class="mark" />
      <span class="knot" :style="{ '--d': pull }">
        <span :key="red + blue" class="sprite">🪢</span>
      </span>
    </div>
    <span class="puller blue" :class="{ win: winner === 'blue', lose: winner === 'red' }">🐼</span>
  </div>
</template>

<style scoped>
.tug {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  height: 100%;
  padding: 0 12px;
}
.puller {
  flex: none;
  font-size: 2em;
  line-height: 1;
  transition: transform 0.6s ease;
}
.puller.red {
  transform: scaleX(-1);
}
.puller.win {
  animation: cheer 0.5s ease-in-out infinite alternate;
}
.puller.lose {
  transform: rotate(70deg) translateY(30%);
  opacity: 0.7;
}
.puller.red.lose {
  transform: scaleX(-1) rotate(70deg) translateY(30%);
}
.rope {
  position: relative;
  flex: 1;
  height: 100%;
}
.line {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  border-top: 5px solid #c8a26a;
  border-radius: 3px;
}
.mark {
  position: absolute;
  left: 50%;
  top: 20%;
  bottom: 20%;
  border-left: 3px dashed var(--c-text-light);
  opacity: 0.5;
}
.knot {
  position: absolute;
  top: 50%;
  left: calc(50% - var(--d) * 42%);
  transform: translate(-50%, -50%);
  transition: left 0.7s cubic-bezier(0.34, 1.3, 0.64, 1);
  font-size: 1.9em;
  line-height: 1;
}
.sprite {
  display: inline-block;
  animation: tug 0.4s ease;
}
@keyframes tug {
  0%,
  100% {
    transform: rotate(0);
  }
  50% {
    transform: rotate(18deg) scale(1.15);
  }
}
@keyframes cheer {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-25%);
  }
}
.puller.red.win {
  animation: cheer-red 0.5s ease-in-out infinite alternate;
}
@keyframes cheer-red {
  from {
    transform: scaleX(-1) translateY(0);
  }
  to {
    transform: scaleX(-1) translateY(-25%);
  }
}
</style>
