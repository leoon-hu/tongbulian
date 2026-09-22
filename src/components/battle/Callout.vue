<script setup lang="ts">
// 弹出提示（B5a）：连对 n 题 / 反超啦 / 还差一分，带队色从游戏区上方弹出来，1.6 秒后消失（朗读由竞技场负责）
import type { Callout } from '@/stores/battle'
import RubyText from '@/components/ui/RubyText.vue'

defineProps<{ callout: Callout | null }>()
</script>

<template>
  <Transition name="callout">
    <div v-if="callout" :key="callout.id" class="callout" :class="callout.team" role="status">
      <RubyText :text="{ k: callout.key, p: callout.p }" />
    </div>
  </Transition>
</template>

<style scoped>
.callout {
  position: absolute;
  left: 50%;
  top: 14%;
  transform: translateX(-50%);
  z-index: 25;
  padding: 6px 22px;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 6px 18px rgba(61, 44, 30, 0.18);
  border: 3px solid var(--c-primary);
  font-size: var(--fs-xl);
  font-weight: 900;
  white-space: nowrap;
  pointer-events: none;
  animation: pop 0.45s cubic-bezier(0.34, 1.56, 0.64, 1), wiggle 0.6s ease-in-out 0.45s infinite alternate;
}
.callout.red {
  border-color: var(--c-red);
  color: var(--c-red);
}
.callout.blue {
  border-color: var(--c-blue);
  color: var(--c-blue);
}
/* 决胜题（B62）：两队都算，红蓝渐变描边 */
.callout.both {
  border-color: transparent;
  background:
    linear-gradient(#fff, #fff) padding-box,
    linear-gradient(90deg, var(--c-red), var(--c-blue)) border-box;
  color: var(--c-primary-dark);
}
.callout-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.callout-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-20px);
}
@keyframes pop {
  from {
    transform: translateX(-50%) scale(0.3);
    opacity: 0;
  }
  to {
    transform: translateX(-50%) scale(1);
    opacity: 1;
  }
}
@keyframes wiggle {
  from {
    transform: translateX(-50%) rotate(-3deg);
  }
  to {
    transform: translateX(-50%) rotate(3deg);
  }
}
</style>
