<script setup lang="ts">
/** 语文的拼音卡（需求 Y4）：音节、声母、韵母、拼读式「b + ā」，初学者字体（单层 a / g）大号显示 */
defineProps<{ text: string }>()
</script>

<template>
  <div class="pinyin" lang="zh-Latn-pinyin">{{ text }}</div>
</template>

<style scoped>
.pinyin {
  min-width: 2.4em;
  padding: 0.08em 0.5em 0.14em;
  border-radius: var(--radius-lg);
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  border: 3px solid var(--c-line);
  font-family: var(--font-pinyin);
  font-size: var(--fs-huge);
  font-weight: 400;
  line-height: 1.2;
  letter-spacing: 0.04em;
  white-space: pre;
  text-align: center;
  color: var(--c-primary-dark);
}
</style>
