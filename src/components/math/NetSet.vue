<script setup lang="ts">
import { computed } from 'vue'
import { t } from '@/engine/i18n'
import NetGrid from '@/components/math/NetGrid.vue'

/**
 * 几个正方体展开图并排（五下 p23 做一做「折叠后，下面哪些图形能围成左侧的正方体」）：每个用 NetGrid 画，下面标 1、2、3……
 * （选项就是这几个数）。几幅共用一个格子大小，加起来不超过 300 像素宽（360 宽的手机竖屏一行放得下三个）；
 * 对战窄栏放不下时折行。读屏只说「正方体的展开图」。
 */
const props = defineProps<{ items: { r: number; c: number }[][] }>()

const cols = (cells: { r: number; c: number }[]): number => Math.max(...cells.map((x) => x.c)) + 1
const size = computed(() => {
  const total = props.items.reduce((a, cells) => a + cols(cells), 0)
  const room = 300 - 20 * props.items.length
  return Math.max(14, Math.min(28, Math.floor(room / total)))
})
const label = computed(() => t({ k: 'm5.cube.ariaNets' }))
</script>

<template>
  <div class="nets" role="img" :aria-label="label">
    <figure v-for="(cells, i) in items" :key="i" class="one">
      <NetGrid :cells="cells" :size="size" />
      <figcaption>{{ i + 1 }}</figcaption>
    </figure>
  </div>
</template>

<style scoped>
.nets {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-end;
  gap: 8px 10px;
  max-width: 100%;
}
.one {
  margin: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  min-width: 0;
  max-width: 100%;
  padding: 6px;
  border-radius: var(--radius-md);
  background: var(--c-bg);
}
.one figcaption {
  min-width: 30px;
  padding: 0 8px;
  border-radius: 999px;
  background: var(--c-primary);
  color: #fff;
  font-weight: 800;
  font-size: var(--fs-md);
  text-align: center;
}
</style>
