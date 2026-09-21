<script setup lang="ts">
// 手机竖着拿时盖一层「请把手机横过来」（B30）：横过来自动消失；出现时朗读一次（正在读题就排在后面，B37；横过来了还没轮到就不读）
import { onBeforeUnmount, ref, watch } from 'vue'
import { lang } from '@/engine/i18n'
import { phraseSpeech } from '@/engine/speech'
import { forget, say } from '@/engine/voice'
import RubyText from '@/components/ui/RubyText.vue'

const QUERY = '(orientation: portrait) and (max-width: 640px)'
const mq = typeof matchMedia === 'function' ? matchMedia(QUERY) : null
const show = ref(mq?.matches ?? false)
const onChange = (e: MediaQueryListEvent): void => {
  show.value = e.matches
}
mq?.addEventListener?.('change', onChange)
onBeforeUnmount(() => mq?.removeEventListener?.('change', onChange))
watch(
  show,
  (v) => {
    if (v) say(phraseSpeech({ k: 'battle.rotate' }, lang.value), lang.value, 300, { mode: 'wait', key: 'rotate' })
    else forget('rotate')
  },
  { immediate: true },
)
</script>

<template>
  <div v-if="show" class="rotate" role="alert">
    <span class="icon" aria-hidden="true">📱</span>
    <p><RubyText :text="{ k: 'battle.rotate' }" /></p>
  </div>
</template>

<style scoped>
.rotate {
  position: fixed;
  inset: 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: var(--c-bg);
  font-size: var(--fs-lg);
  font-weight: 700;
  text-align: center;
  padding: 24px;
}
.icon {
  font-size: 96px;
  line-height: 1;
  animation: turn 1.6s ease-in-out infinite alternate;
}
@keyframes turn {
  from {
    transform: rotate(0);
  }
  to {
    transform: rotate(-90deg);
  }
}
</style>
