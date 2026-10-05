<script setup lang="ts">
/** 语文的拼音卡（需求 Y4）：音节、声母、韵母、拼读式「b + ā」，初学者字体（单层 a / g）大号显示 */
import { computed } from 'vue'

const props = defineProps<{ text: string }>()
/** 词语的拼音（几个音节、没有「+」）放不下时按音节换行；拼读式「g + u + ā」不拆开 */
const words = computed(() => !props.text.includes('+'))
/** 长的拼音在窄屏上小一号：词语（三四个音节，或两个长音节）不然 56px 下手机竖屏一个音节一行；长的拼读式「ch + u + án」在 360 宽的手机上顶出边框 */
const longPy = computed(() => props.text.length > (words.value ? 8 : 10))
</script>

<template>
  <div class="pinyin" :class="{ words, 'long-py': longPy }" lang="zh-Latn-pinyin">{{ text }}</div>
</template>

<style scoped>
.pinyin {
  min-width: 2.4em;
  padding: 0.08em 0.5em 0.14em;
  border-radius: var(--radius-lg);
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  border: 3px solid var(--c-line);
  font-family: var(--font-pinyin);
  font-size: var(--fs-huge);
  font-weight: 400;
  line-height: 1.2;
  letter-spacing: 0.04em;
  white-space: pre;
  text-align: center;
  color: var(--c-primary-dark);
}
/* 词语的拼音放不下时在音节之间换行、两行尽量一样长：四个音节的词（chūn guāng míng mèi）这个字号下约 650px 宽，
   原来整行不换，手机竖屏的练习页两头被裁掉、对战里把整道题缩到最小还露出一截。长的在窄屏上再小一号（390 宽约 43px），
   四个音节两行放得下；宽屏、单个音节照旧 56px */
.pinyin.words {
  white-space: pre-wrap;
  text-wrap: balance;
}
.pinyin.long-py {
  font-size: min(var(--fs-huge), 11vw);
}
</style>
