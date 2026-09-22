<script setup lang="ts">
// 飞过去的表情（需求 B58）：从发送方那边的顶栏飞向对方那边，画一道弧、放大再淡出；观战方的从顶上正中落下来。
// 只画，不接触摸；列表由 store 维护（每条 EMOTE_MS 后自己消失）。
import { emojiOf } from '@/battle/emotes'
import type { EmoteShown } from '@/stores/battle'

defineProps<{ emotes: readonly EmoteShown[] }>()
</script>

<template>
  <div class="emote-layer" aria-hidden="true">
    <span v-for="e in emotes" :key="e.id" class="emote" :class="[`from-${e.side}`, { mine: e.mine }]">{{ emojiOf(e.kind) }}</span>
  </div>
</template>

<style scoped>
.emote-layer {
  position: absolute;
  inset: 0;
  z-index: 24;
  overflow: hidden;
  pointer-events: none;
}
.emote {
  position: absolute;
  top: 6px;
  font-size: 40px;
  line-height: 1;
  will-change: transform, opacity;
  animation: fly-red 1.4s cubic-bezier(0.2, 0.7, 0.3, 1) forwards;
}
.emote.from-red {
  left: 12%;
}
.emote.from-blue {
  right: 12%;
  animation-name: fly-blue;
}
.emote.from-watch {
  left: 50%;
  animation-name: fly-watch;
}
@keyframes fly-red {
  0% {
    transform: translate(0, 0) scale(0.5);
    opacity: 0;
  }
  15% {
    transform: translate(8vw, -10px) scale(1.4) rotate(-10deg);
    opacity: 1;
  }
  70% {
    transform: translate(56vw, 30vh) scale(2) rotate(8deg);
    opacity: 1;
  }
  100% {
    transform: translate(60vw, 36vh) scale(1.6);
    opacity: 0;
  }
}
@keyframes fly-blue {
  0% {
    transform: translate(0, 0) scale(0.5);
    opacity: 0;
  }
  15% {
    transform: translate(-8vw, -10px) scale(1.4) rotate(10deg);
    opacity: 1;
  }
  70% {
    transform: translate(-56vw, 30vh) scale(2) rotate(-8deg);
    opacity: 1;
  }
  100% {
    transform: translate(-60vw, 36vh) scale(1.6);
    opacity: 0;
  }
}
@keyframes fly-watch {
  0% {
    transform: translate(-50%, 0) scale(0.5);
    opacity: 0;
  }
  20% {
    transform: translate(-50%, 6vh) scale(1.6) rotate(-8deg);
    opacity: 1;
  }
  70% {
    transform: translate(-50%, 34vh) scale(2.2) rotate(8deg);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, 40vh) scale(1.8);
    opacity: 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .emote {
    animation: fade 1.4s ease-out forwards;
  }
  @keyframes fade {
    0% {
      opacity: 0;
      transform: scale(1);
    }
    20% {
      opacity: 1;
      transform: scale(1.8);
    }
    100% {
      opacity: 0;
      transform: scale(1.8);
    }
  }
}
</style>
