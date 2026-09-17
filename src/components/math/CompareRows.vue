<script setup lang="ts">
import { computed } from 'vue'

/**
 * 逐行摆放实物，用于「比多少」。
 * 关键：两行按「一一对应」的列对齐——同一列上下相对，谁多出来一眼可见，
 * 不受不同 emoji 宽度影响（避免「4 辆车比 5 个苹果看起来还长」的误判）。
 */
const props = defineProps<{ rows: { icon: string; count: number }[] }>()

const cols = computed(() => Math.max(1, ...props.rows.map((r) => r.count)))
</script>

<template>
  <div class="compare">
    <div
      v-for="(row, r) in rows"
      :key="r"
      class="row"
      :style="{ gridTemplateColumns: `repeat(${cols}, 40px)` }"
    >
      <span v-for="i in cols" :key="i" class="cell">
        <span v-if="i <= row.count" class="obj">{{ row.icon }}</span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.compare {
  display: flex;
  flex-direction: column;
  gap: 10px;
  background: var(--c-bg);
  border-radius: var(--radius-md);
  padding: 14px 16px;
  overflow-x: auto;
}
.row {
  display: grid;
  justify-content: center;
}
.cell {
  width: 40px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 34px;
  line-height: 1;
}
.obj {
  animation: pop-in 0.2s ease both;
}
@keyframes pop-in {
  from {
    transform: scale(0.4);
    opacity: 0;
  }
}
</style>
