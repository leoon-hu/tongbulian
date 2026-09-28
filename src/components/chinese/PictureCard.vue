<script setup lang="ts">
/** 语文的一张图（看图选字 / 看图选音节）：一个大 emoji 放在圆角卡片上 */
defineProps<{ icon: string }>()
</script>

<template>
  <div class="picture" aria-hidden="true">{{ icon }}</div>
</template>

<style scoped>
.picture {
  display: grid;
  place-items: center;
  width: 120px;
  height: 120px;
  border-radius: var(--radius-lg);
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  border: 3px solid var(--c-line);
  font-size: 76px;
  line-height: 1;
}
</style>
