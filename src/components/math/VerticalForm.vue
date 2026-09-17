<script setup lang="ts">
import { computed } from 'vue'

/**
 * 竖式（笔算加减法）：两个数按数位右对齐，运算符写在第二行左侧，下面一条横线，结果留给孩子在脑子里 / 纸上算。
 * 每一位一格，个位对齐个位——这正是笔算要教的「相同数位对齐」。
 */
const props = defineProps<{ a: number; op: '+' | '-'; b: number }>()

// 位数：加法要给和留出进位后多出来的一位；减法差不会比被减数长
const width = computed(() =>
  Math.max(String(props.a).length, String(props.b).length, props.op === '+' ? String(props.a + props.b).length : 0),
)
const digits = (n: number): string[] => String(n).padStart(width.value, ' ').split('')
const rowA = computed(() => digits(props.a))
const rowB = computed(() => digits(props.b))
</script>

<template>
  <div class="vertical" :style="{ '--cols': width }">
    <div class="row">
      <span class="op" />
      <span v-for="(d, i) in rowA" :key="`a${i}`" class="digit">{{ d }}</span>
    </div>
    <div class="row">
      <span class="op">{{ op === '+' ? '+' : '−' }}</span>
      <span v-for="(d, i) in rowB" :key="`b${i}`" class="digit">{{ d }}</span>
    </div>
    <div class="rule" />
    <div class="row answer">
      <span class="op" />
      <span v-for="i in width" :key="`c${i}`" class="digit blank" />
    </div>
  </div>
</template>

<style scoped>
.vertical {
  display: inline-flex;
  flex-direction: column;
  align-items: stretch;
  padding: 10px 18px 12px;
  background: var(--c-bg);
  border-radius: var(--radius-md);
  font-size: var(--fs-huge);
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: var(--c-text);
}
.row {
  display: grid;
  grid-template-columns: 1.1em repeat(var(--cols), 1.1em);
  line-height: 1.35;
}
.op {
  color: var(--c-primary-dark);
  text-align: left;
}
.digit {
  text-align: center;
  white-space: pre;
}
.rule {
  height: 4px;
  border-radius: 2px;
  background: var(--c-text);
  margin: 4px 0 2px;
}
.digit.blank {
  height: 1.35em;
  border-bottom: 3px dashed var(--c-locked);
  margin: 0 3px;
}
</style>
