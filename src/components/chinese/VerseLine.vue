<script setup lang="ts">
import { computed } from 'vue'
import { isHan, lang } from '@/engine/i18n'

/**
 * 课文 / 古诗 / 儿歌里的句子（需求 Y2）：拼音来自题目本身（py，与汉字逐个对齐，挖掉的字也有），
 * 中文界面逐字注音、英文界面不注音；blank 挖掉的几个字画成虚线空格，答完 fill 把正确的词填进去（绿色）。
 * 「\n」换行（古诗一句一行）。
 */
const props = defineProps<{ text: string; py: string; blank?: [number, number]; fill?: string }>()

interface Seg {
  kind: 'han' | 'plain' | 'blank' | 'br'
  text: string
  py?: string
}

const segs = computed<Seg[]>(() => {
  const chars = Array.from(props.text)
  const syllables = props.py.split(/\s+/).filter(Boolean)
  const annotate = lang.value === 'zh'
  const [start, len] = props.blank ?? [-1, 0]
  const out: Seg[] = []
  let si = 0
  const plain = (text: string): void => {
    const last = out[out.length - 1]
    if (last?.kind === 'plain') last.text += text
    else out.push({ kind: 'plain', text })
  }
  chars.forEach((ch, i) => {
    if (i === start) out.push({ kind: 'blank', text: chars.slice(start, start + len).join('') })
    const hidden = i >= start && i < start + len
    if (isHan(ch)) {
      const py = syllables[si++]
      if (hidden) return
      if (annotate && py) out.push({ kind: 'han', text: ch, py })
      else plain(ch)
      return
    }
    if (hidden) return
    if (ch === '\n') out.push({ kind: 'br', text: '' })
    else plain(ch)
  })
  return out
})
</script>

<template>
  <p class="verse" :class="{ annotated: lang === 'zh' }" lang="zh-CN">
    <template v-for="(s, i) in segs" :key="i">
      <ruby v-if="s.kind === 'han'">{{ s.text }}<rt>{{ s.py }}</rt></ruby>
      <span
        v-else-if="s.kind === 'blank'"
        class="blank"
        :class="{ done: fill !== undefined }"
        :style="{ minWidth: `${Math.max(1, Array.from(s.text).length) * 1.15 + 0.4}em` }"
        >{{ fill ?? '' }}</span
      >
      <br v-else-if="s.kind === 'br'" />
      <template v-else>{{ s.text }}</template>
    </template>
  </p>
</template>

<style scoped>
.verse {
  max-width: 560px;
  font-size: var(--fs-lg);
  font-weight: 700;
  text-align: center;
  line-height: 1.6;
  color: var(--c-text);
}
.verse.annotated {
  line-height: 2.1;
}
.blank {
  display: inline-block;
  height: 1.3em;
  margin: 0 0.12em;
  padding: 0 0.15em;
  border: 3px dashed var(--c-primary);
  border-radius: 10px;
  vertical-align: -0.28em;
  line-height: 1.15;
  text-align: center;
  color: var(--c-green);
}
.blank.done {
  border-style: solid;
  border-color: var(--c-green);
  background: #e9faf2;
}
</style>
