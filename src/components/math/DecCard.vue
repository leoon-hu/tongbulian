<script setup lang="ts">
import { computed } from 'vue'

/**
 * 小数卡（四下「小数的意义和性质」）：照课本写的一个小数，大字；小数点画成窄窄的一个点（不像数字那样占一整格）。
 * marks = 下面画横线的那几位（按字符下标，从左数，0 起；「画横线的数字表示什么」）。
 * frac = 不写小数、画一个上下两层的分数（分母是 1000、10000 的分数：文字里画不成两层，放在卡上）。
 * 卡上的数不朗读（读法题读出来就是答案），读屏也只读看得见的字。字号随屏宽、随位数缩（对战紧凑版的窄栏里也放得下）。
 */
const props = withDefaults(defineProps<{ n?: string; marks?: number[]; frac?: [number, number] }>(), {
  n: undefined,
  marks: () => [],
  frac: undefined,
})

const chars = computed(() => Array.from(props.n ?? '').map((ch, i) => ({ ch, i, point: ch === '.', mark: props.marks.includes(i) })))
/** 字号封顶：按一行有几个字符算（一位数字约 0.62em，小数点约 0.3em；卡左右留白 28px），最大 46px、最小 18px */
const fit = computed(() => {
  const width = props.frac ? Math.max(String(props.frac[0]).length, String(props.frac[1]).length) * 0.62 : chars.value.reduce((s, c) => s + (c.point ? 0.3 : 0.62), 0)
  return `${Math.max(18, Math.min(46, Math.floor(212 / Math.max(width, 1))))}px`
})
</script>

<template>
  <div class="dec-card" :style="{ '--fit': fit }">
    <span v-if="frac" class="frac" :aria-label="`${frac[0]}/${frac[1]}`">
      <span class="num">{{ frac[0] }}</span>
      <span class="den">{{ frac[1] }}</span>
    </span>
    <span v-else class="dec">
      <span v-for="c in chars" :key="c.i" :class="c.point ? 'pt' : ['d', { mark: c.mark }]">{{ c.ch }}</span>
    </span>
  </div>
</template>

<style scoped>
.dec-card {
  display: flex;
  align-items: center;
  justify-content: center;
  max-width: 100%;
  padding: 10px 16px;
  border-radius: var(--radius-md);
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  color: var(--c-text);
  font-size: min(46px, 9vw, var(--fit, 46px));
  font-weight: 800;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}
.dec {
  display: inline-flex;
  align-items: baseline;
  white-space: nowrap;
}
.d {
  display: inline-block;
  min-width: 0.6em;
  text-align: center;
}
/* 小数点：窄窄的一个点，贴着前后的数字 */
.pt {
  display: inline-block;
  width: 0.3em;
  text-align: center;
}
/* 画横线的数字 */
.d.mark {
  border-bottom: 3px solid var(--c-primary-dark);
  color: var(--c-primary-dark);
}
.frac {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  font-size: 0.86em;
  line-height: 1.1;
}
.frac .num {
  padding: 0 0.2em 0.08em;
  border-bottom: 0.08em solid currentColor;
}
.frac .den {
  padding: 0.08em 0.2em 0;
}
</style>
