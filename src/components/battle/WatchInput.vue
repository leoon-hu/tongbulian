<script setup lang="ts">
// 看别人答题（B28）：不画键盘，只画他正在按的内容——数字题是显示框里一个个出现的数字，选择题是被点亮的那张卡。
// mood：机器人的表情（🤔 想题 / 🤖 在按 / 😄 答对 / 😅 答错，B11），真人没有
import type { Question } from '@/types/models'
import ChoiceCards from '@/components/ui/ChoiceCards.vue'
import RubyText from '@/components/ui/RubyText.vue'

defineProps<{ question: Question; input: string; mood?: string }>()
</script>

<template>
  <div class="watch">
    <span v-if="mood" :key="mood" class="mood" aria-hidden="true">{{ mood }}</span>
    <template v-if="question.input === 'numpad'">
      <div class="display" :class="{ empty: !input }">{{ input || '?' }}</div>
      <p v-if="!input" class="thinking"><RubyText :text="{ k: 'battle.thinking' }" /></p>
    </template>
    <template v-else>
      <ChoiceCards :choices="question.choices ?? []" readonly :highlight="input" />
      <p v-if="!input" class="thinking"><RubyText :text="{ k: 'battle.thinking' }" /></p>
    </template>
  </div>
</template>

<style scoped>
.watch {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  width: 100%;
}
.mood {
  font-size: 44px;
  line-height: 1;
  animation: pop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), sway 1.6s ease-in-out 0.35s infinite alternate;
}
.display {
  min-width: 120px;
  padding: 4px 24px;
  border-radius: var(--radius-md);
  background: var(--c-card);
  border: 3px dashed var(--c-line);
  font-size: var(--fs-huge);
  font-weight: 800;
  text-align: center;
  color: var(--c-text);
}
.display.empty {
  color: var(--c-locked);
}
.thinking {
  font-size: var(--fs-sm);
  color: var(--c-text-light);
  animation: blink 1.2s ease-in-out infinite alternate;
}
@keyframes blink {
  from {
    opacity: 0.4;
  }
  to {
    opacity: 1;
  }
}
@keyframes pop {
  from {
    transform: scale(0.4);
  }
  to {
    transform: scale(1);
  }
}
@keyframes sway {
  from {
    transform: rotate(-8deg);
  }
  to {
    transform: rotate(8deg);
  }
}
</style>
