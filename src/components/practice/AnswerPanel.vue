<script setup lang="ts">
import { computed } from 'vue'
import type { Question } from '@/types/models'
import NumPad from '@/components/ui/NumPad.vue'
import ChoiceCards from '@/components/ui/ChoiceCards.vue'

const props = defineProps<{
  question: Question
  /** 选择题作答后揭示对错用 */
  revealed?: { correctId: string; selectedId: string } | null
  /** 数字键盘不画显示框（外层自己画） */
  hideDisplay?: boolean
}>()
const emit = defineEmits<{ answer: [given: unknown]; input: [value: string] }>()

/** 数字键盘最多输入几位：至少 3 位，答案更长（万以内的数）就放宽到答案的位数 */
const maxLen = computed(() =>
  Math.max(3, props.question.answer.kind === 'number' ? String(props.question.answer.value).length : 0),
)
</script>

<template>
  <div class="panel">
    <NumPad
      v-if="question.input === 'numpad'"
      :max-len="maxLen"
      :hide-display="hideDisplay"
      @confirm="(n) => emit('answer', n)"
      @input="(v) => emit('input', v)"
    />
    <ChoiceCards
      v-else-if="question.input === 'choice'"
      :choices="question.choices ?? []"
      :revealed="revealed"
      @select="(id) => emit('answer', id)"
    />
  </div>
</template>

<style scoped>
.panel {
  width: 100%;
}
</style>
