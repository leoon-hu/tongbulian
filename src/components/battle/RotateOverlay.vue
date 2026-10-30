<script setup lang="ts">
// 「请把手机横过来」（B30）：手机竖着拿、竞技场自己转了的时候整页提醒一下——不挡路：约 4 秒自动消失、点一下也消失、视口真转成横的立刻消失。
// 画在 body 上（Teleport），不跟着竞技场转，手机还竖着的时候字是正的。出现时朗读一次（正在读题就排在后面，B37；消失了还没轮到就不读）。
import { onBeforeUnmount, ref, watch } from 'vue'
import { ROTATE_HINT_MS } from '@/battle/layout'
import { lang } from '@/engine/i18n'
import { phraseSpeech } from '@/engine/speech'
import { forget, say } from '@/engine/voice'
import RubyText from '@/components/ui/RubyText.vue'

const props = defineProps<{ rotated: boolean }>()
const show = ref(false)
let timer: ReturnType<typeof setTimeout> | null = null

function hide(): void {
  if (timer) clearTimeout(timer)
  timer = null
  if (!show.value) return
  show.value = false
  forget('rotate')
}
watch(
  () => props.rotated,
  (r) => {
    if (!r) {
      hide()
      return
    }
    show.value = true
    say(phraseSpeech({ k: 'battle.rotate' }, lang.value), lang.value, 300, { mode: 'wait', key: 'rotate' })
    if (timer) clearTimeout(timer)
    timer = setTimeout(hide, ROTATE_HINT_MS)
  },
  { immediate: true },
)
onBeforeUnmount(hide)
</script>

<template>
  <Teleport to="body">
    <!-- 点一下关掉用 click 而不是 pointerdown：pointerdown 就拿掉的话，同一下的 pointerup / click 会落到底下竞技场的按键上 -->
    <div v-if="show" class="rotate" role="alert" @click="hide">
      <span class="icon" aria-hidden="true">📱</span>
      <p><RubyText :text="{ k: 'battle.rotate' }" /></p>
    </div>
  </Teleport>
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
