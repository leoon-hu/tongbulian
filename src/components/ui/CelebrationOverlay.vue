<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ show: boolean }>()

const COLORS = ['#ff8a3d', '#4aa3ff', '#3ecf8e', '#ffc93c', '#a78bfa', '#ff6b6b']

/** show 变化时重算，让每次撒花位置都不同 */
const pieces = computed(() => {
  if (!props.show) return []
  return Array.from({ length: 18 }, (_, i) => ({
    left: `${Math.random() * 100}%`,
    background: COLORS[i % COLORS.length],
    animationDelay: `${Math.random() * 0.3}s`,
    animationDuration: `${0.9 + Math.random() * 0.6}s`,
  }))
})
</script>

<template>
  <Transition name="fade">
    <div v-if="show" class="overlay">
      <div class="emoji">🎉</div>
      <span v-for="(p, i) in pieces" :key="i" class="confetti" :style="p" />
    </div>
  </Transition>
</template>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 100;
}
.emoji {
  position: absolute;
  left: 50%;
  top: 38%;
  transform: translate(-50%, -50%);
  font-size: 96px;
  animation: bounce 0.6s cubic-bezier(0.34, 1.56, 0.64, 1);
}
@keyframes bounce {
  from {
    transform: translate(-50%, -50%) scale(0);
  }
  to {
    transform: translate(-50%, -50%) scale(1);
  }
}
.confetti {
  position: absolute;
  top: -12px;
  width: 12px;
  height: 12px;
  border-radius: 3px;
  animation: fall linear forwards;
}
@keyframes fall {
  to {
    transform: translateY(105vh) rotate(540deg);
  }
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
