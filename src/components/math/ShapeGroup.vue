<script setup lang="ts">
import type { ShapeKind } from '@/types/models'
import ShapeGlyph from './ShapeGlyph.vue'

/** 一堆图形，用于「分类」「数一数有几个某图形」；tones / turns / forms 与 shapes 一一对应（颜色、角度、三角形的样子，见 ShapeGlyph）。 */
withDefaults(defineProps<{ shapes: ShapeKind[]; size?: number; tones?: number[]; turns?: number[]; forms?: number[] }>(), { size: 52 })
</script>

<template>
  <div class="group">
    <div v-for="(s, i) in shapes" :key="i" class="item">
      <ShapeGlyph :shape="s" :size="size" :tone="tones?.[i]" :turn="turns?.[i]" :form="forms?.[i]" />
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
