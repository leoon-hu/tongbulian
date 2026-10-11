<script setup lang="ts">
import { computed } from 'vue'
import { DOT_ABOVE, splitFractions } from '@/engine/fraction'

/**
 * 一段不注音的文字（数字、算式、选项），其中的分数「3/4」画成上下两层：分子在上、分母在下、中间一条分数线。
 * 带分数「2 1/5」（细空格连着，fraction.ts 的 mixed）画成整数紧挨着上下两层的分数；
 * 循环小数里带上点（U+0307）的数字（fraction.ts 的 repeating）在那一位上面画一个圆点。
 * 没有这些就原样输出，和直接写 {{ text }} 一样。
 */
const props = defineProps<{ text: string }>()
type Piece = { text: string } | { n: string; d: string; w?: string; tail?: string } | { dot: string; tail?: string } | { v: string }
/**
 * 分数、带点的数字是 inline-flex / inline-block，浏览器允许在它们后面断行：紧跟着的「，」「。」会被折到下一行行首（H 报的，
 * 三年级起的分数题都有）。把紧跟在后面的收尾标点并进它们的盒子（tail）。
 */
const CLOSING = /^[，。、；：？！）」』”’,.;:?!)\]]+/
function attachTails(list: Piece[]): Piece[] {
  const out: Piece[] = []
  for (const p of list) {
    const prev = out[out.length - 1]
    if ('text' in p && prev && ('n' in prev || 'dot' in prev)) {
      const m = CLOSING.exec(p.text)
      if (m) {
        prev.tail = (prev.tail ?? '') + m[0]
        if (m[0].length < p.text.length) out.push({ text: p.text.slice(m[0].length) })
        continue
      }
    }
    out.push(p)
  }
  return out
}
/**
 * 字母式里的字母照课本用斜体（四年级运算律 a + b = b + a、五年级「用字母表示数」的 6m、S = ah），和乘号 × 分得开：
 * 只在整段是算式时（有数字或运算符号、没有 4 个字母以上的单词——英文句子、拼音不算），1–3 个连写的小写字母、前面不是「数 + 空格」
 * （那是单位：5 m）；大写字母只认公式等号左边的 S、C、V 这种（点 A、线段 AB 照旧正体）
 */
const VAR_RUN = /(?<![A-Za-z])(?<!\d[ \u00a0])(?:[a-z]{1,3}|[A-Z](?=\s*=))(?![A-Za-z])/g
const isFormula = (s: string): boolean => !/[A-Za-z]{4,}/.test(s) && /[\d=+\-−×÷<>≠²³·()]/.test(s)
function letterPieces(text: string): Piece[] {
  const out: Piece[] = []
  let last = 0
  for (const m of text.matchAll(VAR_RUN)) {
    if (m.index > last) out.push({ text: text.slice(last, m.index) })
    out.push({ v: m[0] })
    last = m.index + m[0].length
  }
  if (last < text.length) out.push({ text: text.slice(last) })
  return out
}
const parts = computed<Piece[]>(() => {
  const formula = isFormula(props.text)
  const pieces = splitFractions(props.text)
    .flatMap((p): Piece[] => {
      if (!('text' in p) || !p.text.includes(DOT_ABOVE)) return [p]
      // 循环小数：带点的那一位单独一段
      return p.text.split(/(\d\u0307)/).filter(Boolean).map((t) => (/^\d\u0307$/.test(t) ? { dot: t[0]! } : { text: t }))
    })
    .flatMap((p): Piece[] => (formula && 'text' in p ? letterPieces(p.text) : [p]))
  return attachTails(pieces)
})
</script>

<template>
  <template v-for="(p, i) in parts" :key="i">
    <span v-if="'n' in p" class="glue"
      ><span class="frac-wrap" :aria-label="p.w ? `${p.w} ${p.n}/${p.d}` : `${p.n}/${p.d}`"
        ><span v-if="p.w" class="whole">{{ p.w }}</span><span class="frac"><span class="num">{{ p.n }}</span><span class="den">{{ p.d }}</span></span></span
      >{{ p.tail }}</span
    >
    <span v-else-if="'dot' in p" class="glue"><span class="rep">{{ p.dot }}</span>{{ p.tail }}</span>
    <i v-else-if="'v' in p" class="var">{{ p.v }}</i>
    <template v-else>{{ p.text }}</template>
  </template>
</template>

<style scoped>
.frac-wrap {
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
}
.whole {
  margin-left: 0.12em;
}
.frac {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  margin: 0 0.12em;
  font-size: 0.78em;
  line-height: 1.05;
  font-variant-numeric: tabular-nums;
}
.whole + .frac {
  margin-left: 0.04em;
}
.num {
  padding: 0 0.18em 0.06em;
  border-bottom: 0.09em solid currentColor;
}
.den {
  padding: 0.06em 0.18em 0;
}
/* 字母式里的字母：照课本用斜体（衬线体的斜体和乘号 × 分得开） */
.var {
  font-family: 'Times New Roman', Times, 'Nimbus Roman', serif;
  font-style: italic;
  padding: 0 0.04em;
}
/* 分数、带点的数字和紧跟着的收尾标点粘在一起，标点不单独折到下一行行首 */
.glue {
  white-space: nowrap;
}
/* 循环小数的点：照课本，圆点在这一位数字的正上方 */
.rep {
  position: relative;
  display: inline-block;
}
.rep::after {
  content: '';
  position: absolute;
  left: 50%;
  top: -0.08em;
  width: 0.2em;
  height: 0.2em;
  border-radius: 50%;
  background: currentColor;
  transform: translateX(-50%);
}
</style>
