<script setup lang="ts">
// 开局倒数（B6）：3、2、1（朗读数字 + 嘀）→「开始！」（朗读 + 嘟）→ done
import { onBeforeUnmount, ref } from 'vue'
import { lang } from '@/engine/i18n'
import { phraseSpeech } from '@/engine/speech'
import { say } from '@/engine/voice'
import { playSfx } from '@/battle/sfx'
import RubyText from '@/components/ui/RubyText.vue'

const emit = defineEmits<{ done: [] }>()
/** 3 / 2 / 1，0 = 「开始！」 */
const n = ref(3)
const timers: ReturnType<typeof setTimeout>[] = []

function step(): void {
  if (n.value > 0) {
    say([String(n.value)], lang.value)
    playSfx('tick')
    timers.push(
      setTimeout(() => {
        n.value -= 1
        step()
      }, 1000),
    )
  } else {
    say(phraseSpeech({ k: 'battle.go' }, lang.value), lang.value)
    playSfx('go')
    timers.push(setTimeout(() => emit('done'), 600))
  }
}
step()
onBeforeUnmount(() => timers.forEach(clearTimeout))
</script>

<template>
  <div class="countdown" role="status">
    <span v-if="n > 0" :key="n" class="num">{{ n }}</span>
    <span v-else class="go"><RubyText :text="{ k: 'battle.go' }" /></span>
  </div>
</template>

<style scoped>
.countdown {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(253, 246, 236, 0.75);
  z-index: 20;
}
.num,
.go {
  font-size: 120px;
  font-weight: 900;
  color: var(--c-primary-dark);
  line-height: 1;
  animation: zoom 0.9s ease-out;
}
.go {
  font-size: 72px;
}
@keyframes zoom {
  from {
    transform: scale(1.6);
    opacity: 0;
  }
  30% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
