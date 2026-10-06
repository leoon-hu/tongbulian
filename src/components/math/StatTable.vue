<script setup lang="ts">
import { computed } from 'vue'
import type { LStr } from '@/types/models'
import type { BlankFill } from '@/components/practice/blank'
import { t } from '@/engine/i18n'

/**
 * 统计表（三年级「数据的收集与整理」，也画作息时间表 / 营业时间）：rows 一行一个数组，格子是数、词条或 null——
 * null 是要填的那一格，画成虚线框里的「?」。head 决定哪一栏是表头（淡色底）：col = 第一列（课本横排的表「地点 / 人数」）、
 * row = 第一行（竖排的表）、both、none（一串数据，没有表头）。title 是表题，写在表的上方。
 * 表里的字不注音、不朗读（课本的表也不注音），所以表头用孩子认得的简单词；英文名字在词条里是小写，这里首字母大写。
 * fill：练习页把按的数字填进那一格（blank.ts，同算式里的「?」）；不传（对战）就画「?」。
 */
const props = withDefaults(
  defineProps<{ title?: LStr; rows: (number | LStr | null)[][]; head?: 'row' | 'col' | 'both' | 'none'; fill?: BlankFill | null }>(),
  { title: undefined, head: 'col', fill: null },
)

const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)
/** 列多（7 列以上：一星期的气温、鸡兔同笼按顺序列的表）时格子收窄、字小一号，360 宽的手机竖屏也放得下；列少的表样子不变 */
const tight = computed(() => Math.max(0, ...props.rows.map((r) => r.length)) >= 7)
const text = (cell: number | LStr): string => (typeof cell === 'number' ? String(cell) : cap(t(cell)))
const isHead = (r: number, c: number): boolean =>
  (props.head === 'col' && c === 0) || (props.head === 'row' && r === 0) || (props.head === 'both' && (r === 0 || c === 0))
</script>

<template>
  <figure class="stat-table">
    <figcaption v-if="title">{{ cap(t(title)) }}</figcaption>
    <div class="scroll">
      <table :class="[`head-${head}`, { tight }]">
        <tbody>
          <tr v-for="(row, r) in rows" :key="r">
            <td v-for="(cell, c) in row" :key="c" :class="{ head: isHead(r, c), ask: cell === null, num: typeof cell === 'number' }">
              <span v-if="cell === null" class="q" :class="{ empty: !fill || fill.value === '', done: !!fill?.done }">{{ fill?.value || '?' }}</span>
              <template v-else>{{ text(cell) }}</template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </figure>
</template>

<style scoped>
.stat-table {
  margin: 0;
  max-width: 100%;
  text-align: center;
}
figcaption {
  margin: 0 0 6px;
  font-size: 15px;
  font-weight: 800;
  color: var(--c-text);
  line-height: 1.3;
}
.scroll {
  max-width: 100%;
  overflow-x: auto;
}
table {
  margin: 0 auto;
  border-collapse: collapse;
  background: var(--c-card);
  font-size: 16px;
  line-height: 1.25;
  color: var(--c-text);
}
td {
  min-width: 2.4em;
  padding: 5px 6px;
  border: 1.5px solid #7fbdf0;
  font-weight: 700;
}
td.num {
  font-variant-numeric: tabular-nums;
}
table.tight {
  font-size: 14px;
}
table.tight td {
  min-width: 1.6em;
  padding: 4px 3px;
}
td.head {
  background: #e8f5ee;
}
td.ask {
  background: #fff3e6;
}
.q {
  display: inline-block;
  min-width: 1.4em;
  padding: 0 0.2em;
  border: 2px dashed var(--c-primary);
  border-radius: 8px;
  color: var(--c-primary-dark);
  font-weight: 800;
}
.q.empty {
  color: var(--c-locked);
}
.q.done {
  border-style: solid;
  border-color: var(--c-green);
  color: var(--c-green);
}
</style>
