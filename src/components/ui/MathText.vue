<script setup lang="ts">
import { computed } from 'vue'
import { splitFractions } from '@/engine/fraction'

/**
 * 一段不注音的文字（数字、算式、选项），其中的分数「3/4」画成上下两层：分子在上、分母在下、中间一条分数线。
 * 没有分数就原样输出，和直接写 {{ text }} 一样。
 */
const props = defineProps<{ text: string }>()
const parts = computed(() => splitFractions(props.text))
</script>

<template>
  <template v-for="(p, i) in parts" :key="i">
    <span v-if="'n' in p" class="frac" :aria-label="`${p.n}/${p.d}`"><span class="num">{{ p.n }}</span><span class="den">{{ p.d }}</span></span>
    <template v-else>{{ p.text }}</template>
  </template>
</template>

<style scoped>
.frac {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  vertical-align: middle;
  margin: 0 0.12em;
  font-size: 0.78em;
  line-height: 1.05;
  font-variant-numeric: tabular-nums;
}
.num {
  padding: 0 0.18em 0.06em;
  border-bottom: 0.09em solid currentColor;
}
.den {
  padding: 0.06em 0.18em 0;
}
</style>
