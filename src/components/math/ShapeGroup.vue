<script setup lang="ts">
import type { ShapeKind } from '@/types/models'
import ShapeGlyph from './ShapeGlyph.vue'

/** 一堆图形，用于「分类」「数一数有几个某图形」。 */
withDefaults(defineProps<{ shapes: ShapeKind[]; size?: number }>(), { size: 52 })
</script>

<template>
  <div class="group">
    <div v-for="(s, i) in shapes" :key="i" class="item">
      <ShapeGlyph :shape="s" :size="size" />
    </div>
  </div>
</template>

<style scoped>
.group {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 18px;
  justify-content: center;
  align-items: center;
  max-width: 440px;
  padding: 10px;
  background: var(--c-bg);
  border-radius: var(--radius-md);
}
.item {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
