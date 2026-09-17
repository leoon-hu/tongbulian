<script setup lang="ts">
import type { SeqCell } from '@/types/models'

/** 找规律序列：具体项按序排开，空位显示「?」。 */
defineProps<{ cells: SeqCell[] }>()
</script>

<template>
  <div class="seq">
    <span
      v-for="(cell, i) in cells"
      :key="i"
      class="cell"
      :class="{ blank: cell.kind === 'blank' }"
      :style="cell.kind === 'item' && cell.color ? { color: cell.color } : undefined"
    >
      {{ cell.kind === 'blank' ? '?' : cell.label }}
    </span>
  </div>
</template>

<style scoped>
.seq {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: center;
  align-items: center;
}
.cell {
  min-width: 56px;
  height: 60px;
  padding: 0 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40px;
  font-weight: 800;
  line-height: 1;
  background: var(--c-card);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-card);
}
.cell.blank {
  color: var(--c-primary);
  border: 3px dashed var(--c-primary);
  background: #fff8f1;
}
</style>
