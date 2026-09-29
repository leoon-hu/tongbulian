<script setup lang="ts">
import { computed } from 'vue'
import type { LStr } from '@/types/models'
import { lang, t } from '@/engine/i18n'

/**
 * 月历（三年级「年、月、日的秘密」）：照课本的年历画——星期一排在最前，六、日两列红字；title 写在上面（「2024 年 2 月」）。
 * days = 这个月有几天，first = 1 日是星期几（1 = 星期一 … 7 = 星期日），都由出题的一方按真实日历算好；mark 里的日子画一个圈。
 * 表头的星期是图里的字（不注音、不朗读），中文用课本的「一 二 … 日」，英文 Mo–Su。
 */
const props = defineProps<{ title: LStr; days: number; first: number; mark?: number[] }>()

const HEAD: Record<'zh' | 'en', string[]> = {
  zh: ['一', '二', '三', '四', '五', '六', '日'],
  en: ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'],
}
const head = computed(() => HEAD[lang.value])

/** 一格一天：1 日前面按星期空几格，最后补齐一整周 */
const cells = computed(() => {
  const out: (number | null)[] = Array.from({ length: Math.max(0, props.first - 1) }, () => null)
  for (let d = 1; d <= props.days; d++) out.push(d)
  while (out.length % 7) out.push(null)
  return out
})
</script>

<template>
  <figure class="calendar">
    <figcaption>{{ t(title) }}</figcaption>
    <div class="grid">
      <span v-for="(w, i) in head" :key="`h${i}`" class="head" :class="{ weekend: i >= 5 }">{{ w }}</span>
      <span
        v-for="(d, i) in cells"
        :key="i"
        class="day"
        :class="{ weekend: i % 7 >= 5, blank: d === null, marked: d !== null && !!mark?.includes(d) }"
        >{{ d ?? '' }}</span
      >
    </div>
  </figure>
</template>

<style scoped>
.calendar {
  margin: 0;
  width: min(290px, 100%);
  padding: 6px 8px 8px;
  border-radius: var(--radius-md);
  background: #f2f9f4;
  box-shadow: var(--shadow-card);
}
figcaption {
  margin: 0 0 3px;
  text-align: center;
  font-size: 16px;
  font-weight: 800;
  color: var(--c-text);
}
.grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 1px 2px;
}
.head,
.day {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 25px;
  font-size: 15px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #2f7bd6;
}
.head {
  height: 21px;
  font-size: 13px;
  color: var(--c-text-light);
  border-bottom: 1.5px solid var(--c-line);
}
.weekend {
  color: #e0453a;
}
.day.marked {
  border: 2.5px solid var(--c-primary);
  border-radius: 50%;
  background: #fff3e6;
}
</style>
