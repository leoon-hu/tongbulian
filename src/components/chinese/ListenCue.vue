<script setup lang="ts">
/**
 * 听音题（需求 Y3）：一个大喇叭。要听的字词只在朗读里（屏幕上不出现）；点题目任意位置就再读一遍
 * （练习页 / 对战的题目区整块都是「再听一遍」的按钮，这里只是个样子，点击冒泡给外层）。
 */
</script>

<template>
  <div class="listen" aria-hidden="true">
    <span class="horn">🔊</span>
    <span class="waves"><i /><i /><i /></span>
  </div>
</template>

<style scoped>
.listen {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 132px;
  height: 104px;
  border-radius: var(--radius-lg);
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  border: 3px solid var(--c-line);
}
.horn {
  font-size: 56px;
  line-height: 1;
}
.waves {
  display: flex;
  align-items: center;
  gap: 4px;
}
.waves i {
  display: block;
  width: 6px;
  border-radius: 3px;
  background: var(--c-primary);
  animation: wave 1.1s ease-in-out infinite;
}
.waves i:nth-child(1) {
  height: 14px;
}
.waves i:nth-child(2) {
  height: 24px;
  animation-delay: 0.15s;
}
.waves i:nth-child(3) {
  height: 34px;
  animation-delay: 0.3s;
}
@keyframes wave {
  50% {
    transform: scaleY(0.5);
    opacity: 0.6;
  }
}
@media (prefers-reduced-motion: reduce) {
  .waves i {
    animation: none;
  }
}
</style>
