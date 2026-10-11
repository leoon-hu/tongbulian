<script setup lang="ts">
import { computed } from 'vue'

/**
 * 用小正方形拼成的矩形（图形拼组）：rows × cols 个带边框的小方块，
 * 之间留缝隙以便看清是「拼」出来的，用于数格子 / 认拼成的图形。
 * 五下「和的奇偶性」加的（都可选，不填和原来一样）：size = 小方块的边长（像素，默认 46；小于 40 时边框、缝隙也细一点），
 * odd = 右下角再多一个黄色的小方块（课本摆奇数：两个两个一列竖着排，单出来的一个放在右下角）。
 */
const props = withDefaults(defineProps<{ rows: number; cols: number; size?: number; odd?: boolean }>(), { size: 46, odd: false })

const tiles = computed(() => {
  const out: { r: number; c: number; odd: boolean }[] = []
  for (let r = 1; r <= props.rows; r++) for (let c = 1; c <= props.cols; c++) out.push({ r, c, odd: false })
  if (props.odd) out.push({ r: Math.max(1, props.rows), c: props.cols + 1, odd: true })
  return out
})
const colCount = computed(() => Math.max(1, props.cols + (props.odd ? 1 : 0)))
const rowCount = computed(() => Math.max(1, props.rows))
</script>

<template>
  <div
    class="tiles"
    :class="{ small: size < 40 }"
    :style="{ gridTemplateColumns: `repeat(${colCount}, ${size}px)`, gridTemplateRows: `repeat(${rowCount}, ${size}px)` }"
  >
    <span v-for="(t, i) in tiles" :key="i" class="tile" :class="{ odd: t.odd }" :style="{ gridRow: t.r, gridColumn: t.c }" />
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
.tiles.small {
  gap: 3px;
  padding: 8px;
}
.small .tile {
  border-width: 2px;
  border-radius: 4px;
}
.tile.odd {
  border-color: #c9962a;
  background: linear-gradient(145deg, #fff3b0, #ffd84d);
}
</style>
