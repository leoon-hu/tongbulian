<script setup lang="ts">
import { computed } from 'vue'

/**
 * 用小正方形拼成的矩形（图形拼组）：rows × cols 个带边框的小方块，
 * 之间留缝隙以便看清是「拼」出来的，用于数格子 / 认拼成的图形。
 */
const props = defineProps<{ rows: number; cols: number }>()

const cells = computed(() => props.rows * props.cols)
</script>

<template>
  <div
    class="tiles"
    :style="{ gridTemplateColumns: `repeat(${cols}, 46px)`, gridTemplateRows: `repeat(${rows}, 46px)` }"
  >
    <span v-for="i in cells" :key="i" class="tile" />
  </div>
</template>

<style scoped>
.tiles {
  display: grid;
  gap: 4px;
  background: var(--c-bg);
  border-radius: var(--radius-md);
  padding: 14px;
  justify-content: center;
}
.tile {
  border: 3px solid var(--c-primary-dark);
  border-radius: 6px;
  background: linear-gradient(145deg, #ffe1bd, #ffc98a);
}
</style>
