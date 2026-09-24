<script lang="ts">
/** 规则那句至少停这么久（静音时也让人看一眼） */
export const RULE_MIN_MS = 1800
/** 最多停这么久（音频出问题也不卡住倒数） */
export const RULE_MAX_MS = 9000
</script>

<script setup lang="ts">
// 开局倒数（B6）：新开一局先讲一句规则（rule 词条，朗读 + 显示，说完再倒数）→「预备…」→ 3、2、1（朗读数字 + 嘀）→
// 「开始！」（朗读 + 这个游戏开始的一声，B73：发令枪、汽笛、点火…；不知道是哪个游戏就是通用的「嘟」）→ done。
// 再来一局不讲（rule 传 null）。
import { onBeforeUnmount, ref } from 'vue'
import { lang } from '@/engine/i18n'
import { phraseSpeech } from '@/engine/speech'
import { say } from '@/engine/voice'
import { playSfx, skinSfx } from '@/battle/sfx'
import { skinById } from '@/battle/skins'
import RubyText from '@/components/ui/RubyText.vue'

const props = defineProps<{ rule?: string | null; skin?: string | null }>()
const emit = defineEmits<{ done: [] }>()

/** 5 = 讲规则，4 = 「预备…」，3 / 2 / 1，0 = 「开始！」 */
const n = ref(props.rule ? 5 : 4)
const timers: ReturnType<typeof setTimeout>[] = []
let alive = true

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    timers.push(setTimeout(resolve, ms))
  })
}

function step(): void {
  if (!alive) return
  if (n.value === 5) {
    const spoken = say(phraseSpeech({ k: props.rule! }, lang.value), lang.value).catch(() => {})
    Promise.race([Promise.all([spoken, wait(RULE_MIN_MS)]), wait(RULE_MAX_MS)]).then(() => {
      if (!alive) return
      n.value = 4
      step()
    })
  } else if (n.value === 4) {
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
    const skin = props.skin ? skinById(props.skin) : undefined
    for (const x of skin ? skinSfx(skin.id, skin.kind).go : ['go' as const]) playSfx(x)
    timers.push(setTimeout(() => emit('done'), 600))
  }
}
step()
onBeforeUnmount(() => {
  alive = false
  timers.forEach(clearTimeout)
})
</script>

<template>
  <div class="countdown" role="status">
    <p v-if="n === 5 && rule" class="rule"><RubyText :text="{ k: rule }" /></p>
    <span v-else-if="n === 4" class="ready"><RubyText :text="{ k: 'battle.getReady' }" /></span>
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
  padding: 0 24px;
  background: rgba(253, 246, 236, 0.75);
  z-index: 20;
  /* 倒数层上没有按钮：不挡游戏盒子的点按（B59），倒数时也能逗一逗角色 */
  pointer-events: none;
}
.num,
.go,
.ready {
  font-weight: 900;
  color: var(--c-primary-dark);
  line-height: 1;
}
.rule {
  max-width: 720px;
  padding: 18px 28px;
  border-radius: var(--radius-lg);
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  font-size: var(--fs-xl);
  font-weight: 800;
  line-height: 1.6;
  text-align: center;
  color: var(--c-text);
  animation: zoom 0.5s ease-out;
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
    transform: scale(1.6);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
@keyframes breathe {
  from {
    transform: scale(1);
  }
  to {
    transform: scale(1.08);
  }
}
</style>
