<script setup lang="ts">
import { computed } from 'vue'
import { isHan } from '@/engine/i18n'

/**
 * 语文的大字（需求 Y3）：每个汉字放进一个田字格（楷体、不注音），其它字符（＋ － ＝）原样放大；
 * 「？」画成一个虚线格——答完题 fill 是正确的字，填进去变绿（加一加 / 减一减）；mark 是标红的那个字（多音字，Y9）。
 */
const props = defineProps<{ text: string; fill?: string; mark?: number }>()

const cells = computed(() =>
  Array.from(props.text).map((ch) => ({ ch, kind: isHan(ch) ? 'han' : ch === '？' || ch === '?' ? 'ask' : /\d/.test(ch) ? 'num' : 'sym' })),
)
</script>

<template>
  <div class="hanzi" :class="{ many: cells.length > 3 }" lang="zh-CN">
    <template v-for="(c, i) in cells" :key="i">
      <span v-if="c.kind === 'han'" class="cell" :class="{ mark: i === mark }">{{ c.ch }}</span>
      <span v-else-if="c.kind === 'ask'" class="cell ask" :class="{ done: !!fill }">{{ fill || '？' }}</span>
      <span v-else-if="c.ch.trim()" class="sym" :class="{ num: c.kind === 'num' }">{{ c.ch }}</span>
    </template>
  </div>
</template>

<style scoped>
.hanzi {
  --grid: #efb3a6;
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 8px 10px;
  font-size: var(--fs-huge);
  line-height: 1;
}
/* 字多的时候（部件算式「飘 － 风 ＝ ？」、词语）小一号，手机上一行放得下 */
.hanzi.many {
  font-size: min(var(--fs-huge), 11vw);
}
/* 田字格：外框 + 横竖两条虚线（背景里画，不占布局） */
.cell {
  display: inline-grid;
  place-items: center;
  width: 1.4em;
  height: 1.4em;
  border: 2px solid var(--grid);
  border-radius: 8px;
  background:
    repeating-linear-gradient(to right, var(--grid) 0 5px, transparent 5px 10px) center / 100% 1px no-repeat,
    repeating-linear-gradient(to bottom, var(--grid) 0 5px, transparent 5px 10px) center / 1px 100% no-repeat,
    var(--c-card);
  font-family: 'Kaiti SC', 'STKaiti', 'KaiTi', 'Kaiti', 'BiauKai', serif;
  font-weight: 400;
  color: var(--c-text);
}
/* 多音字题里要读的那个字（Y9） */
.cell.mark {
  color: var(--c-red);
  border-color: var(--c-red);
}
.cell.ask {
  border-style: dashed;
  border-color: var(--c-primary);
  color: var(--c-locked);
  font-family: var(--font-main);
  font-weight: 800;
}
.cell.ask.done {
  border-style: solid;
  border-color: var(--c-green);
  color: var(--c-green);
  font-family: 'Kaiti SC', 'STKaiti', 'KaiTi', 'Kaiti', 'BiauKai', serif;
  font-weight: 400;
}
.sym {
  font-weight: 800;
  color: var(--c-text-light);
}
/* 看数字选汉字的数字：是题目本身，不是连接符号，用正文的颜色 */
.sym.num {
  color: var(--c-text);
}
</style>
