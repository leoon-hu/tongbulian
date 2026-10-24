<script setup lang="ts">
import { computed } from 'vue'

/**
 * 英语的单词 / 句子（需求 §11 E2 / E3）：初学者字体（Andika，单层 a / g，和课本的字形一致）。
 * big = 大号单词卡（一个词或字母），line = 一行句子；不传按文字定：没有空格的一个词是 big。
 * blank = 句子里挖掉的词 [起点, 长度]（按字符算），画成空格，答完 fill 把正确的词填进去（绿色）。
 * 长单词（grandmother）在窄屏上小一号，免得顶出边框；句子按词换行、两行尽量一样长。
 */
const props = defineProps<{ text: string; size?: 'big' | 'line'; blank?: [number, number]; fill?: string }>()

const big = computed(() => (props.size ?? (props.text.includes(' ') ? 'line' : 'big')) === 'big')
const longWord = computed(() => big.value && props.text.length > 7)

interface Seg {
  kind: 'plain' | 'blank'
  text: string
}
const segs = computed<Seg[]>(() => {
  if (!props.blank) return [{ kind: 'plain', text: props.text }]
  const chars = Array.from(props.text)
  const [start, len] = props.blank
  const out: Seg[] = [
    { kind: 'plain', text: chars.slice(0, start).join('') },
    { kind: 'blank', text: chars.slice(start, start + len).join('') },
    { kind: 'plain', text: chars.slice(start + len).join('') },
  ]
  return out.filter((s) => s.kind === 'blank' || s.text)
})
</script>

<template>
  <p class="english" :class="{ big, line: !big, 'long-word': longWord }" lang="en">
    <template v-for="(s, i) in segs" :key="i">
      <span
        v-if="s.kind === 'blank'"
        class="blank"
        :class="{ done: fill !== undefined }"
        :style="{ minWidth: `${Math.max(2, s.text.length) * 0.6 + 0.6}em` }"
        >{{ fill ?? '' }}</span
      >
      <template v-else>{{ s.text }}</template>
    </template>
  </p>
</template>

<style scoped>
.english {
  margin: 0;
  padding: 0.1em 0.6em 0.16em;
  border-radius: var(--radius-lg);
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  border: 3px solid var(--c-line);
  font-family: var(--font-pinyin);
  font-weight: 400;
  color: var(--c-primary-dark);
  text-align: center;
}
.english.big {
  min-width: 2.4em;
  font-size: var(--fs-huge);
  line-height: 1.2;
  letter-spacing: 0.02em;
  white-space: nowrap;
}
.english.big.long-word {
  font-size: min(var(--fs-huge), 9vw);
}
.english.line {
  max-width: 100%;
  font-size: var(--fs-xl);
  line-height: 1.5;
  white-space: pre-wrap;
  text-wrap: balance;
  overflow-wrap: anywhere;
}
.blank {
  display: inline-block;
  min-height: 1.1em;
  margin: 0 0.15em;
  border-bottom: 3px dashed var(--c-primary);
  line-height: 1.2;
  vertical-align: baseline;
  text-align: center;
}
.blank.done {
  color: var(--c-green);
  border-bottom-color: var(--c-green);
  border-bottom-style: solid;
}
</style>
