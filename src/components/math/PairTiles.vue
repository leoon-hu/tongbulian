<script setup lang="ts">
import TileGrid from './TileGrid.vue'

/**
 * 用小方块摆奇数、偶数（五下「和的奇偶性」例 2「还可以用小方块摆一摆」，照课本第 15 页）：每堆 n 个小方块两个一列竖着排成两排，
 * 单出来的一个（黄色）放在右下角——偶数正好两两成对，奇数多出一个。groups 是一堆或几堆，堆与堆之间写「+」（奇数 + 偶数 摆在一起看）。
 * 图里只有方块和「+」，不朗读。
 */
defineProps<{ groups: number[] }>()
</script>

<template>
  <div class="pair-tiles" role="img" :aria-label="groups.join(' + ')">
    <template v-for="(n, i) in groups" :key="i">
      <span v-if="i > 0" class="plus">+</span>
      <TileGrid :rows="2" :cols="Math.floor(n / 2)" :size="18" :odd="n % 2 === 1" :data-n="n" />
    </template>
  </div>
</template>

<style scoped>
.pair-tiles {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 6px;
  max-width: 100%;
}
.plus {
  font-size: 26px;
  font-weight: 800;
  color: var(--c-text);
}
</style>
