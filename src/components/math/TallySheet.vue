<script setup lang="ts">
import type { LStr } from '@/types/models'
import { t } from '@/engine/i18n'

/**
 * 记录单（三年级「数据的收集与整理」）：一类一行，行头是图标 + 名字，后面画记号——
 * zheng 画「正」字：5 画一个，按笔顺一笔一笔加（横、竖、右边的短横、左边的短竖、底横），最后一个可以不满 5 画
 * （课本 1–4 画的字形打不出来，只能画）；check 打 √；circle 画 ○。
 * 名字是词条（中英文切换），不注音——同统计表，课本的记录单也不注音，名字用孩子认得的简单词、配图标。
 */
defineProps<{ rows: { label: LStr; icon?: string; count: number; mark: 'zheng' | 'check' | 'circle' }[] }>()

/** 「正」字的 5 笔（24 × 24 的格子）：横、竖、右边的短横、左边的短竖、底横 */
const ZHENG = ['M3 3.5H21', 'M12 3.5V21', 'M12 12H19.5', 'M6 12V21', 'M2 21H22']

/** 英文名字在词条里是小写（句子里要用），行头首字母大写 */
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1)

/** 画「正」字：每个字几画（最后一个可以不满 5 画） */
function groups(count: number): number[] {
  const out: number[] = []
  for (let left = count; left > 0; left -= 5) out.push(Math.min(5, left))
  return out
}
</script>

<template>
  <div class="tally" role="img">
    <div v-for="(row, i) in rows" :key="i" class="row">
      <span class="label"><span v-if="row.icon" class="icon">{{ row.icon }}</span>{{ cap(t(row.label)) }}</span>
      <span class="marks" :class="row.mark">
        <template v-if="row.mark === 'zheng'">
          <svg v-for="(n, k) in groups(row.count)" :key="k" class="zheng" viewBox="0 0 24 24" width="25" height="25" :data-strokes="n">
            <path v-for="s in n" :key="s" :d="ZHENG[s - 1]" />
          </svg>
        </template>
        <template v-else-if="row.mark === 'check'">
          <svg v-for="k in row.count" :key="k" class="check" viewBox="0 0 20 20" width="17" height="20"><path d="M3 11.5L8 16.5L17 4" /></svg>
        </template>
        <template v-else>
          <svg v-for="k in row.count" :key="k" class="circle" viewBox="0 0 20 20" width="17" height="20"><circle cx="10" cy="10.5" r="6.8" /></svg>
        </template>
      </span>
    </div>
  </div>
</template>

<style scoped>
.tally {
  display: flex;
  flex-direction: column;
  width: min(330px, 100%);
  padding: 4px 12px;
  border-radius: var(--radius-md);
  background: #fff8e6;
  box-shadow: var(--shadow-card);
}
.row {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 35px;
  padding: 2px 0;
}
.row + .row {
  border-top: 1.5px dashed var(--c-line);
}
.label {
  flex: 0 0 auto;
  min-width: 5.2em;
  max-width: 7.5em;
  font-size: 17px;
  font-weight: 700;
  color: var(--c-text);
  line-height: 1.25;
}
.icon {
  margin-right: 4px;
}
.marks {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px 6px;
  flex: 1 1 auto;
}
.marks.check,
.marks.circle {
  gap: 2px 3px;
}
svg {
  display: block;
  flex: none;
  fill: none;
  stroke: var(--c-text);
  stroke-linecap: round;
  stroke-linejoin: round;
}
.zheng path {
  stroke-width: 2.4;
}
.check path {
  stroke: var(--c-green);
  stroke-width: 2.6;
}
.circle circle {
  stroke: var(--c-blue);
  stroke-width: 2.2;
}
</style>
