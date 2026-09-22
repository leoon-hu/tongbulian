<script setup lang="ts">
import { computed } from 'vue'
import type { Choice } from '@/types/models'
import { t } from '@/engine/i18n'
import RubyText from '@/components/ui/RubyText.vue'
import { onTap } from '@/components/ui/tap'

const props = defineProps<{
  choices: Choice[]
  /** 作答后揭示：正确项标绿，选错项标红，并禁用点击 */
  revealed?: { correctId: string; selectedId: string } | null
  /** 只看不点（对战里看别人答题）：highlight 是他正点着的那张 */
  readonly?: boolean
  highlight?: string
}>()
const emit = defineEmits<{ select: [id: string] }>()

/**
 * 文字选项的长度（纯数字的选项不算，770 这种两列放得下）：
 * wordy = 有 3 个字以上的文字（一样多、长方体、12元…，对战手机紧凑版排成一列，窄卡片里不折行）；
 * long = 有 4 个字以上的（平行四边形、11元5角…，字号小一档）
 */
const textLen = computed(() =>
  Math.max(0, ...props.choices.map((c) => t(c.label)).filter((s) => !/^\d+$/.test(s)).map((s) => Array.from(s).length)),
)
const wordy = computed(() => textLen.value >= 3)
const long = computed(() => textLen.value > 3)
</script>

<template>
  <div class="cards" :class="{ wordy, long }">
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
      @pointerup="onTap($event, () => emit('select', c.id))"
      @click="onTap($event, () => emit('select', c.id))"
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
.cards.long .card {
  font-size: var(--fs-lg);
  padding: 6px 8px;
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
