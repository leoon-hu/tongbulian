<script setup lang="ts">
import { computed } from 'vue'
import type { LStr } from '@/types/models'
import type { BlankFill } from '@/components/practice/blank'
import RubyText from '@/components/ui/RubyText.vue'

/**
 * 大数卡（四上「万以上数的认识」）：照课本连写的数（不加逗号、不空格），大字。split = 级与级之间画红色竖虚线（课本 25┊0000 的分级线），
 * marks = 下面画横线的那几位（从左数，0 起；「画横线的数字表示什么」）；数里的「□」画成一个空方框（要填数字的那一位）。
 * words = 不写数、写课本的读法（写作题：二十三万零一百八十四，注音）。
 * rel / rhs / unit：右边接着写「= ?万」「≈ 9亿」「○ 27万」「< □103270000」——rhs 是「?」画成虚线框，练习页把按的数填进去（fill，同算式的「?」）；
 * unit 是「万」「亿」（注音）；rel 是「?」时中间画一个空方框（要选的是 = 还是 ≈）。
 * 卡上的数不朗读（读出来就把答案说了），读屏也只读看得见的字。宽度不够时数、符号、右边的数各自成段换行，字号随屏宽缩。
 */
const props = withDefaults(
  defineProps<{
    n?: string
    split?: boolean
    marks?: number[]
    words?: LStr
    rel?: '=' | '≈' | '○' | '>' | '<' | '?'
    rhs?: string
    unit?: 'wan' | 'yi'
    fill?: BlankFill | null
  }>(),
  { n: undefined, split: false, marks: () => [], words: undefined, rel: undefined, rhs: undefined, unit: undefined, fill: null },
)

interface Digit {
  ch: string
  i: number
}
/** 从右往左每四位一级（个级、万级、亿级），每级里的数字带着它在整个数里的下标（从左数） */
function levels(s: string): Digit[][] {
  const chars = Array.from(s)
  const out: Digit[][] = []
  for (let end = chars.length; end > 0; end -= 4) {
    const start = Math.max(0, end - 4)
    out.unshift(chars.slice(start, end).map((ch, k) => ({ ch, i: start + k })))
  }
  return out
}
const left = computed(() => (props.n ? (props.split ? levels(props.n) : [Array.from(props.n).map((ch, i) => ({ ch, i }))]) : []))
const right = computed(() => (props.rhs && props.rhs !== '?' ? Array.from(props.rhs) : []))
const unitKey = computed<LStr | null>(() => (props.unit ? { k: `m4.num.u.${props.unit}` } : null))
const marked = (i: number): boolean => props.marks.includes(i)
/**
 * 字号封顶（按最宽的一行有几个字符）：对战紧凑版的题干栏很窄（小手机横屏约 120px），题干最多缩到 0.5，
 * 卡要在约 240px 里放得下——12 位数比大小时 42px 的字两头被裁掉（2026-10-05 排版普查）。一位数字约 0.62em，卡的左右留白 28px
 */
const fit = computed(() => {
  const n = props.n ? Array.from(props.n).length + (props.split ? Math.ceil(Array.from(props.n).length / 4) * 0.3 : 0) : 0
  const r = props.rel ? 2 + (props.rhs === '?' ? 2 : Array.from(props.rhs ?? '').length) + (props.unit ? 1 : 0) : 0
  const cells = Math.max(n, r, 1)
  return `${Math.max(16, Math.floor(212 / (0.62 * cells)))}px`
})
</script>

<template>
  <div class="big-num" :class="{ 'has-words': !!words }" :style="{ '--fit': fit }">
    <span v-if="words" class="words"><RubyText :text="words" /></span>
    <span v-else class="num" :class="{ split }">
      <span v-for="(lv, k) in left" :key="k" class="lv">
        <template v-for="d in lv" :key="d.i">
          <span v-if="d.ch === '□'" class="box" aria-label="□" />
          <span v-else class="d" :class="{ mark: marked(d.i) }">{{ d.ch }}</span>
        </template>
      </span>
    </span>
    <!-- 符号和右边的数连在一起：放不下一行时整段换到下一行（「○ 5070006305」），不把符号落在行尾 -->
    <span v-if="rel" class="right">
      <span v-if="rel === '?'" class="rel-box" aria-label="?" />
      <span v-else class="rel" :class="{ circle: rel === '○' }">{{ rel }}</span>
      <span class="rhs">
        <span v-if="rhs === '?'" class="slot" :class="{ empty: !fill || fill.value === '', done: !!fill?.done }">{{ fill?.value || '?' }}</span>
        <template v-for="(ch, k) in right" :key="k">
          <span v-if="ch === '□'" class="box" aria-label="□" />
          <span v-else class="d">{{ ch }}</span>
        </template>
        <span v-if="unitKey" class="unit"><RubyText :text="unitKey" /></span>
      </span>
    </span>
  </div>
</template>

<style scoped>
.big-num {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 2px 10px;
  max-width: 100%;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  background: var(--c-card);
  box-shadow: var(--shadow-card);
  color: var(--c-text);
  font-size: min(42px, 8.6vw, var(--fit, 42px));
  font-weight: 800;
  line-height: 1.25;
  font-variant-numeric: tabular-nums;
}
.num,
.rhs,
.right {
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
}
.right {
  gap: 10px;
}
.lv {
  display: inline-flex;
  align-items: center;
}
/* 课本的分级线：级与级之间一条红色竖虚线 */
.num.split .lv + .lv {
  margin-left: 0.14em;
  padding-left: 0.14em;
  border-left: 2px dashed var(--c-red);
}
.d {
  display: inline-block;
  min-width: 0.6em;
  text-align: center;
}
/* 画横线的数字 */
.d.mark {
  border-bottom: 3px solid var(--c-primary-dark);
  color: var(--c-primary-dark);
}
/* 要填数字的那一位「□」 */
.box,
.rel-box {
  display: inline-block;
  width: 0.62em;
  height: 0.9em;
  margin: 0 0.04em;
  border: 2.5px solid var(--c-text);
  border-radius: 4px;
  vertical-align: middle;
}
.rel-box {
  width: 0.9em;
  border-style: dashed;
  border-color: var(--c-primary);
}
.rel {
  color: var(--c-primary-dark);
}
.rel.circle {
  font-weight: 400;
}
.unit {
  margin-left: 0.08em;
  font-size: 0.8em;
}
/* 要填的数：虚线框，还没按是淡色「?」，判完变绿（同算式里的空） */
.slot {
  display: inline-block;
  min-width: 1.1em;
  padding: 0 0.12em;
  border: 3px dashed var(--c-primary);
  border-radius: 12px;
  color: var(--c-primary-dark);
  line-height: 1.1;
  text-align: center;
}
.slot.empty {
  color: var(--c-locked);
}
.slot.done {
  border-style: solid;
  border-color: var(--c-green);
  color: var(--c-green);
}
/* 读法（写作题）：汉字带拼音，一行放不下就均匀折行 */
.words {
  font-size: min(30px, 6.6vw);
  text-align: center;
  text-wrap: balance;
}
.has-words .right {
  font-size: min(42px, 8.6vw, var(--fit, 42px));
}
</style>
