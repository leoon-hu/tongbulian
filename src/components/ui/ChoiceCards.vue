<script setup lang="ts">
import { computed } from 'vue'
import type { Choice, ChoiceStyle } from '@/types/models'
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
  /** 选项的样子（语文）：拼音用初学者字体、考认字的字用不注音的楷体大字、图放大 */
  choiceStyle?: ChoiceStyle
}>()
const emit = defineEmits<{ select: [id: string] }>()

/**
 * 文字选项的长度（纯数字的选项不算，770、分数 3/8、小数 0.5 这种两列放得下）：
 * wordy = 有 3 个字以上的文字（一样多、长方体、12元…，对战手机紧凑版排成一列，窄卡片里不折行）；
 * long = 有 4 个字以上的（平行四边形、11元5角…，字号小一档）；
 * longer = 6 个字以上（九千零三十六这种汉字读法、语文的短句），再小一点、两边留白收窄，手机上两列不在词中间折行
 */
const textLen = computed(() =>
  props.choiceStyle === 'pinyin' || props.choiceStyle === 'emoji'
    ? 0
    : Math.max(0, ...props.choices.map((c) => t(c.label)).filter((s) => !/^\d+(?:[./]\d+)?$/.test(s)).map((s) => Array.from(s.replace(/\s/g, '')).length)),
)
/**
 * 纯数字选项的位数（四年级的大数：写数、计数器、算盘的答案有 10–12 位）：digits = 7 位以上、字号跟着屏宽小一点；
 * digits10 = 10 位以上、再小一点（360 宽的手机上两列 12 位数也放得下）；8 位以上在对战紧凑版排成一列（同 wordy）
 */
const numLen = computed(() => Math.max(0, ...props.choices.map((c) => t(c.label)).filter((s) => /^\d+$/.test(s)).map((s) => s.length)))
const wordy = computed(() => textLen.value >= 3 || numLen.value >= 8)
const long = computed(() => textLen.value > 3)
const longer = computed(() => textLen.value >= 6)
const digits = computed(() => numLen.value >= 7)
const digits10 = computed(() => numLen.value >= 10)
</script>

<template>
  <div class="cards" :class="[{ wordy, long, longer, digits, digits10 }, choiceStyle ? `as-${choiceStyle}` : '']">
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
.cards.longer .card {
  font-size: 20px;
  padding: 6px 4px;
}
.cards.digits .card {
  font-size: clamp(18px, 6.4vw, 28px);
  padding: 6px 4px;
  white-space: nowrap;
}
.cards.digits10 .card {
  font-size: clamp(15px, 5.1vw, 24px);
}
/* 语文（需求 Y3 / Y4）：拼音用初学者字体（单层 a / g）；考认字的字是不注音的楷体大字；图放大 */
.cards.as-pinyin .card {
  font-family: var(--font-pinyin);
  font-weight: 400;
  letter-spacing: 0.02em;
}
.cards.as-hanzi .card {
  font-family: 'Kaiti SC', 'STKaiti', 'KaiTi', 'Kaiti', 'BiauKai', serif;
  font-weight: 400;
  font-size: 44px;
}
.cards.as-hanzi.long .card {
  font-size: var(--fs-xl);
}
.cards.as-emoji .card {
  font-size: 48px;
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
