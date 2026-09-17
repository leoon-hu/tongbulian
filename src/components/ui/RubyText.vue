<script setup lang="ts">
import { computed } from 'vue'
import type { LStr } from '@/types/models'
import { lang, rubySegments } from '@/engine/i18n'

/**
 * 带拼音的文字：中文模式下每个汉字上方注音（<ruby>），数字 / emoji / 标点原样；英文模式就是纯文本。
 * 读取 lang.value，切换语言即时重排。
 */
const props = defineProps<{ text: LStr }>()

const segs = computed(() => rubySegments(props.text, lang.value))
</script>

<template>
  <span class="ruby-text" :class="{ annotated: segs.some((s) => s.py) }">
    <template v-for="(s, i) in segs" :key="i">
      <ruby v-if="s.py">{{ s.text }}<rt>{{ s.py }}</rt></ruby>
      <template v-else>{{ s.text }}</template>
    </template>
  </span>
</template>

<style scoped>
.ruby-text.annotated {
  line-height: 2;
}
</style>
