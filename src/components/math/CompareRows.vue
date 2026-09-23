<script setup lang="ts">
import { computed } from 'vue'

/**
 * 逐行摆放实物，用于「比多少」。
 * 关键：两行按「一一对应」的列对齐——同一列上下相对，谁多出来一眼可见，
 * 不受不同 emoji 宽度影响（避免「4 辆车比 5 个苹果看起来还长」的误判）。
 * 列多时格子按屏宽缩小（最大 40px）；还放不下就靠左、可横向滚动——别用 justify-content: center，
 * 溢出时会两头各裁一半、左边滚不到（需求 G6：手机上 12 个时第一行 4 个只露出 2 个半）。
 */
const props = defineProps<{ rows: { icon: string; count: number }[] }>()

const cols = computed(() => Math.max(1, ...props.rows.map((r) => r.count)))
</script>

<template>
  <div class="compare" :style="{ '--cols-max': cols }">
    <div
      v-for="(row, r) in rows"
      :key="r"
      class="row"
      :style="{ '--cols': cols }"
    >
      <span v-for="i in cols" :key="i" class="cell">
        <span v-if="i <= row.count" class="obj">{{ row.icon }}</span>
      </span>
    </div>
  </div>
</template>

<style scoped>
.compare {
  /* 100vw − 页面两边 16px − 这里两边 16px */
  --cell: min(40px, calc((100vw - 64px) / var(--cols-max, 1)));
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
  grid-template-columns: repeat(var(--cols), var(--cell));
  /* 横向居中；放不下时 auto 外边距归零、从左边开始 */
  margin-inline: auto;
}
.cell {
  width: var(--cell);
  height: calc(var(--cell) * 1.1);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: calc(var(--cell) * 0.85);
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
