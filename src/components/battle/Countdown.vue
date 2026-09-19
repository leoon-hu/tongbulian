<script setup lang="ts">
// 开局倒数（B6）：「预备…」→ 3、2、1（朗读数字 + 嘀）→「开始！」（朗读 + 嘟）→ done。总时长 = match.ts 的 COUNTDOWN_MS
import { onBeforeUnmount, ref } from 'vue'
import { lang } from '@/engine/i18n'
import { phraseSpeech } from '@/engine/speech'
import { say } from '@/engine/voice'
import { playSfx } from '@/battle/sfx'
import RubyText from '@/components/ui/RubyText.vue'

const emit = defineEmits<{ done: [] }>()
/** 4 = 「预备…」，3 / 2 / 1，0 = 「开始！」 */
const n = ref(4)
const timers: ReturnType<typeof setTimeout>[] = []

function step(): void {
  if (n.value === 4) {
    say(phraseSpeech({ k: 'battle.getReady' }, lang.value), lang.value)
    timers.push(
      setTimeout(() => {
        n.value = 3
        step()
      }, 800),
    )
  } else if (n.value > 0) {
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
    <span v-if="n === 4" class="ready"><RubyText :text="{ k: 'battle.getReady' }" /></span>
    <span v-else-if="n > 0" :key="n" class="num">{{ n }}</span>
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
.go,
.ready {
  font-weight: 900;
  color: var(--c-primary-dark);
  line-height: 1;
}
.num {
  font-size: 140px;
  animation: zoom 0.9s ease-out;
}
.go {
  font-size: 80px;
  animation: zoom 0.6s ease-out;
}
.ready {
  font-size: 56px;
  animation: breathe 0.8s ease-in-out infinite alternate;
}
@keyframes zoom {
  from {
    transform: scale(1.8);
    opacity: 0;
  }
  30% {
    transform: scale(1);
    opacity: 1;
  }
}
@keyframes breathe {
  from {
    transform: scale(0.95);
  }
  to {
    transform: scale(1.05);
  }
}
</style>
