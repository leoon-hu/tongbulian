<script setup lang="ts">
import type { Choice } from '@/types/models'
import RubyText from '@/components/ui/RubyText.vue'

defineProps<{
  choices: Choice[]
  /** 作答后揭示：正确项标绿，选错项标红，并禁用点击 */
  revealed?: { correctId: string; selectedId: string } | null
  /** 只看不点（对战里看别人答题）：highlight 是他正点着的那张 */
  readonly?: boolean
  highlight?: string
}>()
const emit = defineEmits<{ select: [id: string] }>()
</script>

<template>
  <div class="cards">
    <button
      v-for="c in choices"
      :key="c.id"
      class="card"
      :class="{
        correct: revealed && c.id === revealed.correctId,
        wrong: revealed && c.id === revealed.selectedId && c.id !== revealed.correctId,
        picked: readonly && c.id === highlight,
      }"
      :disabled="!!revealed || readonly"
      @click="emit('select', c.id)"
    >
      <RubyText :text="c.label" />
    </button>
  </div>
</template>

<style scoped>
.cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
}
.card {
  min-height: 84px;
  padding: 6px 10px;
  border-radius: var(--radius-lg);
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  border: 3px solid transparent;
  font-size: var(--fs-xl);
  font-weight: 800;
  color: var(--c-text);
  transition: transform 0.08s ease;
}
.card:not(:disabled):active {
  transform: scale(0.94);
}
.card.correct {
  border-color: var(--c-green);
  background: #e9faf2;
  color: var(--c-green);
}
.card.wrong {
  border-color: var(--c-red);
  background: #ffefef;
  color: var(--c-red);
}
.card.picked {
  border-color: var(--c-primary);
  background: #fff3e6;
}
</style>
